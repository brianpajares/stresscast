/**
 * Tipos del motor StressCast (stresscast_cbi_work_scenario_v1).
 * Contratos: spec/inputs.schema.json, spec/model_spec.json, spec/openapi.yaml.
 * Este módulo es puro: no depende de Next.js, red ni sistema de archivos.
 */

export const COUNTRIES = ["US", "GB", "CA", "AU", "BR", "MX", "ES"] as const;
export type Country = (typeof COUNTRIES)[number];

export const DEGREE_RESPONSES = ["very_low", "low", "somewhat", "high", "very_high"] as const;
export type DegreeResponse = (typeof DEGREE_RESPONSES)[number];

export const FREQUENCY_RESPONSES = ["never", "seldom", "sometimes", "often", "always"] as const;
export type FrequencyResponse = (typeof FREQUENCY_RESPONSES)[number];

/** Los 7 ítems CBI Work-related, en orden canónico (WB1..WB7). */
export const ITEM_KEYS = [
  "emotionally_exhausting",
  "burned_out_due_work",
  "work_frustrates",
  "worn_out_end_day",
  "exhausted_morning",
  "every_working_hour_tiring",
  "energy_family_friends",
] as const;
export type ItemKey = (typeof ITEM_KEYS)[number];

export type ScaleType = "degree" | "frequency";

export const ITEM_SCALE: Record<ItemKey, ScaleType> = {
  emotionally_exhausting: "degree",
  burned_out_due_work: "degree",
  work_frustrates: "degree",
  worn_out_end_day: "frequency",
  exhausted_morning: "frequency",
  every_working_hour_tiring: "frequency",
  energy_family_friends: "frequency",
};

export interface AssessmentInput {
  country: Country;
  emotionally_exhausting: DegreeResponse;
  burned_out_due_work: DegreeResponse;
  work_frustrates: DegreeResponse;
  worn_out_end_day: FrequencyResponse;
  exhausted_morning: FrequencyResponse;
  every_working_hour_tiring: FrequencyResponse;
  energy_family_friends: FrequencyResponse;
}

export type ReferenceBand = "below_high_reference" | "high_reference";

export interface ItemScore {
  item_id: string;
  input_key: ItemKey;
  order: number;
  response: string;
  direct_points: number;
  burden_points: number;
  reverse_scored: boolean;
}

export interface Driver {
  rank: number;
  item_id: string;
  input_key: ItemKey;
  burden_points: number;
}

export interface ScenarioEnvelope {
  improve: number;
  no_change: number;
  worsen: number;
  k_improve: number;
  k_worsen: number;
  interpretation: "scenario_envelope_not_statistical_ci";
}

export interface CalculationResult {
  model_id: "stresscast_cbi_work_scenario_v1";
  model_version: string;
  score: number;
  reference_band: ReferenceBand;
  reference_cutoff: number;
  scenario_30d: ScenarioEnvelope;
  sensitivity: {
    one_item_one_category_points: number;
    two_items_one_category_points: number;
  };
  benchmark: {
    puma_work_mean: number;
    delta_vs_puma_mean: number;
    population_note: string;
  };
  item_scores: ItemScore[];
  top_drivers: Driver[];
  localized_price: {
    country: Country;
    currency: string;
    recommended_price: number;
    price_status: string;
  };
  warnings: string[];
}

/* ------------------------------------------------------------------ */
/* Base de modelo (parámetros y tablas derivadas de base_stresscast.xlsx) */
/* ------------------------------------------------------------------ */

export interface ModelItem {
  item_id: string;
  order: number;
  input_key: string;
  scale_type: ScaleType;
  reverse_scored: boolean;
}

export interface PriceRow {
  country: string;
  currency: string;
  recommended_price: number;
  price_status: string;
}

export interface ModelBase {
  params: Record<string, number | string | boolean | null>;
  items: ModelItem[];
  /** Clave `${scale_type}|${response_key}` -> puntos. */
  scaleMap: Record<string, number>;
  benchmarks: Record<string, number | string | boolean | null>;
  prices: Record<string, PriceRow>;
}

/** Error de validación de inputs. `field` identifica el campo ofensor cuando aplica. */
export class EngineInputError extends Error {
  readonly code: "invalid_input";
  readonly field: string | null;

  constructor(message: string, field: string | null = null) {
    super(message);
    this.name = "EngineInputError";
    this.code = "invalid_input";
    this.field = field;
  }
}

export const MODEL_ID = "stresscast_cbi_work_scenario_v1" as const;
export const MODEL_VERSION = "1.0.0";
