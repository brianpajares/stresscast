# UX/UI Spec · StressCast · Etapa 3

## 1. Posicionamiento y voz

### Promesa
StressCast convierte siete respuestas del CBI Work-related en un **score actual, auditable y contextualizado** en menos de 90 segundos, y después permite explorar **escenarios condicionales** para entender sensibilidad. No predice quién “tendrá burnout”, no diagnostica y no sustituye apoyo profesional.

### Nombre y tagline
| Idioma | Nombre | Tagline |
|---|---|---|
| ES | StressCast | **Mide tu carga laboral. Explora qué podría cambiar.** |
| EN | StressCast | **Measure your work burnout. Explore what could change.** |
| PT-BR | StressCast | **Meça seu esgotamento no trabalho. Explore o que pode mudar.** |

**Nota de marca:** StressCast sigue siendo nombre provisional; trademark/domain es gate de lanzamiento.

### Tono
Calmo, concreto, adulto y no clínico. Frases cortas; lenguaje de “score”, “referencia” y “escenario”. Nunca: “diagnóstico”, “tu riesgo real en 30 días”, “te vas a quemar”, “IA predice”, “cura”, “previene” o causalidad no demostrada.

### Tres mensajes clave
1. **Un resultado real ahora:** 7 ítems CBI, cálculo determinista, 0–100.
2. **Contexto sin dramatizar:** referencia PUMA visible y limitada a su población.
3. **Escenarios para pensar, no para adivinar:** what-if matemáticos, no probabilidades.

Los textos exactos en ES/EN/PT están en `copy_i18n.json`; ese archivo es la fuente canónica de microcopy.

## 2. Principios de experiencia
1. **Valor <90 s:** 8 pasos reales (país + 7 ítems), respuestas por defecto visualmente neutrales pero **sin preselección** para no sesgar; CTA inmediato después de elegir.
2. **Una decisión por pantalla en móvil:** radio cards grandes, 44 px+; progreso “Pregunta X de 8”.
3. **Confianza antes de conversión:** metodología, fuente CBI, privacidad y “no prediction” visibles antes del email.
4. **Preview útil, no completa:** score + referencia + 1 driver + 1 acción; el usuario ya recibe valor.
5. **Curiosidad ética:** tres cards de escenario visibles y bloqueadas, pero sin cifras falsas/blur de un forecast inventado.
6. **Un CTA primario:** nunca competir con secundarias.
7. **Privacidad por defecto:** 0 PII antes del report gate; en validation, owner copy explícita de respuestas/resultados/PDF solo para cumplimiento manual y con disclosure previo.
8. **No dark patterns:** sin countdown, stock falso, “X personas mirando”, descuentos fabricados ni prueba social inventada.

## 3. Pantallas

### S01 · Landing · `/[lang]`
**Objetivo:** convertir visita cualificada en inicio de assessment con promesa precisa.  
**Jerarquía:** eyebrow → H1 → body → CTA → trust strip → “Cómo funciona” en tres pasos → evidencia → FAQ breve → legal.  
**Componentes:** Header minimal, Hero, PrimaryButton, TrustStrip, MethodCards, SourceBadge, FAQ.  
**CTA:** `landing.cta`.  
**Estados:** carga instantánea; error de contenido estático no aplica.  
**Validaciones:** ninguna.  
**Microcopy:** `landing.*`, `legal.disclaimer`.  
**Analítica:** `landing_view`, `assessment_start_click`, `methodology_open`, `source_open`, `language_change`.  
**Confianza:** “7 CBI items”, cálculo auditable, no biometría, no PII antes de report. Citar NFA/WHO sin logos no autorizados.  
**Responsive:** Hero 1 columna a 360; 2 columnas opcionales a 1280, pero CTA permanece sobre el fold.

### S02 · País · `/[lang]/assessment` · paso 1/8
**Objetivo:** localización, no scoring.  
**Contenido:** `country.title`, `country.help`; select con 7 países.  
**CTA:** `country.cta`.  
**Estado vacío:** ninguna selección; CTA disabled solo si se explica.  
**Error:** “Elige un país para continuar.”  
**Analítica:** `assessment_step_view`, `assessment_step_complete`; nunca score.  
**Confianza:** texto inmediato “No cambia tu score.”

