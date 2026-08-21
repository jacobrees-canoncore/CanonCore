// The nightly database backup, in the half that is a function of names, lists and clocks rather
// than of a database, a key or a store.
//
// Everything here is pure, which is the same seam `worktree-database.ts` draws and for the same
// reason: the interesting half of this design is a *deletion*. `expiredBackups` decides which
// backups to destroy, and a decision that can only be exercised by destroying something is a
// decision nothing reviews. The I/O half is `backup-database.ts` and `restore-database.ts`.
//
// **The two queries at the end are here for a different reason: both scripts run them.** "Every
// table in this database" is the claim the backup is checked against and the claim the restore is
// judged by, and a second spelling of it in the second script is exactly the drift that would make
// one of the two vacuous while both still passed.
//
// **The design is docs/adr/0028-a-nightly-encrypted-backup-off-neon.md** and the provisioning state
// is docs/infrastructure.md -> Backups. This file states what it does and points there rather than
// restating the argument.

/**
 * The folder every backup lives under, inside the store.
 *
 * It is load-bearing rather than tidy, exactly as `worktree-database.ts`'s `wt/` prefix is: the
 * pruner deletes things, and the only thing standing between it and something somebody else put in
 * this store is that the pathname has to be one this file can produce. A prefix is checkable;
 * "the ones the job made" is not.
 */
export const BACKUP_PREFIX = "postgres/";

/** What a backup's pathname ends with. `.dump` is pg_dump's custom format, `.age` is the envelope. */
const SUFFIX = ".dump.age";

/**
 * How long a backup is kept. docs/infrastructure.md -> Backups states the same number as a promise
 * to a reader, and `check-docs.ts` compares the two, so this constant and that sentence cannot
 * drift apart.
 */
export const RETENTION_DAYS = 30;

/** A backup as the store reports it. */
export type StoredBackup = {
  pathname: string;
  uploadedAt: Date;
  size: number;
  url: string;
};

/**
 * Where tonight's backup goes.
 *
 * **Seconds are in the name and the separator is `-` rather than `:`.** Blob pathnames become URL
 * paths, and a colon in a path is legal but is escaped by half the things that will ever handle
 * one. Seconds are there so that two runs in the same minute — a schedule and a hand-dispatched
 * re-run — cannot collide, and `put` refuses an overwrite by default, so a collision would be a
 * failed job rather than a lost backup.
 */
export function backupPathname(takenAt: Date): string {
  const stamp = takenAt.toISOString().replace(/\.\d+Z$/, "Z").replace(/:/g, "-");
  return `${BACKUP_PREFIX}${stamp}${SUFFIX}`;
}

/**
 * The moment a pathname says its backup was taken, or `undefined` if it is not one of ours.
 *
 * **`undefined` is what keeps everything else in the store out of every deletion list**, rather
 * than a name check repeated at each call site. That is why this is a total function returning a
 * maybe rather than a partial one that throws.
 */
export function backupTakenAt(pathname: string): Date | undefined {
  if (!pathname.startsWith(BACKUP_PREFIX) || !pathname.endsWith(SUFFIX)) return undefined;
  const stamp = pathname.slice(BACKUP_PREFIX.length, -SUFFIX.length);
  const iso = stamp.replace(/T(\d\d)-(\d\d)-(\d\d)Z$/, "T$1:$2:$3Z");
  if (iso === stamp) return undefined;
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? undefined : at;
}

/**
 * Which stored backups are past their retention, and may therefore be deleted.
 *
 * Two guards, and both exist because the failure they prevent destroys the backup history in one
 * run rather than degrading it.
 *
 * - **A pathname this file could not have produced is never a candidate.** The store is not ours
 *   alone by nature — it is a Vercel Blob store, and anything with the token can write to it.
 * - **The newest backup is never deleted, whatever its age.** A clock that jumped, a schedule that
 *   stopped a year ago, a retention someone shortened: each makes every backup look expired, and
 *   deleting the only copy of the database because it is old is worse than keeping it. The job
 *   uploads before it prunes, so in the ordinary case the reprieved backup is tonight's.
 *
 * Age is measured from `uploadedAt` rather than from the name, because retention is a promise about
 * how long the *store* has held something. The two agree by construction; where they disagree, the
 * store is the one that was there.
 */
export function expiredBackups(
  stored: StoredBackup[],
  now: Date,
  retentionDays = RETENTION_DAYS,
): StoredBackup[] {
  const ours = stored.filter((b) => backupTakenAt(b.pathname) !== undefined);
  if (ours.length <= 1) return [];
  const newest = ours.reduce((a, b) => (a.uploadedAt > b.uploadedAt ? a : b));
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  return ours.filter((b) => b !== newest && b.uploadedAt.getTime() < cutoff);
}

