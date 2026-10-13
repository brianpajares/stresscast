import type Stripe from "stripe";
import { buildReportData } from "@/lib/report/data";
import { deliverReport } from "@/lib/server/delivery";
import { getEnv, stripeActive } from "@/lib/server/env";
import { apiError, handleError, json, newRequestId, sha256Hex } from "@/lib/server/http";
import { logOps, logWarn } from "@/lib/server/log";
import { getModelBundle } from "@/lib/server/model";
import { stripeClient } from "@/lib/server/stripe";
import { getStore, type ReportStore } from "@/lib/server/store";
import { issueStoredToken } from "@/lib/server/tokens";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function fulfill(store: ReportStore, orderId: string, requestId: string, paymentIntent: string | null): Promise<string> {
  const { changed } = await store.setOrderStatus(orderId, "paid", paymentIntent);
  if (!changed) return "already_paid"; // evento duplicado o carrera: la entrega ya se disparó

  const report = await store.getReport(requestId);
  const email = report ? await store.getLeadEmail(report.leadId) : null;
  if (!report || !email) return "report_unavailable";

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
  // discriminator fijo "paid": Resend + BD garantizan UNA entrega lógica por pedido (FR-26).
  const out = await deliverReport({ store, data, email, leadId: report.leadId, mode: "stripe", token: issued.token, discriminator: "paid", locale: report.locale });
  return `fulfilled:${out.status}`;
}

/** POST /api/stripe/webhook (FR-25/FR-26): firma verificada, idempotente por event_id, entrega automática tras pago. */
export async function POST(req: Request) {
  const requestId = newRequestId(req);
  if (!stripeActive()) return apiError(404, "not_found", "Not found.", requestId);
  try {
    const raw = await req.text(); // el cuerpo CRUDO es necesario para verificar la firma
    const signature = req.headers.get("stripe-signature");
    if (!signature) return apiError(400, "invalid_signature", "Missing signature.", requestId);

    let event: Stripe.Event;
    try {
      event = stripeClient().webhooks.constructEvent(raw, signature, getEnv().STRIPE_WEBHOOK_SECRET as string);
    } catch {
      return apiError(400, "invalid_signature", "Invalid signature.", requestId);
    }

    const store = getStore();
    if (!store) return apiError(503, "store_required", "Payments require persistence.", requestId);

    let result = "ignored";
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.payment_status === "paid") {
          const order = await store.findOrderBySession(s.id);
          if (!order || !order.requestId) {
            result = "order_not_found";
            logWarn("stripe_order_not_found");
          } else {
            result = await fulfill(store, order.id, order.requestId, typeof s.payment_intent === "string" ? s.payment_intent : null);
          }
        } else {
          result = "awaiting_payment";
        }
        break;
      }
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const s = event.data.object as Stripe.Checkout.Session;
        const order = await store.findOrderBySession(s.id);
        if (order) await store.setOrderStatus(order.id, event.type.endsWith("expired") ? "cancelled" : "failed");
        result = "order_closed";
        break;
      }
      default:
        result = "ignored";
    }

    // Se registra DESPUÉS de procesar: si el proceso falla, Stripe reintenta; las transiciones de estado evitan duplicados.
    const rec = await store.recordStripeEvent({ eventId: event.id, eventType: event.type, payloadSha256: sha256Hex(raw), result });
    logOps("stripe_event", { type: event.type, result, duplicate: rec.duplicate });
    return json({ received: true, duplicate: rec.duplicate }, 200, requestId);
  } catch (e) {
    return handleError(e, requestId);
  }
}
