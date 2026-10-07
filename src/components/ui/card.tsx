import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-surface p-6 shadow-card sm:p-7", className)}
      {...props}
    />
  );
}

export function Eyebrow({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm font-bold tracking-wide text-primary", className)} {...props} />;
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "primary" | "warning" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold",
        tone === "neutral" && "border-border bg-surface-alt text-muted",
        tone === "primary" && "border-primary/40 bg-primary/10 text-primary",
        tone === "warning" && "border-warning/50 bg-warning/10 text-warning",
        className,
      )}
      {...props}
    />
  );
}

export function Notice({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-md border-l-4 border-warning bg-surface-alt px-4 py-3 text-sm text-text", className)}
      {...props}
    />
  );
}
