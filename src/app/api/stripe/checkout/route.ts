import { stripeCheckoutSchema, idempotencyKeySchema } from "@/lib/schemas";
import { isLocale, routing } from "@/i18n/routing";
import { stripeActive } from "@/lib/server/env";
import { apiError, handleError, json, newRequestId, readJson } from "@/lib/server/http";
import { getModelBundle } from "@/lib/server/model";
import { rateLimit } from "@/lib/server/ratelimit";
import { stripeClient, toMinorUnits } from "@/lib/server/stripe";
import { getStore } from "@/lib/server/store";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/checkout (FR-24/FR-25). Con flags off responde 404 como si la ruta no existiera.
 * El importe sale SIEMPRE del servidor (tabla de precios del modelo por país), nunca del cliente.
 */
export async function POST(req: Request) {
  const requestId = newRequestId(req);
  if (!stripeActive()) return apiError(404, "not_found", "Not found.", requestId);
  try {
    const limit = await rateLimit(req, "stripe-checkout", 10);
    if (!limit.ok) return apiError(429, "rate_limited", "Too many requests.", requestId);

    const idem = idempotencyKeySchema.safeParse(req.headers.get("idempotency-key"));
    if (!idem.success) return apiError(400, "idempotency_key_required", "A valid Idempotency-Key header is required.", requestId);
    const body = await readJson(req, stripeCheckoutSchema, 2 * 1024);

    const store = getStore();
    if (!store) return apiError(503, "store_required", "Payments require persistence.", requestId);
    const calc = await store.getCalculationBundle(body.calculation_id);
    if (!calc || calc.email.toLowerCase() !== body.email.toLowerCase() || calc.country !== body.country) {
      return apiError(404, "not_found", "Calculation not found.", requestId);
    }

    const bundle = await getModelBundle();
    const price = bundle.base.prices[calc.country];
    if (!price) return apiError(400, "invalid_request", "Unsupported country.", requestId);
    const amount = toMinorUnits(price.recommended_price);
    const currency = price.currency.toLowerCase();
    const locale = isLocale(calc.locale) ? calc.locale : routing.defaultLocale;

    const order = await store.createOrder({
      leadId: calc.leadId,
      requestId: calc.requestId,
      amountMinor: amount,
      currency,
      idempotencyKey: `order:${idem.data}`,
      checkoutSessionId: null,
    });
    if (order.status === "paid") return apiError(409, "already_paid", "This order is already paid.", requestId);

    const session = await stripeClient().checkout.sessions.create(
      {
        mode: "payment",
        customer_email: calc.email,
        client_reference_id: order.id,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: amount,
              product_data: { name: "StressCast — full report (PDF)" },
            },
          },
        ],
        metadata: { order_id: order.id, request_id: calc.requestId ?? "" },
        success_url: `${siteUrl()}/${locale}/report/success?paid=1`,
        cancel_url: `${siteUrl()}/${locale}/results/preview`,
        locale: locale === "pt" ? "pt-BR" : locale,
      },
      { idempotencyKey: `checkout:${idem.data}` },
    );
    if (!session.url) return apiError(502, "checkout_unavailable", "Checkout unavailable.", requestId);
    await store.setOrderSession(order.id, session.id);
    return json({ checkout_url: session.url }, 201, requestId);
  } catch (e) {
    return handleError(e, requestId);
  }
}
