import { productionUrl } from "@canoncore/config";
import { defineConfig, devices } from "@playwright/test";

/**
 * This suite drives a *deployed* site rather than a local build, so it is not
 * part of `pnpm -r test` — there is nothing for it to talk to until something
 * has been deployed. Run it with `pnpm --filter @canoncore/web test:e2e`, and
 * point it at a preview with `CANONCORE_E2E_BASE_URL`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",
  use: {
    baseURL: process.env.CANONCORE_E2E_BASE_URL ?? productionUrl,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
