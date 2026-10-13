import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import spec from "@spec/analytics_events.json";
import { EVENT_NAMES, FORBIDDEN_PROPERTIES, sanitizeEvent } from "@/lib/analytics/allowlist";
import { redactString, scrubEvent } from "@/lib/sentry-scrub";
import type { ErrorEvent } from "@sentry/nextjs";

describe("AT-20 · allowlist de analítica", () => {
  it("descarta propiedades prohibidas y no listadas (email, score, respuestas…)", () => {
    const clean = sanitizeEvent("assessment_step_complete", {
      step_index: 3,
      question_id: "worn_out_end_day",
      elapsed_bucket: "30-60s",
      email: "a@b.co",
      score: 67.9,
      answer_value: "always",
      reference_band: "high_reference",
      item_scores: "75",
      free_text: "hola",
      pdf_url: "https://x",
    });
    expect(clean?.props).toEqual({ step_index: 3, question_id: "worn_out_end_day", elapsed_bucket: "30-60s" });
  });

  it("rechaza eventos desconocidos y los de pago mientras payment_enabled=false", () => {
    expect(sanitizeEvent("hacked_event", {})).toBeNull();
    expect(sanitizeEvent("payment_success", { currency: "USD", price_bucket: "9" })).toBeNull();
    expect(sanitizeEvent("payment_success", { currency: "USD" }, { paymentEnabled: true })?.props).toEqual({ currency: "USD" });
  });

  it("descarta strings con @ o fuera del charset seguro y `market` salvo canal first-party", () => {
    const c = sanitizeEvent("landing_view", { language: "es", market: "ES", viewport_bucket: "a@b.com", session_id: "x".repeat(200) });
    expect(c?.props).toEqual({ language: "es" });
    expect(sanitizeEvent("landing_view", { market: "ES" }, { allowMarket: true })?.props).toEqual({ market: "ES" });
  });

  it("ningún evento del contrato puede emitir una propiedad prohibida (todas inyectadas)", () => {
    const poison = Object.fromEntries([...FORBIDDEN_PROPERTIES].map((k) => [k, "x"]));
    for (const name of EVENT_NAMES) {
      const out = sanitizeEvent(name, poison, { paymentEnabled: true, allowMarket: true });
      for (const k of Object.keys(out?.props ?? {})) expect(FORBIDDEN_PROPERTIES.has(k), `${name}.${k}`).toBe(false);
    }
    expect(spec.events.length).toBe(EVENT_NAMES.length);
  });

  it("todo track('…') del código fuente usa un evento de la allowlist", () => {
    const names = new Set(EVENT_NAMES);
    const used = new Set<string>();
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(f)) {
          for (const m of readFileSync(p, "utf8").matchAll(/\b(?:track|TrackOnMount[^>]*event=)\(?\s*["']([a-z_]+)["']/g)) used.add(m[1]);
        }
      }
    };
    walk(resolve(__dirname, "../../src"));
    expect(used.size).toBeGreaterThan(10);
    for (const n of used) expect(names.has(n), `evento no permitido: ${n}`).toBe(true);
  });
});

describe("AT-30 · scrubbing de Sentry", () => {
  const dirty = {
    message: "fallo para ana@correo.com en /es/report/0b7f0f1e-5f55-4c53-b5f5-2a6a2c1d9e11?token=v1.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA.xyz",
    user: { email: "ana@correo.com", ip_address: "1.2.3.4" },
    extra: { score: 67.9, answers: { a: "high" } },
    request: {
      url: "https://stresscast.app/es/report/0b7f0f1e-5f55-4c53-b5f5-2a6a2c1d9e11?token=s1.SECRETSECRETSECRETSECRETSECRET",
      data: { email: "ana@correo.com" },
      cookies: { a: "b" },
      headers: { cookie: "x=y" },
      query_string: "token=s1.SECRET",
    },
    breadcrumbs: [{ message: "clicked ana@correo.com" }],
    exception: { values: [{ type: "Error", value: "bad email ana@correo.com", stacktrace: { frames: [{ vars: { email: "ana@correo.com" } }] } }] },
  } as unknown as ErrorEvent;

  it("elimina usuario, extras, cuerpo, cookies, headers, query y breadcrumbs", () => {
    const out = scrubEvent(structuredClone(dirty))!;
    const json = JSON.stringify(out);
    expect(json).not.toContain("ana@correo.com");
    expect(json).not.toContain("token=");
    expect(json).not.toContain("SECRET");
    expect(json).not.toContain("67.9");
    expect(out.user).toBeUndefined();
    expect(out.extra).toBeUndefined();
    expect(out.breadcrumbs).toEqual([]);
    expect(out.request).toEqual({ method: undefined, url: "https://stresscast.app/es/report/[id]" });
  });

  it("redactString enmascara emails, tokens y secretos largos", () => {
    expect(redactString("a@b.co v1.abcdefghijklmnopqrstuvwxyz.mac ?q=1")).toBe("[email] [token] ?[redacted]");
  });
});
