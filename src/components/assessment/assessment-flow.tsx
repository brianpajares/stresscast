"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import {
  COUNTRIES,
  DEGREE_RESPONSES,
  FREQUENCY_RESPONSES,
  ITEM_KEYS,
  ITEM_SCALE,
  type AssessmentInput,
  type Country,
  type ItemKey,
} from "@/engine/types";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import { ChoiceCard } from "./choice-card";
import { StepProgress } from "./step-progress";
import { KEYS, useSessionValue, writeSession, type AssessmentDraft } from "@/lib/client/session-store";
import { countryName } from "@/lib/format";
import { elapsedSinceStart, rememberMarket, track } from "@/lib/analytics/client";

const STEP_KEYS = ["country", ...ITEM_KEYS] as const;
const TOTAL = STEP_KEYS.length; // 8
type StepKey = (typeof STEP_KEYS)[number];

const EMPTY: AssessmentDraft = { step: 0, answers: {} };

function isCountry(v: unknown): v is Country {
  return typeof v === "string" && (COUNTRIES as readonly string[]).includes(v);
}

function browserCountrySuggestion(): Country | null {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    return region && isCountry(region) ? region : null;
  } catch {
    return null;
  }
}

export function AssessmentFlow() {
  const draftStored = useSessionValue<AssessmentDraft>(KEYS.assessment);
  const draft = draftStored ?? EMPTY;
  const step = Math.min(Math.max(draft.step, 0), TOTAL - 1);
  const navigated = useRef(false);
  const [restored, setRestored] = useState(false);
  const checkedRestore = useRef(false);

  useEffect(() => {
    if (checkedRestore.current || draftStored === null) return;
    checkedRestore.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- aviso de restauración solo en cliente
    if (draftStored.step > 0 || Object.keys(draftStored.answers).length > 0) setRestored(true);
  }, [draftStored]);

  function go(next: AssessmentDraft) {
    navigated.current = true;
    setRestored(false);
    writeSession(KEYS.assessment, next);
  }

  return (
    <StepForm
      key={step}
      step={step}
      draft={draft}
      focusHeading={navigated.current}
      restored={restored}
      onChange={go}
    />
  );
}

