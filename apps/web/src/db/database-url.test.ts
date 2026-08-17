// @vitest-environment node
import { expect, test } from "vitest";
import { resolveAuthDatabaseConnection, resolveDatabaseConnection } from "./database-url";

// The two forms Neon publishes for one compute, and a different compute entirely. Shaped
// like the real ones, which carry the region proxy as a second label.
const productionHost = "ep-production-pooler.c-2.eu-west-2.aws.neon.tech";
const productionHostUnpooled = "ep-production.c-2.eu-west-2.aws.neon.tech";
const branchHost = "ep-branch-pooler.c-2.eu-west-2.aws.neon.tech";

const production = {
  VERCEL_ENV: "production",
  DATABASE_URL: `postgresql://canoncore_app:secret@${productionHost}/neondb?sslmode=verify-full`,
  DATABASE_PRODUCTION_HOST: productionHost,
} as const;

const preview = {
  VERCEL_ENV: "preview",
  DATABASE_APP_USER: "canoncore_app",
  DATABASE_APP_PASSWORD: "secret",
  DATABASE_PRODUCTION_HOST: productionHost,
  NEON_PGHOST: branchHost,
  NEON_PGDATABASE: "neondb",
} as const;

test("production connects to the host it was told production is on", () => {
  expect(resolveDatabaseConnection(production)).toEqual({
    url: production.DATABASE_URL,
    host: productionHost,
  });
});

test("production refuses a connection string pointing somewhere else", () => {
  expect(() =>
    resolveDatabaseConnection({
      ...production,
      DATABASE_URL: `postgresql://canoncore_app:secret@${branchHost}/neondb`,
    }),
  ).toThrow(/Production resolved .*ep-branch-pooler[\s\S]*expected .*ep-production-pooler/);
});

// Without this the preview assertion below is vacuous: a DATABASE_PRODUCTION_HOST left behind by
// an endpoint that no longer exists would never equal anything a preview resolves, so the check
// would pass for ever while checking nothing. Production is what keeps the value honest.
test("production is what proves DATABASE_PRODUCTION_HOST is still production's host", () => {
  expect(() =>
    resolveDatabaseConnection({ ...production, DATABASE_PRODUCTION_HOST: "ep-stale.neon.tech" }),
  ).toThrow(/DATABASE_PRODUCTION_HOST/);
});

test("a preview composes its own branch host with the application role's credentials", () => {
  expect(resolveDatabaseConnection(preview)).toEqual({
    url: `postgresql://canoncore_app:secret@${branchHost}/neondb?sslmode=verify-full`,
    host: branchHost,
  });
});

test("a preview escapes a password that would otherwise break the URL", () => {
  const { url } = resolveDatabaseConnection({ ...preview, DATABASE_APP_PASSWORD: "p@ss/word" });

  expect(url).toContain("p%40ss%2Fword");
  expect(new URL(url).hostname).toBe(branchHost);
});

// The one failure that matters, and it is not hypothetical: CAN-45 Preview deployments do not
// appear to get their own Neon branch found preview branching switched off, and every preview
// until then would have composed exactly this.
//
// It survived the change of mechanism, and had to. Since CAN-79 Previews clone production rows,
// and the integration has no switch to stop it, NEON_PGHOST is a project-level Preview variable
// addressing the shared schema-only branch rather than a per-deployment injection (ADR-0023) —
// which moves the way it could be wrong from "the webhook did not fire" to "somebody typed
// production's host into Vercel", and leaves what it would cost identical.
test.each([productionHost, productionHostUnpooled])(
  "a preview that resolves production's compute at %s refuses to connect at all",
  (host) => {
    expect(() => resolveDatabaseConnection({ ...preview, NEON_PGHOST: host })).toThrow(
      /This preview resolved production's database host/,
    );
  },
);

// One compute, two names. Production reaching itself by the name it was not compared against is
// still production reaching itself, and refusing it would be an outage over a suffix.
test("production is content to reach its compute by either of the names Neon gives it", () => {
  expect(
    resolveDatabaseConnection({
      ...production,
      DATABASE_URL: `postgresql://canoncore_app:secret@${productionHostUnpooled}/neondb`,
    }).host,
  ).toBe(productionHostUnpooled);
});

