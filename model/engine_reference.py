#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Motor de referencia StressCast v1.

Regla central:
- Lee parámetros y tablas desde base_stresscast.xlsx.
- Calcula la subescala Work-related Burnout del Copenhagen Burnout Inventory (CBI).
- Genera un sobre de escenarios a 30 días. El sobre NO es una probabilidad ni un IC.

Dependencias: solo biblioteca estándar de Python.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List
import math
import re
import zipfile
import xml.etree.ElementTree as ET


NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS_DOCREL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_PKGREL = "http://schemas.openxmlformats.org/package/2006/relationships"


def _col_to_index(cell_ref: str) -> int:
    m = re.match(r"([A-Z]+)", cell_ref)
    if not m:
        raise ValueError(f"Referencia de celda inválida: {cell_ref}")
    n = 0
    for ch in m.group(1):
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def _read_shared_strings(zf: zipfile.ZipFile) -> List[str]:
    try:
        raw = zf.read("xl/sharedStrings.xml")
    except KeyError:
        return []
    root = ET.fromstring(raw)
    out: List[str] = []
    for si in root.findall(f"{{{NS_MAIN}}}si"):
        parts = [t.text or "" for t in si.iter(f"{{{NS_MAIN}}}t")]
        out.append("".join(parts))
    return out


def _sheet_paths(zf: zipfile.ZipFile) -> Dict[str, str]:
    wb_root = ET.fromstring(zf.read("xl/workbook.xml"))
    rel_root = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rels: Dict[str, str] = {}
    for rel in rel_root.findall(f"{{{NS_PKGREL}}}Relationship"):
        rels[rel.attrib["Id"]] = rel.attrib["Target"]

    out: Dict[str, str] = {}
    for sheet in wb_root.find(f"{{{NS_MAIN}}}sheets"):
        name = sheet.attrib["name"]
        rid = sheet.attrib[f"{{{NS_DOCREL}}}id"]
        target = rels[rid].lstrip("/")
        if target.startswith("xl/"):
            out[name] = target
        else:
            out[name] = "xl/" + target
    return out


def _cell_value(cell: ET.Element, shared: List[str]) -> Any:
    ctype = cell.attrib.get("t")
    if ctype == "inlineStr":
        parts = [t.text or "" for t in cell.iter(f"{{{NS_MAIN}}}t")]
        return "".join(parts)
    v = cell.find(f"{{{NS_MAIN}}}v")
    if v is None:
        return None
    text = v.text or ""
    if ctype == "s":
        return shared[int(text)]
    if ctype == "b":
        return text == "1"
    if ctype in ("str", "e"):
        return text
    try:
        f = float(text)
        return int(f) if f.is_integer() else f
    except ValueError:
        return text


def _sheet_matrix(zf: zipfile.ZipFile, path: str, shared: List[str]) -> List[List[Any]]:
    root = ET.fromstring(zf.read(path))
    rows: List[List[Any]] = []
    for row in root.iter(f"{{{NS_MAIN}}}row"):
        vals: Dict[int, Any] = {}
        max_idx = -1
        for cell in row.findall(f"{{{NS_MAIN}}}c"):
            ref = cell.attrib.get("r", "A1")
            idx = _col_to_index(ref)
            vals[idx] = _cell_value(cell, shared)
            max_idx = max(max_idx, idx)
        if max_idx >= 0:
            rows.append([vals.get(i) for i in range(max_idx + 1)])
    return rows


def _records(matrix: List[List[Any]]) -> List[Dict[str, Any]]:
    if not matrix:
        return []
    headers = [str(x).strip() if x is not None else "" for x in matrix[0]]
    out: List[Dict[str, Any]] = []
    for row in matrix[1:]:
        rec: Dict[str, Any] = {}
        nonempty = False
        for i, h in enumerate(headers):
            if not h:
                continue
            val = row[i] if i < len(row) else None
            rec[h] = val
            if val not in (None, ""):
                nonempty = True
        if nonempty:
            out.append(rec)
    return out


@lru_cache(maxsize=8)
def _load_base_cached(path_str: str, mtime_ns: int) -> Dict[str, Any]:
    path = Path(path_str)
    with zipfile.ZipFile(path, "r") as zf:
        shared = _read_shared_strings(zf)
        paths = _sheet_paths(zf)
        required = [
            "Parametros",
            "Tablas_CBI",
            "Tablas_Escala",
            "Tablas_Benchmark",
            "Tablas_Precios",
        ]
        missing = [s for s in required if s not in paths]
        if missing:
            raise ValueError(f"Base XLSX incompleta; faltan hojas: {missing}")
        sheets = {
            name: _records(_sheet_matrix(zf, paths[name], shared))
            for name in required
        }

    params = {
        str(r["parametro"]): r.get("valor")
        for r in sheets["Parametros"]
        if r.get("parametro")
    }
    items = sorted(
        sheets["Tablas_CBI"],
        key=lambda r: int(r.get("orden") or 0)
    )
    scale_map = {
        (str(r["scale_type"]), str(r["response_key"])): float(r["points"])
        for r in sheets["Tablas_Escala"]
        if r.get("scale_type") and r.get("response_key") and r.get("points") is not None
    }
    benchmarks = {
        str(r["metric"]): r.get("value")
        for r in sheets["Tablas_Benchmark"]
        if r.get("metric")
    }
    prices = {
        str(r["country"]): r
        for r in sheets["Tablas_Precios"]
        if r.get("country")
    }

    return {
        "params": params,
        "items": items,
        "scale_map": scale_map,
        "benchmarks": benchmarks,
        "prices": prices,
    }


