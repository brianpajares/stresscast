"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Acordeón/FAQ con <details>/<summary> nativos: botón real con estado expandido expuesto por el navegador,
 * contenido siempre en el DOM (indexable) y sin JS para funcionar. `onToggle` permite medir aperturas
 * (methodology_open / report_section_expand) sin enviar contenido.
 */
export function Disclosure({
  summary,
  children,
  onOpen,
  className,
  defaultOpen,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  onOpen?: () => void;
  className?: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className={cn("group rounded-lg border border-border bg-surface open:shadow-soft", className)}
      open={defaultOpen}
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open) onOpen?.();
      }}
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-5 py-3 text-left font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="text-pretty">{summary}</span>
        <ChevronDown
          className="size-5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="px-5 pb-5 pt-1 text-muted">{children}</div>
    </details>
  );
}
