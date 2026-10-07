import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/card";

interface Labels {
  improve: string;
  noChange: string;
  worsen: string;
  whatIf: string;
  lockedValue: string;
  caption: string;
  lockedBadge: string;
}

/**
 * LockedScenarioTeaser (ux/components.md): misma estructura reconocible que ScenarioCard pero SIN cifras:
 * los valores se sustituyen por “— —”. No se renderiza ningún valor alternativo (FR-06), ni blur de cifras
 * reales, y el disclaimer permanece visible. Copy: “what-if / escenario condicional”, nunca pronóstico.
 */
export function LockedScenarioTeaser({ labels }: { labels: Labels }) {
  const rows = [labels.improve, labels.noChange, labels.worsen];
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {rows.map((label) => (
        <li key={label} className="rounded-lg border border-dashed border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <Badge>{labels.whatIf}</Badge>
          </div>
          <h3 className="mt-3 text-base font-bold">{label}</h3>
          <p className="mt-2 flex items-center gap-2 text-3xl font-extrabold tracking-tight text-muted">
            <span aria-hidden="true">{labels.lockedValue}</span>
            <span className="sr-only">{labels.lockedBadge}</span>
            <Lock className="size-5" aria-hidden="true" />
          </p>
          <p className="mt-2 text-xs text-muted">{labels.caption}</p>
        </li>
      ))}
    </ul>
  );
}
