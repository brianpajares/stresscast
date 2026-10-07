#!/usr/bin/env python3
"""Vuelca a stdout (una línea por combinación) el resultado del motor de referencia
Python para las 5^7 = 78.125 combinaciones válidas. Lo consume scripts/parity-sweep.ts.

Orden: producto cartesiano con el primer ítem como dígito más significativo.
"""
import itertools
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "model"))
import engine_reference as e  # noqa: E402

BASE = ROOT / "drive" / "base" / "base_stresscast.xlsx"
DEGREE = ["very_low", "low", "somewhat", "high", "very_high"]
FREQ = ["never", "seldom", "sometimes", "often", "always"]
KEYS = [
    ("emotionally_exhausting", DEGREE),
    ("burned_out_due_work", DEGREE),
    ("work_frustrates", DEGREE),
    ("worn_out_end_day", FREQ),
    ("exhausted_morning", FREQ),
    ("every_working_hour_tiring", FREQ),
    ("energy_family_friends", FREQ),
]

out = sys.stdout
for combo in itertools.product(*[range(5)] * 7):
    inputs = {"country": "US"}
    for (key, scale), i in zip(KEYS, combo):
        inputs[key] = scale[i]
    r = e.calculate(inputs, BASE)
    s = r["scenario_30d"]
    drivers = ",".join(d["item_id"] for d in r["top_drivers"])
    burdens = ",".join(repr(x["burden_points"]) for x in r["item_scores"])
    out.write(
        "|".join(
            [
                repr(r["score"]),
                r["reference_band"],
                repr(s["improve"]),
                repr(s["no_change"]),
                repr(s["worsen"]),
                str(s["k_improve"]),
                str(s["k_worsen"]),
                repr(r["benchmark"]["delta_vs_puma_mean"]),
                repr(r["sensitivity"]["one_item_one_category_points"]),
                repr(r["sensitivity"]["two_items_one_category_points"]),
                drivers,
                burdens,
            ]
        )
        + "\n"
    )
