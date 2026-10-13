"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";
import { ApiClientError, calculateRequest } from "@/lib/client/api";
import { KEYS, isCompleteAnswers, readSession, writeSession, type AssessmentDraft } from "@/lib/client/session-store";
import { elapsedSinceStart, latencyBucket, setModelVersion, track } from "@/lib/analytics/client";
import { LogoMark } from "@/components/layout/logo";

type Phase = "working" | "error" | "missing";

/**
 * Procesando (S10): tres pasos reales, nunca una espera artificial. Si el cálculo tarda <300 ms
 * la transición es inmediata. El error es persistente y conserva las respuestas en sesión.
 */
export function ProcessingFlow() {
  const t = useTranslations();
  const router = useRouter();
  const started = useRef(false);
  const [phase, setPhase] = useState<Phase>("working");

  const run = useCallback(async () => {
    const draft = readSession<AssessmentDraft>(KEYS.assessment);
    if (!draft || !isCompleteAnswers(draft.answers)) {
      setPhase("missing");
      return;
    }
    setPhase("working");
    track("assessment_complete", { elapsed_bucket: elapsedSinceStart() ?? "<30s" });
    try {
      const { result, latencyMs } = await calculateRequest(draft.answers);
      setModelVersion(result.model_version);
      writeSession(KEYS.result, { result });
      track("calculation_success", { engine_latency_bucket: latencyBucket(latencyMs) });
      router.replace("/results/preview");
    } catch (e) {
      const code = e instanceof ApiClientError ? e.code : "unknown_error";
      track("calculation_error", { error_code: code.slice(0, 40), schema_version: "1.1.0" });
      setPhase("error");
    }
  }, [router]);

  useEffect(() => {
    if (started.current) return; // StrictMode ejecuta los efectos dos veces en desarrollo
    started.current = true;
    void run();
  }, [run]);

  const steps = t.raw("processing.steps") as string[];

  return (
    <div className="mx-auto w-full max-w-(--container-form) px-4 py-10 sm:py-16">
      <Card aria-live="polite" aria-busy={phase === "working"}>
        <Eyebrow className="flex items-center gap-2">
          <LogoMark className="size-6" />
          StressCast
        </Eyebrow>

        {phase === "missing" ? (
          <>
            <h1 tabIndex={-1} className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {t("processing.missing")}
            </h1>
            <div className="mt-6">
              <Link href="/assessment" className={buttonVariants({ variant: "primary" })}>
                {t("processing.restart")}
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 tabIndex={-1} className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {t("processing.title")}
            </h1>
            <ul className="mt-6 grid gap-3">
              {steps.map((label, i) => (
                <li
                  key={label}
                  className="flex items-center gap-3 rounded-md border border-border bg-surface-alt px-4 py-3"
                >
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full bg-primary animate-pulse-soft"
                    style={{ animationDelay: `${i * 160}ms` }}
                  />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-muted">{t("processing.note")}</p>
          </>
        )}

        {phase === "error" ? (
          <div className="mt-6 space-y-4" role="alert">
            <p className="font-semibold text-danger">{t("assessment.calcError")}</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void run()}>
                <RotateCcw className="size-5" aria-hidden="true" />
                {t("common.retry")}
              </Button>
              <Link href="/assessment" className={buttonVariants({ variant: "secondary" })}>
                {t("assessment.back")}
              </Link>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
