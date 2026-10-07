import { Badge } from "@/components/ui/card";
import type { ReportView } from "@/lib/report/view";
import { cn } from "@/lib/utils";

const TONE: Record<"improve" | "noChange" | "worsen", { bar: string; text: string }> = {
  improve: { bar: "bg-chart-improve", text: "text-chart-improve" },
  noChange: { bar: "bg-chart-current", text: "text-chart-current" },
  worsen: { bar: "bg-chart-worsen", text: "text-chart-worsen" },
};

/**
 * ScenarioCard ×3 (ux/components.md): tres filas “what-if” con barras horizontales 0–100.
 * Sin línea temporal ni banda de confianza; cada fila lleva etiqueta + valor + badge “What-if · no predicción”.
 */
export function ScenarioRows({ scenarios, referenceLabel }: { scenarios: ReportView["scenarios"]; referenceLabel: string }) {
  return (
    <ul className="space-y-3" aria-label={scenarios.title}>
      {scenarios.items.map((item) => (
        <li key={item.key} className="rounded-lg border border-border bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold">{item.label}</h3>
            <Badge>{scenarios.badge}</Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={cn("text-4xl font-extrabold tracking-tight tabular", TONE[item.key].text)}>{item.value}</span>
            <span className="text-sm text-muted">/ 100</span>
          </div>
          <div
            className="relative mt-3 h-3 rounded-full bg-surface-alt ring-1 ring-inset ring-border"
            role="img"
            aria-label={`${item.label}: ${item.value} / 100`}
          >
            <div className={cn("sc-bar-fill h-full rounded-full", TONE[item.key].bar)} style={{ "--score": item.raw } as React.CSSProperties} />
            <div aria-hidden="true" className="absolute -top-1 left-1/2 h-5 -translate-x-1/2 border-l-2 border-dashed border-chart-reference" />
          </div>
          <div className="relative mt-1 h-4 text-[11px] text-muted" aria-hidden="true">
            <span className="absolute left-0">0</span>
            <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-semibold">{referenceLabel}</span>
            <span className="absolute right-0">100</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
