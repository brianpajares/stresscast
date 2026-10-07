import "server-only";
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import { COUNTRIES, DEGREE_RESPONSES, FREQUENCY_RESPONSES, ITEM_KEYS, ITEM_SCALE, type AssessmentInput } from "@/engine/types";
import { reportTokenSecret, reportLinkTtlDays } from "./env";
import { sha256Hex } from "./sha";

/**
 * Tokens privados del informe (FR-11): no predecibles, firmados/expirables y sin PII ni score en la URL.
 *
 *  - `v1.<random>.<mac>`  → respaldado por base de datos: se guarda solo sha256(token); el HMAC permite
 *    rechazar tokens manipulados sin consultar la DB y liga el token al id de la solicitud.
 *  - `s1.<ciphertext>`    → stateless (modo sin base de datos): carga útil cifrada con AES-256-GCM
 *    (clave derivada por HKDF de REPORT_TOKEN_SECRET). La URL no revela respuestas ni score.
 */
const b64 = (buf: Buffer) => buf.toString("base64url");

function macFor(requestId: string, random: string): string {
  return b64(createHmac("sha256", reportTokenSecret()).update(`v1|${requestId}|${random}`).digest()).slice(0, 22);
}

export interface IssuedToken {
  token: string;
  hash: string;
  expiresAt: Date;
}

export function issueStoredToken(requestId: string, now = new Date()): IssuedToken {
  const random = b64(randomBytes(32));
  const token = `v1.${random}.${macFor(requestId, random)}`;
  return {
    token,
    hash: sha256Hex(token),
    expiresAt: new Date(now.getTime() + reportLinkTtlDays() * 86_400_000),
  };
}

export function tokenKind(token: string): "stored" | "stateless" | "unknown" {
  if (token.startsWith("v1.")) return "stored";
  if (token.startsWith("s1.")) return "stateless";
  return "unknown";
}

/** Verifica un token respaldado por DB: formato, HMAC (constant-time), hash almacenado y expiración. */
export function verifyStoredToken(
  token: string,
  requestId: string,
  stored: { hash: string | null; expiresAt: string | Date | null },
  now = new Date(),
): "ok" | "invalid" | "expired" {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1" || token.length < 32 || token.length > 128) return "invalid";
  const expected = Buffer.from(macFor(requestId, parts[1]));
  const given = Buffer.from(parts[2]);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return "invalid";
  if (!stored.hash) return "invalid";
  const a = Buffer.from(sha256Hex(token), "hex");
  const b = Buffer.from(stored.hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "invalid";
  if (stored.expiresAt && new Date(stored.expiresAt).getTime() < now.getTime()) return "expired";
  return "ok";
}

/* ------------------------------------------------------------------ stateless */

export interface StatelessPayload {
  /** id de solicitud (UUID) */
  r: string;
  /** locale */
  l: "es" | "en" | "pt";
  /** inputs compactos: país + 7 índices de respuesta */
  a: string;
  /** emitido (epoch s) / expira (epoch s) */
  i: number;
  e: number;
  /** versión de modelo que emitió */
  m: string;
}

function statelessKey(): Buffer {
  return Buffer.from(hkdfSync("sha256", reportTokenSecret(), "stresscast-stateless-v1", "report-token", 32));
}

export function encodeInputs(inputs: AssessmentInput): string {
  const digits = ITEM_KEYS.map((k) => {
    const scale = ITEM_SCALE[k] === "degree" ? DEGREE_RESPONSES : FREQUENCY_RESPONSES;
    return (scale as readonly string[]).indexOf(inputs[k]);
  });
  return `${inputs.country}${digits.join("")}`;
}

export function decodeInputs(encoded: string): AssessmentInput | null {
  if (!/^[A-Z]{2}[0-4]{7}$/.test(encoded)) return null;
  const country = encoded.slice(0, 2);
  if (!(COUNTRIES as readonly string[]).includes(country)) return null;
  const out: Record<string, string> = { country };
  ITEM_KEYS.forEach((k, i) => {
    const scale = ITEM_SCALE[k] === "degree" ? DEGREE_RESPONSES : FREQUENCY_RESPONSES;
    out[k] = scale[Number(encoded[2 + i])];
  });
  return out as unknown as AssessmentInput;
}

export function issueStatelessToken(payload: Omit<StatelessPayload, "i" | "e">, now = new Date()): IssuedToken {
  const iat = Math.floor(now.getTime() / 1000);
  const exp = iat + reportLinkTtlDays() * 86_400;
  const body = Buffer.from(JSON.stringify({ ...payload, i: iat, e: exp } satisfies StatelessPayload), "utf8");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", statelessKey(), iv);
  // El id de solicitud actúa como AAD: un token no se puede reutilizar bajo otro id.
  cipher.setAAD(Buffer.from(payload.r));
  const enc = Buffer.concat([cipher.update(body), cipher.final()]);
  const token = `s1.${b64(Buffer.concat([iv, enc, cipher.getAuthTag()]))}`;
  return { token, hash: sha256Hex(token), expiresAt: new Date(exp * 1000) };
}

export function openStatelessToken(
  token: string,
  requestId: string,
  now = new Date(),
): { status: "ok"; payload: StatelessPayload } | { status: "invalid" | "expired" } {
  if (!token.startsWith("s1.") || token.length > 1024) return { status: "invalid" };
  try {
    const raw = Buffer.from(token.slice(3), "base64url");
    if (raw.length < 12 + 16 + 2) return { status: "invalid" };
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(raw.length - 16);
    const enc = raw.subarray(12, raw.length - 16);
    const decipher = createDecipheriv("aes-256-gcm", statelessKey(), iv);
    decipher.setAAD(Buffer.from(requestId));
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
    const payload = JSON.parse(plain) as StatelessPayload;
    if (payload.r !== requestId || !decodeInputs(payload.a)) return { status: "invalid" };
    if (payload.e * 1000 < now.getTime()) return { status: "expired" };
    return { status: "ok", payload };
  } catch {
    return { status: "invalid" };
  }
}

export { verificationId } from "@/lib/report/verification";
