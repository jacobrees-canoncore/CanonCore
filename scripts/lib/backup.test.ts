import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BACKUP_PREFIX,
  RETENTION_DAYS,
  backupPathname,
  backupTakenAt,
  computeOf,
  dumpedTables,
  expiredBackups,
  freshness,
  libpqEnvironment,
  restoreList,
  rowCounts,
  tablesMissingFromDump,
  type StoredBackup,
} from "./backup.ts";

// The pure half of the nightly backup. Two of these functions decide to delete something and one
// decides whether to fail a build, so every case here is a case that would otherwise only be
// exercised by destroying data or by waiting a day for a schedule not to fire.

const at = (iso: string): Date => new Date(iso);

/** A backup as the store would report it, named for when it was taken. */
function stored(takenAt: string, uploadedAt = takenAt): StoredBackup {
  const pathname = backupPathname(at(takenAt));
  return { pathname, uploadedAt: at(uploadedAt), size: 1_000, url: `https://store/${pathname}` };
}

test("a pathname carries the moment to the second, and reads back as that moment", () => {
  const takenAt = at("2026-08-21T18-35-02Z".replace(/T(\d\d)-(\d\d)-(\d\d)Z/, "T$1:$2:$3Z"));
  const pathname = backupPathname(takenAt);
  assert.equal(pathname, "postgres/2026-08-21T18-35-02Z.dump.age");
  assert.deepEqual(backupTakenAt(pathname), takenAt);
});

test("milliseconds are dropped rather than spelled, so the name is one shape", () => {
  assert.equal(backupPathname(at("2026-08-21T18:35:02.123Z")), "postgres/2026-08-21T18-35-02Z.dump.age");
});

test("pathnames sort chronologically, which is the order the store lists them in", () => {
  const names = [
    backupPathname(at("2026-09-02T01:00:00Z")),
    backupPathname(at("2026-08-21T23:00:00Z")),
    backupPathname(at("2026-08-21T02:00:00Z")),
  ];
  assert.deepEqual([...names].sort(), [
    "postgres/2026-08-21T02-00-00Z.dump.age",
    "postgres/2026-08-21T23-00-00Z.dump.age",
    "postgres/2026-09-02T01-00-00Z.dump.age",
  ]);
});

test("anything this file could not have written reads back as nobody's", () => {
  for (const pathname of [
    "postgres/2026-08-21.dump.age", // no time
    "postgres/2026-08-21T18-35-02Z.dump", // not encrypted
    "postgres/notes.txt",
    "elsewhere/2026-08-21T18-35-02Z.dump.age", // outside the prefix
    "postgres/2026-13-45T99-99-99Z.dump.age", // shaped right, not a date
    "",
  ])
    assert.equal(backupTakenAt(pathname), undefined, pathname);
});

test("what is past its retention is what gets deleted", () => {
  const now = at("2026-09-30T02:00:00Z");
  const fresh = stored("2026-09-29T02:00:00Z");
  const old = stored("2026-08-20T02:00:00Z");
  assert.deepEqual(
    expiredBackups([fresh, old], now).map((b) => b.pathname),
    [old.pathname],
  );
});

test("a backup one hour inside its retention is kept, and one hour outside is not", () => {
  const now = at("2026-09-30T02:00:00Z");
  const tonight = stored("2026-09-30T01:00:00Z");
  const inside = stored("2026-08-31T03:00:00Z");
  const outside = stored("2026-08-31T01:00:00Z");
  const days = (b: StoredBackup) => (now.getTime() - b.uploadedAt.getTime()) / 86_400_000;
  assert.ok(days(inside) < RETENTION_DAYS && days(outside) > RETENTION_DAYS);
  assert.deepEqual(
    expiredBackups([tonight, inside, outside], now).map((b) => b.pathname),
    [outside.pathname],
  );
});

test("nothing the job did not write is ever a candidate for deletion", () => {
  const now = at("2030-01-01T00:00:00Z");
  const foreign: StoredBackup = {
    pathname: `${BACKUP_PREFIX}somebody-elses-file.tar`,
    uploadedAt: at("2020-01-01T00:00:00Z"),
    size: 9,
    url: "https://store/x",
  };
  const ours = [stored("2026-08-01T00:00:00Z"), stored("2026-08-02T00:00:00Z")];
  const deleting = expiredBackups([foreign, ...ours], now);
  assert.ok(deleting.every((b) => b.pathname !== foreign.pathname));
});

test("the newest backup survives however old it is, so a stopped schedule empties nothing", () => {
  // Every one of these is years past retention. Deleting the last copy of the database because
  // nothing has run since is the failure this guard exists for.
  const now = at("2030-01-01T00:00:00Z");
  const all = [stored("2026-08-01T00:00:00Z"), stored("2026-08-02T00:00:00Z")];
  assert.deepEqual(
    expiredBackups(all, now).map((b) => b.pathname),
    [all[0].pathname],
  );
  assert.deepEqual(expiredBackups([all[1]], now), []);
});

