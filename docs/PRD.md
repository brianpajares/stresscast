# PRD · StressCast

**Documento:** Product Requirements Document  
**Versión:** 4.0.0  
**Fecha:** 2026-10-06  
**Estado:** READY_TO_BUILD con gates de lanzamiento explícitos  
**Owner funcional:** Product  
**Fuente canónica:** este PRD + `spec/` + `ux/` + `model/` del paquete BUILD_stresscast_v4  
**Principio no negociable:** StressCast mide burnout relacionado con el trabajo actual mediante CBI y muestra escenarios condicionales what-if; no diagnostica ni predice una probabilidad individual a 30 días.


## 0. Ficha y versión

**Producto.** StressCast es una web app B2C mobile-first para adultos que trabajan. Completa un chequeo de 7 ítems Work-related del Copenhagen Burnout Inventory (CBI), calcula un score actual de 0–100, lo contextualiza con una referencia PUMA y genera escenarios condicionales de sensibilidad.

**Versión funcional.** MVP v1 del producto; paquete de fábrica v4. El motor es `stresscast_cbi_work_scenario_v1` versión 1.0.0. El estado de Etapa 3 fue `PASS_WITH_FIXES`; los fixes abiertos son gates de lanzamiento, no bloqueos de build.

**Mercados iniciales.** US, GB, CA, AU, BR, MX y ES. Idiomas de interfaz: español, inglés y portugués (PT-BR para copy de Brasil). El wording ES/PT del cuestionario es preliminar hasta revisión contra versiones validadas.

**Modo comercial inicial.** `MONETIZATION_MODE=validation`; Stripe permanece detrás de feature flag.


## 1. Resumen ejecutivo

StressCast reduce una pregunta difusa —“¿cuánto agotamiento laboral estoy acumulando?”— a una medición breve, auditable y útil en menos de 90 segundos. El MVP evita dos errores de categoría: no se presenta como herramienta clínica y no transforma una simulación ordinal en una predicción temporal.

La experiencia entrega valor antes de pedir email: score actual, banda de referencia, un marcador contextual, el driver principal y una acción genérica. El informe completo agrega escenarios improve/no-change/worsen, top 3 drivers, sensibilidad, benchmark, plan de 7 días y metodología. En fase de validación el informe es gratuito a cambio de email + consentimiento de entrega; el objetivo es probar demanda, comprensión y disposición a solicitar el informe antes de activar pago.

El motor numérico es determinista y debe portarse a TypeScript con paridad exacta frente a `model/engine_reference.py` y `spec/test_vectors.json`. Google Drive es la fuente operativa de artefactos versionados; Supabase almacena leads, cálculos, pedidos y auditoría; Resend entrega emails; `@react-pdf/renderer` produce el PDF; PostHog y Sentry operan con prohibición explícita de payloads sensibles.


## 2. Problema y evidencia

**Problema de usuario.** Knowledge workers y managers pueden reconocer cansancio o estrés sin saber si su agotamiento laboral actual es bajo, intermedio o elevado respecto de una referencia conocida, ni qué componentes están empujando más su score. Las alternativas frecuentes se orientan a contenido, terapia, biometría o seguimiento general y no a una medición breve, explicable y de baja fricción.

**Evidencia del paquete.** El brief canónico reporta señales de dolor relevantes: 40% de empleados globales y 45% de managers experimentando estrés gran parte del día previo (2025, según fuentes de Etapa 1), además de costes laborales y económicos asociados a depresión/ansiedad. Estas cifras sirven como contexto de mercado, no como validación específica de conversión para StressCast.

**Evidencia de producto.** La validación técnica de Etapa 3 encontró 20/20 golden vectors correctos, 20/20 paridad entre motor de referencia e implementación independiente, 10/10 casos de robustez y 78,125/78,125 combinaciones válidas sin violaciones matemáticas.

**Limitación clave.** No existe en el paquete una cohorte longitudinal abierta y comercialmente utilizable que permita calibrar una probabilidad individual a 30 días. Por eso el producto usa escenarios what-if y conserva cualquier métrica predictiva como `future_only`.


## 3. Mercado y segmentos

**Segmento primario.** High-load knowledge workers y managers: estimación interna ≈210M globales, basada en proxies y supuestos del brief. Es una aproximación de orden de magnitud, no un dato de mercado verificado.

**Segmento secundario.** Long-hours workers digitalmente alcanzables: estimación interna ≈120M, también con supuestos de reachability y solapamiento.

**Geografía inicial.** Estados Unidos, Reino Unido, Canadá, Australia, Brasil, México y España. La secuencia de lanzamiento debe priorizar mercados donde el wording lingüístico, privacidad y canales de adquisición estén listos.

**Wedge.** Un chequeo de burnout laboral actual con explicación y escenarios condicionales es suficientemente específico para diferenciarse de apps de wellness amplias y suficientemente ligero para funcionar como producto de adquisición/lead-gen.

**Criterio de expansión.** No abrir un nuevo mercado hasta disponer de: copy revisado, política de privacidad localizable, moneda/precio correcto, validación legal operativa y plan de soporte.


## 4. Persona y JTBD

**Persona primaria — “professional under sustained load”.** Adulto que trabaja en un rol de conocimiento, management, consultoría, tecnología, finanzas, operaciones o función equivalente; siente agotamiento, pero no busca inicialmente terapia ni un dispositivo.

