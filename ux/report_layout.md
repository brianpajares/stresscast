# Layout del informe PDF · StressCast

## Especificación global
Formato A4/Letter adaptable, 7 páginas objetivo, tema claro para impresión, márgenes 18–20 mm, footer con `model_version`, fecha e ID de verificación. No incluir email en páginas ni nombre salvo que el usuario lo añada explícitamente. Gráficos vectoriales cuando sea posible. Todo gráfico incluye título, etiquetas directas y resumen textual accesible en la versión web.

## Página 1 · Portada + resultado actual
- Logo/nombre StressCast.
- Título: “Tu informe de burnout relacionado con el trabajo”.
- Fecha y versión del modelo.
- Score actual grande `0–100`.
- Barra 0–100 con marcador del usuario y marca “Referencia contextual PUMA: 50”.
- Interpretación textual `high_reference` / `below_high_reference`.
- Nota inmediata: “Referencia PUMA de trabajadores de servicios humanos en Dinamarca; no es una norma global ni un umbral clínico.”
- Disclaimer corto: no diagnóstico, no tratamiento, no decisión laboral sobre terceros.

## Página 2 · Qué compone tu score
- Top 3 drivers en barras horizontales 0–100.
- Nombre humano de cada ítem, burden points y dirección.
- Callout del ítem reverse-scored si aparece.
- Texto: “Estos son los ítems con mayor carga en tus respuestas; no prueban causalidad.”
- Acción genérica para cada driver, formulada como experimento conductual/organizativo pequeño, no tratamiento.

## Página 3 · Escenarios condicionales a 30 días
- Tres tarjetas o dot plot:
  - Mejora condicional
  - Sin cambio
  - Empeora condicional
- Mostrar cifras a una decimal.
- Subtítulo fijo: “What-if matemático: si hasta dos drivers elegibles cambian una categoría.”
- Pie: “No es una predicción, probabilidad, intervalo de confianza ni cambio esperado.”
- Tabla breve con `k_improve`, `k_worsen` y `25/7 = 3.5714 puntos` por un paso en un ítem.
- No usar línea temporal ni área de confianza.

## Página 4 · Contexto de referencia
- Comparación con PUMA mean 33.0.
- Datos: mean 33.0, SD 17.7, N=1910, 19.8% >=50, alpha 0.87.
- Banner “Contexto, no norma”: muestra/population y país.
- Nota de validez: estudios ES y PT-BR apoyan fiabilidad, pero no convierten los valores PUMA daneses en normas globales.

## Página 5 · Plan de 7 días
Estructura de tres acciones:
1. **Observar:** identifica cuándo aparece el driver principal.
2. **Cambiar una condición pequeña:** ejemplo no causal y reversible.
3. **Revisar:** repetir el check después de al menos varios días de contexto estable.

Incluye:
- “Qué notar”
- “Qué probar”
- “Cómo saber si fue útil”
- “Qué no concluir de una sola medición”

No prescribir medicación, terapia, bajas laborales ni decisiones de empleo. Si el usuario percibe malestar intenso/persistente, remitir a apoyo profesional apropiado.

## Página 6 · Metodología y supuestos
Tabla:
| Elemento | Valor |
|---|---|
| Instrumento | CBI Work-related, 7 ítems |
| Scoring | 0/25/50/75/100 |
| Reverse scoring | WB7 |
| Score | media de 7 burden scores |
| Referencia alta | >=50, PUMA contextual |
| Escenario | hasta 2 ítems × 1 categoría |
| Naturaleza del escenario | sensibilidad determinista |
| Modelo predictivo 30d | no |
| Model version | 1.0.0 |

Añadir fórmula legible y limitaciones: self-report, contexto laboral, traducciones ES/PT en gate de producción, PUMA no global, sin causalidad.

## Página 7 · Fuentes, privacidad y verificación
- Fuentes principales NFA, validaciones ES/PT-BR, WHO, World Bank si aparece precio.
- Licencias resumidas sin copiar contenido protegido.
- Privacy summary: finalidad de entrega; en validation, owner copy explícita para cumplimiento manual; sin analytics de respuestas/score.
- Disclaimer completo.
- **Verification ID**: `SC-1.0.0-YYYYMMDD-XXXXXXXX`.
- QR opcional solo si apunta a una URL privada/verificable; nunca incrustar email o respuestas en QR.
- Hash opcional del payload normalizado del informe para verificación técnica, siempre no reversible a PII y explicado.

## ID de verificación
Formato recomendado:
`SC-{model_version}-{YYYYMMDD}-{8 chars random}`

Ejemplo demo: `SC-1.0.0-20261006-DEMO12A4`.

El ID identifica una emisión, no a una persona. No derivarlo de email, score o respuestas.

## Export y accesibilidad
- PDF etiquetado (tagged PDF) si la librería lo soporta.
- Orden de lectura correcto, títulos jerárquicos, alt text de gráficos.
- Texto mínimo 10 pt; body recomendado 10.5–11 pt.
- Contraste AA; no depender de color.
- Enlaces con texto descriptivo.
- Metadata PDF sin email/PII.
- Nombre de archivo: `StressCast-report-YYYY-MM-DD-{verification_id}.pdf`.
