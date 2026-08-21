// The command a Listed Provider's capability declaration is read by. One Provider, named by its base
// URL, and everything it declares about the Source it serves.
//
//   MIGRATION_DATABASE_URL=… pnpm --filter @canoncore/web db:read-declaration <provider-url>
//
// **A Listed Provider is not pasted in by anybody** — it is one this project writes and runs, named
// in the product's own list — so registering the Source behind it is an operator's act, the way a
// purge is. The ingress a *person* uses to add a stranger's Provider is a different thing with
// different duties, and it is CAN-113 Add a Provider by pasting its URL.
//
// The `node` flag, and why this file sits outside `src/`, are `purge-source.mts`'s reasons unchanged:
// one warning suppressed in one place, and a credential that is deliberately not the application's,
// because nothing a deployment runs may write a Source.
//
// What is read, what is refused and what a second read does to the first:
// `../src/providers/read-declaration.ts` and `../src/db/record-declaration.ts`.
import { Client } from "pg";
import { recordDeclaration } from "../src/db/record-declaration.ts";
import { readDeclaration } from "../src/providers/read-declaration.ts";
import { refusalsInForce } from "../src/providers/refusals.ts";

const url = process.env.MIGRATION_DATABASE_URL;
if (!url) {
  throw new Error(
    "MIGRATION_DATABASE_URL is not set. It holds canoncore_migrator's connection string; " +
      "see docs/infrastructure.md -> Environment variables. The application role cannot run " +
      "this: it holds SELECT and nothing else.",
  );
}

const pasted = process.argv[2];
if (!pasted) {
  throw new Error(
    "Name the Provider to read: pnpm --filter @canoncore/web db:read-declaration <provider-url>. " +
      "It is the base URL, an origin and an optional path; this appends /v1/capabilities to it.",
  );
}

const read = await readDeclaration(pasted);

// A declaration that cannot be read fails the Source closed: nothing is written, and whatever was
// held stays exactly as it was. A non-zero exit is what says so to whoever ran this.
if (!read.ok) {
  console.error(`Refused. ${read.refused}`);
  process.exitCode = 1;
} else {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    // The address the read actually used, taken from the read rather than worked out again here:
    // deciding whether two spellings are one Provider is one rule, in one place.
    const record = await recordDeclaration(client, read.providerBaseUrl, read.declaration);

    // Printed rather than returned, because the run's own log is the record of what was stored.
    console.info(`${record.outcome} — ${read.declaration.source.name}`);
    console.info(`  Source: ${record.sourceId}`);
    console.info(`  Provider: ${record.providerBaseUrl}, which calls it ${record.declaredId}`);
    console.info(`  Declared: ${read.declaration.declaredAt.toISOString()}`);
    console.info(`  Retention: ${read.declaration.retention}`);

    // The silences, which are the half nobody would otherwise see. A Provider declaring less than it
    // used to has narrowed what may be done with it, and this is where that shows up at the moment
    // the narrowing lands rather than the next time somebody looks.
    const refused = refusalsInForce(read.declaration);
    if (refused.length === 0) {
      console.info("  Withheld: nothing. This Provider declares everything the application asks for.");
    } else {
      for (const because of refused) console.info(`  WITHHELD: ${because}`);
    }

    if (record.snapshotsWithheld > 0) {
      console.info(
        `  ${record.snapshotsWithheld} Snapshot(s) were stored under the declaration this one ` +
          "replaces, and are withheld until they have been read again. Dropping or refreshing them " +
          "is the sweep's decision — CAN-103 Refresh Snapshots before their Source's retention " +
          "expires, and drop what cannot be refreshed.",
      );
    }
  } finally {
    await client.end();
  }
}
