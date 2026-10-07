# BUILD_PROMPT · primer mensaje para el LLM programador

Actúa como Staff Full-Stack Engineer y entrega un MVP de StressCast listo para desplegar en Vercel.

## Objetivo

Implementar exactamente `docs/PRD.md` y los contratos en `spec/`, usando `ux/` para experiencia y `model/engine_reference.py` como oracle matemático. No hagas preguntas: resuelve ambigüedades con el criterio más conservador, no inventes requisitos y registra toda decisión material en `DECISIONS.md`.

## Stack obligatorio

- Next.js App Router + TypeScript strict.
- Tailwind CSS + shadcn/ui.
- Route Handlers para API.
- Motor TypeScript portado de Python.
- Supabase Postgres con RLS.
- Google Drive API con service account.
- Resend.
- `@react-pdf/renderer`.
- next-intl (`es`, `en`, `pt`).
- PostHog + Sentry con redacción estricta.
- Cloudflare Turnstile + rate limit Upstash.
- Vitest + Playwright.
- GitHub Actions.
- Stripe detrás de `MONETIZATION_MODE=stripe` y `STRIPE_ENABLED=true`.

## Orden de trabajo

1. Lee `README_START_HERE.md`, `docs/PRD.md`, `TASKS.md` y `docs/ACCEPTANCE_TESTS.md`.
2. Inspecciona `spec/inputs.schema.json`, `model_spec.json`, `outputs_spec.json`, `test_vectors.json`, `openapi.yaml` y `db_schema.sql`.
3. Construye M0 y M1 primero. No avances si el puerto TypeScript no pasa 100% de golden vectors.
4. Implementa UX y reportes siguiendo `ux/`.
5. Implementa persistencia, emails, Drive, admin y seguridad.
6. Implementa Stripe solo como ruta desactivada por defecto.
7. Ejecuta todas las pruebas y corrige fallos.
8. Completa `DECISIONS.md` con decisiones reales tomadas durante el build.
9. Deja README de desarrollo con comandos exactos y deployment reproducible.

## Reglas

- No cambies la fórmula, thresholds o semántica del modelo.
- No añadas LLM al cálculo.
- No uses una curva temporal en preview.
- No registres valores de assessment o report en analytics/observabilidad.
- No expongas `SUPABASE_SERVICE_ROLE_KEY`, credenciales Drive, Resend o Stripe al cliente.
- Toda mutación de pago/entrega debe ser idempotente.
- La app debe sobrevivir a Drive caído usando la última versión válida.
- Rechaza una nueva versión Drive si el checksum no coincide.
- En validation, el consentimiento debe revelar la copia operativa a `OWNER_EMAIL`.
- ES/PT se pueden construir con copy preliminar, pero el launch checklist debe bloquear publicación si no se cierra el gate lingüístico.
- Registra desviaciones de spec en `DECISIONS.md`; no las hagas silenciosamente.

## Comandos mínimos esperados

- `npm run dev`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:engine`
- `npm run test:e2e`
- `npm run build`
- `npm run drive:sync`

## Entregables

Código fuente completo, migrations Supabase, Route Handlers, UI responsive, i18n, report web/PDF, emails, admin, Drive sync/loader, Stripe feature-flagged, analytics/observability privacy-safe, CI, tests y documentación de deployment.

## Definition of Done

La Definition of Done es la sección 28 de `docs/PRD.md` y es vinculante. No declares terminado con tests rojos, golden vectors incompletos, RLS sin pruebas negativas, Lighthouse <90, secretos en bundle o gates de launch omitidos.
