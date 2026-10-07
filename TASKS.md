# TASKS · StressCast

Backlog de implementación. No cerrar un hito si sus criterios de aceptación fallan.

## M0 · Bootstrap, contratos y CI
**Objetivo.** Repositorio reproducible con stack base y gates automáticos.

- Crear Next.js App Router + TypeScript strict.
- Instalar Tailwind, shadcn/ui, next-intl, Supabase, Resend, React PDF, PostHog, Sentry, Turnstile client, Upstash, Stripe, Vitest y Playwright.
- Configurar eslint/typecheck.
- Copiar contratos `spec/` al proyecto sin mutarlos.
- Crear CI GitHub Actions.
- Crear loader de env con validación server/client.
- Crear `DECISIONS.md` y mantenerlo vivo.

**Aceptación.** `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` pasan; CI ejecuta los mismos gates; no hay secretos en repo.

## M1 · Motor, Drive y API de cálculo
**Objetivo.** Cálculo reproducible y artefactos versionados.

- Portar `engine_reference.py` a TypeScript.
- Implementar `npm run test:engine`.
- Cargar manifest/artefactos desde Google Drive.
- Verificar SHA-256.
- Cache 24h + última versión válida.
- Implementar `npm run drive:sync`.
- Implementar `/api/calculate`.

**Aceptación.** 20/20 golden vectors exactos; casos inválidos fallan; checksum inválido no reemplaza cache; Drive caído usa última versión válida; OpenAPI coincide.

## M2 · UX, preview, i18n y metodología
**Objetivo.** Valor visible en <90 s.

- Landing localizada.
- Country screen.
- 7-step assessment mobile-first.
- Processing state.
- Preview según `outputs_spec`.
- Metodología/source UI.
- Accessibility keyboard/focus/reduced motion.
- SEO metadata/hreflang/sitemap.

**Aceptación.** E2E landing→preview; no time-axis preview; no valores completos de escenarios; 360px usable; es/en/pt; Lighthouse móvil >=90.

## M3 · Lead, informe, PDF, emails y admin
**Objetivo.** Validar demanda y operar solicitudes.

- DB migrations desde `spec/db_schema.sql`.
- Report request + consentimientos.
- PDF React.
- Email usuario.
- Email OWNER_EMAIL en validation con disclosure.
- Private report token.
- `/admin`: leads, funnel, resend.
- Audit log.
- Privacy requests.

**Aceptación.** E2E request→email→report; PDF contiene todos outputs full; admin RLS/authz negativo; resend idempotente; no payload sensible en analytics.

## M4 · Seguridad, observabilidad y Stripe feature flag
**Objetivo.** Hardening y ruta de monetización futura.

- Turnstile + rate limit.
- Sentry scrubbing.
- PostHog allowlist.
- CSP/security headers.
- Stripe Checkout + webhook signed/idempotent detrás de flags.
- Cost telemetry sin contenido sensible.

**Aceptación.** Webhook falso rechazado; evento duplicado no duplica order/email; Stripe no aparece con flags off; tests de analytics y Sentry privacy pasan.

## M5 · Release, QA y tracción
**Objetivo.** Deployment reproducible y medición real.

- Deploy preview y production.
- Configurar dominio.
- SPF/DKIM/DMARC.
- Ejecutar acceptance suite.
- Cerrar gates lingüístico/legal/trademark antes de public launch.
- Ejecutar `docs/TRACTION_PLAN.md`.
- Revisar KPIs al día 7 y 14.

**Aceptación.** `docs/LAUNCH_CHECKLIST.md` completo; `docs/final_audit.md` sigue válido respecto al paquete; smoke real end-to-end; observabilidad activa sin PII.
