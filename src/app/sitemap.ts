import type { MetadataRoute } from "next";
import { approvedLocales } from "@/lib/gate";
import { localizedPath, siteUrl } from "@/lib/site";

const PATHS = ["", "/how-it-works", "/faq", "/sources", "/legal/privacy", "/legal/terms", "/legal/wellness-disclaimer", "/legal/privacy-request"];

/** Sitemap (FR-23): solo idiomas con gate lingüístico cerrado; hreflang coherente entre ellos. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const locales = approvedLocales();
  return PATHS.flatMap((path) =>
    locales.map((locale) => ({
      url: `${base}${localizedPath(locale, path)}`,
      lastModified: new Date("2026-10-07"),
      changeFrequency: path === "" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "" ? 1 : path.startsWith("/legal") ? 0.3 : 0.7,
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l === "pt" ? "pt-BR" : l, `${base}${localizedPath(l, path)}`])),
      },
    })),
  );
}