**Contexto.** Tiene 60–90 segundos, usa móvil, desconfía de claims de IA opacos y quiere una respuesta útil sin registrarse antes de ver valor.

**JTBD funcional.** “Cuando noto que el trabajo me está drenando, quiero medir rápidamente mi nivel actual y ver qué lo está moviendo para decidir qué pequeño cambio probar primero.”

**JTBD emocional.** Convertir incertidumbre difusa en una señal interpretable sin dramatizar ni medicalizar.

**JTBD social.** Poder hablar del propio estado con lenguaje neutral y metodológicamente defendible, sin producir un “diagnóstico” ni un dato apto para evaluación laboral por terceros.

**Anti-persona.** Empleador que pretende usar scores individuales para decisiones de contratación, performance, promoción o despido; uso explícitamente fuera de alcance.


## 5. Competencia

La referencia competitiva del brief incluye Headspace, Calm, Welltory, BetterHelp, Wysa y MindDoc. La comparación debe mantenerse a nivel de categoría y propuesta, no de claims no verificados.

| Alternativa | Fortaleza percibida | Vacío que StressCast explota |
| --- | --- | --- |
| Headspace / Calm | Marca, contenido y hábitos | No se centran en un score CBI laboral explicable y ultrabreve. |
| Welltory | Datos y wellness cuantificado | Mayor fricción y dependencia de datos/dispositivos; scope más amplio. |
| BetterHelp | Acceso a terapia | Coste y fricción muy superiores para un primer self-check no clínico. |
| Wysa | Soporte conversacional | Conversación/coaching, no motor determinista CBI con escenarios transparentes. |
| MindDoc | Seguimiento de salud mental | Enfoque más clínico/monitorización; StressCast evita claims médicos. |
| Cuestionarios estáticos | Baja fricción | Suelen carecer de UX, explicación de drivers, escenarios, PDF y funnel medible. |

## 6. Propuesta de valor

**Promesa principal.** “Mide tu carga de burnout laboral actual en menos de 90 segundos y explora qué podría cambiar si cambian tus respuestas.”

**Diferenciadores.**
- Motor determinista, auditable y versionado.
- Solo 7 ítems CBI + país; sin biometría, wearables, cámara o voz.
- Valor visible antes del email.
- Incertidumbre explícita: escenarios condicionales, no “forecast”.
- Método y fuentes accesibles.
- Diseño pensado para no habilitar uso laboral por terceros.

**Mensajes prohibidos.** “Predice tu burnout”, “riesgo clínico”, “probabilidad de burnout”, “diagnóstico”, “previene burnout en 30 días” o cualquier equivalencia entre el sobre de escenarios y un intervalo de confianza.


## 7. Alcance MVP, fuera de alcance y v2

**MVP.** Landing, localización, evaluación mobile-first, cálculo determinista, preview, metodología, gate de email, consentimiento, informe web/PDF, emails, panel admin mínimo, Google Drive con checksum/cache/fallback, analítica privacy-safe, observabilidad, pruebas, CI/CD y feature flag de Stripe.

**Fuera de alcance.** Diagnóstico de depresión/ansiedad, chatbot de crisis, terapia, biometría, wearables, reconocimiento de emoción, employer dashboards individuales, decisiones laborales, feed social, gamificación y pago activo durante la validación.

**v2 condicionada a evidencia.** Re-checks semanales, historial personal, alertas de cambio, suscripción, packs, integraciones opt-in, cohortes longitudinales consentidas y eventualmente un modelo predictivo separado si existe ground truth suficiente.

**Gate de suscripción.** Activar solo si ≥25% de compradores realiza segundo check-in dentro de 45 días o existe señal equivalente de recurrencia.


## 8. Flujo end-to-end

```mermaid
flowchart TD
    A[Landing localizada] --> B[Elegir país]
    B --> C[7 preguntas CBI]
    C --> D[POST /api/calculate]
    D --> E{Cálculo válido}
    E -- No --> F[Error recuperable]
    F --> C
    E -- Sí --> G[Preview gratis]
    G --> H[Metodología opcional]
    G --> I[CTA informe completo]
    I --> J[Email + consentimiento + Turnstile]
    J --> K[POST /api/report-requests]
    K --> L[Generar informe + PDF]
    L --> M[Guardar lead/estado]
    M --> N[Email usuario]
    M --> O[Email OWNER_EMAIL en validation]
    N --> P[Informe privado / PDF]
    O --> Q[/admin: revisar y reenviar]
    G --> R{MONETIZATION_MODE}
    R -- validation --> I
    R -- stripe + flag --> S[Checkout Stripe]
    S --> T[Webhook firmado e idempotente]
    T --> L
```

**Regla de estado.** Cada transición importante debe ser idempotente. Un retry no puede duplicar lead, pedido, PDF lógico ni email de cumplimiento.


## 9. Historias de usuario US-xx con Gherkin

### US-01

Como visitante, quiero elegir idioma y país para recibir una experiencia localizada sin alterar mi score.

```gherkin
Escenario: selección válida
Dado que abro StressCast
Cuando selecciono un país soportado y un idioma
Entonces la UI usa la localización elegida
Y el país solo afecta moneda/notas, no el cálculo.
```

### US-02

Como usuario, quiero completar las 7 preguntas CBI rápidamente para obtener una medición actual.

```gherkin
Escenario: evaluación completa
Dado que elegí país
Cuando respondo los 7 ítems con valores válidos
Entonces puedo enviar la evaluación
Y no se permite avanzar con respuestas faltantes.
```

