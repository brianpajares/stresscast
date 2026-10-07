import { defineRouting } from "next-intl/routing";

/**
 * FR-01 / NFR-10: es · en · pt (la clave `pt` se trata como PT-BR en copy y <html lang>).
 * Fallback seguro a inglés cuando no hay señal de idioma.
 */
export const routing = defineRouting({
  locales: ["es", "en", "pt"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

export const LOCALES = routing.locales;

export function isLocale(value: string | undefined | null): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Valor BCP-47 para <html lang> y metadata. */
export const HTML_LANG: Record<Locale, string> = { es: "es", en: "en", pt: "pt-BR" };

/** Localización regional para Intl (moneda/fechas). */
export const INTL_LOCALE: Record<Locale, string> = { es: "es-ES", en: "en-US", pt: "pt-BR" };

/** Locale por defecto sugerido por país (solo para pre-seleccionar el idioma, nunca el score). */
export const COUNTRY_DEFAULT_LOCALE: Record<string, Locale> = {
  US: "en",
  GB: "en",
  CA: "en",
  AU: "en",
  BR: "pt",
  MX: "es",
  ES: "es",
};
