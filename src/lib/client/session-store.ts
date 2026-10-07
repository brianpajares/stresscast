"use client";

/**
 * Estado efímero del flujo en sessionStorage (ux/sitemap_flows.md: nada sensible en URL,
 * respuestas solo en sesión del navegador). Se reinicia al cerrar la pestaña.
 */
import { useCallback, useSyncExternalStore } from "react";
import type { AssessmentInput, CalculationResult } from "@/engine/types";

const EVENT = "sc-session-store";

export const KEYS = {
  assessment: "sc-assessment",
  result: "sc-result",
  request: "sc-request",
  idempotency: "sc-idem",
} as const;

export interface AssessmentDraft {
  step: number;
  answers: Partial<AssessmentInput>;
}

export interface RequestOutcome {
  request_id: string;
  status: "accepted" | "preparing" | "delivered";
  report_url: string | null;
  mode: "email" | "pending" | "demo";
  locale: string;
}

const cache = new Map<string, { raw: string | null; value: unknown }>();

function read<T>(key: string): T | null {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(key);
  } catch {
    raw = null;
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T | null;
  let value: unknown = null;
  if (raw) {
    try {
      value = JSON.parse(raw);
    } catch {
      value = null;
    }
  }
  cache.set(key, { raw, value });
  return value as T | null;
}

export function writeSession<T>(key: string, value: T | null): void {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin storage (modo privado estricto): mantenemos en memoria para esta pestaña.
    cache.set(key, { raw: value === null ? null : JSON.stringify(value), value });
  }
  window.dispatchEvent(new Event(EVENT));
}

export function readSession<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  return read<T>(key);
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Hook: valor de sessionStorage con SSR seguro (null en servidor y en la primera hidratación). */
export function useSessionValue<T>(key: string): T | null {
  const getSnapshot = useCallback(() => read<T>(key), [key]);
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function clearFlow(): void {
  for (const key of Object.values(KEYS)) writeSession(key, null);
  try {
    window.sessionStorage.removeItem("sc-market");
    window.sessionStorage.removeItem("sc-started-at");
  } catch {
    /* noop */
  }
}

export function isCompleteAnswers(a: Partial<AssessmentInput> | null | undefined): a is AssessmentInput {
  return !!a && Object.keys(a).length === 8 && Object.values(a).every((v) => typeof v === "string");
}

export type StoredResult = { result: CalculationResult };
