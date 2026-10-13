import { z } from "zod";
import { getAdminSession } from "@/lib/server/admin-auth";
import { resendReport } from "@/lib/server/admin-actions";
import { apiError, handleError, json, newRequestId } from "@/lib/server/http";
import { idempotencyKeySchema } from "@/lib/schemas";
import { rateLimit } from "@/lib/server/ratelimit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** POST /api/admin/leads/{id}/resend — reenvío auditado e idempotente (FR-16). */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/leads/[id]/resend">) {
  const requestId = newRequestId(req);
  try {
    const session = await getAdminSession();
    if (session.state === "anonymous") return apiError(401, "unauthenticated", "Authentication required.", requestId);
    if (session.state === "forbidden") return apiError(403, "forbidden", "Not authorized.", requestId);

    const limit = await rateLimit(req, "admin-resend", 30);
    if (!limit.ok) return apiError(429, "rate_limited", "Too many requests.", requestId);

    const { id } = await ctx.params;
    if (!z.uuid().safeParse(id).success) return apiError(404, "not_found", "Lead not found.", requestId);
    const idem = idempotencyKeySchema.safeParse(req.headers.get("idempotency-key"));
    if (!idem.success) return apiError(400, "idempotency_key_required", "A valid Idempotency-Key header is required.", requestId);

    const result = await resendReport({ leadId: id, adminUserId: session.userId, idempotencyKey: idem.data });
    if (!result.ok) return apiError(result.code === "not_found" ? 404 : 409, result.code, "Report cannot be resent.", requestId);
    return json({ status: "accepted", delivery: result.status, duplicate: result.duplicate }, 202, requestId);
  } catch (e) {
    return handleError(e, requestId);
  }
}
