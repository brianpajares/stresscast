import type { AssessmentInput, CalculationResult, ModelBase } from "@/engine/types";
import type { Locale } from "@/i18n/routing";
import { verificationId } from "./verification";

export interface ReportVersions {
  app: string;
  model: string;
  data: string;
  manifest: string;
}

export interface PumaFacts {
  mean: number;
  sd: number;
  n: number;
  shareHigh: number;
  alpha: number;
  delta: number;
}

/**
 * Datos del informe (INFORME_COMPLETO de spec/outputs_spec.json). Mismos números en web y PDF:
 * todo sale del resultado ya calculado/almacenado + los parámetros PUMA de la base del modelo.
 */
export interface ReportData {
  requestId: string;
  verificationId: string;
  locale: Locale;
  issuedAt: string;
  versions: ReportVersions;
  inputs: AssessmentInput;
  result: CalculationResult;
  puma: PumaFacts;
}

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function buildReportData(args: {
  requestId: string;
  locale: Locale;
  issuedAt: string;
  versions: ReportVersions;
  inputs: AssessmentInput;
  result: CalculationResult;
  base: ModelBase;
}): ReportData {
  const b = args.base.benchmarks;
  return {
    requestId: args.requestId,
    verificationId: verificationId(args.requestId, args.result.model_version, args.issuedAt),
    locale: args.locale,
    issuedAt: args.issuedAt,
    versions: args.versions,
    inputs: args.inputs,
    result: args.result,
    puma: {
      mean: args.result.benchmark.puma_work_mean,
      sd: num(b["puma_work_sd"], 17.7),
      n: num(b["puma_work_n"], 1910),
      shareHigh: num(b["puma_high_share"], 0.198),
      alpha: num(b["puma_work_alpha"], 0.87),
      delta: args.result.benchmark.delta_vs_puma_mean,
    },
  };
}
