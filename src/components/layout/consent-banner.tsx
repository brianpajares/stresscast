"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  CONSENT_EVENT,
  OPEN_PREFS_EVENT,
  initAnalytics,
  readConsent,
  writeConsent,
} from "@/lib/analytics/client";

/**
 * Consentimiento de analítica de terceros (PostHog). Por defecto NO se carga nada.
 * Los contadores first-party agregados no requieren consentimiento: no llevan identificadores.
 */
export function ConsentBanner() {
  const t = useTranslations("consent");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    initAnalytics();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el consentimiento solo existe en el cliente
    if (readConsent() === null) setOpen(true);
    const onOpen = () => setOpen(true);
    const onChange = () => setOpen(false);
    window.addEventListener(OPEN_PREFS_EVENT, onOpen);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => {
      window.removeEventListener(OPEN_PREFS_EVENT, onOpen);
      window.removeEventListener(CONSENT_EVENT, onChange);
    };
  }, []);

  if (!open) return null;

  return (
    <section
      role="region"
      aria-labelledby="consent-title"
      className="no-print fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-card sm:flex-row sm:items-center">
        <div className="flex-1">
          <h2 id="consent-title" className="text-base font-bold">
            {t("title")}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("body")}</p>
        </div>
        <div className="flex gap-2 sm:flex-col">
          <Button size="sm" className="flex-1" onClick={() => writeConsent("granted")}>
            {t("accept")}
          </Button>
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => writeConsent("denied")}>
            {t("decline")}
          </Button>
        </div>
      </div>
    </section>
  );
}

export function AnalyticsPrefsButton({ className }: { className?: string }) {
  const t = useTranslations("footer");
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_PREFS_EVENT))}>
      {t("analyticsPrefs")}
    </button>
  );
}
