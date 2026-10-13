import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { features, getEnv, reportTokenSecret, supabaseAnonKey, supabaseUrl } from "./env";
import { supabaseServiceClient } from "./store/supabase";
import { getStore } from "./store";

/**
 * Autorización de /admin (FR-15 / FR-29): sesión de Supabase Auth + pertenencia a `admin_users`.
 *  - anonymous: sin sesión válida → 401.   - forbidden: sesión válida pero no admin → 403.   - admin: ok.
 * La pertenencia se comprueba en SERVIDOR con service role (nunca confiando en claims del cliente).
 *
 * Solo para desarrollo/E2E con el store en memoria existe un login por contraseña local
 * (ADMIN_DEV_PASSWORD). Está deshabilitado en cuanto hay Supabase y en producción real.
 */
export type AdminSession =
  | { state: "anonymous" }
  | { state: "forbidden"; email: string | null }
  | { state: "admin"; userId: string; email: string | null };

export const DEV_COOKIE = "sc_admin_dev";
const DEV_USER_ID = "00000000-0000-0000-0000-00000000dev0";

export function devLoginEnabled(): boolean {
  const store = getStore();
  return !!process.env.ADMIN_DEV_PASSWORD && store?.kind === "memory";
}

function devToken(): string {
  return createHmac("sha256", reportTokenSecret()).update("admin-dev|v1").digest("base64url");
}

export function devPasswordMatches(candidate: string): boolean {
  const expected = Buffer.from(process.env.ADMIN_DEV_PASSWORD ?? "");
  const given = Buffer.from(candidate);
  return devLoginEnabled() && expected.length === given.length && timingSafeEqual(expected, given);
}

export function devSessionValue(): string {
  return devToken();
}

export async function supabaseSessionClient() {
  const url = supabaseUrl();
  const anon = supabaseAnonKey();
  if (!url || !anon) throw new Error("supabase_auth_not_configured");
  const jar = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) jar.set(name, value, options);
        } catch {
          /* en Server Components no se pueden fijar cookies; el refresco ocurre en Server Actions/Route Handlers */
        }
      },
    },
  });
}

export async function getAdminSession(): Promise<AdminSession> {
  if (devLoginEnabled()) {
    const jar = await cookies();
    const v = jar.get(DEV_COOKIE)?.value;
    if (v && v.length === devToken().length && timingSafeEqual(Buffer.from(v), Buffer.from(devToken()))) {
      return { state: "admin", userId: DEV_USER_ID, email: "admin@example.test" };
    }
    return { state: "anonymous" };
  }

  if (!features().supabase || !getEnv().SUPABASE_SERVICE_ROLE_KEY || !supabaseAnonKey()) return { state: "anonymous" };
  try {
    const supabase = await supabaseSessionClient();
    const { data, error } = await supabase.auth.getUser(); // valida el JWT contra Supabase Auth
    if (error || !data.user) return { state: "anonymous" };
    const { data: row } = await supabaseServiceClient().from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
    return row ? { state: "admin", userId: data.user.id, email: data.user.email ?? null } : { state: "forbidden", email: data.user.email ?? null };
  } catch {
    return { state: "anonymous" };
  }
}

/** "ana.perez@gmail.com" → "a***@gmail.com": identifica sin exponer el email completo en pantalla. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  return `${user.slice(0, 1)}***@${domain}`;
}
