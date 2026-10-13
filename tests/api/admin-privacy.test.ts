import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculate, bundledModelBase } from "@/engine";
import { flushAfter, useTestEnv, VALID_INPUTS } from "../helpers/env";
import { __setEmailTransport, type EmailMessage } from "@/lib/server/email/client";
import { sharedMemoryStore } from "@/lib/server/store/memory";
import { __resetMemoryLimiter } from "@/lib/server/ratelimit";
import type { AdminSession } from "@/lib/server/admin-auth";

let session: AdminSession = { state: "anonymous" };
vi.mock("@/lib/server/admin-auth", async (orig) => {
  const actual = await orig<typeof import("@/lib/server/admin-auth")>();
  return { ...actual, getAdminSession: async () => session };
});

import { POST as requestPOST } from "@/app/api/report-requests/route";
import { GET as leadsGET } from "@/app/api/admin/leads/route";
import { POST as resendPOST } from "@/app/api/admin/leads/[id]/resend/route";
import { GET as reportGET } from "@/app/api/reports/[id]/route";
import { POST as privacyPOST } from "@/app/api/privacy/requests/route";
import { POST as confirmPOST } from "@/app/api/privacy/confirm/route";
import { GET as cronGET } from "@/app/api/cron/retention/route";

const sent: EmailMessage[] = [];
const result = calculate(VALID_INPUTS, bundledModelBase);

const req = (url: string, init: RequestInit & { json?: unknown } = {}) =>
  new Request(`https://stresscast.test${url}`, {
    ...init,
    headers: { "content-type": "application/json", "x-forwarded-for": "192.0.2.44", ...(init.headers as Record<string, string>) },
    body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
  });

async function seed(email = "ana@example.com", key = "idem-seed-0123456789abc") {
  const r = await requestPOST(
    req("/api/report-requests", {
      method: "POST",
      headers: { "idempotency-key": key },
      json: { email, explicit_report_consent: true, marketing_opt_in: false, calculation: { inputs: VALID_INPUTS, result }, turnstile_token: "t", locale: "en" },
    }),
  );
  await flushAfter();
  return (await r.json()) as { request_id: string; report_url: string };
}

beforeEach(() => {
  useTestEnv({ RESEND_API_KEY: "re_test", RESEND_FROM_EMAIL: "a@stresscast.test", CRON_SECRET: "cron-secret-123" });
  session = { state: "anonymous" };
  sent.length = 0;
  __setEmailTransport(async (m) => {
    sent.push(m);
    return { status: "sent", id: `m${sent.length}` };
  });
  const s = sharedMemoryStore();
  for (const m of [s.leads, s.calcs, s.reqs, s.deliveries, s.orders, s.privacy]) m.clear();
  s.consents.length = 0;
  s.actions.length = 0;
  __resetMemoryLimiter();
});
afterEach(() => {
  __setEmailTransport(null);
  vi.unstubAllEnvs();
});

describe("AT-15/AT-29 · autorización de /admin", () => {
  it("anónimo → 401; usuario autenticado que no es admin → 403; admin → 200", async () => {
    await seed();
    expect((await leadsGET(req("/api/admin/leads"))).status).toBe(401);
    session = { state: "forbidden", email: "x@y.co" };
    expect((await leadsGET(req("/api/admin/leads"))).status).toBe(403);
    session = { state: "admin", userId: "00000000-0000-4000-8000-000000000001", email: "boss@y.co" };
    const ok = await leadsGET(req("/api/admin/leads"));
    expect(ok.status).toBe(200);
    const body = await ok.json();
    expect(body.items).toHaveLength(1);
    expect(Object.keys(body.items[0]).sort()).toEqual(["created_at", "email", "id", "last_delivery_status", "status"]); // sin respuestas ni scores
  });

  it("el reenvío exige sesión admin y no filtra para no autorizados", async () => {
    const { request_id } = await seed();
    const lead = [...sharedMemoryStore().leads.values()][0];
    const call = () => resendPOST(req(`/api/admin/leads/${lead.id}/resend`, { method: "POST", headers: { "idempotency-key": "resend-key-0123456789" } }), { params: Promise.resolve({ id: lead.id }) } as never);
    expect((await call()).status).toBe(401);
    session = { state: "forbidden", email: null };
    expect((await call()).status).toBe(403);
    expect(sent).toHaveLength(2);
    expect(request_id).toBeTruthy();
  });
});

