import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    // The Playwright suite runs against a deployed URL, not a build, so it is
    // driven by `test:e2e` rather than by this one.
    //
    // The second glob is for tests of this directory's own configuration files, which sit
    // beside what they test rather than under `src`: `eslint.config.test.mts` is about
    // `eslint.config.mjs`.
    include: ["src/**/*.test.{ts,tsx}", "*.test.mts"],
  },
});
