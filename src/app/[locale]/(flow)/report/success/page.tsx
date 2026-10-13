import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { SuccessView } from "@/components/report/success-view";

export async function generateMetadata({ params }: PageProps<"/[locale]/report/success">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("successTitle"), robots: { index: false, follow: false } };
}

export default async function SuccessPage({ params }: PageProps<"/[locale]/report/success">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <SuccessView />;
}
