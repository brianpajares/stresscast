import { getTranslations, getLocale } from "next-intl/server";
import { ScoreBar } from "@/components/results/score-bar";
import { Badge } from "@/components/ui/card";
import { formatScore } from "@/lib/format";
import type { Locale } from "@/i18n/routing";

/** Valores del caso verificado T12 (spec/test_vectors.json): 67,857…. Solo ilustrativo y así etiquetado. */
const EXAMPLE_SCORE = 67.8571;
const EXAMPLE_DRIVER = { key: "worn_out_end_day", burden: 100 } as const;

export async function HeroVisual() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const scoreText = formatScore(EXAMPLE_SCORE, locale);

  return (
    <figure className="relative mx-auto w-full max-w-md" aria-label={t("landing.exampleLabel")}>
      <div
        aria-hidden="true"
        className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/15 via-transparent to-focus/10 blur-2xl"
      />
      <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-muted">{t("landing.exampleScoreLabel")}</p>
          <Badge tone="warning">{t("common.illustrativeOnly")}</Badge>
        </div>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="text-6xl font-extrabold leading-none tracking-tighter tabular">{scoreText}</span>
          <span className="text-base font-medium text-muted">{t("preview.outOf")}</span>
        </p>

        <ScoreBar
          score={EXAMPLE_SCORE}
          scoreText={scoreText}
          youLabel={t("landing.exampleYou")}
          referenceLabel={t("landing.exampleReference")}
          ariaLabel={t("preview.scoreAria", { score: scoreText })}
          className="-mx-2 px-3"
        />

        <div className="rounded-md bg-surface-alt p-3.5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">{t("preview.driver")}</p>
          <p className="mt-1 text-sm font-semibold">{t(`items.${EXAMPLE_DRIVER.key}.name`)}</p>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-muted">{t("landing.exampleLabel")}</figcaption>
    </figure>
  );
}
