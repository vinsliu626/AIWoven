import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { resolvePlaywrightRuntime } from "./lib/testing/playwrightRuntime";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const runtime = resolvePlaywrightRuntime();
const seedPrefix = process.env.E2E_AUTH_ENABLED === "true" ? "npm run test:seed && " : "";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: runtime.baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `${seedPrefix}npm run dev -- --webpack --hostname ${runtime.hostname} --port ${runtime.port}`,
    url: runtime.baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXTAUTH_URL: runtime.baseURL,
    },
  },
});
