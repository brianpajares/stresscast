import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { PageShell } from "@/components/content/page-shell";
import { PrivacyConfirm } from "@/components/legal/privacy-forms";

export async function generateMetadata({ params }: PageProps<"/[locale]/legal/privacy-request/confirm">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "legal.rights" });
  return { title: t("confirmTitle"), robots: { index: false, follow: false } };
}

export default async function PrivacyConfirmPage({ params }: PageProps<"/[locale]/legal/privacy-request/confirm">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <PageShell title={t("legal.rights.confirmTitle")}>
      <Suspense fallback={null}>
        <PrivacyConfirm />
      </Suspense>
    </PageShell>
  );
}
