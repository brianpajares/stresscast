import type { FunnelRow } from "./store/types";

/** Umbrales de spec/monetizacion.json y docs/TRACTION_PLAN.md. */
export const GATES = {
  payment: { previews: 300, requests: 100, previewToRequest: 0.35, windowDays: 30 },
  day14: { requests: 50, previewToRequest: 0.25 },
  targets: { visitToStart: 0.3, startToPreview: 0.65 },
  calcErrorAlert: 0.01,
} as const;

export interface FunnelSummary {
  totals: Record<string, number>;
  rates: {
    visitToStart: number | null;
    startToPreview: number | null;
    previewToRequest: number | null;
    calculationErrorRate: number | null;
  };
  gates: {
    paymentReady: boolean;
    day14Continue: boolean;
    previews: number;
    requests: number;
  };
  byMarket: { market: string; previews: number; requests: number }[];
  byLocale: { locale: string; starts: number; previews: number; requests: number }[];
}

const ratio = (num: number, den: number): number | null => (den > 0 ? num / den : null);

/** Agrega los contadores first-party (sin identificadores) y calcula las métricas derivadas de analytics_events.json. */
export function summarizeFunnel(rows: FunnelRow[]): FunnelSummary {
  const totals: Record<string, number> = {};
  const market = new Map<string, { previews: number; requests: number }>();
  const locale = new Map<string, { starts: number; previews: number; requests: number }>();

  for (const r of rows) {
    totals[r.event] = (totals[r.event] ?? 0) + r.count;
    const m = market.get(r.market) ?? { previews: 0, requests: 0 };
    const l = locale.get(r.locale) ?? { starts: 0, previews: 0, requests: 0 };
    if (r.event === "preview_view") {
      m.previews += r.count;
      l.previews += r.count;
    }
    if (r.event === "report_request_success") {
      m.requests += r.count;
      l.requests += r.count;
    }
    if (r.event === "assessment_start_click") l.starts += r.count;
    market.set(r.market, m);
    locale.set(r.locale, l);
  }

  const t = (e: string) => totals[e] ?? 0;
  const previews = t("preview_view");
  const requests = t("report_request_success");
  const p2r = ratio(requests, previews);
  const err = t("calculation_error");

  return {
    totals,
    rates: {
      visitToStart: ratio(t("assessment_start_click"), t("landing_view")),
      startToPreview: ratio(previews, t("assessment_start_click")),
      previewToRequest: p2r,
      calculationErrorRate: ratio(err, err + t("calculation_success")),
    },
    gates: {
      paymentReady:
        previews >= GATES.payment.previews && requests >= GATES.payment.requests && (p2r ?? 0) >= GATES.payment.previewToRequest,
      day14Continue: requests >= GATES.day14.requests && (p2r ?? 0) >= GATES.day14.previewToRequest,
      previews,
      requests,
    },
    byMarket: [...market.entries()].map(([k, v]) => ({ market: k, ...v })).sort((a, b) => b.previews - a.previews),
    byLocale: [...locale.entries()].map(([k, v]) => ({ locale: k, ...v })).sort((a, b) => b.starts - a.starts),
  };
}
