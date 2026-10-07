#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Actualiza factores PPP de consumo privado para los países soportados.

Fuente oficial:
World Bank API, indicador PA.NUS.PRVT.PP
https://api.worldbank.org/v2/country/USA;GBR;CAN;AUS;BRA;MEX;ESP/indicator/PA.NUS.PRVT.PP

Este script está pensado para el build con internet. No modifica el XLSX directamente:
genera un CSV validado para revisión/ingesta posterior.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

COUNTRIES = {
    "USA": "US",
    "GBR": "GB",
    "CAN": "CA",
    "AUS": "AU",
    "BRA": "BR",
    "MEX": "MX",
    "ESP": "ES",
}
INDICATOR = "PA.NUS.PRVT.PP"
API_BASE = "https://api.worldbank.org/v2/country/"


def fetch(year: int = 2025):
    joined = ";".join(COUNTRIES)
    params = urlencode({"format": "json", "date": f"{year}:{year}", "per_page": 100})
    url = f"{API_BASE}{joined}/indicator/{INDICATOR}?{params}"
    with urlopen(url, timeout=30) as resp:
        payload = json.load(resp)
    if not isinstance(payload, list) or len(payload) < 2:
        raise RuntimeError("Respuesta inesperada de World Bank API")
    rows = []
    for item in payload[1]:
        iso3 = item.get("countryiso3code")
        value = item.get("value")
        if iso3 not in COUNTRIES or value is None:
            continue
        val = float(value)
        if not (val > 0):
            raise ValueError(f"PPP no positivo para {iso3}: {val}")
        rows.append({
            "country": COUNTRIES[iso3],
            "iso3": iso3,
            "year": int(item["date"]),
            "ppp_factor": val,
            "source_url": url,
            "indicator": INDICATOR,
            "status": "verificado_por_api_en_build",
        })
    found = {r["country"] for r in rows}
    expected = set(COUNTRIES.values())
    if found != expected:
        raise RuntimeError(f"Países faltantes: {sorted(expected-found)}")
    return sorted(rows, key=lambda r: r["country"])


def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--year", type=int, default=2025)
    p.add_argument("--out", type=Path, default=Path("ppp_private_consumption.csv"))
    args = p.parse_args()
    rows = fetch(args.year)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print(f"{len(rows)} filas validadas -> {args.out}")


if __name__ == "__main__":
    main()
