---
status: accepted
---

# One shared schema-only Neon branch serves every preview, addressed by a static Preview variable

Every preview deployment reads **one** Neon branch, `preview`, created `init_source: schema-only` from
`main` and therefore holding `main`'s schema and none of its rows. A preview finds it through
`NEON_PGHOST` and `NEON_PGDATABASE`, two ordinary Preview-scoped Vercel variables, and the Neon
integration's `Create Database Branch For Deployment → Preview` is **off**, so nothing is created per
deployment any more.

Decided and applied on 17 August 2026 by
[CAN-79 Previews clone production rows, and the integration has no switch to stop it](https://linear.app/jacobrees-canoncore/issue/CAN-79).
The state and the provisioning are
[`docs/infrastructure.md`](../infrastructure.md) → *The shared preview branch*; this file holds why.

**What this replaces was not merely worse, it was the finding.** The integration created one
`preview/<git-branch>` branch per git branch with `init_source: parent-data` — a copy-on-write clone
of production's rows — and exposed no setting anywhere to change that. So "a preview must not read
production data" was satisfied to the letter, by giving each preview its own database, and defeated in
substance, because that database was production's contents
([`docs/research/tracker-and-repository-audit.md`](../research/tracker-and-repository-audit.md), finding 5).

## Contents

- [Per-deployment binding and schema-only branching cannot both be had](#per-deployment-binding-and-schema-only-branching-cannot-both-be-had)
- [Why the other two shapes lost](#why-the-other-two-shapes-lost)
- [What it costs](#what-it-costs)
- [What this does to ADR-0016](#what-this-does-to-adr-0016)
- [What will try to reopen it](#what-will-try-to-reopen-it)
- [Consequences](#consequences)

## Per-deployment binding and schema-only branching cannot both be had

This is the whole decision, and everything else follows from it.

**Only the Marketplace integration can put a value into one specific deployment.** It injects the
branch's variables "via webhook at deployment time, overriding preview environment variables for this
deployment only" ([Neon, preview branching](https://neon.com/docs/guides/vercel-native-integration-previews)).
Nothing available to us does that: Vercel's environment variables are scoped to an environment or to a
git branch, they are fixed for a deployment once it is created, and there is no API by which we could
hand a value to a build that is already running.

**And the integration's branches are always `parent-data`.** Neon's schema-only branching is real but
it is a **branch-creation** option, reached through the Console or the API
([Neon, schema-only branches](https://neon.com/docs/guides/branching-schema-only)); the integration
documents no `init_source`, no schema-only setting, and no control at all over what a preview branch
is seeded with. Verified in both dashboards on 13 August 2026 and re-checked against Neon's own
documentation on 17 August 2026.

So the two properties are exclusive. **A mechanism that binds a database to one deployment must be the
integration's, and the integration's clones production.** Any design that keeps per-deployment binding
keeps the clone; any design that removes the clone gives up per-deployment binding. There is no third
option, and recognising that is what made this decision tractable — it stopped being "how do we do
both" and became "which do we give up".

**Isolation between previews is the one that was worth giving up.** Production rows in a preview is a
live exposure on a deployment with no access protection. Two concurrent previews sharing a database is
a development inconvenience, and today it is not even that: work here is solo with one branch open at
a time, which [`docs/infrastructure.md`](../infrastructure.md) → *The ruleset* already relies on when
it declines strict status checks.

> **That last sentence is false, and it is the only part of this ADR that is.**
> [ADR-0025](0025-a-preview-database-per-worktree.md) gives every Orca worktree a database of its
> own, and the premise is why. Lanes have been dispatched in parallel since 16 August 2026: six
> worktrees were open at once on 17 August, and five on 21 August while that decision was taken. So
> "solo with one branch open at a time" describes how this repository was worked before the sentence
> was written, not after.
>
> **Two concurrent previews sharing a database is also worse than "a development inconvenience",
> for a reason this ADR could not have known.** `drizzle-kit migrate` compares timestamps against a
> single high-water mark, so of two lanes sharing one database the one whose migration is *older*
> has it skipped **permanently**, with `drizzle-kit` reporting success — a green check over a preview
> running somebody else's schema. That is the failure shape this repository is otherwise built to
> refuse, and it is the argument that carried ADR-0025 rather than the shared rows.
>
> **Everything else here stands and was re-confirmed**, from stronger sources than the ones cited:
> per-deployment binding and schema-only branching really are exclusive, the integration's branches
> really are always `parent-data`, and Vercel really has no endpoint that hands a value to a running
> build — established by enumerating its whole OpenAPI surface. **The shared `preview` branch is
> not replaced**: it is the parent every worktree database is a child of, and the fallback any
> preview without one still reads.

## Why the other two shapes lost

Both keep per-branch or per-deployment isolation, and both pay for it somewhere that matters more.

**A GitHub Action on `pull_request`, setting a branch-scoped Preview variable.** Vercel does support a
variable scoped to one git branch, so this reaches per-branch isolation. It loses on a race it cannot
win: the push that opens a pull request starts the Vercel build and the Action at the same moment, so
the **first** deployment of every new branch boots before the variable exists. Its build succeeds, the
required `Vercel` context reports green, and the deployment 500s on every page that reads the database
— a green check over a broken preview, which is the exact failure shape this repository is otherwise
built to refuse. Buying the race back means having the Action deploy a replacement, which is two builds
per push on a Hobby plan with fair-use limits, one of them knowingly broken.

**Creating the branch in the preview build and baking the host into the output.** This is race-free and
genuinely per-deployment, and it lost on three counts, each of which is a settled decision it would
reopen. The host cannot travel from the build to the runtime through the environment: Next stopped
static analysis of server-side `process.env` in 13.4.4 (as
[`apps/web/src/env.ts`](../../apps/web/src/env.ts) records), and Vercel's runtime variables are fixed
when the deployment is created. So it must be written into a generated module that ships in the bundle
— a source file that must exist for `tsc`, for `vitest` and for a clean checkout, whose presence
changes behaviour and which no test covers. It needs migrations to run inside the Vercel build, which
[`apps/web/drizzle.config.ts`](../../apps/web/drizzle.config.ts) and
[`docs/agents/workflow.md`](../agents/workflow.md) → *What a merge carries* both say never happens. And
it puts a Neon API key into the preview build environment.

**Unticking `Preview` and nothing else** is the option that reads as the cheap fix and is the worst of
all: previews would share `main`, which is production, which is what
[CAN-45 Preview deployments do not appear to get their own Neon branch](https://linear.app/jacobrees-canoncore/issue/CAN-45)
fixed. The shared branch is what makes unticking safe, and unticking without it is a regression
disguised as a tidy-up.

## What it costs

- **Two previews open at once share one database.** One preview's writes are visible to the other's,
  and a sign-in on one is a `user` row the other can read. Nothing is shared with production.
- **Two of five root branches.** A schema-only branch has no parent and is therefore a root branch,
  and Launch allows five per project ([Neon, schema-only branches](https://neon.com/docs/guides/branching-schema-only),
  whose *Schema-only branch allowances* section tables it: Free 3, Launch 5, Scale 25). `main` and
  `preview` spend two.
  This is also why the rejected shapes above were capped at four concurrent previews, which neither
  of them acknowledged.
- **The branch's schema moves only when somebody moves it.** Nothing copies `main` onto it, and
  *reset from parent* does not exist for a branch with no parent. A forgotten migration is a preview
  that 500s, which is loud, and
  [`scripts/apply-migrations-ahead-of-merge.sh`](../../scripts/apply-migrations-ahead-of-merge.sh) is
  the tool.
- **A Vercel variable somebody can edit is a variable somebody can edit wrongly.** The old failure
  mode was a webhook not firing; the new one is production's host typed into `NEON_PGHOST`.
  [`apps/web/src/db/database-url.ts`](../../apps/web/src/db/database-url.ts) refuses that at request
  time, and it is the same refusal as before, now guarding a different mistake.
- **The provisioning has a step no file can assert**, because the branch was created in the Neon
  Console: this project holds no Neon API key, and the `neon` MCP's `create_branch` has no
  `init_source` parameter and silently makes a `parent-data` clone instead.

**What it does not cost is cleanup**, and that is worth stating as a gain rather than a neutral. The
integration created a branch per git branch that ever had a preview and kept it on Vercel's six-month
retention, which by 17 August 2026 was fifty-odd live clones of production
([`docs/incidents.md`](../incidents.md#what-a-preview-branch-looks-like-and-how-long-it-outlives-its-pr)).
One shared branch has no per-deployment lifecycle, so there is no expiry to choose, no pull-request
close hook to write, and nothing to forget.

> **[ADR-0025](0025-a-preview-database-per-worktree.md) buys that cost back deliberately**, and this
> paragraph is why it buys it with a sweeper written in the same change rather than a follow-up
> ticket. A per-worktree branch has a lifecycle again; what is different is that it is keyed to a
> git branch that can be read from `origin`, rather than to a deployment nothing enumerates.

## What this does to ADR-0016

**It removes the reason [ADR-0016](0016-provisioning-plain-api-keys-neon-excepted.md) gave for the one
Marketplace exception, and the exception stays.** That ADR's test is "does the integration know about a
deployment?", and its whole answer for Neon was preview branching: "a token of ours could create the
branch; nothing would then tell the running deployment which branch it got, and a project-level
variable carrying one branch's host is not a smaller version of the right answer — it is the bug,
because every other preview would read it too."

**Every preview reading one host is now the design rather than the bug**, because the branch it
addresses holds no production data. So the per-deployment resource that justified the exception no
longer exists, and by ADR-0016's own rule the integration now buys nothing that a plain API key would
not.

It stays installed regardless, and the reason is honest and different from the original one: the Neon
**resource** is provisioned and billed through it, on the Launch plan, and moving off it is a
migration of the database's billing and ownership rather than a tidy-up. ADR-0016 records the change
at its own test rather than being superseded, because the *rule* it establishes is unaffected — it is
the application of that rule to Neon that has expired.

## What will try to reopen it

- **Neon closing the gap.** If the integration ever exposes what a preview branch is seeded with,
  per-deployment branching and schema-only stop being exclusive and this decision should be revisited
  immediately: it exists only because they are. It is a third party's unannounced gap, and it is the
  kind that closes without notice.
- **A second person landing work.** Two concurrent previews sharing a database is the accepted cost,
  and it is accepted because of how this repository is worked, not because it is harmless. The answer
  then is one of the rejected shapes above, and the root-branch allowance is the first thing to check.
  **This happened, and it was parallel lanes rather than a second person** —
  [ADR-0025](0025-a-preview-database-per-worktree.md). Both halves of the instruction turned out
  right: the answer was the first rejected shape, and the allowance was the first thing checked. It
  does not bind, because a child of `preview` is not a root branch.
- **The Vercel dashboard and the `neon` MCP**, both of which present preview branching as a feature to
  enable. Re-ticking `Preview` does not break a preview: the webhook's per-deployment value overrides
  ours silently, so previews would go back to reading clones of production and everything would appear
  to work. `database-url.ts` would not catch it, because a clone of production is not production's
  host. **That is the one regression here with no automated guard**, and it is a dashboard checkbox.
- **`provision_neon_auth`**, which is refused for its own reasons in ADR-0016 and would land a
  `neon_auth` schema on whatever branch it is pointed at.
- **The five-root-branch ceiling**, which will read as an argument for going back to `parent-data`
  branches the first time somebody wants a fourth long-lived database. It is an argument for a plan
  or for child branches of `preview`, not for cloning production.

## Consequences

- **`Create Database Branch For Deployment` is off for both environments**, and re-ticking `Preview`
  silently restores the finding this ADR closes.
- **`NEON_PGHOST` and `NEON_PGDATABASE` are ours, in the roster, and gated.** They joined
  [`docs/infrastructure.md`](../infrastructure.md) → *Environment variables* at the moment they
  stopped being per-deployment, so `scripts/check-docs.ts` compares them against Vercel on every CI
  run. A variable nothing can read back is a variable nothing can gate, and these two were exactly
  that until this change.
- **The ahead-of-merge migration step moved off production.**
  [`scripts/apply-migrations-ahead-of-merge.sh`](../../scripts/apply-migrations-ahead-of-merge.sh)
  applies to `preview` and reads `main` back without writing to it, because the only reason it ever
  wrote to production was that previews branched from it. Production is now migrated by the release
  and by nothing else, which is what [ADR-0019](0019-ci-owns-the-production-release.md) intended.
- **A preview is a rehearsal for the production migration.** The same files run against a faithful
  copy of production's schema, read by a person, before the release runs them against production.
- **Preview protection's acceptance changes shape.** Previews are still unprotected, and what that
  exposes is now the code and a preview's own data rather than production's rows.
- **A Provider repository inherits none of this.** Each arrives with the platform's defaults, so a
  Provider that needs a database makes this decision again from scratch — ADR-0014, and
  [`docs/agents/workflow.md`](../agents/workflow.md) → *Work that spans two repositories*.
