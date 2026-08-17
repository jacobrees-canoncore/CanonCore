import canoncore from "@canoncore/config/eslint";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["node_modules/**"]),
  ...tseslint.configs.recommended,
  // Through the package's own export rather than a relative path, so this package lints
  // itself with exactly what it hands its consumers. A broken export surfaces here first.
  ...canoncore,
]);
