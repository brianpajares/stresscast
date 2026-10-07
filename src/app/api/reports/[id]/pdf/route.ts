import { isLocale } from "@/i18n/routing";
import { apiError, handleError, newRequestId } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/ratelimit";
import { resolveReport } from "@/lib/server/report-access";
import { pdfFilename, renderReportPdf } from "@/lib/server/pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** GET /api/reports/{id}/pdf?token= — PDF privado (FR-12/FR-13), `@react-pdf/renderer`. */
export async function GET(req: Request, ctx: RouteContext<"/api/reports/[id]/pdf">) {
  const requestId = newRequestId(req);
  try {
    const limit = await rateLimit(req, "report-pdf", 20);
    if (!limit.ok) {
      return apiError(429, "rate_limited", "Too many requests.", requestId, { "Retry-After": String(limit.retryAfterSeconds) });
    }
    const { id } = await ctx.params;
    const url = new URL(req.url);
    const access = await resolveReport(id, url.searchParams.get("token"));
    if (!access.ok) {
      return apiError(401, access.reason === "expired" ? "token_expired" : "token_invalid", "Invalid or expired link.", requestId);
    }
    const lang = url.searchParams.get("lang");
    const locale = isLocale(lang) ? lang : access.data.locale;
    const pdf = await renderReportPdf(access.data, locale);
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFilename(access.data)}"`,
        "Cache-Control": "private, no-store",
        "X-Request-Id": requestId,
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    return handleError(error, requestId);
  }
}
