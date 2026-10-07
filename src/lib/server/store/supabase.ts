import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AssessmentInput, CalculationResult } from "@/engine/types";
import type { Locale } from "@/i18n/routing";
import { getEnv, supabaseUrl } from "../env";
import type {
  AdminLeadRow,
  CreateRequestOutcome,
  CreateRequestParams,
  DeliveryRecord,
  EmailStatus,
  ExportedData,
  FunnelRow,
  OrderRow,
  OrderStatus,
  PrivacyRequestRow,
  PrivacyRequestType,
  ReportStore,
  RequestStatus,
  StoredReport,
} from "./types";

/**
 * Store de Supabase Postgres (spec/db_schema.sql + supabase/migrations). Usa SIEMPRE el service role,
 * solo en servidor: el acceso `anon` a las tablas está denegado por RLS (FR-29).
 * Los errores se re-lanzan sin incluir filas ni payloads.
 */
class StoreError extends Error {
  constructor(readonly op: string, readonly pgCode: string | null) {
    super(`store_error:${op}${pgCode ? `:${pgCode}` : ""}`);
    this.name = "StoreError";
  }
}

function must<T>(op: string, res: { data: T | null; error: { code?: string } | null }): T {
  if (res.error) throw new StoreError(op, res.error.code ?? null);
  return res.data as T;
}

type Row = Record<string, unknown>;

export class SupabaseStore implements ReportStore {
  readonly kind = "supabase" as const;

  constructor(private readonly db: SupabaseClient) {}

  async createReportRequest(p: CreateRequestParams): Promise<CreateRequestOutcome> {
    const res = await this.db.rpc("create_report_request", {
      p: {
        request_id: p.requestId,
        idempotency_key: p.idempotencyKey,
        email: p.email,
        locale: p.locale,
        country: p.country,
        inputs: p.inputs,
        result: p.result,
        marketing_opt_in: p.marketingOptIn,
        owner_copy: p.ownerCopy,
        policy_version: p.policyVersion,
        copy_version: p.copyVersion,
        monetization_mode: p.monetizationMode,
        app_version: p.versions.app,
        model_version: p.versions.model,
        data_version: p.versions.data,
        manifest_version: p.versions.manifest,
        token_hash: p.tokenHash,
        token_expires_at: p.tokenExpiresAt.toISOString(),
        delete_after: p.deleteAfter.toISOString(),
      },
    });
    const d = must<Row>("create_report_request", res);
    return {
      replay: d.replay === true,
      samePayload: d.same_payload === true,
      requestId: String(d.request_id),
      leadId: String(d.lead_id),
      calculationId: String(d.calculation_id),
      status: d.status as RequestStatus,
    };
  }

  async getReport(requestId: string): Promise<StoredReport | null> {
    const res = await this.db
      .from("report_requests")
      .select(
        "id, lead_id, calculation_id, status, monetization_mode, locale, report_token_hash, report_token_expires_at, created_at, calculations(inputs, result, app_version, model_version, data_version, manifest_version)",
      )
      .eq("id", requestId)
      .maybeSingle();
    const d = must<Row | null>("get_report", res as never);
    if (!d) return null;
    const calc = (Array.isArray(d.calculations) ? d.calculations[0] : d.calculations) as Row | null;
    if (!calc) return null;
    const result = calc.result as CalculationResult;
    if (typeof (result as { score?: unknown }).score !== "number") return null; // redactado por borrado
    return {
      requestId: String(d.id),
      leadId: String(d.lead_id),
      calculationId: String(d.calculation_id),
      locale: d.locale as Locale,
      status: d.status as RequestStatus,
      monetizationMode: d.monetization_mode as "validation" | "stripe",
      tokenHash: (d.report_token_hash as string | null) ?? null,
      tokenExpiresAt: (d.report_token_expires_at as string | null) ?? null,
      createdAt: String(d.created_at),
      inputs: calc.inputs as AssessmentInput,
      result,
      versions: {
        app: String(calc.app_version),
        model: String(calc.model_version),
        data: String(calc.data_version),
        manifest: String(calc.manifest_version),
      },
    };
  }

  async getLeadEmail(leadId: string): Promise<string | null> {
    const res = await this.db.from("leads").select("email").eq("id", leadId).maybeSingle();
    const d = must<Row | null>("get_lead_email", res as never);
    return d ? String(d.email) : null;
  }

