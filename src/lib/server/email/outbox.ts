import "server-only";

/**
 * Outbox en memoria SOLO para E2E (E2E_MODE=true + ALLOW_MEMORY_STORE=true). Permite a Playwright verificar
 * los emails de entrega sin proveedor real. Nunca se activa en producción (doctor lo marca como fallo).
 */
export interface OutboxItem {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments: { filename: string; bytes: number; magic: string }[];
}

const g = globalThis as unknown as { __scOutbox?: OutboxItem[] };

export function e2eOutboxEnabled(): boolean {
  return process.env.E2E_MODE === "true" && process.env.ALLOW_MEMORY_STORE === "true";
}

export function outbox(): OutboxItem[] {
  g.__scOutbox ??= [];
  return g.__scOutbox;
}
