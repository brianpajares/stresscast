import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ProcessingFlow } from "@/components/assessment/processing-flow";

export async function generateMetadata({ params }: PageProps<"/[locale]/assessment/processing">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "processing" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function ProcessingPage({ params }: PageProps<"/[locale]/assessment/processing">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <ProcessingFlow />;
}
