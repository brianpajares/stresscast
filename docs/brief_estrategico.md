> **SUPERSEDIDO PARA IMPLEMENTACIÓN (QA etapa 3 · 2026-10-06).** Este documento conserva el razonamiento histórico de etapa 1. La hipótesis de “forecast/predicción a 30 días” NO fue validada y fue reemplazada en etapa 2 por **score CBI Work-related actual + escenarios condicionales what-if**. Para PRD e implementación, la fuente canónica es `01_estrategia/brief.json` corregido en etapa 3, junto con `02_datos_modelo/model_spec.json` y `03_qa_ux/ux_spec.md`. No usar las frases predictivas históricas de este snapshot como copy de producto.

# StressCast — Brief estratégico de Etapa 1

**Estado:** PIVOT aplicado · Score 83/100  
**Idea recibida:** “MindGuard” vía enlace de Notion. La página no fue accesible desde este entorno; se asumió, por nombre y contexto de fábrica predictiva, una app B2C para anticipar burnout/sobrecarga mental. Este supuesto queda registrado y debe validarse contra el contenido original si luego se comparte un ZIP o export de Notion.  
**Cambio clave:** no usar “MindGuard” como marca. En 2026 el nombre ya está ocupado por varios proyectos de salud mental y por un framework de seguridad de Sword Health. Se propone **StressCast** como marca de trabajo, con dominio plausible `stresscast.app`; disponibilidad de dominio y marca **no verificada**.

## 1. One-liner

Para knowledge workers y managers que sienten que están aguantando pero no saben si van camino al burnout, StressCast predice su riesgo de sobrecarga laboral a 30 días a partir de 8 respuestas que conocen en menos de 90 segundos y entrega un forecast 0–100, los drivers principales y un plan de reducción de carga para que actúen antes de tocar fondo.

**Promesa de producto:** “See your next 30 days before work drains them.”  
**PT:** “Veja os próximos 30 dias antes que o trabalho esgote você.”  
**ES:** “Mira tus próximos 30 días antes de que el trabajo te vacíe.”

## 2. Dolor global con evidencia

| Evidencia | Cifra | Año | Región | Implicación |
|---|---:|---:|---|---|
| Empleados con estrés gran parte del día anterior | 40% | 2025 | Global | Frecuencia diaria, no ocasional. Fuente: Gallup |
| Managers con estrés gran parte del día anterior | 45% | 2025 | Global | Segmento primario especialmente expuesto. Fuente: Gallup |
| Adultos en edad de trabajar con un trastorno mental | 15% | 2019 / citado 2026 | Global | Gran base de vulnerabilidad, aunque burnout no equivale a trastorno mental. Fuente: OMS |
| Días de trabajo perdidos por depresión y ansiedad | 12.000 millones/año | vigente 2026 | Global | Coste enorme en tiempo. Fuente: OMS |
| Coste económico de depresión y ansiedad | US$1 billón/año | vigente 2026 | Global | Predomina productividad perdida. Fuente: OMS |
| Personas con jornadas ≥55 h/semana | 479 millones | 2016 | Global | Proxy de sobrecarga severa. Fuente: OMS/OIT |
| Muertes atribuibles a largas jornadas | 745.000 | 2016 | Global | Riesgo físico material asociado a exceso de horas. Fuente: OMS/OIT |
| Riesgo con ≥55 h/semana vs 35–40 h | +35% ictus; +17% cardiopatía isquémica | revisión 2021 | Global | La carga laboral excesiva no es solo “sensación”. Fuente: OMS/OIT |
| Estrés/depresión/ansiedad relacionados con trabajo | 776.000 trabajadores; 16,4 M días perdidos | 2023/24 | Reino Unido | Evidencia reciente nacional. Fuente: HSE |
| Estrés/depresión/ansiedad causados o empeorados por trabajo | 29%; fatiga 37% | 2025 | UE | Problema amplio y persistente. Fuente: EU-OSHA |
| Estrés laboral en último mes | 77%; 57% con impactos negativos | 2023 | EE. UU. | Alta prevalencia y consecuencias conductuales. Fuente: APA |

**Cuántas personas lo sufren — estimación:** se usa como proxy de escala global **3,5 mil millones de personas trabajando** (OMS/OIT, cifra de referencia publicada) × **40%** de estrés diario de Gallup = **≈1,4 mil millones de trabajadores estresados**. Es una estimación de orden de magnitud; mezcla universos y años y **no es una prevalencia de burnout**.

