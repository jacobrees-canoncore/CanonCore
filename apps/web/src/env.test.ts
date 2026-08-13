// @vitest-environment node
//
// The gate fires inside `next build`, which is Node. Under this project's default `jsdom`
// environment t3-env would take itself to be running in a browser — `isServer` defaults to
// `typeof window === "undefined"` (`@t3-oss/env-core`, `createEnv`) — and would then skip the
// server schema, so the assertions below would pass against nothing.
import { createEnv } from "@t3-oss/env-nextjs";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import * as z from "zod";

// `createEnv` prints the issues before it throws, which is the useful half of the message when
// a build fails. Here it is noise.
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("@t3-oss/env-nextjs");
  vi.restoreAllMocks();
});

// The gate is a chain: a variable is missing, so the schema refuses, so loading the Next config
// throws, so the build stops. The three tests below take one link each, and together they are
// what makes a missing variable a build failure rather than a request-time one.

test("a schema that refuses takes the whole Next config down with it", async () => {
  // The link the other two cannot reach: that `next.config.ts` really does evaluate the schema,
  // and really does propagate its refusal rather than swallowing it. Both real modules take
  // part; only the verdict is stood in for.
  vi.doMock("@t3-oss/env-nextjs", () => ({
    createEnv: () => {
      throw new Error("Invalid environment variables");
    },
  }));
  vi.resetModules();

  await expect(import("../next.config")).rejects.toThrow("Invalid environment variables");
});

test("a missing required variable is what the schema refuses", () => {
  expect(() =>
    createEnv({
      server: { A_VARIABLE_NOBODY_SET: z.string().min(1) },
      client: {},
      runtimeEnv: { A_VARIABLE_NOBODY_SET: undefined },
      emptyStringAsUndefined: true,
    }),
  ).toThrow("Invalid environment variables");
});

test("a variable set to the empty string counts as missing", () => {
  expect(() =>
    createEnv({
      server: { A_VARIABLE_SET_BLANK: z.string() },
      client: {},
      runtimeEnv: { A_VARIABLE_SET_BLANK: "" },
      emptyStringAsUndefined: true,
    }),
  ).toThrow("Invalid environment variables");
});

test("no clause switches the gate off, CI included", async () => {
  // Why no clause is kept is `env.ts`. Asserted by behaviour rather than by reading the source
  // for the option: when validation is skipped t3-env hands back the raw environment instead of
  // a validated view of it, so every undeclared variable is readable off `env`. That holds
  // however the option comes to be set.
  vi.stubEnv("CI", "true");
  vi.stubEnv("A_VARIABLE_THE_SCHEMA_NEVER_DECLARED", "set");
  vi.resetModules();

  const { env } = await import("./env");

  expect(env).not.toHaveProperty("A_VARIABLE_THE_SCHEMA_NEVER_DECLARED");
});

/**
 * A compile-time assertion, so `pnpm typecheck` rather than `pnpm test` is what runs it:
 * `@ts-expect-error` becomes an error of its own the day the line below compiles. The
 * `NEXT_PUBLIC_` prefix is enforced by the client dictionary's key type and by nothing at
 * runtime, so there is no assertion to make here in a test body.
 */
export const clientKeysMustCarryThePrefix = () =>
  createEnv({
    server: {},
    // @ts-expect-error `SECRET_KEY` is not prefixed `NEXT_PUBLIC_`, so it cannot be a client
    // variable: Next inlines a value into the browser bundle only for a prefixed name
    // (https://nextjs.org/docs/app/guides/environment-variables), and an unprefixed one would
    // arrive there undefined.
    client: { SECRET_KEY: z.string() },
    runtimeEnv: { SECRET_KEY: "set" },
  });
