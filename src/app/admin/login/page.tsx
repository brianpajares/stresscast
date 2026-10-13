import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/layout/logo";
import { devLoginEnabled, getAdminSession } from "@/lib/server/admin-auth";
import { loginAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getAdminSession();
  if (session.state === "admin") redirect("/admin");
  const { error } = await searchParams;
  const dev = devLoginEnabled();

  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full">
        <div className="flex items-center gap-3">
          <LogoMark />
          <h1 className="text-xl font-extrabold tracking-tight">StressCast · Admin</h1>
        </div>
        <form action={loginAction} className="mt-6 space-y-4">
          {!dev ? (
            <div>
              <label htmlFor="email" className="block text-sm font-bold">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                className="mt-2 block min-h-12 w-full rounded-md border border-border bg-surface px-4"
              />
            </div>
          ) : (
            <p className="rounded-md bg-surface-alt p-3 text-sm text-muted">Modo desarrollo (store en memoria): contraseña local.</p>
          )}
          <div>
            <label htmlFor="password" className="block text-sm font-bold">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-2 block min-h-12 w-full rounded-md border border-border bg-surface px-4"
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm font-semibold text-danger">
              {error === "rate" ? "Demasiados intentos. Espera un minuto." : "Credenciales no válidas."}
            </p>
          ) : null}
          <Button type="submit" block>
            Entrar
          </Button>
        </form>
      </Card>
    </main>
  );
}