**Frecuencia:** Gallup pregunta por estrés “durante gran parte del día anterior”, por lo que el 40% representa una señal diaria. En EE. UU., APA midió estrés laboral durante el último mes (77%).

**Costo actual para la persona:** el gasto alternativo va desde apps de bienestar (Headspace US$69,99/año; Calm US$79,99/año; Welltory US$99/año) hasta terapia online (BetterHelp US$70–100/semana). Además del dinero, el coste incluye días perdidos, menor productividad, intención de renuncia y agotamiento emocional.

**Nota clínica/regulatoria:** la OMS clasifica el burn-out como **fenómeno ocupacional, no como condición médica**. StressCast debe mantenerse como herramienta de bienestar/gestión de carga y no diagnosticar depresión, ansiedad ni ningún trastorno.

## 3. Señales de demanda

### Keywords
Las cifras públicas de volumen encontradas son de 2023 y se consideran **preliminares** hasta refrescarlas con Google Keyword Planner/Ahrefs/Semrush.

| Keyword | Volumen mensual estimado | Tendencia 12m | Fuente |
|---|---:|---:|---|
| burnout | 823.000 | 0% | Nigel Frank / datos Google, 2023 |
| burnout symptoms | 74.000 | 0% | idem |
| what is burnout | 22.000 | +22% | idem |
| how to deal with burnout | 8.100 | 0% | idem |
| what does burnout feel like | 3.600 | 0% | idem |

Esto es suficiente para validar que existe demanda SEO evergreen, pero no para construir forecast de CAC. El Agente 2 no necesita resolver esto; antes de lanzamiento de adquisición se debe refrescar la keyword set.

### Comunidades
- **r/antiwork:** cerca de 3,0 M de lectores en una captura pública de 2026; publicaciones recientes sobre burnout reciben cientos o miles de votos.
- **r/consulting:** conversaciones recurrentes sobre semanas de 60–80 horas, burnout y salidas de carrera.
- **r/UXDesign / r/QuitCorporate / comunidades de managers y founders:** el disparador recurrente es “¿estoy cansado o realmente quemado?” y “¿debo pedir tiempo libre / renunciar?”.

### Gasto actual en alternativas
- Meditación/contenido: Headspace **US$69,99/año**, Calm **US$79,99/año**.
- Biométricos/HRV + wellness: Welltory **US$99/año**.
- Apoyo humano: BetterHelp **US$260–400/mes** según la página oficial.
- Beneficio corporativo digital: Wysa for Teams **US$50/empleado/año**.

**Lectura de demanda:** el usuario ya paga por “sentirse mejor”, pero el hueco es pagar por **saber si la trayectoria de las próximas semanas es peligrosa y qué palancas la cambian**.

## 4. Competencia

| Alternativa | Precio/modelo | Qué resuelve | Debilidad frente a StressCast |
|---|---|---|---|
| Headspace | US$69,99/año o US$12,99/mes | Meditación, sueño, estrés | Intervención/contenido; no forecast explicable de burnout a 30 días |
| Calm | US$79,99/año web, suscripción | Meditación, sueño, relajación | Reduce síntomas percibidos; no estima trayectoria de sobrecarga |
| Welltory | US$99/año publicado, freemium | HRV, estrés/energía, recomendaciones | Más fricción, dependencia de mediciones/dispositivo; mezcla wellness amplio |
| BetterHelp | US$70–100/semana | Terapia humana online | Alta fricción y precio para quien solo quiere una evaluación de situación |
| Wysa | Freemium/B2B; US$50/empleado/año en Teams | Chat y ejercicios CBT/mindfulness | Conversacional y de apoyo; no debe ser el motor predictor |
| MindDoc | Freemium/medical-device en mercados específicos | Monitoreo y autogestión de salud mental | Entra más en salud clínica; no está posicionado como forecast de carga laboral |
| Tests CBI gratuitos | Gratis | Miden agotamiento actual | Son snapshots; casi nunca dan forecast, drivers ni escenarios “what-if” |

**Hueco:** una experiencia B2C de menos de 90 s que transforme un check-in breve en **forecast de 30 días + incertidumbre + drivers + simulación de palancas**. Debe ser específica de carga laboral, no un “AI therapist” genérico.

**Riesgo de naming:** “MindGuard” tiene colisiones claras en 2026; por eso se cambia a **StressCast**. Trademark y dominio siguen como open issue.