### US-03

Como usuario, quiero un cálculo determinista y reproducible para confiar en el resultado.

```gherkin
Escenario: cálculo reproducible
Dado un vector incluido en test_vectors.json
Cuando el motor procesa el vector
Entonces el resultado coincide con el expected del vector
Y no depende de un LLM.
```

### US-04

Como usuario, quiero ver una vista previa útil antes de dar mi email.

```gherkin
Escenario: preview
Dado un cálculo válido
Cuando se muestra la vista previa
Entonces veo score actual, banda de referencia, marcador contextual, driver principal y una acción
Y no veo una curva temporal ni valores alternativos completos.
```

### US-05

Como usuario, quiero entender el método y sus límites para no confundir escenarios con predicciones.

```gherkin
Escenario: metodología
Dado que estoy en preview o informe
Cuando abro metodología
Entonces se explica CBI, PUMA y el supuesto de dos ítems
Y se afirma que los escenarios 30d son what-if, no probabilidad ni diagnóstico.
```

### US-06

Como usuario, quiero solicitar el informe completo con consentimiento explícito.

```gherkin
Escenario: solicitud válida
Dado que veo la preview
Cuando ingreso un email válido y acepto el consentimiento de entrega
Entonces se crea una solicitud
Y el consentimiento de marketing permanece separado y opcional.
```

### US-07

Como usuario, quiero recibir un enlace privado al informe para consultarlo sin exponerlo públicamente.

```gherkin
Escenario: entrega
Dado que la solicitud fue aceptada
Cuando el sistema envía el email
Entonces recibo un enlace firmado/expirable o acceso equivalente
Y el enlace no revela inputs ni score en la URL.
```

### US-08

Como usuario, quiero descargar un PDF consistente con el informe web.

```gherkin
Escenario: PDF
Dado un informe válido
Cuando descargo el PDF
Entonces contiene todos los outputs de INFORME_COMPLETO definidos en outputs_spec.json
Y conserva disclaimers, versión de modelo e ID de verificación.
```

### US-09

Como titular de datos, quiero ejercer acceso y eliminación para controlar mis datos.

```gherkin
Escenario: eliminación
Dado una solicitud verificada del titular
Cuando se procesa la eliminación
Entonces se eliminan o anonimizan datos personales según la política aplicable
Y se conserva solo lo legalmente necesario.
```

### US-10

Como operador, quiero ver leads y estado del embudo para validar tracción.

```gherkin
Escenario: panel admin
Dado que soy admin autenticado
Cuando abro /admin
Entonces veo leads, estados y métricas agregadas
Y un usuario no admin recibe acceso denegado.
```

### US-11

Como operador, quiero reenviar un informe fallido para resolver incidencias sin editar datos.

```gherkin
Escenario: reenvío
Dado un lead con informe generado
Cuando pulso reenviar
Entonces se registra la acción
Y el usuario recibe una nueva entrega sin recalcular silenciosamente con otra versión.
```

### US-12

Como operador técnico, quiero que la app use archivos versionados de Drive con fallback para resistir fallos externos.

```gherkin
Escenario: Drive caído
Dado una versión cacheada válida dentro del TTL o última versión válida
Cuando Google Drive falla
Entonces la app usa la última versión válida
Y registra la incidencia sin aceptar archivos con checksum incorrecto.
```

### US-13

Como product manager, quiero analítica sin contenido sensible para medir el funnel con privacidad.

```gherkin
Escenario: telemetría
Dado un evento de producto
Cuando se envía a PostHog
Entonces solo usa propiedades permitidas por analytics_events.json
Y nunca incluye email, respuestas, score, banda o contenido del informe.
```

### US-14

Como usuario con necesidades de accesibilidad, quiero completar el flujo por teclado y lector de pantalla.

```gherkin
Escenario: accesibilidad
Dado que uso teclado
Cuando recorro landing, assessment, preview y request
Entonces el foco es visible y el orden es lógico
Y los controles tienen nombre accesible y targets >=44px.
```

### US-15

Como visitante internacional, quiero encontrar y usar StressCast en ES/EN/PT.

```gherkin
Escenario: i18n y SEO
Dado una ruta indexable
Cuando accedo en es, en o pt
Entonces metadata, copy esencial y hreflang corresponden al idioma
Y ES/PT del cuestionario no se marca aprobado hasta superar el gate lingüístico.
```

### US-16

Como comprador futuro, quiero pagar de forma segura cuando se active Stripe.

```gherkin
Escenario: modo stripe
Dado MONETIZATION_MODE=stripe y STRIPE_ENABLED=true
Cuando completo checkout
Entonces un webhook firmado e idempotente confirma el pedido
Y el PDF se entrega automáticamente.
```

### US-17

Como usuario, quiero errores claros y recuperables si falla una dependencia.

```gherkin
Escenario: fallo recuperable
Dado un fallo temporal de email, Drive o PDF
Cuando la operación no puede completarse
Entonces veo un mensaje no engañoso
Y el sistema conserva un estado reintentable sin duplicar pedidos.
```

### US-18

Como propietario, quiero protección contra abuso y accesos indebidos.

```gherkin
Escenario: abuso
Dado tráfico automatizado o exceso de solicitudes
Cuando supera los límites
Entonces Turnstile/rate limit bloquean o degradan la acción
Y los secretos nunca se exponen al cliente.
```

