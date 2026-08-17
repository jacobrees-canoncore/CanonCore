// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";

/**
 * The two things in `auth.ts` a test can reach without a database: the host allowlist, and the
 * settings themselves.
 *
 * Most of that module — the adapter, the limiter, the password floor, the cookie's attributes, both
 * mail flows — is exercised end to end in [`../db/rls.test.ts`](../db/rls.test.ts) against a real
 * PostgreSQL and a real request, which is the only way to see any of it actually take effect. What
 * belongs here is what cannot be seen that way at all, and there are now two such things:
 *
 * - **A preview cannot prove what production's allowlist is**, because the two are different lists
 *   chosen by `VERCEL_ENV`.
 * - **A test cannot prove that a send was deferred**, because deferring needs a Next request to be
 *   deferred behind and there is none here. `afterTheResponse` therefore takes its fallback path in
 *   every run of `rls.test.ts`, so that file proves the emails are *sent* and can prove nothing about
 *   *when*. The settings block below is where that is pinned instead.
 *
 * **This file exists because a review found it missing.** The comment in `auth.ts` claimed an
 * `auth.test.ts` asserted the cookie had no `Domain`; no such file existed, and the assertion lived
 * in two other places. The citation was corrected, and the gap the wrong citation was pointing at —
 * that nothing tested `baseURL` — is what this closes.
 *
 * `resetModules` between cases because `auth.ts` reads `env` at call time and `vi.stubEnv` has to be
 * re-read rather than captured.
 */
