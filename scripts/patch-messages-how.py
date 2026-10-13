#!/usr/bin/env python3
"""Añade claves de la página Cómo funciona (tabla del ejemplo y model card)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ADD = {
    "en": {"colResponse": "Response", "colBurden": "Burden points", "modelCardTitle": "Model card (verified document)", "modelCardNote": "This text is loaded from the versioned, checksum-verified model card that the app uses."},
    "es": {"colResponse": "Respuesta", "colBurden": "Puntos de carga", "modelCardTitle": "Model card (documento verificado)", "modelCardNote": "Este texto se carga desde la model card versionada, con checksum verificado, que usa la app."},
    "pt": {"colResponse": "Resposta", "colBurden": "Pontos de carga", "modelCardTitle": "Model card (documento verificado)", "modelCardNote": "Este texto é carregado da model card versionada, com checksum verificado, usada pelo app."},
}
for loc, add in ADD.items():
    p = ROOT / "src" / "messages" / f"{loc}.json"
    d = json.loads(p.read_text(encoding="utf-8"))
    d["how"].update(add)
    p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("patched", loc)
