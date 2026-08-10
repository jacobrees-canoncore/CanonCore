import { defineConfig, devices } from "@playwright/test";

/**
 * Set `E2E_BASE_URL` to run the suite against a deployment — a Vercel preview URL, or
 * production. With it unset the suite builds and serves the app locally, so the same
 * test is what CI runs on every push and what proves a deployed URL by hand.
 */
const deployedUrl = process.env.E2E_BASE_URL;
const localUrl = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: deployedUrl ?? localUrl,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: deployedUrl
    ? undefined
    : {
        // A production build rather than `next dev`, so what is tested is what deploys.
        command: "pnpm build && pnpm start",
        url: localUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
