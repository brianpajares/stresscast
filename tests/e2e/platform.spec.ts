import { expect, test } from "@playwright/test";
import { completeAssessment, declineAnalytics } from "./helpers";

test.describe("AT-23 · i18n y SEO", () => {
  test("metadata, canonical, hreflang y html lang por idioma", async ({ page }) => {
    const expected = { es: "es", en: "en", pt: "pt-BR" } as const;
    for (const loc of ["es", "en", "pt"] as const) {
      await page.goto(`/${loc}`);
      await expect(page.locator("html")).toHaveAttribute("lang", expected[loc]);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `http://localhost:3100/${loc}`);
      const langs = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((els) => els.map((e) => e.getAttribute("hreflang")).sort());
      expect(langs).toEqual(["en", "es", "pt-BR", "x-default"]);
      await expect(page.locator("title")).not.toBeEmpty();
      expect(await page.locator('meta[name="description"]').getAttribute("content")).toBeTruthy();
    }
  });

  test("sitemap.xml y robots.txt", async ({ request }) => {
    const sm = await (await request.get("/sitemap.xml")).text();
    expect(sm).toContain("/es/how-it-works");
    expect(sm).toContain("hreflang=\"pt-BR\"");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain("Sitemap:");
  });

  test("negociación de idioma desde / y selector persistente", async ({ browser }) => {
    const ctx = await browser.newContext({ locale: "pt-BR" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/pt$/);
    await page.getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en$/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/); // cookie NEXT_LOCALE
    await ctx.close();
  });

  test("404 localizado", async ({ page }) => {
    const res = await page.goto("/es/no-existe");
    expect(res?.status()).toBe(404);
    await expect(page.locator("h1")).toContainText("No encontramos esa página");
  });
});

test.describe("AT-20/21 · privacidad de la analítica", () => {
  test("ningún request de analítica contiene email, respuestas, score ni banda; sin terceros sin consentimiento", async ({ page }) => {
    const analytics: string[] = [];
    // sendBeacon no expone su cuerpo a Playwright: lo interceptamos en la página.
    await page.addInitScript(() => {
      const w = window as unknown as { __beacons: Promise<string>[] };
      w.__beacons = [];
      const orig = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = (url, data) => {
        if (String(url).includes("/api/events") && data instanceof Blob) w.__beacons.push(data.text());
        return orig(url, data);
      };
    });
    const external: string[] = [];
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (u.pathname === "/api/events") analytics.push(r.postDataBuffer()?.toString("utf8") ?? "");
      else if (!["localhost"].includes(u.hostname) && !u.protocol.startsWith("data")) external.push(r.url());
    });
    await completeAssessment(page, "en");
    await page.getByRole("link", { name: "Get my full report" }).click();
    await page.getByRole("textbox", { name: "Email" }).fill("privacidad@example.com");
    await page.getByLabel(/I agree to use my email/).check();
    await page.getByRole("button", { name: "Send my report" }).click();
    await page.waitForURL(/report\/success/);

    const beacons = await page.evaluate(async () => Promise.all((window as unknown as { __beacons: Promise<string>[] }).__beacons));
    analytics.push(...beacons);
    expect(analytics.filter(Boolean).length).toBeGreaterThan(8);
    const spec = JSON.parse((await import("node:fs")).readFileSync("spec/analytics_events.json", "utf8")) as { events: { name: string; properties: string[] }[]; forbidden_properties: string[] };
    const names = new Map(spec.events.map((e) => [e.name, new Set(e.properties)]));
    const common = new Set(["session_id", "language", "market", "app_version", "model_version", "viewport_bucket", "consent_analytics"]);
    for (const raw of analytics.filter(Boolean)) {
      expect(raw).not.toMatch(/privacidad@example\.com|67[.,]8|high_reference|below_high_reference|very_high|"answer/);
      const ev = JSON.parse(raw) as { name: string; props: Record<string, unknown> };
      expect(names.has(ev.name), ev.name).toBe(true);
      for (const k of Object.keys(ev.props)) {
        expect(spec.forbidden_properties).not.toContain(k);
        expect(names.get(ev.name)!.has(k) || common.has(k), `${ev.name}.${k}`).toBe(true);
      }
    }
    expect(external).toEqual([]); // sin PostHog/Sentry/terceros antes del consentimiento
  });

  test("el banner de consentimiento aparece y la preferencia persiste", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByRole("region", { name: "Anonymous usage measurement" })).toBeVisible();
    await page.getByRole("button", { name: "No, thanks" }).click();
    await page.reload();
    await expect(page.getByRole("region", { name: "Anonymous usage measurement" })).toHaveCount(0);
    await page.getByRole("button", { name: "Analytics preferences" }).click();
    await expect(page.getByRole("region", { name: "Anonymous usage measurement" })).toBeVisible();
  });
});

