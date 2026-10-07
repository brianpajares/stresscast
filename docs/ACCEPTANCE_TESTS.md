# ACCEPTANCE_TESTS · StressCast

Cada test es obligatorio salvo que se marque explícitamente como feature-flagged. Los tests automatizables deben vivir en CI.

## Matriz FR → test

| Test | FR | US | Qué valida |
| --- | --- | --- | --- |
| AT-01 | FR-01 | US-01 | Soportar países US, GB, CA, AU, BR, MX y ES; idioma es/en/pt mediante next-intl. |
| AT-02 | FR-02 | US-02 | Validar los 8 inputs (country + 7 ítems) con el contrato spec/inputs.schema.json, rechazando campos extra. |
| AT-03 | FR-03 | US-03 | Portar engine_reference.py a TypeScript con paridad exacta en los 20 golden vectors y casos de robustez aplicables. |
| AT-04 | FR-04 | US-03 | Calcular score CBI 0–100, banda de referencia, escenarios condicionales, sensibilidad, benchmark y drivers según spec/model_spec.json. |
| AT-05 | FR-05 | US-04 | Mostrar preview conforme a spec/outputs_spec.json: score, banda, marcador sin eje temporal, top driver y acción. |
| AT-06 | FR-06 | US-04 | Bloquear en preview los valores completos de escenarios y otros outputs de INFORME_COMPLETO. |
| AT-07 | FR-07 | US-05 | Exponer metodología/limitaciones desde model_card y model_spec sin usar claims diagnósticos o probabilísticos. |
| AT-08 | FR-08 | US-06 | Crear solicitud de informe solo con email válido, consentimiento de entrega y Turnstile válido. |
| AT-09 | FR-09 | US-06 | Separar consentimiento de entrega, marketing e investigación; registrar versión y timestamp de cada consentimiento. |
| AT-10 | FR-10 | US-06 | En MONETIZATION_MODE=validation guardar el lead, confirmar al usuario y enviar a OWNER_EMAIL id, inputs, resultados y PDF para cumplimiento manual. |
| AT-11 | FR-11 | US-07 | Entregar al usuario un enlace privado con token no predecible/firmado y sin datos sensibles en la URL. |
| AT-12 | FR-12 | US-08 | Generar PDF con @react-pdf/renderer y layout conforme a ux/report_layout.md. |
| AT-13 | FR-13 | US-08 | Incluir en PDF todos los outputs INFORME_COMPLETO definidos en spec/outputs_spec.json y las versiones de app/modelo. |
| AT-14 | FR-14 | US-09 | Implementar endpoint/proceso de acceso y eliminación de datos verificando identidad antes de actuar. |
| AT-15 | FR-15 | US-10 | Implementar /admin autenticado con leads, embudo y estados de entrega. |
| AT-16 | FR-16 | US-11 | Permitir reenvío desde /admin con auditoría e idempotencia lógica. |
| AT-17 | FR-17 | US-12 | Leer artefactos de Google Drive bajo /Apps/stresscast/ resolviendo nombres/rutas del manifiesto y verificando SHA-256. |
| AT-18 | FR-18 | US-12 | Cachear artefactos Drive por 24h y usar la última versión válida si Drive no responde; nunca aceptar checksum inválido. |
| AT-19 | FR-19 | US-12 | Proveer npm run drive:sync para subir drive/ a GOOGLE_DRIVE_FOLDER_ID conservando jerarquía. |
| AT-20 | FR-20 | US-13 | Emitir únicamente eventos/propiedades permitidos por spec/analytics_events.json. |
| AT-21 | FR-21 | US-13 | No enviar a PostHog/Sentry email, respuestas, score, banda, PDF ni contenido de informe. |
| AT-22 | FR-22 | US-14 | Cumplir WCAG 2.2 AA en el flujo crítico, navegación por teclado y targets táctiles definidos. |
| AT-23 | FR-23 | US-15 | Implementar metadata, sitemap, canonical y hreflang para es/en/pt, respetando gates de wording ES/PT. |
| AT-24 | FR-24 | US-16 | Habilitar Stripe solo cuando MONETIZATION_MODE=stripe y STRIPE_ENABLED=true. |
| AT-25 | FR-25 | US-16 | Crear Checkout Session con precio localizado y webhook con verificación de firma e idempotencia por event_id. |
| AT-26 | FR-26 | US-16 | Tras pago confirmado, entregar automáticamente el PDF y registrar pedido/entrega sin duplicación. |
| AT-27 | FR-27 | US-17 | Modelar estados reintentables para Drive, email y generación de PDF con errores seguros para usuario. |
| AT-28 | FR-28 | US-18 | Aplicar rate limit por IP/clave pseudónima y Cloudflare Turnstile a acciones de alto abuso. |
| AT-29 | FR-29 | US-18 | Aplicar RLS en Supabase, acceso de servicio solo desde servidor y autorización explícita de admin. |
| AT-30 | FR-30 | US-18 | Registrar Sentry con redacción de PII y sin payloads de assessment/report. |
| AT-31 | FR-31 | US-03 | Mantener trazabilidad app_version, model_version y data/manifest version en cálculos, informes y auditoría. |
| AT-32 | FR-32 | US-05 | Mostrar disclaimers de bienestar, prohibición de uso laboral por terceros y recursos de apoyo no emergencial conforme a spec/copy_i18n.json. |

