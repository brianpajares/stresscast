"use client";

import type { AssessmentInput, CalculationResult } from "@/engine/types";
import { calculationResultSchema } from "@/lib/schemas";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;

  constructor(status: number, code: string, message: string, requestId: string | null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

async function parseError(res: Response): Promise<ApiClientError> {
  try {
    const data = (await res.json()) as { code?: string; message?: string; request_id?: string };
    return new ApiClientError(res.status, data.code ?? "unknown_error", data.message ?? res.statusText, data.request_id ?? null);
  } catch {
    return new ApiClientError(res.status, "unknown_error", res.statusText, null);
  }
}

export async function calculateRequest(inputs: AssessmentInput): Promise<{
  result: CalculationResult;
  latencyMs: number;
}> {
  const t0 = performance.now();
  let res: Response;
  try {
    res = await fetch("/api/calculate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(inputs),
    });
  } catch {
    throw new ApiClientError(0, "network_error", "network", null);
  }
  if (!res.ok) throw await parseError(res);
  const parsed = calculationResultSchema.safeParse(await res.json());
  if (!parsed.success) throw new ApiClientError(502, "invalid_response", "invalid response", null);
  return { result: parsed.data as CalculationResult, latencyMs: performance.now() - t0 };
}

export interface ReportRequestCreated {
  request_id: string;
  status: "accepted" | "preparing" | "delivered";
  report_url: string | null;
  calculation_id?: string;
  delivery?: "email" | "pending" | "demo";
}

export async function createReportRequest(
  body: unknown,
  idempotencyKey: string,
): Promise<ReportRequestCreated> {
  let res: Response;
  try {
    res = await fetch("/api/report-requests", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError(0, "network_error", "network", null);
  }
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as ReportRequestCreated;
}

export async function createPrivacyRequest(
  email: string,
  requestType: "access" | "deletion" | "rectification",
  idempotencyKey: string,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/privacy/requests", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
      body: JSON.stringify({ email, request_type: requestType }),
    });
  } catch {
    throw new ApiClientError(0, "network_error", "network", null);
  }
  if (!res.ok) throw await parseError(res);
}

export async function createCheckout(
  body: { calculation_id: string; email: string; country: string },
  idempotencyKey: string,
): Promise<{ checkout_url: string }> {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as { checkout_url: string };
}