function StepForm({
  step,
  draft,
  focusHeading,
  restored,
  onChange,
}: {
  step: number;
  draft: AssessmentDraft;
  focusHeading: boolean;
  restored: boolean;
  onChange: (next: AssessmentDraft) => void;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const errorId = useId();
  const hintId = useId();

  const key: StepKey = STEP_KEYS[step];
  const isCountryStep = key === "country";
  const stored = draft.answers[key as keyof AssessmentInput] as string | undefined;
  const [pending, setPending] = useState<string>(stored ?? "");
  const [suggested, setSuggested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gestión de foco (WCAG): el heading de la nueva pantalla recibe foco programático.
  useEffect(() => {
    if (focusHeading) headingRef.current?.focus();
    track("assessment_step_view", { step_index: step + 1, question_id: key });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una vez por pantalla (el componente se remonta por paso)
  }, []);

  // País: proponer según idioma del navegador, siempre a confirmar (nunca se infiere como hecho).
  useEffect(() => {
    if (!isCountryStep || stored) return;
    const s = browserCountrySuggestion();
    if (s) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- navigator solo existe en el cliente
      setPending(s);
      setSuggested(true);
    }
  }, [isCountryStep, stored]);

  const options = useMemo<readonly string[]>(() => {
    if (isCountryStep) {
      const collator = new Intl.Collator(locale);
      return [...COUNTRIES].sort((a, b) => collator.compare(countryName(a, locale), countryName(b, locale)));
    }
    return ITEM_SCALE[key as ItemKey] === "degree" ? DEGREE_RESPONSES : FREQUENCY_RESPONSES;
  }, [isCountryStep, key, locale]);

  const scaleNs = !isCountryStep && ITEM_SCALE[key as ItemKey] === "degree" ? "degree" : "frequency";
  const title = isCountryStep ? t("country.title") : t(`questions.${key}`);

  function select(value: string) {
    setPending(value);
    setSuggested(false);
    setError(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pending) {
      const message = isCountryStep ? t("country.required") : t("assessment.required");
      setError(message);
      track("validation_error", { screen_id: "assessment", field_id: key, error_code: "required" });
      formRef.current?.querySelector<HTMLElement>("input, select")?.focus();
      return;
    }
    const answers = { ...draft.answers, [key]: pending } as Partial<AssessmentInput>;
    if (isCountryStep) rememberMarket(pending);
    track("assessment_step_complete", {
      step_index: step + 1,
      question_id: key,
      elapsed_bucket: elapsedSinceStart() ?? "<30s",
    });
    if (step < TOTAL - 1) {
      onChange({ step: step + 1, answers });
    } else {
      onChange({ step, answers });
      router.push("/assessment/processing");
    }
  }

  function onBack() {
    const answers = pending ? ({ ...draft.answers, [key]: pending } as Partial<AssessmentInput>) : draft.answers;
    onChange({ step: Math.max(step - 1, 0), answers });
  }

  // Atajos 1–5 para elegir y Enter para continuar (no interfiere con el select de país).
  function onKeyDown(e: React.KeyboardEvent) {
    if (isCountryStep) return;
    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 1 && n <= options.length && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      select(options[n - 1]);
      formRef.current?.querySelector<HTMLInputElement>(`input[value="${options[n - 1]}"]`)?.focus();
    }
  }

  const progressText = t("assessment.progress", { current: step + 1 });
  const showPrelim = locale !== "en" && t("assessment.translationPreliminary");

  return (
    <div className="mx-auto w-full max-w-(--container-form) px-4 py-8 sm:py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <StepProgress
            current={step + 1}
            total={TOTAL}
            label={t("assessment.progressLabel")}
            text={progressText}
          />
        </div>
        {showPrelim ? <p className="text-xs font-semibold text-muted">{showPrelim}</p> : null}
      </div>

      <Card className="animate-fade-up">
        <form ref={formRef} onSubmit={onSubmit} onKeyDown={onKeyDown} noValidate>
          <fieldset aria-describedby={error ? errorId : hintId} className="min-w-0 border-0 p-0">
            <legend className="mb-1 w-full">
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="text-balance text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl"
              >
                {title}
              </h1>
            </legend>

            {isCountryStep ? (
              <div className="mt-3">
                <p id={hintId} className="text-muted">
                  {t("country.help")}
                </p>
                <div className="mt-6">
                  <label htmlFor="country-select" className="block text-sm font-bold">
                    {t("country.label")}
                  </label>
                  <select
                    id="country-select"
                    name="country"
                    value={pending}
                    onChange={(e) => select(e.target.value)}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    autoComplete="country"
                    className="mt-2 block min-h-14 w-full rounded-md border border-border bg-surface px-4 text-base"
                  >
                    <option value="" disabled>
                      {t("country.placeholder")}
                    </option>
                    {options.map((c) => (
                      <option key={c} value={c}>
                        {countryName(c, locale)} ({c})
                      </option>
                    ))}
                  </select>
                  {suggested && pending ? (
                    <p className="mt-2 text-sm text-muted" role="status">
                      {t("country.suggested")}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <p id={hintId} className="sr-only">
                  {t("assessment.optionsLabel")}
                </p>
                <div className="grid gap-2.5" role="presentation">
                  {options.map((value, i) => (
                    <ChoiceCard
                      key={value}
                      name={key}
                      value={value}
                      label={t(`${scaleNs}.${value}`)}
                      checked={pending === value}
                      onChange={select}
                      hotkey={i + 1}
                      describedBy={error ? errorId : undefined}
                    />
                  ))}
                </div>
                <p className="mt-3 hidden items-center gap-1.5 text-xs text-muted sm:flex">
                  {t("assessment.keyboardHint")}
                </p>
              </div>
            )}
          </fieldset>

          {error ? (
            <p id={errorId} role="alert" className="mt-4 font-semibold text-danger">
              {error}
            </p>
          ) : null}

          <Disclosure
            className="mt-6"
            summary={
              <span className="inline-flex items-center gap-2 text-sm">
                <Info className="size-4 text-primary" aria-hidden="true" />
                {t("assessment.whyTitle")}
              </span>
            }
          >
            <p className="text-sm">{isCountryStep ? t("assessment.whyCountry") : t("assessment.whyItem")}</p>
            {key === "energy_family_friends" ? <p className="mt-2 text-sm">{t("assessment.reverseHint")}</p> : null}
          </Disclosure>

          <p className="mt-5 text-sm text-muted">{t("assessment.privacy")}</p>
          {restored ? (
            <p className="mt-2 text-sm font-medium text-primary" role="status">
              {t("assessment.restored")}
            </p>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-3">
            {step > 0 ? (
              <Button type="button" variant="ghost" onClick={onBack}>
                <ArrowLeft className="size-5" aria-hidden="true" />
                {t("assessment.back")}
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit">
              {t("assessment.next")}
              <ArrowRight className="size-5" aria-hidden="true" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