## Procedimientos

### AT-01 · Localización
Abrir cada país soportado con es/en/pt. Verificar moneda/copy y comprobar que cambiar country manteniendo respuestas no altera score.

### AT-02 · Schema
Probar payload completo, un campo faltante, country inválido y propiedad extra. Solo el payload válido retorna 200.

### AT-03 / AT-04 · Engine parity
Ejecutar todos los `cases` de `spec/test_vectors.json` contra Python y TypeScript. Resultado estructurado exacto. Ejecutar robustness cases aplicables. Gate: 100%.

### AT-05 / AT-06 · Preview
E2E en 360px. Ver score, banda, marker/reference, top driver y acción. Confirmar ausencia de eje temporal y ausencia de valores completos improve/worsen.

### AT-07 · Claims
Buscar en UI productiva términos equivalentes a “probabilidad de burnout”, “diagnóstico” y “predicción a 30 días”. Deben estar ausentes salvo en disclaimers negando esos claims.

### AT-08 / AT-09 · Request y consentimiento
Email inválido falla. Turnstile inválido falla. Consentimiento de entrega requerido. Marketing opcional y separado. Persistir versión/timestamp.

### AT-10 · Validation owner flow
Con `MONETIZATION_MODE=validation`, crear request de prueba. Verificar lead, confirmación usuario y email a `OWNER_EMAIL` con id, inputs, resultados y PDF. La UI debe haber mostrado disclosure antes del submit.

### AT-11 · Link privado
Verificar token no secuencial, expiración/configuración, ausencia de PII/score en URL y rechazo de token alterado.

### AT-12 / AT-13 · PDF
Renderizar PDF con un golden vector. Comparar números con output del motor y verificar todos los IDs `INFORME_COMPLETO` de `outputs_spec.json`, app/model version, disclaimer e ID.

### AT-14 · Derechos
Crear dato de prueba; ejecutar acceso/eliminación con verificación de identidad. Confirmar borrado/anonimización según política y audit log minimizado.

### AT-15 / AT-16 · Admin
No-admin recibe 403/redirect seguro. Admin ve leads/funnel. Reenvío registra `admin_actions`; doble click/idempotency no duplica entrega lógica.

### AT-17 / AT-18 / AT-19 · Drive
Sincronizar `drive/`; descargar y verificar 8/8 checksums. Corromper un archivo remoto en entorno de test: debe rechazarse. Simular Drive 500: debe usarse última versión válida. Confirmar TTL 24h. Ejecutar `npm run drive:sync`.

### AT-20 / AT-21 · Analytics privacy
Interceptar PostHog. Comparar nombres/props con `analytics_events.json`. Inyectar email/score en estado local y comprobar que nunca aparecen en requests analytics/Sentry.

### AT-22 · Accesibilidad
Playwright/axe + teclado manual: foco visible, orden lógico, labels, error association, targets >=44px, reduced motion. Lighthouse Accessibility >=90.

### AT-23 · SEO/i18n
Verificar metadata, canonical, hreflang, sitemap y copy esencial es/en/pt. Comprobar que el launch checklist bloquea ES/PT si gate lingüístico sigue abierto.

### AT-24 / AT-25 / AT-26 · Stripe
Con flags off, no checkout visible ni ruta ejecutable para usuario. Con test flags on, crear Checkout Session. Webhook sin firma: 400. Evento válido: un order. Mismo event_id repetido: sigue un order y una entrega.

### AT-27 · Fallos recuperables
Simular error de Resend/PDF/Drive. La request queda en estado reintentable; usuario recibe mensaje seguro; no se duplica lead.

### AT-28 · Rate limit/Turnstile
Superar límite y validar 429/medida equivalente. Turnstile obligatorio en request sensible.

### AT-29 · RLS
Desde anon key intentar SELECT/UPDATE directo a tablas sensibles: denegado. Desde usuario admin autorizado: solo paths permitidos. Service role solo en server tests.

### AT-30 · Sentry
Forzar error. Revisar evento: sin email, respuestas, score, band, PDF URL ni report body.

### AT-31 · Versionado
Cada calculation/report guarda app_version, model_version y data/manifest version. Un cambio de manifest se refleja sin reescribir registros previos.

### AT-32 · Disclaimers
Landing/preview/report muestran lenguaje de wellness/no diagnóstico y prohíben uso laboral por terceros en lugares especificados.

## Gates globales

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:engine`
- `npm run test:e2e`
- `npm run build`
- Lighthouse móvil >=90
- 0 secretos reales en repo
- 0 fallos críticos abiertos
