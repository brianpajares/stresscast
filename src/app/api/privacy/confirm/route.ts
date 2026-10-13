import { z } from "zod";
import { timingSafeEqual } from "node:crypto";
import { getTranslations } from "next-intl/server";
import { isLocale, routing } from "@/i18n/routing";
import { sendEmail } from "@/lib/server/email/client";
import { renderPrivacyEmail } from "@/lib/server/email/templates";
import { apiError, handleError, json, newRequestId, readJson, sha256Hex } from "@/lib/server/http";
import { logOps } from "@/lib/server/log";
import { rateLimit } from "@/lib/server/ratelimit";
import { getStore } from "@/lib/server/store";

export const dynamic = "force-dynamic";

const schema = z.strictObject({ id: z.uuid(), token: z.string().min(32).max(128), locale: z.string().max(5).optional() });

/**
 * POST /api/privacy/confirm: ejecuta la solicitud tras la verificación por email (token de un solo uso).
 * Es POST (no GET) para que los escáneres de enlaces de los clientes de correo no disparen un borrado.
 */
export async function POST(req: Request) {
  const requestId = newRequestId(req);
  try {
    const limit = await rateLimit(req, "privacy-confirm", 10);
    if (!limit.ok) return apiError(429, "rate_limited", "Too many requests.", requestId);

    const body = await readJson(req, schema, 2 * 1024);
    const store = getStore();
    if (!store) return apiError(404, "not_found", "Not found.", requestId);

    const row = await store.getPrivacyRequest(body.id);
    const given = Buffer.from(sha256Hex(body.token), "hex");
    const stored = row?.tokenHash ? Buffer.from(row.tokenHash, "hex") : null;
    if (!row || !stored || stored.length !== given.length || !timingSafeEqual(stored, given) || row.status === "completed") {
      return apiError(400, "invalid_token", "Invalid or already used link.", requestId);
    }

    const locale = isLocale(body.locale) ? body.locale : routing.defaultLocale;
    const t = await getTranslations({ locale, namespace: "privacyEmail" });
    const tr = (k: string, v?: Record<string, string | number>) => t(k as never, v as never);
    const idem = `privacy-done:${row.id}`;

    if (row.type === "access") {
      const data = await store.exportData(row.email);
      const mail = renderPrivacyEmail({ locale, t: tr, kind: "export" });
      await sendEmail({
        to: row.email,
        ...mail,
        attachments: [{ filename: "stresscast-data.json", content: Buffer.from(JSON.stringify(data, null, 2), "utf8") }],
        idempotencyKey: idem,
      });
    } else if (row.type === "deletion") {
      const out = await store.processDeletion(row.email);
      logOps("privacy_deletion_done", { leads: out.leads, requests: out.requests, calculations: out.calculations, anonymized: out.anonymized });
      await sendEmail({ to: row.email, ...renderPrivacyEmail({ locale, t: tr, kind: "deleted" }), idempotencyKey: idem });
    } else {
      await sendEmail({ to: row.email, ...renderPrivacyEmail({ locale, t: tr, kind: "rectification" }), idempotencyKey: idem });
    }

    await store.completePrivacyRequest(row.id, true);
    return json({ status: "completed", request_id: requestId }, 200, requestId);
  } catch (error) {
    return handleError(error, requestId);
  }
}
