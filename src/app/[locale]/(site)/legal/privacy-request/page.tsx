import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { PageShell } from "@/components/content/page-shell";
import { PrivacyRequestForm } from "@/components/legal/privacy-forms";
import { alternatesFor } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/legal/privacy-request">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("privacyRequestTitle"), alternates: alternatesFor(locale, "/legal/privacy-request") };
}

export default async function PrivacyRequestPage({ params }: PageProps<"/[locale]/legal/privacy-request">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <PageShell title={t("legal.rights.title")}>
      <PrivacyRequestForm />
    </PageShell>
  );
}
