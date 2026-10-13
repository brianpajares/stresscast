import { LOCALES, type Locale } from "@/i18n/routing";

/**
 * Gate lingüístico (PRD §23 / LAUNCH_CHECKLIST · Wording e i18n).
 * El wording ES/PT de los 7 ítems es preliminar hasta cotejarlo con versiones validadas. Hasta que el operador
 * cierre el gate (LINGUISTIC_GATE_APPROVED="es,pt"), esos idiomas siguen utilizables pero NO se indexan
 * ni se anuncian en sitemap/hreflang. Inglés (wording original CBI) siempre está aprobado.
 */
export function approvedLocales(): Locale[] {
  const raw = (process.env.LINGUISTIC_GATE_APPROVED ?? "").split(",").map((s) => s.trim().toLowerCase());
  return LOCALES.filter((l) => l === "en" || raw.includes(l));
}

export function isLocaleIndexable(locale: Locale): boolean {
  return approvedLocales().includes(locale);
}
