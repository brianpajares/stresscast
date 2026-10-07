import { EngineInputError } from "@/engine/types";
import { assessmentInputSchema } from "@/lib/schemas";
import { calculateWithBundle } from "@/lib/server/model";
import { apiError, handleError, json, newRequestId, readJson } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/ratelimit";
import { rateLimitPerMinute } from "@/lib/server/env";

export const dynamic = "force-dynamic";

/**
 * POST /api/calculate (FR-02..FR-04): valida (additionalProperties=false), calcula con el motor
 * determinista y devuelve el resultado estructurado. No persiste nada y NO registra el payload.
 */
export async function POST(req: Request) {
  const requestId = newRequestId(req);
  try {
    const limit = await rateLimit(req, "calculate", rateLimitPerMinute() * 3);
    if (!limit.ok) {
      return apiError(429, "rate_limited", "Too many requests. Please wait and try again.", requestId, {
        "Retry-After": String(limit.retryAfterSeconds),
      });
    }

    const inputs = await readJson(req, assessmentInputSchema, 4 * 1024);
    const { result, bundle } = await calculateWithBundle(inputs);
    return json(result, 200, requestId, {
      "X-Model-Version": result.model_version,
      "X-Data-Version": bundle.meta.data_version,
      "X-Manifest-Version": bundle.meta.manifest_version,
    });
  } catch (error) {
    if (error instanceof EngineInputError) {
      return apiError(400, "invalid_request", "Invalid assessment inputs.", requestId);
    }
    return handleError(error, requestId);
  }
}
