#!/usr/bin/env node
// Take tonight's backup of the production database, encrypt it, put it somewhere that is not Neon,
// and delete the ones that are past their retention.
//
// Run:  node scripts/backup-database.ts
// Needs: MIGRATION_DATABASE_URL and BLOB_READ_WRITE_TOKEN in the environment, and pg_dump and psql
// on PATH at the server's major version or newer. `.github/workflows/backup-database.yml` is what
// runs it nightly; the same command runs by hand for anyone holding both credentials.
//
// **Why a backup exists at all, when Neon restores 7 days.** A history window covers a mistake; it
// does not cover losing the account the window is inside. That is the whole of the argument and it
// lives once, in docs/adr/0028-a-nightly-encrypted-backup-off-neon.md. What is provisioned — the
// store, the schedule, the retention, the key — is docs/infrastructure.md -> Backups.
//
// **The job cannot read what it writes**, and that is a decision rather than an oversight. It
// encrypts to a public age recipient committed beside this file, and the identity that opens one
// is on a laptop. So a credential lifted out of this workflow buys the ability to write backups
// and to delete old ones, and no ability to read a single row of anybody's.
//
// **The decisions this file makes about what a good dump is are in scripts/lib/backup.ts**, which
// is pure and is where the tests are. Everything here is the I/O: processes, streams and a store.