## 10. Requisitos FR-xx y NFR-xx

### Requisitos funcionales

| ID | Requisito | US | Prueba |
| --- | --- | --- | --- |
| FR-01 | Soportar países US, GB, CA, AU, BR, MX y ES; idioma es/en/pt mediante next-intl. | US-01 | AT-01 |
| FR-02 | Validar los 8 inputs (country + 7 ítems) con el contrato spec/inputs.schema.json, rechazando campos extra. | US-02 | AT-02 |
| FR-03 | Portar engine_reference.py a TypeScript con paridad exacta en los 20 golden vectors y casos de robustez aplicables. | US-03 | AT-03 |
| FR-04 | Calcular score CBI 0–100, banda de referencia, escenarios condicionales, sensibilidad, benchmark y drivers según spec/model_spec.json. | US-03 | AT-04 |
| FR-05 | Mostrar preview conforme a spec/outputs_spec.json: score, banda, marcador sin eje temporal, top driver y acción. | US-04 | AT-05 |
| FR-06 | Bloquear en preview los valores completos de escenarios y otros outputs de INFORME_COMPLETO. | US-04 | AT-06 |
| FR-07 | Exponer metodología/limitaciones desde model_card y model_spec sin usar claims diagnósticos o probabilísticos. | US-05 | AT-07 |
| FR-08 | Crear solicitud de informe solo con email válido, consentimiento de entrega y Turnstile válido. | US-06 | AT-08 |
| FR-09 | Separar consentimiento de entrega, marketing e investigación; registrar versión y timestamp de cada consentimiento. | US-06 | AT-09 |
| FR-10 | En MONETIZATION_MODE=validation guardar el lead, confirmar al usuario y enviar a OWNER_EMAIL id, inputs, resultados y PDF para cumplimiento manual. | US-06 | AT-10 |
| FR-11 | Entregar al usuario un enlace privado con token no predecible/firmado y sin datos sensibles en la URL. | US-07 | AT-11 |
| FR-12 | Generar PDF con @react-pdf/renderer y layout conforme a ux/report_layout.md. | US-08 | AT-12 |
| FR-13 | Incluir en PDF todos los outputs INFORME_COMPLETO definidos en spec/outputs_spec.json y las versiones de app/modelo. | US-08 | AT-13 |
| FR-14 | Implementar endpoint/proceso de acceso y eliminación de datos verificando identidad antes de actuar. | US-09 | AT-14 |
| FR-15 | Implementar /admin autenticado con leads, embudo y estados de entrega. | US-10 | AT-15 |
| FR-16 | Permitir reenvío desde /admin con auditoría e idempotencia lógica. | US-11 | AT-16 |
| FR-17 | Leer artefactos de Google Drive bajo /Apps/stresscast/ resolviendo nombres/rutas del manifiesto y verificando SHA-256. | US-12 | AT-17 |
| FR-18 | Cachear artefactos Drive por 24h y usar la última versión válida si Drive no responde; nunca aceptar checksum inválido. | US-12 | AT-18 |
| FR-19 | Proveer npm run drive:sync para subir drive/ a GOOGLE_DRIVE_FOLDER_ID conservando jerarquía. | US-12 | AT-19 |
| FR-20 | Emitir únicamente eventos/propiedades permitidos por spec/analytics_events.json. | US-13 | AT-20 |
| FR-21 | No enviar a PostHog/Sentry email, respuestas, score, banda, PDF ni contenido de informe. | US-13 | AT-21 |
| FR-22 | Cumplir WCAG 2.2 AA en el flujo crítico, navegación por teclado y targets táctiles definidos. | US-14 | AT-22 |
| FR-23 | Implementar metadata, sitemap, canonical y hreflang para es/en/pt, respetando gates de wording ES/PT. | US-15 | AT-23 |
| FR-24 | Habilitar Stripe solo cuando MONETIZATION_MODE=stripe y STRIPE_ENABLED=true. | US-16 | AT-24 |
| FR-25 | Crear Checkout Session con precio localizado y webhook con verificación de firma e idempotencia por event_id. | US-16 | AT-25 |
| FR-26 | Tras pago confirmado, entregar automáticamente el PDF y registrar pedido/entrega sin duplicación. | US-16 | AT-26 |
| FR-27 | Modelar estados reintentables para Drive, email y generación de PDF con errores seguros para usuario. | US-17 | AT-27 |
| FR-28 | Aplicar rate limit por IP/clave pseudónima y Cloudflare Turnstile a acciones de alto abuso. | US-18 | AT-28 |
| FR-29 | Aplicar RLS en Supabase, acceso de servicio solo desde servidor y autorización explícita de admin. | US-18 | AT-29 |
| FR-30 | Registrar Sentry con redacción de PII y sin payloads de assessment/report. | US-18 | AT-30 |
| FR-31 | Mantener trazabilidad app_version, model_version y data/manifest version en cálculos, informes y auditoría. | US-03 | AT-31 |
| FR-32 | Mostrar disclaimers de bienestar, prohibición de uso laboral por terceros y recursos de apoyo no emergencial conforme a spec/copy_i18n.json. | US-05 | AT-32 |

### Requisitos no funcionales

