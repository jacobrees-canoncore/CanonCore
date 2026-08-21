import { env } from "@/env";
import { resolveAuthDatabaseConnection } from "@/db/database-url";
import { account, rateLimit, session, user, verification } from "@/db/schema";
import {
  chooseANewPassword,
  resetLifetime,
  verificationLifetime,
  verifyYourAddress,
} from "@/mail/messages";
import { send } from "@/mail/send";
import { passwordMinimum } from "./password";
import { productionUrl } from "@canoncore/config";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { drizzle } from "drizzle-orm/node-postgres";
import { after } from "next/server";
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
 * **The decision is [ADR-0021](../../../../docs/adr/0021-a-third-database-role-for-better-auth.md)**,
 * which is where the argument belongs rather than in this comment: it carries the three rejected
 * designs, what bounds the role, and the five things that will try to reopen it.
 *
 * **`canoncore_app` is unchanged by any of it** — no `BYPASSRLS`, every read through a policy, and
 * none of these five tables reachable at all. ADR-0005 rule 1 is about that role, and this adds a
 * role beside it rather than widening it.
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

/**
 * The hosts a session may be issued for, which is **not** the same list in every environment.
 *
 * **Production is the canonical host and nothing else.** `docs/infrastructure.md` → *The production
 * URL* requires this ticket to bake `https://www.canoncore.com` in, and an earlier version of this
 * allowed `*.vercel.app` everywhere — which quietly failed that, because a production deployment is
 * *also* served at `canoncore.vercel.app` and at its own `canoncore-<hash>.vercel.app`. A sign-in
 * there would have resolved `baseURL` to a non-canonical host and minted a session against it. The
 * cookie is host-only either way, so nothing leaked between the two; what was wrong is that
 * [ADR-0010](../../../../docs/adr/0010-canonical-host-www.md)'s decision was not being enforced
 * where sessions are issued. The apex 301s before a request reaches a function, so `www` really is
 * the only host production should ever answer on.
 *
 * **A preview has to allow the wildcard**, and cannot be given a fixed host instead: its URL carries
 * a per-deployment hash nothing here can know, and better-auth validates a form post's `Origin`
 * against this value — so a baked-in production URL would refuse every sign-in on every preview, and
 * the Playwright suite runs against one.
 *
 * **Development is localhost**, listed separately rather than folded in with preview so that neither
 * environment carries the other's hosts.
 */
export function hostsAllowedToIssueSessions(): string[] {
  const canonical = new URL(productionUrl).host;
  if (env.VERCEL_ENV === "production") return [canonical];
  if (env.VERCEL_ENV === "preview") return ["*.vercel.app"];
  // No `VERCEL_ENV` is a laptop, and the wildcard is the port rather than the host. better-auth's
  // `matchesHostPattern` compares the host *with* its port, checked against
  // `better-auth/dist/utils/url.mjs` rather than assumed: `localhost:3000` does not match a bare
  // `localhost`. So an earlier version's `"localhost"` entry matched only port 80 and did nothing —
  // and `next dev` moves to `:3001` when 3000 is taken, which would have resolved `baseURL` to the
  // production fallback and refused every form on the dev server with no obvious reason.
  //
  // `canonical` stays so that a local `next start` against a copied production environment issues
  // sessions rather than refusing them.
  return ["localhost:*", "localhost", canonical];
}

/** better-auth, for the one caller in each direction: the route handler, and `viewer.ts`. */
export function auth() {
  if (!instance) instance = configure();
  return instance;
}

