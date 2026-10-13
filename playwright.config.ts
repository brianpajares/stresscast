import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const channel = process.env.PW_CHANNEL || undefined; // local en Windows: PW_CHANNEL=msedge (sin descargar navegadores)

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel } },
    { name: "mobile-360", use: { ...devices["Pixel 5"], viewport: { width: 360, height: 740 }, channel } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      // Servicios reales deshabilitados: store en memoria + outbox de emails + login admin local.
      STORE_DRIVER: "memory",
      ALLOW_MEMORY_STORE: "true",
      E2E_MODE: "true",
      REPORT_TOKEN_SECRET: "e2e-secret-e2e-secret-e2e-secret-0123456789",
      ADMIN_DEV_PASSWORD: "e2e-admin-password",
      OWNER_EMAIL: "owner@example.test",
      RESEND_API_KEY: "re_e2e_dummy",
      RESEND_FROM_EMAIL: "StressCast <no-reply@example.test>",
      NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
      LINGUISTIC_GATE_APPROVED: "es,pt",
      RATE_LIMIT_REQUESTS_PER_MINUTE: "100000",
      MONETIZATION_MODE: "validation",
      STRIPE_ENABLED: "false",
    },
  },
});