| ID | Dimensión | Criterio |
| --- | --- | --- |
| NFR-01 | Rendimiento | p95 de Route Handlers críticos <2.0 s sin contar latencia de proveedor de email; cálculo local p95 <100 ms. |
| NFR-02 | Web performance | Lighthouse móvil >=90 en Performance, Accessibility, Best Practices y SEO para landing y assessment en build de producción. |
| NFR-03 | Disponibilidad | Objetivo MVP 99.5% mensual para flujo de cálculo; degradación de Drive mediante última versión válida. |
| NFR-04 | Seguridad | TLS, secretos solo server-side, headers CSP/HSTS adecuados, Turnstile, rate limit, verificación webhook, RLS y principio de mínimo privilegio. |
| NFR-05 | Privacidad | Minimización; consentimientos separados; no PII/contenido sensible en analytics; retención configurada; soporte de derechos. |
| NFR-06 | Coste | Coste variable presupuestado por informe <=US$0.50; alerta si promedio rolling 7d supera techo. |
| NFR-07 | Reproducibilidad | 100% de test_vectors.json deben pasar en Python de referencia y puerto TypeScript. |
| NFR-08 | Observabilidad | Errores técnicos en Sentry con scrubbing; eventos de funnel en PostHog según allowlist. |
| NFR-09 | Accesibilidad | WCAG 2.2 AA en flujo crítico; prefers-reduced-motion y contraste conforme a design_tokens. |
| NFR-10 | i18n | Rutas y copy en es/en/pt; formatos de moneda/fecha locales; fallback seguro a inglés. |
| NFR-11 | Mantenibilidad | TypeScript strict, lint/typecheck/tests obligatorios en CI; decisiones de desviación registradas en DECISIONS.md. |
| NFR-12 | Resiliencia | Operaciones con idempotency keys; reintentos acotados; ningún retry puede duplicar lead, pedido o email de entrega. |

## 11. Inputs

La definición canónica está en `spec/inputs.schema.json`. No se duplica aquí para evitar divergencia.

**Contrato resumido.** 1 país + 7 ítems CBI obligatorios; `additionalProperties=false`; país limitado a US/GB/CA/AU/BR/MX/ES; respuestas ordinales cerradas. La UX y el wording de cada campo se especifican en `ux/ux_spec.md` y `spec/copy_i18n.json`.

**Gate.** El wording español y portugués del cuestionario debe cotejarse con versiones validadas/licencias antes del lanzamiento público.


## 12. Modelo

La fuente canónica es `spec/model_spec.json`; la implementación de referencia es `model/engine_reference.py`; la tarjeta metodológica es `model/model_card.md`.

**Regla de implementación.** Portar la fórmula a TypeScript strict sin cambiar semántica ni redondeos observables. El LLM, si se usa para narrativa futura, nunca calcula score, escenarios, cutoff, benchmark ni sensibilidad.

**QA obligatorio.** `spec/test_vectors.json` debe pasar 100% en motor de referencia y motor TypeScript. Cualquier desviación exige registrar la decisión y bloquear release.


## 13. Base de datos y Drive

La persistencia relacional se define en `spec/db_schema.sql`. El contrato de archivos de Drive se define en `spec/drive_manifest.json`; los archivos que la app debe sincronizar están en `drive/`.

**Google Drive.** La app resuelve los artefactos bajo `/Apps/stresscast/` a partir de `GOOGLE_DRIVE_FOLDER_ID`, verifica SHA-256, cachea 24 horas y conserva la última versión válida cuando Drive falla. Un checksum incorrecto invalida la nueva versión y no reemplaza el cache bueno.

**Supabase.** Leads, cálculos, solicitudes, pedidos, entregas, consentimientos, auditoría e idempotencia viven en Postgres con RLS. El service role solo se usa en servidor.


## 14. Outputs y niveles de acceso

La fuente canónica es `spec/outputs_spec.json`.

**Preview GRATIS.** Debe respetar exactamente el set `free_preview.give`; el marcador del score no usa eje temporal.

**INFORME_COMPLETO.** Debe incluir los outputs marcados con ese nivel, tanto web como PDF.

**SUSCRIPCIÓN.** `weekly_tracking` permanece deshabilitado hasta superar el gate de recurrencia. No se simulan features activas.


## 15. UX/UI

La especificación canónica vive en `ux/ux_spec.md`, `ux/sitemap_flows.md`, `ux/components.md`, `spec/design_tokens.json` y `spec/copy_i18n.json`.

**Dirección.** Calma sin medicalizar; evidencia visible; una decisión por pantalla; incertidumbre explícita; sin dark patterns.

**Responsive.** Prioridad a 360 px; formulario máx. 640 px; targets táctiles ≥44 px; foco visible; reduced motion; contraste AA.

**Prototipo.** `ux/prototype.html` es referencia de interacción, no código de producción.


## 16. Informe PDF

La estructura canónica está en `ux/report_layout.md`; el contenido se cruza con `spec/outputs_spec.json`.

**Tecnología.** `@react-pdf/renderer`.

**Requisitos de fidelidad.** Mismos números y versión que el informe web; ID de verificación; fecha; app/model/data version; disclaimers; escenarios etiquetados como condicionales; sin claims clínicos; fuentes/metodología.

**Privacidad.** El enlace de descarga es privado y no contiene PII ni score en la URL. En modo validation, el consentimiento informa la copia al operador para cumplimiento manual.


## 17. Monetización y tracción

**Modo inicial.** `MONETIZATION_MODE=validation`.

