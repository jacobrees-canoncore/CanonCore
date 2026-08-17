---
status: accepted
---

# CI owns the production release, and Vercel's Git deploys are off for `main`

[`apps/web/vercel.json`](../../apps/web/vercel.json) sets
`git.deploymentEnabled: { "main": false }`, and the GitHub Actions job releases instead:
**migrate, build, promote, in that order**, on `main` only and only once every gate above it is green
([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)).

**Previews are untouched and still deploy from Git.** That is load-bearing rather than incidental,
and *Turning previews off would block every merge* below says why.

Changed by
[CAN-23 One Story from Neon, behind row-level security](https://linear.app/jacobrees-canoncore/issue/CAN-23),
which is when a schema first existed to be migrated. Where the reasoning belongs was deliberately
deferred off that branch and settled on
[CAN-85 Decide whether deploy ownership earns an ADR, or stays a note in the register](https://linear.app/jacobrees-canoncore/issue/CAN-85)
on 14 August 2026: it earns an ADR, because `vercel:deploy` and every dashboard nudge assume Git
deploys, which is the bar `CLAUDE.md` → *Closed decisions, and what will try to reopen them* sets.
Written up 17 August 2026 under **CAN-75 Write the four missing ADRs and fix the glossary's
self-violations**. [`docs/infrastructure.md`](../infrastructure.md) → *`main` does not deploy from
Git* keeps the setting and the date; the procedure is
[`docs/agents/workflow.md`](../agents/workflow.md) → *What a merge carries*.

## Contents

- [A push starts a build immediately, which is the whole problem](#a-push-starts-a-build-immediately-which-is-the-whole-problem)
- [The runner-up, and why a project setting lost](#the-runner-up-and-why-a-project-setting-lost)
- [Turning previews off would block every merge](#turning-previews-off-would-block-every-merge)
- [What this costs](#what-this-costs)
- [What will try to reopen it](#what-will-try-to-reopen-it)
- [Consequences](#consequences)

## A push starts a build immediately, which is the whole problem

With the Git integration on, a merge to `main` starts a Vercel build the moment the commit lands.
A migration run from Actions is then racing a deploy that cannot see it, and both orders lose:

- **Code first.** The new deployment is promoted and serves requests against a schema that has not
  moved. Every read touching the new column fails until the migration finishes, and the window is
  however long the migration takes plus however long it waits for a runner.
- **Migration first, in a job that cannot hold the deploy back.** The schema moves while the *old*
  code is still the promoted deployment. Purely additive changes survive this; a narrowing does not.

**Neither is a failure the tests can see, and neither is loud.** The failure surface is one deploy
interval wide, which is exactly long enough for a green pipeline to report success over it. So the
ordering has to be *enforced* rather than trusted, and enforcing it means one process owns both
steps. `--prebuilt` is what closes the last gap: it deploys "existing build output from the
`.vercel/output` directory" ([Vercel CLI, deploy](https://vercel.com/docs/cli/deploy)), so the
promotion step promotes what the step above it built and never triggers a build of its own.

**This is the same rule the repository already applies to schema changes one level down** — widen,
migrate, then narrow in a later change — and
[`docs/agents/workflow.md`](../agents/workflow.md) → *What a merge carries* owns that procedure. What
this ADR settles is who is holding the stopwatch.

## The runner-up, and why a project setting lost

The alternative was to **leave the Git integration on, untick auto-assignment of the production
domain in the Vercel project, and promote from Actions after migrating**. It reaches the same
ordering, and it lost on where the switch lives.

**A dashboard setting cannot be reviewed, and cannot be restored by anyone reading this repository.**
[`docs/infrastructure.md`](../infrastructure.md) → *Hosting* already names that failure for five
other rows, which "exist nowhere but here … no file in this repository can assert them". A release
guarantee resting on one of those is a guarantee nobody can check: no diff shows it, no test asserts
it, and re-provisioning the project loses it silently.

**`vercel.json` is in the repository, so the setting is a reviewable line** — it shows up in a diff,
it survives re-provisioning the project, and a reader can find it without an account. That it is
genuinely read from the Root Directory was confirmed rather than assumed, and the register holds the
observation and its date: [`docs/infrastructure.md`](../infrastructure.md) → *`main` does not deploy
from Git*.

The cost of that choice is honest and small: `vercel.json` cannot express *which branches* deploy in
any richer way than a per-branch boolean, so the file states `main` explicitly and any future
protected branch has to be added to it by hand.

## Turning previews off would block every merge

**The `Vercel` required status context is emitted by the GitHub App**, not by Actions
([`docs/infrastructure.md`](../infrastructure.md) → *The ruleset*). A change that stopped previews
deploying from Git would therefore stop every pull request reporting that context — and a required
context that never reports blocks every merge for ever, which is the same failure mode the ruleset is
otherwise careful to avoid.

So the boolean is per-branch on purpose. Reading `deploymentEnabled` as a general "we do not use Git
deploys" is the misreading to guard against: **this repository uses Git deploys for every branch
except one.**

There is a second reason to want previews on Git, and it is the point of a preview: it is a real
environment rather than a smoke screen. What a preview does *not* get is a migration, and the
consequence for the order changes land in is procedure rather than decision:
[`docs/agents/workflow.md`](../agents/workflow.md) → *What a merge carries*.

## What this costs

- **Vercel's build cache is not used for production.** The release builds on a fresh runner every
  time. Letting Vercel build instead was weighed and buys less than it looks: `vercel deploy`
  resolves the linked project through the same call `vercel pull` does, so the narrower,
  project-scoped token it seemed to enable has nothing to gain
  ([`docs/infrastructure.md`](../infrastructure.md) → *Why this one is account-scoped*).
- **The release needs an account-scoped `VERCEL_TOKEN` with an expiry.** It expires 14 August 2027,
  and `scripts/check-docs.ts` compares that expiry against Vercel on every run so that the release
  does not stop working on a date nobody wrote down.
- **A release failure is a red CI run rather than a Vercel notification**, so the place to look moves
  from the Vercel dashboard to the Actions run.

## What will try to reopen it

- **`vercel:deploy`**, whose whole shape is "deploy the current project", and which offers
  `prod`/`production` as an argument. Running it by hand promotes a build that no migration
  preceded.
- **The Vercel dashboard**, which treats Git-connected deployment as the normal state and presents
  a disabled branch as something to fix. Reconnecting is one click and reports as an improvement.
- **`vercel:deployments-cicd` and `vercel:bootstrap`**, both of which generate CI wiring that assumes
  the platform owns the deploy.
- **The first person to notice production has no build cache**, for whom turning the integration back
  on is the obvious speed-up. The migration ordering is the answer, and it is not negotiable while a
  schema exists.
- **What would actually reopen it**: Vercel offering a way to hold a production promotion behind an
  external step, at which point the ordering could be enforced with the integration on. Nothing
  short of that.

## Consequences

- **`main` releases only through Actions.** A production deployment made any other way has skipped
  the migration step by construction.
- **Migrations and deploys share one job and one ordering**, so a failed migration stops the release
  rather than shipping code against a database that never moved.
- **`apps/web/vercel.json` is release configuration, not build configuration**, and editing it
  changes who deploys. It is the one file in the app whose blast radius is the production domain.
- **Previews stay on Git**, and turning them off breaks merging rather than merely changing where
  previews come from.
- **A second deployable — `apps/mobile`, or a Provider repository — inherits none of this.** Each
  arrives with the platform's defaults, so *Work that spans two repositories* in
  [`docs/agents/workflow.md`](../agents/workflow.md) applies from that repository's first pull
  request.