test("an empty store deletes nothing rather than throwing", () => {
  assert.deepEqual(expiredBackups([], at("2026-09-30T02:00:00Z")), []);
});

test("a store with no backup at all is overdue, and says so without a newest", () => {
  const verdict = freshness([], at("2026-08-21T18:00:00Z"), 26);
  assert.equal(verdict.overdue, true);
  assert.equal(verdict.newest, undefined);
});

test("a backup from last night is not overdue; one from the night before is", () => {
  const now = at("2026-08-21T09:00:00Z");
  const lastNight = freshness([stored("2026-08-21T02:00:00Z")], now, 26);
  assert.equal(lastNight.overdue, false);
  assert.equal(Math.round(lastNight.ageHours ?? 0), 7);

  const theNightBefore = freshness([stored("2026-08-20T02:00:00Z")], now, 26);
  assert.equal(theNightBefore.overdue, true);
  assert.equal(Math.round(theNightBefore.ageHours ?? 0), 31);
});

test("freshness reads the newest, not the last one the store happened to list", () => {
  const now = at("2026-08-21T09:00:00Z");
  const listing = [stored("2026-08-01T02:00:00Z"), stored("2026-08-21T02:00:00Z"), stored("2026-08-10T02:00:00Z")];
  assert.equal(freshness(listing, now, 26).newest?.pathname, "postgres/2026-08-21T02-00-00Z.dump.age");
});

// A real `pg_restore --list` header and two tables' worth of entries, pasted rather than
// paraphrased: the entry format is the thing under test, so a tidied fixture would prove the
// parser reads its own invention.
const TABLE_OF_CONTENTS = `;
; Archive created at 2026-08-21 18:35:02 UTC
;     dbname: neondb
;     TOC Entries: 31
;     Compression: gzip
;     Dump Version: 1.16-0
;     Format: CUSTOM
;     Integer: 4 bytes
;     Offset: 8 bytes
;     Dumped from database version: 17.10
;     Dumped by pg_dump version: 17.6
;
;
; Selected TOC Entries:
;
6; 2615 16388 SCHEMA - drizzle canoncore_migrator
226; 1259 16389 TABLE drizzle __drizzle_migrations canoncore_migrator
217; 1259 16390 TABLE public story canoncore_migrator
218; 1259 16400 TABLE public anchor canoncore_migrator
3376; 0 16390 TABLE DATA public story canoncore_migrator
3377; 0 16400 TABLE DATA public anchor canoncore_migrator
3378; 0 16389 TABLE DATA drizzle __drizzle_migrations canoncore_migrator
3380; 2606 16396 CONSTRAINT public story story_pkey canoncore_migrator
`;

test("the table of contents yields every table it carries data for, schema included", () => {
  assert.deepEqual(
    [...dumpedTables(TABLE_OF_CONTENTS)].sort(),
    ["drizzle.__drizzle_migrations", "public.anchor", "public.story"],
  );
});

test("a definition without its data does not count as dumped", () => {
  // `TABLE public version` is in the archive; `TABLE DATA public version` is not, which is a dump
  // that restores the table and none of its rows.
  const toc = TABLE_OF_CONTENTS + "219; 1259 16410 TABLE public version canoncore_migrator\n";
  assert.deepEqual(tablesMissingFromDump(["public.story", "public.version"], toc), ["public.version"]);
});

test("a database and a dump that agree report nothing missing", () => {
  assert.deepEqual(
    tablesMissingFromDump(["public.story", "public.anchor", "drizzle.__drizzle_migrations"], TABLE_OF_CONTENTS),
    [],
  );
});

test("an empty table of contents reports every table missing rather than passing", () => {
  assert.deepEqual(tablesMissingFromDump(["public.story"], ""), ["public.story"]);
});

// Pasted from `pg_restore -l` against the real production archive of 21 August 2026, unedited.
// Three of these five entries belong to Neon and two to this project, which is the whole of what
// the filter has to tell apart — and a fixture written from memory would prove only that the
// parser reads its own invention.
const REAL_ENTRIES = `;
; Selected TOC Entries:
;
5; 2615 24577 SCHEMA - drizzle canoncore_migrator
3529; 0 0 ACL - SCHEMA public pg_database_owner
2103; 826 16398 DEFAULT ACL public DEFAULT PRIVILEGES FOR SEQUENCES cloud_admin
2102; 826 16397 DEFAULT ACL public DEFAULT PRIVILEGES FOR TABLES cloud_admin
3510; 0 24593 TABLE DATA public story canoncore_migrator
`;

