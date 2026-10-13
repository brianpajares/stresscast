import type { Locale } from "@/i18n/routing";
import { approvedLocales } from "@/lib/gate";

/** Origen público (canonical, sitemap, OG). Prioriza NEXT_PUBLIC_APP_URL; en Vercel cae al dominio de producción. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export function localizedPath(locale: Locale, path = ""): string {
  const clean = path === "/" ? "" : path;
  return `/${locale}${clean}`;
}

/** Alternates SEO (FR-23): canonical + hreflang es/en/pt + x-default (en). */
export function alternatesFor(locale: Locale, path = ""): {
  canonical: string;
  languages: Record<string, string>;
} {
  const base = siteUrl();
  const languages: Record<string, string> = {};
  for (const l of approvedLocales()) languages[l === "pt" ? "pt-BR" : l] = `${base}${localizedPath(l, path)}`;
  languages["x-default"] = `${base}${localizedPath("en", path)}`;
  return { canonical: `${base}${localizedPath(locale, path)}`, languages };
}

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";

/** Subconjunto de mensajes que necesitan los Client Components (reduce el payload de hidratación). */
export function pickClientMessages(messages: Record<string, unknown>): Record<string, unknown> {
  const legal = (messages.legal ?? {}) as Record<string, unknown>;
  return {
    common: messages.common,
    consent: messages.consent,
    nav: messages.nav,
    footer: messages.footer,
    country: messages.country,
    questions: messages.questions,
    degree: messages.degree,
    frequency: messages.frequency,
    assessment: messages.assessment,
    processing: messages.processing,
    preview: messages.preview,
    request: messages.request,
    checkout: messages.checkout,
    success: messages.success,
    items: messages.items,
    errors: messages.errors,
    legal: { disclaimer: legal.disclaimer, support: legal.support, rights: legal.rights },
  };
}
