import { env } from "@/env";
import { resolveAuthDatabaseConnection } from "@/db/database-url";
import { account, rateLimit, session, user, verification } from "@/db/schema";
import { passwordMinimum } from "./password";
import { productionUrl } from "@canoncore/config";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * better-auth, and the second connection it needs.
 *
 * ## Why this does not go through `session.ts`
 *
 * **The thing that authenticates cannot be constrained by the identity it is establishing.**
 * `withSession` opens a transaction, sets `canoncore.user_id`, and every policy on every table is
 * keyed on that value. better-auth cannot work inside it, and not by a little:
 *
 * - `getSession` is handed a *token* from a cookie and must find the `session` row bearing it.
 *   Which user that is, is the answer — so it cannot be the question.
 * - Signing in is handed an *email* and must find the `user` row carrying it, with no session set
 *   at all. Under a policy keyed on the session user that read returns nothing, which is
 *   indistinguishable from a wrong password.
 * - Signing up must ask whether *anybody* already holds that email, which is a cross-tenant read by
 *   construction — and is also better-auth's enumeration protection.
 *
 * **Three ways out were considered and each is worse.** Giving `canoncore_app` the four tables with
 * no policy over them reverses migration 0005 and hands the role every page runs as a table full of
 * email addresses and password hashes, readable in full — the exact failure
 * `docs/infrastructure.md` → *Roles* records. Keying the policies on the session token instead
 * makes the policy satisfiable by anyone holding a token. And a second setting the application
 * flips to mean *"trust me"* is a `BYPASSRLS` with extra steps, in the one variable ADR-0005 rule 3
 * rests on.
 *
 * So there is a third role. `canoncore_auth` holds DML on these five tables and no privilege on
 * `story`, `source`, `snapshot` or `tombstone`; each table names it in a policy and no wider role;
 * and it has no `BYPASSRLS`. `schema.ts` carries the policies and `rls.test.ts` asserts the reach
 * of both roles in each direction.
 *
 * **`canoncore_app` is unchanged by any of it** — `SELECT` only, no `BYPASSRLS`, every read through
 * a policy. ADR-0005 rule 1 is about that role, and this adds a role beside it rather than widening
 * it.
 */

/**
 * The auth role's pool, module-private for `session.ts`'s reason: nothing outside this module can
 * reach the one connection that is not subject to a tenant policy.
 *
 * **Opened on first use rather than at module scope**, also for `session.ts`'s reason: a preview's
 * database host does not exist until its deployment does, so a pool built during the build would
 * have nothing to connect to.
 */
let pool: Pool | undefined;

function authDatabase() {
  if (!pool) {
    const connection = resolveAuthDatabaseConnection(env);
    pool = new Pool({ connectionString: connection.url });
    // `session.ts` says why this listener is the difference between a logged warning and the end of
    // the process: an `error` event with nothing listening takes Node down.
    pool.on("error", (error) => {
      console.warn(`[canoncore] an idle auth database connection was dropped: ${error.message}`);
    });
  }
  return drizzle(pool);
}

/**
 * Refused here rather than defaulted, because better-auth's default is the dangerous answer.
 *
 * With nothing set it **invents** a secret per process. Vercel Functions are per-invocation
 * isolates, so each cold start would sign cookies the next isolate cannot verify, and the symptom
 * is a user being signed out at random rather than an error anybody sees. `src/env.ts` says the
 * same thing beside the variable.
 */
function secret(): string {
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error(
      "BETTER_AUTH_SECRET is not set. better-auth would invent one per process, and Vercel " +
        "Functions are per-invocation isolates — so every cold start would issue session cookies " +
        "the next isolate cannot verify. docs/infrastructure.md -> Environment variables. " +
        "Refusing to serve.",
    );
  }
  return env.BETTER_AUTH_SECRET;
}

/**
 * built once, on the first request that needs it.
 *
 * **A function rather than a `const`, and that is forced rather than stylistic.** `next build`
 * evaluates every route module, so a `betterAuth({...})` at module scope would read the environment
 * *during the build* — and a preview build correctly has no `DATABASE_URL` and no injected
 * `NEON_PGHOST` yet. `src/env.ts` records that failure: a build that refuses for a missing database
 * variable reports the required `Vercel` check red, which would block every merge. So nothing here
 * touches `env` until a request does.
 */
let instance: ReturnType<typeof configure> | undefined;

/** better-auth, for the one caller in each direction: the route handler, and `viewer.ts`. */
export function auth() {
  if (!instance) instance = configure();
  return instance;
}

