import "server-only";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";

/** Errores de API con `code`, `message`, `request_id` (CLAUDE.md · Convenciones). Sin detalles internos. */
export interface ApiErrorBody {
  code: string;
  message: string;
  request_id: string;
}

export function newRequestId(req?: Request): string {
  const incoming = req?.headers.get("x-request-id");
  if (incoming && /^[A-Za-z0-9_.-]{8,64}$/.test(incoming)) return incoming;
  return crypto.randomUUID();
}

export function apiError(
  status: number,
  code: string,
  message: string,
  requestId: string,
  headers?: Record<string, string>,
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ code, message, request_id: requestId }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function json<T>(body: T, status = 200, requestId?: string, headers?: Record<string, string>): NextResponse<T> {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...(requestId ? { "X-Request-Id": requestId } : {}), ...headers },
  });
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Lee JSON con tope de tamaño y valida con Zod. Lanza HttpError 400/413. */
export async function readJson<T>(req: Request, schema: ZodType<T>, maxBytes = 64 * 1024): Promise<T> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new HttpError(413, "payload_too_large", "Payload too large.");
  const text = await req.text();
  if (Buffer.byteLength(text) > maxBytes) throw new HttpError(413, "payload_too_large", "Payload too large.");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new HttpError(400, "invalid_json", "Request body must be valid JSON.");
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    // Solo rutas de campos inválidos, nunca valores (podrían ser datos sensibles).
    const fields = [...new Set(parsed.error.issues.map((i) => i.path.join(".") || "(root)"))].slice(0, 8).join(", ");
    throw new HttpError(400, "invalid_request", `Invalid request. Check: ${fields}`);
  }
  return parsed.data;
}

/** IP del cliente (Vercel: x-forwarded-for / x-real-ip). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

/** Clave pseudónima para rate limit: nunca guardamos la IP en claro (FR-28). */
export function pseudonymousKey(req: Request, scope: string): string {
  const salt = process.env.REPORT_TOKEN_SECRET ?? "stresscast";
  const h = createHash("sha256").update(`${scope}|${clientIp(req)}|${salt}`).digest("hex").slice(0, 32);
  return `${scope}:${h}`;
}

export { sha256Hex } from "./sha";

/** Respuestas de error unificadas para handlers (convierte HttpError y errores inesperados). */
export function handleError(error: unknown, requestId: string): NextResponse<ApiErrorBody> {
  if (error instanceof HttpError) return apiError(error.status, error.code, error.message, requestId);
  // Nunca devolver mensajes internos ni payloads: solo un código genérico.
  return apiError(500, "internal_error", "Unexpected error. Please try again.", requestId);
}
