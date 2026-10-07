import "server-only";
import { calculate } from "@/engine/calculate";
import type { Locale } from "@/i18n/routing";
import { buildReportData, type ReportData } from "@/lib/report/data";
import { APP_VERSION } from "@/lib/site";
import { getModelBundle } from "./model";
import { getStore } from "./store";
import { decodeInputs, openStatelessToken, tokenKind, verifyStoredToken } from "./tokens";

export type ReportAccess =
  | { ok: true; data: ReportData; source: "stored" | "stateless" }
  | { ok: false; reason: "invalid" | "expired" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Autoriza y reconstruye un informe a partir de (id, token) — FR-11.
 * “No encontrado” e “inválido” se colapsan para no revelar qué solicitudes existen (tokens no enumerables).
 *  - Token almacenado (`v1.`): el resultado es el INMUTABLE guardado al crear la solicitud: nunca se
 *    recalcula silenciosamente con otra versión del modelo (US-11).
 *  - Token stateless (`s1.`): sin base de datos; se recalcula de forma determinista desde los inputs cifrados.
 */
export async function resolveReport(id: string, token: string | undefined | null): Promise<ReportAccess> {
  if (!UUID.test(id) || !token || token.length < 32 || token.length > 1024) return { ok: false, reason: "invalid" };
  const bundle = await getModelBundle();

  switch (tokenKind(token)) {
    case "stored": {
      const store = getStore();
      if (!store) return { ok: false, reason: "invalid" };
      const report = await store.getReport(id);
      if (!report) return { ok: false, reason: "invalid" };
      const verdict = verifyStoredToken(token, id, { hash: report.tokenHash, expiresAt: report.tokenExpiresAt });
      if (verdict !== "ok") return { ok: false, reason: verdict };
      return {
        ok: true,
        source: "stored",
        data: buildReportData({
          requestId: report.requestId,
          locale: report.locale,
          issuedAt: report.createdAt,
          versions: report.versions,
          inputs: report.inputs,
          result: report.result,
          base: bundle.base,
        }),
      };
    }
    case "stateless": {
      const opened = openStatelessToken(token, id);
      if (opened.status !== "ok") return { ok: false, reason: opened.status };
      const inputs = decodeInputs(opened.payload.a);
      if (!inputs) return { ok: false, reason: "invalid" };
      const result = calculate(inputs, bundle.base);
      return {
        ok: true,
        source: "stateless",
        data: buildReportData({
          requestId: opened.payload.r,
          locale: opened.payload.l as Locale,
          issuedAt: new Date(opened.payload.i * 1000).toISOString(),
          versions: {
            app: APP_VERSION,
            model: result.model_version,
            data: bundle.meta.data_version,
            manifest: bundle.meta.manifest_version,
          },
          inputs,
          result,
          base: bundle.base,
        }),
      };
    }
    default:
      return { ok: false, reason: "invalid" };
  }
}
