import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { routing } from "@/i18n/routing";
import { PageShell } from "@/components/content/page-shell";
import { SOURCES } from "@/lib/report/sources";
import { alternatesFor } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/sources">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("sourcesTitle"), description: t("sourcesDescription"), alternates: alternatesFor(locale, "/sources") };
}

export default async function SourcesPage({ params }: PageProps<"/[locale]/sources">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <PageShell title={t("meta.sourcesTitle")} lead={t("sources.intro")}>
      <ul className="space-y-3">
        {SOURCES.map((s) => (
          <li key={s.id} className="rounded-lg border border-border bg-surface p-4">
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-start gap-2 font-semibold text-primary underline underline-offset-4 hover:text-primary-hover"
            >
              <span>{t(`sources.items.${s.labelKey}`)}</span>
              <ExternalLink className="mt-1 size-4 shrink-0" aria-hidden="true" />
              <span className="sr-only">{t("common.openInNewTab")}</span>
            </a>
            <p className="mt-1 break-all text-xs text-muted">{s.url}</p>
          </li>
        ))}
        <li className="rounded-lg border border-border bg-surface p-4">
          <a
            href="https://data.worldbank.org/indicator/PA.NUS.PRVT.PP"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-start gap-2 font-semibold text-primary underline underline-offset-4"
          >
            <span>{t("sources.items.ppp")}</span>
            <ExternalLink className="mt-1 size-4 shrink-0" aria-hidden="true" />
            <span className="sr-only">{t("common.openInNewTab")}</span>
          </a>
        </li>
      </ul>
      <p className="text-sm text-muted">{t("sources.licenceNote")}</p>
    </PageShell>
  );
}
