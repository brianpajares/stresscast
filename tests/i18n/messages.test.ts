import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createTranslator } from "use-intl/core";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import pt from "@/messages/pt.json";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
const root = resolve(__dirname, "../..");
const canonical = JSON.parse(readFileSync(resolve(root, "spec/copy_i18n.json"), "utf8")) as Record<string, Record<string, Json>>;
const messages = { en, es, pt } as unknown as Record<"en" | "es" | "pt", Record<string, Json>>;

function flatten(obj: Json, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  if (typeof obj === "string") {
    out[prefix] = obj;
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  } else if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

describe("Paridad de claves es/en/pt", () => {
  const enKeys = Object.keys(flatten(en as Json)).sort();
  for (const loc of ["es", "pt"] as const) {
    it(`${loc} tiene exactamente las mismas claves que en`, () => {
      const keys = Object.keys(flatten(messages[loc] as Json)).sort();
      expect(keys.filter((k) => !enKeys.includes(k))).toEqual([]);
      expect(enKeys.filter((k) => !keys.includes(k))).toEqual([]);
    });
  }

  it("ningún valor está vacío salvo translationPreliminar en inglés", () => {
    for (const loc of ["en", "es", "pt"] as const) {
      const flat = flatten(messages[loc] as Json);
      for (const [k, v] of Object.entries(flat)) {
        if (loc === "en" && k === "assessment.translationPreliminary") continue;
        expect(v.trim().length, `${loc}:${k}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("Copy canónico (spec/copy_i18n.json) preservado verbatim", () => {
  // `success.*` en el spec es copy de prototipo (“En este prototipo…”): se sustituye por copy de producción.
  const namespaces = ["landing", "country", "questions", "degree", "frequency", "assessment", "processing", "preview", "request", "report", "legal"];
  for (const loc of ["es", "en", "pt"] as const) {
    it(`${loc}: claves canónicas idénticas`, () => {
      for (const ns of namespaces) {
        const canon = flatten(canonical[loc][ns] as Json, ns);
        const mine = flatten(messages[loc][ns] as Json, ns);
        for (const [key, value] of Object.entries(canon)) {
          expect(mine[key], `${loc}:${key}`).toBe(value);
        }
      }
      expect(messages[loc].meta).toMatchObject({ tagline: canonical[loc].tagline });
    });
  }
});

describe("AT-07 · claims prohibidos solo aparecen negados", () => {
  const risky = /predic|forecast|pron[oó]stic|probabilit|probabilidad|diagn[oó]stic|diagnos|previs[aã]o|cura\b|\brisk\b|riesgo|risco/i;
  const negation: Record<"en" | "es" | "pt", RegExp> = {
    en: /\b(not|no|never|nor|without|cannot|n’t)\b/i,
    es: /\b(no|ni|nunca|sin|jamás)\b/i,
    pt: /\b(não|nem|nunca|sem)\b/i,
  };
  const allowKeys = new Set([
    "report.methodTable.predictive.k", // etiqueta de fila cuyo valor es "No"
    "landing.faq.diagnosis.q", // pregunta cuya respuesta lo niega explícitamente
  ]);
  for (const loc of ["en", "es", "pt"] as const) {
    it(`${loc}: cada mención a predicción/diagnóstico/probabilidad está negada`, () => {
      const flat = flatten(messages[loc] as Json);
      const offenders: string[] = [];
      for (const [k, v] of Object.entries(flat)) {
        if (allowKeys.has(k)) continue;
        if (risky.test(v) && !negation[loc].test(v)) offenders.push(`${k}: ${v}`);
      }
      expect(offenders).toEqual([]);
    });
  }
});

describe("ICU: todos los mensajes formatean sin errores", () => {
  const values = {
    current: 3, score: "67,9", version: "1.0.0", year: 2026, date: "7 oct 2026", driver: "X", k: 2, low: "60,7", high: "75,0",
    one: "3,57", two: "7,14", page: 1, total: 7, type: "x", points: "12,3", mean: "33,0", sd: "17,7", n: "1.910", share: "19,8%", alpha: "0,87", days: 30,
  };
  for (const loc of ["en", "es", "pt"] as const) {
    it(`${loc}: sin errores de sintaxis ICU`, () => {
      const t = createTranslator({ locale: loc, messages: messages[loc] as never, onError: (e) => { throw e; } });
      const flat = flatten(messages[loc] as Json);
      for (const key of Object.keys(flat)) {
        const k = key.replace(/\[(\d+)\]/g, ".$1");
        // Las listas se leen con t.raw; aquí validamos solo los strings escalares.
        if (/\.\d+$/.test(k)) continue;
        expect(() => (t as unknown as (k: string, v: object) => string)(k, values), `${loc}:${k}`).not.toThrow();
      }
    });
  }
});
