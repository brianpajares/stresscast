import "server-only";
import { features, getEnv } from "./env";
import { clientIp } from "./http";
import { logWarn } from "./log";
import { e2eOutboxEnabled } from "./email/outbox";

export type TurnstileOutcome =
  | { ok: true; skipped: boolean }
  | { ok: false; reason: "invalid" | "unconfigured" | "unavailable" };

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verificación de Cloudflare Turnstile (FR-08 / FR-28).
 *  - Con TURNSTILE_SECRET_KEY: siempre se verifica.
 *  - Sin clave en desarrollo o modo demostración (sin envío real de email): se omite.
 *  - Sin clave en producción CON envío real de email: se rechaza (evita usar Resend como relé de spam).
 */
export async function verifyTurnstile(token: string, req: Request): Promise<TurnstileOutcome> {
  if (e2eOutboxEnabled()) return { ok: true, skipped: true }; // solo E2E_MODE + ALLOW_MEMORY_STORE
  const secret = getEnv().TURNSTILE_SECRET_KEY;
  if (!secret) {
    const production = process.env.NODE_ENV === "production";
    if (production && features().resend) {
      logWarn("turnstile_unconfigured_blocking_requests");
      return { ok: false, reason: "unconfigured" };
    }
    return { ok: true, skipped: true };
  }

  const form = new URLSearchParams({ secret, response: token });
  const ip = clientIp(req);
  if (ip !== "0.0.0.0") form.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, reason: "unavailable" };
    const data = (await res.json()) as { success?: boolean };
    return data.success === true ? { ok: true, skipped: false } : { ok: false, reason: "invalid" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