**Funnel.** Preview gratuita → “Recibe tu informe completo” → email + consentimiento → lead guardado → confirmación al usuario → email a `OWNER_EMAIL` con id, inputs, resultados y PDF completo para revisión/cumplimiento manual. Esta transferencia debe estar explicada en el consentimiento. Marketing es opt-in separado.

**Modo Stripe.** Solo con `MONETIZATION_MODE=stripe` y `STRIPE_ENABLED=true`: Checkout Session, webhook firmado, idempotencia por event id, entrega automática de PDF y copia operativa al dueño.

**KPIs de validación.** Se conservan los targets de fuente: start→preview ≥65%, preview→request ≥35%, ≥300 previews y ≥100 requests en hasta 30 días antes de activar pago. Para acelerar la decisión se añade un checkpoint operativo: si en 14 días hay ≥50 solicitudes y preview→email ≥25% sin incidentes críticos, continuar adquisición y preparar experimento de precio; no activa cobro por sí solo si no se cumple el gate canónico.

**Economía.** Coste variable por informe presupuestado ≤US$0.50. Precio US hipotético fase 2: US$9.90; precios locales en `spec/monetizacion.json` son hipótesis, no willingness-to-pay probado.


## 18. Emails

**Usuario — confirmación de solicitud.** Debe indicar que el informe se está preparando/entregando, recordar el carácter no diagnóstico, incluir enlace privado y enlaces de privacidad/derechos.

**Owner — validation.** Asunto: `[StressCast] Solicitud de informe <id>`. Cuerpo: metadata mínima operativa, inputs, resultados estructurados y PDF. El email debe advertir que contiene datos sensibles de bienestar y prohibir reenvío/uso laboral.

**Usuario — entrega Stripe.** Tras webhook confirmado, entregar automáticamente el PDF/enlace sin intervención manual.

**Resend.** Dominio autenticado con SPF/DKIM/DMARC antes del launch. Eventos de provider se guardan como estados técnicos; no se envían respuestas/score a analytics.


## 19. Arquitectura y stack

**Frontend/API.** Next.js App Router + TypeScript strict, Tailwind CSS, shadcn/ui y Route Handlers.

**Motor.** TypeScript portado desde `engine_reference.py`; no FastAPI porque el MVP no necesita Python en runtime. Python queda como referencia de QA.

**Datos.** Supabase Postgres + RLS.

**Drive.** Google Drive API con service account; sync mediante `npm run drive:sync`.

**Email/PDF.** Resend + `@react-pdf/renderer`.

**i18n/analytics/ops.** next-intl, PostHog, Sentry, Cloudflare Turnstile, rate limit con Upstash Redis.

**Pagos.** Stripe detrás de feature flag.

**Pruebas.** Vitest + Playwright + `test_vectors.json`.

**Entrega.** GitHub Actions + Vercel. Netlify es alternativa compatible si los Route Handlers y variables se adaptan sin cambiar contratos.


## 20. API (OpenAPI 3.1)

El contrato completo y ejecutable está en `spec/openapi.yaml`.

**Rutas mínimas.** `/api/calculate`, `/api/report-requests`, `/api/reports/{id}`, `/api/reports/{id}/pdf`, `/api/admin/leads`, `/api/admin/leads/{id}/resend`, `/api/stripe/checkout`, `/api/stripe/webhook` y `/api/health`.

**Reglas.** Validación server-side, errores tipados, idempotency keys para mutaciones de entrega/pago, autorización admin, rate limiting y ausencia de secretos en respuestas.


## 21. Modelo de datos con RLS

`spec/db_schema.sql` define el esquema.

**Entidades.** `leads`, `calculations`, `report_requests`, `orders`, `email_deliveries`, `consent_records`, `stripe_events`, `admin_users`, `admin_actions`.

**RLS.** Activado en tablas con datos de usuario. Acceso anon directo denegado; mutaciones públicas pasan por Route Handlers. Admin requiere usuario autenticado presente en `admin_users`. El service role nunca se expone al navegador.

**Retención inicial.** 30 días para payloads individuales en validation salvo obligación diferente o necesidad operativa documentada; datos de auditoría minimizados pueden conservarse más si no incluyen contenido sensible. La política final debe ser validada legalmente por mercado.


## 22. Seguridad, privacidad y legal (GDPR, CCPA, LGPD, Ley 29733)

**Clasificación.** Aunque StressCast se posiciona como wellness y no diagnóstico, las respuestas pueden revelar información sensible sobre bienestar. Tratar el payload como dato de alta sensibilidad operacional.

**Controles base.** Minimización, propósito explícito, cifrado en tránsito, secretos server-side, RLS, logs con redacción, rate limiting, consentimiento versionado, retención limitada, acceso auditado, proceso de incidentes y derechos del titular.

**GDPR.** Diseñar para transparencia, limitación de finalidad, minimización, exactitud, limitación de conservación, integridad/confidencialidad y accountability; soportar acceso, rectificación, supresión, restricción, portabilidad y oposición cuando apliquen. Fuente oficial revisada: Reglamento (UE) 2016/679 y Comisión Europea.

**CCPA/CPRA.** Si StressCast alcanza umbrales/ámbito de la ley, implementar disclosures y mecanismos de derechos aplicables. Las regulaciones de California efectivas el 1 de enero de 2026 incluyen actualizaciones sobre risk assessments, cybersecurity audits y ADMT para los negocios dentro de alcance. No asumir que el MVP está automáticamente sujeto: debe evaluarse por entidad/volumen/actividad.

