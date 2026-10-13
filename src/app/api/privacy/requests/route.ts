import { after } from "next/server";
import { randomBytes } from "node:crypto";
import { getTranslations } from "next-intl/server";
import { isLocale, routing, type Locale } from "@/i18n/routing";
import { idempotencyKeySchema, privacyRequestSchema } from "@/lib/schemas";
import { getEnv } from "@/lib/server/env";
import { sendEmail } from "@/lib/server/email/client";
import { renderPrivacyEmail } from "@/lib/server/email/templates";
import { apiError, handleError, newRequestId, readJson, sha256Hex } from "@/lib/server/http";
import { claimKey } from "@/lib/server/idempotency";
import { logWarn } from "@/lib/server/log";
import { rateLimit } from "@/lib/server/ratelimit";
import { getStore } from "@/lib/server/store";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

function localeFromRequest(req: Request): Locale {
  const cookie = /(?:^|;\s*)NEXT_LOCALE=([a-z]{2})/.exec(req.headers.get("cookie") ?? "")?.[1];
  if (isLocale(cookie)) return cookie;
  const accept = (req.headers.get("accept-language") ?? "").toLowerCase();
  for (const part of accept.split(",")) {
    const tag = part.trim().slice(0, 2);
    if (isLocale(tag)) return tag;
  }
  return routing.defaultLocale;
}

/**
 * POST /api/privacy/requests (FR-14, US-09). SIEMPRE responde 202: no revela si el email existe.
 * Verifica identidad por email (enlace de un solo uso) antes de acceder, rectificar o eliminar.
 */
export async function POST(req: Request) {
  const requestId = newRequestId(req);
  try {
    const limit = await rateLimit(req, "privacy-request", 5);
    if (!limit.ok) {
      return apiError(429, "rate_limited", "Too many requests.", requestId, { "Retry-After": String(limit.retryAfterSeconds) });
    }
    const idem = idempotencyKeySchema.safeParse(req.headers.get("idempotency-key"));
    if (!idem.success) return apiError(400, "idempotency_key_required", "A valid Idempotency-Key header is required.", requestId);

    const body = await readJson(req, privacyRequestSchema, 4 * 1024);
    const locale = localeFromRequest(req);
    const accepted = () => new Response(JSON.stringify({ status: "accepted", request_id: requestId }), { status: 202, headers: { "content-type": "application/json", "cache-control": "no-store" } });

    if (!(await claimKey("privacy-request", sha256Hex(idem.data)))) return accepted(); // reintento idempotente

    const store = getStore();
    const email = body.email.toLowerCase();

    if (!store) {
      // Sin base de datos no hay datos propios que verificar: se avisa al operador para gestión manual.
      const owner = getEnv().OWNER_EMAIL;
      if (owner) {
        after(async () => {
          await sendEmail({
            to: owner,
            subject: `[StressCast] Solicitud de derechos (${body.request_type})`,
            html: `<p>Solicitud de ${body.request_type} del email ${email.replace(/</g, "&lt;")}. Verifica la identidad antes de actuar.</p>`,
            text: `Solicitud de ${body.request_type} del email ${email}. Verifica la identidad antes de actuar.`,
            idempotencyKey: `privacy-owner:${sha256Hex(idem.data)}`,
          });
        });
      }
      return accepted();
    }

    const token = randomBytes(32).toString("base64url");
    const id = await store.createPrivacyRequest({ email, type: body.request_type, tokenHash: sha256Hex(token) });
    const confirmUrl = `${siteUrl()}/${locale}/legal/privacy-request/confirm?id=${id}&token=${encodeURIComponent(token)}`;
    after(async () => {
      try {
        const t = await getTranslations({ locale, namespace: "privacyEmail" });
        const tl = await getTranslations({ locale, namespace: "legal.rights.typeLabel" });
        const mail = renderPrivacyEmail({
          locale,
          t: (k, v) => t(k as never, v as never),
          kind: "verify",
          typeLabel: tl(body.request_type as never),
          confirmUrl,
        });
        await sendEmail({ to: email, ...mail, idempotencyKey: `privacy-verify:${id}` });
      } catch (e) {
        logWarn("privacy_verify_email_failed", { error: e instanceof Error ? e.name : "unknown" });
      }
    });
    return accepted();
  } catch (error) {
    return handleError(error, requestId);
  }
}
