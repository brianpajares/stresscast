"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";

/** Error boundary del idioma: mensaje seguro (sin detalles) y reintento. Sentry recibe el error sin datos de usuario. */
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  const tc = useTranslations("common");
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <main id="main" tabIndex={-1} className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <h1 tabIndex={-1} className="text-3xl font-extrabold tracking-tight">
        {t("genericTitle")}
      </h1>
      <p className="mt-3 text-muted">{t("genericBody")}</p>
      <Button className="mt-8" onClick={reset}>
        {tc("retry")}
      </Button>
    </main>
  );
}
