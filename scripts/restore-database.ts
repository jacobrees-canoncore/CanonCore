#!/usr/bin/env node
// Restore one nightly backup into a database, and say what arrived.
//
// Run:  node scripts/restore-database.ts --into <connection string> [--pathname postgres/…]
// Needs: the age identity that opens a backup, and a read-write token for the store. Both live on
// the machine rather than in CI — the job that writes backups deliberately cannot read one, so
// nothing an agent or a workflow holds can run this. docs/infrastructure.md -> Backups.
//
// **This is the other half of the backup, and the half that decides whether the first half was
// worth anything.** A dump nobody has restored is a file. docs/runbook.md -> The database has to be
// restored from a backup is the procedure this serves, written from a real restore rather than
// from this file's intentions.
//
// **It refuses production unless told twice.** `pg_restore --clean` drops every object it is about
// to recreate, so pointing this at the wrong database does not merge two states — it replaces one
// with the other. Production is reached only with `--onto-production`, and the runbook says what to
// read before typing it.

import { createWriteStream, readFileSync, statSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { parseArgs } from "node:util";
import { Decrypter } from "age-encryption";
import { get } from "@vercel/blob";
import {
  BACKUP_PREFIX,
  EVERY_TABLE_WITH_GUARDS,
  EVERY_TABLE_WITH_ROW_COUNT,
  libpqEnvironment,
  newestBackup,
  computeOf,
  restoreList,
  rowCounts,
} from "./lib/backup.ts";
import { postgres, storedBackups } from "./lib/backup-io.ts";
import { NEON_PROJECT, NeonUnavailable, neonRequest } from "./lib/neon-api.ts";

/** Where the machine keeps the two credentials this needs, and CI holds neither. */
const IDENTITY_FILE = join(homedir(), ".config", "canoncore", "backup-age-key");
const TOKEN_FILE = join(homedir(), ".config", "canoncore", "blob-read-write-token");

/** A value from the environment, or from the file on this machine that holds it. */
function credential(variable: string, file: string, what: string): string {
  const fromEnvironment = process.env[variable]?.trim();
  if (fromEnvironment) return fromEnvironment;
  try {
    const fromFile = readFileSync(file, "utf8").trim();
    if (fromFile) return fromFile;
  } catch {
    /* absent and unreadable are the same problem here, and get the same message */
  }
  throw new Error(
    `no ${what}. Set ${variable}, or put one in ${file} — docs/infrastructure.md -> Backups says ` +
      `where it comes from and how to reissue it.`,
  );
}

/**
 * Stop unless the target is somewhere other than production, or the caller has said it is not.
 *
 * **Refusing when it cannot tell is the point.** Neon says which compute `main` runs on, and
 * without the key that answers there is no way to know whether this connection string is
 * production's — so a restore that cannot check is a restore that has not checked, and it does not
 * run. The comparison is of computes rather than hostnames because one compute answers to a pooled
 * and an unpooled name, and production reached by its unpooled name is still production.
 */
async function refuseProductionUnlessTold(host: string, ontoProduction: boolean) {
  if (ontoProduction) {
    console.log(`--onto-production given, so ${host} is not being checked against Neon's \`main\`.`);
    return;
  }
  let main: { host: string } | undefined;
  try {
    const body = (await neonRequest(`/projects/${NEON_PROJECT}/endpoints`)) as {
      endpoints?: { host: string; branch_id: string }[];
    };
    const branches = (await neonRequest(`/projects/${NEON_PROJECT}/branches`)) as {
      branches?: { id: string; default?: boolean }[];
    };
    const defaultBranch = branches.branches?.find((branch) => branch.default);
    main = body.endpoints?.find((endpoint) => endpoint.branch_id === defaultBranch?.id);
  } catch (error) {
    if (!(error instanceof NeonUnavailable)) throw error;
    throw new Error(
      `cannot ask Neon which compute production runs on (${error.message}), so this cannot tell ` +
        `whether ${host} is production. Stopping without changing anything.`,
    );
  }
  if (!main) throw new Error("Neon named no compute for its default branch, so nothing was compared");
  if (computeOf(main.host) === computeOf(host))
    throw new Error(
      `${host} is production's own compute. \`pg_restore --clean\` would drop what is there ` +
        `first. Restoring production is \`--onto-production\`, and docs/runbook.md -> The ` +
        `database has to be restored from a backup says what to read before typing it.`,
    );
  console.log(`Target compute is not production's (production runs on ${computeOf(main.host)}).`);
}

async function main() {
  const { values } = parseArgs({
    options: {
      into: { type: "string" },
      pathname: { type: "string" },
      "onto-production": { type: "boolean", default: false },
    },
  });
  // `RESTORE_DATABASE_URL` is the better of the two and `--into` is the convenient one: a
  // connection string on argv is readable by `ps` for as long as the restore runs, which is the
  // same reason `apply-migrations-ahead-of-merge.sh` asks a human to paste rather than taking a
  // flag. Both exist because a runbook step somebody follows at 3am should not depend on choosing
  // right, and the environment is what the runbook shows.
  const into = process.env.RESTORE_DATABASE_URL?.trim() || values.into;
  if (!into)
    throw new Error(
      "no database to restore into. Set RESTORE_DATABASE_URL, or pass --into <connection string>.",
    );

  const token = credential("BLOB_READ_WRITE_TOKEN", TOKEN_FILE, "read-write token for the backup store");
  const identity = credential("BACKUP_AGE_IDENTITY", IDENTITY_FILE, "age identity");
  const environment = libpqEnvironment(into);
  await refuseProductionUnlessTold(environment.PGHOST, values["onto-production"]);

  // Which backup. Named, or the newest the store holds.
  let pathname = values.pathname;
  if (!pathname) {
    const newest = newestBackup(await storedBackups(token));
    if (!newest) throw new Error(`the store holds no backup under ${BACKUP_PREFIX}`);
    pathname = newest.pathname;
  }

  const workspace = await mkdtemp(join(tmpdir(), "canoncore-restore-"));
  const dumpFile = join(workspace, "database.dump");
  try {
    console.log(`Fetching ${pathname}`);
    const fetched = await get(pathname, { access: "private", token });
    if (!fetched) throw new Error(`the store holds nothing at ${pathname}`);
    const { stream } = fetched;
    const decrypter = new Decrypter();
    decrypter.addIdentity(identity);
    const plaintext = await decrypter.decrypt(stream as ReadableStream<Uint8Array>);
    await pipeline(Readable.fromWeb(plaintext), createWriteStream(dumpFile));
    console.log(`Decrypted to ${statSync(dumpFile).size.toLocaleString()} bytes`);

    // Neon's own entries come out of the archive here rather than being restored and failing. What
    // is skipped, and why a deny list, is `restoreList` in lib/backup.ts; that it is *reported*
    // rather than silently dropped is this file's half of the same decision.
    const listFile = join(workspace, "restore.list");
    const { list, skipped } = restoreList(postgres("pg_restore", ["--list", dumpFile], {}));
    writeFileSync(listFile, list);
    for (const entry of skipped) console.log(`Skipping Neon's own: ${entry}`);

    // `--clean --if-exists` because the target already has a schema in every case this is used for:
    // a Neon branch carries whatever its parent had. `--exit-on-error` because the default is to
    // continue past a failed statement and report success, which is how a half-restored database
    // gets mistaken for a restored one — and a `--clean` restore that stops half way has already
    // dropped what it did not put back, which is why the target is a scratch branch until it is not.
    console.log(`Restoring into ${environment.PGDATABASE} on ${environment.PGHOST}`);
    postgres(
      "pg_restore",
      [
        "--clean",
        "--if-exists",
        "--exit-on-error",
        "--no-password",
        "--use-list",
        listFile,
        "--dbname",
        environment.PGDATABASE,
        dumpFile,
      ],
      environment,
    );

    const counted = rowCounts(
      postgres("psql", ["--no-align", "--tuples-only", "--command", EVERY_TABLE_WITH_ROW_COUNT], environment),
    );
    console.log(`Restored ${counted.size} tables:`);
    for (const [table, rows] of counted) console.log(`  ${table}: ${rows.toLocaleString()} rows`);
    // The half a row count cannot see. Printed rather than asserted, because what it should equal
    // lives in a document rather than in this file: docs/infrastructure.md -> Roles is the matrix,
    // and a copy of it here would be a second home for the thing that check is against.
    console.log("\nGuards, to compare against docs/infrastructure.md -> Roles:");
    for (const line of postgres(
      "psql",
      ["--no-align", "--tuples-only", "--command", EVERY_TABLE_WITH_GUARDS],
      environment,
    ).split("\n"))
      if (line.trim()) console.log(`  ${line.trim()}`);

    console.log(
      "\nCompare both against what the backup's own run logged. A restore that was never compared " +
        "to its source has only proved that pg_restore exits zero.",
    );
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

await main();