describe("AT-16 · reenvío auditado e idempotente", () => {
  it("registra admin_actions, rota el token y un doble clic NO duplica la entrega lógica", async () => {
    const created = await seed();
    const oldToken = new URL(created.report_url).searchParams.get("token")!;
    const lead = [...sharedMemoryStore().leads.values()][0];
    session = { state: "admin", userId: "00000000-0000-4000-8000-000000000001", email: "boss@y.co" };
    const call = () => resendPOST(req(`/api/admin/leads/${lead.id}/resend`, { method: "POST", headers: { "idempotency-key": "resend-key-0123456789" } }), { params: Promise.resolve({ id: lead.id }) } as never);

    const first = await call();
    expect(first.status).toBe(202);
    const second = await call();
    expect((await second.json()).duplicate).toBe(true);

    expect(sharedMemoryStore().actions).toHaveLength(1);
    expect(sharedMemoryStore().actions[0]).toMatchObject({ action: "resend_report", target_type: "lead", target_id: lead.id });
    expect(sent).toHaveLength(4); // 2 originales + 2 del reenvío (usuario + owner), no 6

    // el enlace anterior queda invalidado y el nuevo funciona; el resultado NO se recalculó
    const ctx = { params: Promise.resolve({ id: created.request_id }) } as never;
    expect((await reportGET(req(`/api/reports/${created.request_id}?token=${encodeURIComponent(oldToken)}`), ctx)).status).toBe(401);
    const newLink = sent.filter((m) => m.to === "ana@example.com").pop()!.html.match(/token=([^"&\s<]+)/)![1];
    const ok = await reportGET(req(`/api/reports/${created.request_id}?token=${newLink}`), ctx);
    expect(ok.status).toBe(200);
    expect((await ok.json()).result).toEqual(result);
  });

  it("clave de idempotencia distinta ⇒ nuevo reenvío legítimo", async () => {
    await seed();
    const lead = [...sharedMemoryStore().leads.values()][0];
    session = { state: "admin", userId: "00000000-0000-4000-8000-000000000001", email: "b@y.co" };
    const call = (k: string) => resendPOST(req(`/api/admin/leads/${lead.id}/resend`, { method: "POST", headers: { "idempotency-key": k } }), { params: Promise.resolve({ id: lead.id }) } as never);
    await call("resend-key-aaaaaaaaaaaa");
    await call("resend-key-bbbbbbbbbbbb");
    expect(sharedMemoryStore().actions).toHaveLength(2);
  });
});

describe("AT-14 · derechos del titular (verificación de identidad antes de actuar)", () => {
  async function ask(type: "access" | "deletion" | "rectification", key = `idem-priv-${crypto.randomUUID()}`) {
    const res = await privacyPOST(req("/api/privacy/requests", { method: "POST", headers: { "idempotency-key": key, "accept-language": "es" }, json: { email: "ana@example.com", request_type: type } }));
    await flushAfter();
    return res;
  }
  const link = () => {
    const m = sent.find((x) => x.subject.includes("Confirma"))!.html.match(/confirm\?id=([0-9a-f-]{36})&amp;token=([^"&\s<]+)|confirm\?id=([0-9a-f-]{36})&token=([^"&\s<]+)/)!;
    return { id: m[1] ?? m[3], token: decodeURIComponent(m[2] ?? m[4]) };
  };

  it("responde 202 igual exista o no el email (no enumera) y NO actúa antes de confirmar", async () => {
    await seed();
    const known = await ask("deletion");
    expect(known.status).toBe(202);
    expect(sharedMemoryStore().leads.size).toBe(1); // aún no se borra nada
    const unknown = await privacyPOST(req("/api/privacy/requests", { method: "POST", headers: { "idempotency-key": "idem-priv-unknown-0123" }, json: { email: "nadie@example.com", request_type: "access" } }));
    expect(unknown.status).toBe(202);
    expect(await unknown.json()).toMatchObject({ status: "accepted" });
  });

  it("acceso: tras confirmar envía un JSON adjunto con los datos del titular; el token es de un solo uso", async () => {
    await seed();
    await ask("access");
    const { id, token } = link();
    const bad = await confirmPOST(req("/api/privacy/confirm", { method: "POST", json: { id, token: `${token.slice(0, -2)}xx` } }));
    expect(bad.status).toBe(400);
    const ok = await confirmPOST(req("/api/privacy/confirm", { method: "POST", json: { id, token } }));
    expect(ok.status).toBe(200);
    const exp = sent.find((m) => m.attachments?.[0]?.filename === "stresscast-data.json")!;
    expect(JSON.parse(exp.attachments![0].content.toString()).calculations[0].inputs).toEqual(VALID_INPUTS);
    const reuse = await confirmPOST(req("/api/privacy/confirm", { method: "POST", json: { id, token } }));
    expect(reuse.status).toBe(400);
  });

  it("eliminación: borra lead, solicitud y payload; el informe deja de ser accesible", async () => {
    const created = await seed();
    const token = new URL(created.report_url).searchParams.get("token")!;
    await ask("deletion");
    const { id, token: t } = link();
    expect((await confirmPOST(req("/api/privacy/confirm", { method: "POST", json: { id, token: t } }))).status).toBe(200);
    const s = sharedMemoryStore();
    expect([s.leads.size, s.calcs.size, s.reqs.size]).toEqual([0, 0, 0]);
    const ctx = { params: Promise.resolve({ id: created.request_id }) } as never;
    expect((await reportGET(req(`/api/reports/${created.request_id}?token=${encodeURIComponent(token)}`), ctx)).status).toBe(401);
  });
});

describe("retención (PRD §21)", () => {
  it("purga calculations con delete_after vencido y exige CRON_SECRET", async () => {
    await seed();
    const s = sharedMemoryStore();
    [...s.calcs.values()][0].delete_after = new Date(Date.now() - 1000).toISOString();
    expect((await cronGET(req("/api/cron/retention"))).status).toBe(401);
    const ok = await cronGET(req("/api/cron/retention", { headers: { authorization: "Bearer cron-secret-123" } }));
    expect(ok.status).toBe(200);
    expect([s.calcs.size, s.reqs.size]).toEqual([0, 0]);
  });
});
