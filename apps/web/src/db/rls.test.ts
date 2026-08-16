// @vitest-environment node
//
// The cross-tenant read tests ADR-0005 rule 2 requires, plus everything else here that only a
// real PostgreSQL can answer. Why they are not optional, and how to point them at a database on
// a laptop: docs/agents/workflow.md -> The gates.
//
// Every table that needs a real PostgreSQL is tested from this one file: vitest runs test files
// in parallel unless told not to (`fileParallelism`, default true,
// https://vitest.dev/config/#fileparallelism), so a second file would migrate this database at
// the same time as this one.
//
// `source` has no cross-tenant test, which is a decision rather than an omission:
// docs/adr/0014-shell-providers-and-per-source-retention.md -> Decision 6. The three tripwires
// standing in its place are below: every table classified, `source`'s whole column list, and
// what the application role may do to each table. A fourth test asserts that no default
// privilege exists at all — it guards tables nobody has created yet rather than `source`, so it
// is not one of the three.
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

const migratorUrl = process.env.RLS_TEST_MIGRATOR_URL;
const applicationUrl = process.env.RLS_TEST_APP_URL;

// A skip is not a pass, and in CI the workflow always sets these — so their absence there means
// the service container or its setup step broke, and must fail rather than skip.
if (process.env.CI && !(migratorUrl && applicationUrl)) {
  throw new Error(
    "RLS_TEST_MIGRATOR_URL and RLS_TEST_APP_URL are unset in CI. The cross-tenant read test " +
      "cannot run, and skipping it would report exactly what a broken policy reports.",
  );
}

const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

/** Owned by nobody who signs in, and the row the public URL renders. Inserted by migration 0002. */
const foundingStory = { id: "00000000-0000-4000-8000-000000000001", title: "Rose" };
const ownedByA = { id: "11111111-1111-4111-8111-111111111111", owner: "user-a" };
const ownedByB = { id: "22222222-2222-4222-8222-222222222222", owner: "user-b" };

/**
 * The two shapes `source.retention` can take, held by no Source anyone has heard of — naming a
 * real one would put that Source's terms in this repository, which `schema.ts` says why not.
 */
const expiringSource = { id: "33333333-3333-4333-8333-333333333333", retention: "6 months" };
const indefiniteSource = { id: "44444444-4444-4444-8444-444444444444", retention: "infinity" };

/**
 * One read time for all three Snapshots below, long enough ago that the six-month Source's have
 * expired and the indefinite Source's has not — so what separates them is the Source's retention
 * and nothing else.
 */