import { execFileSync } from "node:child_process";
import { createReadStream, createWriteStream, readFileSync, statSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { appendFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { Encrypter } from "age-encryption";
import { del, head, list, put } from "@vercel/blob";
import {
  BACKUP_PREFIX,
  EVERY_TABLE_WITH_ROW_COUNT,
  RETENTION_DAYS,
  backupPathname,
  expiredBackups,
  rowCounts,
  tablesMissingFromDump,
  type StoredBackup,
} from "./lib/backup.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RECIPIENT_FILE = join(HERE, "backup-recipient.txt");

const lines: string[] = [];
/** Say what happened, on the run's log and on its summary page. */
function note(line: string) {
  console.log(line);
  lines.push(line);
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value)
    throw new Error(
      `${name} is not set. docs/infrastructure.md -> Backups says where each of this job's two ` +
        `credentials lives and how to reissue one.`,
    );
  return value;
}

/**
 * libpq's own environment variables, from a connection string.
 *
 * **Composed rather than passed through, so the password never reaches argv**, which `ps` can read
 * on a shared machine — the same reasoning, and the same refusal to do string surgery on a URL, as
 * scripts/apply-migrations-ahead-of-merge.sh. The SSL parameters are carried across rather than
 * dropped: production's string asks for `sslmode=verify-full`, and a backup taken over a connection
 * that verified nothing is a backup of a database nobody proved they were talking to.
 */
export function libpqEnvironment(connectionString: string): Record<string, string> {
  const url = new URL(connectionString);
  const environment: Record<string, string> = {
    PGHOST: url.hostname,
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//, "")),
  };
  if (url.port) environment.PGPORT = url.port;
  const carried: Record<string, string> = {
    sslmode: "PGSSLMODE",
    sslrootcert: "PGSSLROOTCERT",
    channel_binding: "PGCHANNELBINDING",
    options: "PGOPTIONS",
  };
  for (const [parameter, variable] of Object.entries(carried)) {
    const value = url.searchParams.get(parameter);
    if (value) environment[variable] = value;
  }
  return environment;
}

/**
 * Run a Postgres client program, with the connection in the environment and nothing on argv.
 *
 * **What it says when it fails is the whole reason this is not two lines inline.** Node's own error
 * for a non-zero exit is `Command failed: pg_dump …` and nothing else, and a nightly job whose
 * failure mail says only that is a job somebody has to reproduce before they can read it. libpq
 * puts every diagnosis on stderr — the host it could not reach, the certificate it would not
 * accept, the relation it was refused — so stderr is captured and becomes the message.
 */
function postgres(program: string, args: string[], environment: Record<string, string>): string {
  try {
    return execFileSync(program, args, {
      encoding: "utf8",
      env: { ...process.env, ...environment },
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const failure = error as { stderr?: string; status?: number | null; message?: string };
    const said = failure.stderr?.trim();
    throw new Error(
      `${program} exited ${failure.status ?? "abnormally"}${said ? `: ${said}` : ` and said nothing: ${failure.message}`}`,
    );
  }
}

/** The age recipient, from the file that carries it and its argument. */
function recipient(): string {
  const key = readFileSync(RECIPIENT_FILE, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("age1"));
  if (!key) throw new Error(`no age recipient in ${RECIPIENT_FILE}`);
  return key;
}

/** Every backup the store holds, following the cursor rather than reading one page. */
async function storedBackups(token: string): Promise<StoredBackup[]> {
  const all: StoredBackup[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: BACKUP_PREFIX, cursor, token, limit: 1000 });
    all.push(...page.blobs.map(({ pathname, uploadedAt, size, url }) => ({ pathname, uploadedAt, size, url })));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return all;
}

async function main() {
  const connection = required("MIGRATION_DATABASE_URL");
  const token = required("BLOB_READ_WRITE_TOKEN");
  const environment = libpqEnvironment(connection);
  const takenAt = new Date();
  const workspace = await mkdtemp(join(tmpdir(), "canoncore-backup-"));
  const dumpFile = join(workspace, "database.dump");
  const encryptedFile = `${dumpFile}.age`;

  try {
    // The dump. Custom format, so it is compressed on the way out and `pg_restore` can list it
    // without restoring it. Ownership, privileges and row-security policies are all included, which
    // is the default and is worth not overriding: this schema's grants and policies are the thing
    // it is most careful about, and a dump of the rows alone would restore a database with none of
    // them. `--no-password` rather than a prompt, so a missing credential fails instead of hanging.
    note(`Dumping ${environment.PGDATABASE} on ${environment.PGHOST} as ${environment.PGUSER}`);
    postgres("pg_dump", ["--format=custom", "--no-password", "--file", dumpFile], environment);
    const dumpBytes = statSync(dumpFile).size;
    if (dumpBytes === 0) throw new Error("pg_dump wrote an empty file and exited zero");

    // What the database has, against what the dump carries data for. pg_dump throws rather than
    // dumping partial data when the role cannot bypass row security, so this is not that guard —
    // it is the guard against a dump that quietly stopped covering something.
    //
    // **The counts are read for the run's own log rather than for a comparison here**, and they are
    // what a restore is later judged against: `restore-database.ts` prints the same table from the
    // restored database, and a drill with no reading of the source has compared a backup to itself.
    const counted = rowCounts(
      postgres(
        "psql",
        ["--no-align", "--tuples-only", "--command", EVERY_TABLE_WITH_ROW_COUNT],
        environment,
      ),
    );
    const tableOfContents = postgres("pg_restore", ["--list", dumpFile], {});
    const missing = tablesMissingFromDump([...counted.keys()], tableOfContents);
    if (missing.length)
      throw new Error(
        `the dump carries no rows for ${missing.join(", ")}, which the database has. A backup ` +
          `missing a table restores to a database missing it too, and reports success either way.`,
      );
    note(`Dumped ${dumpBytes.toLocaleString()} bytes covering ${counted.size} tables`);
    for (const [table, rows] of counted) note(`  ${table}: ${rows.toLocaleString()} rows`);

    // The envelope. Streamed rather than buffered: the dump is a few megabytes today and this is
    // the one place in the job whose cost grows with the database.
    const encrypter = new Encrypter();
    encrypter.addRecipient(recipient());
    const ciphertext = await encrypter.encrypt(
      Readable.toWeb(createReadStream(dumpFile)) as ReadableStream<Uint8Array>,
    );
    await pipeline(Readable.fromWeb(ciphertext), createWriteStream(encryptedFile));
    const encryptedBytes = statSync(encryptedFile).size;

    // The upload, and then a read back of what landed. The job cannot decrypt what it just wrote,
    // so the strongest thing it can say about the stored object is its length — which is enough to
    // catch a truncated upload, and is a fact rather than an assumption that `put` resolving means
    // the bytes are there.
    const pathname = backupPathname(takenAt);
    await put(pathname, createReadStream(encryptedFile), {
      access: "private",
      token,
      contentType: "application/age",
      addRandomSuffix: false,
      multipart: true,
    });
    const stored = await head(pathname, { token });
    if (stored.size !== encryptedBytes)
      throw new Error(
        `the store holds ${stored.size} bytes for ${pathname} and ${encryptedBytes} were uploaded`,
      );
    note(`Stored ${pathname}, ${encryptedBytes.toLocaleString()} bytes, read back at the same length`);

    // The prune. Everything it refuses to delete is argued in scripts/lib/backup.ts.
    const held = await storedBackups(token);
    const expired = expiredBackups(held, takenAt);
    if (expired.length) await del(expired.map((backup) => backup.url), { token });
    note(
      `Store holds ${held.length - expired.length} backups after deleting ${expired.length} past ` +
        `${RETENTION_DAYS} days`,
    );
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }

  if (process.env.GITHUB_STEP_SUMMARY)
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Backup\n\n${lines.map((l) => `- ${l}`).join("\n")}\n`);
}

await main();