### S03–S09 · Ítems CBI · pasos 2–8/8
**Objetivo:** una respuesta ordinal por pantalla con mínima carga.  
**Contenido:** pregunta exacta de `questions.*`; 5 ChoiceCards; progress; link “¿Por qué preguntamos esto?” que explica CBI sin sugerir respuesta.  
**CTA:** `assessment.next`; Back ghost.  
**Estados:** empty, selected, validation_error, restored_session.  
**Validación:** required, enum exacto; sin free text.  
**Microcopy de error:** `assessment.required`.  
**Analítica:** `assessment_step_view`, `assessment_step_complete`, `validation_error`; `question_id` permitido, **answer value prohibido** en analytics de terceros.  
**Confianza:** `assessment.privacy`.  
**Regla sensible:** PT/ES se consideran wording preliminar hasta gate lingüístico; producción debe sustituir por wording validado aprobado.

### S10 · Procesando · `/[lang]/assessment/processing`
**Objetivo:** explicar qué se calcula, sin simular complejidad.  
**Contenido:** `processing.title`, tres pasos reales, nota determinista.  
**Componente:** ProcessingSteps; `aria-live=polite`.  
**Tiempo:** si cálculo cliente <300 ms, mostrar transición mínima solo para evitar flash; nunca esperar artificialmente.  
**Error:** cálculo inválido → mensaje persistente + `Reintentar`; volver mantiene respuestas en sesión.  
**Analítica:** `assessment_complete`, `calculation_success` o `calculation_error`; registrar `model_version`, no inputs.  
**Confianza:** “Generative AI does not produce the number.”

### S11 · Vista previa · `/[lang]/results/preview`
**Objetivo:** demostrar valor y crear intención de informe sin falsear un forecast.  
**Jerarquía:** label resultado → score grande → CurrentScoreViz → referencia contextual → driver → acción → LockedScenarioTeaser → CTA.  
**Outputs gratis:** `work_burnout_score`, `reference_band`, `mini_chart` corregido, `top_driver_1`, una acción genérica.  
**Visual:** barra 0–100; marcador score; marca 50 “referencia contextual”. **Sin eje de tiempo.**  
**Locked teaser:** tres cards con labels de escenario y valores `— —`; copy `preview.locked_body`.  
**CTA:** `preview.cta`.  
**Estados:** success normal; high_reference cambia texto, no color único; error de render muestra score textual y enlace metodología.  
**Analítica:** `preview_view`, `report_request_click`, `methodology_open`, `source_open`. No transmitir score/banda a analítica de terceros.  
**Confianza:** PUMA population note junto al 50; disclaimer al pie.  
**Conversión:** el CTA repite beneficio: “escenarios + 3 drivers + plan + metodología”.

### S12 · Solicitar informe · `/[lang]/report/request`
**Objetivo:** intercambiar email por valor claro en fase 1.  
**Campos:** email, consentimiento requerido de entrega, marketing opcional separado.  
**CTA:** `request.cta`.  
**Validaciones:** email syntax; consentimiento de entrega true; marketing false por default.  
**Estados:** empty, invalid_email, consent_missing, submitting, delivery_error, success.  
**Microcopy:** `request.*`.  
**Analítica:** `report_request_view`, `report_request_submit`, `report_request_success`, `report_request_error`; nunca email/domain en analytics.  
**Confianza:** `request.privacy`. Enlace a Privacy.  
**Privacidad:** el backend puede recibir email solo aquí; en validation, disclosure de owner copy para cumplimiento manual; minimizar logs y no reutilizar contenido.

### S13 · Éxito · `/[lang]/report/success`
**Objetivo:** confirmar y orientar al informe.  
**Contenido:** `success.title`, `success.body`, CTA `success.cta`.  
**Producción:** indicar que el enlace es privado y expira/retiene según política aprobada.  
**Prototipo:** abre informe local; no envía email.  
**Analítica:** `report_success_view`, `report_open_click`.

