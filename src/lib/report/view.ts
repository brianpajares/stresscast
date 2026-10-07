import type { ItemKey } from "@/engine/types";
import { formatDate, formatInteger, formatPercent, formatScore } from "@/lib/format";
import type { ReportData } from "./data";
import { SOURCES } from "./sources";

/** Traductor mínimo (next-intl `getTranslations()` o `createTranslator`). */
export interface Translator {
  (key: string, values?: Record<string, string | number | Date>): string;
  raw(key: string): unknown;
}

export interface ReportScenarioItem {
  key: "improve" | "noChange" | "worsen";
  label: string;
  value: string;
  /** 0–100 numérico para barras. */
  raw: number;
}

export interface ReportDriverItem {
  rank: number;
  key: ItemKey;
  name: string;
  burdenText: string;
  burden: number;
  reverse: boolean;
  suggestion: string;
}

export interface ReportView {
  verificationId: string;
  coverTitle: string;
  generatedOn: string;
  modelVersionText: string;
  score: {
    value: string;
    raw: number;
    label: string;
    intro: string;
    bandText: string;
    high: boolean;
    context: string;
    youLabel: string;
    referenceLabel: string;
    ariaLabel: string;
    outOf: string;
  };
  scenarios: {
    title: string;
    subtitle: string;
    badge: string;
    note: string;
    footer: string;
    range: string;
    items: ReportScenarioItem[];
    kTitle: string;
    kImprove: string;
    kWorsen: string;
    sensitivityTitle: string;
    sensitivityBody: string;
  };
  drivers: { title: string; note: string; reverseNote: string; suggestionLabel: string; items: ReportDriverItem[] };
  benchmark: { title: string; banner: string; body: string; delta: string; validity: string; mean: number; sd: number };
  plan: {
    title: string;
    steps: { title: string; body: string }[];
    notes: { title: string; body: string }[];
    support: string;
  };
  method: {
    title: string;
    rows: { k: string; v: string }[];
    formulaTitle: string;
    formula: string;
    limitationsTitle: string;
    limitations: string[];
  };
  sourcesTitle: string;
  sources: { label: string; url: string }[];
  privacy: { title: string; body: string };
  verificationLabel: string;
  verificationNote: string;
  disclaimer: string;
}

const METHOD_ROWS = ["instrument", "scoring", "reverse", "score", "reference", "scenario", "nature", "predictive", "model"] as const;

