import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { calculate, bundledModelBase } from "@/engine";
import { flushAfter, useTestEnv, VALID_INPUTS } from "../helpers/env";
import { __setEmailTransport, type EmailMessage } from "@/lib/server/email/client";
import { sharedMemoryStore } from "@/lib/server/store/memory";
import { __resetMemoryLimiter } from "@/lib/server/ratelimit";

const createSession = vi.fn(async (_params: unknown, _opts: unknown) => ({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" }));
const realStripe = new Stripe("sk_test_dummy");
vi.mock("@/lib/server/stripe", async (orig) => {
  const actual = await orig<typeof import("@/lib/server/stripe")>();
  return { ...actual, stripeClient: () => ({ checkout: { sessions: { create: (p: unknown, o: unknown) => createSession(p, o) } }, webhooks: realStripe.webhooks }) };
});

import { POST as requestPOST } from "@/app/api/report-requests/route";
import { POST as checkoutPOST } from "@/app/api/stripe/checkout/route";
import { POST as webhookPOST } from "@/app/api/stripe/webhook/route";

const result = calculate(VALID_INPUTS, bundledModelBase);
const sent: EmailMessage[] = [];
const SECRET = "whsec_test_secret";

const STRIPE_ENV = {
  MONETIZATION_MODE: "stripe",
  STRIPE_ENABLED: "true",
  STRIPE_SECRET_KEY: "sk_test_dummy",
  STRIPE_WEBHOOK_SECRET: SECRET,
  RESEND_API_KEY: "re_test",
  RESEND_FROM_EMAIL: "StressCast <no-reply@stresscast.test>",
};

function json(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://stresscast.test${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.9", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function signedWebhook(event: object) {
  const payload = JSON.stringify(event);
  const header = realStripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
  return json("/api/stripe/webhook", payload, { "stripe-signature": header });
}

const paidEvent = (id: string) => ({
  id,
  object: "event",
  type: "checkout.session.completed",
  data: { object: { id: "cs_test_1", object: "checkout.session", payment_status: "paid", payment_intent: "pi_test_1" } },
});

async function prepareOrder() {
  const res = await requestPOST(
    json(
      "/api/report-requests",
      {
        email: "buyer@example.com",
        explicit_report_consent: true,
        marketing_opt_in: false,
        calculation: { inputs: VALID_INPUTS, result },
        turnstile_token: "tok",
        locale: "en",
      },
      { "idempotency-key": "idem-stripe-0123456789ab" },
    ),
  );
  await flushAfter();
  return res.json() as Promise<{ request_id: string; calculation_id: string; report_url: string | null }>;
}

beforeEach(() => {
  useTestEnv(STRIPE_ENV);
  sent.length = 0;
  createSession.mockClear();
  __setEmailTransport(async (m) => {
    sent.push(m);
    return { status: "sent", id: `m${sent.length}` };
  });
  const s = sharedMemoryStore();
  for (const m of [s.leads, s.calcs, s.reqs, s.deliveries, s.orders]) m.clear();
  s.consents.length = 0;
  s.stripeEvents.clear();
  __resetMemoryLimiter();
});
afterEach(() => {
  __setEmailTransport(null);
  vi.unstubAllEnvs();
});

describe("AT-24 · Stripe detrás de feature flag", () => {
  it("con flags off no existe checkout ni webhook (404)", async () => {
    useTestEnv({ ...STRIPE_ENV, STRIPE_ENABLED: "false" });
    expect((await checkoutPOST(json("/api/stripe/checkout", {}, { "idempotency-key": "k".repeat(20) }))).status).toBe(404);
    expect((await webhookPOST(json("/api/stripe/webhook", "{}"))).status).toBe(404);
  });

  it("MONETIZATION_MODE=validation tampoco habilita Stripe aunque STRIPE_ENABLED=true", async () => {
    useTestEnv({ ...STRIPE_ENV, MONETIZATION_MODE: "validation" });
    expect((await webhookPOST(json("/api/stripe/webhook", "{}"))).status).toBe(404);
  });
});

describe("AT-25 · checkout y webhook firmado", () => {
  it("la solicitud en modo stripe NO entrega nada hasta el pago", async () => {
    const created = await prepareOrder();
    expect(created.report_url).toBeNull();
    expect(created.calculation_id).toBeTruthy();
    expect(sent).toHaveLength(0);
  });

  it("crea la sesión con precio localizado SERVER-SIDE (ES = 5,90 EUR → 590) e idempotente", async () => {
    const created = await prepareOrder();
    const body = { calculation_id: created.calculation_id, email: "buyer@example.com", country: "ES" };
    const res = await checkoutPOST(json("/api/stripe/checkout", body, { "idempotency-key": "idem-checkout-0123456789" }));
    expect(res.status).toBe(201);
    expect((await res.json()).checkout_url).toContain("checkout.stripe.com");
    const params = createSession.mock.calls[0][0] as { line_items: { price_data: { currency: string; unit_amount: number } }[]; mode: string };
    expect(params.mode).toBe("payment");
    expect(params.line_items[0].price_data).toMatchObject({ currency: "eur", unit_amount: 590 });
    expect((createSession.mock.calls[0][1] as { idempotencyKey: string }).idempotencyKey).toBe("checkout:idem-checkout-0123456789");

    await checkoutPOST(json("/api/stripe/checkout", body, { "idempotency-key": "idem-checkout-0123456789" }));
    expect(sharedMemoryStore().orders.size).toBe(1);
  });

  it("rechaza email/país que no corresponden al cálculo", async () => {
    const created = await prepareOrder();
    const res = await checkoutPOST(json("/api/stripe/checkout", { calculation_id: created.calculation_id, email: "otro@example.com", country: "ES" }, { "idempotency-key": "idem-checkout-bad-0123456" }));
    expect(res.status).toBe(404);
  });

  it("webhook sin firma o con firma inválida → 400", async () => {
    expect((await webhookPOST(json("/api/stripe/webhook", JSON.stringify(paidEvent("evt_1"))))).status).toBe(400);
    const bad = json("/api/stripe/webhook", JSON.stringify(paidEvent("evt_1")), { "stripe-signature": "t=1,v1=deadbeef" });
    expect((await webhookPOST(bad)).status).toBe(400);
  });
});

describe("AT-26 · entrega automática, idempotente por event_id", () => {
  async function paidOrder() {
    const created = await prepareOrder();
    await checkoutPOST(json("/api/stripe/checkout", { calculation_id: created.calculation_id, email: "buyer@example.com", country: "ES" }, { "idempotency-key": "idem-checkout-0123456789" }));
    return created;
  }

  it("evento válido → un pedido pagado y UN email al usuario (con enlace) + metadatos mínimos al owner", async () => {
    const created = await paidOrder();
    const res = await webhookPOST(signedWebhook(paidEvent("evt_paid_1")));
    expect(res.status).toBe(200);
    const orders = [...sharedMemoryStore().orders.values()];
    expect(orders).toHaveLength(1);
    expect(orders[0].status).toBe("paid");
    expect(sent.filter((m) => m.to === "buyer@example.com")).toHaveLength(1);
    expect(sent.find((m) => m.to === "buyer@example.com")!.html).toContain(`/en/report/${created.request_id}?token=`);
    const owner = sent.find((m) => m.to === "owner@example.test")!;
    expect(owner.text).not.toContain("INPUTS");
    expect(owner.attachments).toBeUndefined(); // stripe: sin PDF ni respuestas al owner
  });

  it("el mismo event_id repetido, o un reintento con otro id, no duplica pedido ni entrega", async () => {
    await paidOrder();
    await webhookPOST(signedWebhook(paidEvent("evt_paid_1")));
    const again = await webhookPOST(signedWebhook(paidEvent("evt_paid_1")));
    expect((await again.json()).duplicate).toBe(true);
    await webhookPOST(signedWebhook(paidEvent("evt_paid_2")));
    expect(sharedMemoryStore().orders.size).toBe(1);
    expect(sent.filter((m) => m.to === "buyer@example.com")).toHaveLength(1);
  });

  it("un pago no completado no entrega", async () => {
    await paidOrder();
    const unpaid = paidEvent("evt_unpaid");
    (unpaid.data.object as { payment_status: string }).payment_status = "unpaid";
    await webhookPOST(signedWebhook(unpaid));
    expect(sent).toHaveLength(0);
  });
});
