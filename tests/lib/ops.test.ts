import { afterEach, describe, expect, it, vi } from "vitest";
import { runChecks, summarizeChecks } from "@/lib/doctor-checks";
import { GATES, summarizeFunnel } from "@/lib/server/funnel";
import { approvedLocales, isLocaleIndexable } from "@/lib/gate";
import sitemap from "@/app/sitemap";
import { alternatesFor } from "@/lib/site";
import type { FunnelRow } from "@/lib/server/store/types";

afterEach(() => vi.unstubAllEnvs());

const row = (event: string, count: number, market = "ES", locale = "es"): FunnelRow => ({ day: "2026-10-07", event, locale, market, count });

describe("embudo (spec/analytics_events.json · derived_metrics)", () => {
  it("calcula visit→start, start→preview, preview→request y tasa de error", () => {
    const s = summarizeFunnel([
      row("landing_view", 1000),
      row("assessment_start_click", 400),
      row("preview_view", 300),
      row("report_request_success", 120),
      row("calculation_success", 990),
      row("calculation_error", 10),
    ]);
    expect(s.rates.visitToStart).toBeCloseTo(0.4);
    expect(s.rates.startToPreview).toBeCloseTo(0.75);
    expect(s.rates.previewToRequest).toBeCloseTo(0.4);
    expect(s.rates.calculationErrorRate).toBeCloseTo(0.01);
  });

  it("gate de cobro: ≥300 previews, ≥100 solicitudes y ≥35%; checkpoint día 14", () => {
    expect(summarizeFunnel([row("preview_view", 300), row("report_request_success", 105)]).gates.paymentReady).toBe(true);
    expect(summarizeFunnel([row("preview_view", 299), row("report_request_success", 150)]).gates.paymentReady).toBe(false);
    expect(summarizeFunnel([row("preview_view", 400), row("report_request_success", 100)]).gates.paymentReady).toBe(false); // 25 % < 35 %
    expect(summarizeFunnel([row("preview_view", 200), row("report_request_success", 50)]).gates.day14Continue).toBe(true);
    expect(GATES.payment.windowDays).toBe(30);
  });

  it("sin datos no divide por cero", () => {
    expect(summarizeFunnel([]).rates.previewToRequest).toBeNull();
  });
});

describe("doctor · gates de configuración", () => {
  it("marca como FALLO: Turnstile ausente con email real en producción y Stripe activo sin claves", () => {
    const checks = runChecks({ NODE_ENV: "production", RESEND_API_KEY: "k", RESEND_FROM_EMAIL: "a@b.co", MONETIZATION_MODE: "stripe", STRIPE_ENABLED: "true" });
    const by = Object.fromEntries(checks.map((c) => [c.id, c.status]));
    expect(by.turnstile).toBe("fail");
    expect(by.monetization).toBe("fail");
    expect(by["token-secret"]).toBe("fail");
  });

  it("validation con Stripe off es correcto; STORE_DRIVER=memory en producción es fallo", () => {
    const ok = Object.fromEntries(runChecks({ NODE_ENV: "production", MONETIZATION_MODE: "validation", STRIPE_ENABLED: "false" }).map((c) => [c.id, c.status]));
    expect(ok.monetization).toBe("ok");
    const bad = Object.fromEntries(runChecks({ NODE_ENV: "production", STORE_DRIVER: "memory" }).map((c) => [c.id, c.status]));
    expect(bad["memory-store"]).toBe("fail");
    expect(summarizeChecks(runChecks({})).fail).toBe(0);
  });
});

describe("gate lingüístico ES/PT (PRD §23)", () => {
  it("por defecto solo EN es indexable; el sitemap y hreflang omiten ES/PT", () => {
    vi.stubEnv("LINGUISTIC_GATE_APPROVED", "");
    expect(approvedLocales()).toEqual(["en"]);
    expect(isLocaleIndexable("es")).toBe(false);
    const urls = sitemap().map((e) => e.url);
    expect(urls.every((u) => u.includes("/en"))).toBe(true);
    expect(Object.keys(alternatesFor("en").languages)).toEqual(["en", "x-default"]);
  });

  it("al cerrar el gate se anuncian es/en/pt con hreflang coherente", () => {
    vi.stubEnv("LINGUISTIC_GATE_APPROVED", "es,pt");
    expect(approvedLocales()).toEqual(["es", "en", "pt"]);
    const alt = alternatesFor("es", "/faq");
    expect(Object.keys(alt.languages).sort()).toEqual(["en", "es", "pt-BR", "x-default"]);
    expect(alt.canonical.endsWith("/es/faq")).toBe(true);
    expect(sitemap().length).toBe(8 * 3);
  });
});