## 5. Público, segmentos y países

### Segmentos
1. **Knowledge workers, managers y consultores con carga alta.** Tamaño proxy: 3,5 B trabajadores × 15% supuesto interno de ocupaciones profesionales/manageriales × 40% estrés diario = **≈210 M** potencialmente estresados. La cuota del 15% es **estimación interna** y los segmentos se solapan.
2. **Trabajadores con jornadas extremadamente largas.** Base observada: **479 M** personas con ≥55 h/semana. SAM digital inicial estimado: 479 M × 25% supuesto de usuarios digitalmente alcanzables/adecuados para B2C = **≈120 M**. Es una estimación, no un dato observado.

### Países prioritarios
1. **Estados Unidos:** alto gasto digital y región US/Canada con 50% de estrés diario según Gallup.
2. **Reino Unido:** 776.000 casos de estrés/depresión/ansiedad relacionados con trabajo y 16,4 M de días perdidos en 2023/24.
3. **Canadá:** comparte la señal regional de estrés elevada; alto ARPU potencial.
4. **Australia:** Australia/Nueva Zelanda registra 49% de estrés diario en Gallup 2026.
5. **Brasil:** escala, portugués, gran mercado móvil; precio con paridad.
6. **México:** entrada en español a Latinoamérica, dentro de una región con 43% de estrés diario.
7. **España:** español + marco UE, útil para aprender compliance GDPR/AI Act.

### Persona principal
**Alex / 32 / knowledge worker híbrido.** Trabaja 45–60 h semanales, duerme peor, sigue rindiendo, pero nota irritabilidad y agotamiento. No se identifica como “paciente” y no quiere comenzar terapia para responder una pregunta inmediata: “si sigo así, ¿cómo estaré en un mes?”.

### Job-To-Be-Done
“Cuando noto que mi trabajo está empezando a comerse mi energía, quiero una lectura rápida y objetiva de mi trayectoria de riesgo y de qué cambio tendría más impacto, para decidir si debo bajar carga, pedir días, reorganizar o buscar ayuda.”

### Disparador de compra
El momento exacto es después de una **semana excepcionalmente mala**, antes de un **mes de entregas**, al volver de vacaciones sin sentirse recuperado, o cuando aparece la pregunta “¿debo aguantar o hacer algo ya?”. La compra ocurre después de ver una preview que confirma que el riesgo no es trivial y muestra solo uno de los drivers.

## 6. Tres enfoques de solución

Escala: 1 = peor; 5 = mejor. En “riesgo legal”, 5 significa **menor riesgo**.

| Enfoque | Valor percibido | Precisión alcanzable | Facilidad inputs | Costo operación | Viralidad | Riesgo legal | Total /30 |
|---|---:|---:|---:|---:|---:|---:|---:|
| A. **Fast 30-Day Burnout Forecast** — check-in 8 inputs + score/forecast + drivers + what-if | 5 | 3 | 5 | 5 | 4 | 4 | **26** |
| B. Wearable-aware predictor — sueño/HRV/calendario + check-in | 5 | 4 | 2 | 2 | 4 | 2 | 19 |
| C. AI coach + journal diario + alertas | 4 | 2 | 3 | 3 | 3 | 2 | 17 |

**Elegido: A. Fast 30-Day Burnout Forecast.** Es el único que satisface la regla de vista previa <90 s y permite lanzar sin integrar dispositivos ni procesar texto libre sensible. La precisión temporal es el principal riesgo; por eso el MVP debe degradarse honestamente a “proyección de escenario” si el Agente 2 no encuentra dataset longitudinal suficiente.

**Pivot aplicado:** de “MindGuard” genérico de salud mental a **StressCast**, una herramienta estrecha, explicable y orientada a una decisión temporal.

## 7. Qué predice

**Variable objetivo principal:** `forecast_burnout_score_30d`, score continuo **0–100** de agotamiento/burnout laboral proyectado a 30 días.

**Salida secundaria:** `p_high_risk_30d`, probabilidad calibrada de entrar en una banda interna de alto riesgo. Esta salida **solo se mostrará como probabilidad** si el Agente 2 valida datos longitudinales y calibración; si no, se mostrará `projected_risk_band`.

**Unidad:** puntos 0–100 y, condicionalmente, probabilidad 0–100%.

**Horizonte:** 30 días.

**Granularidad:** individuo; una predicción por check-in.