/**
 * **No send is ever awaited, and this is the whole of how.** Do not "fix" either callback below into
 * an `await`, and do not reach for `void` inside one either — the deferral is here.
 *
 * **Why it matters, in better-auth's own words**: *"avoid awaiting the email sending process to
 * prevent timing attacks"* ([email and
 * password](https://www.better-auth.com/docs/authentication/email-password), which says it in both of
 * its examples). Response time is what leaks: `/request-password-reset` returns early for an address
 * nobody holds and sends for one somebody does, so a response that waited for Resend would answer
 * *"does this person have an account here"* to anybody who asked — for an address they do not own,
 * which is the one flow an attacker can drive at a stranger.
 *
 * **`backgroundTasks.handler` rather than a `void` in each callback**, and that is the difference
 * between a rule and a mechanism. better-auth 1.6.29 routes its sends through
 * `runInBackgroundOrAwait`, which hands the promise here when a handler exists and **awaits it
 * itself when one does not** — so the documented `void sendEmail(…)` shape is answering a version
 * that had no such seam. Putting it here covers every flow at once rather than each callback
 * separately, including the ones nothing below configures: a re-send on sign-in, a change-of-email
 * confirmation and its second half, and account deletion when CAN-30 GDPR export and erasure brings
 * it.
 *
 * **One call site is the exception, and it is not covered by this.** `sendVerificationEmailFn`
 * *awaits* `sendVerificationEmail` directly rather than through `runInBackgroundOrAwait`
 * (`better-auth/dist/api/routes/email-verification.mjs`, 1.6.29) — read there rather than assumed,
 * after a review found this comment claiming otherwise. It is reached only by
 * `/send-verification-email`, which nothing here links to and the catch-all route mounts anyway. **The
 * library flattens that path itself**: for a caller with no session it enforces a 500ms floor, whose
 * own comment gives this exact reason — *"so an attacker cannot distinguish … by comparing response
 * times"*. So there is no leak to fix, and it is written down because the generalisation above is what
 * a later reader would otherwise trust.
 *
 * **`after` rather than `waitUntil` from `@vercel/functions`.** `after` *is* that call — Next reads
 * `waitUntil` off the request context and hands the promise to it
 * (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md` → *Platform Support*)
 * — so it buys the same extension of the invocation with no dependency added. Dropping the promise
 * instead would be worse than awaiting it: a Vercel function may be frozen once its response is
 * sent, and the symptom is an email that was never sent and nobody was told about.
 */
