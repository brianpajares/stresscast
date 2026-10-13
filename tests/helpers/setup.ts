import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import { createTranslator } from "use-intl/core";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import pt from "@/messages/pt.json";

/**
 * Mocks globales de infraestructura de Next que no existe fuera de una petición real:
 *  - next-intl/server.getTranslations → traductor real (use-intl) sobre nuestros JSON.
 *  - next/server.after → encola la tarea; los tests la esperan con `flushAfter()`.
 */
const MESSAGES = { en, es, pt } as const;

vi.mock("next-intl/server", async () => {
  const getTranslations = async (arg?: string | { locale?: string; namespace?: string }) => {
    const opts = typeof arg === "string" ? { namespace: arg } : (arg ?? {});
    const locale = (opts.locale ?? "en") as keyof typeof MESSAGES;
    return createTranslator({ locale, messages: MESSAGES[locale] as never, namespace: opts.namespace as never });
  };
  return { getTranslations, setRequestLocale: () => undefined, getMessages: async () => en, getLocale: async () => "en" };
});

declare global {
  // eslint-disable-next-line no-var
  var __afterQueue: Promise<unknown>[];
}
globalThis.__afterQueue = [];

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: (task: (() => unknown) | Promise<unknown>) => {
      globalThis.__afterQueue.push(Promise.resolve().then(typeof task === "function" ? task : () => task));
    },
  };
});