/** What the store holds, judged against the schedule the documents promise. */
export type Freshness = {
  newest?: StoredBackup;
  ageHours?: number;
  /** True when there is no backup at all, or the newest is older than `maxAgeHours`. */
  overdue: boolean;
};

/**
 * How old the newest backup is, and whether that is older than it should be.
 *
 * **This is the half of "fails loudly" that a failing job cannot cover.** A run that goes red sends
 * mail; a run that never happens sends nothing, and a schedule that has silently stopped looks
 * exactly like a schedule with nothing to do. So the question is asked from outside the job, by
 * `check-docs.ts` on every push — the argument is
 * docs/adr/0028-a-nightly-encrypted-backup-off-neon.md -> How a backup that stops is noticed.
 */
export function freshness(stored: StoredBackup[], now: Date, maxAgeHours: number): Freshness {
  const ours = stored.filter((b) => backupTakenAt(b.pathname) !== undefined);
  if (ours.length === 0) return { overdue: true };
  const newest = ours.reduce((a, b) => (a.uploadedAt > b.uploadedAt ? a : b));
  const ageHours = (now.getTime() - newest.uploadedAt.getTime()) / (60 * 60 * 1000);
  return { newest, ageHours, overdue: ageHours > maxAgeHours };
}

/**
 * Every `schema.table` the dump's table of contents carries data for.
 *
 * `pg_restore --list` prints one line per archive entry, and the two that matter for a table are
 * `TABLE` (its definition) and `TABLE DATA` (its rows). A dump missing the second for a table that
 * exists is the shape of a backup that restores to an empty database while reporting success.
 *
 * The format is `<id>; <oid> <oid> TABLE DATA <schema> <table> <owner>`
 * (https://www.postgresql.org/docs/17/app-pgrestore.html, read 21 August 2026 — the `-l` option's
 * output "can be used as input to the -L option").
 */
export function dumpedTables(tableOfContents: string): Set<string> {
  const dumped = new Set<string>();
  for (const line of tableOfContents.split("\n")) {
    const entry = /^\d+;\s+\d+\s+\d+\s+TABLE DATA\s+(\S+)\s+(\S+)\s+\S+\s*$/.exec(line.trim());
    if (entry) dumped.add(`${entry[1]}.${entry[2]}`);
  }
  return dumped;
}

/**
 * The tables the database has and the dump does not.
 *
 * **A non-empty answer fails the job.** pg_dump throws rather than dumping partial data when the
 * connecting role cannot bypass row security — *"By default, pg_dump will set row_security to off,
 * to ensure that all data is dumped from the table. If the user does not have sufficient privileges
 * to bypass row security, then an error is thrown"*
 * (https://www.postgresql.org/docs/17/app-pgdump.html, read 21 August 2026) — so this is not the
 * guard against that. It is the guard against everything else that can quietly narrow a dump: a
 * `--schema` or `--table` argument that grew a typo, a table created in a schema the dump does not
 * reach, a pg_dump that stopped early and still exited zero.
 */
export function tablesMissingFromDump(live: string[], tableOfContents: string): string[] {
  const dumped = dumpedTables(tableOfContents);
  return live.filter((table) => !dumped.has(table)).sort();
}

/**
 * The roles Neon owns inside every database it hosts, whose objects came with the platform rather
 * than from any migration here.
 *
 * A whole-database `pg_dump` captures their entries too, and nothing this project can connect as
 * may recreate them: restoring one answers `permission denied to change default privileges`. They
 * are also exactly the entries a restore does not want, because the database being restored *into*
 * is a Neon database that already has its own.
 */
const NEON_PLATFORM_ROLES = new Set(["cloud_admin", "neon_superuser", "pg_database_owner"]);

/**
 * A `pg_restore --use-list` file that restores everything in the archive except the platform's own.
 *
 * **A deny list rather than an allow list, and that direction is the decision.** Listing the roles
 * to skip means an entry owned by anything else is restored — so a role this project adds later
 * arrives in the restore without anybody remembering to widen a list. The failure mode of the
 * opposite is silent and total: an allow list of "our" roles would quietly drop everything owned by
 * a role added after it was written, and a restore that skipped a table reports success.
 *
 * The owner is the last field of an entry line, which is the format `pg_restore -l` documents its
 * output as being usable as `-L` input in
 * (https://www.postgresql.org/docs/17/app-pgrestore.html, read 21 August 2026). Skipped lines are
 * commented rather than removed, so the file that ran is still a readable account of the archive.
 */
