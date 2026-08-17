// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";

/**
 * The host allowlist, which is the one piece of `auth.ts` a test can reach without a database.
 *
 * Everything else in that module — the adapter, the limiter, the password floor, the cookie's
 * attributes — is exercised end to end in [`../db/rls.test.ts`](../db/rls.test.ts) against a real
 * PostgreSQL and a real request, which is the only way to see any of it actually take effect. What
 * belongs here is the branch that cannot be seen that way at all: **a preview cannot prove what
 * production's allowlist is**, because the two are different lists chosen by `VERCEL_ENV`.
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