**Tipo de problema:** regresión + clasificación calibrada o, si no hay datos longitudinales, simulación determinista de escenario.

### Candidatos de modelo para validar por Agente 2
1. **Baseline determinista CBI:** puntuación oficial 0/25/50/75/100 y promedio de la subescala; útil para reproducibilidad y QA.
2. **Modelo estadístico longitudinal:** regresión logística/ordinal o survival/discrete-time hazard si se obtiene dataset con burnout/exhaustion repetido.
3. **Gradient boosting calibrado:** XGBoost/LightGBM con Platt/isotonic si hay suficiente muestra longitudinal y validación temporal.
4. **Modelo open-source/replicable:** combinación de CBI + coeficientes publicados para factores de carga (horas, recuperación, sueño) solo si Agent 2 confirma licencia y validez.
5. **Fallback de MVP:** `CBI_now + scenario_adjustment` como simulador, presentado como **proyección** y no como predicción validada.

**Regla no negociable:** el cálculo central no lo realiza un LLM. Un LLM puede redactar explicación y plan a partir de outputs estructurados, con plantillas de seguridad.

## 8. Inputs — hipótesis

Máximo **8**, todos contestables en <2 minutos:

1. Horas trabajadas en los últimos 7 días.
2. Promedio de horas de sueño por noche en los últimos 7 días.
3. “¿Qué tan emocionalmente agotador se siente tu trabajo?” (escala CBI / mapeo 0–100).
4. “¿Te sientes quemado/a por tu trabajo?” (CBI).
5. “¿Tu trabajo te frustra?” (CBI).
6. “¿Terminas el día sintiéndote gastado/a?” (CBI).
7. “¿Te agota por la mañana pensar en otro día de trabajo?” (CBI).
8. “¿Te queda energía para familia/amigos en tu tiempo libre?” (CBI, invertido).

**Decisión de diseño:** no pedir ingresos, diagnóstico, medicamentos, voz, cámara, free-text emocional ni datos de wearable en v1. El input de sueño se incorpora por valor intuitivo; Agent 2 decidirá si entra realmente al modelo o solo a la explicación, para no deformar una escala validada.

## 9. Alcance MVP

### In
- Landing + explicación de no-diagnóstico.
- Flujo de 8 inputs, mobile-first, <90 s.
- Motor determinista/reproducible para score actual.
- Motor de forecast/proyección separado, versionado.
- Preview gratuita: banda, mini-curva de 30 días y 1 driver.
- Gate de email para recibir informe completo.
- Fase 1: el usuario recibe enlace/informe y el dueño recibe copia para validación.
- Informe: forecast, drivers, incertidumbre, 3 acciones y 2 escenarios what-if.
- Locales ES/EN/PT para UI y SEO principal.
- Telemetría de funnel y versión de modelo.

### Out
- Diagnóstico de depresión/ansiedad.
- Chat de crisis o “AI therapist”.
- Voz/cámara/emotion recognition.
- Apple Health/Fitbit/Google Health Connect.
- Dashboard para empleadores con scores individuales.
- Uso del score para decisiones laborales.
- Red social, gamificación profunda, streaks.
- Pagos durante Fase 1 de validación.

### V2
- Check-in semanal y serie temporal personal.
- Integraciones opcionales de calendario/sueño.
- Suscripción recurrente.
- Modelo longitudinal personalizado.
- B2B2C con métricas agregadas y privacidad diferencial/umbrales mínimos.
- Cohortes profesionales específicas (consulting, healthcare, founders).
- Fase 2: pasarela de pago y experimentos de precio.

**Meta de velocidad:** preview en **≤90 s** desde landing; ideal interno: 55–70 s.

## 10. Métricas y metas numéricas

Todas las siguientes son **metas internas**, no resultados observados.

### Producto
- Visita → inicio: **≥30%**.
- Inicio → preview: **≥65%**.
- Preview → solicitud de informe/email: **≥35%**.
- Solicitud → pago en Fase 2: **≥10%** objetivo; kill threshold <5% después de tráfico cualificado.
- Tiempo mediano a preview: **≤90 s**; objetivo 65 s.

### Modelo
- QA del baseline CBI contra casos de referencia: **100% de exactitud aritmética**.
- MAE de score 30d: **≤10 puntos** en escala 0–100, si existe ground truth longitudinal.
- AUC para banda de alto riesgo: **≥0,75**.
- Brier score: **≤0,18**.
- Expected Calibration Error: **≤0,05**.
- Calibration slope: **0,8–1,2**.
- Si no se alcanzan estas metas, prohibido usar copy de “probabilidad de burnout”; usar “proyección de escenario”.

