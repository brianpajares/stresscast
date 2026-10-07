"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cuenta de 0 al valor final en ~700 ms (ease-out). Respeta prefers-reduced-motion (valor final inmediato).
 * El número animado es aria-hidden; los lectores de pantalla reciben solo el valor final.
 */
export function AnimatedNumber({
  value,
  format,
  className,
  durationMs = 700,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
  durationMs?: number;
}) {
  const [shown, setShown] = useState(value);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || durationMs <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza el valor mostrado sin animar
      setShown(value);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(value * eased);
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [value, durationMs]);

  return (
    <>
      <span aria-hidden="true" className={className}>
        {format(shown)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
