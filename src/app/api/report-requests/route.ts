import { after } from "next/server";
import { isDeepStrictEqual } from "node:util";
import { EngineInputError } from "@/engine/types";
import { COPY_VERSION, POLICY_VERSION } from "@/lib/legal";
import { buildReportData } from "@/lib/report/data";
import { idempotencyKeySchema, reportRequestInputSchema } from "@/lib/schemas";
import { deliverReport, reportUrlFor } from "@/lib/server/delivery";
import { features, monetizationMode, reportLinkTtlDays, retentionDays, stripeActive } from "@/lib/server/env";
import { apiError, handleError, json, newRequestId, readJson, sha256Hex } from "@/lib/server/http";
import { claimKey } from "@/lib/server/idempotency";
import { logWarn } from "@/lib/server/log";
import { calculateWithBundle } from "@/lib/server/model";
import { rateLimit } from "@/lib/server/ratelimit";
import { getStore } from "@/lib/server/store";
import { encodeInputs, issueStatelessToken, issueStoredToken } from "@/lib/server/tokens";
import { verifyTurnstile } from "@/lib/server/turnstile";
import { APP_VERSION } from "@/lib/site";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Delivery = "email" | "pending" | "demo";

/**
 * POST /api/report-requests (FR-08..FR-11, FR-27, NFR-12).
 *  - Exige Idempotency-Key, email válido, consentimiento de entrega y Turnstile.
 *  - Recalcula en servidor y rechaza si el resultado enviado no coincide (no se confía en el cliente).
 *  - Con base de datos: lead + cálculo + solicitud + consentimientos en UNA transacción idempotente; la entrega
 *    (PDF + emails) se ejecuta después de responder (`after`) y deja estados reintentables.
 *  - Sin base de datos: enlace stateless cifrado (AES-GCM) y, si hay Resend, email igualmente.
 */
export async function POST(req: Request) {
  const requestId = newRequestId(req);
  try {
    const limit = await rateLimit(req, "report-request");
    if (!limit.ok) {
      return apiError(429, "rate_limited", "Too many requests. Please wait a minute.", requestId, {
        "Retry-After": String(limit.retryAfterSeconds),
      });
    }

    const idem = idempotencyKeySchema.safeParse(req.headers.get("idempotency-key"));
    if (!idem.success) return apiError(400, "idempotency_key_required", "A valid Idempotency-Key header is required.", requestId);
    const idempotencyKey = idem.data;

    const body = await readJson(req, reportRequestInputSchema, 32 * 1024);

    const captcha = await verifyTurnstile(body.turnstile_token, req);
    if (!captcha.ok) {
      if (captcha.reason === "invalid") return apiError(400, "turnstile_failed", "Security check failed.", requestId);
      return apiError(503, captcha.reason === "unconfigured" ? "captcha_unconfigured" : "turnstile_unavailable", "Security check unavailable. Try again later.", requestId);
    }

    const { result, bundle } = await calculateWithBundle(body.calculation.inputs);
    if (!isDeepStrictEqual(result, body.calculation.result)) {
      return apiError(400, "calculation_mismatch", "The submitted result does not match the inputs.", requestId);
    }

    const store = getStore();
    const mode = monetizationMode();
    if (stripeActive() && !store) return apiError(503, "store_required", "Payments require persistence.", requestId);

    const locale = body.locale;
    const email = body.email.toLowerCase();
    const emailConfigured = features().resend;
    const versions = { app: APP_VERSION, model: result.model_version, data: bundle.meta.data_version, manifest: bundle.meta.manifest_version };
    const newId = crypto.randomUUID();
    const issuedAt = new Date();
    const inputs = body.calculation.inputs;

    /* ------------------------------------------------ con base de datos */
    if (store) {
      const issued = issueStoredToken(newId, issuedAt);
      const outcome = await store.createReportRequest({
        requestId: newId,
        idempotencyKey,
        email,
        locale,
        country: inputs.country,
        inputs,
        result,
        marketingOptIn: body.marketing_opt_in,
        ownerCopy: mode === "validation",
        policyVersion: POLICY_VERSION,
        copyVersion: COPY_VERSION,
        monetizationMode: mode,
        versions,
        tokenHash: issued.hash,
        tokenExpiresAt: issued.expiresAt,
        deleteAfter: new Date(issuedAt.getTime() + retentionDays() * 86_400_000),
      });

      if (outcome.replay) {
        if (!outcome.samePayload) return apiError(409, "idempotency_conflict", "Idempotency-Key reused with a different payload.", requestId);
        // El token en claro no se conserva: el enlace ya fue enviado por email; aquí solo se confirma el estado.
        return json(
          { request_id: outcome.requestId, status: outcome.status === "delivered" ? "delivered" : "preparing", report_url: null, delivery: (emailConfigured ? "email" : "pending") as Delivery },
          201,
          requestId,
        );
      }

      if (mode === "stripe") {
        // La entrega ocurre tras el pago confirmado por webhook firmado (FR-26).
        return json({ request_id: outcome.requestId, status: "accepted", report_url: null, calculation_id: outcome.calculationId, delivery: "pending" as Delivery }, 201, requestId);
      }

      const data = buildReportData({ requestId: newId, locale, issuedAt: issuedAt.toISOString(), versions, inputs, result, base: bundle.base });
      after(async () => {
        try {
          await deliverReport({ store, data, email, leadId: outcome.leadId, mode, token: issued.token, discriminator: "initial", locale });
        } catch (e) {
          logWarn("delivery_crashed", { error: e instanceof Error ? e.name : "unknown" });
          await store.setStatus(newId, "delivery_failed", "delivery_crashed").catch(() => undefined);
        }
      });
      return json(
        { request_id: newId, status: "accepted", report_url: reportUrlFor(locale, newId, issued.token), delivery: (emailConfigured ? "email" : "pending") as Delivery },
        201,
        requestId,
      );
    }

    /* ------------------------------------------------ stateless (sin BD) */
    const first = await claimKey("report-request", sha256Hex(idempotencyKey));
    if (!first) {
      return json({ request_id: newId, status: "preparing", report_url: null, delivery: (emailConfigured ? "email" : "demo") as Delivery }, 201, requestId);
    }
    const issued = issueStatelessToken({ r: newId, l: locale, a: encodeInputs(inputs), m: result.model_version }, issuedAt);
    const reportUrl = reportUrlFor(locale, newId, issued.token);
    if (emailConfigured) {
      const data = buildReportData({ requestId: newId, locale, issuedAt: issuedAt.toISOString(), versions, inputs, result, base: bundle.base });
      after(async () => {
        try {
          await deliverReport({ store: null, data, email, leadId: null, mode, token: issued.token, discriminator: "initial", locale });
        } catch (e) {
          logWarn("delivery_crashed", { error: e instanceof Error ? e.name : "unknown" });
        }
      });
    }
    return json({ request_id: newId, status: "accepted", report_url: reportUrl, delivery: (emailConfigured ? "email" : "demo") as Delivery }, 201, requestId, {
      "X-Link-Ttl-Days": String(reportLinkTtlDays()),
    });
  } catch (error) {
    if (error instanceof EngineInputError) return apiError(400, "invalid_request", "Invalid assessment inputs.", requestId);
    return handleError(error, requestId);
  }
}
