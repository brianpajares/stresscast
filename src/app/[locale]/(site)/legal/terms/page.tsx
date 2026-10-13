import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { LegalSections, PageShell, type LegalSection } from "@/components/content/page-shell";
import { alternatesFor } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/legal/terms">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("termsTitle"), alternates: alternatesFor(locale, "/legal/terms") };
}

export default async function TermsPage({ params }: PageProps<"/[locale]/legal/terms">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <PageShell title={t("legal.terms.title")} lead={t("legal.lastUpdated", { date: "2026-10-07" })}>
      <LegalSections sections={t.raw("legal.terms.sections") as LegalSection[]} draftNotice={t("legal.draftNotice")} />
    </PageShell>
  );
}
