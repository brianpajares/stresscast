import "server-only";
import type { Locale } from "@/i18n/routing";
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
  Versions,
} from "./types";
import type { AssessmentInput, CalculationResult } from "@/engine/types";

interface LeadRec {
  id: string;
  email: string;
  locale: Locale;
  country: string;
  status: string;
  created_at: string;
}
interface CalcRec {
  id: string;
  lead_id: string | null;
  inputs: AssessmentInput | Record<string, never>;
  result: CalculationResult | Record<string, never>;
  versions: Versions;
  created_at: string;
  delete_after: string | null;
}
interface ReqRec {
  id: string;
  lead_id: string;
  calculation_id: string;
  status: RequestStatus;
  monetization_mode: "validation" | "stripe";
  locale: Locale;
  token_hash: string | null;
  token_expires_at: string | null;
  idempotency_key: string;
  last_error_code: string | null;
  created_at: string;
}
interface ConsentRec {
  lead_id: string;
  report_request_id: string;
  kind: string;
  granted: boolean;
  policy_version: string;
  copy_version: string;
  locale: Locale;
  granted_at: string;
}
interface DeliveryRec extends DeliveryRecord {
  created_at: string;
}

/**
 * Store en memoria para desarrollo, E2E y tests unitarios (STORE_DRIVER=memory).
 * Replica las garantías del store de Supabase: idempotencia por clave, redacción en borrados, retención.
 * NO es persistente: nunca se usa en producción real.
 */
export class MemoryStore implements ReportStore {
  readonly kind = "memory" as const;
  leads = new Map<string, LeadRec>();
  calcs = new Map<string, CalcRec>();
  reqs = new Map<string, ReqRec>();
  consents: ConsentRec[] = [];
  deliveries = new Map<string, DeliveryRec>();
  actions: { admin_user_id: string; action: string; target_type: string; target_id: string; metadata: unknown; created_at: string }[] = [];
  funnel = new Map<string, FunnelRow>();
  privacy = new Map<string, PrivacyRequestRow & { verified: boolean; completed: boolean }>();
  orders = new Map<string, OrderRow & { idempotencyKey: string; paymentIntentId: string | null }>();
  stripeEvents = new Set<string>();

  private now(): string {
    return new Date().toISOString();
  }

  async createReportRequest(p: CreateRequestParams): Promise<CreateRequestOutcome> {
    const existing = [...this.reqs.values()].find((r) => r.idempotency_key === p.idempotencyKey);
    const email = p.email.trim().toLowerCase();
    if (existing) {
      const lead = this.leads.get(existing.lead_id)!;
      const calc = this.calcs.get(existing.calculation_id)!;
      return {
        replay: true,
        samePayload: lead.email.toLowerCase() === email && JSON.stringify(calc.inputs) === JSON.stringify(p.inputs),
        requestId: existing.id,
        leadId: existing.lead_id,
        calculationId: existing.calculation_id,
        status: existing.status,
      };
    }

    let lead = [...this.leads.values()].find((l) => l.email.toLowerCase() === email);
    if (!lead) {
      lead = { id: crypto.randomUUID(), email, locale: p.locale, country: p.country, status: "active", created_at: this.now() };
      this.leads.set(lead.id, lead);
    } else {
      lead.locale = p.locale;
      lead.country = p.country;
    }

    const calc: CalcRec = {
      id: crypto.randomUUID(),
      lead_id: lead.id,
      inputs: p.inputs,
      result: p.result,
      versions: p.versions,
      created_at: this.now(),
      delete_after: p.deleteAfter.toISOString(),
    };
    this.calcs.set(calc.id, calc);

    const req: ReqRec = {
      id: p.requestId,
      lead_id: lead.id,
      calculation_id: calc.id,
      status: "received",
      monetization_mode: p.monetizationMode,
      locale: p.locale,
      token_hash: p.tokenHash,
      token_expires_at: p.tokenExpiresAt.toISOString(),
      idempotency_key: p.idempotencyKey,
      last_error_code: null,
      created_at: this.now(),
    };
    this.reqs.set(req.id, req);

    const base = { lead_id: lead.id, report_request_id: req.id, policy_version: p.policyVersion, copy_version: p.copyVersion, locale: p.locale, granted_at: this.now() };
    this.consents.push({ ...base, kind: "report_delivery", granted: true });
    this.consents.push({ ...base, kind: "marketing", granted: p.marketingOptIn });
    if (p.ownerCopy) this.consents.push({ ...base, kind: "owner_manual_fulfillment", granted: true });

    return { replay: false, samePayload: true, requestId: req.id, leadId: lead.id, calculationId: calc.id, status: req.status };
  }

