import type { ErrorEvent, EventHint } from "@sentry/nextjs";

/**
 * Scrubbing de Sentry (FR-21 / FR-30 / AT-30): ningún evento puede llevar email, respuestas, score, banda,
 * URL de PDF, tokens de informe ni contenido del informe. Estrategia: allowlist estructural +
 * redacción de patrones en mensajes. Función pura (testeable sin Sentry).
 */
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const TOKEN = /\b(?:v1|s1)\.[A-Za-z0-9_-]{16,}(?:\.[A-Za-z0-9_-]+)?/g;
const LONG_SECRET = /\b[A-Za-z0-9_-]{40,}\b/g;
const QUERY = /\?[^\s"'#]*/g;

export function redactString(value: string): string {
  return value.replace(EMAIL, "[email]").replace(TOKEN, "[token]").replace(QUERY, "?[redacted]").replace(LONG_SECRET, "[secret]");
}

function stripQuery(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname.replace(/\/report\/[0-9a-f-]{36}/i, "/report/[id]")}`;
  } catch {
    return redactString(url);
  }
}

export function scrubEvent<T extends ErrorEvent>(event: T, _hint?: EventHint): T | null {
  void _hint;
  delete event.user;
  delete event.extra;
  delete event.contexts?.["culture"];

  if (event.request) {
    event.request = { method: event.request.method, url: stripQuery(event.request.url) };
  }
  event.breadcrumbs = [];

  if (event.message) event.message = redactString(event.message);
  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = redactString(ex.value);
    // Los frames pueden incluir variables locales: se eliminan.
    for (const fr of ex.stacktrace?.frames ?? []) {
      delete fr.vars;
    }
  }
  if (event.transaction) event.transaction = stripQuery(event.transaction) ?? event.transaction;
  if (event.tags) {
    for (const [k, v] of Object.entries(event.tags)) {
      if (typeof v === "string") event.tags[k] = redactString(v);
    }
  }
  return event;
}

export const COMMON_SENTRY_OPTIONS = {
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  // Sin replays, sin captura automática de consola/fetch/UI: reduce el riesgo de fuga de contenido.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  beforeBreadcrumb: () => null,
  beforeSend: scrubEvent,
} as const;
