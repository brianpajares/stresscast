"use client";

import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { markAssessmentStart, track } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

/** CTA primario único de la landing. Emite `assessment_start_click` (sin propiedades sensibles). */
export function StartCta({
  children,
  className,
  size = "lg",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "md" | "lg";
}) {
  return (
    <Link
      href="/assessment"
      onClick={() => {
        markAssessmentStart();
        track("assessment_start_click");
      }}
      className={cn(buttonVariants({ variant: "primary", size }), className)}
    >
      {children}
    </Link>
  );
}