  async getReport(requestId: string): Promise<StoredReport | null> {
    const r = this.reqs.get(requestId);
    if (!r) return null;
    const c = this.calcs.get(r.calculation_id);
    if (!c || !("score" in c.result)) return null;
    return {
      requestId: r.id,
      leadId: r.lead_id,
      calculationId: r.calculation_id,
      locale: r.locale,
      status: r.status,
      monetizationMode: r.monetization_mode,
      tokenHash: r.token_hash,
      tokenExpiresAt: r.token_expires_at,
      createdAt: r.created_at,
      inputs: c.inputs as AssessmentInput,
      result: c.result as CalculationResult,
      versions: c.versions,
    };
  }

  async getLeadEmail(leadId: string): Promise<string | null> {
    return this.leads.get(leadId)?.email ?? null;
  }

  async setStatus(requestId: string, status: RequestStatus, errorCode: string | null = null): Promise<void> {
    const r = this.reqs.get(requestId);
    if (r) {
      r.status = status;
      r.last_error_code = errorCode;
    }
  }

  async rotateToken(requestId: string, hash: string, expiresAt: Date): Promise<void> {
    const r = this.reqs.get(requestId);
    if (r) {
      r.token_hash = hash;
      r.token_expires_at = expiresAt.toISOString();
    }
  }

  async recordDelivery(rec: DeliveryRecord): Promise<{ created: boolean }> {
    const existing = this.deliveries.get(rec.idempotencyKey);
    if (existing) {
      // Reintento: actualiza el estado (queued → sent/failed) sin duplicar el registro lógico.
      existing.status = rec.status;
      existing.errorCode = rec.errorCode ?? null;
      existing.providerMessageId = rec.providerMessageId ?? existing.providerMessageId ?? null;
      return { created: false };
    }
    this.deliveries.set(rec.idempotencyKey, { ...rec, created_at: this.now() });
    return { created: true };
  }

  async deliveryStatuses(requestId: string): Promise<Record<"user" | "owner", EmailStatus | null>> {
    const out: Record<"user" | "owner", EmailStatus | null> = { user: null, owner: null };
    for (const d of [...this.deliveries.values()].filter((x) => x.requestId === requestId)) out[d.recipientKind] = d.status;
    return out;
  }

