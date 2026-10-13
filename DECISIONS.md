# DECISIONS.md

Registro vivo para decisiones tomadas por el LLM programador durante la implementación.

## Formato
- Fecha
- ID
- Contexto
- Decisión
- Alternativas descartadas
- Consecuencias
- Archivos afectados

## Decisiones heredadas
Ver `docs/decisions_log.md`. No reabrir decisiones de modelo sin evidencia y sin actualizar contratos, tests y trazabilidad.

---

# Decisiones de implementación (build)

## D-ENG-01 · 2026-10-07 · Next.js 16.4 sin Cache Components
**Contexto.** El scaffold activa `cacheComponents`/`partialPrefetching`. **Decisión.** Desactivarlos: las páginas por idioma se prerenderizan estáticas con `generateStaticParams` + `setRequestLocale`; las rutas con token/sesión son dinámicas. **Consecuencia.** Modelo de render estable; migrar cuando sean obligatorios en la próxima mayor.

## D-ENG-02 · Sin base de datos: enlaces stateless
**Contexto.** El despliegue debe funcionar desde el primer día sin cuentas externas. **Decisión.** Si no hay Supabase, el informe se entrega con un token `s1.` (AES-256-GCM, clave HKDF de `REPORT_TOKEN_SECRET`, AAD = id de solicitud, expira). Con Supabase se usa `v1.` (aleatorio + HMAC, solo se guarda su hash). **Alternativas.** Memoria por instancia (descartada: no sobrevive en serverless).

## D-ENG-03 · CSP con `'unsafe-inline'` en script-src
Nonces exigirían render dinámico de todas las páginas; SRI de Next es experimental. Compensado con `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, allowlist de orígenes y sin `eval` en producción.

## D-ENG-04 · Contrato OpenAPI: extensiones mínimas
`ReportRequestCreated` añade `delivery` (`email|pending|demo`) y, en modo Stripe, `calculation_id`. El servidor **recalcula** y rechaza (400) si `calculation.result` no coincide con los inputs.

## D-ENG-05 · Entrega tras responder
La generación de PDF y los emails corren con `after()`; el estado queda en `delivery_pending|delivery_failed` y es reintentable desde `/admin` (reenvío idempotente que rota el token y no recalcula).

## D-ENG-06 · Gate lingüístico en código
ES/PT son usables pero `noindex`, fuera de sitemap y de hreflang hasta `LINGUISTIC_GATE_APPROVED`.

## D-ENG-07 · Turnstile obligatorio con email real
En producción con Resend configurado y sin `TURNSTILE_SECRET_KEY` las solicitudes se rechazan (evita usar el relé de email para spam). Solo `E2E_MODE`+`ALLOW_MEMORY_STORE` lo omiten; el doctor marca `E2E_MODE` en producción como fallo.

## D-ENG-08 · Stripe: importe y mínimos
El precio sale de la tabla del modelo por país (nunca del cliente). Webhook: se procesa y **después** se registra el `event_id`; la idempotencia real es la transición de estado del pedido (`pending→paid` una sola vez). En modo Stripe el email al owner solo lleva metadatos.

## D-ENG-09 · Admin
Emails enmascarados en UI; sin respuestas/scores/PDF individuales. Autorización en servidor (`admin_users` con service role). Login local por contraseña solo con store en memoria.

## D-ENG-10 · PDF
Inter embebida (data URL) para no depender del tracing de archivos; PDF sin tagged-PDF (no soportado por la librería) — pendiente de evaluar.

## D-ENG-11 · Preview y outputs
La preview solo renderiza `free_preview.give`; el teaser usa «— —» (sin blur de cifras reales). Verificado con test de DOM (AT-06).
