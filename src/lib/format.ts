import { INTL_LOCALE, type Locale } from "@/i18n/routing";

/** Score/puntos con una decimal, formato local (UI). El valor interno sigue usando punto decimal. */
export function formatScore(value: number, locale: Locale, digits = 1): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatInteger(value: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(fraction: number, locale: Locale, digits = 1): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(fraction);
}

/** Moneda con Intl.NumberFormat (nunca concatenación manual). */
export function formatCurrency(amount: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], { style: "currency", currency }).format(amount);
}

/** Fecha de informe (UTC → fecha local del idioma, sin hora). */
export function formatDate(iso: string | Date, locale: Locale): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: "long", timeZone: "UTC" }).format(date);
}

/** Nombre localizado del país (código ISO 3166-1 alpha-2). */
export function countryName(code: string, locale: Locale): string {
  try {
    return new Intl.DisplayNames([INTL_LOCALE[locale]], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