**LGPD.** Para Brasil, documentar base legal, finalidades, derechos del titular, rol de controlador/operador/encarregado y respuesta a solicitudes. Evitar reutilización del assessment para investigación sin base/consentimiento separado.

**Perú — Ley 29733.** La Ley 29733 protege el derecho fundamental a la protección de datos personales; su nuevo Reglamento fue aprobado por D.S. 016-2024-JUS. El lanzamiento en Perú u operación desde Perú requiere revisión local del flujo, transferencias, consentimientos, banco de datos, seguridad y derechos según aplique.

**Gates legales.** Revisión legal específica antes del lanzamiento público; política de privacidad/terms publicados; DPA con proveedores cuando corresponda; mapa de transferencias; plan de breach; verificación de tratamiento de datos sensibles y base legal. Este PRD no sustituye asesoría jurídica.


## 23. Accesibilidad e i18n

**Accesibilidad.** WCAG 2.2 AA para rutas críticas. HTML semántico, labels visibles, errores asociados, focus management, teclado completo, anuncios de progreso cuando aporten valor, targets ≥44 px, contraste según tokens y no depender solo de color.

**i18n.** `next-intl` con `es`, `en`, `pt`; rutas localizadas, mensajes centralizados y formatos con `Intl`. La key interna preferida puede ser `pt`, aunque el copy de Brasil se trate como PT-BR.

**Gate lingüístico.** ES/PT de los 7 ítems no pueden promocionarse como “versión validada” hasta cotejo final. La UI puede construirse con copy preliminar, pero el launch checklist debe bloquear publicación en esos idiomas si el gate no está cerrado.


## 24. Analítica y KPIs

La allowlist de eventos y propiedades está en `spec/analytics_events.json`.

**North-star de validación.** `preview_to_report_request`.

**KPIs.** visit→start ≥30%; start→preview ≥65%; preview→request ≥35%; tiempo mediano a preview ≤90s; error de cálculo <1%; coste variable/report ≤US$0.50.

**Guardrails.** 0 eventos con email, answer values, score, reference band, item scores, PDF URL o free text. Un test automatizado debe comparar payloads emitidos con la allowlist.

**Decisiones.** ≥50 solicitudes en 14 días y ≥25% preview→email permite sostener el experimento y preparar precio. Gate canónico de cobro: ≥300 previews, ≥100 requests, ≥35% preview→request en ≤30 días, sin incidentes críticos.


## 25. SEO y adquisición

**SEO programático prudente.** Páginas de intención informativa: burnout laboral, CBI work-related, cómo interpretar agotamiento laboral, límites de self-assessment. No crear páginas que prometan diagnóstico o predicción.

**On-page.** Metadata localizada, canonical, hreflang es/en/pt, sitemap, robots, JSON-LD apropiado y copy coherente con disclaimers.

**Canales 14 días.** Comunidades profesionales/Reddit sin spam, creators de career/productivity, newsletters y contenido SEO. Paid acquisition solo tras comprobar conversión orgánica suficiente y tracking confiable.

**Refresh.** Los volúmenes de keyword de 2023 son preliminares; deben actualizarse antes de escalar paid acquisition.


## 26. Plan de pruebas

**Unit.** Motor TS, validadores, hashing, Drive cache/fallback, idempotencia, token firmado, pricing y transformaciones de report.

**Golden.** 100% `spec/test_vectors.json` contra Python y TypeScript.

**Integration.** Supabase con RLS, Drive mock + checksum, Resend sandbox/mock, Turnstile mock, Stripe test mode, PDF rendering.

**E2E Playwright.** Landing→assessment→preview→request→success; admin login→lead→resend; Stripe path cuando flag activo; idiomas; teclado; móvil 360px.

**Security/privacy.** RLS tests, authz admin, rate-limit, webhook signature, no secrets en bundle, analytics allowlist, Sentry scrub, tokens no enumerables.

**Performance.** Lighthouse móvil, route p95, cold/warm Drive cache.

**Launch acceptance.** Ejecutar `docs/ACCEPTANCE_TESTS.md`; ningún test crítico puede estar fallando.


## 27. Despliegue y operación

**Primary.** GitHub + Vercel. Branch protection y CI obligatoria antes de merge a main.

**CI.** install reproducible → lint → typecheck → unit → engine parity → integration → Playwright smoke → build → Lighthouse budget (o job dedicado).

**Runtime.** Variables según `.env.example`; Supabase y Drive con credenciales server-side; dominios de Resend verificados; Sentry release; PostHog configurado; Turnstile y Upstash activos.

**Drive ops.** `npm run drive:sync` carga `drive/`; la app verifica manifest/checksum. Cambios en artefactos requieren manifest version y checksum nuevos.

**Incidentes.** Si Drive falla, mantener última versión válida. Si checksum cambia sin manifest válido, rechazar. Si email falla, dejar request reintentable. Si modelo inesperado aparece, alerta crítica.


## 28. Definition of Done

El MVP está Done cuando:
1. Todos los FR-01…FR-32 tienen US y prueba trazable.
2. Python reference y TypeScript pasan 100% golden vectors.
3. Landing/assessment/preview logran Lighthouse móvil ≥90 en las cuatro categorías objetivo.
4. RLS y autorización admin pasan pruebas negativas.
5. Drive sync/checksum/cache/fallback funcionan.
6. Flujo validation end-to-end envía confirmación al usuario y copia operativa al owner con consentimiento explícito.
7. PDF contiene todos los outputs INFORME_COMPLETO y versiones correctas.
8. Analytics/Sentry no contienen payload sensible.
9. ES/PT no salen a producción sin gate lingüístico; legal review se marca completada por mercado antes de launch.
10. CI verde, launch checklist firmado y `docs/final_audit.md` PASS.


