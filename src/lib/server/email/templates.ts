import type { AssessmentInput, CalculationResult } from "@/engine/types";
import type { Locale } from "@/i18n/routing";

export function esc(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type T = (key: string, values?: Record<string, string | number>) => string;

const BRAND = "#0F766E";

function shell(args: { lang: string; preheader: string; title: string; body: string; footer: string }): string {
  return `<!doctype html>
<html lang="${esc(args.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(args.title)}</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(args.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border:1px solid #CBD5E1;border-radius:16px;">
      <tr><td style="padding:28px 32px 8px;font-family:Inter,Segoe UI,Arial,sans-serif;font-size:20px;font-weight:800;color:#0F172A;">Stress<span style="color:${BRAND};">Cast</span></td></tr>
      <tr><td style="padding:8px 32px 28px;font-family:Inter,Segoe UI,Arial,sans-serif;font-size:16px;line-height:1.55;color:#0F172A;">${args.body}</td></tr>
      <tr><td style="padding:0 32px 28px;font-family:Inter,Segoe UI,Arial,sans-serif;font-size:12px;line-height:1.5;color:#475569;border-top:1px solid #E2E8F0;">${args.footer}</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/** Email al usuario (FR-10 / PRD §18): enlace privado, no diagnóstico, enlaces de privacidad/derechos. Sin score en el cuerpo. */
export function renderUserEmail(args: {
  locale: Locale;
  t: T;
  reportUrl: string;
  privacyUrl: string;
  rightsUrl: string;
  ttlDays: number;
  preparing?: boolean;
}): { subject: string; html: string; text: string } {
  const { t } = args;
  const subject = t("subject");
  const lead = args.preparing ? t("preparing") : t("ready", { days: args.ttlDays });
  const body = `
    <p style="margin:0 0 16px;">${esc(t("greeting"))}</p>
    <p style="margin:0 0 24px;">${esc(lead)}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="background:${BRAND};border-radius:12px;">
      <a href="${esc(args.reportUrl)}" style="display:inline-block;padding:14px 26px;font-weight:700;font-size:16px;color:#FFFFFF;text-decoration:none;">${esc(t("button"))}</a>
    </td></tr></table>
    <p style="margin:0 0 8px;font-size:13px;color:#475569;word-break:break-all;">${esc(args.reportUrl)}</p>
    <p style="margin:16px 0 0;font-size:14px;">${esc(t("pdfNote"))}</p>
    <p style="margin:16px 0 0;font-size:14px;color:#475569;">${esc(t("linkWarning"))}</p>`;
  const footer = `
    <p style="margin:16px 0 8px;">${esc(t("notDiagnosis"))}</p>
    <p style="margin:0 0 8px;"><a href="${esc(args.privacyUrl)}" style="color:${BRAND};">${esc(t("privacy"))}</a> · <a href="${esc(args.rightsUrl)}" style="color:${BRAND};">${esc(t("rights"))}</a></p>
    <p style="margin:0;">${esc(t("why"))}</p>`;

  const html = shell({ lang: args.locale === "pt" ? "pt-BR" : args.locale, preheader: t("preheader"), title: subject, body, footer });
  const text = [
    t("greeting"),
    "",
    lead,
    "",
    `${t("button")}: ${args.reportUrl}`,
    "",
    t("pdfNote"),
    t("linkWarning"),
    "",
    "--",
    t("notDiagnosis"),
    `${t("privacy")}: ${args.privacyUrl}`,
    `${t("rights")}: ${args.rightsUrl}`,
    t("why"),
  ].join("\n");
  return { subject, html, text };
}

export interface OwnerEmailArgs {
  requestId: string;
  verificationId: string;
  createdAt: string;
  locale: Locale;
  country: string;
  mode: "validation" | "stripe";
  versions: { app: string; model: string; data: string; manifest: string };
  inputs: AssessmentInput;
  result: CalculationResult;
  userDelivery: string;
  hasPdf: boolean;
  adminUrl: string | null;
  /** En modo stripe solo se envían metadatos operativos (sin inputs, resultados ni PDF). */
  minimal?: boolean;
}

/**
 * Email al OWNER (FR-10): id, inputs, resultados y PDF para cumplimiento manual en validation.
 * Advierte que contiene datos sensibles de bienestar y prohíbe reenvío/uso laboral (PRD §18).
 * Español: es el idioma operativo del propietario (asunto fijado por el PRD).
 */
export function renderOwnerEmail(args: OwnerEmailArgs): { subject: string; html: string; text: string } {
  const r = args.result;
  const subject = `[StressCast] Solicitud de informe ${args.requestId}`;
  const rows: [string, string][] = [
    ["ID de solicitud", args.requestId],
    ["ID de verificación", args.verificationId],
    ["Fecha (UTC)", args.createdAt],
    ["Modo", args.mode],
    ["Idioma / país", `${args.locale} / ${args.country}`],
    ["Versiones (app / modelo / datos / manifiesto)", `${args.versions.app} / ${args.versions.model} / ${args.versions.data} / ${args.versions.manifest}`],
    ["Entrega al usuario", args.userDelivery],
    ["PDF adjunto", args.hasPdf ? "sí" : args.minimal ? "no (modo stripe: solo metadatos)" : "no (fallo de generación)"],
  ];
  const inputRows = Object.entries(args.inputs).map(([k, v]) => [k, String(v)] as [string, string]);
  const resultRows: [string, string][] = [
    ["Score (0–100)", String(r.score)],
    ["Banda de referencia", r.reference_band],
    ["Escenario mejora / sin cambio / empeora (what-if)", `${r.scenario_30d.improve} / ${r.scenario_30d.no_change} / ${r.scenario_30d.worsen}`],
    ["Top 3 drivers", r.top_drivers.map((d) => `${d.rank}. ${d.input_key} (${d.burden_points})`).join(" · ")],
    ["Delta vs media PUMA", String(r.benchmark.delta_vs_puma_mean)],
  ];
  const table = (title: string, data: [string, string][]) => `
    <h3 style="margin:20px 0 8px;font-size:15px;">${esc(title)}</h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse;">
      ${data.map(([k, v]) => `<tr><td style="padding:4px 8px 4px 0;color:#475569;vertical-align:top;width:42%;">${esc(k)}</td><td style="padding:4px 0;word-break:break-word;">${esc(v)}</td></tr>`).join("")}
    </table>`;

  const body = `
    <div style="margin:0 0 16px;padding:12px 14px;border-left:4px solid #B45309;background:#FEF3C7;font-size:14px;">
      <strong>Datos sensibles de bienestar.</strong> Este correo contiene respuestas individuales y un resultado. Uso exclusivo para el cumplimiento manual de esta entrega. No lo reenvíes y no lo uses para decisiones laborales, marketing ni analítica.
    </div>
    ${table("Solicitud", rows)}
    ${args.minimal ? "" : table("Inputs (respuestas)", inputRows)}
    ${args.minimal ? "" : table("Resultados", resultRows)}
    ${args.adminUrl ? `<p style="margin:20px 0 0;font-size:13px;"><a href="${esc(args.adminUrl)}" style="color:${BRAND};">Abrir panel admin</a></p>` : ""}`;
  const html = shell({
    lang: "es",
    preheader: "Solicitud de informe — datos sensibles, no reenviar.",
    title: subject,
    body,
    footer: "<p style=\"margin:16px 0 0;\">StressCast · copia operativa en modo validation. Eliminar tras completar la entrega.</p>",
  });
  const text = [
    "DATOS SENSIBLES DE BIENESTAR — uso exclusivo para cumplimiento manual. No reenviar.",
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...(args.minimal
      ? []
      : ["", "INPUTS", ...inputRows.map(([k, v]) => `${k}: ${v}`), "", "RESULTADOS", ...resultRows.map(([k, v]) => `${k}: ${v}`)]),
  ].join("\n");
  return { subject, html, text };
}

export type PrivacyEmailKind = "verify" | "export" | "deleted" | "rectification";

/** Emails del flujo de derechos del titular (US-09): verificación, copia de datos, confirmación de borrado. */
export function renderPrivacyEmail(args: {
  locale: Locale;
  t: T;
  kind: PrivacyEmailKind;
  typeLabel?: string;
  confirmUrl?: string;
}): { subject: string; html: string; text: string } {
  const { t, kind } = args;
  const subject = t(`${kind === "verify" ? "verify" : kind}Subject`);
  const bodyText =
    kind === "verify" ? t("verifyBody", { type: args.typeLabel ?? "" }) : t(`${kind}Body`);
  const button =
    kind === "verify" && args.confirmUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="background:${BRAND};border-radius:12px;">
      <a href="${esc(args.confirmUrl)}" style="display:inline-block;padding:14px 26px;font-weight:700;font-size:16px;color:#FFFFFF;text-decoration:none;">${esc(t("verifyButton"))}</a>
    </td></tr></table><p style="margin:0;font-size:13px;color:#475569;word-break:break-all;">${esc(args.confirmUrl)}</p>`
      : "";
  const html = shell({
    lang: args.locale === "pt" ? "pt-BR" : args.locale,
    preheader: subject,
    title: subject,
    body: `<p style="margin:0 0 16px;">${esc(bodyText)}</p>${button}`,
    footer: "<p style=\"margin:16px 0 0;\">StressCast</p>",
  });
  const text = [bodyText, args.confirmUrl ? `\n${t("verifyButton")}: ${args.confirmUrl}` : ""].join("\n");
  return { subject, html, text };
}