### S14 · Informe · `/[lang]/report/:verification_id`
**Objetivo:** entregar interpretación, sensibilidad y acciones con evidencia visible.  
**Jerarquía:** score actual → escenarios condicionales → drivers → benchmark → plan → método/supuestos → fuentes/disclaimer → verification ID.  
**Componentes:** ResultScoreCard, ScenarioCard×3, DriverCard×3, BenchmarkCard, ActionPlan, MethodAccordion, Sources, VerificationID.  
**Estados:** loading real si server-render; expired link; access denied; success.  
**Analítica:** `report_view`, `report_section_expand`, `pdf_download`; no score en terceros.  
**Confianza:** versión de modelo, fecha, fuente, supuesto de 2 ítems, disclaimer.  
**Export:** PDF según `report_layout.md`.

### S15 · Checkout · `/[lang]/checkout` · futuro
**Objetivo:** pago único cuando `payment_enabled=true`.  
**Contenido:** resumen del informe, precio localizado, impuestos aplicables, privacidad/terms, un CTA de pago.  
**No usar:** precio tachado sin historial real, timer, “oferta termina”, add-ons preseleccionados.  
**Estados:** provider loading, declined, retry, success.  
**Analítica:** `checkout_view`, `payment_attempt`, `payment_success`, `payment_failure`; jamás datos de tarjeta.  
**Gate:** no implementar en fase 1 salvo detrás de feature flag no accesible.

### S16 · Cómo funciona / FAQ / Sources / Legal
**Objetivo:** resolver objeciones y demostrar rigor.  
**Contenido:** fórmula legible, 7 ítems, reverse scoring, PUMA context, escenarios, límites, licencias y privacidad.  
**SEO:** indexable; FAQ solo con claims soportadas.  
**Analítica:** `content_page_view`, `source_open`.  
**Accesibilidad:** headings jerárquicos, links descriptivos.

### S17 · Admin · `/admin`
**Objetivo:** operar funnel y QA sin exposición de respuestas individuales.  
**KPIs:** visits, starts, previews, report requests, conversion rates, error rate, model version distribution, market aggregate.  
**Prohibido por defecto:** tabla de emails, respuestas, scores, PDFs individuales. Soporte excepcional requiere rol, razón y auditoría si la arquitectura futura lo habilita.  
**Alertas:** calculation_error >1%, schema mismatch, delivery failures, model version unexpected.  
**Analítica:** admin audit log separado.

## 4. Conversión

### Secuencia de valor
- **0–10 s:** entiende “score actual + escenarios what-if”, no “AI therapy”.
- **10–75 s:** completa 8 pasos.
- **<90 s:** ve score + referencia + driver.
- **90–120 s:** decide si entregar email por informe completo.

### Defaults
- País puede proponerse por locale del navegador, pero debe confirmarse y nunca inferirse como hecho sensible.
- Respuestas CBI **no preseleccionadas**: un default reduce tiempo pero introduce sesgo de medición, por lo que aquí prima validez.
- Idioma por browser locale con selector persistente.

### Curiosidad sin canibalizar
Gratis contesta “¿dónde estoy ahora?”; informe contesta “¿qué respuestas cargan más y qué pasa bajo cambios hipotéticos?”. El score y una interpretación básica no se ocultan. La metodología esencial nunca está paywalled.

### Prueba social
Hasta existir evidencia real, usar solo prueba de método: “7 ítems CBI”, fuentes, método y fecha de modelo. No inventar testimonios, logos, contador de usuarios ni claims “trusted by”.

## 5. Visualización de outputs
| Output | Visual | Regla |
|---|---|---|
| Score actual | barra/marker 0–100 | etiqueta numérica siempre visible |
| Referencia PUMA 50 | marker secundario | “contextual”, no “clinical threshold” |
| Mean PUMA 33 | comparación textual o dot | mostrar población |
| 3 escenarios | dot plot o barras | labels “conditional”; no línea temporal |
| Drivers | barras horizontales | burden + pregunta legible |
| Tracking futuro | línea temporal | solo observaciones reales repetidas |
| Incertidumbre | texto + rango semántico | no usar “CI” porque v1 no tiene IC estadístico |

