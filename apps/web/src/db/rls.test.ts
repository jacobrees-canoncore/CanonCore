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
// is not one of the three. A fifth joined them with CAN-24 A signed-in and a signed-out path:
// what the *auth* role may do to each table, which is the other half of the same question now
// that a third role exists.
//
// **Signing up, signing in and signing out are tested from here too**, and the reason is the
// paragraph above rather than a change of subject: they need a real PostgreSQL, so they cannot have
// a file of their own. What they add over the policy tests is the one thing a policy test cannot
// see — that the id better-auth puts in a cookie is the id `SET LOCAL` then sets, which is the
// whole of what CAN-24 A signed-in and a signed-out path joins together.
//
// **The two that enumerate `public` ask for four `relkind`s**, not the ordinary-table `'r'` alone:
// `'p'` partitioned, `'f'` foreign and `'m'` materialised view can all hold rows, and a matview over
// Snapshot values would be exactly the cached content a licence purge has to reach. They are the
// same four `purge-source.ts` asks for, and deliberately so — that module says the pressure to
// classify a new table lands here rather than at purge time, and it only does if the two agree.
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { passwordMinimum } from "../auth/password";
import { sessionUserSetting } from "./schema";

const migratorUrl = process.env.RLS_TEST_MIGRATOR_URL;
const applicationUrl = process.env.RLS_TEST_APP_URL;
// better-auth's role. A third URL rather than the two composed by hand, so that a laptop pointing
// this suite at some other PostgreSQL says what the password is there instead of relying on
// `roles.sql`'s convention of making it the role name.
const authRoleUrl = process.env.RLS_TEST_AUTH_URL;

