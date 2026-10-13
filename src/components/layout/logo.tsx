import { cn } from "@/lib/utils";

/** Marca: instrumento 0–100 (arco + marcador). Decorativa; el texto del wordmark es el nombre accesible. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <path
        d="M7 20.5a9 9 0 0 1 18 0"
        fill="none"
        stroke="var(--primary-text)"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path d="M7 20.5a9 9 0 0 1 11.2-8.7" fill="none" stroke="var(--primary-text)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="18.6" cy="11.9" r="2.1" fill="var(--primary-text)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("text-lg font-extrabold tracking-tight", className)}>
      Stress<span className="text-primary">Cast</span>
    </span>
  );
}

export function Logo({ className, wordmarkClassName }: { className?: string; wordmarkClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <Wordmark className={wordmarkClassName} />
    </span>
  );
}
