import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChoiceCardProps {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: (value: string) => void;
  /** Atajo de teclado visible (1–5). */
  hotkey?: number;
  describedBy?: string;
}

/**
 * ChoiceCard (ux/components.md): toda la tarjeta activa el radio; estado seleccionado = borde + check +
 * peso tipográfico (nunca solo color); ≥ 52 px de alto; flechas siguen la semántica nativa del radio group.
 */
export function ChoiceCard({ name, value, label, checked, onChange, hotkey, describedBy }: ChoiceCardProps) {
  const id = `${name}-${value}`;
  return (
    <div className="relative">
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        aria-describedby={describedBy}
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        className={cn(
          "flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-md border bg-surface px-4 py-3 text-base transition-colors",
          "hover:bg-surface-alt peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-3 peer-focus-visible:outline-focus",
          checked ? "border-2 border-primary bg-primary/5 px-[0.9375rem] font-semibold" : "border-border",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            checked ? "border-primary bg-primary text-primary-text" : "border-border bg-bg",
          )}
        >
          {checked ? <Check className="size-4" strokeWidth={3} /> : null}
        </span>
        <span className="flex-1">{label}</span>
        {hotkey ? (
          <kbd
            aria-hidden="true"
            className="hidden size-6 items-center justify-center rounded border border-border bg-surface-alt text-xs font-semibold text-muted sm:inline-flex"
          >
            {hotkey}
          </kbd>
        ) : null}
      </label>
    </div>
  );
}
