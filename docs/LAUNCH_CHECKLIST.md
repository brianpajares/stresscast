# LAUNCH_CHECKLIST · StressCast

No publicar un mercado hasta completar todos los ítems aplicables.

## Producto y modelo
- [ ] 20/20 golden vectors pasan en Python y TypeScript.
- [ ] Robustness tests relevantes pasan.
- [ ] Preview no usa eje temporal.
- [ ] No hay claims de diagnóstico, probabilidad o predicción.
- [ ] App/model/data/manifest version visibles en auditoría e informe.
- [ ] Comprehension test: >=90% entiende el 30d como escenario condicional; si no, retirar horizonte y usar snapshot-only.

## Wording e i18n
- [ ] Inglés revisado.
- [ ] Español: 7 ítems cotejados contra versión validada/licencia.
- [ ] Portugués PT-BR: 7 ítems cotejados contra versión validada/licencia y contexto de uso.
- [ ] Metadata, canonical y hreflang revisados.

## Legal y privacidad
- [ ] Revisión legal específica por mercado completada.
- [ ] Privacy Policy publicada.
- [ ] Terms/Disclaimer publicados.
- [ ] Flujo de consentimiento de entrega revisado.
- [ ] Disclosure de copia a owner en validation visible antes del submit.
- [ ] Marketing opt-in separado y desmarcado por defecto.
- [ ] Retención y eliminación definidas.
- [ ] Proceso de acceso/rectificación/eliminación documentado.
- [ ] Mapa de proveedores y transferencias revisado.
- [ ] Plan de incidentes/breach revisado.
- [ ] Trademark/domain de StressCast verificados antes de campaña pública.

## Seguridad
- [ ] RLS habilitado y probado negativamente.
- [ ] Service role solo server-side.
- [ ] Turnstile activo.
- [ ] Rate limit activo.
- [ ] CSP/HSTS/headers revisados.
- [ ] Tokens de report no enumerables y expirables.
- [ ] Sentry scrubbing probado.
- [ ] No secrets en bundle/repo.
- [ ] Stripe webhook firmado e idempotente aunque Stripe esté off.

## Drive y datos
- [ ] Carpeta Drive compartida solo con service account necesaria.
- [ ] `npm run drive:sync` exitoso.
- [ ] 8/8 checksums.
- [ ] Cache 24h probado.
- [ ] Fallback a última versión válida probado.

## Email
- [ ] Dominio Resend verificado.
- [ ] SPF configurado.
- [ ] DKIM configurado.
- [ ] DMARC configurado.
- [ ] From/reply-to correctos.
- [ ] Email usuario renderizado en Gmail/Outlook/mobile.
- [ ] Email owner contiene advertencia de sensibilidad y no se reenvía automáticamente.

## Analítica y observabilidad
- [ ] PostHog solo usa allowlist.
- [ ] No email/answers/score/band/PDF/report contents en analytics.
- [ ] Sentry sin PII sensible.
- [ ] Alertas de calculation_error y model_version activas.
- [ ] Funnel validado end-to-end.

## Performance y accesibilidad
- [ ] Lighthouse móvil Performance >=90.
- [ ] Lighthouse móvil Accessibility >=90.
- [ ] Lighthouse móvil Best Practices >=90.
- [ ] Lighthouse móvil SEO >=90.
- [ ] Keyboard-only flow pasa.
- [ ] 360px sin overflow/clipping.
- [ ] Reduced motion probado.

## Monetización
- [ ] `MONETIZATION_MODE=validation`.
- [ ] `STRIPE_ENABLED=false`.
- [ ] Prices etiquetados internamente como hipótesis.
- [ ] Coste variable/report monitorizado vs US$0.50.
- [ ] Regla de activación de pago documentada.

## Prueba real
- [ ] Visita producción.
- [ ] Completa assessment real con datos ficticios.
- [ ] Recibe preview.
- [ ] Solicita report.
- [ ] Llega email usuario.
- [ ] Llega email owner.
- [ ] Abre report privado.
- [ ] Descarga PDF.
- [ ] Admin ve lead y puede reenviar.
- [ ] Eventos de analytics correctos.
