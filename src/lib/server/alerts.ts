import "server-only";
import * as Sentry from "@sentry/nextjs";
import { logWarn } from "./log";

const CRITICAL = new Set(["unexpected_model_version", "drive_integrity_rejected", "calculation_error_spike"]);

/**
 * Alertas operativas (spec/analytics_events.json · alerts): `unexpected_model_version` y checksum
 * rechazado son CRÍTICAS. Solo viaja un código y campos cortos no sensibles — nunca payloads.
 */
export function alertOps(code: string, fields: Record<string, string> = {}): void {
  logWarn(`alert_${code}`, fields);
  try {
    Sentry.captureMessage(`alert:${code}`, {
      level: CRITICAL.has(code) ? "fatal" : "warning",
      tags: { alert: code, ...fields },
    });
  } catch {
    /* Sentry no inicializado: el log estructurado basta */
  }
}
