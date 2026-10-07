import "server-only";

/**
 * Logs operativos estructurados SIN datos sensibles (CLAUDE.md · Privacidad: nunca logs de payloads completos).
 * Solo se aceptan primitivos cortos; cualquier campo con nombre sensible se descarta.
 */
const FORBIDDEN = /email|answer|score|band|inputs?|result|payload|body|token|secret|key|password|pdf|report_contents|free_text/i;

export function logOps(event: string, fields: Record<string, string | number | boolean | null | undefined> = {}): void {
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || FORBIDDEN.test(k)) continue;
    safe[k] = typeof v === "string" ? v.slice(0, 120) : v;
  }
  // Una línea JSON por evento: la plataforma (Vercel) la indexa; no incluye PII.
  console.log(JSON.stringify({ level: "info", event, ...safe, ts: new Date().toISOString() }));
}

export function logWarn(event: string, fields: Record<string, string | number | boolean | null | undefined> = {}): void {
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || FORBIDDEN.test(k)) continue;
    safe[k] = typeof v === "string" ? v.slice(0, 120) : v;
  }
  console.warn(JSON.stringify({ level: "warn", event, ...safe, ts: new Date().toISOString() }));
}
