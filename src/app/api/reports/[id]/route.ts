import { apiError, handleError, json, newRequestId } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/ratelimit";
import { resolveReport } from "@/lib/server/report-access";
import { APP_VERSION } from "@/lib/site";

export const dynamic = "force-dynamic";

/** GET /api/reports/{id}?token= — informe privado (FR-11). 401 si el token es inválido o expiró. */
export async function GET(req: Request, ctx: RouteContext<"/api/reports/[id]">) {
  const requestId = newRequestId(req);
  try {
    const limit = await rateLimit(req, "report-read", 60);
    if (!limit.ok) {
      return apiError(429, "rate_limited", "Too many requests.", requestId, { "Retry-After": String(limit.retryAfterSeconds) });
    }
    const { id } = await ctx.params;
    const token = new URL(req.url).searchParams.get("token");
    const access = await resolveReport(id, token);
    if (!access.ok) {
      return apiError(401, access.reason === "expired" ? "token_expired" : "token_invalid", "Invalid or expired link.", requestId);
    }
    const { data } = access;
    return json(
      {
        id: data.requestId,
        result: data.result,
        locale: data.locale,
        app_version: data.versions.app || APP_VERSION,
        model_version: data.result.model_version,
      },
      200,
      requestId,
      { "Cache-Control": "private, no-store" },
    );
  } catch (error) {
    return handleError(error, requestId);
  }
}
