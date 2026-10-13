import "server-only";
import { buildReportData } from "@/lib/report/data";
import { deliverReport } from "./delivery";
import { claimKey } from "./idempotency";
import { sha256Hex } from "./sha";
import { getModelBundle } from "./model";
import { getStore } from "./store";
import { issueStoredToken } from "./tokens";

export type ResendResult =
  | { ok: true; status: string; duplicate: boolean }
  | { ok: false; code: "not_found" | "no_store" | "report_unavailable" };

/**
 * Reenvío de informe (FR-16 / US-11): idempotente por (lead, Idempotency-Key) y auditado.
 * Rota el token (solo se guarda su hash ⇒ no se puede reenviar el anterior) y NO recalcula: reutiliza el
 * resultado inmutable guardado, sin cambiar de versión de modelo.
 */
export async function resendReport(args: { leadId: string; adminUserId: string; idempotencyKey: string }): Promise<ResendResult> {
  const store = getStore();
  if (!store) return { ok: false, code: "no_store" };

  const first = await claimKey("admin-resend", sha256Hex(`${args.leadId}|${args.idempotencyKey}`), 3600);
  const latest = await store.latestRequestForLead(args.leadId);
  if (!latest) return { ok: false, code: "not_found" };
  if (!first) {
    const s = await store.getReport(latest.requestId);
    return { ok: true, status: s?.status ?? "unknown", duplicate: true };
  }

  const report = await store.getReport(latest.requestId);
  const email = await store.getLeadEmail(args.leadId);
  if (!report || !email) return { ok: false, code: "report_unavailable" };

  const bundle = await getModelBundle();
  const issued = issueStoredToken(report.requestId);
  await store.rotateToken(report.requestId, issued.hash, issued.expiresAt);
  const data = buildReportData({
    requestId: report.requestId,
    locale: report.locale,
    issuedAt: report.createdAt,
    versions: report.versions,
    inputs: report.inputs,
    result: report.result,
    base: bundle.base,
  });
  const outcome = await deliverReport({
    store,
    data,
    email,
    leadId: args.leadId,
    mode: report.monetizationMode,
    token: issued.token,
    discriminator: sha256Hex(args.idempotencyKey).slice(0, 16),
    locale: report.locale,
  });
  await store.logAdminAction({
    adminUserId: args.adminUserId,
    action: "resend_report",
    targetType: "lead",
    targetId: args.leadId,
    metadata: { request_id: report.requestId, delivery: outcome.status },
  });
  return { ok: true, status: outcome.status, duplicate: false };
}
