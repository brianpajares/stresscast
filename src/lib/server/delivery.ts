import "server-only";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import type { ReportData } from "@/lib/report/data";
import { getEnv, reportLinkTtlDays } from "./env";
import { logWarn } from "./log";
import { sendEmail, type SendOutcome } from "./email/client";
import { renderOwnerEmail, renderUserEmail } from "./email/templates";
import { pdfFilename, renderReportPdf } from "./pdf";
import { siteUrl } from "@/lib/site";
import type { ReportStore, RequestStatus } from "./store/types";

export interface DeliverArgs {
  store: ReportStore | null;
  data: ReportData;
  email: string;
  leadId: string | null;
  mode: "validation" | "stripe";
  /** Token en claro para el enlace (nunca se persiste en claro). */
  token: string;
  /** "initial" o un hash de la Idempotency-Key del reenvío admin: evita duplicar entregas lógicas. */
  discriminator: string;
  locale: Locale;
}

export interface DeliverOutcome {
  user: SendOutcome;
  owner: SendOutcome | { status: "not_applicable" };
  status: RequestStatus;
  pdf: boolean;
}

export function reportUrlFor(locale: Locale, requestId: string, token: string): string {
  return `${siteUrl()}/${locale}/report/${requestId}?token=${encodeURIComponent(token)}`;
}

/**
 * Entrega del informe (FR-10, FR-26, FR-27). Idempotente: cada envío tiene una clave
 * `deliver:{request}:{discriminador}:{destinatario}` usada en BD y como Idempotency-Key de Resend, por lo que
 * un reintento o doble clic no duplica el email. Los fallos dejan la solicitud en un estado reintentable.
 */
export async function deliverReport(args: DeliverArgs): Promise<DeliverOutcome> {
  const { store, data } = args;
  const requestId = data.requestId;
  const baseKey = `deliver:${requestId}:${args.discriminator}`;
  await store?.setStatus(requestId, "preparing").catch(() => undefined);

  // ---- usuario
  const tu = await getTranslations({ locale: args.locale, namespace: "emails.user" });
  const url = reportUrlFor(args.locale, requestId, args.token);
  const userMail = renderUserEmail({
    locale: args.locale,
    t: (k, v) => tu(k as never, v as never),
    reportUrl: url,
    privacyUrl: `${siteUrl()}/${args.locale}/legal/privacy`,
    rightsUrl: `${siteUrl()}/${args.locale}/legal/privacy-request`,
    ttlDays: reportLinkTtlDays(),
  });
  const userKey = `${baseKey}:user`;
  await store?.recordDelivery({ leadId: args.leadId, requestId, recipientKind: "user", templateKey: "report_ready", status: "queued", idempotencyKey: userKey }).catch(() => undefined);
  const user = await sendEmail({ to: args.email, ...userMail, idempotencyKey: userKey });
  await store
    ?.recordDelivery({
      leadId: args.leadId,
      requestId,
      recipientKind: "user",
      templateKey: "report_ready",
      status: user.status === "sent" ? "sent" : "failed",
      providerMessageId: user.status === "sent" ? user.id : null,
      errorCode: user.status === "sent" ? null : user.status === "skipped" ? user.code : user.code,
      idempotencyKey: userKey,
    })
    .catch(() => undefined);

  // ---- owner (copia operativa)
  let owner: DeliverOutcome["owner"] = { status: "not_applicable" };
  let pdfOk = false;
  const ownerEmail = getEnv().OWNER_EMAIL;
  if (ownerEmail) {
    let pdf: Buffer | null = null;
    // En validation el PDF completo viaja al owner (FR-10); en stripe solo metadatos operativos.
    if (args.mode === "validation") {
      try {
        pdf = await renderReportPdf(data, "es");
        pdfOk = true;
      } catch (e) {
        logWarn("pdf_render_failed", { error: e instanceof Error ? e.name : "unknown" });
      }
    }
    const ownerMail = renderOwnerEmail({
      requestId,
      verificationId: data.verificationId,
      createdAt: data.issuedAt,
      locale: data.locale,
      country: data.inputs.country,
      mode: args.mode,
      versions: data.versions,
      inputs: data.inputs,
      result: data.result,
      userDelivery: user.status === "sent" ? "enviada" : user.status === "skipped" ? "pendiente (email no configurado)" : `fallida (${user.code})`,
      hasPdf: pdfOk,
      adminUrl: `${siteUrl()}/admin`,
      minimal: args.mode === "stripe",
    });
    const ownerKey = `${baseKey}:owner`;
    await store?.recordDelivery({ leadId: args.leadId, requestId, recipientKind: "owner", templateKey: "owner_copy", status: "queued", idempotencyKey: ownerKey }).catch(() => undefined);
    owner = await sendEmail({
      to: ownerEmail,
      ...ownerMail,
      attachments: pdf ? [{ filename: pdfFilename(data), content: pdf }] : undefined,
      idempotencyKey: ownerKey,
    });
    await store
      ?.recordDelivery({
        leadId: args.leadId,
        requestId,
        recipientKind: "owner",
        templateKey: "owner_copy",
        status: owner.status === "sent" ? "sent" : "failed",
        providerMessageId: owner.status === "sent" ? owner.id : null,
        errorCode: owner.status === "sent" ? null : owner.code,
        idempotencyKey: ownerKey,
      })
      .catch(() => undefined);
  }

  const status: RequestStatus = user.status === "sent" ? "delivered" : user.status === "skipped" ? "delivery_pending" : "delivery_failed";
  await store?.setStatus(requestId, status, user.status === "sent" ? null : user.code).catch(() => undefined);
  return { user, owner, status, pdf: pdfOk };
}