const readLongAgo = "2020-01-01T00:00:00Z";
const snapshotOfA = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", story: ownedByA.id };
const snapshotOfB = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", story: ownedByB.id };
const snapshotOfFounding = { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", story: foundingStory.id };

describe.skipIf(!migratorUrl || !applicationUrl)("the schema, against a real PostgreSQL", () => {
  let migrator: Client;
  let withSession: typeof import("./session").withSession;
  let anonymous: typeof import("./session").anonymous;
  let readVisibleStories: typeof import("./stories").readVisibleStories;

  beforeAll(async () => {
    migrator = new Client({ connectionString: migratorUrl });
    await migrator.connect();
    await migrate(drizzle(migrator), { migrationsFolder });

    // Written by the role that owns the table, which is the only role that can: an owner
    // bypasses row security, and the application role holds SELECT and nothing else.
    await migrator.query(
      `insert into story (id, title, owner_id, visibility) values
         ($1, 'A Story only user-a may read', $2, 'private'),
         ($3, 'A Story only user-b may read', $4, 'private')
       on conflict (id) do nothing`,
      [ownedByA.id, ownedByA.owner, ownedByB.id, ownedByB.owner],
    );

    // Two Sources and a Snapshot on each of the three Stories, written here rather than by a
    // migration for the reason `schema.ts` gives on `source`.
    await migrator.query(
      `insert into source (id, retention) values ($1, $2), ($3, $4)
       on conflict (id) do nothing`,
      [
        expiringSource.id,
        expiringSource.retention,
        indefiniteSource.id,
        indefiniteSource.retention,
      ],
    );

    await migrator.query(
      `insert into snapshot (id, story_id, source_id, fetched_at) values
         ($1, $2, $3, $4), ($5, $6, $7, $8), ($9, $10, $11, $12)
       on conflict (id) do nothing`,
      [
        snapshotOfA.id,
        snapshotOfA.story,
        expiringSource.id,
        readLongAgo,
        snapshotOfB.id,
        snapshotOfB.story,
        expiringSource.id,
        readLongAgo,
        snapshotOfFounding.id,
        snapshotOfFounding.story,
        indefiniteSource.id,
        readLongAgo,
      ],
    );

    // The application connects the way a request does, through the same modules a page uses.
    // Pointed at the application role's connection string and at nothing else, so every
    // assertion below is made by a role that cannot bypass what it is asserting about.
    vi.stubEnv("DATABASE_URL", applicationUrl);
    vi.stubEnv("VERCEL_ENV", undefined);
    vi.resetModules();
    ({ withSession, anonymous } = await import("./session"));
    ({ readVisibleStories } = await import("./stories"));
  });

  afterAll(async () => {
    await migrator?.query("delete from snapshot where id = any($1)", [
      [snapshotOfA.id, snapshotOfB.id, snapshotOfFounding.id],
    ]);
    await migrator?.query("delete from source where id = any($1)", [
      [expiringSource.id, indefiniteSource.id],
    ]);
    await migrator?.query("delete from story where id = any($1)", [[ownedByA.id, ownedByB.id]]);
    await migrator?.end();
  });

  /** Read as the application role does, with no `where` clause: the policy is the filter. */
  async function readAs(userId: string) {
    return withSession(userId, async (session) => {
      const result = await session.execute<{ id: string; owner_id: string }>(
        sql`select id, owner_id from story`,
      );
      return result.rows;
    });
  }

  /**
   * A transaction opened by hand, as the application role. Two cases below need one, because both
   * are about what happens *without* the seam `withSession` provides — which is the one thing
   * `withSession` cannot be used to test.
   */
  async function withRawSession<T>(run: (client: Client) => Promise<T>): Promise<T> {
    const application = new Client({ connectionString: applicationUrl });
    await application.connect();
    try {
      return await run(application);
    } finally {
      await application.end();
    }
  }

  /**
   * The same read of `snapshot`: no `where` clause, so the policy is the filter and a broken one
   * fails here rather than being covered up by an application filter that happened to be right.
   */
  async function readSnapshotsAs(userId: string) {
    return withSession(userId, async (session) => {
      // `string`, not `Date`, and the difference is drizzle's rather than PostgreSQL's: the
      // same column read through `pg`'s own client arrives as a `Date`, while drizzle's driver
      // installs its own type parsers and hands back `2020-01-01 00:00:00+00`. Checked against
      // this database rather than assumed, because the two clients are both used in this file.
      const result = await session.execute<{ id: string; story_id: string; fetched_at: string }>(
        sql`select id, story_id, fetched_at from snapshot`,
      );
      return result.rows;
    });
  }

  describe("row-level security on story", () => {
    // ADR-0005 rule 1. Neon's own `neondb_owner` has this attribute, so connecting as the wrong
    // role is a one-line tenant leak that every other test here would still pass.
    test("the application connects as a role that cannot bypass row-level security", async () => {
      const [role] = await withSession(anonymous, async (session) => {
        const result = await session.execute<{ name: string; bypasses: boolean }>(
          sql`select current_user as name, rolbypassrls as bypasses
              from pg_roles where rolname = current_user`,
        );
        return result.rows;
      });

      expect(role).toEqual({ name: "canoncore_app", bypasses: false });
    });

    // The half the assertion above cannot reach: `canoncore_migrator` has no BYPASSRLS and still
    // sees every row, because it owns the tables. A deployment pointed at it would look healthy.
    test("connecting as the role that owns the tables is refused before any read", async () => {
      vi.stubEnv("DATABASE_URL", migratorUrl);
      vi.stubEnv("DATABASE_APP_USER", "canoncore_app");
      vi.resetModules();
      const asMigrator = await import("./session");

      const read = asMigrator.withSession(asMigrator.anonymous, async () => "read");

      await expect(read).rejects.toThrow(
        /Connected as canoncore_migrator, not the application role canoncore_app/,
      );

      vi.stubEnv("DATABASE_URL", applicationUrl);
      vi.stubEnv("DATABASE_APP_USER", undefined);
    });

    test("a reader sees their own Stories and every public one", async () => {
      const ids = (await readAs(ownedByA.owner)).map((row) => row.id);

      expect(ids).toContain(ownedByA.id);
      expect(ids).toContain(foundingStory.id);
    });

    // ADR-0005 rule 2, stated as the rule states it. Asked of the table with no application
    // filtering in the way, so it fails if the policy is what is broken rather than passing
    // because a `where` clause happened to be right.
    test("a cross-tenant read of story returns zero rows", async () => {
      const rows = await readAs(ownedByB.owner);

      expect(rows.filter((row) => row.owner_id === ownedByA.owner)).toEqual([]);
      expect(rows.map((row) => row.id)).toContain(ownedByB.id);
    });

    test("the anonymous session user owns nothing, so it reads only what is public", async () => {
      const rows = await readAs(anonymous);

      expect(rows.map((row) => row.id)).toEqual([foundingStory.id]);
    });

    // The case that catches a policy treating a missing setting as a wildcard.
    test("a session that sets nothing at all reads no owned rows", async () => {
      const rows = await withRawSession(async (application) => {
        await application.query("begin");
        const { rows } = await application.query<{ id: string }>("select id from story");
        await application.query("commit");
        return rows;
      });

      expect(rows.map((row) => row.id)).toEqual([foundingStory.id]);
    });

    // ADR-0005 rule 3. `SET LOCAL` rather than `SET` is what keeps a pooled connection from handing
    // one request's session user to the next, and the difference is invisible until it is a
    // leak — a plain `SET` would still be in force on the second read.
    //
    // Asserted by reading through the policy rather than by reading the setting back, because what
    // the setting reverts *to* is not NULL: docs/incidents.md -> A SET LOCAL custom setting reverts
    // to the empty string, not to NULL.
    test("the session user does not outlive the transaction that set it", async () => {
      const { inside, afterwards } = await withRawSession(async (application) => {
        await application.query("begin");
        await application.query("select set_config('canoncore.user_id', $1, true)", [
          ownedByA.owner,
        ]);
        const inside = await application.query<{ id: string }>("select id from story");
        await application.query("commit");
        const afterwards = await application.query<{ id: string }>("select id from story");
        return { inside: inside.rows, afterwards: afterwards.rows };
      });

      expect(inside.map((row) => row.id)).toContain(ownedByA.id);
      expect(afterwards.map((row) => row.id)).toEqual([foundingStory.id]);
    });

    test("the page's own query returns the public Story to an anonymous reader", async () => {
      expect(await readVisibleStories(anonymous)).toEqual([foundingStory]);
    });
  });

  describe("row-level security on snapshot", () => {
    // `snapshot` names no owner of its own. Its policy asks whether the *Story* is readable and
    // lets `story`'s policy answer, so a Story made public and its Snapshots left private is a
    // state that cannot be reached — there is one rule rather than two that must agree.
    test("a reader sees the Snapshots of their own Stories and of every public one", async () => {
      const stories = (await readSnapshotsAs(ownedByA.owner)).map((row) => row.story_id);

      expect(stories).toContain(ownedByA.id);
      expect(stories).toContain(foundingStory.id);
    });

    // ADR-0005 rule 2, for the second table to have a policy. `fetched_at` is read rather than
    // only the keys, because it is the column this table exists to carry and a leak of it is a
    // leak of when somebody else's catalogue was last touched.
    test("a cross-tenant read of snapshot returns zero rows", async () => {
      const rows = await readSnapshotsAs(ownedByB.owner);

      expect(rows.filter((row) => row.story_id === ownedByA.id)).toEqual([]);

      const own = rows.find((row) => row.id === snapshotOfB.id);
      // Asserted before it is read through, so a policy hiding the reader's own Snapshot fails
      // as this assertion rather than as a TypeError three lines later.
      expect(own).toBeDefined();
      expect(new Date(own!.fetched_at).getTime()).toBe(new Date(readLongAgo).getTime());
    });

    test("a session that sets nothing at all reads no owned Snapshots", async () => {
      const rows = await withRawSession(async (application) => {
        await application.query("begin");
        const { rows } = await application.query<{ id: string }>("select id from snapshot");
        await application.query("commit");
        return rows;
      });

      expect(rows.map((row) => row.id)).toEqual([snapshotOfFounding.id]);
    });
  });

  // The first of the two tripwires, and the one that is about every table rather than about
  // `source`: a table arriving with no policy is a decision somebody has to have taken, and this
  // is where they are made to take it. It will fire when better-auth's tables land, which is the
  // point — the fix is to classify them, never to paste the name in.
  test("every table is classified as protected or deliberately not", async () => {
    const { rows } = await migrator.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class
        where relnamespace = 'public'::regnamespace and relkind = 'r'
        order by relname`,
    );

    expect(rows).toEqual([
      { relname: "snapshot", relrowsecurity: true },
      { relname: "source", relrowsecurity: false },
      { relname: "story", relrowsecurity: true },
    ]);
  });

  // The same question asked of the *grants* rather than of the policies, and the two are layers
  // rather than alternatives: a policy narrows what a role may reach, the grant decides whether it
  // may reach it at all, and only the grant stands over a table with no policy. What that cost
  // before this test existed: docs/infrastructure.md -> Roles.
  //
  // `has_table_privilege` rather than a read of `relacl`, because the ACL is not the whole
  // answer: a privilege reaching the role through PUBLIC or through role membership is written
  // nowhere in `relacl` and is just as real. This asks the question that matters instead.
  test("the application role may read every table and write none", async () => {
    const { rows } = await migrator.query<{
      relname: string;
      may_select: boolean;
      may_insert: boolean;
      may_update: boolean;
      may_delete: boolean;
    }>(
      `select c.relname,
              has_table_privilege('canoncore_app', c.oid, 'SELECT') as may_select,
              has_table_privilege('canoncore_app', c.oid, 'INSERT') as may_insert,
              has_table_privilege('canoncore_app', c.oid, 'UPDATE') as may_update,
              has_table_privilege('canoncore_app', c.oid, 'DELETE') as may_delete
         from pg_class c
        where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
        order by c.relname`,
    );

    const readOnly = { may_select: true, may_insert: false, may_update: false, may_delete: false };
    expect(rows).toEqual([
      { relname: "snapshot", ...readOnly },
      { relname: "source", ...readOnly },
      { relname: "story", ...readOnly },
    ]);
  });

  // What made the assertion above false in production, and the one test here that is about tables
  // nobody has created yet: `ALTER DEFAULT PRIVILEGES` grants on every table the migration role
  // *creates*, so a table arrives carrying privileges its own migration never wrote.
  //
  // Asserted as an absence, because that is the shape of the decision rather than an accident of
  // it — migration 0005 removed both defaults instead of narrowing them. Sequences are in scope
  // with tables because there were two of them, and only one was known about.
  //
  // **This can only ever pass here**, since no migration creates a default privilege. It locks
  // the decision against a future migration that adds one; it cannot see a grant made by hand in
  // production, which is exactly how the original one arrived.
  test("no privilege reaches the application role by default, on a table or a sequence", async () => {
    const { rows } = await migrator.query<{ grantor: string; kind: string; privilege: string }>(
      `select pg_get_userbyid(d.defaclrole) as grantor,
              d.defaclobjtype as kind,
              a.privilege_type as privilege
         from pg_default_acl d, aclexplode(d.defaclacl) a
        where a.grantee = 'canoncore_app'::regrole`,
    );

    expect(rows).toEqual([]);
  });

  // Why `source` is the row above with `false` in it, and what that costs:
  // docs/adr/0014-shell-providers-and-per-source-retention.md -> Decision 6.
  describe("source, which is deliberately not tenant-scoped", () => {
    test("every reader sees the same Sources, because a Source belongs to nobody", async () => {
      const readSourcesAs = (userId: string) =>
        withSession(userId, async (session) => {
          const result = await session.execute<{ id: string }>(sql`select id from source`);
          return result.rows.map((row) => row.id).sort();
        });

      const expected = [expiringSource.id, indefiniteSource.id].sort();
      expect(await readSourcesAs(ownedByA.owner)).toEqual(expected);
      expect(await readSourcesAs(ownedByB.owner)).toEqual(expected);
      expect(await readSourcesAs(anonymous)).toEqual(expected);
    });

    // The second tripwire, and the whole column list rather than a search for owner-shaped
    // names: a column called `added_by` leaks exactly as much as one called `owner_id`, and only
    // an exact list catches both. When this fails, the answer is to decide whether the new column
    // is user-scoped — and if it is, `source` is the wrong table for it.
    test("source carries nothing that belongs to one person", async () => {
      const { rows } = await migrator.query<{ column_name: string }>(
        `select column_name from information_schema.columns
          where table_schema = 'public' and table_name = 'source'
          order by column_name`,
      );

      expect(rows.map((row) => row.column_name)).toEqual(["id", "retention"]);
    });
  });

  // Nothing reads the clock yet — that is CAN-103 Refresh Snapshots before their Source's
  // retention expires, and drop what cannot be refreshed. What is pinned here is that the two
  // columns can only be written one way, and that written that way they mean what `schema.ts`
  // claims they mean.
  describe("retention, as PostgreSQL evaluates it", () => {
    // The whole of the sweep's predicate, with no branch in it for the indefinite case.
    test("a Snapshot expires on its Source's clock, and an indefinite one has none", async () => {
      const { rows } = await migrator.query<{ id: string }>(
        `select snapshot.id from snapshot
           join source on source.id = snapshot.source_id
          where snapshot.fetched_at + source.retention <= now()
          order by snapshot.id`,
      );

      expect(rows.map((row) => row.id)).toEqual([snapshotOfA.id, snapshotOfB.id]);
      expect(rows.map((row) => row.id)).not.toContain(snapshotOfFounding.id);
    });

    // "Indefinite" is a value here, never an absence — `retention` in `schema.ts` says why.
    test("a Source cannot exist without saying how long its Snapshots may be kept", async () => {
      await expect(
        migrator.query(`insert into source (id) values (gen_random_uuid())`),
      ).rejects.toThrow(/retention/);
    });

    // Zero is not a duration a Source's terms can express, and a row carrying it would expire
    // every Snapshot the moment it was written.
    test("a retention of no time at all is refused", async () => {
      await expect(
        migrator.query(`insert into source (id, retention) values (gen_random_uuid(), '0')`),
      ).rejects.toThrow(/source_retention_is_positive/);
    });

    // The column has no default, which is the whole of what stops it becoming when the row was
    // written instead. Why those differ, and why only one of them is the age a term limits, is on
    // `fetchedAt` in `schema.ts`.
    test("a Snapshot cannot be written without saying when the Source was read", async () => {
      await expect(
        migrator.query(
          `insert into snapshot (id, story_id, source_id)
           values (gen_random_uuid(), $1, $2)`,
          [foundingStory.id, indefiniteSource.id],
        ),
      ).rejects.toThrow(/fetched_at/);
    });
  });
});
