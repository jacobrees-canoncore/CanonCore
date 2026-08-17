import canoncore from "@canoncore/config/eslint";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // After the `eslint-config-next` entries, never before. A later entry wins, and the shared
  // config is where a rule Next sets at `warn` is raised to `error` — put it first and Next's
  // own severity is what survives, leaving a violation reported and the run green.
  ...canoncore,
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
    //
    // A `*.test.ts` is on the same side of that line: `next build` never compiles one, and the
    // variables a test reads are the runner's — which database to point at, whether this is CI —
    // rather than variables any deployment carries. `src/db/rls.test.ts` is the case in point.
    files: ["src/**/*.{ts,tsx}", "next.config.ts"],
    ignores: ["src/env.ts", "src/**/*.test.{ts,tsx}"],
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
  {
    // **Nothing rendered is linkified, whatever wrote it.** Finding 2c of
    // `docs/compliance/illegal-content-risk-assessment.md` rests on this, and until CAN-108
    // Re-assess the illegal-content risk before a user can paste an arbitrary Provider URL the
    // control was scoped to *user* free text — leaving a Provider's payload outside a control
    // several findings lean on. Neither rule below can ask where a string came from, which is
    // exactly what closes that gap.
    //
    // **The two are not worth the same, and the difference is load-bearing.** `react/no-danger`
    // is a real guard: JSX escapes what it interpolates, so the dangerous prop is the one way a
    // plain string turns into markup. The import group is a **tripwire** — it matches package
    // names, so a renderer it does not name gets through — and an `<a href={...}>` written by
    // hand gets past both. Only `src/app/no-linkification.test.tsx` sees the rendered result,
    // which is why the assessment rests the finding on that rather than on this.
    //
    // Separate from the block above because the `ignores` differ: that one exempts `src/env.ts`
    // and every `*.test.tsx`, and this control has no business exempting either.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "react/no-danger": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "*markdown*",
                "marked",
                "*remark*",
                "*rehype*",
                "*linkify*",
                "*autolink*",
                "anchorme",
                "*dompurify*",
              ],
              message:
                "Nothing rendered is linkified, whatever wrote it — including Provider prose " +
                "(docs/compliance/illegal-content-risk-assessment.md, finding 2c). A renderer " +
                "that emits elements, or a sanitiser paired with a dangerous prop, reopens it.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