test("the platform's own entries are commented out and everything else is kept", () => {
  const { list, skipped } = restoreList(REAL_ENTRIES);
  assert.deepEqual(skipped, [
    "3529; 0 0 ACL - SCHEMA public pg_database_owner",
    "2103; 826 16398 DEFAULT ACL public DEFAULT PRIVILEGES FOR SEQUENCES cloud_admin",
    "2102; 826 16397 DEFAULT ACL public DEFAULT PRIVILEGES FOR TABLES cloud_admin",
  ]);
  // pg_restore reads a line starting with `;` as a comment, so a skipped entry is one that does.
  for (const entry of skipped) assert.ok(!new RegExp(`^${entry.slice(0, 4)}`, "m").test(list), entry);
  assert.match(list, /^5; 2615 24577 SCHEMA - drizzle canoncore_migrator$/m);
  assert.match(list, /^3510; 0 24593 TABLE DATA public story canoncore_migrator$/m);
});

test("a table owned by a role invented tomorrow is restored, not silently dropped", () => {
  // The direction that matters: an allow list would skip this, and a skipped table reports success.
  const { list, skipped } = restoreList("3511; 0 24594 TABLE DATA public argument canoncore_reader\n");
  assert.deepEqual(skipped, []);
  assert.match(list, /^3511; 0 24594 TABLE DATA public argument canoncore_reader$/m);
});

test("the header comments pg_restore writes survive unchanged", () => {
  const { list } = restoreList(REAL_ENTRIES);
  assert.match(list, /^; Selected TOC Entries:$/m);
});

// `psql --no-align --tuples-only` output, which is the shape both scripts read a row count from.
const COUNTS = `public.anchor|9
public.story|9
public.user|0
drizzle.__drizzle_migrations|14
`;

test("row counts read back as numbers, whatever psql padded around them", () => {
  const counted = rowCounts(COUNTS);
  assert.equal(counted.get("public.story"), 9);
  assert.equal(counted.get("public.user"), 0);
  assert.equal(counted.size, 4);
});

test("a blank line, a psql notice or a footer is not a table", () => {
  assert.equal(rowCounts("\n(4 rows)\n\n").size, 0);
});

test("the pooled and unpooled names of one compute are one compute", () => {
  assert.equal(
    computeOf("ep-cool-boat-12345678-pooler.eu-west-2.aws.neon.tech"),
    computeOf("ep-cool-boat-12345678.eu-west-2.aws.neon.tech"),
  );
  assert.notEqual(
    computeOf("ep-cool-boat-12345678.eu-west-2.aws.neon.tech"),
    computeOf("ep-other-boat-87654321.eu-west-2.aws.neon.tech"),
  );
});

test("a connection string becomes libpq's variables, with nothing on argv", () => {
  const environment = libpqEnvironment(
    "postgresql://canoncore_migrator:p%40ss%3Aword@ep-x-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=verify-full",
  );
  assert.equal(environment.PGHOST, "ep-x-pooler.eu-west-2.aws.neon.tech");
  assert.equal(environment.PGUSER, "canoncore_migrator");
  // A password carrying `@` and `:` survives, which is what composing rather than splitting buys.
  assert.equal(environment.PGPASSWORD, "p@ss:word");
  assert.equal(environment.PGDATABASE, "neondb");
  assert.equal(environment.PGSSLMODE, "verify-full");
});

test("verify-full without a named root certificate asks for the system trust store", () => {
  // Run 32511616263's actual failure: libpq wants `~/.postgresql/root.crt` and a runner has none,
  // so `verify-full` refused to connect at all. `system` keeps verification rather than dropping it.
  const environment = libpqEnvironment("postgresql://u:p@host/db?sslmode=verify-full");
  assert.equal(environment.PGSSLROOTCERT, "system");
  assert.equal(environment.PGSSLMODE, "verify-full");
});

test("a string that names its own root certificate is left alone", () => {
  const environment = libpqEnvironment("postgresql://u:p@host/db?sslmode=verify-full&sslrootcert=/etc/ca.crt");
  assert.equal(environment.PGSSLROOTCERT, "/etc/ca.crt");
});

test("a mode that verifies nothing is not given a certificate it did not ask for", () => {
  assert.equal(libpqEnvironment("postgresql://u:p@host/db?sslmode=require").PGSSLROOTCERT, undefined);
  assert.equal(libpqEnvironment("postgresql://u:p@host/db").PGSSLROOTCERT, undefined);
});

test("verify-ca gets the same default as verify-full, since libpq wants a root for both", () => {
  assert.equal(libpqEnvironment("postgresql://u:p@host/db?sslmode=verify-ca").PGSSLROOTCERT, "system");
});
