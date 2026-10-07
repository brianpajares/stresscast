/** Fuentes citadas en informe/PDF/página de fuentes (drive/base/fuentes_datos.csv · estado "verificado"). */
export const SOURCES = [
  { id: "SRC_CBI_NFA_PDF", labelKey: "cbi", url: "https://nfa.dk/media/a4wheblj/cbi-scales.pdf" },
  { id: "SRC_CBI_NFA_NORMS", labelKey: "norms", url: "https://nfa.dk/media/hl5nbers/cbi-first-edition.pdf" },
  { id: "SRC_CBI_ORIGINAL", labelKey: "original", url: "https://doi.org/10.1080/02678370500297720" },
  {
    id: "SRC_CBI_ES",
    labelKey: "es",
    url: "https://scielo.isciii.es/scielo.php?lng=es&nrm=iso&pid=S1135-57272013000200006&script=sci_arttext",
  },
  { id: "SRC_CBI_PTBR", labelKey: "pt", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10416248/" },
  {
    id: "SRC_WHO_BURNOUT",
    labelKey: "who",
    url: "https://www.who.int/standards/classifications/frequently-asked-questions/burn-out-an-occupational-phenomenon",
  },
] as const;

export type SourceId = (typeof SOURCES)[number]["id"];