  async setStatus(requestId: string, status: RequestStatus, errorCode: string | null = null): Promise<void> {
    const res = await this.db.from("report_requests").update({ status, last_error_code: errorCode }).eq("id", requestId);
    must("set_status", res as never);
  }

  async rotateToken(requestId: string, hash: string, expiresAt: Date): Promise<void> {
    const res = await this.db
      .from("report_requests")
      .update({ report_token_hash: hash, report_token_expires_at: expiresAt.toISOString() })
      .eq("id", requestId);
    must("rotate_token", res as never);
  }

  async recordDelivery(rec: DeliveryRecord): Promise<{ created: boolean }> {
    const found = await this.db.from("email_deliveries").select("id").eq("idempotency_key", rec.idempotencyKey).maybeSingle();
    const existing = must<Row | null>("delivery_lookup", found as never);
    const fields = {
      status: rec.status,
      error_code: rec.errorCode ?? null,
      ...(rec.providerMessageId ? { provider_message_id: rec.providerMessageId } : {}),
    };
    if (existing) {
      must("delivery_update", (await this.db.from("email_deliveries").update(fields).eq("id", existing.id as string)) as never);
      return { created: false };
    }
    const ins = await this.db.from("email_deliveries").insert({
      lead_id: rec.leadId,
      report_request_id: rec.requestId,
      recipient_kind: rec.recipientKind,
      template_key: rec.templateKey,
      idempotency_key: rec.idempotencyKey,
      ...fields,
    });
    if (ins.error?.code === "23505") return { created: false }; // carrera: ya existe
    must("delivery_insert", ins as never);
    return { created: true };
  }

  async deliveryStatuses(requestId: string): Promise<Record<"user" | "owner", EmailStatus | null>> {
    const res = await this.db.from("email_deliveries").select("recipient_kind, status, created_at").eq("report_request_id", requestId).order("created_at");
    const rows = must<Row[]>("delivery_statuses", res as never) ?? [];
    const out: Record<"user" | "owner", EmailStatus | null> = { user: null, owner: null };
    for (const r of rows) out[r.recipient_kind as "user" | "owner"] = r.status as EmailStatus;
    return out;
  }

  async listLeads(opts: { status?: string; cursor?: string; limit: number }) {
    let q = this.db
      .from("leads")
      .select(opts.status ? "id, email, status, created_at, locale, country, report_requests!inner(id, status)" : "id, email, status, created_at, locale, country")
      .order("created_at", { ascending: false })
      .limit(opts.limit + 1);
    if (opts.status) q = q.eq("report_requests.status", opts.status);
    if (opts.cursor) q = q.lt("created_at", opts.cursor);
    const leads = (must<Row[]>("list_leads", (await q) as never) ?? []) as unknown as Row[];
    const page = leads.slice(0, opts.limit);
    const nextCursor = leads.length > opts.limit ? String(page[page.length - 1].created_at) : null;
    if (page.length === 0) return { items: [], nextCursor: null };

    const ids = page.map((l) => l.id as string);
    const reqRes = await this.db.from("report_requests").select("id, lead_id, status, created_at").in("lead_id", ids).order("created_at", { ascending: false });
    const reqs = must<Row[]>("list_requests", reqRes as never) ?? [];
    const latest = new Map<string, Row>();
    for (const r of reqs) if (!latest.has(r.lead_id as string)) latest.set(r.lead_id as string, r);

    const reqIds = [...latest.values()].map((r) => r.id as string);
    const delivered = new Map<string, string>();
    if (reqIds.length) {
      const dRes = await this.db.from("email_deliveries").select("report_request_id, status, created_at").in("report_request_id", reqIds).order("created_at");
      for (const d of must<Row[]>("list_deliveries", dRes as never) ?? []) delivered.set(d.report_request_id as string, d.status as string);
    }

    const items: AdminLeadRow[] = page.map((l) => {
      const r = latest.get(l.id as string);
      return {
        id: String(l.id),
        email: String(l.email),
        status: r ? String(r.status) : String(l.status),
        created_at: String(l.created_at),
        last_delivery_status: r ? (delivered.get(r.id as string) ?? null) : null,
        locale: String(l.locale),
        country: String(l.country),
        request_id: r ? String(r.id) : null,
      };
    });
    return { items, nextCursor };
  }