def _load_base(base: str | Path) -> Dict[str, Any]:
    path = Path(base).expanduser().resolve()
    if not path.exists():
        raise FileNotFoundError(path)
    stat = path.stat()
    return _load_base_cached(str(path), stat.st_mtime_ns)


def _as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    return str(value).strip().lower() in {"1", "true", "yes", "sí", "si"}


def _round4(x: float) -> float:
    return round(float(x) + 0.0, 4)


def calculate(inputs: Dict[str, Any], base: str | Path) -> Dict[str, Any]:
    """Calcula resultados estructurados a partir de inputs y la base XLSX."""
    if not isinstance(inputs, dict):
        raise ValueError("inputs debe ser un objeto/dict.")
    data = _load_base(base)
    params = data["params"]
    items = data["items"]
    scale_map = data["scale_map"]
    prices = data["prices"]

    expected_keys = [str(r["input_key"]) for r in items]
    allowed_keys = {"country", *expected_keys}
    unexpected = sorted(set(inputs) - allowed_keys)
    if unexpected:
        raise ValueError(f"Inputs no soportados: {unexpected}")

    country = inputs.get("country")
    if country not in prices:
        raise ValueError(f"country no soportado: {country!r}")

    missing = [k for k in expected_keys if k not in inputs]
    if missing:
        raise ValueError(f"Faltan inputs CBI: {missing}")

    item_results: List[Dict[str, Any]] = []
    for item in items:
        key = str(item["input_key"])
        scale_type = str(item["scale_type"])
        response = str(inputs[key])
        map_key = (scale_type, response)
        if map_key not in scale_map:
            allowed = [rk for (st, rk), _ in scale_map.items() if st == scale_type]
            raise ValueError(
                f"Respuesta inválida para {key}: {response!r}; permitidas={allowed}"
            )
        direct = float(scale_map[map_key])
        reverse = _as_bool(item.get("reverse_scored"))
        burden = 100.0 - direct if reverse else direct
        item_results.append(
            {
                "item_id": str(item["item_id"]),
                "input_key": key,
                "order": int(item["orden"]),
                "response": response,
                "direct_points": _round4(direct),
                "burden_points": _round4(burden),
                "reverse_scored": reverse,
            }
        )

    scores = [float(r["burden_points"]) for r in item_results]
    score = sum(scores) / len(scores)
    cutoff = float(params["high_reference_cutoff"])
    response_step = float(params["response_step"])
    max_changes = int(params["scenario_items_changed"])

    eligible_improve = sum(s > 0 for s in scores)
    eligible_worsen = sum(s < 100 for s in scores)
    k_improve = min(max_changes, eligible_improve)
    k_worsen = min(max_changes, eligible_worsen)
    unit_delta = response_step / len(scores)

    scenario_improve = max(0.0, score - k_improve * unit_delta)
    scenario_worsen = min(100.0, score + k_worsen * unit_delta)

    benchmark_mean = float(data["benchmarks"].get("puma_work_mean", params["puma_work_mean"]))
    ranked = sorted(
        item_results,
        key=lambda r: (-float(r["burden_points"]), int(r["order"]))
    )
    top3 = [
        {
            "rank": idx + 1,
            "item_id": r["item_id"],
            "input_key": r["input_key"],
            "burden_points": r["burden_points"],
        }
        for idx, r in enumerate(ranked[:3])
    ]

    price_row = prices[country]
    price = {
        "country": country,
        "currency": str(price_row["currency"]),
        "recommended_price": float(price_row["recommended_price"]),
        "price_status": str(price_row["price_status"]),
    }

    return {
        "model_id": "stresscast_cbi_work_scenario_v1",
        "model_version": "1.0.0",
        "score": _round4(score),
        "reference_band": "high_reference" if score >= cutoff else "below_high_reference",
        "reference_cutoff": _round4(cutoff),
        "scenario_30d": {
            "improve": _round4(scenario_improve),
            "no_change": _round4(score),
            "worsen": _round4(scenario_worsen),
            "k_improve": k_improve,
            "k_worsen": k_worsen,
            "interpretation": "scenario_envelope_not_statistical_ci",
        },
        "sensitivity": {
            "one_item_one_category_points": _round4(unit_delta),
            "two_items_one_category_points": _round4(2 * unit_delta),
        },
        "benchmark": {
            "puma_work_mean": _round4(benchmark_mean),
            "delta_vs_puma_mean": _round4(score - benchmark_mean),
            "population_note": "PUMA human-service workers, Denmark; contextual reference, not global norm.",
        },
        "item_scores": item_results,
        "top_drivers": top3,
        "localized_price": price,
        "warnings": [
            "No es diagnóstico médico.",
            "El escenario a 30 días no es una probabilidad ni un intervalo de confianza.",
        ],
    }


__all__ = ["calculate"]
