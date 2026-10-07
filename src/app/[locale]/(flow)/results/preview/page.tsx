import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { PreviewView } from "@/components/results/preview-view";

export async function generateMetadata({ params }: PageProps<"/[locale]/results/preview">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("previewTitle"), robots: { index: false, follow: false } };
}

export default async function PreviewPage({ params }: PageProps<"/[locale]/results/preview">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <PreviewView />;
}
