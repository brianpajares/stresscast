import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { AssessmentFlow } from "@/components/assessment/assessment-flow";

export async function generateMetadata({ params }: PageProps<"/[locale]/assessment">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("assessmentTitle"), robots: { index: false, follow: false } };
}

export default async function AssessmentPage({ params }: PageProps<"/[locale]/assessment">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <AssessmentFlow />;
}
