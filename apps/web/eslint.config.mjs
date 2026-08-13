import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // `src/env.ts` is the gate: it validates the environment and everything else reads the
    // result from it, so a `process.env` elsewhere in the application is a variable that got
    // in behind the schema. Scoped to what `next build` compiles — `playwright.config.ts`
    // and `e2e/` drive a *deployed* site and read `CI` and `CANONCORE_E2E_BASE_URL`, neither
    // of which is the application's to declare.
    files: ["src/**/*.{ts,tsx}", "next.config.ts"],
    ignores: ["src/env.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          // Both spellings: `process.env.X` and `process["env"].X`.
          selector:
            "MemberExpression[object.name='process'][property.name='env']," +
            "MemberExpression[object.name='process'][property.value='env']",
          message:
            "Read environment variables from `@/env`, the one module that validates them. " +
            "Declare the variable there and in docs/infrastructure.md.",
        },
      ],
    },
  },
]);

export default eslintConfig;