// A skip is not a pass, and in CI the workflow always sets these — so their absence there means
// the service container or its setup step broke, and must fail rather than skip.
if (process.env.CI && !(migratorUrl && applicationUrl && authRoleUrl)) {
  throw new Error(
    "RLS_TEST_MIGRATOR_URL, RLS_TEST_APP_URL and RLS_TEST_AUTH_URL are unset in CI. The " +
      "cross-tenant read test cannot run, and skipping it would report exactly what a broken " +
      "policy reports.",
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

/**
 * Two tombstones, written here rather than by a purge, because what the cross-tenant tests below
 * are about is the policy over the table and not how a row got into it. The purge that writes them
 * for real is tested further down, from its own fixtures.
 *
 * A tombstone carries the Visibility its Story had, so both branches of the policy need one.
 */
const tombstoneOwnedByA = { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", owner: ownedByA.owner };
const publicTombstone = { id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", owner: "founding-operator" };

/**
 * A third and a fourth Source, and a third owner's three Stories: the fixtures the purge deletes.
 *
 * Both retentions are finite and identical, so nothing in the purge tests turns on the clock — a
 * licence terminating is an event, and the whole point of it is that no retention window predicts
 * it.
 */
const terminatedSource = { id: "55555555-5555-4555-8555-555555555555" };
const survivingSource = { id: "66666666-6666-4666-8666-666666666666" };
const onlyTheTerminatedSource = { id: "77777777-7777-4777-8777-777777777777", owner: "user-c" };
const bothSources = { id: "88888888-8888-4888-8888-888888888888", owner: "user-c" };
const onlyTheSurvivingSource = { id: "99999999-9999-4999-8999-999999999999", owner: "user-c" };

/** A fifth Source and a fourth owner's Story, for the purge that runs against a grown schema. */
const unclassifiedTableSource = { id: "0a0a0a0a-0a0a-4a0a-8a0a-0a0a0a0a0a0a" };
const purgedWhileUnclassified = { id: "0b0b0b0b-0b0b-4b0b-8b0b-0b0b0b0b0b0b", owner: "user-d" };

/**
 * `.invalid` is reserved by [RFC 2606](https://www.rfc-editor.org/rfc/rfc2606) precisely so that a
 * name cannot resolve, which matters here because these are the only fixtures in this file that are
 * real personal data in shape: an address that could belong to somebody must not be one this suite
 * signs up. It is also how `afterAll` finds its own rows to delete.
 */
const testEmailDomain = "can-24.invalid";

/**
 * Two real accounts, created through the sign-up endpoint rather than inserted, because what the
 * cross-tenant tests below are about is the identity better-auth *issues*. A `story` fixture can be
 * written by hand; a `user` row with a working password cannot, and inserting one would test a
 * policy against an identity nothing could ever sign in as.
 *
 * The passwords are longer than the twelve-character floor and worth nothing: they exist for the
 * length of one test run, in a database this file creates rows in and deletes them from.
 */
const firstAccount = {
  name: "The first reader",
  email: `first@${testEmailDomain}`,
  password: "a-password-of-ample-length",
};
const secondAccount = {
  name: "The second reader",
  email: `second@${testEmailDomain}`,
  password: "another-password-of-ample-length",
};

/**
 * The one account whose address is **not** at `.invalid`, and the reason is the guard.
 *
 * `mail/send.ts` refuses any recipient at neither `resend.dev` nor `mail.canoncore.com` unless
 * `VERCEL_ENV` is `production`, which it is not here and must not be — `auth.ts`'s
 * `hostsAllowedToIssueSessions` would then refuse every form posted from `localhost`. So an account
 * that is going to exercise the two mail flows has to be at a domain the guard admits, and
 * `resend.dev` is the right one of the two: it reaches nothing at all, where the other is a mailbox
 * whose contents somebody would then have to ignore.
 *
 * **Nothing leaves the process either way**: `interceptResend` below replaces `fetch`, so what makes
 * this safe is the stub rather than the domain. The domain is what makes the send happen at all, which
 * is the difference between testing the flows and testing the refusal — and the refusal is tested too,
 * on a `.invalid` address, further down.
 */
const accountWithMail = {
  name: "The reader who gets the email",
  email: "delivered@resend.dev",
  password: "the-password-this-account-starts-with",
};

/** What the same account's password becomes, once the reset flow has run. */
const passwordAfterTheReset = "the-password-the-reset-flow-chose";

/**
 * The host these tests post to, which has to be one `auth.ts` allows: its `baseURL` is derived from
 * the host that served the request, against an allowlist, and `localhost:3000` is on it. A request
 * to any other host would resolve `baseURL` to the production fallback and then refuse the form for
 * an origin that does not match it — which is the check working, not a broken test.
 */
const origin = "http://localhost:3000";

/**
 * A browser submitting a form, as a `Request`.
 *
 * **The Fetch Metadata headers are not decoration.** better-auth's `formCsrfMiddleware` reads them,
 * and `route.ts` reads `sec-fetch-mode` to decide whether to answer with a redirect or with JSON —
 * so a request missing them exercises neither path. `x-forwarded-for` is what the rate limiter keys
 * on, and giving each test its own address keeps one test's attempts out of another's window.
 */
function formPost(path: string, fields: Record<string, string>, from: string, cookie?: string) {
  const body = new URLSearchParams(fields).toString();
  const headers = new Headers({
    "content-type": "application/x-www-form-urlencoded",
    origin,
    "sec-fetch-site": "same-origin",
    "sec-fetch-mode": "navigate",
    "sec-fetch-dest": "document",
    "x-forwarded-for": from,
  });
  if (cookie) headers.set("cookie", cookie);
  // **The body is always set, including when it is empty**, because that is what a browser does and
  // the difference is not cosmetic: a `Request` built with no `body` option has a *null* body, and
  // better-call skips its media-type check on one. Omitting it is how an earlier version of this
  // helper made the sign-out test pass against a request no browser sends — `route.ts` records what
  // that cost.
  return new Request(`${origin}${path}`, { method: "POST", headers, body });
}

/**
 * A caller nothing else in this file shares a rate-limit window with.
 *
 * **Every request that is not deliberately testing the limiter gets its own address**, because the
 * limiter is real: `/sign-in/email` allows three attempts per ten seconds per caller, and a suite
 * that runs in under a second would otherwise have one test spend another's window and read the
 * `429` as a broken policy. The first draft did exactly that, and the symptom was an insert with a
 * null owner three tests away.
 *
 * `203.0.113.0/24` is TEST-NET-3, reserved for documentation by
 * [RFC 5737](https://www.rfc-editor.org/rfc/rfc5737), so no real host is being named.
 */
let addressesIssued = 0;

function freshAddress(): string {
  addressesIssued += 1;
  return `203.0.113.${addressesIssued}`;
}

/**
 * Why PostgreSQL refused a read, rather than merely that it did.
 *
 * Read off `cause` because drizzle replaces the message with `Failed query: …` and keeps
 * PostgreSQL's own underneath — so an assertion on the thrown message would pass for any failure at
 * all, including a typo in the query being asserted about.
 */
async function whyRefused(read: () => Promise<unknown>): Promise<string> {
  try {
    await read();
  } catch (error) {
    const cause = error instanceof Error ? error.cause : undefined;
    return cause instanceof Error ? cause.message : String(error);
  }
  throw new Error("The read was expected to be refused, and was not.");
}

/** The session cookie a response set, in the form a later request sends it back. */
function cookieFrom(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((header) => header.split(";")[0])
    .join("; ");
}

/**
 * A browser following a link, as a `Request`. The two addresses better-auth puts in an email are
 * `GET`s, so proving either flow means making one.
 *
 * No Fetch Metadata headers and no body: `route.ts`'s `GET` hands the request straight to better-auth
 * with none of the rewriting a form post gets, and `originCheckMiddleware` returns early for a `GET`.
 * What is still checked is the `callbackURL`, by the per-endpoint `originCheck`, which is why the
 * redirect assertions below are worth making.
 */
function follow(url: string, from: string): Request {
  return new Request(url, { headers: { "x-forwarded-for": from } });
}

/**
 * Every email this suite would have sent, as the JSON body handed to Resend.
 *
 * **The whole of "without sending real mail".** `mail/send.ts` reaches Resend with one `fetch`, so
 * replacing `fetch` for that one host is the entire seam — and it is the seam worth using rather than a
 * module mock, because what lands here is the real request body, including the link better-auth built.
 */
type SentEmail = { to: string; subject: string; text: string };

const sent: SentEmail[] = [];

/**
 * Replace `fetch` for `api.resend.com` alone, and let anything else through.
 *
 * **Scoped by host rather than replaced wholesale**, so nothing else in this file can be broken by it
 * from a distance. Nothing else here uses `fetch` today — `pg` opens sockets — and this keeps that from
 * being a thing anybody has to remember.
 *
 * `send.test.ts` records the property this depends on: the request is handed to `fetch` before `send`
 * suspends, so a captured email is readable straight after the route call that provoked it, with
 * nothing to await in between. That matters because `auth.ts` defers every send through `after` and
 * hands back no handle to wait on.
 */
function interceptResend() {
  const realFetch = globalThis.fetch;
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    if (new URL(request.url).host !== "api.resend.com") return realFetch(input as RequestInfo, init);
    sent.push((await request.json()) as SentEmail);
    return Response.json({ id: "an-id-resend-would-have-issued" });
  });
}

/**
 * The one URL in the email most recently sent to this address, and a refusal if there is none.
 *
 * **A refusal rather than `undefined`**, because every use of this is the setup for the assertion after
 * it: an email that was never sent would otherwise surface as a `GET` of the string "undefined" and a
 * confusing failure two lines later. `messages.ts` puts the link in a paragraph of its own, which is
 * both why a mail client can autolink it and why one line of it can be read back out here.
 */
function linkEmailedTo(recipient: string): string {
  const forThem = sent.filter((email) => email.to === recipient);
  const latest = forThem.at(-1);
  if (!latest) {
    throw new Error(
      `No email was sent to ${recipient}. Every email sent so far went to: ` +
        `${sent.map((email) => email.to).join(", ") || "nobody"}.`,
    );
  }
  const url = latest.text.split("\n").find((line) => line.startsWith("http"));
  if (!url) throw new Error(`The email to ${recipient} carried no link: ${latest.text}`);
  return url;
}

/** All three or none: every test below needs the migrator, the application role and the auth. */
const noDatabase = !migratorUrl || !applicationUrl || !authRoleUrl;

describe.skipIf(noDatabase)("the schema, against a real PostgreSQL", () => {
  let migrator: Client;
  let withSession: typeof import("./session").withSession;
  let anonymous: typeof import("./session").anonymous;
  let readVisibleStories: typeof import("./stories").readVisibleStories;
  let databaseAnswers: typeof import("./health").databaseAnswers;
  let auth: typeof import("../auth/auth").auth;
  /** The route the browser posts to, so the redirect is exercised as well as the endpoint. */
  let authPost: typeof import("../app/api/auth/[...all]/route").POST;
  /**
   * And the route a link in an email resolves to. It arrived with CAN-31 Email verification and
   * password reset, which is the first thing here that a browser reaches by navigating rather than by
   * submitting — `route.ts` records that this export did not exist before and why it has to now.
   */
  let authGet: typeof import("../app/api/auth/[...all]/route").GET;

  beforeAll(async () => {
    // Before anything signs up, because signing up sends an email: `auth.ts` has `sendOnSignUp` on.
    interceptResend();

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

    await migrator.query(
      `insert into tombstone (id, former_type, owner_id, visibility) values
         ($1, 'story', $2, 'private'), ($3, 'story', $4, 'public')
       on conflict (id) do nothing`,
      [tombstoneOwnedByA.id, tombstoneOwnedByA.owner, publicTombstone.id, publicTombstone.owner],
    );

    // The application connects the way a request does, through the same modules a page uses.
    // Pointed at the application role's connection string and at nothing else, so every
    // assertion below is made by a role that cannot bypass what it is asserting about.
    vi.stubEnv("DATABASE_URL", applicationUrl);
    vi.stubEnv("VERCEL_ENV", undefined);

    // better-auth's role, read out of its own URL rather than composed: `database-url.ts` builds
    // the auth connection by swapping the credentials in the application's, so handing it these
    // two is the same thing a deployment does. `database-url.test.ts` asserts the composition.
    const authRole = new URL(authRoleUrl!);
    vi.stubEnv("DATABASE_AUTH_USER", decodeURIComponent(authRole.username));
    vi.stubEnv("DATABASE_AUTH_PASSWORD", decodeURIComponent(authRole.password));
    // Any value will do, and that it has one is the point: `auth.ts` refuses to serve without it.
    vi.stubEnv("BETTER_AUTH_SECRET", "a-secret-that-exists-only-for-this-test-run");

    // What `mail/send.ts` refuses to send without. Neither value is real and neither reaches Resend —
    // `interceptResend` above is what stops that — but both are read before the request is built, so
    // their absence would be a refusal rather than a send this suite could observe.
    vi.stubEnv("RESEND_API_KEY", "re_a-key-that-exists-only-for-this-test-run");
    vi.stubEnv("EMAIL_FROM", "CanonCore <noreply@mail.canoncore.com>");

    vi.resetModules();
    ({ withSession, anonymous } = await import("./session"));
    ({ readVisibleStories } = await import("./stories"));
    ({ databaseAnswers } = await import("./health"));
    ({ auth } = await import("../auth/auth"));
    ({ POST: authPost, GET: authGet } = await import("../app/api/auth/[...all]/route"));
  });

  afterAll(async () => {
    // better-auth's rows first: `story` fixtures are owned by string ids of their own, but the
    // accounts these tests create are real rows with a unique email, so a second run would collide.
    // `delete from "user"` takes `session` and `account` with it, by the cascade in `schema.ts`.
    await migrator?.query('delete from "user" where email like $1', [`%@${testEmailDomain}`]);
    // And the one account that is not at `.invalid` — `accountWithMail` says why it cannot be.
    await migrator?.query('delete from "user" where email = $1', [accountWithMail.email]);
    // Reset tokens outlive the `user` rows they name, because `verification` holds an id in a text
    // column rather than a foreign key, so no cascade reaches them.
    await migrator?.query("delete from verification");
    await migrator?.query("delete from rate_limit");

    await migrator?.query("delete from tombstone where id = any($1)", [
      [tombstoneOwnedByA.id, publicTombstone.id],
    ]);
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

  /**
   * The same read of `tombstone`: no `where` clause, so the policy is the filter.
   *
   * `former_type` and `deleted` are read rather than only the keys, because those two are the whole
   * of what a tombstone is for — and a policy that returned somebody else's would be leaking that a
   * record of theirs existed and when it went.
   */
  async function readTombstonesAs(userId: string) {
    return withSession(userId, async (session) => {
      const result = await session.execute<{
        id: string;
        former_type: string;
        deleted: string;
      }>(sql`select id, former_type, deleted from tombstone`);
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

  // ADR-0005 rule 2 for the third table to have a policy. A tombstone holds no value any Source
  // supplied, which is why it may remain at all — and it does hold the fact that one person's
  // record existed and the moment it stopped, so it is user-scoped like `story` rather than shared
  // like `source`.
  //
  // The rule is `story`'s, written a second time because it cannot be delegated: `snapshot`'s
  // policy asks whether the Story is readable, and a tombstone exists precisely when that row does
  // not. `schema.ts` carries that argument on the table.
  describe("row-level security on tombstone", () => {
    test("a reader sees their own tombstones and every public one", async () => {
      const ids = (await readTombstonesAs(ownedByA.owner)).map((row) => row.id);

      expect(ids).toContain(tombstoneOwnedByA.id);
      expect(ids).toContain(publicTombstone.id);
    });

    test("a cross-tenant read of tombstone returns zero rows", async () => {
      const rows = await readTombstonesAs(ownedByB.owner);

      expect(rows.map((row) => row.id)).not.toContain(tombstoneOwnedByA.id);
      expect(rows.map((row) => row.id)).toEqual([publicTombstone.id]);
    });

    test("a session that sets nothing at all reads no owned tombstones", async () => {
      const rows = await withRawSession(async (application) => {
        await application.query("begin");
        const { rows } = await application.query<{ id: string }>("select id from tombstone");
        await application.query("commit");
        return rows;
      });

      expect(rows.map((row) => row.id)).toEqual([publicTombstone.id]);
    });

    // Decision 8's own reversal test, asked of the table rather than of a reviewer: "if the shape
    // ever grows a title 'so the page reads better', the decision has been reversed by accident".
    // The whole column list, for `source`'s reason below — a column called `former_title` reverses
    // it exactly as much as one called `title`, and only an exact list catches both.
    test("a tombstone carries the identity, the kind, the time and its policy's two, and nothing else", async () => {
      const { rows } = await migrator.query<{ column_name: string }>(
        `select column_name from information_schema.columns
          where table_schema = 'public' and table_name = 'tombstone'
          order by column_name`,
      );

      // `owner_id` and `visibility` are here because the policy above needs them, and neither is a
      // value any Source supplied. Anything else arriving is the accident Decision 8 names.
      expect(rows.map((row) => row.column_name)).toEqual([
        "deleted",
        "former_type",
        "id",
        "owner_id",
        "visibility",
      ]);
    });
  });

  // The first of the two tripwires, and the one that is about every table rather than about
  // `source`: a table arriving with no policy is a decision somebody has to have taken, and this
  // is where they are made to take it.
  //
  // **It fired when better-auth's five tables landed, and they were classified rather than pasted
  // in.** All five carry row-level security, because each names `canoncore_auth` in a policy — which
  // is what turns row security *on*, and therefore also what stops the table being readable in full
  // by whoever is granted it next. `source` is still the only `false`, for ADR-0014 decision 6's
  // reason and no other.
  test("every table is classified as protected or deliberately not", async () => {
    const { rows } = await migrator.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class
        where relnamespace = 'public'::regnamespace and relkind in ('r', 'p', 'f', 'm')
        order by relname`,
    );

    expect(rows).toEqual([
      { relname: "account", relrowsecurity: true },
      { relname: "rate_limit", relrowsecurity: true },
      { relname: "session", relrowsecurity: true },
      { relname: "snapshot", relrowsecurity: true },
      { relname: "source", relrowsecurity: false },
      { relname: "story", relrowsecurity: true },
      { relname: "tombstone", relrowsecurity: true },
      { relname: "user", relrowsecurity: true },
      { relname: "verification", relrowsecurity: true },
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
  //
  // **Asked of both roles, from one query written once.** Since CAN-24 A signed-in and a signed-out
  // path there are two roles whose reach has to be pinned, and they are pinned by the same four
  // questions over the same nine tables — so what differs between the two tests below is the
  // expected table and nothing else.
  async function whatEachTableAllows(role: string) {
    const { rows } = await migrator.query<{
      relname: string;
      may_select: boolean;
      may_insert: boolean;
      may_update: boolean;
      may_delete: boolean;
    }>(
      `select c.relname,
              has_table_privilege($1, c.oid, 'SELECT') as may_select,
              has_table_privilege($1, c.oid, 'INSERT') as may_insert,
              has_table_privilege($1, c.oid, 'UPDATE') as may_update,
              has_table_privilege($1, c.oid, 'DELETE') as may_delete
         from pg_class c
        where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'f', 'm')
        order by c.relname`,
      [role],
    );
    return rows;
  }

  const readOnly = { may_select: true, may_insert: false, may_update: false, may_delete: false };
  /** No privilege at all, which is a refusal the role gets told about rather than an empty result. */
  const unreachable = {
    may_select: false,
    may_insert: false,
    may_update: false,
    may_delete: false,
  };

  test("the application role may read every table and write none", async () => {
    expect(await whatEachTableAllows("canoncore_app")).toEqual([
      // **All five of better-auth's tables are `unreachable`, not `readOnly`.** Nothing in the
      // application reads one, so there is no grant — migration 0009 holds the argument, including
      // why an earlier draft's `SELECT` on `user` and `session` was removed.
      { relname: "account", ...unreachable },
      { relname: "rate_limit", ...unreachable },
      { relname: "session", ...unreachable },
      { relname: "snapshot", ...readOnly },
      { relname: "source", ...readOnly },
      { relname: "story", ...readOnly },
      { relname: "tombstone", ...readOnly },
      { relname: "user", ...unreachable },
      { relname: "verification", ...unreachable },
    ]);
  });

  /**
   * The fifth tripwire, added with the third role: **what better-auth's role may do, asked of every
   * table rather than of the five it is meant to reach.**
   *
   * The four rows of `false` are the half that matters, and they are not covered by the policies:
   * `canoncore_auth` has no policy on `story`, `source`, `snapshot` or `tombstone`, so a *read*
   * would return nothing — but a write would succeed, because no policy at all is not the same as a
   * restrictive one. Only the absent grant refuses it, and only this test can see that.
   */
  test("the auth role may write its own five tables and reach no other", async () => {
    const writable = {
      may_select: true,
      may_insert: true,
      may_update: true,
      may_delete: true,
    };
    expect(await whatEachTableAllows("canoncore_auth")).toEqual([
      { relname: "account", ...writable },
      { relname: "rate_limit", ...writable },
      { relname: "session", ...writable },
      { relname: "snapshot", ...unreachable },
      { relname: "source", ...unreachable },
      { relname: "story", ...unreachable },
      { relname: "tombstone", ...unreachable },
      { relname: "user", ...writable },
      { relname: "verification", ...writable },
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

  // What `§1.D` requires when a Source's licence terminates, which is an event rather than a
  // duration and therefore nothing `source.retention` can express:
  // docs/adr/0014-shell-providers-and-per-source-retention.md -> It models §1.C and cannot
  // represent §1.D. Run by hand, as `canoncore_migrator` — docs/runbook.md -> A Source's licence
  // terminates is the procedure and names the operator.
  //
  // Its own fixtures, and deliberately not the ones above: a purge deletes rows, and a test that
  // deleted the fixtures the rest of this file reads would fail whichever order vitest chose. The
  // Sources here are a third and a fourth, and the Stories a third owner's. They are seeded and
  // removed by this suite rather than by the file, which is what the exact reads above depend on —
  // one of these Stories is public, and a tombstone of it outliving the suite would join them.
  describe("purging a Source whose licence has terminated", () => {
    let purgeSource: typeof import("./purge-source").purgeSource;
    let howThePurgeTreatsEachTable: typeof import("./purge-source").howThePurgeTreatsEachTable;
    let report: Awaited<ReturnType<typeof purgeSource>>;

    beforeAll(async () => {
      ({ purgeSource, howThePurgeTreatsEachTable } = await import("./purge-source"));

      await migrator.query(
        `insert into source (id, retention) values ($1, '6 months'), ($2, '6 months')
         on conflict (id) do nothing`,
        [terminatedSource.id, survivingSource.id],
      );

      // The one public Story of the three, and it is the one the purge empties: a tombstone has to
      // carry the Visibility its Story had, and a `visibility` the purge defaulted to `private`
      // would pass every assertion a private fixture could make.
      await migrator.query(
        `insert into story (id, title, owner_id, visibility) values
           ($1, 'A Story only the terminated Source said anything about', $2, 'public'),
           ($3, 'A Story two Sources both said something about', $4, 'private'),
           ($5, 'A Story only the surviving Source said anything about', $6, 'private')
         on conflict (id) do nothing`,
        [
          onlyTheTerminatedSource.id,
          onlyTheTerminatedSource.owner,
          bothSources.id,
          bothSources.owner,
          onlyTheSurvivingSource.id,
          onlyTheSurvivingSource.owner,
        ],
      );

      await migrator.query(
        `insert into snapshot (story_id, source_id, fetched_at) values
           ($1, $2, $3), ($4, $2, $3), ($4, $5, $3), ($6, $5, $3)`,
        [
          onlyTheTerminatedSource.id,
          terminatedSource.id,
          readLongAgo,
          bothSources.id,
          survivingSource.id,
          onlyTheSurvivingSource.id,
        ],
      );

      report = await purgeSource(migrator, terminatedSource.id);
    });

    afterAll(async () => {
      await migrator?.query("delete from tombstone where owner_id = $1", [
        onlyTheTerminatedSource.owner,
      ]);
      await migrator?.query("delete from story where id = any($1)", [
        [onlyTheTerminatedSource.id, bothSources.id, onlyTheSurvivingSource.id],
      ]);
      await migrator?.query("delete from source where id = any($1)", [
        [terminatedSource.id, survivingSource.id],
      ]);
    });

    /** Every Snapshot of the three fixture Stories, whichever Source it came from. */
    async function survivingSnapshots() {
      const { rows } = await migrator.query<{ story_id: string; source_id: string }>(
        `select story_id, source_id from snapshot where story_id = any($1) order by story_id`,
        [[onlyTheTerminatedSource.id, bothSources.id, onlyTheSurvivingSource.id]],
      );
      return rows;
    }

    // The acceptance criterion in one assertion: two Sources seeded, one purged, the other proved
    // untouched. What makes it worth asserting rather than obvious is that the purge is a
    // cross-tenant delete over a shared table, so the predicate that selects rows is the only thing
    // standing between "this Source's content" and everybody's.
    test("deletes every Snapshot of the purged Source and touches no Snapshot of the other", async () => {
      expect(report.snapshotsDeleted).toBe(2);
      expect(await survivingSnapshots()).toEqual([
        { story_id: bothSources.id, source_id: survivingSource.id },
        { story_id: onlyTheSurvivingSource.id, source_id: survivingSource.id },
      ]);
    });

    test("replaces a Story it emptied with a tombstone carrying what it was and when it went", async () => {
      expect(report.storiesTombstoned).toEqual([onlyTheTerminatedSource.id]);

      const { rows } = await migrator.query<{
        id: string;
        former_type: string;
        deleted: Date;
        owner_id: string;
        visibility: string;
      }>("select id, former_type, deleted, owner_id, visibility from tombstone where id = $1", [
        onlyTheTerminatedSource.id,
      ]);

      expect(rows).toEqual([
        {
          id: onlyTheTerminatedSource.id,
          former_type: "story",
          deleted: expect.any(Date),
          owner_id: onlyTheTerminatedSource.owner,
          // Carried from the Story rather than defaulted, which is why this fixture is the public one.
          visibility: "public",
        },
      ]);
      // The moment the purge ran, not the moment the Story was written. Two minutes of slack rather
      // than none, because the assertion is about which event the column records.
      expect(Date.now() - rows[0]!.deleted.getTime()).toBeLessThan(120_000);

      const { rowCount } = await migrator.query("select 1 from story where id = $1", [
        onlyTheTerminatedSource.id,
      ]);
      expect(rowCount).toBe(0);
    });

    // The other half of decision 8: a record with something left is not a tombstone. Here what is
    // left is another Source's Snapshot; when Overrides exist it will also be a value its owner
    // typed, and the classification tripwire below is what will make that a decision rather than an
    // omission.
    test("leaves standing a Story another Source still says something about", async () => {
      expect(report.storiesKeptForAnotherSource).toBe(1);

      const { rows } = await migrator.query<{ id: string }>(
        "select id from story where id = any($1) order by id",
        [[bothSources.id, onlyTheSurvivingSource.id]],
      );
      expect(rows.map((row) => row.id)).toEqual([bothSources.id, onlyTheSurvivingSource.id]);

      const tombstones = await migrator.query("select 1 from tombstone where id = any($1)", [
        [bothSources.id, onlyTheSurvivingSource.id],
      ]);
      expect(tombstones.rowCount).toBe(0);
    });

    test("takes the Source's own row with it, and leaves the other Source's", async () => {
      const { rows } = await migrator.query<{ id: string }>(
        "select id from source where id = any($1)",
        [[terminatedSource.id, survivingSource.id]],
      );

      expect(rows.map((row) => row.id)).toEqual([survivingSource.id]);
    });

    // Why deleting that row is the proof rather than a tidy-up. `snapshot.source_id` references
    // `source` with `on delete no action`, so the statement above could only succeed because no
    // Snapshot of it survived anywhere — including rows this transaction never looked at.
    test("a Source cannot be deleted while a Snapshot of it survives", async () => {
      await expect(
        migrator.query("delete from source where id = $1", [survivingSource.id]),
      ).rejects.toThrow(/snapshot_source_id_source_id_fk/);
    });

    // A purge of nothing reads exactly like a purge that worked, and the report it would print is
    // the evidence that the duty was discharged. So a Source that is not there is a refusal.
    test("refuses a Source that is not there rather than reporting a purge of nothing", async () => {
      await expect(purgeSource(migrator, "0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f")).rejects.toThrow(
        /no Source/,
      );
    });

    test("reports nothing unreached, because every table that exists is classified", () => {
      expect(report.tablesNotReached).toEqual([]);
    });

    // The pressure the purge itself no longer applies, applied here instead — in the pull request
    // that adds a table rather than during an incident. Adding one means answering the question this
    // record asks: docs/adr/0014-shell-providers-and-per-source-retention.md -> Decision 6, items 2
    // and 3, for the two that are known and unresolved.
    //
    // The record's contents rather than a live read: the test above is the live one, and this is why
    // a new table has to be written down here by hand.
    test("classifies exactly nine tables, and names each of them", () => {
      expect(Object.keys(howThePurgeTreatsEachTable).sort()).toEqual([
        "account",
        "rate_limit",
        "session",
        "snapshot",
        "source",
        "story",
        "tombstone",
        "user",
        "verification",
      ]);
    });
  });

  // What happens when the day the tripwire exists for arrives: `supersededValue` or an audit payload
  // lands, nothing says what the purge should do with it, and a termination is owed a purge anyway.
  //
  // **A real table, created and committed**, because that is the only way to see what a dispatched
  // purge would see. It is dropped again in `afterAll` — the two table tripwires above assert the
  // exact contents of `public`, so a leaked fixture table would fail them on the next run rather
  // than here.
  describe("purging while a table nothing has classified exists", () => {
    let purgeSource: typeof import("./purge-source").purgeSource;
    let partial: Awaited<ReturnType<typeof purgeSource>>;

    beforeAll(async () => {
      ({ purgeSource } = await import("./purge-source"));

      await migrator.query('drop table if exists "audit_payload"');
      await migrator.query('create table "audit_payload" (id uuid primary key)');
      await migrator.query(`insert into source (id, retention) values ($1, '6 months')`, [
        unclassifiedTableSource.id,
      ]);
      await migrator.query(
        `insert into story (id, title, owner_id, visibility)
         values ($1, 'A Story purged while the schema had grown', $2, 'private')`,
        [purgedWhileUnclassified.id, purgedWhileUnclassified.owner],
      );
      await migrator.query(
        `insert into snapshot (story_id, source_id, fetched_at) values ($1, $2, $3)`,
        [purgedWhileUnclassified.id, unclassifiedTableSource.id, readLongAgo],
      );

      partial = await purgeSource(migrator, unclassifiedTableSource.id);
    });

    afterAll(async () => {
      await migrator?.query('drop table if exists "audit_payload"');
      await migrator?.query("delete from tombstone where owner_id = $1", [
        purgedWhileUnclassified.owner,
      ]);
      await migrator?.query("delete from story where id = $1", [purgedWhileUnclassified.id]);
      await migrator?.query("delete from source where id = $1", [unclassifiedTableSource.id]);
    });

    // The part it could discharge, discharged. Refusing outright would have left the Snapshots as
    // well, which is a worse licence position than leaving one table nobody has classified.
    test("purges what it is sure of, and names what it could not account for", async () => {
      expect(partial.tablesNotReached).toEqual(["audit_payload"]);
      expect(partial.snapshotsDeleted).toBe(1);
      expect(partial.storiesTombstoned).toEqual([purgedWhileUnclassified.id]);
    });

    // The row is the handle a re-run takes, so a partial purge keeps it. Deleting it would also be
    // claiming a completeness this run cannot claim.
    test("keeps the Source's own row, so the purge can be finished rather than restarted", async () => {
      const { rowCount } = await migrator.query("select 1 from source where id = $1", [
        unclassifiedTableSource.id,
      ]);

      expect(rowCount).toBe(1);
    });

    test("completes on a second run once the schema is one it recognises again", async () => {
      await migrator.query('drop table "audit_payload"');

      const finished = await purgeSource(migrator, unclassifiedTableSource.id);

      expect(finished.tablesNotReached).toEqual([]);
      // Nothing left to delete: the Snapshot went on the first run. What the second run adds is the
      // one statement the first withheld.
      expect(finished.snapshotsDeleted).toBe(0);
      const { rowCount } = await migrator.query("select 1 from source where id = $1", [
        unclassifiedTableSource.id,
      ]);
      expect(rowCount).toBe(0);
    });
  });

  /**
   * The whole of what CAN-24 A signed-in and a signed-out path joins together, exercised through the
   * route a browser actually posts to rather than through `auth.api`.
   *
   * **Through the route on purpose.** `auth.api.signInEmail` is not rate limited — better-auth states
   * that server-side calls are exempt — and it never produces the redirect a form needs, so a test
   * using it would pass while neither the limiter nor the redirect existed.
   * `../app/api/auth/[...all]/route.ts` has the argument.
   */
  describe("signing up, signing in and signing out", () => {
    const signUp = (account: typeof firstAccount, ip = freshAddress()) =>
      authPost(formPost("/api/auth/sign-up/email", { ...account }, ip));

    const signIn = (credentials: { email: string; password: string }, ip = freshAddress()) =>
      authPost(
        formPost(
          "/api/auth/sign-in/email",
          { email: credentials.email, password: credentials.password },
          ip,
        ),
      );

    /** The session behind a cookie, read exactly as `viewer.ts` reads it. */
    const sessionBehind = (cookie: string) =>
      auth().api.getSession({ headers: new Headers({ cookie }) });

    const userIdBehind = async (cookie: string) => (await sessionBehind(cookie))?.user.id;

    /**
     * Both accounts, created before any test runs rather than by one of them.
     *
     * **A test must not depend on a sibling's side effect**, and the first draft of this file did:
     * the cross-tenant reads below read the ids that the sign-up test happened to have created, so
     * running one test alone left them undefined and inserted a null owner.
     *
     * **Then confirmed as the migrator, which is a shortcut and is the right one here.** Since
     * CAN-31 Email verification and password reset an unconfirmed account cannot sign in
     * (`auth/auth.ts` → `requireEmailVerification`), and confirming these two the way a person does
     * would mean reading a link out of an email — which the guard in `mail/send.ts` refuses to send
     * to a `.invalid` address, deliberately. **The flow itself is not being skipped**: the block
     * below drives it end to end on an address the guard admits, and that is where the claim about
     * verification is made. What these two accounts are for is sessions and policies, and a column
     * set by hand serves that exactly as well as one set by a link.
     */
    beforeAll(async () => {
      for (const account of [firstAccount, secondAccount]) {
        const created = await signUp(account);
        expect(created.headers.get("location")).toBe("/sign-in?created");
      }
      await migrator.query('update "user" set email_verified = true where email like $1', [
        `%@${testEmailDomain}`,
      ]);
    });

    // A plain form, with no JavaScript anywhere in it. Two things are asserted at once and both
    // matter: that better-auth accepts a form-encoded body at all, and that what comes back is a
    // redirect a browser can follow rather than the JSON it answers a `fetch` with.
    test("a plain HTML form creates an account, and the browser is redirected", async () => {
      const email = `plain-form@${testEmailDomain}`;
      const response = await signUp({ ...firstAccount, email });

      expect(response.status).toBe(303);
      // To sign-in rather than home, because signing up deliberately does not sign you in:
      // `auth/auth.ts` -> `autoSignIn` is what switches the enumeration protection on.
      expect(response.headers.get("location")).toBe("/sign-in?created");

      const { rows } = await migrator.query<{ email: string; email_verified: boolean }>(
        'select email, email_verified from "user" where email = $1',
        [email],
      );
      // `false`, because creating the account is not confirming the address: a link has to be
      // followed, and since CAN-31 Email verification and password reset that link is also what
      // stands between this account and signing in. The block below follows one.
      expect(rows).toEqual([{ email, email_verified: false }]);
    });

    /**
     * **The guard, in the flow rather than in isolation.** `mail/send.ts`'s own tests prove the
     * function refuses a recipient at neither domain it admits; only this can show that the refusal is
     * actually wired into a sign-up, which is the claim that matters — a guard nothing reaches is a
     * guard.
     *
     * The address here is at `.invalid`, so nothing at all should have been handed to Resend for it.
     * That is also why the two fixture accounts above are confirmed with an `update` rather than by
     * following a link: for them, there is no link.
     */
    test("a sign-up outside production sends nothing at all to an address the guard refuses", async () => {
      const email = `guarded@${testEmailDomain}`;

      await signUp({ ...firstAccount, email });

      expect(sent.map((email) => email.to)).not.toContain(email);
    });

    test("signing in issues a session cookie, and the cookie has no Domain", async () => {
      const response = await signIn(firstAccount);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe("/");

      // **The name carries a `__Secure-` prefix over HTTPS and not over HTTP**, so the match ignores
      // it. This suite runs against a local PostgreSQL with an `http` origin and sees
      // `better-auth.session_token`; the deployed preview sends `__Secure-better-auth.session_token`,
      // read off a real response on 17 August 2026. Matching the bare name would still have failed
      // loudly rather than silently, but it would have failed for the wrong reason.
      const sessionCookie = response.headers
        .getSetCookie()
        .find((cookie) => /^(__Secure-)?better-auth\.session_token=/.test(cookie));
      expect(sessionCookie).toBeDefined();

      // ADR-0010's reason for `www` being canonical is a host-only cookie. `Domain=` is what
      // `vercel:auth` and most better-auth examples suggest, and it is the thing not to add — so its
      // absence is asserted rather than trusted to a default. **Confirmed on the deployed preview
      // too**, past the CDN: `Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax`, and no
      // `Domain`. `Secure` appears only there, which is why it is not asserted here.
      expect(sessionCookie).not.toMatch(/;\s*Domain=/i);
      expect(sessionCookie).toMatch(/;\s*HttpOnly/i);
      expect(sessionCookie).toMatch(/;\s*SameSite=Lax/i);
    });

    // **The seam this ticket is about.** better-auth resolved the cookie as `canoncore_auth`; the id
    // it hands back is what `page.tsx` gives `withSession`, which is what `SET LOCAL` sets and every
    // policy compares against. This asserts the two identities are one value rather than two that
    // happen to agree.
    test("the id behind the cookie is the id SET LOCAL sets", async () => {
      const cookie = cookieFrom(await signIn(firstAccount));
      const userId = await userIdBehind(cookie);
      expect(userId).toBeDefined();

      const sessionUser = await withSession(userId!, async (session) => {
        const result = await session.execute<{ who: string }>(
          sql`select current_setting(${sessionUserSetting}, true) as who`,
        );
        return result.rows[0]?.who;
      });

      expect(sessionUser).toBe(userId);
    });

    /**
     * **A session survives a page load**, which is an acceptance criterion and is not the same claim as
     * "signing in worked": the cookie has to still resolve on a *later* request holding nothing but the
     * cookie.
     *
     * **The second read goes through a freshly imported `auth` module**, and that is what makes this
     * more than calling one function twice. A first version read twice from the same instance, which
     * proved only that `getSession` is not single-use. Re-importing gives a second instance that shares
     * no memory with the first — which is the shape of the real case, because Vercel Functions are
     * per-invocation isolates and a page load may land on a cold one.
     *
     * **So this is also the assertion behind `BETTER_AUTH_SECRET`.** `auth/auth.ts` refuses to serve
     * without it precisely because better-auth would otherwise invent one per process: with a
     * per-instance secret, the second instance below could not verify the first's cookie, and the
     * symptom in production would be a person being signed out at random. That failure is exactly what
     * this test now reproduces.
     *
     * **What it still does not do is render a page.** `page.tsx` reads `next/headers`, which exists only
     * inside a Next request, so no test in this suite can call it — and the Playwright suite
     * deliberately never signs in, because it runs against production by default. The seam either side
     * of the page is covered; the render between them is not, and CAN-57 Make a public Ordering
     * discoverable and shareable is the first ticket with a signed-in page worth driving.
     */
    test("a session survives a page load, and a second isolate can verify it", async () => {
      const cookie = cookieFrom(await signIn(firstAccount));
      const first = await userIdBehind(cookie);
      expect(first).toBeDefined();

      // A second `auth` instance, built from scratch against the same secret and database.
      vi.resetModules();
      const { auth: freshAuth } = await import("../auth/auth");
      const laterRequest = await freshAuth().api.getSession({ headers: new Headers({ cookie }) });

      expect(laterRequest?.user.id).toBe(first);
    });

    /**
     * Signing out, and the `415` this suite failed to catch once already.
     *
     * `/sign-out` declares no allowed media types and so inherits `application/json`, so a browser's
     * form post is refused — and the first version of this test passed anyway, because a `Request`
     * built with no `body` option has a null body while a browser sends an empty string. It was
     * asserting the inference rather than the behaviour. `route.ts` now converts every form post and
     * `formPost` sends an empty body exactly as a browser does, so this asserts the real case.
     *
     * The `not.toBe(415)` is redundant beside the `303` while both hold, and it is the line that
     * names what went wrong if that conversion is ever removed.
     */
    test("a form with no fields signs out, and deletes that session and no other", async () => {
      const otherCookie = cookieFrom(await signIn(firstAccount));
      const cookie = cookieFrom(await signIn(firstAccount));
      const signedIn = await sessionBehind(cookie);
      const sessionId = signedIn!.session.id;

      const response = await authPost(formPost("/api/auth/sign-out", {}, freshAddress(), cookie));

      expect(response.status).not.toBe(415);
      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe("/");
      await expect(userIdBehind(cookie)).resolves.toBeUndefined();

      const gone = await migrator.query('select 1 from "session" where id = $1', [sessionId]);
      expect(gone.rowCount).toBe(0);
      // Signing out of one browser is not signing out of every browser, and the difference is worth
      // pinning: better-auth deletes the session the cookie names and no other.
      await expect(userIdBehind(otherCookie)).resolves.toBe(signedIn!.user.id);
    });

    test("a wrong password is refused, and says which page to go back to", async () => {
      const response = await signIn({
        email: firstAccount.email,
        password: "not-the-right-password",
      });

      expect(response.status).toBe(303);
      // A code, never better-auth's message: `auth/failures.ts` says why the page renders a sentence
      // of its own instead. One code covers a wrong password and an unknown address, so the answer
      // cannot be read as "does this person have an account".
      expect(response.headers.get("location")).toBe("/sign-in?error=INVALID_EMAIL_OR_PASSWORD");
    });

    // The floor raised from better-auth's default of 8. Asserted as a refusal rather than as the
    // presence of `minPasswordLength`, which is a setting a typo could satisfy.
    test("a password shorter than the minimum is refused", async () => {
      const email = `too-short@${testEmailDomain}`;
      const response = await signUp({
        ...firstAccount,
        email,
        password: "a".repeat(passwordMinimum - 1),
      });

      expect(response.headers.get("location")).toBe("/sign-up?error=PASSWORD_TOO_SHORT");

      const { rowCount } = await migrator.query('select 1 from "user" where email = $1', [email]);
      expect(rowCount).toBe(0);
    });

    // The enumeration protection `autoSignIn: false` switches on. Without it better-auth answers
    // `422 USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`, which tells any caller whether a given person has
    // an account here. What is asserted is that the answer is *indistinguishable* from the one a free
    // address gets, and that no second row was written.
    test("signing up with an address already in use gives nothing away", async () => {
      const response = await signUp(firstAccount);

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe("/sign-in?created");

      const { rowCount } = await migrator.query('select 1 from "user" where email = $1', [
        firstAccount.email,
      ]);
      expect(rowCount).toBe(1);
    });

    /**
     * **Repeated failed sign-ins are actually refused**, which is the criterion, and a different
     * claim from "rate limiting is configured".
     *
     * `/sign-in/email` allows 3 in 10 seconds, so the fourth attempt is the one that must be refused.
     * The refusal is a `429`, which `route.ts` turns into `?error=TOO_MANY_REQUESTS` for a browser, so
     * both halves are asserted: the request is refused, and the reader is told why.
     *
     * **And that the counter is in the database rather than in memory**, which is the whole of the
     * hardening item: a memory-backed counter is per-process, and Vercel Functions are per-invocation
     * isolates, so it would enforce nothing in production while passing a test exactly like this one.
     * The row is what distinguishes the two.
     *
     * **The one address in this file that is deliberately reused.** Everywhere else a fresh one keeps
     * tests out of each other's window; here sharing it is the whole experiment.
     */
    test("a fourth failed sign-in in ten seconds is refused, from a counter in the database", async () => {
      const attacker = freshAddress();
      const attempt = () =>
        signIn({ email: firstAccount.email, password: "still-not-the-password" }, attacker);

      for (let made = 0; made < 3; made++) {
        const allowed = await attempt();
        expect(allowed.headers.get("location")).toBe("/sign-in?error=INVALID_EMAIL_OR_PASSWORD");
      }

      const refused = await attempt();
      expect(refused.headers.get("location")).toBe("/sign-in?error=TOO_MANY_REQUESTS");

      const { rows } = await migrator.query<{ key: string; count: number }>(
        "select key, count from rate_limit where key = $1",
        [`${attacker}|/sign-in/email`],
      );
      expect(rows).toEqual([{ key: `${attacker}|/sign-in/email`, count: 3 }]);
    });

    // What a `fetch` client gets, which is the other half of `route.ts`'s one decision: no
    // `sec-fetch-mode: navigate`, so better-auth's own answer passes through untouched. Asserted
    // because the redirect has to be an addition for browsers rather than a change to the endpoint.
    test("a fetch client gets better-auth's own JSON, not a redirect", async () => {
      const response = await authPost(
        new Request(`${origin}/api/auth/sign-in/email`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin,
            "x-forwarded-for": freshAddress(),
          },
          body: JSON.stringify({ email: firstAccount.email, password: firstAccount.password }),
        }),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
      const body = (await response.json()) as { user?: { email?: string } };
      expect(body.user?.email).toBe(firstAccount.email);
    });

    // The three-way claim the ticket makes about a private Story, asserted through the page's own
    // query so the policy is the only filter. The owner here is a real signed-in identity rather than
    // one of the string fixtures the rest of this file uses.
    describe("what a signed-in reader may read", () => {
      const privateStory = { id: "1c1c1c1c-1c1c-4c1c-8c1c-1c1c1c1c1c1c", title: "A private Story" };
      let ownerId: string;
      let strangerId: string;

      beforeAll(async () => {
        ownerId = (await userIdBehind(cookieFrom(await signIn(firstAccount))))!;
        strangerId = (await userIdBehind(cookieFrom(await signIn(secondAccount))))!;

        // Written by the role that owns the table, because the application role holds SELECT and
        // nothing else. Nothing in this release lets a person create a Story, so the row an owner
        // reads has to be put there by the migrator.
        await migrator.query(
          "insert into story (id, title, owner_id, visibility) values ($1, $2, $3, 'private')",
          [privateStory.id, privateStory.title, ownerId],
        );
      });

      afterAll(async () => {
        await migrator?.query("delete from story where id = $1", [privateStory.id]);
      });

      test("the owner sees their own private Story", async () => {
        const titles = (await readVisibleStories(ownerId)).map((story) => story.title);
        expect(titles).toContain(privateStory.title);
      });

      test("a different signed-in reader does not", async () => {
        const titles = (await readVisibleStories(strangerId)).map((story) => story.title);
        expect(titles).not.toContain(privateStory.title);
      });

      test("an anonymous visitor sees neither, and still sees the public Story", async () => {
        const titles = (await readVisibleStories(anonymous)).map((story) => story.title);
        expect(titles).not.toContain(privateStory.title);
        expect(titles).toContain(foundingStory.title);
      });
    });

    /**
     * **The two flows of CAN-31 Email verification and password reset, end to end and without sending
     * real mail.** This block is that acceptance criterion.
     *
     * ## What "end to end" means here, and why it is not the Playwright suite
     *
     * Every step a person takes, through the same route handlers a browser reaches: the form post, the
     * email that results, the link in it followed as a `GET`, and the state that follows. What is stood
     * in for is exactly one thing — the HTTP request to Resend — and `interceptResend` above replaces
     * `fetch` for that one host, so the message asserted on below is the real body `mail/send.ts`
     * built, carrying the real URL better-auth put in it.
     *
     * **It cannot be a Playwright spec on any gate**, and that is worth stating because "end-to-end
     * test" usually means one. That suite drives a *deployed* URL and defaults to production, where
     * `../../e2e/signed-out-path.spec.ts` records why it deliberately never creates an account.
     * `../../e2e/account-recovery.spec.ts` covers what only a deployment can add, which is that the
     * two pages exist and render.
     *
     * **One spec does now read a real inbox**, and it is the exception rather than a replacement for
     * this block: `../../e2e/verification-by-inbox.spec.ts` signs up on a *preview*, reads the message
     * out of Resend's inbound store and follows the link, since CAN-140 Verify a real send against our
     * own inbox, not a personal mailbox. It runs by hand, because reading inbound needs a
     * `full_access` key and a run spends two of the hundred sends a day. So the claim stays split: it
     * proves a message left and arrived, and this block proves everything either flow does with it.
     *
     * ## The order these run in is load-bearing
     *
     * They are one narrative over one account: sign up, be refused for being unconfirmed, confirm, sign
     * in, forget the password, reset it, sign in again. vitest runs tests within a file in order, and
     * splitting them into independent tests would mean either six accounts or six re-runs of the same
     * setup. So each names what it depends on, and the sequence is the subject rather than an accident
     * of it.
     */
    describe("confirming an address, and resetting a forgotten password", () => {
      /**
       * Created here rather than in the outer `beforeAll`, and left unconfirmed on purpose: the first
       * test below is that an unconfirmed account cannot sign in, so confirming it in setup would
       * remove the thing being tested.
       */
      beforeAll(async () => {
        const created = await signUp(accountWithMail);
        expect(created.headers.get("location")).toBe("/sign-in?created");
      });

      /**
       * **Signing up sends a confirmation email, and its link is one this application chose.**
       *
       * `callbackURL` is not in the submitted form — `route.ts` → `flows` adds it server-side, so a
       * body cannot choose where this service sends people — and it has to be `/sign-in?verified`
       * rather than the front page, because confirming an address does not sign anybody in.
       */
      test("signing up sends a confirmation email carrying a link to this application", () => {
        const link = linkEmailedTo(accountWithMail.email);

        expect(link).toMatch(
          new RegExp(`^${origin}/api/auth/verify-email\\?token=[^&]+&callbackURL=`),
        );
        // Encoded, and the value is this application's rather than the form's.
        expect(link).toContain(`callbackURL=${encodeURIComponent("/sign-in?verified")}`);

        const email = sent.at(-1)!;
        expect(email.subject).toBe("Verify your email address for CanonCore");
        expect(email.to).toBe(accountWithMail.email);
      });

      /**
       * **The gate, before the link is followed.** This is what
       * `auth/auth.ts` → `requireEmailVerification` buys, and the criterion it is worth asserting
       * against: the password is correct here, so what refuses the sign-in is the unconfirmed address
       * and nothing else.
       */
      test("an unconfirmed account cannot sign in, though the password is right", async () => {
        const response = await signIn(accountWithMail);

        expect(response.status).toBe(303);
        expect(response.headers.get("location")).toBe("/sign-in?error=EMAIL_NOT_VERIFIED");
      });

      /**
       * **And being refused sends another link**, which is the whole recovery route for somebody whose
       * first email never arrived — `auth/auth.ts` → `sendOnSignIn`. Without it, the gate above would
       * be a locked door with no key.
       *
       * **A second email, not a second token**, and the difference was found here rather than assumed.
       * A verification token is a JWT over `{ email }` alone, signed HS256, with `iat` and `exp` at
       * second granularity (`setIssuedAt()` and `setExpirationTime` in
       * `better-auth/dist/crypto/jwt.mjs`, 1.6.29) — so two minted in the same second are byte
       * identical, and an assertion that the string differed would fail for a flow that is working. It
       * does not matter that they are: the token is not consumed on use, so the point is that a fresh
       * email arrives, and that its link is one that will work.
       */
      test("the refusal sends another link, so a lost email is not a lost account", async () => {
        const before = sent.length;

        await signIn(accountWithMail);

        expect(sent.length).toBe(before + 1);
        const again = sent.at(-1)!;
        expect(again.to).toBe(accountWithMail.email);
        expect(again.subject).toBe("Verify your email address for CanonCore");
        expect(linkEmailedTo(accountWithMail.email)).toContain("/api/auth/verify-email?token=");
      });

      /**
       * **The link followed, as a browser follows it**, which is the one step that could not exist
       * before this ticket: `route.ts` had no `GET` export, so this request would have been a `405`.
       *
       * Asserted on the database as well as on the redirect, because the redirect is what a person
       * sees and the column is what the gate reads.
       */
      test("following the link confirms the address and lands on the sign-in page", async () => {
        const link = linkEmailedTo(accountWithMail.email);

        const response = await authGet(follow(link, freshAddress()));

        // better-auth answers a followed link with a redirect of its own, at the `callbackURL` this
        // application supplied — 302 rather than the 303 `route.ts` mints for a form post.
        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe("/sign-in?verified");

        const { rows } = await migrator.query<{ email_verified: boolean }>(
          'select email_verified from "user" where email = $1',
          [accountWithMail.email],
        );
        expect(rows).toEqual([{ email_verified: true }]);
      });

      /**
       * **No session came out of that**, which is `auth/auth.ts` → `autoSignInAfterVerification` being
       * off, and is the assertion that decision needs: email is not a channel this service controls,
       * so a forwarded or prefetched URL must not be a way in.
       */
      test("confirming an address issues no session, so the link is not a way in", async () => {
        const response = await authGet(follow(linkEmailedTo(accountWithMail.email), freshAddress()));

        expect(response.headers.getSetCookie()).toEqual([]);
      });

      // The gate opening. Same credentials as the refused attempt above, and the only thing that
      // changed between them is the column a followed link set.
      test("once confirmed, the same credentials sign in", async () => {
        const response = await signIn(accountWithMail);

        expect(response.headers.get("location")).toBe("/");
        await expect(userIdBehind(cookieFrom(response))).resolves.toBeDefined();
      });

      /**
       * **Asking for a reset answers the same way whichever address it is given**, which is the
       * enumeration protection on this flow and the reason the page's notice is conditional.
       *
       * Both halves are asserted: the redirect is identical, and an address nobody holds provokes no
       * email at all — so the only thing that could distinguish them is response time, which is what
       * `auth/auth.ts` → `afterTheResponse` exists to flatten.
       */
      test("asking for a reset link says the same thing for an address nobody holds", async () => {
        const before = sent.length;

        const unknown = await authPost(
          formPost(
            "/api/auth/request-password-reset",
            { email: `nobody-at-all@resend.dev` },
            freshAddress(),
          ),
        );

        expect(unknown.headers.get("location")).toBe("/forgot-password?sent");
        expect(sent).toHaveLength(before);
      });

      /**
       * **The reset email, and the two-step round trip its link takes.**
       *
       * better-auth emails `/api/auth/reset-password/<token>?callbackURL=/reset-password`, which
       * redirects to `/reset-password?token=<token>` — the page. `redirectTo` is what decides that
       * second address, and `route.ts` → `flows` supplies it rather than the form, for `callbackURL`'s
       * reason.
       */
      test("asking for a reset link emails one, and it leads to this application's own page", async () => {
        const response = await authPost(
          formPost(
            "/api/auth/request-password-reset",
            { email: accountWithMail.email },
            freshAddress(),
          ),
        );

        expect(response.status).toBe(303);
        expect(response.headers.get("location")).toBe("/forgot-password?sent");

        const email = sent.at(-1)!;
        expect(email.to).toBe(accountWithMail.email);
        expect(email.subject).toBe("Reset your CanonCore password");
        expect(email.text).toContain("Your password has not changed");

        const link = linkEmailedTo(accountWithMail.email);
        expect(link).toMatch(new RegExp(`^${origin}/api/auth/reset-password/[^?]+\\?callbackURL=`));

        // The step between the mailbox and the form, which is a `GET` and therefore needed the export
        // this ticket added.
        const landed = await authGet(follow(link, freshAddress()));
        expect(landed.status).toBe(302);
        expect(landed.headers.get("location")).toMatch(
          new RegExp(`^${origin}/reset-password\\?token=.+`),
        );
      });

      /**
       * **The new password set, and the old one refused afterwards.** Both halves matter: a reset that
       * accepted the new password while leaving the old one working would pass an assertion on the
       * redirect alone.
       *
       * The token is read out of the redirect the previous test landed on rather than out of the
       * database, because that is where a person's browser gets it.
       */
      test("the emailed link sets a new password, and the old one stops working", async () => {
        const landed = await authGet(follow(linkEmailedTo(accountWithMail.email), freshAddress()));
        const token = new URL(landed.headers.get("location")!).searchParams.get("token");
        expect(token).toBeTruthy();

        const changed = await authPost(
          formPost(
            `/api/auth/reset-password?token=${encodeURIComponent(token!)}`,
            // `newPassword`, which is the name this endpoint takes — the two other forms post
            // `password`. `credential-fields.tsx` says why the form has to spell each one.
            { newPassword: passwordAfterTheReset },
            freshAddress(),
          ),
        );

        expect(changed.status).toBe(303);
        expect(changed.headers.get("location")).toBe("/sign-in?reset");

        const withTheNewOne = await signIn({
          email: accountWithMail.email,
          password: passwordAfterTheReset,
        });
        expect(withTheNewOne.headers.get("location")).toBe("/");

        const withTheOldOne = await signIn(accountWithMail);
        expect(withTheOldOne.headers.get("location")).toBe(
          "/sign-in?error=INVALID_EMAIL_OR_PASSWORD",
        );
      });

      /**
       * **A reset link works once**, which `mail/messages.ts` promises the reader in as many words —
       * so it is a claim this service makes rather than only a library's behaviour.
       *
       * better-auth consumes the row it reads, so replaying the token that just worked is refused. The
       * code is `INVALID_TOKEN`, and `route.ts` carries it back to the form still holding the token,
       * which is what makes a too-short password retypeable.
       */
      test("a reset link cannot be used twice, and the refusal keeps the form usable", async () => {
        const landed = await authGet(follow(linkEmailedTo(accountWithMail.email), freshAddress()));
        const token = new URL(landed.headers.get("location")!).searchParams.get("token")!;

        const replayed = await authPost(
          formPost(
            `/api/auth/reset-password?token=${encodeURIComponent(token)}`,
            { newPassword: "a-password-this-attempt-should-never-set" },
            freshAddress(),
          ),
        );

        expect(replayed.headers.get("location")).toBe(
          `/reset-password?token=${encodeURIComponent(token)}&error=INVALID_TOKEN`,
        );

        // And the password really did not change: the account still signs in with what the reset set.
        const stillWorks = await signIn({
          email: accountWithMail.email,
          password: passwordAfterTheReset,
        });
        expect(stillWorks.headers.get("location")).toBe("/");
      });

      /**
       * **A refused reset carries the token back with `&`, not a second `?`.**
       *
       * The case is narrow and the failure is total: `?token=…?error=…` would make the whole of
       * `token=…?error=…` one parameter's value, so the token would arrive unusable and a reader would
       * be sent for a new email by a typo. `route.ts` → `withError` is what chooses the separator, and
       * this pins it on the one location that already has a query.
       */
      test("a refusal on the reset form has one query string, not two", async () => {
        const refused = await authPost(
          formPost(
            "/api/auth/reset-password?token=a-token-that-was-never-issued",
            { newPassword: "short" },
            freshAddress(),
          ),
        );

        const location = refused.headers.get("location")!;
        expect(location.match(/\?/g)).toHaveLength(1);
        expect(new URLSearchParams(location.split("?")[1]).get("token")).toBe(
          "a-token-that-was-never-issued",
        );
      });
    });
  });

  /**
   * What ADR-0005 rule 2 requires of better-auth's own user-scoped tables, and it is a **refusal**
   * rather than a cross-tenant read returning zero rows.
   *
   * **The reader here is `canoncore_app`, never `canoncore_auth`.** better-auth's own role reads every
   * row of these tables and has to — `auth/auth.ts` says why — so the tenant question is only ever
   * about the role every page runs as. And that role is granted nothing on any of the five, because
   * nothing in the application reads one: pages read Stories, and `auth/viewer.ts` resolves the cookie
   * through the auth role.
   *
   * **An earlier version of this file tested six cross-tenant reads here, and the grant that made them
   * possible existed only for them.** A review found it: a production privilege bought to make a test
   * runnable. What replaced it is stronger in the direction that matters — `permission denied` is a
   * loud error, where a policy returning no rows is indistinguishable from an empty table, and that
   * silence is the whole of what rule 2 is about. Migration 0009 records the change and names
   * CAN-57 Make a public Ordering discoverable and shareable as the first real reader, which brings
   * its own grant, policy and cross-tenant test.
   *
   * `account` is still the sharpest of the five: it holds the scrypt password hash.
   */
  describe("row-level security on better-auth's own tables", () => {
    test.each(["user", "session", "account", "verification", "rate_limit"])(
      "the application role is refused %s outright",
      async (table) => {
        const refusal = await whyRefused(() =>
          withSession(anonymous, (session) =>
            session.execute(sql`select 1 from ${sql.identifier(table)}`),
          ),
        );

        expect(refusal).toBe(`permission denied for table ${table}`);
      },
    );

    /**
     * The refusal must not depend on *who* is asking, which is what separates a missing grant from a
     * policy that happens to match nobody. A real signed-in identity is refused exactly as the
     * anonymous session user is.
     */
    test("a signed-in reader is refused them too, not merely shown nothing", async () => {
      const { rows } = await migrator.query<{ id: string }>(
        'select id from "user" where email = $1',
        [firstAccount.email],
      );
      const signedIn = rows[0]!.id;

      const refusal = await whyRefused(() =>
        withSession(signedIn, (session) => session.execute(sql`select 1 from "user"`)),
      );

      expect(refusal).toBe("permission denied for table user");
    });

    /**
     * **Row-level security is on for all five even so**, which is what makes the missing grant safe to
     * reverse later: a grant added without a policy reads zero rows rather than everything. Asserted
     * because it is the property that lets CAN-57 add a reader without first having to think about it.
     */
    test("row-level security is on for all five, so a future grant fails closed", async () => {
      const { rows } = await migrator.query<{ relname: string; relrowsecurity: boolean }>(
        `select relname, relrowsecurity from pg_class
          where relnamespace = 'public'::regnamespace
            and relname in ('user', 'session', 'account', 'verification', 'rate_limit')
          order by relname`,
      );

      expect(rows).toEqual([
        { relname: "account", relrowsecurity: true },
        { relname: "rate_limit", relrowsecurity: true },
        { relname: "session", relrowsecurity: true },
        { relname: "user", relrowsecurity: true },
        { relname: "verification", relrowsecurity: true },
      ]);
    });
  });

  // The half of `/api/health` that a fake ask cannot reach. `health.test.ts` proves what the
  // check does with an ask that fails; this proves the real ask succeeds against a database that
  // is up, through the application role, which is the answer the monitor reads as "the site is
  // fine" every five minutes.
  describe("the health check, against a database that is up", () => {
    test("answers", async () => {
      await expect(databaseAnswers()).resolves.toBe(true);
    });
  });
});
