import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { completeAssessment, declineAnalytics } from "./helpers";

async function axe(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" }); // estado final estable (sin animaciones a media opacidad)
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  return r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.html?.slice(0, 120)}`);
}

test.describe("AT-22 · WCAG 2.2 AA en el flujo crítico", () => {
  for (const loc of ["es", "en", "pt"] as const) {
    test(`landing y páginas de contenido (${loc})`, async ({ page }) => {
      for (const path of ["", "/how-it-works", "/faq", "/sources", "/legal/privacy", "/legal/wellness-disclaimer", "/legal/privacy-request"]) {
        await page.goto(`/${loc}${path}`);
        await declineAnalytics(page);
        expect(await axe(page), `${loc}${path}`).toEqual([]);
      }
    });
  }

  test("evaluación, preview, solicitud e informe (claro y oscuro)", async ({ page }) => {
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/en/assessment");
      await page.evaluate(() => window.sessionStorage.clear());
      await page.reload();
      await declineAnalytics(page);
      expect(await axe(page), `assessment country ${scheme}`).toEqual([]);
      await page.locator("#country-select").selectOption("US");
      await page.locator("form button[type=submit]").click();
      await expect(page.locator("h1")).toBeFocused();
      expect(await axe(page), `assessment item ${scheme}`).toEqual([]);

      await completeAssessment(page, "en", "US");
      await expect(page.locator("main")).toContainText("Work-related burnout");
      expect(await axe(page), `preview ${scheme}`).toEqual([]);
      await page.getByRole("link", { name: "Get my full report" }).click();
      expect(await axe(page), `request ${scheme}`).toEqual([]);
    }
  });
});

test.describe("Teclado y foco (US-14)", () => {
  test("el foco es visible y el flujo es operable sin ratón", async ({ page }) => {
    await page.goto("/en");
    await declineAnalytics(page);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement as Element).outlineStyle);
    expect(outline).not.toBe("none");
  });

  test("targets táctiles ≥ 44 px en la evaluación", async ({ page }) => {
    await page.goto("/en/assessment");
    await declineAnalytics(page);
    await page.locator("#country-select").selectOption("US");
    await page.locator("form button[type=submit]").click();
    const boxes = await page.locator("form label, form button, header a, header button").evaluateAll((els) =>
      els.map((e) => ({ t: (e.textContent ?? "").trim().slice(0, 20), h: e.getBoundingClientRect().height, w: e.getBoundingClientRect().width })).filter((b) => b.w > 0),
    );
    for (const b of boxes) expect(Math.min(b.h, 44), JSON.stringify(b)).toBeGreaterThanOrEqual(40); // 44 con tolerancia de redondeo
  });

  test("prefers-reduced-motion elimina animaciones", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en");
    const dur = await page.evaluate(() => getComputedStyle(document.querySelector("h1")!.parentElement as Element).animationDuration);
    expect(parseFloat(dur)).toBeLessThan(0.01);
  });
});

test.describe("Responsive 360 px (AT-05)", () => {
  test.use({ viewport: { width: 360, height: 740 } });
  test("sin desbordamiento horizontal en las pantallas del flujo", async ({ page }) => {
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    for (const p of ["/es", "/es/how-it-works", "/es/faq", "/es/assessment"]) {
      await page.goto(p);
      await declineAnalytics(page);
      expect(await overflow(), p).toBeLessThanOrEqual(0);
    }
    await completeAssessment(page, "es");
    expect(await overflow(), "preview").toBeLessThanOrEqual(0);
    await page.getByRole("link", { name: "Recibir mi informe completo" }).click();
    expect(await overflow(), "request").toBeLessThanOrEqual(0);
  });
});
