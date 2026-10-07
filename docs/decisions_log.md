# decisions_log · Agente 4

## D-401 · 2026-10-06 · Fuente canónica final
**Contexto.** Etapas previas contienen snapshots históricos y Etapa 3 declara `brief.json` canónico.
**Decisión.** PRD v4 + `spec/` + `ux/` + `model/` son la fuente de verdad de build. Se conservan carpetas 1–3 íntegras.
**Consecuencia.** Una contradicción histórica no debe copiarse al código.

## D-402 · 2026-10-06 · Runtime del motor
**Decisión.** Portar a TypeScript; Python queda solo como oracle de QA.
**Razón.** El motor es determinista, no usa ONNX ni dependencias Python imprescindibles.

## D-403 · 2026-10-06 · Monetización inicial
**Decisión.** `MONETIZATION_MODE=validation` por defecto; Stripe deshabilitado.
**Gate.** >=300 previews, >=100 requests, >=35% preview→request en <=30 días y sin incidentes críticos antes de activar pago.

## D-404 · 2026-10-06 · Copia operativa al owner
**Contexto.** QA3 prefería no enviar contenido individual al operador, mientras el protocolo de fábrica de Etapa 4 exige email a `OWNER_EMAIL` con inputs, resultados y PDF en validation.
**Decisión.** En v4 validation se envía la copia requerida, pero el consentimiento debe revelarlo explícitamente y su uso queda limitado a cumplimiento manual. Marketing/analytics siguen separados y sin contenido sensible.
**Consecuencia.** El build no puede reutilizar la frase histórica “no owner copy” en la UI canónica. `spec/copy_i18n.json` y `spec/monetizacion.json` v4 fueron alineados. Este punto debe recibir revisión legal previa a launch.

## D-405 · 2026-10-06 · Persistencia
**Decisión.** Supabase Postgres con RLS; acceso público directo a tablas sensibles denegado; Route Handlers con service role solo server-side.

## D-406 · 2026-10-06 · Drive
**Decisión.** 24h cache + última versión válida; checksum inválido nunca sustituye versión buena; sync explícito con `npm run drive:sync`.

## D-407 · 2026-10-06 · Idiomas
**Decisión.** Construir es/en/pt desde copy existente, pero bloquear launch ES/PT hasta revisión de wording validado.

## D-408 · 2026-10-06 · Legal
**Decisión.** Incluir controles de diseño para GDPR, CCPA/CPRA, LGPD y Ley 29733 sin afirmar cumplimiento automático. Revisión jurídica por mercado es gate de launch.

## D-409 · 2026-10-06 · Vercel primario
**Decisión.** Vercel como target principal; Netlify como alternativa documentada, no despliegue dual obligatorio.

## D-410 · 2026-10-06 · Sin train.py
**Decisión.** No crear `train.py` porque el modelo seleccionado no requiere entrenamiento. Inventarlo aumentaría confusión.