### Negocio
- CAC blended objetivo: **≤US$5**.
- CAC paid objetivo: **≤US$9**.
- Ingreso por comprador inicial, EE. UU.: **US$9,90** por informe (hipótesis).
- Margen bruto por informe: **≥85%**.
- Refund/chargeback: **<3%**.
- Si se activa suscripción: objetivo ARPU mensual **US$7,90** y margen **≥80%**.

## 11. Modelo de negocio

### Gratis
- Score/banda actual.
- Vista de tendencia de 30 días con rango de incertidumbre.
- Un driver principal.
- Una acción rápida.
- Email requerido **solo para el informe completo**, no para comenzar el quiz.

### Pago
**Fase 1 VALIDACIÓN:** sin cobro. El usuario deja email para recibir el informe completo; el dueño recibe copia para observar qué se pide y qué convierte.

**Fase 2 COBRO:** informe completo de una sola vez, con forecast, 3 drivers, escenario “si mantienes ritmo”, escenario “si reduces X”, y plan de 7 días.

### Precios hipotéticos por país
Estos son **precios de producto propuestos**, no datos de mercado. Se usan como anclas psicológicas locales y deben probarse con A/B.

| País | Informe | Lógica |
|---|---:|---|
| EE. UU. | **US$9,90** | Anchor; menor que un mes de Headspace y muy inferior a una semana de terapia |
| Reino Unido | **£7,90** | Aproximación de paridad/affordability, redondeo local |
| Canadá | **C$11,90** | Misma banda de valor percibido que EE. UU. |
| Australia | **A$12,90** | Mercado de alto ARPU; stress elevado |
| Brasil | **R$24,90** | Descuento de poder adquisitivo; testear R$19,90 vs R$29,90 |
| México | **MX$99** | Precio psicológico sub-100 |
| España | **€7,90** | Alineado con ticket digital bajo |

### Upsells
- Re-check a 7 días: 30–40% del precio del informe.
- Pack 3 forecasts / 90 días.
- Suscripción semanal/mensual solo después de demostrar recurrencia.
- “Manager / founder pack” con benchmarks, sin datos de empleados.

### Canales
- SEO programático: `/burnout-test`, `/burnout-risk-by-hours-worked`, `/burnout-vs-tired`, `/consulting-burnout`, `/manager-burnout`.
- Comunidades: Reddit y comunidades profesionales, con herramientas gratuitas, no spam.
- Creadores: productividad sostenible, careers, founders, managers.
- Partnerships: newsletters de carrera, coaches no clínicos, EAPs/benefits en v2.
- Retargeting solo con consentimiento y **sin audiencias sensibles basadas en score de salud**.

### Gancho viral
Tarjeta compartible sin datos sensibles: **“My next 30 days look overloaded — StressCast says my biggest lever is recovery time.”** El usuario elige si comparte. Nunca se incluye score exacto por defecto.

### UI/SEO base
- EN CTA: **“Check my 30-day risk”**
- ES CTA: **“Ver mi riesgo a 30 días”**
- PT CTA: **“Ver meu risco nos próximos 30 dias”**
- EN SEO title: **“Burnout Risk Forecast — See Your Next 30 Days | StressCast”**
- ES SEO title: **“Predicción de riesgo de burnout a 30 días | StressCast”**
- PT SEO title: **“Previsão de risco de burnout em 30 dias | StressCast”**