  async latestRequestForLead(leadId: string) {
    const res = await this.db.from("report_requests").select("id, locale").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const d = must<Row | null>("latest_request", res as never);
    return d ? { requestId: String(d.id), locale: d.locale as Locale } : null;
  }

  async logAdminAction(a: { adminUserId: string; action: string; targetType: string; targetId: string; metadata?: Record<string, unknown> }) {
    must(
      "admin_action",
      (await this.db.from("admin_actions").insert({
        admin_user_id: a.adminUserId,
        action: a.action,
        target_type: a.targetType,
        target_id: a.targetId,
        metadata: a.metadata ?? {},
      })) as never,
    );
  }

  async recentAdminActions(limit: number) {
    const res = await this.db.from("admin_actions").select("action, target_type, target_id, created_at").order("created_at", { ascending: false }).limit(limit);
    return (must<Row[]>("recent_actions", res as never) ?? []) as { action: string; target_type: string; target_id: string; created_at: string }[];
  }

  async incrementFunnel(event: string, locale: string, market: string): Promise<void> {
    must("increment_funnel", (await this.db.rpc("increment_funnel", { p_event: event, p_locale: locale, p_market: market })) as never);
  }

  async funnelSince(isoDay: string): Promise<FunnelRow[]> {
    const res = await this.db.from("funnel_counters").select("day, event, locale, market, count").gte("day", isoDay);
    return (must<Row[]>("funnel_since", res as never) ?? []).map((r) => ({
      day: String(r.day),
      event: String(r.event),
      locale: String(r.locale),
      market: String(r.market),
      count: Number(r.count),
    }));
  }

  async statusCounts(): Promise<Record<string, number>> {
    const statuses: RequestStatus[] = ["received", "preparing", "ready", "delivery_pending", "delivered", "delivery_failed", "cancelled"];
    const entries = await Promise.all(
      statuses.map(async (s) => {
        const res = await this.db.from("report_requests").select("id", { count: "exact", head: true }).eq("status", s);
        if (res.error) throw new StoreError("status_counts", res.error.code ?? null);
        return [s, res.count ?? 0] as const;
      }),
    );
    return Object.fromEntries(entries.filter(([, n]) => n > 0));
  }

  async createPrivacyRequest(p: { email: string; type: PrivacyRequestType; tokenHash: string }): Promise<string> {
    const res = await this.db
      .from("privacy_requests")
      .insert({ email: p.email.toLowerCase(), request_type: p.type, verification_token_hash: p.tokenHash })
      .select("id")
      .single();
    return String(must<Row>("privacy_create", res as never).id);
  }

  async getPrivacyRequest(id: string): Promise<PrivacyRequestRow | null> {
    const res = await this.db.from("privacy_requests").select("id, email, request_type, status, verification_token_hash").eq("id", id).maybeSingle();
    const d = must<Row | null>("privacy_get", res as never);
    return d
      ? { id: String(d.id), email: String(d.email), type: d.request_type as PrivacyRequestType, status: String(d.status), tokenHash: (d.verification_token_hash as string | null) ?? null }
      : null;
  }

  async completePrivacyRequest(id: string, verified: boolean): Promise<void> {
    const now = new Date().toISOString();
    must(
      "privacy_complete",
      (await this.db
        .from("privacy_requests")
        .update({ status: "completed", verified_at: verified ? now : null, completed_at: now, verification_token_hash: null })
        .eq("id", id)) as never,
    );
  }

  async exportData(email: string): Promise<ExportedData> {
    const e = email.trim().toLowerCase();
    const leads = must<Row[]>("export_leads", (await this.db.from("leads").select("id, email, locale, country, source, status, created_at").eq("email", e)) as never) ?? [];
    const ids = leads.map((l) => l.id as string);
    if (ids.length === 0) return { leads: [], report_requests: [], calculations: [], consent_records: [] };
    const [reqs, calcs, consents] = await Promise.all([
      this.db.from("report_requests").select("id, status, locale, created_at").in("lead_id", ids),
      this.db.from("calculations").select("id, inputs, result, created_at, app_version, model_version").in("lead_id", ids),
      this.db.from("consent_records").select("kind, granted, policy_version, copy_version, locale, granted_at").in("lead_id", ids),
    ]);
    return {
      leads,
      report_requests: must<Row[]>("export_requests", reqs as never) ?? [],
      calculations: must<Row[]>("export_calcs", calcs as never) ?? [],
      consent_records: must<Row[]>("export_consents", consents as never) ?? [],
    };
  }

