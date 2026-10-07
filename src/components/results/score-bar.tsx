import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface ScoreBarProps {
  /** 0–100 (valor interno, punto decimal). */
  score: number;
  /** Texto visible del marcador del usuario (ya formateado y localizado). */
  scoreText: string;
  /** Etiqueta del marcador (“Tú”, “You”, “Ejemplo”…). */
  youLabel: string;
  /** Etiqueta de la marca contextual (“Referencia PUMA 50”). */
  referenceLabel: string;
  /** Alternativa textual completa (score + referencia). */
  ariaLabel: string;
  className?: string;
}

/**
 * CurrentScoreViz (ux/components.md): barra horizontal 0–100 con marcador del score actual y marca
 * contextual de 50. PROHIBIDO: eje temporal, línea actual→30 días, banda de confianza.
 * El significado nunca depende solo del color: el marcador tiene forma, valor y etiqueta.
 */
export function ScoreBar({ score, scoreText, youLabel, referenceLabel, ariaLabel, className }: ScoreBarProps) {
  const s = Math.min(100, Math.max(0, score));
  const style = { "--score": s } as CSSProperties;

  return (
    <div className={cn("w-full select-none px-5 pb-10 pt-12", className)} style={style}>
      <div role="img" aria-label={ariaLabel} className="relative">
        {/* pista */}
        <div className="h-4 overflow-hidden rounded-full bg-surface-alt ring-1 ring-inset ring-border">
          <div className="sc-bar-fill h-full rounded-full bg-gradient-to-r from-primary/35 to-chart-current" />
        </div>

        {/* marcas 0 / 50 / 100 */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-5 flex justify-between text-[11px] font-medium text-muted tabular">
          <span>0</span>
          <span>100</span>
        </div>

        {/* referencia contextual PUMA = 50 (línea discontinua, no umbral clínico) */}
        <div aria-hidden="true" className="absolute -top-2 left-1/2 h-8 -translate-x-1/2 border-l-2 border-dashed border-chart-reference" />
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-9 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-muted"
        >
          {referenceLabel}
        </div>

        {/* marcador del usuario */}
        <div aria-hidden="true" className="sc-bar-marker absolute top-2 -translate-x-1/2 -translate-y-1/2">
          <div className="absolute -top-[3.1rem] left-1/2 flex -translate-x-1/2 flex-col items-center">
            <span className="rounded-md bg-text px-2 py-0.5 text-xs font-bold text-bg tabular">{scoreText}</span>
            <span className="mt-0.5 text-[11px] font-semibold text-muted">{youLabel}</span>
          </div>
          <div className="size-6 rounded-full border-[3px] border-bg bg-chart-current shadow-card ring-2 ring-chart-current" />
        </div>
      </div>
    </div>
  );
}
