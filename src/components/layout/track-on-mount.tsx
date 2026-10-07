"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/client";

/** Emite un evento permitido una vez al montar (p. ej. landing_view, preview_view). Sin propiedades sensibles. */
export function TrackOnMount({ event, props }: { event: string; props?: Record<string, string | number | boolean> }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(event, props ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una sola emisión por montaje
  }, []);
  return null;
}
