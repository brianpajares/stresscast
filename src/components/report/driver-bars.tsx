import type { CSSProperties } from "react";
import { Lightbulb } from "lucide-react";
import type { ReportView } from "@/lib/report/view";

/** DriverCard ×3 (ux/components.md): barras horizontales de burden 0–100 + nombre legible + experimento no causal. */
export function DriverBars({ drivers }: { drivers: ReportView["drivers"] }) {
  return (
    <ol className="space-y-3">
      {drivers.items.map((d) => (
        <li key={d.key} className="rounded-lg border border-border bg-surface p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary"
              aria-hidden="true"
            >
              {d.rank}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold leading-snug">{d.name}</h3>
              <p className="mt-0.5 text-sm font-semibold text-muted tabular">{d.burdenText}</p>
              <div
                className="mt-2 h-3 rounded-full bg-surface-alt ring-1 ring-inset ring-border"
                role="img"
                aria-label={`${d.name}: ${d.burdenText}`}
              >
                <div
                  className="sc-bar-fill h-full rounded-full bg-chart-current"
                  style={{ "--score": d.burden } as CSSProperties}
                />
              </div>
              {d.reverse ? <p className="mt-2 text-xs font-medium text-muted">{drivers.reverseNote}</p> : null}
              <div className="mt-3 flex gap-2.5 rounded-md bg-surface-alt p-3 text-sm">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <p>
                  <span className="font-bold">{drivers.suggestionLabel}: </span>
                  {d.suggestion}
                </p>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