function configure() {
  return betterAuth({
    appName: "CanonCore",
    secret: secret(),

    /**
     * **Derived from the host that served the request, against an allowlist.**
     *
     * Production resolves to `https://www.canoncore.com`, which is what `docs/infrastructure.md` →
     * *The production URL* requires this ticket to bake in — the apex 301s before a request reaches
     * a function, so the canonical host is the only one production ever sees. A preview resolves to
     * its own `*.vercel.app` deployment URL, which it has to: better-auth validates a form post's
     * `Origin` against this value, so a baked-in production URL would refuse every sign-in on every
     * preview, and the Playwright suite runs against a preview.
     *
     * **The `fallback` is what an allowlist miss gets**, rather than the host being trusted. It
     * also covers the no-request case — better-auth resolves this once at start-up before any
     * request exists.
     *
     * **No `Domain` on the cookie, and nothing here asks for one.** better-auth's default cookie is
     * host-only, which is [ADR-0010](../../../../docs/adr/0010-canonical-host-www.md)'s reason for
     * `www` being canonical; `advanced.crossSubDomainCookies` is the switch that would undo it and
     * it stays off. `auth.test.ts` asserts the absence, because most better-auth examples set it.
     */
    baseURL: {
      allowedHosts: [new URL(productionUrl).host, "*.vercel.app", "localhost:3000"],
      fallback: productionUrl,
    },

    database: drizzleAdapter(authDatabase(), {
      provider: "pg",
      // Named explicitly rather than left to the adapter's read of drizzle's own schema. The
      // adapter resolves a model as `schema[model]`, so this is the list of tables it may touch —
      // and every other table in `schema.ts` is one it must not.
      schema: { user, session, account, verification, rateLimit },
    }),

    emailAndPassword: {
      enabled: true,
      minPasswordLength: passwordMinimum,
      /**
       * **Off, and that is this ticket's scope rather than an oversight.** Verification needs a
       * mail provider, which is **CAN-31 Email verification and password reset**; CAN-24 A
       * signed-in and a signed-out path says so as an acceptance criterion. Stated rather than left
       * to the default so that turning it on is an edit here and not a discovery.
       */
      requireEmailVerification: false,

      /**
       * **What switches better-auth's sign-up enumeration protection on, and the reason it is
       * here.**
       *
       * That protection is real but conditional: `sign-up/email` returns a generic success for an
       * email somebody already holds only when `requireEmailVerification` is on **or** `autoSignIn`
       * is off. Otherwise it answers `422 USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`, which tells any
       * caller whether a given person has an account here. Verification is out of scope above, so
       * this is the other half of the same `if`, and without it
       * `docs/research/production-readiness-baseline.md` → *Security posture* would be crediting
       * this deployment with a protection it had not switched on.
       *
       * **What it costs is one step.** Signing up no longer signs you in, so a new account signs in
       * afterwards — which is the three separate acts CAN-24 A signed-in and a signed-out path asks
       * for, rather than a compromise on them. The residue is that somebody signing up with an
       * email already in use is told nothing, and cannot then sign in; the standard answer is to
       * tell the address's real owner by email, which is **CAN-31 Email verification and password
       * reset**. `sign-up-page.tsx` carries wording that is true either way.
       */
      autoSignIn: false,
    },

    /**
     * **On the database, because in memory it enforces nothing.**
     *
     * Rate limiting is on by default in production — 100 requests per 60s globally,
     * `/sign-in/email` at 3 per 10s — but the default *storage* is memory, and Vercel Functions are
     * per-invocation isolates, so the counter is per-process and an attacker gets a fresh window on
     * every cold start. `docs/research/production-readiness-baseline.md` → *Security posture* holds
     * both documents and flags the combination as inferred rather than stated; the fix is this line
     * and one table.
     *
     * **`enabled` is stated, and it is not the default.** Better-auth switches rate limiting off
     * outside production, so without this the test that repeated failed sign-ins are refused would
     * pass in CI only by accident of `NODE_ENV`. It is on everywhere, so the test measures the
     * deployed behaviour.
     *
     * The window and the two limits are better-auth's own defaults, restated because a limiter
     * whose numbers live only in a library's changelog is a limiter nobody can review.
     */
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "rateLimit",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 10, max: 3 },
        "/sign-up/email": { window: 10, max: 3 },
      },
    },

    /**
     * Last in the array, as better-auth requires. It is what lets a Server Component read the
     * session and a redirect carry a `Set-Cookie`; without it the cookie is on a response nothing
     * forwards.
     */
    plugins: [nextCookies()],
  });
}