  async listLeads(opts: { status?: string; cursor?: string; limit: number }) {
    const all = [...this.leads.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const rows: AdminLeadRow[] = all.map((l) => {
      const req = [...this.reqs.values()].filter((r) => r.lead_id === l.id).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      const delivery = req ? [...this.deliveries.values()].filter((d) => d.requestId === req.id).pop() : undefined;
      return {
        id: l.id,
        email: l.email,
        status: req?.status ?? l.status,
        created_at: l.created_at,
        last_delivery_status: delivery?.status ?? null,
        locale: l.locale,
        country: l.country,
        request_id: req?.id ?? null,
      };
    });
    const filtered = opts.status ? rows.filter((r) => r.status === opts.status) : rows;
    const start = opts.cursor ? filtered.findIndex((r) => r.created_at < opts.cursor!) : 0;
    const slice = start < 0 ? [] : filtered.slice(start, start + opts.limit);
    const next = start >= 0 && start + opts.limit < filtered.length ? slice[slice.length - 1].created_at : null;
    return { items: slice, nextCursor: next };
  }

  async latestRequestForLead(leadId: string) {
    const req = [...this.reqs.values()].filter((r) => r.lead_id === leadId).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    return req ? { requestId: req.id, locale: req.locale } : null;
  }

  async logAdminAction(a: { adminUserId: string; action: string; targetType: string; targetId: string; metadata?: Record<string, unknown> }) {
    this.actions.push({ admin_user_id: a.adminUserId, action: a.action, target_type: a.targetType, target_id: a.targetId, metadata: a.metadata ?? {}, created_at: this.now() });
  }

  async recentAdminActions(limit: number) {
    return this.actions.slice(-limit).reverse().map((a) => ({ action: a.action, target_type: a.target_type, target_id: a.target_id, created_at: a.created_at }));
  }

  async incrementFunnel(event: string, locale: string, market: string): Promise<void> {
    const day = this.now().slice(0, 10);
    const k = `${day}|${event}|${locale || "unknown"}|${market || "unknown"}`;
    const row = this.funnel.get(k) ?? { day, event, locale: locale || "unknown", market: market || "unknown", count: 0 };
    row.count++;
    this.funnel.set(k, row);
  }

  async funnelSince(isoDay: string): Promise<FunnelRow[]> {
    return [...this.funnel.values()].filter((r) => r.day >= isoDay);
  }

  async statusCounts(): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const r of this.reqs.values()) out[r.status] = (out[r.status] ?? 0) + 1;
    return out;
  }

  async createPrivacyRequest(p: { email: string; type: PrivacyRequestType; tokenHash: string }): Promise<string> {
    const id = crypto.randomUUID();
    this.privacy.set(id, { id, email: p.email.toLowerCase(), type: p.type, status: "verification_pending", tokenHash: p.tokenHash, verified: false, completed: false });
    return id;
  }

  async getPrivacyRequest(id: string): Promise<PrivacyRequestRow | null> {
    return this.privacy.get(id) ?? null;
  }

  async completePrivacyRequest(id: string, verified: boolean): Promise<void> {
    const r = this.privacy.get(id);
    if (r) {
      r.verified = verified;
      r.completed = true;
      r.status = "completed";
      r.tokenHash = null;
    }
  }

  async exportData(email: string): Promise<ExportedData> {
    const e = email.toLowerCase();
    const leads = [...this.leads.values()].filter((l) => l.email.toLowerCase() === e);
    const ids = new Set(leads.map((l) => l.id));
    return {
      leads: leads.map((l) => ({ ...l })),
      report_requests: [...this.reqs.values()].filter((r) => ids.has(r.lead_id)).map((r) => ({ id: r.id, status: r.status, locale: r.locale, created_at: r.created_at })),
      calculations: [...this.calcs.values()].filter((c) => c.lead_id && ids.has(c.lead_id)).map((c) => ({ id: c.id, inputs: c.inputs, result: c.result, created_at: c.created_at })),
      consent_records: this.consents.filter((c) => ids.has(c.lead_id)).map((c) => ({ ...c })),
    };
  }

  async processDeletion(email: string) {
    const e = email.toLowerCase();
    const leads = [...this.leads.values()].filter((l) => l.email.toLowerCase() === e);
    const ids = new Set(leads.map((l) => l.id));
    if (ids.size === 0) return { leads: 0, requests: 0, calculations: 0, anonymized: false };
    const hasOrders = [...this.orders.values()].some((o) => ids.has(o.leadId));
    const calcIds = [...this.calcs.values()].filter((c) => c.lead_id && ids.has(c.lead_id)).map((c) => c.id);
    for (const id of calcIds) {
      const c = this.calcs.get(id)!;
      c.inputs = {};
      c.result = {};
    }
    let requests = 0;
    for (const [id, r] of this.reqs) {
      if (ids.has(r.lead_id) && ![...this.orders.values()].some((o) => o.requestId === id)) {
        this.reqs.delete(id);
        requests++;
      }
    }
    let calculations = 0;
    for (const id of calcIds) {
      if (![...this.reqs.values()].some((r) => r.calculation_id === id)) {
        this.calcs.delete(id);
        calculations++;
      }
    }
    this.consents = this.consents.filter((c) => !ids.has(c.lead_id) || hasOrders);
    for (const l of leads) {
      if (hasOrders) {
        l.email = `deleted+${l.id}@invalid.local`;
        l.status = "anonymized";
      } else {
        this.leads.delete(l.id);
      }
    }
    return { leads: leads.length, requests, calculations, anonymized: hasOrders };
  }

  async purgeExpired() {
    const now = Date.now();
    let requests = 0;
    let calculations = 0;
    let leads = 0;
    for (const c of [...this.calcs.values()]) {
      if (c.delete_after && Date.parse(c.delete_after) < now) {
        for (const [id, r] of this.reqs) {
          if (r.calculation_id === c.id && ![...this.orders.values()].some((o) => o.requestId === id)) {
            this.reqs.delete(id);
            requests++;
          }
        }
        if (![...this.reqs.values()].some((r) => r.calculation_id === c.id)) {
          this.calcs.delete(c.id);
          calculations++;
        }
      }
    }
    for (const l of [...this.leads.values()]) {
      const hasReq = [...this.reqs.values()].some((r) => r.lead_id === l.id);
      const hasOrder = [...this.orders.values()].some((o) => o.leadId === l.id);
      const marketing = this.consents.some((c) => c.lead_id === l.id && c.kind === "marketing" && c.granted);
      if (!hasReq && !hasOrder && !marketing && Date.parse(l.created_at) < now - 86_400_000) {
        this.leads.delete(l.id);
        this.consents = this.consents.filter((c) => c.lead_id !== l.id);
        leads++;
      }
    }
    return { requests, calculations, leads };
  }

  async recordStripeEvent(e: { eventId: string; eventType: string; payloadSha256: string; result: string }) {
    if (this.stripeEvents.has(e.eventId)) return { duplicate: true };
    this.stripeEvents.add(e.eventId);
    return { duplicate: false };
  }

  async createOrder(o: { leadId: string; requestId: string | null; amountMinor: number; currency: string; idempotencyKey: string; checkoutSessionId: string | null }): Promise<OrderRow> {
    const existing = [...this.orders.values()].find((x) => x.idempotencyKey === o.idempotencyKey);
    if (existing) return existing;
    const row = { id: crypto.randomUUID(), leadId: o.leadId, requestId: o.requestId, status: "pending" as OrderStatus, amountMinor: o.amountMinor, currency: o.currency, checkoutSessionId: o.checkoutSessionId, idempotencyKey: o.idempotencyKey, paymentIntentId: null };
    this.orders.set(row.id, row);
    return row;
  }

  async setOrderSession(orderId: string, checkoutSessionId: string): Promise<void> {
    const o = this.orders.get(orderId);
    if (o) o.checkoutSessionId = checkoutSessionId;
  }

  async findOrderBySession(sessionId: string): Promise<OrderRow | null> {
    return [...this.orders.values()].find((o) => o.checkoutSessionId === sessionId) ?? null;
  }

  async setOrderStatus(orderId: string, status: OrderStatus, paymentIntentId: string | null = null) {
    const o = this.orders.get(orderId);
    if (!o) return { changed: false };
    if (o.status === status) return { changed: false };
    o.status = status;
    if (paymentIntentId) o.paymentIntentId = paymentIntentId;
    return { changed: true };
  }

  async getCalculationBundle(calculationId: string) {
    const c = this.calcs.get(calculationId);
    if (!c || !c.lead_id) return null;
    const lead = this.leads.get(c.lead_id);
    if (!lead) return null;
    const req = [...this.reqs.values()].find((r) => r.calculation_id === calculationId) ?? null;
    return { calculationId, leadId: lead.id, email: lead.email, requestId: req?.id ?? null, locale: lead.locale, country: lead.country };
  }
}

const g = globalThis as unknown as { __scMemoryStore?: MemoryStore };
export function sharedMemoryStore(): MemoryStore {
  g.__scMemoryStore ??= new MemoryStore();
  return g.__scMemoryStore;
}
