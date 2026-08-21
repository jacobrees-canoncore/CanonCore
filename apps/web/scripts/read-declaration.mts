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
import {
  recordDeclaration,
  recordUnreadableDeclaration,
} from "../src/db/record-declaration.ts";
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

// A declaration that cannot be read fails the Source closed: no declaration is written, and whatever
// was held stays in force. A non-zero exit is what says so to whoever ran this.
//
// **And where the Provider *answered* with something that is not a declaration, the Source is marked
// unreadable** — which is the half a printed line cannot do. A mark is a column, a sentence on
// `/sources` and a refusal; a line in a log is known only to whoever was watching the run.
// `unreadableSince` in ../src/db/schema.ts is why an unreachable host is deliberately not one of
// these, and what the mark withdraws.
if (!read.ok) {
  console.error(`Refused. ${read.refused}`);
  process.exitCode = 1;

  if (read.answeredNotADeclaration) {
    const client = new Client({ connectionString: url });
    await client.connect();
    try {
      const marked = await recordUnreadableDeclaration(
        client,
        read.answeredNotADeclaration,
        read.refused,
      );
      console.error(
        marked > 0
          ? `  Marked ${marked} Source(s) of this Provider unreadable. What it last declared is no ` +
              "longer taken as current, so its Artwork, its Orderings and anything it stops serving " +
              "are withheld until a read succeeds. What it obliges — retention, attribution, the " +
              "restrictions — still binds."
          : "  Nothing to mark: this Provider has declared no Source here, so there is no row, which " +
              "is what failing closed comes to for a first read.",
      );
    } finally {
      await client.end();
    }
  }
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
    // Asked of a Source whose read has just succeeded, so its declaration is current by
    // construction — which is what the bare `{ declaration }` says.
    const refused = refusalsInForce({ declaration: read.declaration });
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
