"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { DEV_COOKIE, devLoginEnabled, devPasswordMatches, devSessionValue, getAdminSession, supabaseSessionClient } from "@/lib/server/admin-auth";
import { resendReport } from "@/lib/server/admin-actions";
import { rateLimit } from "@/lib/server/ratelimit";

async function limited(scope: string, max: number): Promise<boolean> {
  const req = new Request("http://internal.local/", { headers: await headers() });
  return (await rateLimit(req, scope, max)).ok;
}

export async function loginAction(formData: FormData): Promise<void> {
  if (!(await limited("admin-login", 8))) redirect("/admin/login?error=rate");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (devLoginEnabled()) {
    if (!devPasswordMatches(password)) redirect("/admin/login?error=1");
    (await cookies()).set(DEV_COOKIE, devSessionValue(), { httpOnly: true, sameSite: "strict", path: "/admin", maxAge: 8 * 3600, secure: process.env.NODE_ENV === "production" });
    redirect("/admin");
  }

  try {
    const supabase = await supabaseSessionClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) redirect("/admin/login?error=1");
  } catch (e) {
    // `redirect` lanza una excepción especial que debe propagarse.
    if (e && typeof e === "object" && "digest" in e) throw e;
    redirect("/admin/login?error=1");
  }
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete({ name: DEV_COOKIE, path: "/admin" });
  if (!devLoginEnabled()) {
    try {
      const supabase = await supabaseSessionClient();
      await supabase.auth.signOut();
    } catch {
      /* sin sesión */
    }
  }
  redirect("/admin/login");
}

export async function resendAction(formData: FormData): Promise<void> {
  const session = await getAdminSession();
  if (session.state !== "admin") redirect("/admin/login");
  const leadId = String(formData.get("leadId") ?? "");
  // La clave la genera el servidor al renderizar el formulario: un doble clic reutiliza la misma ⇒ sin entrega duplicada.
  const key = String(formData.get("idempotencyKey") ?? randomUUID());
  const result = await resendReport({ leadId, adminUserId: session.userId, idempotencyKey: key.length >= 16 ? key : `k-${key}-${randomUUID()}` });
  redirect(`/admin?resend=${result.ok ? "ok" : result.code}`);
}
