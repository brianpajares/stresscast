"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { buttonVariants } from "@/components/ui/button";
import { Badge, Card, Eyebrow } from "@/components/ui/card";
import { ScoreBar } from "./score-bar";
import { AnimatedNumber } from "./animated-number";
import { LockedScenarioTeaser } from "./locked-scenario-teaser";
import { formatScore } from "@/lib/format";
import {
  KEYS,
  clearFlow,
  isCompleteAnswers,
  useSessionValue,
  type AssessmentDraft,
  type StoredResult,
} from "@/lib/client/session-store";
import { setModelVersion, track } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

const PAYMENT_ENABLED = process.env.NEXT_PUBLIC_PAYMENT_ENABLED === "true";

/**
 * Vista previa gratuita (S11 · AT-05/AT-06). Renderiza EXACTAMENTE `free_preview.give` de outputs_spec.json:
 * work_burnout_score, reference_band, mini_chart (barra sin eje temporal), top_driver_1 y one_generic_action.
 * NO lee ni renderiza scenario_30d, sensitivity, benchmark, top_drivers[1..] ni item_scores.
 */
export function PreviewView() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const stored = useSessionValue<StoredResult>(KEYS.result);
  const draft = useSessionValue<AssessmentDraft>(KEYS.assessment);

  const result = stored?.result ?? null;
  const hasAnswers = isCompleteAnswers(draft?.answers);

  useEffect(() => {
    if (result) {
      setModelVersion(result.model_version);
      track("preview_view");
    } else if (stored === null && hasAnswers) {
      router.replace("/assessment/processing");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una emisión por resultado disponible
  }, [result === null]);

  if (!result) {
    return (
      <div className="mx-auto w-full max-w-(--container-form) px-4 py-10 sm:py-16">
        <Card>
          <h1 tabIndex={-1} className="text-2xl font-extrabold tracking-tight">
            {t("processing.missing")}
          </h1>
          <div className="mt-6">
            <Link href="/assessment" className={buttonVariants({ variant: "primary" })}>
              {t("processing.restart")}
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const score = result.score;
  const scoreText = formatScore(score, locale);
  const high = result.reference_band === "high_reference";
  const top = result.top_drivers[0];
  const ctaHref = PAYMENT_ENABLED ? "/checkout" : "/report/request";

  return (
    <div className="mx-auto w-full max-w-(--container-content) px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Eyebrow>{t("preview.eyebrow")}</Eyebrow>

      <div className="mt-4 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        {/* score + referencia */}
        <Card className="animate-fade-up">
          <h1 tabIndex={-1} className="text-base font-semibold text-muted">
            {t("preview.score_label")}
          </h1>
          <p className="mt-2 flex items-baseline gap-3">
            <AnimatedNumber
              value={score}
              format={(n) => formatScore(n, locale)}
              className="text-7xl font-extrabold leading-none tracking-tighter tabular sm:text-8xl"
            />
            <span className="text-lg font-medium text-muted">{t("preview.outOf")}</span>
          </p>

          <div className="mt-3">
            <Badge tone={high ? "warning" : "primary"} className="px-3 py-1.5 text-sm">
              <span aria-hidden="true">{high ? "▲" : "▼"}</span>
              {high ? t("preview.bandAboveShort") : t("preview.bandBelowShort")}
            </Badge>
          </div>
          <p className="mt-3 text-text">{high ? t("preview.above") : t("preview.below")}</p>

          <ScoreBar
            score={score}
            scoreText={scoreText}
            youLabel={t("preview.youMark")}
            referenceLabel={t("preview.referenceMark")}
            ariaLabel={t("preview.scoreAria", { score: scoreText })}
          />

          <p className="text-sm text-muted">{t("preview.context")}</p>
          <p className="mt-3">
            <Link
              href="/how-it-works"
              onClick={() => track("methodology_open", { origin_screen: "preview" })}
              className={buttonVariants({ variant: "link" })}
            >
              {t("preview.methodLink")}
            </Link>
          </p>
        </Card>

        {/* driver + acción */}
        <Card className={cn("animate-fade-up self-start")} style={{ animationDelay: "80ms" }}>
          <Eyebrow>{t("preview.driver")}</Eyebrow>
          <h2 className="mt-2 text-balance text-xl font-extrabold leading-snug">{t(`items.${top.input_key}.name`)}</h2>
          <p className="mt-2 text-sm text-muted">{t("preview.driverHelp")}</p>

          <div className="mt-5 rounded-md bg-surface-alt p-4">
            <h3 className="text-sm font-bold">{t("preview.action")}</h3>
            <p className="mt-1.5 text-sm">{t(`items.${top.input_key}.action`)}</p>
            <p className="mt-2 text-sm text-muted">{t("preview.action_body")}</p>
          </div>
        </Card>
      </div>

      {/* escenarios bloqueados */}
      <section className="mt-10" aria-labelledby="locked-title">
        <h2 id="locked-title" className="text-2xl font-extrabold tracking-tight">
          {t("preview.locked_title")}
        </h2>
        <p className="mt-2 max-w-2xl text-muted">{t("preview.locked_body")}</p>
        <div className="mt-5">
          <LockedScenarioTeaser
            labels={{
              improve: t("preview.scenarioImprove"),
              noChange: t("preview.scenarioNoChange"),
              worsen: t("preview.scenarioWorsen"),
              whatIf: t("preview.whatIfBadge"),
              lockedValue: t("preview.lockedValue"),
              caption: t("preview.lockedCaption"),
              lockedBadge: t("preview.lockedBadge"),
            }}
          />
        </div>
      </section>

      {/* CTA único */}
      <section className="mt-10 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-surface to-surface p-6 shadow-card sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-bold">{t("preview.ctaBenefit")}</p>
            <p className="mt-1 text-sm text-muted">{t("preview.free")}</p>
          </div>
          <Link
            href={ctaHref}
            onClick={() => track("report_request_click")}
            className={buttonVariants({ variant: "primary", size: "lg" })}
          >
            {t("preview.cta")}
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-3xl text-sm text-muted">{t("legal.disclaimer")}</p>
        <button
          type="button"
          onClick={() => {
            clearFlow();
            router.push("/assessment");
          }}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {t("preview.retake")}
        </button>
      </div>
    </div>
  );
}
