# QA Report · StressCast · Etapa 3

**Fecha:** 2026-10-06  
**Veredicto:** **PASS_WITH_FIXES**  
**Bloqueo al Agente 4:** No. La fórmula seleccionada es consistente, reproducible y robusta. Quedan gates de lanzamiento (wording ES/PT, legal/privacidad y marca), pero no requieren rediseñar el motor para continuar a PRD.

## 1. Resumen ejecutivo
Se recibió un handoff válido de etapa 2 (`stage_completed = 2`). El paquete contiene todos los artefactos obligatorios y el mirror de Drive recibido coincidía 8/8 con `drive_manifest.json`. La base Excel abre correctamente, contiene las 11 hojas esperadas, no presenta errores de fórmula detectables y conserva los parámetros científicos, pricing y casos de prueba.

La reimplementación independiente `03_qa_ux/qa_engine.py` se escribió **antes de inspeccionar** `engine_reference.py`, usando únicamente `model_spec.json` y el Excel base. Los **20/20** golden vectors coinciden con sus resultados esperados. Después, la misma implementación coincidió **20/20** con `engine_reference.py`. Se usa `rel_tol=1e-6`; se admite `abs_tol=5.1e-5` porque los golden guardan floats a cuatro decimales. No se encontró divergencia matemática.

El QA de robustez recorrió las **78,125 combinaciones válidas (5^7)** del cuestionario. No hubo NaN/Inf, salidas fuera de [0,100] ni inversión del orden `improve <= no_change <= worsen`. Se verificó monotonicidad de +25/7 = **3.5714286** puntos por un paso de carga en cualquier ítem, incluido el ítem 7 invertido. Se añadieron diez casos/propiedades R01–R10 a `test_vectors.json`.

## 2. Hallazgos y correcciones

### MAYOR · Promesa predictiva incoherente — CORREGIDO
`01_estrategia/brief.json` todavía vendía una “predicción/forecast a 30 días” y objetivos de MAE/AUC/calibración, aunque etapa 2 había pivotado a score CBI actual + simulación condicional. Esto podía inducir una afirmación no soportada.

**Corrección:** `brief.json` pasa a ser el brief canónico alineado: score actual 0–100, escenarios what-if a 30 días y prohibición explícita de llamarlos predicción, probabilidad o IC. Las métricas predictivas se conservan solo como `future_only` y dependen de una futura cohorte longitudinal consentida.

### MAYOR · Mini-curva gratuita aparentaba forecast — CORREGIDO
`outputs_spec.json` pedía una línea de dos puntos “actual → no-change 30d”. Aunque matemáticamente era plana, el eje temporal sugería una trayectoria prevista.

**Corrección:** la preview usa un marcador/barra del **score actual** con referencia contextual. El contenido 30d aparece como teaser de escenarios condicionales bloqueados, sin línea temporal.

### MAYOR · Copia del informe al propietario — CORREGIDO
`monetizacion.json` y el brief indicaban que el dueño recibiría inputs, resultados y PDF de cada usuario. Para un cuestionario de bienestar esto añade un receptor y superficie de retención innecesarios.

**Corrección:** no hay copia individual por defecto. El operador recibe métricas agregadas/telemetría técnica sin contenido de respuestas. El email se usa para entrega del informe; marketing e investigación requieren consentimientos separados. Una cohorte longitudinal futura necesita opt-in específico, propósito, pseudonimización y retención definida.

### MAYOR · Precios inconsistentes entre estrategia y monetización — CORREGIDO
El brief mantenía precios de etapa 1 que diferían de las recomendaciones PPP de etapa 2 en 6/7 mercados.

**Corrección:** brief alineado a las hipótesis actuales: US$9.90, £6.90, C$12.90, A$14.90, R$25.90, MX$109 y €5.90. Siguen siendo **hipótesis**, no evidencia de willingness-to-pay.

### MAYOR · Wording ES/PT no cerrado — ABIERTO, NO BLOQUEANTE PARA PRD
Hay validación española y brasileña del CBI, pero el paquete no demuestra que cada string de producción ES/PT reproduzca exactamente las versiones validadas para todos los mercados. En PT-BR la evidencia citada es de profesionales sanitarios.

**Acción de lanzamiento:** revisión del wording contra publicación validada/licencia y QA lingüístico antes de producción. El prototipo lo trata como texto preliminar y el informe no presenta benchmark danés como norma global.

### MENOR · Engine vs JSON Schema — CORREGIDO
El motor de referencia aceptaba `country` en minúsculas y propiedades extra, aunque el schema exige enum ISO en mayúsculas y `additionalProperties=false`.

**Corrección:** `engine_reference.py` y `qa_engine.py` rechazan ambos casos. Los 20 golden siguen pasando.

### MENOR · Licencia auxiliar RoBERTa incoherente — CORREGIDO / ABIERTO
La ficha de Hugging Face muestra metadata `apache-2.0`, pero el cuerpo del model card declara `MIT`.

**Corrección:** `fuentes_datos.csv` y `Fuentes` del Excel pasan a `no_verificado`; el activo queda fuera de cualquier ruta productiva hasta aclaración. No afecta al motor CBI seleccionado.

## 3. Verificación independiente del modelo
- Golden vectors: **20/20 PASS**.
- Paridad `qa_engine.py` ↔ `engine_reference.py`: **20/20 PASS**.
- Robustez R01–R10: **10/10 PASS**.
- Exploración exhaustiva: **78,125/78,125** combinaciones válidas sin violaciones.
- Rango de score observado: 0..100; 29 valores discretos posibles.
- País: invariante para score; solo localiza precio/UI.
- Métrico/imperial: no aplica; el modelo no contiene magnitudes físicas.
- NaN/Inf: no llegan al cálculo bajo los enums; inputs nulos/fuera de enum se rechazan.
- Estabilidad: solo sumas, medias y clamps; no hay divisiones variables, exponenciales ni optimización numérica.

