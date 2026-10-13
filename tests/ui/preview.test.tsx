// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { calculate, bundledModelBase } from "@/engine";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import { pickClientMessages } from "@/lib/site";
import { KEYS, writeSession } from "@/lib/client/session-store";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string | { pathname: string }; children: ReactNode } & Record<string, unknown>) => (
    <a href={typeof href === "string" ? href : href.pathname} {...(rest as object)}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/results/preview",
}));

import { PreviewView } from "@/components/results/preview-view";

// Caso con valores de escenario DISTINTIVOS para detectar cualquier fuga al DOM.
const inputs = {
  country: "US",
  emotionally_exhausting: "very_high",
  burned_out_due_work: "low",
  work_frustrates: "very_low",
  worn_out_end_day: "seldom",
  exhausted_morning: "never",
  every_working_hour_tiring: "sometimes",
  energy_family_friends: "often",
} as const;
const result = calculate(inputs, bundledModelBase);

function renderPreview(messages: typeof en, locale: "en" | "es") {
  return render(
    <NextIntlClientProvider locale={locale} messages={pickClientMessages(messages as never) as never}>
      <PreviewView />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: true, media: q, addEventListener: () => undefined, removeEventListener: () => undefined }));
  Object.defineProperty(navigator, "sendBeacon", { value: () => true, configurable: true });
  writeSession(KEYS.result, { result });
});
afterEach(() => vi.unstubAllGlobals());

describe("AT-05 · la preview entrega exactamente free_preview.give", () => {
  it("muestra score, banda, marcador sin eje temporal, top driver y una acción", () => {
    const { container } = renderPreview(en, "en");
    const text = container.textContent ?? "";
    expect(text).toContain("Work-related burnout");
    expect(text).toMatch(/PUMA reference 50/);
    expect(text).toContain("Emotional exhaustion at work"); // top driver (very_high = 100)
    expect(text).toContain("One action for this week");
    expect(container.querySelector('[role="img"]')?.getAttribute("aria-label")).toContain(String(result.score.toFixed(1)));
  });

  it("no contiene eje de tiempo ni línea actual→30 días", () => {
    const { container } = renderPreview(en, "en");
    // Único gráfico: la barra 0–100 (role=img). Ninguna polilínea/serie temporal.
    expect(container.querySelectorAll("polyline")).toHaveLength(0);
    expect(container.querySelectorAll('[role="img"]')).toHaveLength(1);
    expect(container.textContent).not.toMatch(/\b(timeline|forecast|next 30 days|in 30 days)\b/i);
  });
});

describe("AT-06 · bloqueo de outputs de INFORME_COMPLETO en la preview", () => {
  it.each([
    ["en", en],
    ["es", es],
  ] as const)("%s: NO aparecen valores de escenarios, sensibilidad, benchmark ni drivers 2 y 3", (loc, messages) => {
    const { container } = renderPreview(messages as typeof en, loc);
    const html = container.innerHTML;
    const f = (n: number) => (loc === "es" ? n.toFixed(1).replace(".", ",") : n.toFixed(1));
    const forbidden = [
      f(result.scenario_30d.improve), // mejora
      f(result.scenario_30d.worsen), // empeora
      result.scenario_30d.improve.toFixed(4),
      result.sensitivity.one_item_one_category_points.toFixed(4),
      "3.6",
      String(result.benchmark.delta_vs_puma_mean),
    ];
    for (const v of forbidden) expect(html, `valor filtrado: ${v}`).not.toContain(v);
    // drivers 2 y 3 (otros ítems con carga > 0) no se nombran
    const second = messages.items[result.top_drivers[1].input_key as keyof typeof messages.items].name;
    const third = messages.items[result.top_drivers[2].input_key as keyof typeof messages.items].name;
    expect(html).not.toContain(second);
    expect(html).not.toContain(third);
    // el teaser muestra la estructura con "— —"
    expect((container.textContent?.match(/— —/g) ?? []).length).toBe(3);
  });

  it("el teaser usa lenguaje what-if y nunca pronóstico/predicción afirmativa", () => {
    const { container } = renderPreview(en, "en");
    const t = container.textContent ?? "";
    expect(t).toMatch(/what-if/i);
    expect(t).not.toMatch(/\b(will|your risk|probability of burnout)\b/i);
  });
});

describe("estado sin datos", () => {
  it("sin resultado en sesión ofrece reiniciar en lugar de mostrar cifras", () => {
    window.sessionStorage.clear();
    renderPreview(en, "en");
    expect(screen.getByRole("link", { name: /start again/i })).toBeInTheDocument();
  });
});
