import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Disclosure } from "@/components/ui/disclosure";
import { PageShell } from "@/components/content/page-shell";
import { alternatesFor } from "@/lib/site";

const KEYS = ["diagnosis", "scenario", "denmark", "email", "data", "employer", "accuracy"] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/faq">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("faqTitle"), description: t("faqDescription"), alternates: alternatesFor(locale, "/faq") };
}

export default async function FaqPage({ params }: PageProps<"/[locale]/faq">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();

  // FAQPage solo porque todo su contenido es visible en la página (ux/sitemap_flows.md · reglas SEO).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: KEYS.map((k) => ({
      "@type": "Question",
      name: t(`landing.faq.${k}.q`),
      acceptedAnswer: { "@type": "Answer", text: t(`landing.faq.${k}.a`) },
    })),
  };

  return (
    <PageShell title={t("faqPage.title")} lead={t("faqPage.lead")}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="space-y-3">
        {KEYS.map((k) => (
          <Disclosure key={k} summary={<h2 className="inline text-base font-semibold">{t(`landing.faq.${k}.q`)}</h2>}>
            <p>{t(`landing.faq.${k}.a`)}</p>
          </Disclosure>
        ))}
      </div>
      <p className="text-sm text-muted">{t("legal.disclaimer")}</p>
    </PageShell>
  );
}
