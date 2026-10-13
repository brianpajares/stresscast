import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { RequestForm } from "@/components/report/request-form";
import { stripeActive } from "@/lib/server/env";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** S15 · Checkout (futuro). Con flags off (validation) la ruta no existe: 404 (FR-24). */
export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  if (!stripeActive()) notFound();
  setRequestLocale(locale);
  return <RequestForm mode="checkout" />;
}
