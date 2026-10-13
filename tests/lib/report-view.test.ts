import { describe, expect, it } from "vitest";
import { createTranslator } from "use-intl/core";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import outputs from "@spec/outputs_spec.json";
import { calculate, bundledModelBase } from "@/engine";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import pt from "@/messages/pt.json";
import { buildReportData } from "@/lib/report/data";
import { buildReportView, type Translator } from "@/lib/report/view";
import type { Locale } from "@/i18n/routing";

const MESSAGES = { en, es, pt };
const vectors = JSON.parse(readFileSync(resolve(__dirname, "../../spec/test_vectors.json"), "utf8")) as {
  cases: { case_id: string; inputs: Record<string, string> }[];
};

function view(locale: Locale, caseId = "T12") {
  const inputs = vectors.cases.find((c) => c.case_id === caseId)!.inputs;
  const result = calculate(inputs, bundledModelBase);
  const t = createTranslator({ locale, messages: MESSAGES[locale] as never }) as unknown as Translator;
  const data = buildReportData({
    requestId: "0b7f0f1e-5f55-4c53-b5f5-2a6a2c1d9e11",
    locale,
    issuedAt: "2026-10-06T10:00:00Z",
    versions: { app: "1.0.0", model: "1.0.0", data: "3.0.0", manifest: "1.2.0" },
    inputs: inputs as never,
    result,
    base: bundledModelBase,
  });
  return { v: buildReportView(t, data), result };
}

describe("FR-13 · el informe cubre todos los outputs INFORME_COMPLETO de outputs_spec.json", () => {
  const ids = outputs.outputs.filter((o) => o.access === "INFORME_COMPLETO").map((o) => o.id);
  it("el contrato lista los 9 outputs esperados", () => {
    expect(ids.sort()).toEqual(
      ["action_plan_7d", "methodology", "puma_comparison", "scenario_envelope", "scenario_improve_30d", "scenario_no_change_30d", "scenario_worsen_30d", "sensitivity", "top_drivers_3"].sort(),
    );
  });

  it.each(["es", "en", "pt"] as const)("%s: cada output está presente con los números exactos del motor", (loc) => {
    const { v, result } = view(loc);
    const num = (n: number, d = 1) => new Intl.NumberFormat({ es: "es-ES", en: "en-US", pt: "pt-BR" }[loc], { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
    const s = result.scenario_30d;
    expect(v.scenarios.items.map((i) => i.value)).toEqual([num(s.improve), num(s.no_change), num(s.worsen)]); // 3 escenarios
    expect(v.scenarios.range).toContain(num(s.improve)); // envelope
    expect(v.scenarios.range).toContain(num(s.worsen));
    expect(v.drivers.items).toHaveLength(3); // top_drivers_3
    expect(v.scenarios.sensitivityBody).toContain(num(3.5714, 4)); // sensitivity
    expect(v.benchmark.delta).toContain(num(Math.abs(result.benchmark.delta_vs_puma_mean))); // puma_comparison
    expect(v.benchmark.body).toContain(num(33)); // media PUMA
    expect(v.plan.steps).toHaveLength(3); // action_plan_7d: 3 acciones + seguimiento
    expect(v.plan.notes).toHaveLength(4);
    expect(v.method.rows.length).toBe(9); // methodology
    expect(v.method.rows.at(-1)?.v).toBe("1.0.0"); // versión del modelo
    expect(v.verificationId).toMatch(/^SC-1\.0\.0-20261006-[A-HJ-NP-Z2-9]{8}$/);
    expect(v.sources.length).toBeGreaterThanOrEqual(5);
  });

  it("T12 reproduce 67,9 → 60,7 / 67,9 / 75,0 (caso verificado)", () => {
    const { v } = view("es");
    expect(v.score.value).toBe("67,9");
    expect(v.scenarios.items.map((i) => i.value)).toEqual(["60,7", "67,9", "75,0"]);
  });

  it("el ítem inverso (WB7) se señala cuando es driver", () => {
    const { v } = view("en", "T06"); // energía 'never' añade 100 de burden
    expect(v.drivers.items.some((d) => d.reverse)).toBe(true);
  });
});

describe("AT-07 · claims: sin diagnóstico/probabilidad/predicción afirmativos en el informe", () => {
  const risky = /predic|forecast|pron[oó]stic|probabilit|probabilidad|diagn[oó]stic|diagnos|previs[aã]o/i;
  const negated = /\b(no|not|ni|nem|nunca|never|sin|without|não)\b/i;
  it.each(["es", "en", "pt"] as const)("%s", (loc) => {
    const { v } = view(loc);
    const strings: string[] = [];
    (function walk(x: unknown) {
      if (typeof x === "string") strings.push(x);
      else if (Array.isArray(x)) x.forEach(walk);
      else if (x && typeof x === "object") Object.values(x).forEach(walk);
    })(v);
    const bad = strings.filter((s) => risky.test(s) && !negated.test(s) && !/30-day predictive model|Modelo predictivo|Modelo preditivo/.test(s));
    expect(bad).toEqual([]);
  });
});

