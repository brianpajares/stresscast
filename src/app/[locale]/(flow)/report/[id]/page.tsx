import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReportViewComponent } from "@/components/report/report-view";
import { buildReportView, type Translator } from "@/lib/report/view";
import { resolveReport } from "@/lib/server/report-access";

export async function generateMetadata({ params }: PageProps<"/[locale]/report/[id]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  // Informe privado: nunca indexable ni cacheable (FR-11).
  return { title: t("reportTitle"), robots: { index: false, follow: false, noarchive: true, nocache: true } };
}

export default async function ReportPage({ params, searchParams }: PageProps<"/[locale]/report/[id]">) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : undefined;
  const access = await resolveReport(id, token);
  const t = await getTranslations();

  if (!access.ok) {
    return (
      <div className="mx-auto w-full max-w-(--container-form) px-4 py-12 sm:py-20">
        <Card className="text-center">
          <Lock className="mx-auto size-10 text-muted" aria-hidden="true" />
          <h1 tabIndex={-1} className="mt-4 text-2xl font-extrabold tracking-tight">
            {access.reason === "expired" ? t("report.expired") : t("report.denied")}
          </h1>
          <div className="mt-6">
            <Link href="/" className={buttonVariants({ variant: "primary" })}>
              {t("report.backHome")}
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const view = buildReportView(t as unknown as Translator, { ...access.data, locale });
  const pdfHref = `/api/reports/${id}/pdf?token=${encodeURIComponent(token as string)}&lang=${locale}`;

  return (
    <ReportViewComponent
      view={view}
      issuedAt={access.data.issuedAt}
      modelVersion={access.data.result.model_version}
      pdfHref={pdfHref}
      labels={{
        download: t("report.download"),
        externalLink: t("common.externalLink"),
        openInNewTab: t("common.openInNewTab"),
      }}
    />
  );
}
