// @vitest-environment node
//
// The check `docs/agents/workflow.md` → *The gates* calls not optional, because its failure mode
// is silence: a misconfigured policy returns an empty result rather than an error, so it is
// indistinguishable from "no data" by looking at the page. Nothing but this file can see the
// difference.
//
// It runs against a real PostgreSQL — a service container in CI, whichever one you point it at
// locally — because row-level security is the database's behaviour and a stub of it would only
// ever assert what the stub was written to do. Settled by CAN-73 Settle the Snapshot layer, the
// CI database seam, and forked-Snapshot erasure before CAN-23; ADR-0005 rule 2 records it.
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

const migratorUrl = process.env.RLS_TEST_MIGRATOR_URL;
const applicationUrl = process.env.RLS_TEST_APP_URL;

// A skip is not a pass. Locally these are optional, because not every machine has a PostgreSQL
// with the two roles on it; in CI the workflow always sets them, so their absence means the
// service container or its setup step broke, and that must fail rather than quietly skip the
// one check whose whole point is that a failure looks like nothing.
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

  // The case that catches a policy treating a missing setting as a wildcard. It cannot go
  // through `withSession`, which always sets one — so it opens the transaction by hand, as the
  // same role, and asks what a policy comparing against NULL lets through.
  test("a session that sets nothing at all reads no owned rows", async () => {
    const application = new Client({ connectionString: applicationUrl });
    await application.connect();
    try {
      await application.query("begin");
      const { rows } = await application.query<{ id: string }>("select id from story");
      await application.query("commit");

      expect(rows.map((row) => row.id)).toEqual([foundingStory.id]);
    } finally {
      await application.end();
    }
  });

  // ADR-0005 rule 3. `SET LOCAL` rather than `SET` is what keeps a pooled connection from
  // handing one request's session user to the next, and the difference is invisible until it is
  // a leak — a plain `SET` would still be in force on the second read below.
  //
  // Asserted by reading through the policy rather than by reading the setting back, because what
  // the setting reverts *to* is not NULL: once `set_config` has named a custom parameter in a
  // session, PostgreSQL keeps it defined and the transaction's end restores its prior value,
  // which is the empty string. That happens to be the anonymous session user, so the leak fails
  // safe — but "fails safe" is a claim about rows, and rows are what this checks.
  test("the session user does not outlive the transaction that set it", async () => {
    const application = new Client({ connectionString: applicationUrl });
    await application.connect();
    try {
      await application.query("begin");
      await application.query("select set_config('canoncore.user_id', $1, true)", [ownedByA.owner]);
      const inside = await application.query<{ id: string }>("select id from story");
      await application.query("commit");
      const afterwards = await application.query<{ id: string }>("select id from story");

      expect(inside.rows.map((row) => row.id)).toContain(ownedByA.id);
      expect(afterwards.rows.map((row) => row.id)).toEqual([foundingStory.id]);
    } finally {
      await application.end();
    }
  });

  test("the page's own query returns the public Story to an anonymous reader", async () => {
    expect(await readVisibleStories(anonymous)).toEqual([foundingStory]);
  });
});
