import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractText, getDocumentProxy } from "unpdf";
import { calculate, bundledModelBase } from "@/engine";
import { flushAfter, useTestEnv, VALID_INPUTS } from "../helpers/env";
import { __setEmailTransport, type EmailMessage } from "@/lib/server/email/client";
import { sharedMemoryStore } from "@/lib/server/store/memory";
import { __resetMemoryLimiter } from "@/lib/server/ratelimit";
import { POST as calculatePOST } from "@/app/api/calculate/route";
import { POST as requestPOST } from "@/app/api/report-requests/route";
import { GET as reportGET } from "@/app/api/reports/[id]/route";
import { GET as pdfGET } from "@/app/api/reports/[id]/pdf/route";

const sent: EmailMessage[] = [];
const result = calculate(VALID_INPUTS, bundledModelBase);

function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://stresscast.test${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7", ...headers },
    body: JSON.stringify(body),
  });
}

const goodBody = (over: Record<string, unknown> = {}) => ({
  email: "Ana.Perez@Example.com",
  explicit_report_consent: true,
  marketing_opt_in: false,
  calculation: { inputs: VALID_INPUTS, result },
  turnstile_token: "tok",
  locale: "es",
  ...over,
});

const KEY = "idem-key-0123456789abcdef";

beforeEach(() => {
  useTestEnv({ RESEND_API_KEY: "re_test", RESEND_FROM_EMAIL: "StressCast <no-reply@stresscast.test>" });
  sent.length = 0;
  __setEmailTransport(async (m) => {
    sent.push(m);
    return { status: "sent", id: `msg_${sent.length}` };
  });
  const store = sharedMemoryStore();
  store.leads.clear();
  store.calcs.clear();
  store.reqs.clear();
  store.deliveries.clear();
  store.consents.length = 0;
  __resetMemoryLimiter();
});
afterEach(() => {
  __setEmailTransport(null);
  vi.unstubAllEnvs();
});

async function createRequest(key = KEY) {
  const res = await requestPOST(post("/api/report-requests", goodBody(), { "idempotency-key": key }));
  const json = await res.json();
  await flushAfter();
  return { res, json };
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) } as never;
}

describe("POST /api/calculate (AT-02/AT-04)", () => {
  it("200 con el resultado exacto del motor", async () => {
    const res = await calculatePOST(post("/api/calculate", VALID_INPUTS));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(result);
    expect(res.headers.get("x-model-version")).toBe("1.0.0");
  });

  it.each([
    ["país inválido", { ...VALID_INPUTS, country: "ZZ" }],
    ["propiedad extra", { ...VALID_INPUTS, sleep_hours: 7 }],
    ["falta un campo", Object.fromEntries(Object.entries(VALID_INPUTS).filter(([k]) => k !== "energy_family_friends"))],
    ["valor fuera de enum", { ...VALID_INPUTS, work_frustrates: "extreme" }],
  ])("400 ante %s", async (_n, body) => {
    const res = await calculatePOST(post("/api/calculate", body));
    expect(res.status).toBe(400);
    const e = await res.json();
    expect(Object.keys(e).sort()).toEqual(["code", "message", "request_id"]);
  });
});

