import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Informes privados, API, admin y flujo de evaluación nunca se rastrean.
        disallow: ["/api/", "/admin", "/*/report/", "/*/results/", "/*/assessment"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