/** Construye TODO el texto del informe una sola vez; web y PDF lo consumen para garantizar paridad. */
export function buildReportView(t: Translator, d: ReportData): ReportView {
  const loc = d.locale;
  const f = (n: number, digits = 1) => formatScore(n, loc, digits);
  const r = d.result;
  const s = r.scenario_30d;
  const high = r.reference_band === "high_reference";

  const drivers: ReportDriverItem[] = r.top_drivers.map((drv) => {
    const item = r.item_scores.find((i) => i.item_id === drv.item_id);
    return {
      rank: drv.rank,
      key: drv.input_key,
      name: t(`items.${drv.input_key}.name`),
      burdenText: t("report.burdenPoints", { points: f(drv.burden_points, 0) }),
      burden: drv.burden_points,
      reverse: item?.reverse_scored === true,
      suggestion: t(`items.${drv.input_key}.action`),
    };
  });

  const deltaAbs = Math.abs(d.puma.delta);
  const deltaText =
    d.puma.delta > 0
      ? t("report.deltaAbove", { points: f(deltaAbs), mean: f(d.puma.mean) })
      : d.puma.delta < 0
        ? t("report.deltaBelow", { points: f(deltaAbs), mean: f(d.puma.mean) })
        : t("report.deltaEqual", { mean: f(d.puma.mean) });

  const topName = drivers[0]?.name ?? "";

  return {
    verificationId: d.verificationId,
    coverTitle: t("report.coverTitle"),
    generatedOn: t("report.generatedOn", { date: formatDate(d.issuedAt, loc) }),
    modelVersionText: t("report.modelVersion", { version: r.model_version }),
    score: {
      value: f(r.score),
      raw: r.score,
      label: t("report.current"),
      intro: t("report.currentIntro"),
      bandText: high ? t("preview.above") : t("preview.below"),
      high,
      context: t("preview.context"),
      youLabel: t("preview.youMark"),
      referenceLabel: t("preview.referenceMark"),
      ariaLabel: t("preview.scoreAria", { score: f(r.score) }),
      outOf: t("preview.outOf"),
    },
    scenarios: {
      title: t("report.scenarios"),
      subtitle: t("report.scenarioSubtitle"),
      badge: t("report.whatIfBadge"),
      note: t("report.scenario_note"),
      footer: t("report.scenarioFooter"),
      range: t("report.scenarioRange", { low: f(s.improve), high: f(s.worsen) }),
      items: [
        { key: "improve", label: t("report.scenarioImprove"), value: f(s.improve), raw: s.improve },
        { key: "noChange", label: t("report.scenarioNoChange"), value: f(s.no_change), raw: s.no_change },
        { key: "worsen", label: t("report.scenarioWorsen"), value: f(s.worsen), raw: s.worsen },
      ],
      kTitle: t("report.kTitle"),
      kImprove: t("report.kImprove", { k: s.k_improve }),
      kWorsen: t("report.kWorsen", { k: s.k_worsen }),
      sensitivityTitle: t("report.sensitivityTitle"),
      sensitivityBody: t("report.sensitivityBody", {
        one: f(r.sensitivity.one_item_one_category_points, 4),
        two: f(r.sensitivity.two_items_one_category_points, 4),
      }),
    },
    drivers: {
      title: t("report.drivers"),
      note: t("report.driverNote"),
      reverseNote: t("report.reverseNote"),
      suggestionLabel: t("report.suggestion"),
      items: drivers,
    },
    benchmark: {
      title: t("report.benchmark"),
      banner: t("report.contextBanner"),
      body: t("report.pumaBody", {
        mean: f(d.puma.mean),
        sd: f(d.puma.sd),
        n: formatInteger(d.puma.n, loc),
        share: formatPercent(d.puma.shareHigh, loc),
        alpha: f(d.puma.alpha, 2),
      }),
      delta: deltaText,
      validity: t("report.validityNote"),
      mean: d.puma.mean,
      sd: d.puma.sd,
    },
    plan: {
      title: t("report.plan"),
      steps: [
        { title: t("report.planStep1Title"), body: t("report.planStep1Body", { driver: topName }) },
        { title: t("report.planStep2Title"), body: t("report.planStep2Body") },
        { title: t("report.planStep3Title"), body: t("report.planStep3Body") },
      ],
      notes: [
        { title: t("report.planNoticeTitle"), body: t("report.planNoticeBody") },
        { title: t("report.planTryTitle"), body: t("report.planTryBody") },
        { title: t("report.planUsefulTitle"), body: t("report.planUsefulBody") },
        { title: t("report.planDontTitle"), body: t("report.planDontBody") },
      ],
      support: t("legal.support"),
    },
    method: {
      title: t("report.method"),
      rows: METHOD_ROWS.map((k) => ({
        k: t(`report.methodTable.${k}.k`),
        v: t(`report.methodTable.${k}.v`, { version: r.model_version }),
      })),
      formulaTitle: t("report.formulaTitle"),
      formula: t("report.formulaBody"),
      limitationsTitle: t("report.limitationsTitle"),
      limitations: t.raw("report.limitations") as string[],
    },
    sourcesTitle: t("report.sourcesTitle"),
    sources: SOURCES.map((src) => ({ label: t(`sources.items.${src.labelKey}`), url: src.url })),
    privacy: { title: t("report.privacyTitle"), body: t("report.privacyBody") },
    verificationLabel: t("report.id"),
    verificationNote: t("report.verificationNote"),
    disclaimer: t("legal.disclaimer"),
  };
}
