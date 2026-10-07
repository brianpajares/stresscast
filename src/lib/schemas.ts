/**
 * Esquemas Zod de las fronteras HTTP (CLAUDE.md: Zod o JSON Schema en cada frontera).
 * Espejo de spec/openapi.yaml y spec/inputs.schema.json (additionalProperties=false).
 */
import { z } from "zod";
import { COUNTRIES, DEGREE_RESPONSES, FREQUENCY_RESPONSES, ITEM_KEYS } from "@/engine/types";

export const countrySchema = z.enum(COUNTRIES);
export const localeSchema = z.enum(["es", "en", "pt"]);

export const assessmentInputSchema = z.strictObject({
  country: countrySchema,
  emotionally_exhausting: z.enum(DEGREE_RESPONSES),
  burned_out_due_work: z.enum(DEGREE_RESPONSES),
  work_frustrates: z.enum(DEGREE_RESPONSES),
  worn_out_end_day: z.enum(FREQUENCY_RESPONSES),
  exhausted_morning: z.enum(FREQUENCY_RESPONSES),
  every_working_hour_tiring: z.enum(FREQUENCY_RESPONSES),
  energy_family_friends: z.enum(FREQUENCY_RESPONSES),
});

const finite = z.number().refine(Number.isFinite, "non-finite");

export const calculationResultSchema = z.object({
  model_id: z.literal("stresscast_cbi_work_scenario_v1"),
  model_version: z.string(),
  score: finite.min(0).max(100),
  reference_band: z.enum(["below_high_reference", "high_reference"]),
  reference_cutoff: finite,
  scenario_30d: z.object({
    improve: finite.min(0).max(100),
    no_change: finite.min(0).max(100),
    worsen: finite.min(0).max(100),
    k_improve: z.number().int().min(0).max(2),
    k_worsen: z.number().int().min(0).max(2),
    interpretation: z.literal("scenario_envelope_not_statistical_ci"),
  }),
  sensitivity: z.object({
    one_item_one_category_points: finite,
    two_items_one_category_points: finite,
  }),
  benchmark: z.object({
    puma_work_mean: finite,
    delta_vs_puma_mean: finite,
    population_note: z.string(),
  }),
  item_scores: z
    .array(
      z.object({
        item_id: z.string(),
        input_key: z.enum(ITEM_KEYS),
        order: z.number().int(),
        response: z.string(),
        direct_points: finite,
        burden_points: finite,
        reverse_scored: z.boolean(),
      }),
    )
    .length(7),
  top_drivers: z
    .array(
      z.object({
        rank: z.number().int().min(1).max(3),
        item_id: z.string(),
        input_key: z.enum(ITEM_KEYS),
        burden_points: finite,
      }),
    )
    .length(3),
  localized_price: z.object({
    country: countrySchema,
    currency: z.string(),
    recommended_price: finite,
    price_status: z.string(),
  }),
  warnings: z.array(z.string()),
});

export const emailSchema = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .pipe(z.email());

export const reportRequestInputSchema = z.strictObject({
  email: emailSchema,
  explicit_report_consent: z.literal(true),
  marketing_opt_in: z.boolean(),
  calculation: z.strictObject({
    inputs: assessmentInputSchema,
    result: calculationResultSchema,
  }),
  turnstile_token: z.string().min(1).max(4096),
  locale: localeSchema,
});

export const privacyRequestSchema = z.strictObject({
  email: emailSchema,
  request_type: z.enum(["access", "deletion", "rectification"]),
});

export const stripeCheckoutSchema = z.strictObject({
  calculation_id: z.uuid(),
  email: emailSchema,
  country: countrySchema,
});

export const idempotencyKeySchema = z.string().min(16).max(128).regex(/^[A-Za-z0-9._:-]+$/);

export const eventSchema = z.strictObject({
  name: z.string().max(64),
  props: z.record(z.string(), z.unknown()).default({}),
});

export type ReportRequestInput = z.infer<typeof reportRequestInputSchema>;
export type PrivacyRequestInput = z.infer<typeof privacyRequestSchema>;
