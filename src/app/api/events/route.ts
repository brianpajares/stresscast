import { eventSchema } from "@/lib/schemas";
import { sanitizeEvent } from "@/lib/analytics/allowlist";
import { rateLimit } from "@/lib/server/ratelimit";
import { getStore } from "@/lib/server/store";
import { stripeActive } from "@/lib/server/env";
import { readJson } from "@/lib/server/http";
import { logWarn } from "@/lib/server/log";

export const dynamic = "force-dynamic";

/**
 * Contadores de funnel first-party y agregados (FR-20). Defensa en profundidad: la allowlist se aplica
 * también aquí. Solo se cuentan (día, evento, idioma, mercado); no se guarda IP, session_id ni propiedades.
 * Siempre responde 204: la analítica nunca rompe el flujo del usuario.
 */
export async function POST(req: Request) {
  try {
    const limit = await rateLimit(req, "events", 240);
    if (!limit.ok) return new Response(null, { status: 204 });

    const body = await readJson(req, eventSchema, 4 * 1024);
    const clean = sanitizeEvent(body.name, body.props, { paymentEnabled: stripeActive(), allowMarket: true });
    if (!clean) return new Response(null, { status: 204 });

    const store = getStore();
    if (store) {
      const lang = String(clean.props.language ?? "unknown");
      const market = String(clean.props.market ?? "unknown");
      await store.incrementFunnel(clean.name, lang, market);
    }
  } catch (error) {
    logWarn("events_ingest_failed", { error: error instanceof Error ? error.name : "unknown" });
  }
  return new Response(null, { status: 204 });
}
