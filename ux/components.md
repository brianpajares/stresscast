# Componentes · StressCast

## Reglas generales
Todos los componentes usan tokens de `design_tokens.json`, navegación por teclado completa, foco visible y estados accesibles con texto. Ningún significado depende solo del color. Los targets táctiles son de al menos 44×44 px aunque WCAG permita excepciones más pequeñas. En móvil, un solo input principal por pantalla.

## Button
**Variantes:** primary, secondary, ghost, destructive-link.  
**Altura:** 48 px desktop/mobile; radio 12 px.  
**Primary:** fondo `primary`, texto `primary_text`; un solo primary CTA visible por pantalla.  
**Estados:** default, hover, focus-visible, pressed, disabled, loading. Loading conserva el ancho y anuncia `aria-busy=true`.  
**Regla:** no usar dos botones con peso primario; “Atrás” es ghost.

## ChoiceCard / Radio
Para respuestas CBI. Toda la tarjeta activa el radio; label de 16 px; descripción opcional. El estado selected usa borde + check + peso tipográfico, no solo color. Teclas de flecha siguen semántica de radio group. Error se muestra bajo el grupo y se anuncia con `aria-describedby`.

## Select de país
Select nativo mejorado o combobox WAI-ARIA probado. Muestra nombre de país y código; no muestra bandera como único identificador. Seleccionar país no cambia el score, solo localización/moneda/notas.

## Progress
Barra + texto “Pregunta X de 8”. No usar porcentajes falsos durante procesamiento. La barra de assessment refleja pasos reales y tiene `aria-valuenow`. En procesamiento usar lista de pasos discretos.

## ResultScoreCard
Contiene label, score grande a una decimal, banda textual y nota de referencia. El 50 PUMA se dibuja como línea/marca “Referencia contextual 50”, nunca “riesgo clínico”. Debe incluir enlace “Cómo se calcula”.

## CurrentScoreViz
Visual gratuito recomendado: barra horizontal 0–100 con marcador del score actual y marca contextual de 50. **Prohibido:** eje temporal, línea actual→30 días, área de confianza. Tooltip opcional repite valores visibles; nada crítico vive solo en hover.

## ScenarioCard
Tres tarjetas: “Mejora condicional”, “Sin cambio”, “Empeora condicional”. Cada una muestra resultado numérico solo en informe. Debajo: “si hasta 2 drivers cambian 1 categoría”. Debe mostrar un badge `What-if · no predicción`.

En preview, usar `LockedScenarioTeaser`: misma estructura reconocible, valores sustituidos por `— —`/blur decorativo con texto legible explicando lo que se desbloquea. No ocultar el disclaimer.

## DriverCard
Muestra nombre legible del ítem, burden points solo en informe, rango ordinal y una acción genérica no causal. En preview mostrar un driver. Evitar copy “causa de tu burnout”; usar “driver con mayor carga en tus respuestas”.

## BenchmarkCard
PUMA mean 33 y threshold 50 pueden mostrarse solo con nota inmediata: “trabajadores de servicios humanos en Dinamarca; referencia contextual, no norma global”. No usar percentiles individuales si no fueron calculados/validados.

## Paywall / ReportGate
Fase 1: **no paywall**; gate de email con beneficio explícito. Un único campo email, checkbox requerido de entrega y checkbox opcional de marketing separado. La privacidad esencial está al lado del CTA.

Fase 2: PaymentCard detrás de feature flag. Precio localizado proviene de `localized_price`; rotular `precio de prueba` internamente y no inventar descuento/ancla. Checkout debe mostrar impuestos/comisiones según mercado cuando aplique.

## Input email
`type=email`, `autocomplete=email`, `inputmode=email`. Validar on blur y submit, no durante cada tecla. Nunca bloquear copy/paste. Error: texto específico. No usar email como ID visible del informe.

## Toast
Solo para confirmaciones no críticas (“Idioma cambiado”). Errores que bloquean el flujo permanecen inline. `role=status` para éxito, `role=alert` solo para errores urgentes.

## Modal
Evitar en flujo principal. Si se usa para “Salir”, focus trap, Escape, retorno de foco y título accesible. No usar modal para disclaimers esenciales.

## Accordion FAQ
Botón real con `aria-expanded`; headings semánticos; contenido indexable. FAQ metodológica nunca es el único lugar del disclaimer.

## Chart
- Score actual: barra/marker.
- Tres escenarios: dot plot o barras horizontales, no línea temporal.
- Tracking futuro: line chart temporal solo después de mediciones reales repetidas; puntos observados unidos, sin rellenar huecos inventados.
- Incertidumbre: usar rango textual y sombreado solo si representa un intervalo estadístico real; en v1 usar etiquetas de escenario, no banda de CI.
- Etiquetas directas en puntos/barras; leyenda secundaria.
- SVG con `<title>`/`<desc>` y tabla de datos accesible cuando haya >3 valores.

## DataTable
Para metodología, supuestos y admin. Encabezados `th`, caption visible, scroll horizontal con affordance en 360 px. Tablas densas no aparecen en assessment.

## Skeleton / Loading
Skeleton solo si existe latencia real. Para cálculo local/determinista, preferir transición inmediata o pasos de procesamiento breves; no fingir una espera larga para aumentar percepción de valor.

## Empty / Error / Success
- **Empty:** explicar siguiente acción; CTA único.
- **Validation error:** mantener selección y foco en grupo/campo defectuoso.
- **Calculation error:** “No pudimos calcular tu resultado. Tus respuestas siguen aquí.” + “Reintentar”.
- **Delivery error:** “No pudimos enviar el enlace. Revisa tu email o inténtalo de nuevo.”
- **Success:** confirma acción, no muestra datos sensibles en pantalla compartida más allá de lo esperado.

## Responsive
**360 px:** layout 1 columna, cards full width, sticky CTA opcional sin tapar contenido/foco, 16 px gutters.  
**768 px:** form max 640 px; preview 2 columnas solo si lectura sigue natural.  
**1280 px:** content max 1120 px; assessment permanece estrecho (640 px) para reducir carga cognitiva; report puede usar 8/4 columns.

## Dark mode
Respeta `prefers-color-scheme` y selector manual. No invertir semántica de colores; conserva contraste. Gráficos usan tokens dark y patrones/labels. El PDF permanece con tema claro para impresión salvo solicitud explícita.