## 4. Auditoría de parámetros y fuentes
Se revisaron más de 10 cifras críticas y las licencias/condiciones de las fuentes usadas o consideradas.

| Parámetro / afirmación | Valor auditado | Estado | Evidencia |
|---|---:|---|---|
| CBI Work-related | 7 ítems | verificado | NFA `cbi-scales.pdf` |
| Scoring por categoría | 0/25/50/75/100 | verificado | NFA `cbi-scales.pdf` |
| Ítem WB7 | reverse-scored | verificado | NFA `cbi-scales.pdf` |
| PUMA mean | 33.0 | verificado | NFA `cbi-first-edition.pdf` |
| PUMA SD | 17.7 | verificado | NFA `cbi-first-edition.pdf` |
| PUMA N | 1910 | verificado | NFA `cbi-first-edition.pdf` |
| PUMA high >=50 | 19.8% | verificado | NFA `cbi-first-edition.pdf` |
| PUMA alpha WB | 0.87 | verificado | NFA `cbi-first-edition.pdf` |
| ES alpha WB | 0.83 | verificado | SciELO validación española |
| PT-BR alpha WB | 0.891 | verificado | PMC validación brasileña |
| PPP CA 2025 | 1.26 | verificado | World Bank PA.NUS.PRVT.PP |
| PPP AU 2025 | 1.46 | verificado | World Bank PA.NUS.PRVT.PP |
| PPP BR 2025 | 2.58 | verificado | World Bank PA.NUS.PRVT.PP |
| PPP MX 2025 | 11.31 | verificado | World Bank PA.NUS.PRVT.PP |
| PPP GB / ES | 0.70 / 0.61 | verificado | World Bank PA.NUS.PRVT.PP |
| `scenario_items_changed` | 2 | **preliminar** | hipótesis interna; no científica |

URLs canónicas:  
- NFA CBI: https://nfa.dk/media/a4wheblj/cbi-scales.pdf  
- NFA PUMA: https://nfa.dk/media/hl5nbers/cbi-first-edition.pdf  
- ES: https://scielo.isciii.es/scielo.php?lng=es&nrm=iso&pid=S1135-57272013000200006&script=sci_arttext  
- PT-BR: https://pmc.ncbi.nlm.nih.gov/articles/PMC10416248/  
- WHO: https://www.who.int/standards/classifications/frequently-asked-questions/burn-out-an-occupational-phenomenon  
- World Bank PPP: https://data.worldbank.org/indicator/PA.NUS.PRVT.PP

### Licencias
- **CBI instrumento:** literatura de validación revisada lo describe como dominio público; mantener atribución y registro de fuente. La licencia del PDF/sitio NFA no se debe inferir como idéntica a la del instrumento.
- **World Bank WDI/PPP:** CC BY 4.0; atribuir.
- **Artículo PT-BR (PMC):** Creative Commons Attribution según el artículo; reutilizar solo conforme a la licencia indicada en la publicación.
- **Artículo CBI abreviado:** CC BY-NC-ND 4.0; solo evidencia, no activo comercial.
- **HF dataset sintético:** CC BY-NC-ND 4.0; no apto como activo comercial.
- **GitHub ML:** código MIT; licencia/procedencia del dataset es separada y no resuelta.
- **HF RoBERTa:** **no_verificado** por conflicto Apache-2.0/MIT.
- **SVM/arXiv + HackerEarth/Kaggle:** preprint consultable; licencia comercial del dataset subyacente no confirmada.
- **WHO/CDC:** usar hechos y citas breves con atribución; no asumir permiso para marcas o redistribución de contenido.
- **Artículos originales/PubMed:** usados como evidencia/cita, no redistribuidos como activos.

## 5. Legal, ética y sesgo
StressCast debe seguir posicionado como herramienta de reflexión de bienestar laboral, no diagnóstico ni tratamiento. El cutoff PUMA es una **referencia contextual** de trabajadores de servicios humanos en Dinamarca, no un umbral clínico ni norma universal. No debe usarse para decisiones de empleo sobre terceros.

La app evita voz, cámara, biometría y emotion recognition. Antes del email gate no necesita PII. La analítica no debe enviar respuestas, score ni banda a terceros. Debe ofrecer política de privacidad clara, borrado/retención definidos y revisión legal por mercado antes de lanzamiento público. Si el producto detecta o recibe señales de crisis en futuras versiones, requerirá un diseño de soporte distinto; v1 no debe presentarse como servicio de crisis.

## 6. Excel
La base fue reexportada con `artifact_tool`; `Fuentes` corrige la licencia conflictiva y `Changelog` registra cinco cambios v3.0.0. Un escaneo final no encontró `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?` ni `#N/A`.

## 7. Open issues para Agente 4
1. Tratar ES/PT de cuestionario como **gate de producción**, no como copy libre.
2. Incluir revisión legal/privacidad y trademark/domain como launch gates.
3. Mantener el escenario 30d siempre rotulado “condicional/what-if”; si tests de comprensión muestran confusión material, usar snapshot-only.
4. No activar pago hasta cumplir thresholds de fase 1 y no activar suscripción sin señal de recurrencia.
5. Una predicción real a 30 días exige una cohorte longitudinal consentida y validación temporal independiente; no debe emerger por copy.
