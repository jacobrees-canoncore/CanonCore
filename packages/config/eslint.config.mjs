import canoncore from "@canoncore/config/eslint";
import { defineConfig, globalIgnores } from "eslint/config";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["node_modules/**"]),
  ...tseslint.configs.recommended,
  // The shared config names rules and registers no plugin, for the reason its own header
  // gives, so a consumer with no `eslint-config-next` to inherit the registration from
  // registers it. This package is that consumer.
  { plugins: { "jsx-a11y": jsxA11y } },
  // Through the package's own export rather than a relative path, so this package lints
  // itself with exactly what it hands its consumers. A broken export surfaces here first.
  ...canoncore,
]);
