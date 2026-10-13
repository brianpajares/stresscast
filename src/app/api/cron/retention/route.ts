import { timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/server/env";
import { apiError, handleError, json, newRequestId } from "@/lib/server/http";
import { logOps } from "@/lib/server/log";
import { getStore } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/**
 * Purga diaria de retención (PRD §21): borra payloads con `delete_after` vencido y leads huérfanos sin marketing
 * opt-in. Vercel Cron envía `Authorization: Bearer $CRON_SECRET`; sin secreto configurado la ruta está cerrada.
 */
export async function GET(req: Request) {
  const requestId = newRequestId(req);
  try {
    const secret = getEnv().CRON_SECRET;
    const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const ok = !!secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
    if (!ok) return apiError(401, "unauthenticated", "Unauthorized.", requestId);

    const store = getStore();
    if (!store) return json({ status: "skipped", reason: "no_store" }, 200, requestId);
    const purged = await store.purgeExpired();
    logOps("retention_purge", purged);
    return json({ status: "ok", ...purged }, 200, requestId);
  } catch (e) {
    return handleError(e, requestId);
  }
}
