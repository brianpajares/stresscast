# StressCast

Chequeo de **burnout relacionado con el trabajo** basado en la subescala *Work-related* del Copenhagen Burnout Inventory (CBI): score actual 0–100, referencia contextual PUMA y **escenarios what-if** (no predicciones, no probabilidades, no diagnóstico). Next.js 16 · TypeScript estricto · ES/EN/PT · listo para Vercel.

> Fuente de verdad: `docs/PRD.md` → `spec/` → `ux/` → `model/engine_reference.py` → `docs/ACCEPTANCE_TESTS.md`.

## Qué incluye

| Área | Estado |
|---|---|
| Motor determinista TS (paridad exacta con Python, 20/20 golden + 78.125 combinaciones) | ✅ |
| Landing, evaluación 8 pasos (teclado, foco, sessionStorage), preview gratuita sin cifras de escenarios | ✅ |
| Solicitud de informe (email + consentimientos versionados + Turnstile), informe web, **PDF de 7 páginas** (`@react-pdf/renderer`) | ✅ |
| Emails (Resend) con Idempotency-Key; copia al operador en `validation` con *disclosure* previo | ✅ |
| Supabase (RLS + funciones transaccionales/idempotentes), `/admin` (embudo, leads enmascarados, reenvío auditado) | ✅ |
| Google Drive: SHA-256 contra manifiesto bundled, cache 24 h, última versión válida, `npm run drive:sync` | ✅ |
| Stripe Checkout + webhook firmado e idempotente, **solo** con `MONETIZATION_MODE=stripe` y `STRIPE_ENABLED=true` | ✅ |
| Derechos del titular (acceso/rectificación/eliminación con verificación por email), retención (cron diario) | ✅ |
| Analítica con allowlist estricta, Sentry con *scrubbing*, CSP/HSTS, rate limit, Turnstile | ✅ |
| Tests: 133 unit/integración/API + 42 E2E (axe, 360 px, teclado, privacidad, admin) | ✅ |

## Comandos

```bash
npm install
cp .env.example .env.local      # todo es opcional: sin claves funciona en modo demostración
npm run dev                     # http://localhost:3000
npm run lint && npm run typecheck
npm run test                    # unit + integración + API + 20 golden vectors
npm run test:parity             # Python (oracle) vs TypeScript: 78.125 combinaciones (requiere python3)
npm run test:e2e                # Playwright (build + start en :3100). Local en Windows: PW_CHANNEL=msedge
npm run build
npm run doctor                  # revisa configuración vs. gates de lanzamiento
npm run drive:sync              # sube drive/ a GOOGLE_DRIVE_FOLDER_ID (verifica checksums)
npm run model:base              # regenera el snapshot embebido desde drive/base/base_stresscast.xlsx
```

> **Windows corporativo:** si SWC falla con `ERR_SWC_NATIVE_CACHE`, define `SWC_NATIVE_BINDING_CACHE` en una carpeta con ACL limpia (p. ej. `C:\Users\<tú>\.swc-cache`). No afecta a Vercel/CI.

## Modos de operación (degradación elegante)

1. **Demostración (sin claves):** cálculo, preview, informe web y PDF funcionan con **enlaces stateless cifrados (AES-GCM)**: nada se guarda en servidor. Requiere `REPORT_TOKEN_SECRET` (≥ 32 caracteres) estable.
2. **Validación completa:** añade Supabase + Resend + Turnstile (+ Upstash, PostHog, Sentry opcionales). Lead, consentimientos, entrega y `/admin` quedan activos.
3. **Pago (fase 2):** `MONETIZATION_MODE=stripe` + `STRIPE_ENABLED=true` + claves de Stripe. Hasta cumplir el gate de cobro (≥300 previews, ≥100 solicitudes, ≥35 % preview→solicitud en ≤30 días) **no se activa**.

## Despliegue (Vercel)

1. Importa el repo en Vercel (framework Next.js, detectado). `vercel.json` ya declara el cron `/api/cron/retention` (03:17 UTC).
2. Variables (ver `.env.example`): mínimo `NEXT_PUBLIC_APP_URL`, `REPORT_TOKEN_SECRET`. Para producción real: Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `OWNER_EMAIL`, Turnstile (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`), `CRON_SECRET`.
3. Base de datos: aplica `supabase/migrations/*.sql` en orden (primero el esquema canónico, luego funciones) y crea tu usuario en Auth + una fila en `admin_users`.
4. `npm run drive:sync` (opcional) para publicar los artefactos en Drive.
5. `npm run doctor` con las variables de producción; el panel `/admin` muestra la misma lista.

## Gates de lanzamiento (no son bloqueos de build)

`docs/LAUNCH_CHECKLIST.md`. En código: ES/PT **no se indexan** hasta definir `LINGUISTIC_GATE_APPROVED=es,pt` tras cotejar el wording con versiones validadas; las páginas legales son **borrador** hasta la revisión por mercado; verifica marca/dominio *StressCast*; verifica los teléfonos de apoyo de `legal.wellbeing.lines`.

## Estructura

```
spec/ ux/ model/ docs/ drive/   paquete canónico (sin modificar)
src/engine/                     motor puro + lector XLSX + snapshot embebido
src/lib/server/                 env, store (Supabase/memoria), Drive, tokens, email, PDF, Stripe, rate limit
src/app/[locale]/…              sitio (es|en|pt)      src/app/admin/…   panel      src/app/api/…   rutas
supabase/migrations/            esquema + funciones   tests/            unit, API, UI y e2e
```

Decisiones técnicas: `DECISIONS.md`. Este producto no es un dispositivo médico ni ofrece diagnóstico; no debe usarse para decisiones laborales sobre terceros.
