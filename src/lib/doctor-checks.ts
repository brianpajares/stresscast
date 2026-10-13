/**
 * Comprobaciones de configuración (usadas por /admin y por `npm run doctor`). Función pura sobre un mapa
 * de variables de entorno: no accede a red ni imprime secretos (solo estado y pistas).
 */
export type CheckStatus = "ok" | "warn" | "fail";

export interface Check {
  id: string;
  label: string;
  status: CheckStatus;
  hint: string;
}

type Env = Record<string, string | undefined>;
const has = (env: Env, k: string) => !!env[k] && env[k]!.trim() !== "";

export function runChecks(env: Env): Check[] {
  const checks: Check[] = [];
  const add = (id: string, label: string, status: CheckStatus, hint: string) => checks.push({ id, label, status, hint });
  const prod = env.NODE_ENV === "production";

  const supabase = (has(env, "SUPABASE_URL") || has(env, "NEXT_PUBLIC_SUPABASE_URL")) && has(env, "SUPABASE_SERVICE_ROLE_KEY");
  const adminAuth = (has(env, "SUPABASE_ANON_KEY") || has(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY")) && supabase;
  const resend = has(env, "RESEND_API_KEY") && has(env, "RESEND_FROM_EMAIL");
  const stripeOn = env.MONETIZATION_MODE === "stripe" && env.STRIPE_ENABLED === "true";

  add(
    "supabase",
    "Supabase (leads, informes, auditoría)",
    supabase ? "ok" : "warn",
    supabase ? "Persistencia con RLS activa." : "Sin Supabase: modo demostración (informes stateless, sin leads ni /admin).",
  );
  add(
    "admin-auth",
    "Autenticación de /admin (SUPABASE_ANON_KEY)",
    adminAuth ? "ok" : supabase ? "fail" : "warn",
    adminAuth ? "Login admin disponible." : "Falta SUPABASE_ANON_KEY: no se puede iniciar sesión en /admin.",
  );
  const secretOk = has(env, "REPORT_TOKEN_SECRET") && env.REPORT_TOKEN_SECRET!.length >= 32;
  add(
    "token-secret",
    "REPORT_TOKEN_SECRET (≥ 32 caracteres)",
    secretOk ? "ok" : prod ? "fail" : "warn",
    secretOk ? "Firma de enlaces privados configurada." : "Sin secreto estable los enlaces se invalidan entre instancias/reinicios.",
  );
  add(
    "resend",
    "Resend (emails de entrega)",
    resend ? "ok" : "warn",
    resend ? "Dominio y remitente configurados (verifica SPF/DKIM/DMARC en Resend)." : "Sin RESEND_API_KEY/RESEND_FROM_EMAIL no se envían emails.",
  );
  add(
    "owner-email",
    "OWNER_EMAIL (copia operativa en validation)",
    has(env, "OWNER_EMAIL") ? "ok" : "warn",
    has(env, "OWNER_EMAIL") ? "Copia al operador activa." : "Sin OWNER_EMAIL el consentimiento promete una copia que no se envía.",
  );
  const turnstile = has(env, "TURNSTILE_SECRET_KEY") && has(env, "NEXT_PUBLIC_TURNSTILE_SITE_KEY");
  add(
    "turnstile",
    "Cloudflare Turnstile",
    turnstile ? "ok" : resend && prod ? "fail" : "warn",
    turnstile ? "Verificación anti-bots activa." : "Sin Turnstile y con email real, las solicitudes se rechazan (evita abuso del relé).",
  );
  add(
    "upstash",
    "Upstash Redis (rate limit distribuido)",
    has(env, "UPSTASH_REDIS_REST_URL") && has(env, "UPSTASH_REDIS_REST_TOKEN") ? "ok" : "warn",
    "Sin Upstash el límite de uso es por instancia (mejor esfuerzo).",
  );
  add(
    "drive",
    "Google Drive (artefactos versionados)",
    has(env, "GOOGLE_SERVICE_ACCOUNT_EMAIL") && has(env, "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY") && has(env, "GOOGLE_DRIVE_FOLDER_ID") ? "ok" : "warn",
    "Sin Drive se usa el snapshot embebido y verificado en el build (mismo checksum del manifiesto).",
  );
  add("app-url", "NEXT_PUBLIC_APP_URL", has(env, "NEXT_PUBLIC_APP_URL") ? "ok" : "warn", "Necesario para canonical, sitemap y enlaces en emails.");
  add(
    "posthog",
    "PostHog (opcional)",
    has(env, "NEXT_PUBLIC_POSTHOG_KEY") ? "ok" : "warn",
    "Sin clave solo se usan los contadores first-party agregados del embudo.",
  );
  add("sentry", "Sentry (opcional)", has(env, "NEXT_PUBLIC_SENTRY_DSN") ? "ok" : "warn", "Sin DSN no se capturan errores.");
  add(
    "cron",
    "CRON_SECRET (purga de retención)",
    has(env, "CRON_SECRET") ? "ok" : supabase ? "warn" : "ok",
    "Protege /api/cron/retention; sin él la purga diaria no puede ejecutarse.",
  );
  add(
    "monetization",
    "Modo de monetización",
    stripeOn
      ? has(env, "STRIPE_SECRET_KEY") && has(env, "STRIPE_WEBHOOK_SECRET") && supabase
        ? "ok"
        : "fail"
      : env.MONETIZATION_MODE === "stripe"
        ? "warn"
        : "ok",
    stripeOn ? "Stripe activo: requiere STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET y Supabase." : "validation (Stripe desactivado, como exige el gate de lanzamiento).",
  );
  const approved = (env.LINGUISTIC_GATE_APPROVED ?? "").toLowerCase();
  add(
    "linguistic-gate",
    "Gate lingüístico ES/PT",
    approved.includes("es") && approved.includes("pt") ? "ok" : "warn",
    "Hasta cotejar el wording con versiones validadas, ES/PT no se indexan (LINGUISTIC_GATE_APPROVED=es,pt al cerrarlo).",
  );
  add(
    "memory-store",
    "Store en memoria",
    env.STORE_DRIVER === "memory" && prod ? "fail" : "ok",
    "STORE_DRIVER=memory es solo para desarrollo/E2E: los datos no persisten.",
  );
  add(
    "e2e-mode",
    "Modo E2E (outbox de pruebas)",
    env.E2E_MODE === "true" && (prod || env.VERCEL_ENV === "production") ? "fail" : "ok",
    "E2E_MODE=true captura emails en memoria: jamás debe estar activo en producción.",
  );
  return checks;
}

export function summarizeChecks(checks: Check[]): { ok: number; warn: number; fail: number } {
  return {
    ok: checks.filter((c) => c.status === "ok").length,
    warn: checks.filter((c) => c.status === "warn").length,
    fail: checks.filter((c) => c.status === "fail").length,
  };
}
