"use client";

import { Disclosure } from "@/components/ui/disclosure";
import { trackSectionExpand } from "./report-actions";

/** Disclosure cliente mínimo para medir aperturas sin convertir todo el informe en Client Component. */
export function MeasuredDisclosure({
  sectionId,
  summary,
  children,
  defaultOpen,
}: {
  sectionId: string;
  summary: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <Disclosure summary={summary} onOpen={() => trackSectionExpand(sectionId)} defaultOpen={defaultOpen}>
      {children}
    </Disclosure>
  );
}
