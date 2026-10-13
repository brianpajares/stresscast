import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { LegalSections, PageShell, type LegalSection } from "@/components/content/page-shell";
import { alternatesFor } from "@/lib/site";
import { POLICY_VERSION } from "@/lib/legal";

export async function generateMetadata({ params }: PageProps<"/[locale]/legal/privacy">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("privacyTitle"), alternates: alternatesFor(locale, "/legal/privacy") };
}

export default async function PrivacyPage({ params }: PageProps<"/[locale]/legal/privacy">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <PageShell title={t("legal.privacy.title")} lead={`${t("legal.lastUpdated", { date: "2026-10-07" })} · ${POLICY_VERSION}`}>
      <LegalSections sections={t.raw("legal.privacy.sections") as LegalSection[]} draftNotice={t("legal.draftNotice")} />
    </PageShell>
  );
}
