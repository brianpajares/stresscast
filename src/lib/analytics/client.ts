"use client";

/**
 * Analítica de cliente privacy-safe.
 *  - Contadores first-party agregados (/api/events): sin identificadores, siempre activos.
 *  - PostHog: SOLO tras consentimiento explícito, sin cookies (persistence: memory), sin autocapture,
 *    y con `before_send` que re-aplica la allowlist.
 * Nunca se envían email, respuestas, score, banda ni contenido de informe.
 */
import { sanitizeEvent, type EventProps } from "./allowlist";

export const CONSENT_KEY = "sc-analytics-consent";
export const CONSENT_EVENT = "sc-analytics-consent-changed";
export const OPEN_PREFS_EVENT = "sc-analytics-open-prefs";

type Consent = "granted" | "denied" | null;

let modelVersion: string | null = null;
let posthogReady: Promise<{ capture: (name: string, props: EventProps) => void } | null> | null = null;

export function setModelVersion(version: string | null): void {
  modelVersion = version;
}

export function readConsent(): Consent {
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function writeConsent(value: "granted" | "denied"): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* sin storage: la preferencia no persiste, el flujo sigue funcionando */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
  if (value === "granted") void ensurePosthog();
}

function sessionId(): string {
  try {
    let id = window.sessionStorage.getItem("sc-sid");
    if (!id) {
      id = crypto.randomUUID();
      window.sessionStorage.setItem("sc-sid", id);
    }
    return id;
  } catch {
    return "ephemeral";
  }
}

function viewportBucket(): string {
  const w = window.innerWidth;
  return w >= 1280 ? "1280+" : w >= 768 ? "768" : "360";
}

function languageTag(): string {
  const lang = document.documentElement.lang.toLowerCase();
  return lang.startsWith("pt") ? "pt-br" : lang.startsWith("es") ? "es" : "en";
}

/** Buckets de tiempo transcurrido (no revelan valores individuales de respuesta). */
export function elapsedBucket(ms: number): string {
  if (ms < 30_000) return "<30s";
  if (ms < 60_000) return "30-60s";
  if (ms < 90_000) return "60-90s";
  if (ms < 120_000) return "90-120s";
  return ">120s";
}

export function latencyBucket(ms: number): string {
  if (ms < 50) return "<50ms";
  if (ms < 100) return "50-100ms";
  if (ms < 250) return "100-250ms";
  return ">250ms";
}

const START_KEY = "sc-started-at";

export function markAssessmentStart(): void {
  try {
    window.sessionStorage.setItem(START_KEY, String(Date.now()));
  } catch {
    /* noop */
  }
}

export function elapsedSinceStart(): string | undefined {
  try {
    const raw = window.sessionStorage.getItem(START_KEY);
    return raw ? elapsedBucket(Date.now() - Number(raw)) : undefined;
  } catch {
    return undefined;
  }
}

async function ensurePosthog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!posthogReady) {
    posthogReady = import("posthog-js").then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        person_profiles: "identified_only",
        persistence: "memory",
        ip: false,
        advanced_disable_flags: true,
        before_send: (event) => {
          if (!event) return null;
          const clean = sanitizeEvent(event.event, event.properties);
          return clean ? { ...event, properties: clean.props } : null;
        },
      });
      return {
        capture: (name: string, props: EventProps) => {
          posthog.capture(name, props);
        },
      };
    });
  }
  return posthogReady;
}

/** Inicializa PostHog si ya hay consentimiento previo (se llama al montar la app). */
export function initAnalytics(): void {
  if (readConsent() === "granted") void ensurePosthog();
}

export function track(name: string, props: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  const paymentEnabled = process.env.NEXT_PUBLIC_PAYMENT_ENABLED === "true";
  const consent = readConsent();
  const common = {
    session_id: sessionId(),
    language: languageTag(),
    app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0",
    model_version: modelVersion,
    viewport_bucket: viewportBucket(),
    consent_analytics: consent === "granted",
  };

  // 1) First-party agregado (incluye `market` solo aquí, según analytics_events.json).
  const market = (() => {
    try {
      return window.sessionStorage.getItem("sc-market") ?? undefined;
    } catch {
      return undefined;
    }
  })();
  const first = sanitizeEvent(name, { ...props, ...common, market }, { paymentEnabled, allowMarket: true });
  if (first) {
    const body = JSON.stringify(first);
    try {
      if (!navigator.sendBeacon?.("/api/events", new Blob([body], { type: "application/json" }))) {
        void fetch("/api/events", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
      }
    } catch {
      /* la analítica nunca rompe el flujo */
    }
  }

  // 2) PostHog solo con consentimiento y SIN `market`.
  if (consent === "granted") {
    const third = sanitizeEvent(name, { ...props, ...common }, { paymentEnabled, allowMarket: false });
    if (third) void ensurePosthog().then((ph) => ph?.capture(third.name, third.props));
  }
}

/** Guarda el mercado (país elegido) solo en sessionStorage para el canal first-party. */
export function rememberMarket(country: string): void {
  try {
    window.sessionStorage.setItem("sc-market", country);
  } catch {
    /* noop */
  }
}
