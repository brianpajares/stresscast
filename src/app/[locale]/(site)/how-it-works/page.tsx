import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { calculate } from "@/engine/calculate";
import { ITEM_SCALE, type ItemKey } from "@/engine/types";
import { routing } from "@/i18n/routing";
import { Card } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import { Markdown } from "@/components/content/markdown";
import { PageShell, ProseSection } from "@/components/content/page-shell";
import { StartCta } from "@/components/landing/start-cta";
import { formatScore } from "@/lib/format";
import { extractModelCardSection } from "@/lib/report/model-card";
import { getModelBundle } from "@/lib/server/model";
import { alternatesFor } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/how-it-works">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("howTitle"), description: t("howDescription"), alternates: alternatesFor(locale, "/how-it-works") };
}

/** Caso verificado T12 (spec/test_vectors.json): el ejemplo se CALCULA con el motor, no se escribe a mano. */
const EXAMPLE = {
  country: "US",
  emotionally_exhausting: "high",
  burned_out_due_work: "somewhat",
  work_frustrates: "somewhat",
  worn_out_end_day: "always",
  exhausted_morning: "often",
  every_working_hour_tiring: "sometimes",
  energy_family_friends: "seldom",
} as const;

export default async function HowItWorksPage({ params }: PageProps<"/[locale]/how-it-works">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  const bundle = await getModelBundle();
  const example = calculate(EXAMPLE, bundle.base);
  const f = (n: number) => formatScore(n, locale);
  const card = extractModelCardSection(bundle.modelCard, locale);

  return (
    <PageShell title={t("how.title")} lead={t("how.lead")}>
      <ProseSection id="calc" title={t("how.calcTitle")}>
        <p>{t("how.calcBody")}</p>
        <p>{t("how.calcNote")}</p>
      </ProseSection>

      <ProseSection id="items" title={t("how.itemsTitle")}>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <caption className="sr-only">{t("how.itemsCaption")}</caption>
            <thead className="bg-surface-alt text-text">
              <tr>
                <th scope="col" className="px-4 py-3">{t("how.colItem")}</th>
                <th scope="col" className="px-4 py-3">{t("how.colScale")}</th>
                <th scope="col" className="px-4 py-3">{t("how.colDirection")}</th>
              </tr>
            </thead>
            <tbody>
              {bundle.base.items.map((it) => (
                <tr key={it.item_id} className="border-t border-border align-top">
                  <th scope="row" className="px-4 py-3 font-medium text-text">
                    <span className="mr-2 font-mono text-xs text-muted">{it.item_id}</span>
                    {t(`questions.${it.input_key}`)}
                  </th>
                  <td className="px-4 py-3">{it.scale_type === "degree" ? t("how.scaleDegree") : t("how.scaleFrequency")}</td>
                  <td className="px-4 py-3">{it.reverse_scored ? t("how.directionReverse") : t("how.directionDirect")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ProseSection>

      <ProseSection id="scenarios" title={t("how.scenariosTitle")}>
        <p>{t("how.scenariosBody")}</p>
        <p>{t("how.scenariosNote")}</p>
      </ProseSection>

      <ProseSection id="example" title={t("how.exampleTitle")}>
        <p>{t("how.exampleBody")}</p>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <caption className="px-4 py-2 text-left text-xs text-muted">{t("how.exampleCaption")}</caption>
            <thead className="bg-surface-alt text-text">
              <tr>
                <th scope="col" className="px-4 py-2">{t("how.colItem")}</th>
                <th scope="col" className="px-4 py-2">{t("how.colResponse")}</th>
                <th scope="col" className="px-4 py-2 text-right">{t("how.colBurden")}</th>
              </tr>
            </thead>
            <tbody>
              {example.item_scores.map((s) => {
                const key = s.input_key as ItemKey;
                const ns = ITEM_SCALE[key] === "degree" ? "degree" : "frequency";
                return (
                  <tr key={s.item_id} className="border-t border-border">
                    <th scope="row" className="px-4 py-2 font-medium text-text">
                      <span className="mr-2 font-mono text-xs text-muted">{s.item_id}</span>
                      {t(`items.${key}.name`)}
                    </th>
                    <td className="px-4 py-2">{t(`${ns}.${s.response}`)}</td>
                    <td className="px-4 py-2 text-right tabular">{s.burden_points}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-border bg-surface-alt text-text">
              <tr>
                <th scope="row" colSpan={2} className="px-4 py-2">{t("report.current")}</th>
                <td className="px-4 py-2 text-right font-bold tabular">{f(example.score)}</td>
              </tr>
              <tr>
                <th scope="row" colSpan={2} className="px-4 py-2">{t("report.scenarioImprove")}</th>
                <td className="px-4 py-2 text-right tabular">{f(example.scenario_30d.improve)}</td>
              </tr>
              <tr>
                <th scope="row" colSpan={2} className="px-4 py-2">{t("report.scenarioWorsen")}</th>
                <td className="px-4 py-2 text-right tabular">{f(example.scenario_30d.worsen)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </ProseSection>

      <ProseSection id="data" title={t("how.dataTitle")}>
        <p>{t("how.dataBody")}</p>
      </ProseSection>
      <ProseSection id="reliability" title={t("how.reliabilityTitle")}>
        <p>{t("how.reliabilityBody")}</p>
      </ProseSection>
      <ProseSection id="limits" title={t("how.limitsTitle")}>
        <p>{t("how.limitsBody")}</p>
      </ProseSection>

      {card ? (
        <Disclosure summary={t("how.modelCardTitle")}>
          <p className="mb-3 text-xs">{t("how.modelCardNote")}</p>
          <Markdown source={card} />
        </Disclosure>
      ) : null}

      <Card className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-bold">{t("landing.finalTitle")}</p>
        <StartCta size="md">{t("how.cta")}</StartCta>
      </Card>
    </PageShell>
  );
}
