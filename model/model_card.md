# Cómo funciona StressCast

## Qué calcula

StressCast calcula un **score de burnout relacionado con el trabajo de 0 a 100** a partir de siete preguntas del Copenhagen Burnout Inventory (CBI), una escala pública ampliamente usada en investigación. Cada respuesta se convierte en 0, 25, 50, 75 o 100 puntos y se obtiene el promedio. Una de las preguntas —la energía que queda para familia y amigos— se puntúa en sentido inverso.

El resultado describe **cómo estás ahora**. No es un diagnóstico y no afirma que tengas una enfermedad. La Organización Mundial de la Salud clasifica el burnout como un **fenómeno ocupacional**, no como una condición médica.

## Qué significa la curva de 30 días

La curva no es una predicción clínica ni una probabilidad. Es una **simulación de escenarios**:

- “Sin cambio” mantiene tu score actual.
- “Mejora” muestra qué pasaría matemáticamente si dos de tus drivers bajaran una categoría.
- “Empeora” muestra qué pasaría si dos drivers subieran una categoría.

Cada cambio de una categoría en una pregunta mueve el promedio aproximadamente **3.6 puntos** (25/7). Esto hace el motor completamente auditable: puedes reconstruir el resultado con una calculadora.

## De dónde salen los datos

El cuestionario y su scoring provienen del National Research Centre for the Working Environment de Dinamarca (NFA). El material PUMA publicado por NFA reporta para la escala de burnout laboral una media de 33.0 puntos, desviación estándar de 17.7, N=1,910 y alpha de Cronbach 0.87; en esa población de profesiones de servicios humanos, 19.8% tuvo 50 puntos o más.

También existen validaciones publicadas de la versión española y de una versión brasileña portuguesa. Esas validaciones ayudan a justificar el uso lingüístico, pero **no convierten las normas danesas en normas de todos los países**.

Fuentes:
- https://nfa.dk/media/a4wheblj/cbi-scales.pdf
- https://nfa.dk/media/hl5nbers/cbi-first-edition.pdf
- https://scielo.isciii.es/scielo.php?lng=es&nrm=iso&pid=S1135-57272013000200006&script=sci_arttext
- https://pmc.ncbi.nlm.nih.gov/articles/PMC10416248/
- https://www.who.int/standards/classifications/frequently-asked-questions/burn-out-an-occupational-phenomenon

## Qué tan confiable es

La **aritmética** del score es exacta y determinista. La escala CBI tiene buena consistencia interna en los estudios citados. Sin embargo, StressCast v1 **no ha sido validado para predecir el score individual dentro de 30 días**. Por eso los escenarios se presentan como “qué pasaría si…” y no como una probabilidad de que algo ocurra.

## Límites

El score depende de auto-reporte y puede variar con el momento, contexto y forma de interpretar las preguntas. La comparación PUMA proviene de una muestra danesa de profesiones de servicios humanos y no es un percentil global. Las traducciones deben implementarse usando el wording validado para cada mercado cuando esté disponible. No uses el resultado para decisiones de empleo sobre otra persona.

## Aviso

StressCast es una herramienta de bienestar y reflexión sobre carga laboral. **No diagnostica ni trata trastornos médicos o de salud mental y no sustituye a un profesional cualificado.** Si tu malestar es intenso, persistente o afecta tu seguridad o funcionamiento, busca apoyo profesional apropiado en tu país.


---

# How StressCast works

## What it calculates

StressCast calculates a **0–100 work-related burnout score** from the seven Work-related items of the Copenhagen Burnout Inventory (CBI). Each response maps to 0, 25, 50, 75, or 100 points and the seven values are averaged. The item about having enough energy for family and friends is reverse-scored.

The score describes **your current self-reported experience**. It is not a diagnosis and does not claim that you have a disease. The World Health Organization classifies burnout as an **occupational phenomenon**, not a medical condition.

## What the 30-day curve means

The curve is not a clinical prediction or a probability. It is a **conditional scenario simulation**:
- “No change” keeps your current score.
- “Improve” shows the mathematical result if up to two eligible drivers move down one response category.
- “Worsen” shows the result if up to two eligible drivers move up one category.

One category change in one item moves the average by about **3.6 points** (25/7). The “two items” rule is a product sensitivity assumption, not evidence that the change will happen in 30 days.

## Data and confidence

The questionnaire and scoring come from Denmark’s National Research Centre for the Working Environment (NFA). NFA’s PUMA material reports contextual reference statistics for Work-related Burnout. Spanish and Brazilian Portuguese validation studies also exist, but Danish reference values are **not global norms**.

The arithmetic is deterministic and auditable. StressCast v1 has **not** been validated to predict an individual’s score 30 days later; that is why scenarios are presented as “what if” paths rather than probabilities.

## Limits and notice

Results depend on self-report and may vary with context. Do not use StressCast to make employment decisions about another person. StressCast is a wellbeing and work-load reflection tool; **it does not diagnose or treat medical or mental-health conditions and does not replace a qualified professional.** If distress is severe, persistent, or affects safety or daily functioning, seek appropriate professional support in your country.

Sources are listed in the Spanish section above and in `fuentes_datos.csv`.

---

# Como o StressCast funciona

## O que ele calcula

O StressCast calcula uma **pontuação de burnout relacionado ao trabalho de 0 a 100** a partir dos sete itens Work-related do Copenhagen Burnout Inventory (CBI). Cada resposta é convertida em 0, 25, 50, 75 ou 100 pontos e os sete valores são promediados. O item sobre ter energia suficiente para família e amigos recebe pontuação invertida.

A pontuação descreve **sua experiência autorrelatada atual**. Não é um diagnóstico e não afirma que você tenha uma doença. A Organização Mundial da Saúde classifica o burnout como um **fenômeno ocupacional**, e não como uma condição médica.

## O que significa a curva de 30 dias

A curva não é uma previsão clínica nem uma probabilidade. É uma **simulação condicional de cenários**:
- “Sem mudança” mantém a pontuação atual.
- “Melhora” mostra o resultado matemático se até dois drivers elegíveis melhorarem uma categoria de resposta.
- “Piora” mostra o resultado se até dois drivers elegíveis piorarem uma categoria.

Uma mudança de uma categoria em um item altera a média em aproximadamente **3,6 pontos** (25/7). A regra de “dois itens” é uma hipótese de sensibilidade do produto, não evidência de que essa mudança ocorrerá em 30 dias.

## Dados e confiabilidade

O questionário e a pontuação vêm do National Research Centre for the Working Environment (NFA), da Dinamarca. O material PUMA do NFA fornece estatísticas contextuais de referência para Work-related Burnout. Também existem estudos de validação em espanhol e português brasileiro, mas os valores de referência dinamarqueses **não são normas globais**.

A aritmética é determinística e auditável. O StressCast v1 **não foi validado para prever a pontuação individual 30 dias depois**; por isso os cenários são apresentados como trajetórias “e se...”, e não como probabilidades.

## Limites e aviso

O resultado depende de autorrelato e pode variar conforme o contexto. Não use o StressCast para tomar decisões de emprego sobre outra pessoa. O StressCast é uma ferramenta de bem-estar e reflexão sobre carga de trabalho; **não diagnostica nem trata condições médicas ou de saúde mental e não substitui um profissional qualificado.** Se o sofrimento for intenso, persistente ou afetar sua segurança ou funcionamento diário, procure apoio profissional adequado no seu país.

As fontes estão listadas na seção em espanhol acima e em `fuentes_datos.csv`.
