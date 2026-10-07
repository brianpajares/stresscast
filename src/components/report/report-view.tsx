import { ExternalLink, ShieldCheck } from "lucide-react";
import type { ReportView } from "@/lib/report/view";
import { Badge, Card, Eyebrow, Notice } from "@/components/ui/card";
import { ScoreBar } from "@/components/results/score-bar";
import { ScenarioRows } from "./scenario-rows";
import { DriverBars } from "./driver-bars";
import { MeasuredDisclosure } from "./method-disclosure";
import { PdfDownloadButton, ReportTracker } from "./report-actions";

interface Props {
  view: ReportView;
  issuedAt: string;
  modelVersion: string;
  pdfHref: string;
  labels: { download: string; externalLink: string; openInNewTab: string };
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-24">
      <h2 id={id} className="text-2xl font-extrabold tracking-tight">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Informe completo (S14): score actual → escenarios condicionales → drivers → benchmark → plan →
 * método/supuestos → fuentes/privacidad/disclaimer → verification ID. Presentacional (sin hooks):
 * recibe el ReportView que también consume el PDF.
 */
export function ReportViewComponent({ view, issuedAt, modelVersion, pdfHref, labels }: Props) {
  return (
    <article className="mx-auto w-full max-w-(--container-content) px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <ReportTracker issuedAt={issuedAt} modelVersion={modelVersion} />

      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Eyebrow>
            StressCast · {view.modelVersionText}
          </Eyebrow>
          <h1 tabIndex={-1} className="mt-2 max-w-3xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            {view.coverTitle}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {view.generatedOn} · <span className="tabular">{view.verificationLabel}: {view.verificationId}</span>
          </p>
        </div>
        <div className="no-print">
          <PdfDownloadButton href={pdfHref} label={labels.download} />
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-12">
          {/* 1. score actual */}
          <section aria-labelledby="r-current">
            <Card>
              <h2 id="r-current" className="text-base font-semibold text-muted">
                {view.score.label}
              </h2>
              <p className="mt-2 flex items-baseline gap-3">
                <span className="text-7xl font-extrabold leading-none tracking-tighter tabular">{view.score.value}</span>
                <span className="text-lg font-medium text-muted">{view.score.outOf}</span>
              </p>
              <p className="mt-3 text-muted">{view.score.intro}</p>
              <p className="mt-2 font-medium">{view.score.bandText}</p>
              <ScoreBar
                score={view.score.raw}
                scoreText={view.score.value}
                youLabel={view.score.youLabel}
                referenceLabel={view.score.referenceLabel}
                ariaLabel={view.score.ariaLabel}
              />
              <p className="text-sm text-muted">{view.score.context}</p>
            </Card>
          </section>

          {/* 2. escenarios */}
          <Section id="r-scenarios" title={view.scenarios.title}>
            <p className="mb-1 font-medium">{view.scenarios.subtitle}</p>
            <p className="mb-4 text-sm text-muted">{view.scenarios.note}</p>
            <ScenarioRows scenarios={view.scenarios} referenceLabel={view.score.referenceLabel} />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Card className="p-4 sm:p-4">
                <p className="text-sm font-bold">{view.scenarios.range}</p>
                <p className="mt-2 text-sm font-semibold text-muted">{view.scenarios.kTitle}</p>
                <p className="text-sm">{view.scenarios.kImprove}</p>
                <p className="text-sm">{view.scenarios.kWorsen}</p>
              </Card>
              <Card className="p-4 sm:p-4">
                <p className="text-sm font-bold">{view.scenarios.sensitivityTitle}</p>
                <p className="mt-1 text-sm text-muted">{view.scenarios.sensitivityBody}</p>
              </Card>
            </div>
            <p className="mt-3 text-sm text-muted">{view.scenarios.footer}</p>
          </Section>

          {/* 3. drivers */}
          <Section id="r-drivers" title={view.drivers.title}>
            <p className="mb-4 text-sm text-muted">{view.drivers.note}</p>
            <DriverBars drivers={view.drivers} />
          </Section>

          {/* 4. benchmark */}
          <Section id="r-benchmark" title={view.benchmark.title}>
            <Card>
              <Badge tone="warning">{view.benchmark.banner}</Badge>
              <p className="mt-3 font-semibold">{view.benchmark.delta}</p>
              <p className="mt-2 text-muted">{view.benchmark.body}</p>
              <p className="mt-3 text-sm text-muted">{view.benchmark.validity}</p>
            </Card>
          </Section>

          {/* 5. plan de 7 días */}
          <Section id="r-plan" title={view.plan.title}>
            <ol className="grid gap-3 md:grid-cols-3">
              {view.plan.steps.map((s, i) => (
                <li key={s.title} className="rounded-lg border border-border bg-surface p-4">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-text" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3 className="mt-2 font-bold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {view.plan.notes.map((n) => (
                <div key={n.title} className="rounded-lg bg-surface-alt p-4">
                  <dt className="text-sm font-bold">{n.title}</dt>
                  <dd className="mt-1 text-sm text-muted">{n.body}</dd>
                </div>
              ))}
            </dl>
            <Notice className="mt-4">{view.plan.support}</Notice>
          </Section>

          {/* 6. método y supuestos */}
          <Section id="r-method" title={view.method.title}>
            <div className="space-y-3">
              <MeasuredDisclosure sectionId="method_table" summary={view.method.title} defaultOpen>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[20rem] text-left text-sm">
                    <caption className="sr-only">{view.method.title}</caption>
                    <tbody>
                      {view.method.rows.map((row) => (
                        <tr key={row.k} className="border-t border-border first:border-t-0">
                          <th scope="row" className="py-2 pr-4 font-semibold text-text">
                            {row.k}
                          </th>
                          <td className="py-2 text-muted">{row.v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h3 className="mt-4 font-bold text-text">{view.method.formulaTitle}</h3>
                <p className="mt-1 text-sm">{view.method.formula}</p>
              </MeasuredDisclosure>
              <MeasuredDisclosure sectionId="limitations" summary={view.method.limitationsTitle}>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {view.method.limitations.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </MeasuredDisclosure>
            </div>
          </Section>

          {/* 7. fuentes + privacidad */}
          <Section id="r-sources" title={view.sourcesTitle}>
            <ul className="space-y-2">
              {view.sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-1.5 text-sm font-medium text-primary underline underline-offset-4 hover:text-primary-hover"
                  >
                    <span>{s.label}</span>
                    <ExternalLink className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    <span className="sr-only">{labels.openInNewTab}</span>
                  </a>
                </li>
              ))}
            </ul>
            <Card className="mt-6">
              <h3 className="flex items-center gap-2 font-bold">
                <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
                {view.privacy.title}
              </h3>
              <p className="mt-2 text-sm text-muted">{view.privacy.body}</p>
            </Card>
            <Notice className="mt-4">{view.disclaimer}</Notice>
          </Section>
        </div>

        {/* columna lateral (8/4) */}
        <aside className="no-print lg:sticky lg:top-6 lg:self-start">
          <Card className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-muted">{view.score.label}</p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tighter tabular">{view.score.value}</span>
                <span className="text-sm text-muted">{view.score.outOf}</span>
              </p>
            </div>
            <PdfDownloadButton href={pdfHref} label={labels.download} block />
            <div className="border-t border-border pt-4 text-sm">
              <p className="font-semibold">{view.verificationLabel}</p>
              <p className="mt-1 break-all font-mono text-xs tabular">{view.verificationId}</p>
              <p className="mt-2 text-xs text-muted">{view.verificationNote}</p>
            </div>
          </Card>
        </aside>
      </div>
    </article>
  );
}
