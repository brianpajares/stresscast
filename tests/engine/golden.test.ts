import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { calculate, bundledModelBase, EngineInputError, ITEM_KEYS, COUNTRIES } from "@/engine";

interface GoldenCase {
  case_id: string;
  description: string;
  inputs: Record<string, unknown>;
  expected: unknown;
}
interface RobustnessCase {
  case_id: string;
  kind: "invalid_input" | "property";
  inputs?: Record<string, unknown>;
  expected_error_contains?: string;
  base_inputs?: Record<string, string>;
  countries?: string[];
  expected_score?: number;
  expected_delta?: number;
  combinations?: number;
}

const vectors = JSON.parse(readFileSync(resolve(__dirname, "../../spec/test_vectors.json"), "utf8")) as {
  cases: GoldenCase[];
  robustness_cases: RobustnessCase[];
};

describe("AT-03/AT-04 · golden vectors (paridad exacta con engine_reference.py)", () => {
  it("contiene los 20 vectores canónicos", () => {
    expect(vectors.cases).toHaveLength(20);
  });

  for (const c of vectors.cases) {
    it(`${c.case_id} · ${c.description}`, () => {
      expect(calculate(c.inputs, bundledModelBase)).toEqual(c.expected);
    });
  }
});

describe("Robustez R01–R10", () => {
  for (const c of vectors.robustness_cases.filter((r) => r.kind === "invalid_input")) {
    it(`${c.case_id} · rechaza input inválido (${c.expected_error_contains})`, () => {
      let error: unknown;
      try {
        calculate(c.inputs, bundledModelBase);
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(EngineInputError);
      expect((error as Error).message).toContain(c.expected_error_contains as string);
    });
  }

  it("R08 · el score es invariante al país", () => {
    const r08 = vectors.robustness_cases.find((c) => c.case_id === "R08")!;
    for (const country of r08.countries!) {
      const res = calculate({ country, ...r08.base_inputs }, bundledModelBase);
      expect(res.score).toBe(r08.expected_score);
    }
  });

  it("R09 · empeorar un paso un ítem suma 25/7 salvo topes", () => {
    const r09 = vectors.robustness_cases.find((c) => c.case_id === "R09")!;
    const base = {
      country: "US",
      emotionally_exhausting: "somewhat",
      burned_out_due_work: "somewhat",
      work_frustrates: "somewhat",
      worn_out_end_day: "sometimes",
      exhausted_morning: "sometimes",
      every_working_hour_tiring: "sometimes",
      energy_family_friends: "sometimes",
    };
    const before = calculate(base, bundledModelBase).score;
    const after = calculate({ ...base, emotionally_exhausting: "high" }, bundledModelBase).score;
    expect(after - before).toBeCloseTo(r09.expected_delta!, 3);
  });

  it("R10 · barrido exhaustivo 5^7: finito, 0..100 e improve <= no_change <= worsen", () => {
    const degree = ["very_low", "low", "somewhat", "high", "very_high"];
    const freq = ["never", "seldom", "sometimes", "often", "always"];
    const scales = [degree, degree, degree, freq, freq, freq, freq];
    let count = 0;
    const idx = [0, 0, 0, 0, 0, 0, 0];
    for (;;) {
      const input: Record<string, string> = { country: "US" };
      ITEM_KEYS.forEach((k, i) => (input[k] = scales[i][idx[i]]));
      const r = calculate(input, bundledModelBase);
      if (!(Number.isFinite(r.score) && r.score >= 0 && r.score <= 100)) throw new Error("score fuera de rango");
      if (!(r.scenario_30d.improve <= r.scenario_30d.no_change && r.scenario_30d.no_change <= r.scenario_30d.worsen)) {
        throw new Error("orden de escenarios inválido");
      }
      count++;
      let pos = 6;
      while (pos >= 0 && ++idx[pos] === 5) idx[pos--] = 0;
      if (pos < 0) break;
    }
    expect(count).toBe(78125);
  });
});

describe("Validación estricta de entradas", () => {
  const valid = {
    country: "US",
    emotionally_exhausting: "somewhat",
    burned_out_due_work: "somewhat",
    work_frustrates: "somewhat",
    worn_out_end_day: "sometimes",
    exhausted_morning: "sometimes",
    every_working_hour_tiring: "sometimes",
    energy_family_friends: "sometimes",
  };

  it("acepta todos los países soportados", () => {
    for (const c of COUNTRIES) {
      expect(calculate({ ...valid, country: c }, bundledModelBase).localized_price.country).toBe(c);
    }
  });

  it.each([null, undefined, 42, "x", []])("rechaza inputs no-objeto: %s", (bad) => {
    expect(() => calculate(bad, bundledModelBase)).toThrow(EngineInputError);
  });

  it("rechaza claves de prototipo y tipos no-string", () => {
    expect(() => calculate({ ...valid, country: "__proto__" }, bundledModelBase)).toThrow(EngineInputError);
    expect(() => calculate({ ...valid, work_frustrates: ["low"] }, bundledModelBase)).toThrow(EngineInputError);
    expect(() => calculate({ ...valid, work_frustrates: 25 }, bundledModelBase)).toThrow(EngineInputError);
  });

  it("no cruza escalas: respuesta de frecuencia en ítem de grado se rechaza (y viceversa)", () => {
    expect(() => calculate({ ...valid, emotionally_exhausting: "often" }, bundledModelBase)).toThrow(EngineInputError);
    expect(() => calculate({ ...valid, worn_out_end_day: "high" }, bundledModelBase)).toThrow(EngineInputError);
  });

  it("no muta el input", () => {
    const copy = structuredClone(valid);
    calculate(valid, bundledModelBase);
    expect(valid).toEqual(copy);
  });
});