  async processDeletion(email: string) {
    const d = must<Row>("process_deletion", (await this.db.rpc("process_privacy_deletion", { p_email: email })) as never);
    return { leads: Number(d.leads), requests: Number(d.requests), calculations: Number(d.calculations), anonymized: d.anonymized === true };
  }

  async purgeExpired() {
    const d = must<Row>("purge_expired", (await this.db.rpc("purge_expired_data")) as never);
    return { requests: Number(d.requests), calculations: Number(d.calculations), leads: Number(d.leads) };
  }

  async recordStripeEvent(e: { eventId: string; eventType: string; payloadSha256: string; result: string }) {
    const res = await this.db.from("stripe_events").insert({ event_id: e.eventId, event_type: e.eventType, payload_sha256: e.payloadSha256, result: e.result });
    if (res.error?.code === "23505") return { duplicate: true };
    must("stripe_event", res as never);
    return { duplicate: false };
  }

  private toOrder(d: Row): OrderRow {
    return {
      id: String(d.id),
      leadId: String(d.lead_id),
      requestId: (d.report_request_id as string | null) ?? null,
      status: d.status as OrderStatus,
      amountMinor: Number(d.amount_minor),
      currency: String(d.currency),
      checkoutSessionId: (d.provider_checkout_session_id as string | null) ?? null,
    };
  }

  async createOrder(o: { leadId: string; requestId: string | null; amountMinor: number; currency: string; idempotencyKey: string; checkoutSessionId: string | null }) {
    const ins = await this.db
      .from("orders")
      .insert({
        lead_id: o.leadId,
        report_request_id: o.requestId,
        amount_minor: o.amountMinor,
        currency: o.currency,
        idempotency_key: o.idempotencyKey,
        provider_checkout_session_id: o.checkoutSessionId,
      })
      .select("*")
      .single();
    if (ins.error?.code === "23505") {
      const ex = await this.db.from("orders").select("*").eq("idempotency_key", o.idempotencyKey).single();
      return this.toOrder(must<Row>("order_lookup", ex as never));
    }
    return this.toOrder(must<Row>("order_create", ins as never));
  }

  async setOrderSession(orderId: string, checkoutSessionId: string): Promise<void> {
    must("order_session", (await this.db.from("orders").update({ provider_checkout_session_id: checkoutSessionId }).eq("id", orderId)) as never);
  }

  async findOrderBySession(sessionId: string): Promise<OrderRow | null> {
    const res = await this.db.from("orders").select("*").eq("provider_checkout_session_id", sessionId).maybeSingle();
    const d = must<Row | null>("order_find", res as never);
    return d ? this.toOrder(d) : null;
  }

  async setOrderStatus(orderId: string, status: OrderStatus, paymentIntentId: string | null = null) {
    const res = await this.db
      .from("orders")
      .update({ status, ...(paymentIntentId ? { provider_payment_intent_id: paymentIntentId } : {}) })
      .eq("id", orderId)
      .neq("status", status)
      .select("id");
    return { changed: (must<Row[]>("order_status", res as never) ?? []).length > 0 };
  }

  async getCalculationBundle(calculationId: string) {
    const res = await this.db.from("calculations").select("id, lead_id, leads(id, email, locale, country)").eq("id", calculationId).maybeSingle();
    const d = must<Row | null>("calc_bundle", res as never);
    if (!d || !d.lead_id) return null;
    const lead = (Array.isArray(d.leads) ? d.leads[0] : d.leads) as Row | null;
    if (!lead) return null;
    const req = await this.db.from("report_requests").select("id").eq("calculation_id", calculationId).limit(1).maybeSingle();
    const r = must<Row | null>("calc_bundle_req", req as never);
    return {
      calculationId,
      leadId: String(lead.id),
      email: String(lead.email),
      requestId: r ? String(r.id) : null,
      locale: lead.locale as Locale,
      country: String(lead.country),
    };
  }
}

let client: SupabaseClient | null = null;

export function supabaseServiceClient(): SupabaseClient {
  const url = supabaseUrl();
  const key = getEnv().SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("supabase_not_configured");
  client ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-client-info": "stresscast-server" } },
  });
  return client;
}
