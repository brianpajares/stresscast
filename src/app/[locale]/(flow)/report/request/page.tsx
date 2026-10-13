import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { RequestForm } from "@/components/report/request-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/report/request">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("requestTitle"), robots: { index: false, follow: false } };
}

export default async function RequestPage({ params }: PageProps<"/[locale]/report/request">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <RequestForm />;
}