function afterTheResponse(sending: Promise<unknown>): void {
  try {
    after(sending);
  } catch (noResponseToComeAfter) {
    // `after` throws when there is no Next request to come after, and on a deployment there always
    // is one: better-auth only ever runs inside the route handler or a Server Component. **The one
    // caller without a request scope is the test suite**, which posts to the route handler directly
    // (`../db/rls.test.ts`), and there the promise simply settles on its own — which is what a plain
    // Node process does anyway, and what makes the send observable to a test rather than dropped.
    //
    // Said out loud rather than swallowed, because a deployment reaching this line would mean sends
    // were no longer being deferred, and nothing else would report it.
    console.warn(
      "[canoncore] an email was sent with no response to defer it behind: " +
        `${noResponseToComeAfter instanceof Error ? noResponseToComeAfter.message : "unknown"}`,
    );
  }
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
     * it stays off. **The absence is asserted on the `Set-Cookie` header of a real sign-in**, in
     * [`../db/rls.test.ts`](../db/rls.test.ts), because most better-auth examples set it. It is
     * asserted *there* rather than against a deployment for a reason worth knowing:
     * [`../../e2e/signed-out-path.spec.ts`](../../e2e/signed-out-path.spec.ts) records that only a
     * *successful* sign-in sets any cookie at all, so a deployed check would need an account in
     * production.
     */
    baseURL: {
      allowedHosts: hostsAllowedToIssueSessions(),
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
       * **On, so an account whose address nobody has proved is an account nobody can sign in to.**
       * It was `false` until **CAN-31 Email verification and password reset**, because verification
       * needs a mail provider and there was none.
       *
       * **What turning it on buys.** Anybody can put anybody's address into the sign-up form, so
       * without this a stranger can hold an account on an address they do not own — and the address's
       * real owner can only take it back by resetting the password, which is to say by discovering
       * the squat. With it, the squatted account does nothing at all.
       *
       * **What it costs, and why the cost is bounded.** A person who never receives the email cannot
       * sign in — so `sendOnSignIn` below is not a convenience: trying to sign in is what sends
       * another link, which is the whole recovery route and the reason an account that predates this
       * change is not stranded. And because the check runs *after* the password is verified
       * (`better-auth/dist/api/routes/sign-in.mjs`, 1.6.29), it cannot be used to send mail to an
       * address whose password the sender does not know.
       *
       * **It is not what switches the sign-up enumeration protection on** — `autoSignIn: false`
       * below already does, and better-auth's condition is either of the two
       * (`shouldReturnGenericDuplicateResponse`), so this adds nothing there and removing that line
       * would still break it.
       */
      requireEmailVerification: true,

      /**
       * Reset, and it lives under `emailAndPassword` while verification lives under
       * `emailVerification` — which reads like a mistake here and is better-auth's own layout. Four
       * related settings, two homes: `requireEmailVerification` and this pair are here,
       * `sendOnSignUp`, `sendOnSignIn`, `expiresIn` and `autoSignInAfterVerification` are there.
       *
       * **Not awaited**, and `afterTheResponse` above is where that is arranged and argued.
       */
      sendResetPassword: ({ user: recipient, url }) =>
        send(recipient.email, chooseANewPassword(url)),

      /**
       * One hour, which is also better-auth's default and is stated because a default nobody chose is
       * not a decision. It is deliberately **not** the verification window — `mail/messages.ts` holds
       * both numbers, beside the sentences that promise them to the reader.
       */
      resetPasswordTokenExpiresIn: resetLifetime,

      /**
       * **What switches better-auth's sign-up enumeration protection on, and the reason it is
       * here.**
       *
       * That protection is real but conditional: `sign-up/email` returns a generic success for an
       * email somebody already holds only when `requireEmailVerification` is on **or** `autoSignIn`
       * is off. Otherwise it answers `422 USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`, which tells any
       * caller whether a given person has an account here. Without one of the two,
       * `docs/research/production-readiness-baseline.md` → *Security posture* would be crediting
       * this deployment with a protection it had not switched on.
       *
       * **Both halves of that `if` are now true, and this line still earns its place.** CAN-31 Email
       * verification and password reset turned `requireEmailVerification` on above, so the protection
       * would survive deleting this — but what it also does is keep signing up from signing you in,
       * which is the three separate acts CAN-24 A signed-in and a signed-out path asks for. Removing
       * it would make the protection rest on one setting where it now rests on two.
       *
       * **The residue it leaves is still open, and CAN-31 Email verification and password reset did
       * not close it.** Somebody signing up with an email already in use is told nothing and cannot
       * then sign in, and the address's real owner is told nothing either: better-auth's
       * `onExistingUserSignUp` is the hook that would tell them, and nothing configures it — so no
       * mail is sent on that path at all. What did change is that the recovery route now exists, so
       * the person who actually holds the account can reset their password. `sign-up-page.tsx` and
       * `sign-in-page.tsx` both carry wording that is true either way.
       */
      autoSignIn: false,
    },

    /**
     * Verification, in the second of better-auth's two homes for these four settings —
     * `requireEmailVerification` and the reset pair are above, under `emailAndPassword`.
     */
    emailVerification: {
      /**
       * **Not awaited**: `afterTheResponse` above is where that is arranged and argued.
       *
       * **The `url` carries the recipient's own email address in its query string, and nothing here
       * can change that.** better-auth's verification token is a JWT — *signed*, not encrypted — over
       * `{ email }`, so anyone holding the link can base64url-decode the address out of it. That is a
       * fact about the library rather than a choice, and it is recorded rather than merely known
       * because one published promise turns on it: `content/legal/terms-of-service.md` says an error
       * report carries no email address, and an error reporter sends the whole URL of the request.
       * `docs/infrastructure.md` → *The two query strings the email flows put in a URL* is the record, and
       * **CAN-51 Keep a record of server errors past the hour Vercel keeps them** is what has to
       * scrub it. Nothing reports anywhere yet, so there is nothing to fix here today — and this
       * comment is why that stays true.
       */
      sendVerificationEmail: ({ user: recipient, url }) =>
        send(recipient.email, verifyYourAddress(url)),

      /**
       * **Stated rather than inherited, though `undefined` already follows
       * `requireEmailVerification`.** That coupling is the thing not to rely on: it means switching
       * the gate off would silently stop sending the email too, so the link a person needs would
       * vanish with the requirement to use it rather than outliving it.
       */
      sendOnSignUp: true,

      /**
       * **The recovery route, and the reason `requireEmailVerification` above is affordable.** A
       * person whose first email never arrived tries to sign in and is sent another; without this
       * they are told their address is unverified and given no way to fix it.
       *
       * **It cannot be used to send mail to a stranger.** better-auth reaches this only after the
       * password verifies (`better-auth/dist/api/routes/sign-in.mjs`, 1.6.29), so the sender already
       * holds the credential. `/sign-in/email` is rate limited to 3 in 10 seconds below, which bounds
       * it further.
       */
      sendOnSignIn: true,

      /**
       * **Off, so a link in a mailbox proves control of an address and grants nothing else.**
       *
       * `autoSignIn: false` above already separates creating an account from signing in, and this is
       * the same decision one step later: email is not a channel this service controls, so a
       * forwarded, logged or link-scanner-prefetched URL would otherwise mint a session. What it
       * costs is that verifying does not sign you in — which is why the link lands on `/sign-in`
       * rather than on the front page (`../app/api/auth/[...all]/route.ts` → `flows`).
       */
      autoSignInAfterVerification: false,

      /**
       * 24 hours, against better-auth's documented default of one. A verification link grants
       * nothing on its own — see `autoSignInAfterVerification` directly above — so the window can be
       * long enough that somebody who reads their email once a day still gets in, where an hour is
       * short enough to expire while its reader is asleep. `mail/messages.ts` holds the number beside
       * the sentence that promises it.
       */
      expiresIn: verificationLifetime,
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
     *
     * **The three mail rules protect a different resource from the credential ones.** A wrong password
     * costs a scrypt hash; a request that sends an email spends one of 100 a day
     * (`docs/infrastructure.md` → *Transactional email*), and a spent quota is an account nobody can
     * recover for the rest of the day.
     *
     * **What each rule actually changes, which is not what an earlier version of this comment claimed.**
     * better-auth already special-cases two of the three in `getDefaultSpecialRules`
     * (`better-auth/dist/api/rate-limiter/index.mjs`, 1.6.29), so the global limit never reached them —
     * a review caught this comment asserting otherwise. `customRules` are applied *after* those and
     * override them, so all three below do take effect:
     *
     * | Endpoint | better-auth's default | Here |
     * | --- | --- | --- |
     * | `/request-password-reset` | 3 per 60s | 3 per **600s** |
     * | `/send-verification-email` | 3 per 60s | 3 per **600s** |
     * | `/reset-password` | the global 100 per 60s | 3 per 10s |
     *
     * So for the two that send, the win is a **ten-times longer window at the same count** — 432 sends
     * a day from one host rather than 4,320 — and for `/reset-password`, which sends nothing, it is a
     * real tightening of a limit that was only ever the global one.
     *
     * **`/send-verification-email` is on the list though nothing links to it.** It is mounted by the
     * catch-all route whether or not this application offers it, and it takes any address. better-auth
     * has no switch to remove an endpoint, so a window is the control available — and this is the one
     * of the three that no page of ours would have led anybody to.
     *
     * **What none of it bounds is a distributed caller**, because the limiter keys on the address the
     * request came from. 432 a day from one host is still over a 100-a-day quota, so this narrows the
     * hole rather than closing it; closing it needs a per-recipient count, which is a counter of ours
     * rather than a setting here.
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
        // Ten minutes, against better-auth's own 60 seconds for these two: the count was already 3,
        // so the window is the whole of what these lines buy. Nobody legitimately asks for a fourth
        // link inside ten minutes, and each request is a send.
        "/request-password-reset": { window: 600, max: 3 },
        "/send-verification-email": { window: 600, max: 3 },
        // Seconds, not minutes: this one sends nothing. It is here because it is a guess at a token,
        // and because it is the one of the three better-auth leaves on the global limit.
        "/reset-password": { window: 10, max: 3 },
      },
    },

    advanced: {
      /** `afterTheResponse` above holds the argument, and it is the whole of "the send is not awaited". */
      backgroundTasks: { handler: afterTheResponse },
    },

    /**
     * Last in the array, as better-auth requires. It is what lets a Server Component read the
     * session and a redirect carry a `Set-Cookie`; without it the cookie is on a response nothing
     * forwards.
     */
    plugins: [nextCookies()],
  });
}
