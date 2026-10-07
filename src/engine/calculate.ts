/**
 * Motor determinista StressCast v1 — puerto TypeScript de model/engine_reference.py.
 *
 * Reglas (spec/model_spec.json):
 *  - Subescala Work-related Burnout del CBI: 7 ítems, respuestas 0/25/50/75/100.
 *  - El ítem de energía (reverse_scored) puntúa burden = 100 - directo.
 *  - score = media de los 7 burden scores.
 *  - Escenarios what-if: hasta `scenario_items_changed` ítems elegibles cambian
 *    una categoría (25/7 puntos cada uno). NO es una probabilidad ni un IC.
 *
 * Función pura. No usa LLM, red, reloj ni aleatoriedad.
 */
import {
  EngineInputError,
  MODEL_ID,
  MODEL_VERSION,
  type CalculationResult,
  type Country,
  type Driver,
  type ItemKey,
  type ItemScore,
  type ModelBase,
} from "./types";

/** round(x, 4) con la misma semántica observable que Python (y sin -0). */
export function round4(x: number): number {
  const r = Number(x.toFixed(4));
  return r === 0 ? 0 : r;
}

function pyRepr(value: unknown): string {
  if (typeof value === "string") return `'${value}'`;
  if (value === null || value === undefined) return "None";
  return String(value);
}

function pyList(values: readonly string[]): string {
  return `[${values.map((v) => `'${v}'`).join(", ")}]`;
}

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function requireNumberParam(base: ModelBase, key: string): number {
  const raw = base.params[key];
  const n = typeof raw === "number" ? raw : Number(raw);
  if (raw === undefined || raw === null || !Number.isFinite(n)) {
    throw new Error(`Parámetro de modelo inválido o ausente: ${key}`);
  }
  return n;
}

export function calculate(inputs: unknown, base: ModelBase): CalculationResult {
  if (typeof inputs !== "object" || inputs === null || Array.isArray(inputs)) {
    throw new EngineInputError("inputs debe ser un objeto/dict.");
  }
  const record = inputs as Record<string, unknown>;

  const items = base.items;
  const expectedKeys = items.map((r) => r.input_key);
  const allowed = new Set<string>(["country", ...expectedKeys]);

  const unexpected = Object.keys(record)
    .filter((k) => !allowed.has(k))
    .sort();
  if (unexpected.length > 0) {
    throw new EngineInputError(`Inputs no soportados: ${pyList(unexpected)}`);
  }

  const country = record["country"];
  if (typeof country !== "string" || !hasOwn(base.prices, country)) {
    throw new EngineInputError(`country no soportado: ${pyRepr(country)}`, "country");
  }

  const missing = expectedKeys.filter((k) => !hasOwn(record, k));
  if (missing.length > 0) {
    throw new EngineInputError(`Faltan inputs CBI: ${pyList(missing)}`, missing[0]);
  }

  const itemResults: ItemScore[] = items.map((item) => {
    const key = item.input_key;
    const response = record[key];
    const scaleKey = typeof response === "string" ? `${item.scale_type}|${response}` : null;
    if (scaleKey === null || !hasOwn(base.scaleMap, scaleKey)) {
      const allowedResponses = Object.keys(base.scaleMap)
        .filter((k) => k.startsWith(`${item.scale_type}|`))
        .map((k) => k.slice(item.scale_type.length + 1));
      throw new EngineInputError(
        `Respuesta inválida para ${key}: ${pyRepr(response)}; permitidas=${pyList(allowedResponses)}`,
        key,
      );
    }
    const direct = base.scaleMap[scaleKey];
    const burden = item.reverse_scored ? 100 - direct : direct;
    return {
      item_id: item.item_id,
      input_key: key as ItemKey,
      order: item.order,
      response: response as string,
      direct_points: round4(direct),
      burden_points: round4(burden),
      reverse_scored: item.reverse_scored,
    };
  });

  const scores = itemResults.map((r) => r.burden_points);
  const score = scores.reduce((a, b) => a + b, 0) / scores.length;
  const cutoff = requireNumberParam(base, "high_reference_cutoff");
  const responseStep = requireNumberParam(base, "response_step");
  const maxChanges = Math.trunc(requireNumberParam(base, "scenario_items_changed"));

  const eligibleImprove = scores.filter((s) => s > 0).length;
  const eligibleWorsen = scores.filter((s) => s < 100).length;
  const kImprove = Math.min(maxChanges, eligibleImprove);
  const kWorsen = Math.min(maxChanges, eligibleWorsen);
  const unitDelta = responseStep / scores.length;

  const scenarioImprove = Math.max(0, score - kImprove * unitDelta);
  const scenarioWorsen = Math.min(100, score + kWorsen * unitDelta);

  const benchRaw = base.benchmarks["puma_work_mean"] ?? base.params["puma_work_mean"];
  const benchmarkMean = Number(benchRaw);
  if (!Number.isFinite(benchmarkMean)) throw new Error("Parámetro de modelo inválido: puma_work_mean");

  const ranked = [...itemResults].sort((a, b) => b.burden_points - a.burden_points || a.order - b.order);
  const topDrivers: Driver[] = ranked.slice(0, 3).map((r, idx) => ({
    rank: idx + 1,
    item_id: r.item_id,
    input_key: r.input_key,
    burden_points: r.burden_points,
  }));

  const price = base.prices[country];

  return {
    model_id: MODEL_ID,
    model_version: MODEL_VERSION,
    score: round4(score),
    reference_band: score >= cutoff ? "high_reference" : "below_high_reference",
    reference_cutoff: round4(cutoff),
    scenario_30d: {
      improve: round4(scenarioImprove),
      no_change: round4(score),
      worsen: round4(scenarioWorsen),
      k_improve: kImprove,
      k_worsen: kWorsen,
      interpretation: "scenario_envelope_not_statistical_ci",
    },
    sensitivity: {
      one_item_one_category_points: round4(unitDelta),
      two_items_one_category_points: round4(2 * unitDelta),
    },
    benchmark: {
      puma_work_mean: round4(benchmarkMean),
      delta_vs_puma_mean: round4(score - benchmarkMean),
      population_note: "PUMA human-service workers, Denmark; contextual reference, not global norm.",
    },
    item_scores: itemResults,
    top_drivers: topDrivers,
    localized_price: {
      country: country as Country,
      currency: price.currency,
      recommended_price: price.recommended_price,
      price_status: price.price_status,
    },
    warnings: [
      "No es diagnóstico médico.",
      "El escenario a 30 días no es una probabilidad ni un intervalo de confianza.",
    ],
  };
}
