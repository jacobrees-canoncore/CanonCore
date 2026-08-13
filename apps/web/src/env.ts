import { createEnv } from "@t3-oss/env-nextjs";

/**
 * Every environment variable this application reads, and the only place it reads
 * `process.env` — enforced by the `no-restricted-syntax` rule in `eslint.config.mjs`.
 *
 * `next.config.ts` imports this module before anything else, so a variable that is missing or
 * malformed fails `next build`. The alternative is that it surfaces as a request-time
 * exception, and Vercel Hobby keeps runtime logs for one hour
 * (`docs/research/production-readiness-baseline.md`), so the record of that failure expires
 * before anybody reads it.
 *
 * **Both dictionaries are empty, and that is the current state rather than an oversight.** No
 * deployment reads a credential yet; `docs/infrastructure.md` → *Environment variables* holds
 * the roster and names the ticket that claims each one. The gate lands ahead of them so that
 * adding the first variable is one line here rather than one line plus this file.
 *
 * `client` is separate from `server` because the prefix rule is enforced by the client
 * dictionary's key type: an unprefixed key there fails to compile, and so does a
 * `NEXT_PUBLIC_` key under `server`. `env.test.ts` holds that assertion.
 *
 * There is deliberately no `skipValidation`. The clause t3-env's own Next.js page offers
 * (https://env.t3.gg/docs/nextjs) includes `process.env.CI === "true"`, which would switch the
 * gate off in the one place a missing variable has to be caught; an explicit escape hatch is no
 * better, because a hatch that exists is one somebody eventually sets in CI.
 */
export const env = createEnv({
  server: {},
  client: {},
  // Only client variables are destructured here. Next "stopped static analysis of server side
  // `process.env`" in 13.4.4, so the rest are read from it directly — the wording is
  // `experimental__runtimeEnv`'s own, in `@t3-oss/env-nextjs`'s types.
  experimental__runtimeEnv: {},
  // A variable set to the empty string is a variable somebody meant to set. Without this it
  // satisfies `z.string()` and suppresses any default — t3-env "recommend[s] that all new
  // projects explicitly specify this option as true" for exactly that reason
  // (`emptyStringAsUndefined`, in `@t3-oss/env-core`'s types).
  emptyStringAsUndefined: true,
});
