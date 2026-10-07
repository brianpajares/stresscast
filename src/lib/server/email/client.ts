import "server-only";
import { Resend } from "resend";
import { features, getEnv } from "../env";
import { logWarn } from "../log";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: Buffer }[];
  replyTo?: string;
  /** Idempotency-Key de Resend: un reintento NUNCA duplica el email de entrega (NFR-12). */
  idempotencyKey: string;
  headers?: Record<string, string>;
}

export type SendOutcome =
  | { status: "sent"; id: string | null }
  | { status: "skipped"; code: "email_unconfigured" }
  | { status: "failed"; code: string };

let resend: Resend | null = null;

/** Hook de test/E2E: transporte alternativo (no usado en producción). */
export type EmailTransport = (msg: EmailMessage) => Promise<SendOutcome>;
let transportOverride: EmailTransport | null = null;
export function __setEmailTransport(t: EmailTransport | null): void {
  transportOverride = t;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Envía con Resend con reintentos acotados (2 intentos) ante 5xx/red. Un 4xx de validación no se reintenta.
 * Nunca loguea destinatarios, asuntos ni cuerpos: solo el código de error.
 */
export async function sendEmail(msg: EmailMessage): Promise<SendOutcome> {
  if (transportOverride) return transportOverride(msg);
  if (!features().resend) return { status: "skipped", code: "email_unconfigured" };

  const env = getEnv();
  resend ??= new Resend(env.RESEND_API_KEY);
  let lastCode = "unknown";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { data, error } = await resend.emails.send(
        {
          from: env.RESEND_FROM_EMAIL as string,
          to: msg.to,
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
          replyTo: msg.replyTo,
          headers: msg.headers,
          attachments: msg.attachments,
        },
        { idempotencyKey: msg.idempotencyKey },
      );
      if (!error) return { status: "sent", id: data?.id ?? null };
      lastCode = String((error as { name?: string; statusCode?: number }).name ?? "provider_error").slice(0, 60);
      const status = (error as { statusCode?: number }).statusCode ?? 0;
      if (status >= 400 && status < 500 && status !== 429) break; // no reintentable
    } catch (e) {
      lastCode = e instanceof Error ? e.name.slice(0, 60) : "network_error";
    }
    if (attempt < 2) await sleep(400);
  }
  logWarn("email_send_failed", { code: lastCode });
  return { status: "failed", code: lastCode };
}