export function restoreList(tableOfContents: string): { list: string; skipped: string[] } {
  const skipped: string[] = [];
  const list = tableOfContents
    .split("\n")
    .map((line) => {
      if (/^\s*;/.test(line) || line.trim() === "") return line;
      const owner = line.trim().split(/\s+/).at(-1);
      if (!owner || !NEON_PLATFORM_ROLES.has(owner)) return line;
      skipped.push(line.trim());
      return `; skipped, owned by Neon rather than by this project: ${line.trim()}`;
    })
    .join("\n");
  return { list, skipped };
}

/**
 * The compute a Neon hostname addresses, with the pooled and unpooled spellings collapsed.
 *
 * One Neon compute answers to two names differing by a `-pooler` infix, so comparing whole
 * hostnames would call two names for one database different — and that is exactly the direction
 * that matters when the comparison is *"is this production?"*. The same reasoning, and the same
 * two lines, are in `scripts/apply-migrations-ahead-of-merge.sh`.
 */
export function computeOf(host: string): string {
  return host.split(".")[0].replace(/-pooler$/, "");
}

/**
 * Every table and how many rows it actually holds, as `schema.table|count` per line.
 *
 * **Counted rather than estimated.** `pg_class.reltuples` and `pg_stat_user_tables.n_live_tup` are
 * both planner statistics, accurate only as far as the last `ANALYZE`, and a restore drill that
 * compared estimates would report agreement it had not checked. `query_to_xml` is what lets one
 * statement run `count(*)` against a table whose name it does not know until it reads it
 * (https://www.postgresql.org/docs/17/functions-xml.html, read 21 August 2026), which is the only
 * way to avoid composing one statement per table in the caller.
 */
export const EVERY_TABLE_WITH_ROW_COUNT = `
  select n.nspname || '.' || c.relname || '|' ||
         (xpath('/row/cnt/text()',
                query_to_xml(format('select count(*) as cnt from %I.%I', n.nspname, c.relname),
                             false, true, '')))[1]::text
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'r' and n.nspname not in ('pg_catalog', 'information_schema')
    and n.nspname !~ '^pg_'
  order by 1
`;

/**
 * Each table with the things this schema is actually careful about: whether row security is on, how
 * many policies stand over it, what each application role may do to it, and who owns it.
 *
 * **Row counts are the easy half of "the restore worked".** This schema's design is almost entirely
 * privileges and policies — ADR-0005's three rules, and the matrix in docs/infrastructure.md ->
 * Roles — and a restore that brought back every row with no policy over it would look like a
 * success and be a disaster. `has_table_privilege` rather than
 * `information_schema.table_privileges`, because the latter answers only about the connecting role
 * and returns nothing rather than an error for anybody else, which reads from a diff exactly like
 * two databases agreeing.
 */
export const EVERY_TABLE_WITH_GUARDS = `
  select c.relname
      || ' rls=' || c.relrowsecurity::text
      || ' policies=' || (select count(*) from pg_policy p where p.polrelid = c.oid)::text
      || ' app=' || coalesce((select string_agg(pr, ',') from unnest(array['SELECT','INSERT','UPDATE','DELETE']) pr
                              where has_table_privilege('canoncore_app', c.oid, pr)), 'none')
      || ' auth=' || coalesce((select string_agg(pr, ',') from unnest(array['SELECT','INSERT','UPDATE','DELETE']) pr
                               where has_table_privilege('canoncore_auth', c.oid, pr)), 'none')
      || ' owner=' || pg_get_userbyid(c.relowner)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'r' and n.nspname = 'public'
  order by c.relname
`;

/** `schema.table|count` lines, as a map. Both scripts print one of these and compare two. */
export function rowCounts(psqlOutput: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const line of psqlOutput.split("\n")) {
    const [table, count] = line.trim().split("|");
    if (table && count !== undefined && /^\d+$/.test(count)) counts.set(table, Number(count));
  }
  return counts;
}

/** Tables whose row count differs between two readings, as `table: before -> after`. */
export function rowCountDisagreements(before: Map<string, number>, after: Map<string, number>): string[] {
  const tables = [...new Set([...before.keys(), ...after.keys()])].sort();
  return tables
    .filter((table) => before.get(table) !== after.get(table))
    .map((table) => `${table}: ${before.get(table) ?? "absent"} -> ${after.get(table) ?? "absent"}`);
}
