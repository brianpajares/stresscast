# README_START_HERE · StressCast

Este ZIP es el handoff final de Agente 4. Está listo para que un LLM programador convierta las especificaciones en un MVP desplegable.

## Orden de lectura

1. `BUILD_PROMPT.md` — instrucciones maestras de construcción.
2. `docs/PRD.md` — producto, alcance, requisitos, arquitectura y Definition of Done.
3. `TASKS.md` — backlog M0–M5.
4. `spec/` — contratos ejecutables: inputs, outputs, modelo, API, DB, analítica y Drive.
5. `ux/` — flujos, componentes, layout de informe y prototipo.
6. `model/` — motor Python de referencia, QA independiente y model card.
7. `docs/ACCEPTANCE_TESTS.md` — pruebas obligatorias.
8. `docs/DRIVE_SETUP.md` — Google Drive y `npm run drive:sync`.
9. `docs/LAUNCH_CHECKLIST.md` y `docs/TRACTION_PLAN.md`.
10. `docs/final_audit.md` — auditoría del paquete.

## Reglas críticas

- No llames “predicción”, “probabilidad” ni “diagnóstico” a los escenarios.
- Porta el motor a TypeScript y conserva `engine_reference.py` como oracle de QA.
- Ejecuta 100% de `spec/test_vectors.json`.
- No envíes email, respuestas, score, banda o contenido del informe a PostHog/Sentry.
- Lee Drive con checksum, cache 24h y fallback a última versión válida.
- Modo inicial: `MONETIZATION_MODE=validation`; Stripe queda desactivado.
- El wording ES/PT de los 7 ítems y la revisión legal por mercado son gates de launch.

## Estructura acumulativa

Las carpetas `01_estrategia/`, `02_datos_modelo/` y `03_qa_ux/` conservan el trabajo previo. Los artefactos canónicos de build son `docs/`, `spec/`, `model/`, `ux/`, `drive/` y los archivos raíz.

No hay secretos reales en este paquete.