async function allowedHosts(vercelEnv: string | undefined) {
  vi.stubEnv("VERCEL_ENV", vercelEnv);
  vi.resetModules();
  const { hostsAllowedToIssueSessions } = await import("./auth");
  return hostsAllowedToIssueSessions();
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

/**
 * **`docs/infrastructure.md` → *The production URL* requires this ticket to bake `www` in**, and
 * ADR-0010 chose it so the session cookie stays host-only. A production deployment is also served at
 * `canoncore.vercel.app` and at its own hashed deployment URL, so a wildcard here would let a session
 * be issued against a non-canonical host — which is what an earlier version of this did.
 */
test("production issues sessions for the canonical host and nothing else", async () => {
  expect(await allowedHosts("production")).toEqual(["www.canoncore.com"]);
});

test("production allows no wildcard, so no vercel.app host can mint a session", async () => {
  const hosts = await allowedHosts("production");

  expect(hosts.some((host) => host.includes("*"))).toBe(false);
  expect(hosts.some((host) => host.includes("vercel.app"))).toBe(false);
});

/**
 * A preview has to take the wildcard: its hostname carries a per-deployment hash nothing in the
 * repository can know, and better-auth validates a form post's `Origin` against this value — so a
 * baked-in production URL would refuse every sign-in on every preview, and the Playwright suite runs
 * against one.
 */
test("a preview issues sessions for its own deployment host", async () => {
  expect(await allowedHosts("preview")).toEqual(["*.vercel.app"]);
});

// The two lists must not bleed into each other: a preview host on production is the failure above,
// and production's host on a preview would make the wildcard pointless.
test("neither environment carries the other's hosts", async () => {
  const production = await allowedHosts("production");
  const preview = await allowedHosts("preview");

  expect(production).not.toContain("*.vercel.app");
  expect(preview).not.toContain("www.canoncore.com");
});

/**
 * No `VERCEL_ENV` is a laptop, and the entry has to be a **port wildcard**.
 *
 * better-auth's `matchesHostPattern` compares the host with its port, so a bare `localhost` matches
 * only port 80. An earlier version listed `localhost:3000` and `localhost`, which meant a `next dev`
 * that moved to `:3001` — as it does when 3000 is taken — resolved `baseURL` to the production
 * fallback and refused every form. Asserted against the library's own matcher rather than by reading
 * the list, because the list looked right.
 */
test("a laptop issues sessions on whatever port the dev server took", async () => {
  const hosts = await allowedHosts(undefined);
  const { matchesHostPattern } = await import("better-auth");

  for (const host of ["localhost:3000", "localhost:3001", "localhost"]) {
    expect(hosts.some((pattern) => matchesHostPattern(host, pattern))).toBe(true);
  }
  expect(hosts).toContain("www.canoncore.com");
});

/**
 * The configured settings, read off the instance rather than off the source.
 *
 * **No database is reached.** `pg` connects lazily, so `betterAuth({…})` can be constructed against a
 * connection string nothing is listening on — which is what lets the four settings CAN-31 Email
 * verification and password reset had to choose deliberately be asserted at all. Reading them off
 * `auth().options` rather than re-reading the file is the point: a typo in an option *name* leaves the
 * setting at its default and changes nothing visible, which is the failure these tests exist for.
 */
async function configured() {
  vi.stubEnv("VERCEL_ENV", undefined);
  vi.stubEnv("DATABASE_URL", "postgresql://canoncore_app:nothing@localhost:1/nothing-is-here");
  vi.stubEnv("DATABASE_AUTH_USER", "canoncore_auth");
  vi.stubEnv("DATABASE_AUTH_PASSWORD", "nothing");
  vi.stubEnv("BETTER_AUTH_SECRET", "a-secret-that-exists-only-for-this-test-run");
  vi.resetModules();
  const { auth } = await import("./auth");
  return auth().options;
}

/**
 * **The four settings the ticket required to be chosen rather than inherited**, and two of them are
 * `false`/absent by default — so an assertion that they are *set* is the only thing separating a
 * decision from an omission that happens to agree with it.
 *
 * Asserted against `mail/messages.ts`'s constants rather than against numbers typed here, because the
 * whole reason those constants live in that module is that the email quotes them to the reader.
 */
test("verification and reset are configured deliberately, not left at their defaults", async () => {
  const options = await configured();
  const { resetLifetime, verificationLifetime } = await import("@/mail/messages");

  expect(options.emailAndPassword?.requireEmailVerification).toBe(true);
  expect(options.emailVerification?.autoSignInAfterVerification).toBe(false);
  expect(options.emailVerification?.expiresIn).toBe(verificationLifetime);
  expect(options.emailAndPassword?.resetPasswordTokenExpiresIn).toBe(resetLifetime);

  // The two windows are deliberately different, and the verification one is the longer: a link that
  // grants nothing may outlive one that is the credential itself.
  expect(verificationLifetime).toBeGreaterThan(resetLifetime);
});

/**
 * **Both sends are configured, and in better-auth's two different homes.** That split reads like a
 * mistake and is the library's own layout, so the risk is a reader "tidying" one under the other —
 * where it would be silently ignored and the flow would stop sending, with no error anywhere.
 */
test("each send is configured under the option better-auth actually reads", async () => {
  const options = await configured();

  expect(typeof options.emailVerification?.sendVerificationEmail).toBe("function");
  expect(typeof options.emailAndPassword?.sendResetPassword).toBe("function");
  // And the settings that decide when a verification email goes out, which live with the sender.
  expect(options.emailVerification?.sendOnSignUp).toBe(true);
  expect(options.emailVerification?.sendOnSignIn).toBe(true);
});

/**
 * **The whole of "neither send is awaited", asserted as a mechanism rather than as a comment.**
 *
 * better-auth 1.6.29 routes every send through `runInBackgroundOrAwait`, which **awaits the promise
 * itself** when no `backgroundTasks.handler` is configured. So the handler's presence *is* the
 * deferral: without it, response time would leak whether an address has an account — most sharply on
 * `/request-password-reset`, the one flow an attacker can drive at an address they do not own.
 *
 * Nothing else can catch its removal. `rls.test.ts` would keep passing, because a send that is awaited
 * still sends.
 */
test("every send is handed to a background handler rather than awaited", async () => {
  const options = await configured();

  expect(typeof options.advanced?.backgroundTasks?.handler).toBe("function");
});

/**
 * **And the handler does not drop the send when there is nothing to defer behind.**
 *
 * `after` throws outside a Next request scope — verified against it rather than assumed: *"`after` was
 * called outside a request scope"* — and on a deployment there is always one, because better-auth only
 * ever runs inside the route handler or a Server Component. The one caller without a request is this
 * test suite, and there the promise has to be left to settle rather than lost, which is what makes the
 * emails in `rls.test.ts` observable at all.
 *
 * A handler that rethrew would be caught by better-auth and logged, so this cannot be seen from a
 * failing flow either. It is asserted here or nowhere.
 */
test("the handler survives having no response to defer behind, and keeps the promise", async () => {
  const options = await configured();
  const handler = options.advanced!.backgroundTasks!.handler;

  let settled = false;
  const sending = Promise.resolve().then(() => {
    settled = true;
  });

  expect(() => handler(sending)).not.toThrow();

  await sending;
  expect(settled).toBe(true);
});

/**
 * **The three endpoints that can spend the Resend quota, each with a limit of its own.**
 *
 * The free tier is 100 emails a day (`docs/infrastructure.md` → *Transactional email*), and the global
 * limit is 100 requests per 60 seconds — so without these one caller could drain a day's quota in a
 * minute, and account recovery would be unavailable to everybody else until midnight.
 *
 * **`/send-verification-email` is the one worth naming.** Nothing in this application links to it, and
 * it is mounted anyway by the catch-all route, so it is the endpoint a reader of the pages would never
 * know to protect.
 */
test("every endpoint that can send an email is rate limited more tightly than the default", async () => {
  const options = await configured();
  // Widened from the literal type `customRules` infers, so a rule that is *absent* fails the
  // assertion below rather than the compile: an endpoint nobody wrote a rule for is exactly what this
  // test is looking for, and a key error would report it as a typo in the test instead.
  const rules: Record<string, { window: number; max: number } | undefined> = {
    ...options.rateLimit?.customRules,
  };

  const ruleFor = (endpoint: string) => {
    const rule = rules[endpoint];
    expect(rule, `${endpoint} has no rate-limit rule of its own`).toBeDefined();
    return rule!;
  };

  for (const endpoint of [
    "/request-password-reset",
    "/send-verification-email",
    "/reset-password",
  ]) {
    // Tighter than the global 100 per 60 seconds, which is the whole point of naming them.
    expect(ruleFor(endpoint).max).toBeLessThan(options.rateLimit!.max!);
  }

  // The two that actually send are given ten-minute windows rather than the ten seconds the
  // credential endpoints get: nobody legitimately asks for a fourth link inside ten minutes.
  for (const endpoint of ["/request-password-reset", "/send-verification-email"]) {
    expect(ruleFor(endpoint).window).toBe(600);
  }
});

/**
 * **Every `GET` endpoint the catch-all route now answers, named one at a time.**
 *
 * CAN-31 Email verification and password reset added a `GET` export to
 * [`../app/api/auth/[...all]/route.ts`](../app/api/auth/%5B...all%5D/route.ts) because a link in an
 * email is a `GET` — and `[...all]` matches every path, so that one export mounted **ten** endpoints
 * rather than the two it was for. This is the tripwire over that: an upgrade adding an eleventh has to
 * be classified here rather than arriving unnoticed, which is the same shape as `db/rls.test.ts`'s
 * *every table is classified as protected or deliberately not*.
 *
 * **When this fails, the question to answer is whether the new endpoint reads across accounts.** None
 * of these ten does — the route's own comment groups all ten and says why of each — and the two that
 * would matter most are inert only because the feature behind them is off: `/callback/:id` needs a
 * social provider, and `/delete-user/callback` needs `user.deleteUser`, which
 * **CAN-30 GDPR export and erasure** will turn on.
 *
 * Read off `auth().api` rather than from the library's source, so it is this configuration's surface
 * rather than everything better-auth could mount.
 */
test("the catch-all GET answers exactly these ten endpoints, and no eleventh", async () => {
  // `configured` for its environment stubs; the endpoints hang off the instance rather than the
  // options, so this reads `auth()` again from the module it has just re-imported.
  await configured();
  const { auth } = await import("./auth");
  const api = auth().api as Record<
    string,
    { path?: string; options?: { method?: string | string[] } }
  >;

  const gets = Object.values(api)
    .filter((endpoint) => {
      const method = endpoint?.options?.method;
      return (Array.isArray(method) ? method : [method]).includes("GET");
    })
    .map((endpoint) => endpoint.path)
    .sort();

  expect(gets).toEqual([
    // Reads about whoever is asking, and nobody else.
    "/account-info",
    // Inert: no social provider is configured.
    "/callback/:id",
    // Inert: `user.deleteUser` is unset, and CAN-30 GDPR export and erasure is what turns it on.
    "/delete-user/callback",
    "/error",
    "/get-session",
    "/list-accounts",
    "/list-sessions",
    "/ok",
    // The two this export exists for. Each takes a token only its holder has.
    "/reset-password/:token",
    "/verify-email",
  ]);
});