describe("POST /api/report-requests (AT-08..AT-11, AT-27)", () => {
  it("crea el lead, registra consentimientos versionados y entrega usuario + owner con PDF", async () => {
    const { res, json } = await createRequest();
    expect(res.status).toBe(201);
    expect(json.status).toBe("accepted");
    expect(json.delivery).toBe("email");
    expect(json.report_url).toContain("/es/report/");

    const store = sharedMemoryStore();
    expect(store.leads.size).toBe(1);
    expect([...store.leads.values()][0].email).toBe("ana.perez@example.com");
    const kinds = store.consents.map((c) => `${c.kind}:${c.granted}`).sort();
    expect(kinds).toEqual(["marketing:false", "owner_manual_fulfillment:true", "report_delivery:true"]);
    expect(store.consents.every((c) => c.policy_version && c.copy_version && c.granted_at)).toBe(true);

    // AT-10: owner recibe id, inputs, resultados y PDF; usuario recibe enlace privado
    expect(sent).toHaveLength(2);
    const user = sent.find((m) => m.to === "ana.perez@example.com")!;
    const owner = sent.find((m) => m.to === "owner@example.test")!;
    expect(user.html).toContain("https://stresscast.test/es/report/");
    expect(user.html).not.toContain(String(result.score)); // sin score en el email de usuario
    expect(owner.subject).toBe(`[StressCast] Solicitud de informe ${json.request_id}`);
    expect(owner.text).toContain("DATOS SENSIBLES");
    expect(owner.text).toContain("worn_out_end_day: always");
    expect(owner.attachments?.[0].filename).toMatch(/^StressCast-report-\d{4}-\d{2}-\d{2}-SC-1\.0\.0-\d{8}-[A-Z2-9]{8}\.pdf$/);
    expect(owner.attachments?.[0].content.subarray(0, 4).toString()).toBe("%PDF");
    expect(store.reqs.get(json.request_id)?.status).toBe("delivered");
  });

  it("idempotencia: el mismo Idempotency-Key no duplica lead, pedido ni emails (AT-27 / NFR-12)", async () => {
    await createRequest();
    const again = await requestPOST(post("/api/report-requests", goodBody(), { "idempotency-key": KEY }));
    await flushAfter();
    expect(again.status).toBe(201);
    expect(sharedMemoryStore().reqs.size).toBe(1);
    expect(sharedMemoryStore().leads.size).toBe(1);
    expect(sent).toHaveLength(2);
  });

  it("409 si la misma clave se reutiliza con otro payload", async () => {
    await createRequest();
    const other = await requestPOST(post("/api/report-requests", goodBody({ email: "otra@example.com" }), { "idempotency-key": KEY }));
    expect(other.status).toBe(409);
  });

  it("rechaza: sin Idempotency-Key, sin consentimiento, email inválido, campos extra y resultado manipulado", async () => {
    const h = { "idempotency-key": KEY };
    expect((await requestPOST(post("/api/report-requests", goodBody()))).status).toBe(400);
    expect((await requestPOST(post("/api/report-requests", goodBody({ explicit_report_consent: false }), h))).status).toBe(400);
    expect((await requestPOST(post("/api/report-requests", goodBody({ email: "no-es-email" }), h))).status).toBe(400);
    expect((await requestPOST(post("/api/report-requests", goodBody({ extra: 1 }), h))).status).toBe(400);
    const tampered = goodBody({ calculation: { inputs: VALID_INPUTS, result: { ...result, score: 1 } } });
    const res = await requestPOST(post("/api/report-requests", tampered, h));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("calculation_mismatch");
    expect(sharedMemoryStore().leads.size).toBe(0);
  });

  it("AT-28: rate limit → 429 con Retry-After", async () => {
    let last = 200;
    for (let i = 0; i < 25; i++) {
      // El límite se aplica antes de validar: cuerpos vacíos bastan (y no disparan entregas ni PDFs).
      const r = await requestPOST(post("/api/report-requests", {}, { "idempotency-key": `idem-key-0000000000${i}x` }));
      last = r.status;
      if (r.status === 429) {
        expect(r.headers.get("retry-after")).toBeTruthy();
        break;
      }
    }
    expect(last).toBe(429);
  });

  it("AT-28: con Turnstile configurado, un token inválido se rechaza", async () => {
    useTestEnv({ RESEND_API_KEY: "re_test", RESEND_FROM_EMAIL: "a@b.co", TURNSTILE_SECRET_KEY: "secret" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: false }), { status: 200 })));
    const res = await requestPOST(post("/api/report-requests", goodBody(), { "idempotency-key": KEY }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("turnstile_failed");
    vi.unstubAllGlobals();
  });

  it("AT-27: si el email falla la solicitud queda reintentable y no se duplica el lead", async () => {
    __setEmailTransport(async () => ({ status: "failed", code: "provider_down" }));
    const { json } = await createRequest("idem-key-fail-0123456789");
    expect(sharedMemoryStore().reqs.get(json.request_id)?.status).toBe("delivery_failed");
    expect(sharedMemoryStore().leads.size).toBe(1);
  });
});

describe("GET /api/reports/{id} y /pdf (AT-11/AT-12/AT-13)", () => {
  it("el enlace privado funciona, rechaza tokens alterados y no expone email", async () => {
    const { json } = await createRequest();
    const url = new URL(json.report_url);
    const token = url.searchParams.get("token")!;
    expect(url.search).not.toMatch(/score|answers|email|67/);

    const ok = await reportGET(new Request(`https://stresscast.test/api/reports/${json.request_id}?token=${encodeURIComponent(token)}`), ctx(json.request_id));
    expect(ok.status).toBe(200);
    const body = await ok.json();
    expect(body.result).toEqual(result);
    expect(JSON.stringify(body)).not.toContain("example.com");

    const bad = await reportGET(new Request(`https://stresscast.test/api/reports/${json.request_id}?token=${encodeURIComponent(token)}x`), ctx(json.request_id));
    expect(bad.status).toBe(401);
    const none = await reportGET(new Request(`https://stresscast.test/api/reports/${json.request_id}`), ctx(json.request_id));
    expect(none.status).toBe(401);
  });

  it("PDF de 7 páginas con TODOS los outputs de INFORME_COMPLETO, versión e ID de verificación", async () => {
    const { json } = await createRequest();
    const token = new URL(json.report_url).searchParams.get("token")!;
    const res = await pdfGET(new Request(`https://stresscast.test/api/reports/${json.request_id}/pdf?token=${encodeURIComponent(token)}&lang=es`), ctx(json.request_id));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toMatch(/attachment; filename="StressCast-report-/);

    const doc = await getDocumentProxy(new Uint8Array(await res.arrayBuffer()));
    const { text, totalPages } = await extractText(doc, { mergePages: true });
    expect(totalPages).toBe(7);
    const flat = text.replace(/\s+/g, " ");
    const f = (n: number, d = 1) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
    // work_burnout_score, scenario_*_30d, envelope, puma_comparison, sensitivity
    expect(flat).toContain(f(result.score));
    expect(flat).toContain(f(result.scenario_30d.improve));
    expect(flat).toContain(f(result.scenario_30d.no_change));
    expect(flat).toContain(f(result.scenario_30d.worsen));
    expect(flat).toContain(`${f(result.scenario_30d.improve)} – ${f(result.scenario_30d.worsen)}`);
    expect(flat).toContain(f(result.sensitivity.one_item_one_category_points, 4));
    expect(flat).toContain("media PUMA");
    // top_drivers_3, action_plan_7d, methodology, versions, disclaimers, verification id
    expect(flat).toContain("Terminar agotado/a al final de la jornada");
    expect(flat).toContain("Plan de 7 días");
    expect(flat).toContain("Metodología y supuestos");
    expect(flat).toContain("Modelo 1.0.0");
    expect(flat).toMatch(/SC-1\.0\.0-\d{8}-[A-Z2-9]{8}/);
    expect(flat).toContain("No es una predicción, probabilidad, intervalo de confianza ni cambio esperado");
    expect(flat).toMatch(/no diagnostica, trata ni sustituye a un profesional cualificado/i);
    expect(flat).not.toContain("ana.perez");
  });
});
