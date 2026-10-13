import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { Badge, Card, Notice } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/layout/logo";
import { getAdminSession, maskEmail } from "@/lib/server/admin-auth";
import { runChecks, summarizeChecks } from "@/lib/doctor-checks";
import { GATES, summarizeFunnel } from "@/lib/server/funnel";
import { getModelBundle } from "@/lib/server/model";
import { getStore } from "@/lib/server/store";
import { monetizationMode } from "@/lib/server/env";
import { logoutAction, resendAction } from "./actions";

export const dynamic = "force-dynamic";

const pct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(1)}%`);
const STATUS_TONE: Record<string, "primary" | "warning" | "neutral"> = {
  delivered: "primary",
  delivery_failed: "warning",
  delivery_pending: "warning",
};

const FUNNEL_ORDER: [string, string][] = [
  ["landing_view", "Visitas a la landing"],
  ["assessment_start_click", "Inician chequeo"],
  ["preview_view", "Ven la vista previa"],
  ["report_request_click", "Click en informe"],
  ["report_request_submit", "Envían solicitud"],
  ["report_request_success", "Solicitudes aceptadas"],
  ["pdf_download", "Descargas de PDF"],
];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ days?: string; status?: string; resend?: string }> }) {
  const session = await getAdminSession();
  if (session.state === "anonymous") redirect("/admin/login");

  if (session.state === "forbidden") {
    return (
      <main id="main" className="mx-auto max-w-md px-4 py-24">
        <Card>
          <h1 className="text-xl font-extrabold">Acceso denegado (403)</h1>
          <p className="mt-2 text-muted">Tu cuenta no figura en <code>admin_users</code>.</p>
          <form action={logoutAction} className="mt-6">
            <Button type="submit" variant="secondary">Cerrar sesión</Button>
          </form>
        </Card>
      </main>
    );
  }

  const sp = await searchParams;
  const days = sp.days === "14" ? 14 : 30;
  const store = getStore();
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const [funnelRows, statusCountsRaw, leads, actions, bundle] = await Promise.all([
    store?.funnelSince(since) ?? [],
    store?.statusCounts() ?? {},
    store?.listLeads({ status: sp.status, limit: 25 }) ?? { items: [], nextCursor: null },
    store?.recentAdminActions(8) ?? [],
    getModelBundle(),
  ]);
  const statusCounts: Record<string, number> = statusCountsRaw;
  const funnel = summarizeFunnel(funnelRows);
  const checks = runChecks(process.env);
  const sum = summarizeChecks(checks);

  return (
    <main id="main" className="mx-auto w-full max-w-(--container-content) px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Panel de validación</h1>
            <p className="text-sm text-muted">
              {session.email} · modo {monetizationMode()} · modelo {bundle.engineConfig.version} · datos {bundle.meta.data_version} ({bundle.meta.cache})
            </p>
          </div>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="secondary" size="sm">Cerrar sesión</Button>
        </form>
      </header>

      {sp.resend ? (
        <Notice className="mt-6" role="status">
          {sp.resend === "ok" ? "Reenvío registrado y encolado." : `No se pudo reenviar: ${sp.resend}`}
        </Notice>
      ) : null}

      {!store ? (
        <Notice className="mt-6">
          Sin base de datos configurada: el embudo, los leads y la auditoría no están disponibles (modo demostración).
        </Notice>
      ) : null}

      {/* Embudo */}
      <section className="mt-8" aria-labelledby="funnel">
        <div className="flex items-center justify-between">
          <h2 id="funnel" className="text-xl font-extrabold">Embudo (últimos {days} días)</h2>
          <nav aria-label="Ventana temporal" className="flex gap-2 text-sm">
            <a className="rounded-md border border-border px-3 py-1.5 font-semibold" href="/admin?days=14">14 d</a>
            <a className="rounded-md border border-border px-3 py-1.5 font-semibold" href="/admin?days=30">30 d</a>
          </nav>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FUNNEL_ORDER.slice(0, 4).map(([k, label]) => (
            <Card key={k} className="p-4 sm:p-4">
              <p className="text-sm text-muted">{label}</p>
              <p className="mt-1 text-3xl font-extrabold tabular">{funnel.totals[k] ?? 0}</p>
            </Card>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4 sm:p-4">
            <p className="text-sm text-muted">visita → inicio (objetivo ≥ {pct(GATES.targets.visitToStart)})</p>
            <p className="mt-1 text-2xl font-extrabold tabular">{pct(funnel.rates.visitToStart)}</p>
          </Card>
          <Card className="p-4 sm:p-4">
            <p className="text-sm text-muted">inicio → preview (objetivo ≥ {pct(GATES.targets.startToPreview)})</p>
            <p className="mt-1 text-2xl font-extrabold tabular">{pct(funnel.rates.startToPreview)}</p>
          </Card>
          <Card className="p-4 sm:p-4">
            <p className="text-sm text-muted">preview → solicitud (north star, objetivo ≥ {pct(GATES.payment.previewToRequest)})</p>
            <p className="mt-1 text-2xl font-extrabold tabular">{pct(funnel.rates.previewToRequest)}</p>
          </Card>
          <Card className="p-4 sm:p-4">
            <p className="text-sm text-muted">tasa de error de cálculo (alerta &gt; {pct(GATES.calcErrorAlert)})</p>
            <p className="mt-1 text-2xl font-extrabold tabular">{pct(funnel.rates.calculationErrorRate)}</p>
          </Card>
        </div>
        <Card className="mt-3 p-4 sm:p-4">
          <p className="font-bold">Gate de cobro (spec/monetizacion.json)</p>
          <p className="mt-1 text-sm text-muted">
            ≥ {GATES.payment.previews} previews ({funnel.gates.previews}), ≥ {GATES.payment.requests} solicitudes ({funnel.gates.requests}) y preview→solicitud ≥ {pct(GATES.payment.previewToRequest)} en ≤ {GATES.payment.windowDays} días, sin incidentes críticos.
          </p>
          <p className="mt-2 flex flex-wrap gap-2">
            <Badge tone={funnel.gates.paymentReady ? "primary" : "neutral"}>
              Cobro: {funnel.gates.paymentReady ? "gate cumplido" : "aún no"}
            </Badge>
            <Badge tone={funnel.gates.day14Continue ? "primary" : "neutral"}>
              Checkpoint día 14 (≥ {GATES.day14.requests} solicitudes y ≥ {pct(GATES.day14.previewToRequest)}): {funnel.gates.day14Continue ? "continuar" : "pendiente"}
            </Badge>
          </p>
        </Card>
        {funnel.byMarket.length ? (
          <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <caption className="px-4 py-2 text-left text-xs text-muted">Mercado agregado (sin datos individuales)</caption>
              <thead className="bg-surface-alt"><tr><th scope="col" className="px-4 py-2">Mercado</th><th scope="col" className="px-4 py-2 text-right">Previews</th><th scope="col" className="px-4 py-2 text-right">Solicitudes</th></tr></thead>
              <tbody>
                {funnel.byMarket.map((m) => (
                  <tr key={m.market} className="border-t border-border"><th scope="row" className="px-4 py-2">{m.market}</th><td className="px-4 py-2 text-right tabular">{m.previews}</td><td className="px-4 py-2 text-right tabular">{m.requests}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {/* Estados */}
      <section className="mt-10" aria-labelledby="states">
        <h2 id="states" className="text-xl font-extrabold">Estado de entregas</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {Object.entries(statusCounts).map(([k, v]) => (
            <li key={k}><a href={`/admin?status=${k}`} className="inline-flex"><Badge tone={STATUS_TONE[k] ?? "neutral"} className="px-3 py-1.5 text-sm">{k}: {v}</Badge></a></li>
          ))}
          {!Object.keys(statusCounts).length ? <li className="text-sm text-muted">Sin solicitudes todavía.</li> : null}
        </ul>
      </section>

      {/* Leads */}
      <section className="mt-10" aria-labelledby="leads">
        <h2 id="leads" className="text-xl font-extrabold">Leads {sp.status ? `· ${sp.status}` : ""}</h2>
        <p className="mt-1 text-sm text-muted">Emails enmascarados; no se muestran respuestas, scores ni PDFs individuales.</p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-surface-alt"><tr>
              <th scope="col" className="px-4 py-2">Email</th><th scope="col" className="px-4 py-2">Estado</th><th scope="col" className="px-4 py-2">Entrega</th>
              <th scope="col" className="px-4 py-2">Idioma/País</th><th scope="col" className="px-4 py-2">Creado (UTC)</th><th scope="col" className="px-4 py-2"><span className="sr-only">Acciones</span></th>
            </tr></thead>
            <tbody>
              {leads.items.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <th scope="row" className="px-4 py-2 font-medium">{maskEmail(l.email)}</th>
                  <td className="px-4 py-2"><Badge tone={STATUS_TONE[l.status] ?? "neutral"}>{l.status}</Badge></td>
                  <td className="px-4 py-2">{l.last_delivery_status ?? "—"}</td>
                  <td className="px-4 py-2">{l.locale}/{l.country}</td>
                  <td className="px-4 py-2 tabular">{l.created_at.replace("T", " ").slice(0, 16)}</td>
                  <td className="px-4 py-2 text-right">
                    {l.request_id ? (
                      <form action={resendAction}>
                        <input type="hidden" name="leadId" value={l.id} />
                        <input type="hidden" name="idempotencyKey" value={`resend-${randomUUID()}`} />
                        <Button type="submit" size="sm" variant="secondary">Reenviar</Button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!leads.items.length ? <tr><td colSpan={6} className="px-4 py-6 text-center text-muted">Sin leads.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sistema */}
      <section className="mt-10" aria-labelledby="system">
        <h2 id="system" className="text-xl font-extrabold">Sistema <span className="text-sm font-medium text-muted">({sum.ok} ok · {sum.warn} avisos · {sum.fail} fallos)</span></h2>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {checks.map((c) => (
            <li key={c.id} className="rounded-lg border border-border bg-surface p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <span aria-hidden="true">{c.status === "ok" ? "✅" : c.status === "warn" ? "⚠️" : "⛔"}</span>
                {c.label}
                <span className="sr-only"> — {c.status}</span>
              </p>
              <p className="mt-0.5 text-muted">{c.hint}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 pb-10" aria-labelledby="audit">
        <h2 id="audit" className="text-xl font-extrabold">Auditoría reciente</h2>
        <ul className="mt-3 space-y-1 text-sm text-muted">
          {actions.map((a, i) => (
            <li key={i}>{a.created_at.replace("T", " ").slice(0, 16)} · {a.action} · {a.target_type}:{a.target_id.slice(0, 8)}…</li>
          ))}
          {!actions.length ? <li>Sin acciones registradas.</li> : null}
        </ul>
      </section>
    </main>
  );
}