test.describe("NFR-04 · seguridad", () => {
  test("cabeceras de seguridad y noindex en informes/API/admin", async ({ request }) => {
    const res = await request.get("/en");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).toContain("object-src 'none'");
    expect(h["strict-transport-security"]).toContain("max-age=");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBeTruthy();
    expect(h["x-powered-by"]).toBeUndefined();
    const api = await request.get("/api/health");
    expect(api.headers()["x-robots-tag"]).toContain("noindex");
    expect(api.headers()["cache-control"]).toContain("no-store");
    const report = await request.get("/en/report/0b7f0f1e-5f55-4c53-b5f5-2a6a2c1d9e11?token=nope");
    expect(report.headers()["x-robots-tag"]).toContain("noindex");
  });

  test("ningún secreto en el bundle del cliente", async ({ page, request }) => {
    const scripts = new Set<string>();
    page.on("response", (r) => {
      if (r.url().includes("/_next/static/") && r.url().endsWith(".js")) scripts.add(r.url());
    });
    await page.goto("/en");
    await completeAssessment(page, "en");
    await page.getByRole("link", { name: "Get my full report" }).click();
    const bad = ["e2e-secret-e2e-secret", "e2e-admin-password", "re_e2e_dummy", "SUPABASE_SERVICE_ROLE_KEY", "STRIPE_SECRET_KEY", "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", "TURNSTILE_SECRET_KEY", "RESEND_API_KEY"];
    expect(scripts.size).toBeGreaterThan(3);
    for (const url of scripts) {
      const body = await (await request.get(url)).text();
      for (const s of bad) expect(body, `${s} en ${url}`).not.toContain(s);
    }
  });

  test("Stripe no existe con flags off (FR-24)", async ({ request, page }) => {
    expect((await request.post("/api/stripe/checkout", { data: {}, headers: { "idempotency-key": "x".repeat(20) } })).status()).toBe(404);
    expect((await request.post("/api/stripe/webhook", { data: "{}" })).status()).toBe(404);
    expect((await page.goto("/en/checkout"))?.status()).toBe(404);
    await completeAssessment(page, "en");
    await expect(page.getByRole("link", { name: "Get my full report" })).toHaveAttribute("href", "/en/report/request");
  });

  test("API: errores tipados {code,message,request_id} sin detalles internos", async ({ request }) => {
    const res = await request.post("/api/calculate", { data: { country: "ZZ" } });
    expect(res.status()).toBe(400);
    expect(Object.keys(await res.json()).sort()).toEqual(["code", "message", "request_id"]);
    expect((await request.get("/api/health")).status()).toBe(200);
  });
});

test.describe("AT-15/AT-16 · /admin", () => {
  test("anónimo → login; credenciales incorrectas fallan; sesión admin ve embudo y leads enmascarados y puede reenviar", async ({ page, request, context }) => {
    // Un lead para listar
    await request.delete("/api/e2e/outbox");
    await completeAssessment(page, "es");
    await page.getByRole("link", { name: "Recibir mi informe completo" }).click();
    await page.getByRole("textbox", { name: "Email" }).fill("lead.admin@example.com");
    await page.getByLabel(/Acepto usar mi email/).check();
    await page.getByRole("button", { name: "Enviar mi informe" }).click();
    await page.waitForURL(/report\/success/);

    const anon = await request.get("/api/admin/leads");
    expect(anon.status()).toBe(401);
    await context.clearCookies();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);

    await page.getByLabel("Contraseña").fill("incorrecta");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator("main [role=alert]")).toContainText("Credenciales no válidas");

    await page.getByLabel("Contraseña").fill("e2e-admin-password");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Panel de validación" })).toBeVisible();
    await expect(page.getByText("l***@example.com")).toBeVisible(); // email enmascarado
    await expect(page.locator("main")).not.toContainText("lead.admin@example.com");
    await expect(page.getByText("Gate de cobro")).toBeVisible();

    const before = (await (await request.get("/api/e2e/outbox")).json()).length;
    await page.getByRole("button", { name: "Reenviar" }).first().click();
    await expect(page.getByRole("status")).toContainText("Reenvío registrado");
    await expect.poll(async () => (await (await request.get("/api/e2e/outbox")).json()).length).toBeGreaterThan(before);
    await expect(page.getByText("resend_report").first()).toBeVisible();
  });
});
