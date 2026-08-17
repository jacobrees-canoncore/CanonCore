// The command a `§1.D` purge is run by. One Source, named by its id, and everything it ever said.
//
//   MIGRATION_DATABASE_URL=… pnpm --filter @canoncore/web db:purge-source <source-id>
//
// The script exists so the runbook's line is short and so one `node` flag lives in one place:
// `--disable-warning=MODULE_TYPELESS_PACKAGE_JSON`. Node reparses an imported `.ts` under a
// package.json with no `type` and says so on stderr, and the fix it suggests — declaring the whole
// application package ESM — would change how every file Next compiles is interpreted, for a warning.
//
// **Normally dispatched rather than typed**: `.github/workflows/purge-source.yml` runs exactly this
// line with the secret that already exists, so the operator needs no database credential and the run
// is itself the dated record that the purge happened. docs/runbook.md -> A Source's licence
// terminates is the procedure, and names what the licence requires of the timing.
//
// What it does, why the Source's own row goes with it, and what happens to a Story left with nothing:
// `../src/db/purge-source.ts`. This file is the wiring — a credential, an argument, an exit code.
//
// Outside `src/` on purpose. `src/env.ts` is the gate every *application* variable passes, and this
// variable is not the application's: nothing a deployment runs may migrate or purge. `drizzle.config.ts`
// reads the same one from the same side of that line.
import { Client } from "pg";
import { purgeSource } from "../src/db/purge-source.ts";

const url = process.env.MIGRATION_DATABASE_URL;
if (!url) {
  throw new Error(
    "MIGRATION_DATABASE_URL is not set. It holds canoncore_migrator's connection string; " +
      "see docs/infrastructure.md -> Environment variables. The application role cannot run " +
      "this: it holds SELECT and nothing else.",
  );
}

const sourceId = process.argv[2];
if (!sourceId) {
  throw new Error(
    "Name the Source to purge: pnpm --filter @canoncore/web db:purge-source <source-id>. " +
      "docs/runbook.md -> A Source's licence terminates says where the id comes from.",
  );
}

const client = new Client({ connectionString: url });
await client.connect();
try {
  const report = await purgeSource(client, sourceId);

  // Printed rather than returned, because the run's own log is the evidence. Every line is a fact
  // about what was removed; the last one is what the database proved rather than what this asserts.
  console.info(`Purged Source ${report.sourceId}`);
  console.info(`  Snapshots deleted: ${report.snapshotsDeleted}`);
  console.info(`  Stories tombstoned: ${report.storiesTombstoned.length}`);
  for (const id of report.storiesTombstoned) console.info(`    ${id}`);
  console.info(`  Stories left standing for another Source: ${report.storiesKeptForAnotherSource}`);
  console.info(
    "  The Source's own row was deleted, which the foreign key from snapshot allows only if no " +
      "Snapshot of it survives anywhere.",
  );
} finally {
  await client.end();
}
