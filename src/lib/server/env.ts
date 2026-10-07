import "server-only";
import { z } from "zod";

/**
 * Variables de entorno del servidor (.env.example). Todo es opcional a propósito: la app degrada con
 * gracia (modo demostración) y `features()` / `/admin` / `npm run doctor` reportan qué falta.
 * Los secretos NUNCA se importan desde Client Components (este módulo es `server-only`).
 */
const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const schema = z.object({
  NODE_ENV: z.string().optional(),
  NEXT_PUBLIC_APP_URL: optional,
  MONETIZATION_MODE: z
    .enum(["validation", "stripe"])
    .catch("validation")
    .default("validation"),
  STRIPE_ENABLED: optional,
  REPORT_TOKEN_SECRET: optional,
  GOOGLE_DRIVE_CACHE_TTL_HOURS: optional,
  RATE_LIMIT_REQUESTS_PER_MINUTE: optional,
  REPORT_LINK_TTL_DAYS: optional,
  RETENTION_DAYS: optional,
  CRON_SECRET: optional,

  SUPABASE_URL: optional,
  NEXT_PUBLIC_SUPABASE_URL: optional,
  SUPABASE_ANON_KEY: optional,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optional,
  SUPABASE_SERVICE_ROLE_KEY: optional,

  GOOGLE_SERVICE_ACCOUNT_EMAIL: optional,
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: optional,
  GOOGLE_DRIVE_FOLDER_ID: optional,

  RESEND_API_KEY: optional,
  RESEND_FROM_EMAIL: optional,
  OWNER_EMAIL: optional,

  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optional,
  TURNSTILE_SECRET_KEY: optional,

  UPSTASH_REDIS_REST_URL: optional,
  UPSTASH_REDIS_REST_TOKEN: optional,

  STRIPE_SECRET_KEY: optional,
  STRIPE_WEBHOOK_SECRET: optional,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optional,
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}

/** Solo para tests: fuerza relectura de process.env. */
export function resetEnvCache(): void {
  cached = null;
  ephemeralSecret = null;
}

export interface Features {
  supabase: boolean;
  drive: boolean;
  resend: boolean;
  ownerEmail: boolean;
  turnstile: boolean;
  upstash: boolean;
  stripe: boolean;
  reportTokenSecret: boolean;
  /** Entrega real de informes (persistencia + email). Si es false => modo demostración. */
  fullDelivery: boolean;
}

export function features(): Features {
  const e = getEnv();
  const supabase = !!(supabaseUrl() && e.SUPABASE_SERVICE_ROLE_KEY);
  const resend = !!(e.RESEND_API_KEY && e.RESEND_FROM_EMAIL);
  return {
    supabase,
    drive: !!(e.GOOGLE_SERVICE_ACCOUNT_EMAIL && e.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY && e.GOOGLE_DRIVE_FOLDER_ID),
    resend,
    ownerEmail: !!e.OWNER_EMAIL,
    turnstile: !!e.TURNSTILE_SECRET_KEY,
    upstash: !!(e.UPSTASH_REDIS_REST_URL && e.UPSTASH_REDIS_REST_TOKEN),
    stripe: stripeActive(),
    reportTokenSecret: !!e.REPORT_TOKEN_SECRET && e.REPORT_TOKEN_SECRET.length >= 32,
    fullDelivery: supabase && resend,
  };
}

export function supabaseUrl(): string | undefined {
  const e = getEnv();
  return e.SUPABASE_URL ?? e.NEXT_PUBLIC_SUPABASE_URL;
}

export function supabaseAnonKey(): string | undefined {
  const e = getEnv();
  return e.SUPABASE_ANON_KEY ?? e.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

/** FR-24: Stripe solo con MONETIZATION_MODE=stripe Y STRIPE_ENABLED=true (y claves presentes). */
export function stripeActive(): boolean {
  const e = getEnv();
  return e.MONETIZATION_MODE === "stripe" && e.STRIPE_ENABLED === "true" && !!e.STRIPE_SECRET_KEY && !!e.STRIPE_WEBHOOK_SECRET;
}

export function monetizationMode(): "validation" | "stripe" {
  return stripeActive() ? "stripe" : "validation";
}

export function rateLimitPerMinute(): number {
  const n = Number(getEnv().RATE_LIMIT_REQUESTS_PER_MINUTE);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
}

export function reportLinkTtlDays(): number {
  const n = Number(getEnv().REPORT_LINK_TTL_DAYS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
}

export function retentionDays(): number {
  const n = Number(getEnv().RETENTION_DAYS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
}

export function driveCacheTtlMs(): number {
  const h = Number(getEnv().GOOGLE_DRIVE_CACHE_TTL_HOURS);
  return (Number.isFinite(h) && h > 0 ? h : 24) * 3_600_000;
}

let ephemeralSecret: string | null = null;

/**
 * Secreto de firma de tokens. En producción debe venir de REPORT_TOKEN_SECRET (≥ 32 caracteres).
 * En desarrollo, si falta, se genera uno efímero por proceso (los enlaces dejan de ser válidos al reiniciar).
 */
export function reportTokenSecret(): string {
  const configured = getEnv().REPORT_TOKEN_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === "production" && features().supabase) {
    throw new Error("REPORT_TOKEN_SECRET (>= 32 caracteres) es obligatorio cuando la persistencia está activa.");
  }
  if (!ephemeralSecret) {
    ephemeralSecret = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
  }
  return ephemeralSecret;
}