## 12. Riesgos y mitigaciones

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Claims de salud / confusión con diagnóstico | Alta | Copy de wellness; no “diagnostica”; referencia a OMS como fenómeno ocupacional; no tratar depresión/ansiedad |
| Validez del forecast 30d | **Crítica** | Gate de Agent 2: dataset longitudinal + validación temporal; si falla, vender “projection/scenario” |
| GDPR: respuestas pueden constituir datos de salud | Alta | Consentimiento explícito donde aplique, minimización, cifrado, borrado, DPIA si escala, sin ad-tech sobre score |
| FTC/HBNR en EE. UU. si se convierte en PHR o integra múltiples fuentes | Media/Alta | Privacy-by-design, breach plan; revisar cobertura legal antes de wearables |
| EU AI Act / emotion recognition laboral | Alta si se usan biométricos | No usar cámara/voz/biometría ni inferencia emocional en workplace; v1 solo self-report |
| Uso por empleadores para decidir sobre personas | Alta | Prohibir individual scoring B2B; solo agregado, umbral mínimo y opt-in |
| Crisis o autolesión | Media | No recoger free text; no hacer intervención clínica; mostrar recursos de emergencia estáticos por país en disclaimer |
| Sesgo cultural / traducción | Media | Validar ES/PT; mantener versión de escala; comparar calibración por país |
| Dependencia de self-report | Media | Mostrar incertidumbre; detectar respuestas inconsistentes; repetir check-in en v2 |
| Competencia rápida/copiable | Media | Diferenciar en forecast, escenarios y SEO por job-to-be-done, no en chatbot |
| Naming StressCast | Media | Búsqueda de marca y dominio antes de desarrollo público; mantener nombre como provisional |
| Colisión MindGuard | Alta | Cambio de marca ya aplicado; no usar MindGuard en frontend/SEO |

## 13. Scorecard 0–100 y veredicto

| Criterio | Peso | Puntos | Razón |
|---|---:|---:|---|
| Mercado | 25 | **23** | Problema global, tráfico evergreen y categorías con gasto |
| Dolor | 20 | **19** | Frecuencia alta, días perdidos y coste económico demostrable |
| Disposición de pago | 20 | **15** | Hay gasto fuerte en apps/terapia, pero hay muchos tests gratuitos |
| Factibilidad datos/modelo | 15 | **10** | Score actual fácil; forecast longitudinal todavía debe validarse |
| Viralidad | 10 | **7** | Share card y conversación social; sensibilidad limita sharing |
| Rapidez MVP | 10 | **9** | 8 inputs, web, sin integraciones ni chat clínico |
| **TOTAL** | **100** | **83** | |

**VEREDICTO: PIVOT — ya aplicado.**  
No se descarta la idea. Se elimina la marca MindGuard y se estrecha la propuesta a un forecast explicable de carga/burnout. El producto es construible hoy como score + simulador; solo debe usar lenguaje de “predicción probabilística” si el Agente 2 consigue validación longitudinal suficiente.

## Fuentes principales

1. OMS — Mental health at work: https://www.who.int/teams/mental-health-and-substance-use/promotion-prevention/mental-health-in-the-workplace  
2. Gallup — State of the Global Workplace 2026: https://www.gallup.com/workplace/697904/state-of-the-global-workplace-global-data.aspx  
3. OMS/OIT — Long working hours Q&A: https://www.who.int/news-room/questions-and-answers/item/global-regional-and-national-burdens-of-ischemic-heart-disease-and-stroke-attributable-to-exposure-to-long-working-hours-for-194-countries-2000-2016  
4. HSE UK — Work-related stress 2025: https://press.hse.gov.uk/2025/11/03/stress-awareness-week-2025-time-to-act-on-work-related-stress/  
5. EU-OSHA — Mental health at work: https://oshwiki.osha.europa.eu/en/themes/mental-health-work  
6. APA — Work in America 2023: https://www.apa.org/pubs/reports/work-in-america/2023-workplace-health-well-being  
7. OMS — Burn-out as occupational phenomenon: https://www.who.int/standards/classifications/frequently-asked-questions/burn-out-an-occupational-phenomenon  
8. NFA — Copenhagen Burnout Inventory: https://nfa.dk/media/a4wheblj/cbi-scales.pdf  
9. FTC — Health Breach Notification Rule: https://search.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0  
10. Comisión Europea — GDPR sensitive data: https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en  
11. EUR-Lex — AI Act consolidated 2026: https://eur-lex.europa.eu/eli/reg/2024/1689/2026-07-27/eng  
12. Headspace pricing: https://www.headspace.com/mental-health  
13. Calm pricing: https://support.calm.com/hc/en-us/articles/360003084493-Calm-Web-Free-Trial-Sign-Up-Cancellation-Steps  
14. Welltory pricing: https://welltory.com/plans/  
15. BetterHelp pricing: https://www.betterhelp.com/advice/psychology/how-much-does-betterhelp-cost/  
16. Wysa for Teams: https://www.wysa.com/for-teams  
17. Keyword data (preliminar): https://insights.nigelfrank.com/insights/why-burnout-is-still-such-a-hot-topic-on-google  
18. Sword MindGuard naming collision: https://sword.com/newsroom/introducing-mindguard  
