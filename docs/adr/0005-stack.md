# Stack

Settled after the domain work rather than before it, as `CLAUDE.md` requires.

**TypeScript. Next.js App Router. Postgres with row-level security. Drizzle. better-auth.
Vercel plus Neon. Plain pnpm workspaces with no build orchestrator, packages shipping source, in
one monorepo.**

*Revised 9 August 2026: originally specified Turborepo. Nothing had been built, so this is a
correction rather than a migration.*

## Why each

**Next.js, not Expo Web.** "Done" is defined as a public URL a stranger can open, so the graded
surface must not route through the least maintained part of the stack. `react-native-web` has had
no release and no repo activity since 2025-10-16 across three Expo SDKs that all pin 0.21.0; Expo
Router's SSR is alpha and its RSC mode forces `output: "single"`, which kills SEO. A second benefit
emerged later: a Next.js web app is **not an Expo project**, so it is immune to the
`react-native` → `react-native-tvos` alias that a TV app forces onto every Expo app in a monorepo.

**Next.js, not TanStack Start.** Both are defensible and someone who ported a multi-tenant SaaS kit
between them concluded "neither framework is a mistake". The split is RSC and ecosystem depth
against type safety and deploy portability. For one person whose failure mode is not shipping,
ecosystem depth wins.

**Postgres with RLS, and Drizzle.** The overlay in ADR-0004 is joins across snapshots, overrides
and placements — SQL's home ground. Current practice for multi-tenancy is not a choice of layer but
both: application scoping first, RLS second, so a forgotten `WHERE` cannot leak another user's
rows. Drizzle's SQL-first design makes RLS integration natural in a way managed ORMs do not.

**better-auth, not Clerk or Auth.js.** Auth.js v5 lacks RBAC, organisations, 2FA and passkeys.
Clerk is faster to stand up but stores user records in someone else's system, which turns a GDPR
erasure request into a two-system transaction. Users live in our Postgres, so the scheduled hard
delete stays one transaction.

## Three rules that are not optional

1. **The application role must not have `BYPASSRLS`.** Neon warns specifically against
   `neondb_owner`, which bypasses RLS silently. Connecting as the owner is a one-line tenant leak.
2. **RLS failures return empty results, not errors.** A broken policy is indistinguishable from
   "no data" in the UI, so every RLS-protected table needs an automated test asserting a
   cross-tenant read returns zero rows. Manual QA cannot catch a failure whose symptom is silence.
3. Session context via `SET LOCAL` inside an explicit transaction, because serverless pooling
   otherwise drops it.

## No build orchestrator

Turborepo's value is task orchestration and remote caching across many packages. Day one is one app
and one config package, so it would be configuration whose benefit has not arrived: `pnpm -r`
covers the fan-out and `pnpm --filter` covers the targeting. Note that `pnpm -r` runs one script
per invocation — running several means several commands, which `docs/agents/workflow.md` spells
out. Adding it later is a config file
rather than a migration, which makes deferring it nearly free and adopting it early a speculative
abstraction of the sort this repo's principles rule out. Revisit when a second app arrives, or when
CI is slow enough to notice.

**Packages ship source, with no build step.** Each package's `exports` points at `src/index.ts`
and the consumer compiles it. Each consumer therefore has to be told to transpile the package, and
in exchange a class of bug that is expensive to recognise disappears: editing a package and testing
a stale `dist/`. This is a separate decision from declining the orchestrator, recorded here because
both concern how the workspace is built.

## Repo shape

One monorepo, `apps/` for framework-specific things and `packages/` for shared. Day one is
`apps/web` plus `packages/config` only: the workspace is real from the first commit, but no
boundary is drawn before a second consumer exists. `packages/domain` and `packages/api-client` get
extracted when `apps/mobile` arrives.

**Mobile is built on `react-native-tvos` from its first commit**, even as a phone app, because Expo
states that one TV app in a monorepo requires every Expo app in it to use the TV package. Starting
on the fork costs nothing and avoids migrating an existing codebase later.

Providers live in **separate repositories**. If a provider lived in `apps/`, the separation would be
cosmetic, and a shared import would hide gaps in the published contract.

## Sequence

Walking skeleton to production first: one record rendering on a public URL through the whole stack,
with CI and one end-to-end test — which is the cross-tenant read test from rule 2. Then v1. Then
mobile, then TV, then playback.
