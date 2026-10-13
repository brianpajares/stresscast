"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Send, ShieldCheck } from "lucide-react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiClientError, createReportRequest } from "@/lib/client/api";
import {
  KEYS,
  isCompleteAnswers,
  readSession,
  useSessionValue,
  writeSession,
  type AssessmentDraft,
  type RequestOutcome,
  type StoredResult,
} from "@/lib/client/session-store";
import { track } from "@/lib/analytics/client";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function idempotencyKey(): string {
  const existing = readSession<string>(KEYS.idempotency);
  if (existing) return existing;
  const fresh = `req-${crypto.randomUUID()}`;
  writeSession(KEYS.idempotency, fresh);
  return fresh;
}

/**
 * Gate de informe (S12): un campo email, consentimiento de entrega OBLIGATORIO y marketing OPCIONAL y separado
 * (desmarcado por defecto). La copia al operador (modo validation) se revela junto al CTA, antes de enviar.
 */
export function RequestForm() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const stored = useSessionValue<StoredResult>(KEYS.result);
  const draft = useSessionValue<AssessmentDraft>(KEYS.assessment);
  const emailId = useId();
  const emailErrId = useId();
  const consentErrId = useId();
  const formErrId = useId();
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    track("report_request_view");
  }, []);

  const result = stored?.result ?? null;
  const answers = draft?.answers;

  if (!result || !isCompleteAnswers(answers)) {
    return (
      <div className="mx-auto w-full max-w-(--container-form) px-4 py-10 sm:py-16">
        <Card>
          <h1 tabIndex={-1} className="text-2xl font-extrabold tracking-tight">
            {t("request.missing")}
          </h1>
          <div className="mt-6">
            <Link href="/assessment" className={buttonVariants({ variant: "primary" })}>
              {t("request.restart")}
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  function validateEmail(value: string): boolean {
    const ok = EMAIL_RE.test(value.trim());
    setEmailError(ok ? null : t("request.invalid_email"));
    if (!ok) track("validation_error", { screen_id: "report_request", field_id: "email", error_code: "invalid_email" });
    return ok;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const emailOk = validateEmail(email);
    const consentOk = consent;
    setConsentError(consentOk ? null : t("request.consent_required"));
    if (!consentOk) track("validation_error", { screen_id: "report_request", field_id: "consent", error_code: "consent_required" });
    if (!emailOk || !consentOk) {
      document.getElementById(!emailOk ? emailId : "delivery-consent")?.focus();
      return;
    }
    if (SITE_KEY && !token) {
      setFormError(t("request.turnstileRequired"));
      return;
    }

    setSubmitting(true);
    track("report_request_submit", { marketing_opt_in: marketing });
    try {
      const created = await createReportRequest(
        {
          email: email.trim(),
          explicit_report_consent: true,
          marketing_opt_in: marketing,
          calculation: { inputs: answers, result },
          turnstile_token: token ?? "not-configured",
          locale,
        },
        idempotencyKey(),
      );
      const reportPath = created.report_url ? new URL(created.report_url).pathname + new URL(created.report_url).search : null;
      const outcome: RequestOutcome = {
        request_id: created.request_id,
        status: created.status,
        report_url: reportPath,
        mode: created.delivery ?? "email",
        locale,
      };
      writeSession(KEYS.request, outcome);
      track("report_request_success", { delivery_channel: outcome.mode });
      router.push("/report/success");
    } catch (err) {
      const code = err instanceof ApiClientError ? err.code : "unknown_error";
      track("report_request_error", { error_code: code.slice(0, 40) });
      setFormError(
        code === "rate_limited"
          ? t("request.rateLimited")
          : code === "turnstile_failed"
            ? t("request.turnstileRequired")
            : t("request.deliveryError"),
      );
      turnstileRef.current?.reset();
      setToken(null);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-(--container-form) px-4 py-8 sm:py-12">
      <Link href="/results/preview" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("request.back")}
      </Link>

      <Card className="mt-4 animate-fade-up">
        <h1 tabIndex={-1} className="text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">
          {t("request.title")}
        </h1>
        <p className="mt-2 text-muted">{t("request.body")}</p>

        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
          <div>
            <label htmlFor={emailId} className="block text-sm font-bold">
              {t("request.email")}
            </label>
            <input
              id={emailId}
              type="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              placeholder={t("request.email_placeholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => email && validateEmail(email)}
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? emailErrId : undefined}
              className="mt-2 block min-h-[3.25rem] w-full rounded-md border border-border bg-surface px-4 text-base"
            />
            <p className="mt-1.5 text-sm text-muted">{t("request.emailHint")}</p>
            {emailError ? (
              <p id={emailErrId} role="alert" className="mt-1.5 text-sm font-semibold text-danger">
                {emailError}
              </p>
            ) : null}
          </div>

          <div>
            <label className="flex min-h-11 cursor-pointer items-start gap-3">
              <input
                id="delivery-consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => {
                  setConsent(e.target.checked);
                  if (e.target.checked) setConsentError(null);
                }}
                aria-invalid={consentError ? true : undefined}
                aria-describedby={consentError ? consentErrId : undefined}
                className="mt-1 size-5 shrink-0 accent-[var(--primary)]"
              />
              <span>{t("request.consent")}</span>
            </label>
            {consentError ? (
              <p id={consentErrId} role="alert" className="mt-1 text-sm font-semibold text-danger">
                {consentError}
              </p>
            ) : null}

            <label className="mt-2 flex min-h-11 cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="mt-1 size-5 shrink-0 accent-[var(--primary)]"
              />
              <span className="text-muted">{t("request.marketing")}</span>
            </label>
          </div>

          <div className="rounded-md border border-border bg-surface-alt p-4 text-sm">
            <p className="flex items-center gap-2 font-bold">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              {t("request.disclosureTitle")}
            </p>
            <p className="mt-1.5 text-muted">{t("request.privacy")}</p>
            <p className="mt-2">
              <Link href="/legal/privacy" className="font-semibold text-primary underline underline-offset-4">
                {t("request.privacyLink")}
              </Link>
            </p>
          </div>

          {SITE_KEY ? (
            <div>
              <Turnstile
                ref={turnstileRef}
                siteKey={SITE_KEY}
                options={{ theme: "auto", size: "flexible", language: locale === "pt" ? "pt-br" : locale }}
                onSuccess={(tk) => {
                  setToken(tk);
                  setFormError(null);
                }}
                onExpire={() => setToken(null)}
                onError={() => {
                  setToken(null);
                  setFormError(t("request.turnstileError"));
                }}
              />
              <p className="mt-1 text-xs text-muted">{t("request.securedBy")}</p>
            </div>
          ) : null}

          {formError ? (
            <p id={formErrId} role="alert" className="font-semibold text-danger">
              {formError}
            </p>
          ) : null}

          <Button type="submit" size="lg" block loading={submitting}>
            <Send className="size-5" aria-hidden="true" />
            {submitting ? t("request.submitting") : t("request.cta")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
