import { defineConfig } from "drizzle-kit";

/**
 * Migrations run as an explicit step in GitHub Actions, never as part of the Vercel build —
 * `docs/agents/workflow.md` → *What a merge carries*. So the credential this reads is
 * `MIGRATION_DATABASE_URL`, a GitHub Actions secret holding `canoncore_migrator`'s connection
 * string, and it is deliberately not one of the variables the application declares in
 * `src/env.ts`: the application never migrates.
 */
const url = process.env.MIGRATION_DATABASE_URL;
if (!url) {
  throw new Error(
    "MIGRATION_DATABASE_URL is not set. It holds canoncore_migrator's connection string; " +
      "see docs/infrastructure.md -> Environment variables.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
