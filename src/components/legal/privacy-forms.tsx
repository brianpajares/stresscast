"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiClientError, createPrivacyRequest } from "@/lib/client/api";
import { useSearchParams } from "next/navigation";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type RequestType = "access" | "deletion" | "rectification";

/** Formulario de derechos del titular (FR-14). No revela si el email existe: siempre muestra el mismo aviso. */
export function PrivacyRequestForm() {
  const t = useTranslations("legal.rights");
  const emailId = useId();
  const errId = useId();
  const [email, setEmail] = useState("");
  const [type, setType] = useState<RequestType>("access");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError(t("invalid_email"));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await createPrivacyRequest(email.trim(), type, `priv-${crypto.randomUUID()}`);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiClientError && err.code === "rate_limited" ? t("rateLimited") : t("error"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card role="status">
        <p className="font-semibold">{t("success")}</p>
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-muted">{t("lead")}</p>
      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        <div>
          <label htmlFor={emailId} className="block text-sm font-bold">
            {t("email")}
          </label>
          <input
            id={emailId}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errId : undefined}
            className="mt-2 block min-h-[3.25rem] w-full rounded-md border border-border bg-surface px-4 text-base"
          />
        </div>
        <fieldset>
          <legend className="text-sm font-bold">{t("type")}</legend>
          <div className="mt-2 grid gap-2">
            {(["access", "deletion", "rectification"] as const).map((k) => (
              <label key={k} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border bg-surface px-4">
                <input
                  type="radio"
                  name="request_type"
                  value={k}
                  checked={type === k}
                  onChange={() => setType(k)}
                  className="size-5 accent-[var(--primary)]"
                />
                <span>{t(k === "access" ? "typeAccess" : k === "deletion" ? "typeDeletion" : "typeRectification")}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error ? (
          <p id={errId} role="alert" className="font-semibold text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" block loading={busy}>
          {t("submit")}
        </Button>
      </form>
    </Card>
  );
}

/** Confirmación de un solo uso (POST, no GET: los escáneres de enlaces no deben disparar un borrado). */
export function PrivacyConfirm() {
  const t = useTranslations("legal.rights");
  const locale = useLocale();
  const params = useSearchParams();
  const id = params.get("id");
  const token = params.get("token");
  const [state, setState] = useState<"idle" | "busy" | "done" | "invalid" | "error">(id && token ? "idle" : "invalid");

  async function confirm() {
    setState("busy");
    try {
      const res = await fetch("/api/privacy/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, token, locale }),
      });
      setState(res.ok ? "done" : res.status === 400 ? "invalid" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <Card role="status">
      {state === "done" ? <p className="font-semibold">{t("confirmDone")}</p> : null}
      {state === "invalid" ? <p className="font-semibold text-danger">{t("confirmInvalid")}</p> : null}
      {state === "error" ? <p className="font-semibold text-danger">{t("confirmError")}</p> : null}
      {state === "idle" || state === "busy" || state === "error" ? (
        <div className={state === "error" ? "mt-4" : ""}>
          <p className="mb-4 text-muted">{t("confirmBody")}</p>
          <Button onClick={confirm} loading={state === "busy"}>
            {t("confirmButton")}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
