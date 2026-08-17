import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

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
 * **Every variable here is optional, and that is deliberate rather than a weak schema.** Which
 * database variables a deployment carries depends on which deployment it is: `DATABASE_URL` is
 * production-only on purpose, and a preview's `NEON_PGHOST` is injected per deployment by Neon's
 * webhook rather than held on the project. A schema demanding either of them unconditionally
 * would fail every build in the environments that correctly lack it — including a preview's,
 * which reports the required `Vercel` check, so it would block every merge.
 *
 * What is required is therefore a property of the combination, not of any one key, and
 * [`src/db/database-url.ts`](db/database-url.ts) is where the combinations are named and
 * refused. It runs when a request opens a connection rather than when the build runs, and its
 * refusals are as loud; the roster and which environment carries what is
 * `docs/infrastructure.md` → *Environment variables*.
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
  server: {
    // Set by Vercel on every deployment and absent everywhere else, which is how
    // `src/db/database-url.ts` tells a preview from production without being told twice.
    VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
    // The application role's connection string. Production and local development; never a
    // preview, which composes its own from the four below.
    DATABASE_URL: z.string().min(1).optional(),
    DATABASE_APP_USER: z.string().min(1).optional(),
    DATABASE_APP_PASSWORD: z.string().min(1).optional(),
    // Production's Neon host, in plain text, so that a preview has something to compare the
    // host it resolved against. Not a credential: it opens nothing without the two above.
    DATABASE_PRODUCTION_HOST: z.string().min(1).optional(),
    // The *auth* role's name and password. A third role, because the thing that authenticates
    // cannot be constrained by the identity it establishes: `src/auth/auth.ts` says why, and
    // `src/db/database-url.ts` composes its connection string out of the application role's.
    DATABASE_AUTH_USER: z.string().min(1).optional(),
    DATABASE_AUTH_PASSWORD: z.string().min(1).optional(),
    // Injected into a preview deployment by Neon's integration, naming that deployment's own
    // branch. Undeclared anywhere in Vercel's project settings, by design, which is why
    // `vercel env pull` cannot show them and why a preview is the only place they exist.
    NEON_PGHOST: z.string().min(1).optional(),
    NEON_PGDATABASE: z.string().min(1).optional(),
    /**
     * What better-auth signs a session cookie with.
     *
     * **Optional here and refused where it is used**, like the database variables above and for
     * a sharper version of the same reason: better-auth *invents* one when nothing sets it, so
     * an absence is not an error but a per-isolate secret — and Vercel Functions are
     * per-invocation isolates, so every cold start would issue cookies the next isolate cannot
     * verify. That reads to a person as being signed out at random. `src/auth/auth.ts` refuses
     * to serve without it, as loudly as `database-url.ts` refuses a missing host.
     */
    BETTER_AUTH_SECRET: z.string().min(1).optional(),
  },
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
