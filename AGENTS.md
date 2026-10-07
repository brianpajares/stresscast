# AGENTS.md

Estas reglas aplican a Codex y cualquier agente de cÃ³digo que trabaje en este repositorio.

## Fuente de verdad
1. `docs/PRD.md`
2. `spec/`
3. `ux/`
4. `model/engine_reference.py`
5. `docs/ACCEPTANCE_TESTS.md`

Los documentos de `01_estrategia/`, `02_datos_modelo/` y `03_qa_ux/` son histÃ³ricos.

## Convenciones
- TypeScript strict; nada de `any` salvo frontera de librerÃ­a y con validaciÃ³n inmediata.
- Zod o JSON Schema para fronteras HTTP.
- Server Components por defecto; Client Components solo donde aporten interacciÃ³n.
- Funciones puras para el motor.
- No mezclar cÃ¡lculo con copy.
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
No inventes requisitos. Si el PRD deja una opciÃ³n tÃ©cnica abierta, elige la opciÃ³n mÃ¡s simple que cumpla NFR y registra la elecciÃ³n en `DECISIONS.md` con fecha, contexto, decisiÃ³n y consecuencia.

## Comandos
`npm run dev`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:engine`, `npm run test:e2e`, `npm run build`, `npm run drive:sync`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

