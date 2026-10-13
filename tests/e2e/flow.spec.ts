import { expect, test } from "@playwright/test";
import { completeAssessment, declineAnalytics, getOutbox } from "./helpers";

test.describe("Flujo principal: landing → evaluación → preview → solicitud → informe → PDF", () => {
  test("ES · de punta a punta, con teclado en los ítems", async ({ page, request }) => {
    await request.delete("/api/e2e/outbox");
    await page.goto("/es");
    await declineAnalytics(page);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("agotamiento laboral");
    await page.getByRole("link", { name: "Empezar mi chequeo" }).first().click();
    await page.waitForURL(/\/es\/assessment$/);

    // El país se SUGIERE desde el navegador y hay que confirmarlo (nunca se infiere como hecho)
    await expect(page.getByText("Sugerido según la configuración de tu navegador")).toBeVisible();
    await page.locator("#country-select").selectOption("MX");
    await page.locator("form button[type=submit]").click();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Pregunta 2 de 8");
    // Sin selección => error accesible y se queda en el paso
    await page.locator("form button[type=submit]").click();
    await expect(page.locator("main [role=alert]")).toContainText("Elige una opción para continuar");
    await page.getByRole("button", { name: "Atrás" }).click();
    await expect(page.locator("#country-select")).toHaveValue("MX"); // Atrás conserva la respuesta
    await page.locator("form button[type=submit]").click();

    for (const digit of ["4", "3", "3", "5", "4", "3", "2"]) {
      await expect(page.locator("h1")).toBeFocused();
      await page.keyboard.press(digit);
      await page.keyboard.press("Enter");
    }
    await page.waitForURL(/\/es\/results\/preview/);

    // Preview T12: 67,9 + referencia + driver; sin cifras de escenarios
    const main = page.locator("main");
    await expect(main).toContainText("67,9");
    await expect(main).toContainText("Referencia PUMA 50");
    await expect(main).toContainText("Terminar agotado/a al final de la jornada");
    await expect(main).not.toContainText("60,7");
    await expect(main).not.toContainText("75,0");
    await expect(main.getByText("— —")).toHaveCount(3);

    await page.getByRole("link", { name: "Recibir mi informe completo" }).click();
    await page.waitForURL(/\/es\/report\/request/);
    await expect(page.getByText("se envía al operador de StressCast")).toBeVisible(); // disclosure antes del submit

    // Validaciones del gate (AT-08/AT-09)
    await page.getByRole("button", { name: "Enviar mi informe" }).click();
    await expect(page.getByText("Introduce un email válido.")).toBeVisible();
    await expect(page.getByText("Necesitamos tu consentimiento de entrega")).toBeVisible();

    const email = `e2e+${Date.now()}@example.com`;
    await page.getByRole("textbox", { name: "Email" }).fill(email);
    const marketing = page.getByLabel(/Quiero recibir novedades/);
    await expect(marketing).not.toBeChecked(); // marketing separado y desmarcado por defecto
    await page.getByLabel(/Acepto usar mi email/).check();
    await page.getByRole("button", { name: "Enviar mi informe" }).click();
    await page.waitForURL(/\/es\/report\/success/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Tu informe está listo");

    // Emails: usuario con enlace privado + owner con datos y PDF
    await expect.poll(async () => (await getOutbox(request)).length).toBeGreaterThanOrEqual(2);
    const box = await getOutbox(request);
    const user = box.find((m) => m.to === email)!;
    const owner = box.find((m) => m.to === "owner@example.test")!;
    expect(user.subject).toBe("Tu informe StressCast está listo");
    expect(owner.subject).toMatch(/^\[StressCast\] Solicitud de informe [0-9a-f-]{36}$/);
    expect(owner.attachments[0]).toMatchObject({ magic: "%PDF" });
    expect(owner.text).toContain("DATOS SENSIBLES");

    // Informe privado
    await page.getByRole("link", { name: "Abrir mi informe" }).click();
    await page.waitForURL(/\/es\/report\/[0-9a-f-]{36}\?token=/);
    await expect(page.locator("h1")).toContainText("Tu informe de burnout relacionado con el trabajo");
    await expect(page.locator("article")).toContainText("Mejora condicional");
    await expect(page.locator("article")).toContainText("60,7");
    await expect(page.locator("article")).toContainText("75,0");
    await expect(page.locator("article")).toContainText("What-if · no predicción");
    await expect(page.locator("article")).toContainText(/SC-1\.0\.0-\d{8}-[A-Z2-9]{8}/);

    // PDF
    const href = await page.getByRole("link", { name: "Descargar PDF" }).first().getAttribute("href");
    const pdf = await request.get(href!);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
  });

  test("token alterado → acceso denegado (sin revelar datos)", async ({ page, request }) => {
    await request.delete("/api/e2e/outbox");
    await completeAssessment(page, "en");
    await page.getByRole("link", { name: "Get my full report" }).click();
    await page.getByRole("textbox", { name: "Email" }).fill(`tamper+${Date.now()}@example.com`);
    await page.getByLabel(/I agree to use my email/).check();
    await page.getByRole("button", { name: "Send my report" }).click();
    await page.waitForURL(/report\/success/);
    await page.getByRole("link", { name: "Open my report" }).click();
    await page.waitForURL(/token=/);
    const url = new URL(page.url());
    url.searchParams.set("token", `${url.searchParams.get("token")}x`);
    await page.goto(url.toString());
    await expect(page.locator("h1")).toContainText("This link is not valid");
    await expect(page.locator("body")).not.toContainText("67.9");
  });
});
