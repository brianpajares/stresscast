"use client";

import { useEffect, useRef } from "react";
import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { setModelVersion, track } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

/** Descarga del PDF privado. Emite `pdf_download` (sin URL ni contenido: el token no sale a analítica). */
export function PdfDownloadButton({
  href,
  label,
  className,
  block,
}: {
  href: string;
  label: string;
  className?: string;
  block?: boolean;
}) {
  return (
    <a
      href={href}
      download
      onClick={() => track("pdf_download")}
      className={cn(buttonVariants({ variant: "primary", block }), className)}
    >
      <Download className="size-5" aria-hidden="true" />
      {label}
    </a>
  );
}

function ageBucket(issuedAt: string): string {
  const days = (Date.now() - Date.parse(issuedAt)) / 86_400_000;
  if (!Number.isFinite(days) || days < 1) return "<1d";
  return days < 7 ? "1-7d" : ">7d";
}

/** Emite `report_view` una vez con el bucket de antigüedad (no el contenido del informe). */
export function ReportTracker({ issuedAt, modelVersion }: { issuedAt: string; modelVersion: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    setModelVersion(modelVersion);
    track("report_view", { report_age_bucket: ageBucket(issuedAt) });
  }, [issuedAt, modelVersion]);
  return null;
}

/** Disclosure del informe con medición de aperturas (`report_section_expand`: solo el id de sección). */
export function trackSectionExpand(sectionId: string): void {
  track("report_section_expand", { section_id: sectionId });
}
