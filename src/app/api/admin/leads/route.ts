import { z } from "zod";
import { getAdminSession } from "@/lib/server/admin-auth";
import { apiError, handleError, json, newRequestId } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export const dynamic = "force-dynamic";

const query = z.object({
  status: z.enum(["received", "preparing", "ready", "delivery_pending", "delivered", "delivery_failed", "cancelled"]).optional(),
  cursor: z.string().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

/** GET /api/admin/leads — 401 sin sesión, 403 si no es admin (FR-15 / FR-29). */
export async function GET(req: Request) {
  const requestId = newRequestId(req);
  try {
    const session = await getAdminSession();
    if (session.state === "anonymous") return apiError(401, "unauthenticated", "Authentication required.", requestId);
    if (session.state === "forbidden") return apiError(403, "forbidden", "Not authorized.", requestId);

    const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) return apiError(400, "invalid_request", "Invalid query.", requestId);
    const store = getStore();
    if (!store) return json({ items: [], next_cursor: null }, 200, requestId);

    const { items, nextCursor } = await store.listLeads({ status: parsed.data.status, cursor: parsed.data.cursor, limit: parsed.data.limit });
    return json(
      {
        items: items.map((l) => ({ id: l.id, email: l.email, status: l.status, created_at: l.created_at, last_delivery_status: l.last_delivery_status })),
        next_cursor: nextCursor,
      },
      200,
      requestId,
    );
  } catch (e) {
    return handleError(e, requestId);
  }
}