## 6. Accesibilidad WCAG 2.2 AA
- Contraste AA documentado en `design_tokens.json`; texto normal ≥4.5:1.
- Focus visible con outline/ring y nunca oculto tras sticky footer.
- Navegación completa por teclado; orden DOM = visual.
- `fieldset/legend` por radio group; errores enlazados con `aria-describedby`.
- No depender de color, hover ni animación.
- Targets primarios 44×44 px y separación adecuada.
- Zoom 200% sin pérdida; reflow 320/360 px sin scroll horizontal salvo tablas justificadas.
- `prefers-reduced-motion` elimina transiciones no esenciales.
- Idioma del documento y cambios de idioma declarados.
- Score y gráficos tienen alternativa textual.
- Autocomplete correcto en email; no exigir reingreso de datos.
- Focus management al cambiar de paso: heading de nueva pantalla recibe foco programático.
- Timeout/expiry del informe, si existe, debe avisarse y permitir extensión cuando sea compatible con seguridad.

## 7. Responsive
**360 px:** 1 columna, top bar compacta, form 100%, CTA al final; sticky CTA solo si no tapa teclado/foco.  
**768 px:** form max 640; preview puede usar 2 columnas para score/driver.  
**1280 px:** content max 1120; report usa grid 8/4; assessment sigue max 640 para lectura.

## 8. Rendimiento percibido
- HTML inicial <100 KB comprimido como objetivo; JS crítico mínimo.
- Sin librerías de gráficos para 3–7 puntos: SVG/CSS nativo.
- Fonts system o self-host; no bloqueo por terceros.
- No tracker de terceros antes de consentimiento cuando la revisión legal lo requiera.
- Cálculo del score local/servidor determinista <100 ms objetivo; no spinner artificial.
- PDF asíncrono en producción puede mostrar estado real “generando” con retry idempotente.
- Core Web Vitals objetivo: LCP <2.5 s, INP <200 ms, CLS <0.1 en p75, sujeto a medición real.

## 9. Internacionalización
- Idiomas: EN, ES, PT-BR; `copy_i18n.json` canónico.
- Monedas: USD, GBP, CAD, AUD, BRL, MXN, EUR usando `Intl.NumberFormat`, no concatenación manual.
- Números: separadores locales; score internamente decimal punto y UI localizada.
- Fechas: `Intl.DateTimeFormat`; timezone del usuario solo para fecha de informe, no cálculo.
- Unidades: no aplica métricas físicas en v1.
- Strings no deben interpolar género cuando puede evitarse; revisión humana de ES/PT.
- Precios se seleccionan por país explícito; país no altera score.

## 10. Confianza y privacidad
Trust stack recomendado en cada capa:
1. **Landing:** método + no biometría.
2. **Assessment:** “respuestas no van a analytics de terceros”.
3. **Preview:** PUMA context + no diagnosis.
4. **Report gate:** finalidad del email + disclosure explícito de owner copy en validation.
5. **Report:** versión del modelo, supuestos, fuentes, verification ID.

Retención y derechos deben definirse en PRD/legal. Diseño recomendado: respuestas efímeras hasta generación; conservar solo lo mínimo para entregar/reemitir el informe durante el plazo aprobado. No convertir esta recomendación en afirmación legal hasta revisión de mercado.

## 11. Criterios de aceptación UX
- Usuario nuevo completa T12 demo en ≤90 s sin ayuda en test moderado.
- ≥90% de usuarios de test comprende que “30 días” es escenario condicional y no predicción; si no, retirar horizonte y usar snapshot-only.
- 0 elementos con contraste AA fallido en audit automatizado/manual.
- 100% del flujo principal operable solo con teclado y screen reader básico.
- Ningún evento de analytics contiene answer value, email, score o PDF contents.
- Preview no contiene eje temporal.
- Un solo CTA primary por pantalla.