## 29. Riesgos

| Riesgo | Severidad | Mitigación |
| --- | --- | --- |
| Confusión entre escenario y predicción | Alta | Copy what-if consistente; sin eje temporal en preview; comprehension test ≥90%. |
| Claim clínico / medicalización | Alta | Disclaimers, no diagnóstico, no tratamiento, no risk probability. |
| Privacidad de respuestas | Alta | RLS, consentimiento, retención, redacción de logs y acceso auditado. |
| Copia al operador en validation | Alta | Disclosure explícito, OWNER_EMAIL restringido, uso solo de cumplimiento manual, migrar a automatización en stripe. |
| Wording ES/PT no validado | Alta | Gate de launch y revisión lingüística/documental. |
| Uso por empleadores | Alta | Prohibición contractual/UI; sin dashboards individuales ni sharing laboral. |
| Dependencia de Drive | Media | Cache 24h + última versión válida + checksum. |
| Precio no probado | Media | Validation sin pago y experimento posterior controlado. |
| Nombre StressCast | Media | Trademark/domain check antes del lanzamiento público. |
| Sesgo/contexto PUMA | Media | Presentar como referencia contextual danesa, no norma global. |

## 30. Supuestos

- El CBI Work-related se puede utilizar en el producto conforme a la documentación/licencia registrada; mantener atribución y revisión legal.
- `scenario_items_changed=2` es una hipótesis de sensibilidad, no un estimador causal.
- El benchmark PUMA es contextual y no representa población global.
- Los precios localizados son hipótesis comerciales.
- El techo de US$0.50/report es presupuesto interno, no cotización garantizada.
- El usuario primario es adulto trabajador y usa la herramienta para sí mismo.
- La service account de Google Drive tendrá acceso solo a la carpeta del producto.
- Vercel es el target primario; Netlify es alternativa, no segundo target simultáneo.


## 31. Trazabilidad US-FR-test

| FR | US | Acceptance test |
| --- | --- | --- |
| FR-01 | US-01 | AT-01 |
| FR-02 | US-02 | AT-02 |
| FR-03 | US-03 | AT-03 |
| FR-04 | US-03 | AT-04 |
| FR-05 | US-04 | AT-05 |
| FR-06 | US-04 | AT-06 |
| FR-07 | US-05 | AT-07 |
| FR-08 | US-06 | AT-08 |
| FR-09 | US-06 | AT-09 |
| FR-10 | US-06 | AT-10 |
| FR-11 | US-07 | AT-11 |
| FR-12 | US-08 | AT-12 |
| FR-13 | US-08 | AT-13 |
| FR-14 | US-09 | AT-14 |
| FR-15 | US-10 | AT-15 |
| FR-16 | US-11 | AT-16 |
| FR-17 | US-12 | AT-17 |
| FR-18 | US-12 | AT-18 |
| FR-19 | US-12 | AT-19 |
| FR-20 | US-13 | AT-20 |
| FR-21 | US-13 | AT-21 |
| FR-22 | US-14 | AT-22 |
| FR-23 | US-15 | AT-23 |
| FR-24 | US-16 | AT-24 |
| FR-25 | US-16 | AT-25 |
| FR-26 | US-16 | AT-26 |
| FR-27 | US-17 | AT-27 |
| FR-28 | US-18 | AT-28 |
| FR-29 | US-18 | AT-29 |
| FR-30 | US-18 | AT-30 |
| FR-31 | US-03 | AT-31 |
| FR-32 | US-05 | AT-32 |

## 32. Anexos

**Artefactos canónicos.**
- `spec/inputs.schema.json`
- `spec/outputs_spec.json`
- `spec/model_spec.json`
- `spec/test_vectors.json`
- `spec/monetizacion.json`
- `spec/analytics_events.json`
- `spec/openapi.yaml`
- `spec/db_schema.sql`
- `spec/design_tokens.json`
- `spec/copy_i18n.json`
- `spec/drive_manifest.json`
- `model/engine_reference.py`
- `model/qa_engine.py`
- `model/model_card.md`
- `ux/ux_spec.md`
- `ux/sitemap_flows.md`
- `ux/components.md`
- `ux/report_layout.md`
- `ux/prototype.html`

**Fuentes legales oficiales revisadas para este cierre.**
- GDPR: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Comisión Europea, derechos GDPR: https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en
- California Privacy Protection Agency, regulaciones CCPA 2026: https://cppa.ca.gov/regulations/ccpa_updates.html
- ANPD Brasil, LGPD: https://www.gov.br/anpd/
- Perú Ley 29733: https://www.gob.pe/institucion/congreso-de-la-republica/normas-legales/243470-29733
- Perú D.S. 016-2024-JUS: https://www.gob.pe/institucion/anpd/normas-legales/6554453-n-016-2024-jus

**Histórico.** Las carpetas `01_estrategia/`, `02_datos_modelo/` y `03_qa_ux/` se conservan íntegras como evidencia acumulativa. Cuando un documento histórico contradice este PRD o `spec/` final, prevalece el artefacto canónico de v4 y la diferencia debe constar en `docs/decisions_log.md`.
