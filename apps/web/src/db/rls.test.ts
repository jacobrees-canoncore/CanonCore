// @vitest-environment node
//
// The cross-tenant read test ADR-0005 rule 2 requires, for the first table to have a policy.
// Why it is not optional, and how to point it at a database on a laptop:
// docs/agents/workflow.md -> The gates.
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

describe.skipIf(!migratorUrl || !applicationUrl)("row-level security on story", () => {
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

    await expect(asMigrator.withSession(asMigrator.anonymous, async () => "read")).rejects.toThrow(
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
  // one request's session user to the next, and the difference is invisible until it is a leak —
  // a plain `SET` would still be in force on the second read.
  //
  // Asserted by reading through the policy rather than by reading the setting back, because what
  // the setting reverts *to* is not NULL: docs/incidents.md -> A SET LOCAL custom setting reverts
  // to the empty string, not to NULL.
  test("the session user does not outlive the transaction that set it", async () => {
    const { inside, afterwards } = await withRawSession(async (application) => {
      await application.query("begin");
      await application.query("select set_config('canoncore.user_id', $1, true)", [ownedByA.owner]);
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
