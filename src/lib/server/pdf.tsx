import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { HTML_LANG } from "@/i18n/routing";
import { ReportDocument } from "@/lib/pdf/report-document";
import type { ReportData } from "@/lib/report/data";
import { buildReportView, type Translator } from "@/lib/report/view";

/** PDF con @react-pdf/renderer (FR-12). Mismo ReportView que el informe web ⇒ mismos números y versiones. */
export async function renderReportPdf(data: ReportData, locale: Locale): Promise<Buffer> {
  const t = (await getTranslations({ locale })) as unknown as Translator;
  const view = buildReportView(t, { ...data, locale });
  const pageTpl = (page: number, total: number) => t("report.pageOf", { page, total });
  return renderToBuffer(
    <ReportDocument view={view} lang={HTML_LANG[locale]} documentTitle={t("report.pdfDocumentTitle")} pageOf={pageTpl} />,
  );
}

/** Nombre de archivo canónico: StressCast-report-YYYY-MM-DD-{verification_id}.pdf */
export function pdfFilename(data: ReportData): string {
  const day = new Date(data.issuedAt).toISOString().slice(0, 10);
  return `StressCast-report-${day}-${data.verificationId}.pdf`;
}
