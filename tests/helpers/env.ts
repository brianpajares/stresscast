import { vi } from "vitest";
import { resetEnvCache } from "@/lib/server/env";

/** Entorno de prueba determinista: store en memoria, sin Supabase/Resend/Turnstile reales. */
export function useTestEnv(extra: Record<string, string | undefined> = {}) {
  const base: Record<string, string | undefined> = {
    NODE_ENV: "test",
    STORE_DRIVER: "memory",
    REPORT_TOKEN_SECRET: "test-secret-test-secret-test-secret-0123456789",
    NEXT_PUBLIC_APP_URL: "https://stresscast.test",
    MONETIZATION_MODE: "validation",
    STRIPE_ENABLED: "false",
    OWNER_EMAIL: "owner@example.test",
    RESEND_API_KEY: undefined,
    RESEND_FROM_EMAIL: undefined,
    TURNSTILE_SECRET_KEY: undefined,
    SUPABASE_URL: undefined,
    SUPABASE_SERVICE_ROLE_KEY: undefined,
    UPSTASH_REDIS_REST_URL: undefined,
    UPSTASH_REDIS_REST_TOKEN: undefined,
    ...extra,
  };
  for (const [k, v] of Object.entries(base)) {
    if (v === undefined) vi.stubEnv(k, "");
    else vi.stubEnv(k, v);
  }
  resetEnvCache();
}

export async function flushAfter(): Promise<void> {
  const q = globalThis.__afterQueue.splice(0);
  await Promise.allSettled(q);
}

export const VALID_INPUTS = {
  country: "ES",
  emotionally_exhausting: "high",
  burned_out_due_work: "somewhat",
  work_frustrates: "somewhat",
  worn_out_end_day: "always",
  exhausted_morning: "often",
  every_working_hour_tiring: "sometimes",
  energy_family_friends: "seldom",
} as const;
