# CLAUDE.md

Estas reglas aplican a Claude Code y cualquier agente de código que trabaje en este repositorio.

## Fuente de verdad
1. `docs/PRD.md`
2. `spec/`
3. `ux/`
4. `model/engine_reference.py`
5. `docs/ACCEPTANCE_TESTS.md`

Los documentos de `01_estrategia/`, `02_datos_modelo/` y `03_qa_ux/` son históricos.

## Convenciones
- TypeScript strict; nada de `any` salvo frontera de librería y con validación inmediata.
- Zod o JSON Schema para fronteras HTTP.
- Server Components por defecto; Client Components solo donde aporten interacción.
- Funciones puras para el motor.
- No mezclar cálculo con copy.
- IDs con UUID.
- Timestamps UTC en DB.
- Dinero en unidades menores.
- Errores de API con `code`, `message`, `request_id`.

## Pruebas obligatorias
Antes de merge: lint, typecheck, unit, engine parity, integration, Playwright smoke, build. Los 20 golden vectors son gate duro.

## Privacidad
PostHog/Sentry no reciben email, respuestas, score, banda, PDF, report contents ni free text. Nunca logs de payloads completos.

## Seguridad
No exponer secretos. RLS habilitado. Admin autorizado por `admin_users`. Webhooks firmados. Rate limit + Turnstile. Tokens privados firmados/aleatorios.

## Decisiones
No inventes requisitos. Si el PRD deja una opción técnica abierta, elige la opción más simple que cumpla NFR y registra la elección en `DECISIONS.md` con fecha, contexto, decisión y consecuencia.

## Comandos
`npm run dev`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:engine`, `npm run test:e2e`, `npm run build`, `npm run drive:sync`.