test("a preview never falls back to DATABASE_URL, even when one is set", () => {
  expect(() =>
    resolveDatabaseConnection({
      VERCEL_ENV: "preview",
      DATABASE_PRODUCTION_HOST: productionHost,
      DATABASE_URL: production.DATABASE_URL,
    }),
  ).toThrow(/NEON_PGHOST/);
});

// A preview that quietly fell back on a default for any of these would be a preview reaching
// some other branch's database, which is the whole failure this module exists to refuse.
test.each([
  "NEON_PGHOST",
  "NEON_PGDATABASE",
  "DATABASE_APP_USER",
  "DATABASE_APP_PASSWORD",
  "DATABASE_PRODUCTION_HOST",
] as const)("a preview missing %s says so rather than guessing", (name) => {
  expect(() => resolveDatabaseConnection({ ...preview, [name]: undefined })).toThrow(name);
});

test("outside Vercel there is no host to compare against, so none is demanded", () => {
  const local = "postgresql://canoncore_app:secret@localhost:5432/canoncore";

  expect(resolveDatabaseConnection({ DATABASE_URL: local })).toEqual({
    url: local,
    host: "localhost",
  });
});

test("outside Vercel a missing DATABASE_URL is still an error", () => {
  expect(() => resolveDatabaseConnection({})).toThrow(/DATABASE_URL/);
});

test("a DATABASE_URL that is not a URL is an error rather than a hostname of nothing", () => {
  expect(() => resolveDatabaseConnection({ DATABASE_URL: "canoncore_app@somewhere" })).toThrow(
    /DATABASE_URL/,
  );
});

/**
 * The auth role's connection, which is the application's with two values swapped.
 *
 * **What these assert is the inheritance rather than the string.** Everything that makes the
 * application's connection correct — the host, the database, `sslmode=verify-full`, the
 * preview-versus-production branch, and the two assertions about which host it reached — has to apply
 * to better-auth's connection too, and does so only because it is *derived*. A second
 * `DATABASE_AUTH_URL` variable would be a second thing to keep in step, and nobody can read a
 * Sensitive variable back to compare it.
 */
const authRole = {
  DATABASE_AUTH_USER: "canoncore_auth",
  DATABASE_AUTH_PASSWORD: "another-secret",
} as const;

test("the auth role reaches production's database, as itself", () => {
  expect(resolveAuthDatabaseConnection({ ...production, ...authRole })).toEqual({
    url: `postgresql://canoncore_auth:another-secret@${productionHost}/neondb?sslmode=verify-full`,
    host: productionHost,
  });
});

// The half that would be easy to get wrong by composing a second string by hand: a preview's auth
// connection has to reach the *branch*, and it does because it is built from the application's.
test("the auth role reaches a preview's own branch, not production's", () => {
  expect(resolveAuthDatabaseConnection({ ...preview, ...authRole })).toEqual({
    url: `postgresql://canoncore_auth:another-secret@${branchHost}/neondb?sslmode=verify-full`,
    host: branchHost,
  });
});

// The inherited refusal, and the reason this function delegates rather than resolving in parallel: a
// preview that reached production would otherwise be refused for the application and waved through
// for better-auth, which is the worse half — it is the connection that writes.
test("the auth role is refused a preview that resolved production's host", () => {
  expect(() =>
    resolveAuthDatabaseConnection({ ...preview, ...authRole, NEON_PGHOST: productionHostUnpooled }),
  ).toThrow(/This preview resolved production's database host/);
});

test("a password full of URL punctuation survives the swap", () => {
  const password = "p:a@s/s?w#o&r=d";
  const { url } = resolveAuthDatabaseConnection({
    ...production,
    ...authRole,
    DATABASE_AUTH_PASSWORD: password,
  });

  // Read back through `URL` rather than compared as a string, because what has to hold is that
  // PostgreSQL receives the password that was set — not that it was encoded one particular way.
  const parsed = new URL(url);
  expect(decodeURIComponent(parsed.password)).toBe(password);
  expect(parsed.hostname).toBe(productionHost);
  expect(parsed.searchParams.get("sslmode")).toBe("verify-full");
});

test.each(["DATABASE_AUTH_USER", "DATABASE_AUTH_PASSWORD"] as const)(
  "refuses to connect without %s",
  (missing) => {
    expect(() =>
      resolveAuthDatabaseConnection({ ...production, ...authRole, [missing]: undefined }),
    ).toThrow(new RegExp(`${missing} is not set`));
  },
);
