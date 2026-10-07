/**
 * Construye la base del modelo (parámetros + tablas) desde base_stresscast.xlsx.
 * Porta `_load_base_cached` de model/engine_reference.py.
 */
import { readXlsxSheets, type CellValue, type SheetRecord } from "./xlsx";
import type { ModelBase, ModelItem, PriceRow, ScaleType } from "./types";

export const REQUIRED_SHEETS = [
  "Parametros",
  "Tablas_CBI",
  "Tablas_Escala",
  "Tablas_Benchmark",
  "Tablas_Precios",
] as const;

export function asBool(value: CellValue | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  return ["1", "true", "yes", "sí", "si"].includes(String(value ?? "").trim().toLowerCase());
}

function truthy(value: CellValue | undefined): boolean {
  // Semántica de `if r.get(k)` en Python para celdas simples.
  return value !== null && value !== undefined && value !== "" && value !== 0 && value !== false;
}

export function buildModelBase(sheets: Record<string, SheetRecord[]>): ModelBase {
  const params: ModelBase["params"] = {};
  for (const r of sheets["Parametros"]) {
    if (truthy(r["parametro"])) params[String(r["parametro"])] = r["valor"] ?? null;
  }

  const items: ModelItem[] = [...sheets["Tablas_CBI"]]
    .sort((a, b) => Number(a["orden"] ?? 0) - Number(b["orden"] ?? 0))
    .map((r) => ({
      item_id: String(r["item_id"]),
      order: Number(r["orden"]),
      input_key: String(r["input_key"]),
      scale_type: String(r["scale_type"]) as ScaleType,
      reverse_scored: asBool(r["reverse_scored"]),
    }));

  const scaleMap: ModelBase["scaleMap"] = {};
  for (const r of sheets["Tablas_Escala"]) {
    if (truthy(r["scale_type"]) && truthy(r["response_key"]) && r["points"] !== null && r["points"] !== undefined) {
      scaleMap[`${String(r["scale_type"])}|${String(r["response_key"])}`] = Number(r["points"]);
    }
  }

  const benchmarks: ModelBase["benchmarks"] = {};
  for (const r of sheets["Tablas_Benchmark"]) {
    if (truthy(r["metric"])) benchmarks[String(r["metric"])] = r["value"] ?? null;
  }

  const prices: Record<string, PriceRow> = {};
  for (const r of sheets["Tablas_Precios"]) {
    if (truthy(r["country"])) {
      prices[String(r["country"])] = {
        country: String(r["country"]),
        currency: String(r["currency"]),
        recommended_price: Number(r["recommended_price"]),
        price_status: String(r["price_status"]),
      };
    }
  }

  return { params, items, scaleMap, benchmarks, prices };
}

/** Parsea los bytes de base_stresscast.xlsx y devuelve la base del modelo. */
export function parseModelBaseXlsx(bytes: Uint8Array): ModelBase {
  return buildModelBase(readXlsxSheets(bytes, REQUIRED_SHEETS));
}
