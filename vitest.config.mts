import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@spec": fileURLToPath(new URL("./spec", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` lanza fuera de Server Components; en tests unitarios es inocuo.
      "server-only": fileURLToPath(new URL("./tests/helpers/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    testTimeout: 30_000,
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    setupFiles: ["./tests/helpers/setup.ts"],
    coverage: { provider: "v8", include: ["src/engine/**", "src/lib/**"] },
  },
});
