import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const T12 = ["high", "somewhat", "somewhat", "always", "often", "sometimes", "seldom"] as const;
export const OPTION_INDEX: Record<string, number> = {
  very_low: 1, low: 2, somewhat: 3, high: 4, very_high: 5,
  never: 1, seldom: 2, sometimes: 3, often: 4, always: 5,
};

export interface OutboxItem {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments: { filename: string; bytes: number; magic: string }[];
}

export async function getOutbox(request: APIRequestContext): Promise<OutboxItem[]> {
  const res = await request.get("/api/e2e/outbox");
  expect(res.status()).toBe(200);
  return (await res.json()) as OutboxItem[];
}

/** Descarta el banner de consentimiento (preferencia: no, gracias) para no tapar controles. */
export async function declineAnalytics(page: Page) {
  const btn = page.getByRole("button", { name: /^(No, gracias|No, thanks|Não, obrigado)$/ });
  if (await btn.isVisible().catch(() => false)) await btn.click();
}

/** Recorre el cuestionario usando SOLO teclado en los ítems (dígitos 1–5 + Enter). */
export async function completeAssessment(page: Page, locale: "es" | "en" | "pt", country = "ES", answers: readonly string[] = T12) {
  await page.goto(`/${locale}/assessment`);
  await declineAnalytics(page);
  await page.locator("#country-select").selectOption(country);
  await page.locator("form button[type=submit]").click();
  for (const a of answers) {
    await expect(page.locator("h1")).toBeFocused(); // gestión de foco por paso
    await page.keyboard.press(String(OPTION_INDEX[a]));
    await page.keyboard.press("Enter");
  }
  await page.waitForURL(/\/results\/preview/);
}
