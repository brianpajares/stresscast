import { cn } from "@/lib/utils";

/**
 * Progreso real de 8 pasos (ux/components.md): barra segmentada + texto “Pregunta X de 8”
 * con role=progressbar. Sin porcentajes falsos.
 */
export function StepProgress({
  current,
  total,
  label,
  text,
}: {
  current: number;
  total: number;
  label: string;
  text: string;
}) {
  return (
    <div>
      <p className="text-sm font-bold text-text" aria-hidden="true">
        {text}
      </p>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-valuetext={text}
        className="mt-2 flex gap-1.5"
      >
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-2 flex-1 rounded-full transition-colors duration-200",
              i < current ? "bg-primary" : "bg-border/70",
              i === current - 1 && "ring-2 ring-primary/30",
            )}
          />
        ))}
      </div>
    </div>
  );
}
