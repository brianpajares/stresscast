import { createHash } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * ID de verificación `SC-{model_version}-{YYYYMMDD}-{8 chars}` (ux/report_layout.md).
 * Se deriva del UUID aleatorio de la solicitud: identifica una emisión, nunca a una persona,
 * y no se calcula a partir de email, score ni respuestas.
 */
export function verificationId(requestId: string, modelVersion: string, issuedAt: string | Date): string {
  const d = new Date(issuedAt);
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const digest = createHash("sha256").update(`verification|${requestId}`).digest();
  let suffix = "";
  for (let i = 0; i < 8; i++) suffix += ALPHABET[digest[i] % ALPHABET.length];
  return `SC-${modelVersion}-${ymd}-${suffix}`;
}
