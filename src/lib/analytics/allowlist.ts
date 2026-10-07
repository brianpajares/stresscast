/**
 * Allowlist de analítica (FR-20 / FR-21) derivada de spec/analytics_events.json.
 * Se usa en CLIENTE (antes de enviar) y en SERVIDOR (antes de contar): defensa en profundidad.
 * Prohibido por contrato: email, respuestas, score, banda, item scores, PDF, contenido de informe, texto libre.
 */
import spec from "@spec/analytics_events.json";

interface SpecEvent {
  name: string;
  properties: string[];
  enabled_when?: string;
}

const events = spec.events as SpecEvent[];

export const FORBIDDEN_PROPERTIES: ReadonlySet<string> = new Set(spec.forbidden_properties);

/** Propiedades comunes (spec.common_properties). `market` es solo first-party. */
export const COMMON_PROPERTIES = [
  "session_id",
  "language",
  "market",
  "app_version",
  "model_version",
  "viewport_bucket",
  "consent_analytics",
] as const;

export type EventName = (typeof spec.events)[number]["name"];

export const EVENT_NAMES: readonly string[] = events.map((e) => e.name);

const bySpec = new Map(events.map((e) => [e.name, e]));

export type PropValue = string | number | boolean | null;
export type EventProps = Record<string, PropValue>;

export interface SanitizedEvent {
  name: string;
  props: EventProps;
}

const SAFE_STRING = /^[A-Za-z0-9_.:+<>=|/ -]{1,64}$/;

export interface SanitizeOptions {
  /** Habilita eventos con `enabled_when: payment_enabled=true`. */
  paymentEnabled?: boolean;
  /** Permite la propiedad `market` (solo canal first-party). */
  allowMarket?: boolean;
}

/**
 * Devuelve el evento limpio o `null` si el nombre no está permitido.
 * Las propiedades no permitidas, prohibidas o con valores no seguros se descartan en silencio.
 */
export function sanitizeEvent(name: unknown, props: unknown, options: SanitizeOptions = {}): SanitizedEvent | null {
  if (typeof name !== "string") return null;
  const def = bySpec.get(name);
  if (!def) return null;
  if (def.enabled_when === "payment_enabled=true" && !options.paymentEnabled) return null;

  const allowed = new Set<string>([...def.properties, ...COMMON_PROPERTIES]);
  if (!options.allowMarket) allowed.delete("market");

  const out: EventProps = {};
  if (typeof props === "object" && props !== null && !Array.isArray(props)) {
    for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
      if (FORBIDDEN_PROPERTIES.has(key) || !allowed.has(key)) continue;
      if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
      else if (typeof value === "boolean" || value === null) out[key] = value;
      else if (typeof value === "string" && SAFE_STRING.test(value) && !value.includes("@")) out[key] = value;
    }
  }
  return { name, props: out };
}
