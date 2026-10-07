#!/usr/bin/env python3
"""Implementación QA independiente de StressCast.

Construida por QA exclusivamente a partir de model_spec.json y base_stresscast.xlsx
(hojas Parametros, Tablas_CBI, Tablas_Escala, Tablas_Benchmark, Tablas_Precios),
antes de inspeccionar engine_reference.py.

No usa LLM ni estimación estadística; replica el contrato matemático determinista.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, Any, List
import math

MODEL_ID = "stresscast_cbi_work_scenario_v1"
MODEL_VERSION = "1.0.0"
REFERENCE_CUTOFF = 50.0
PUMA_MEAN = 33.0
RESPONSE_STEP = 25.0
SCENARIO_ITEMS_CHANGED = 2

DEGREE = {"very_low": 0.0, "low": 25.0, "somewhat": 50.0, "high": 75.0, "very_high": 100.0}
FREQUENCY = {"never": 0.0, "seldom": 25.0, "sometimes": 50.0, "often": 75.0, "always": 100.0}

ITEMS = [
    ("WB1", "emotionally_exhausting", 1, "degree", False),
    ("WB2", "burned_out_due_work", 2, "degree", False),
    ("WB3", "work_frustrates", 3, "degree", False),
    ("WB4", "worn_out_end_day", 4, "frequency", False),
    ("WB5", "exhausted_morning", 5, "frequency", False),
    ("WB6", "every_working_hour_tiring", 6, "frequency", False),
    ("WB7", "energy_family_friends", 7, "frequency", True),
]

PRICES = {
    "US": ("USD", 9.9),
    "GB": ("GBP", 6.9),
    "CA": ("CAD", 12.9),
    "AU": ("AUD", 14.9),
    "BR": ("BRL", 25.9),
    "MX": ("MXN", 109.0),
    "ES": ("EUR", 5.9),
}

WARNINGS = [
    "No es diagnóstico médico.",
    "El escenario a 30 días no es una probabilidad ni un intervalo de confianza.",
]

class InputError(ValueError):
    pass

def _finite_number(x: float) -> float:
    y = float(x)
    if not math.isfinite(y):
        raise InputError("Se recibió un valor no finito.")
    return y

def calculate(inputs: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(inputs, dict):
        raise InputError("inputs debe ser un objeto/dict.")

    allowed_keys = {"country", *(key for _, key, _, _, _ in ITEMS)}
    unexpected = sorted(set(inputs) - allowed_keys)
    if unexpected:
        raise InputError(f"Inputs no soportados: {unexpected}")

    country = inputs.get("country")
    if country not in PRICES:
        raise InputError(f"country inválido: {country!r}")

    item_scores: List[Dict[str, Any]] = []
    burden_values: List[float] = []

    for item_id, key, order, scale_type, reverse in ITEMS:
        if key not in inputs:
            raise InputError(f"Falta input requerido: {key}")
        response = inputs[key]
        mapping = DEGREE if scale_type == "degree" else FREQUENCY
        if response not in mapping:
            raise InputError(f"Respuesta inválida para {key}: {response!r}")
        direct = _finite_number(mapping[response])
        burden = 100.0 - direct if reverse else direct
        burden = _finite_number(burden)
        if burden < 0.0 or burden > 100.0:
            raise InputError(f"burden fuera de rango para {key}: {burden}")
        burden_values.append(burden)
        item_scores.append({
            "item_id": item_id,
            "input_key": key,
            "order": order,
            "response": response,
            "direct_points": direct,
            "burden_points": burden,
            "reverse_scored": reverse,
        })

    score = sum(burden_values) / len(burden_values)
    eligible_improve = sum(v > 0.0 for v in burden_values)
    eligible_worsen = sum(v < 100.0 for v in burden_values)
    k_improve = min(SCENARIO_ITEMS_CHANGED, eligible_improve)
    k_worsen = min(SCENARIO_ITEMS_CHANGED, eligible_worsen)

    one_step = RESPONSE_STEP / len(burden_values)
    improve = max(0.0, score - k_improve * one_step)
    no_change = score
    worsen = min(100.0, score + k_worsen * one_step)

    ranked = sorted(item_scores, key=lambda d: (-d["burden_points"], d["order"]))
    top_drivers = [
        {
            "rank": rank,
            "item_id": row["item_id"],
            "input_key": row["input_key"],
            "burden_points": row["burden_points"],
        }
        for rank, row in enumerate(ranked[:3], start=1)
    ]

    currency, recommended_price = PRICES[country]
    return {
        "model_id": MODEL_ID,
        "model_version": MODEL_VERSION,
        "score": score,
        "reference_band": "high_reference" if score >= REFERENCE_CUTOFF else "below_high_reference",
        "reference_cutoff": REFERENCE_CUTOFF,
        "scenario_30d": {
            "improve": improve,
            "no_change": no_change,
            "worsen": worsen,
            "k_improve": k_improve,
            "k_worsen": k_worsen,
            "interpretation": "scenario_envelope_not_statistical_ci",
        },
        "sensitivity": {
            "one_item_one_category_points": one_step,
            "two_items_one_category_points": 2 * one_step,
        },
        "benchmark": {
            "puma_work_mean": PUMA_MEAN,
            "delta_vs_puma_mean": score - PUMA_MEAN,
            "population_note": "PUMA human-service workers, Denmark; contextual reference, not global norm.",
        },
        "item_scores": item_scores,
        "top_drivers": top_drivers,
        "localized_price": {
            "country": country,
            "currency": currency,
            "recommended_price": recommended_price,
            "price_status": "preliminar",
        },
        "warnings": list(WARNINGS),
    }

if __name__ == "__main__":
    import json, sys
    payload = json.load(sys.stdin)
    json.dump(calculate(payload), sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
