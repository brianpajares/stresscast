"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Mail } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";
import { KEYS, clearFlow, useSessionValue, type RequestOutcome } from "@/lib/client/session-store";
import { track } from "@/lib/analytics/client";

/** Éxito (S13): confirma la entrega y ofrece abrir el informe privado. No muestra datos sensibles. */
export function SuccessView() {
  const t = useTranslations("success");
  const router = useRouter();
  const outcome = useSessionValue<RequestOutcome>(KEYS.request);

  useEffect(() => {
    if (outcome) track("report_success_view");
  }, [outcome]);

  if (!outcome) {
    return (
      <div className="mx-auto w-full max-w-(--container-form) px-4 py-10 sm:py-16">
        <Card>
          <h1 tabIndex={-1} className="text-2xl font-extrabold tracking-tight">
            {t("missing")}
          </h1>
          <div className="mt-6">
            <Link href="/" className={buttonVariants({ variant: "primary" })}>
              {t("again")}
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const body = outcome.mode === "demo" ? t("bodyDemo") : outcome.mode === "pending" ? t("bodyPending") : t("bodyEmail");

  return (
    <div className="mx-auto w-full max-w-(--container-form) px-4 py-10 sm:py-16">
      <Card className="animate-fade-up">
        <Eyebrow className="flex items-center gap-2">
          <CheckCircle2 className="size-5" aria-hidden="true" />
          StressCast
        </Eyebrow>
        <h1 tabIndex={-1} className="mt-3 text-balance text-3xl font-extrabold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-3 flex gap-3 text-muted" role="status">
          <Mail className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <span>{body}</span>
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {outcome.report_url ? (
            <a
              href={outcome.report_url}
              onClick={() => track("report_open_click")}
              className={buttonVariants({ variant: "primary", size: "lg" })}
            >
              {t("cta")}
            </a>
          ) : null}
          <Button
            variant="ghost"
            onClick={() => {
              clearFlow();
              router.push("/");
            }}
          >
            {t("again")}
          </Button>
        </div>
        {outcome.report_url ? <p className="mt-4 text-sm text-muted">{t("linkNote")}</p> : null}
      </Card>
    </div>
  );
}
