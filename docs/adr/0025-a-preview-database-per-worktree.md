---
status: accepted
---

# Every Orca worktree gets its own preview database, created before its first push

Each open worktree has a Neon branch of its own — `wt/<git-branch>`, a child of `preview` — reached
by a Vercel Preview `NEON_PGHOST` **scoped to that one git branch**, which overrides the
environment-wide one. Three things create it, in one command at worktree-creation time:
[`../../scripts/provision-worktree-database.ts`](../../scripts/provision-worktree-database.ts), run
by [`orca.yaml`](../../orca.yaml)'s `scripts.setup`. One command takes it away:
[`../../scripts/sweep-worktree-databases.ts`](../../scripts/sweep-worktree-databases.ts).

**The shared `preview` branch stays exactly as it is**, as the fallback, and
[ADR-0023](0023-one-shared-schema-only-preview-branch.md) is amended rather than replaced: its
central finding is untouched and one premise in its cost section is not.

Decided and applied on 21 August 2026 by
[CAN-138 Give every Orca worktree its own preview database, so parallel schema work stops colliding](https://linear.app/jacobrees-canoncore/issue/CAN-138).
The investigation is [`../research/per-worktree-preview-databases.md`](../research/per-worktree-preview-databases.md),
whose own central claim this ADR corrects; the provisioning state is
[`../infrastructure.md`](../infrastructure.md) → *A preview database per worktree*.

## Contents

- [What falsified ADR-0023's premise](#what-falsified-adr-0023s-premise)
- [The hazard that is silent, and is a schema failure rather than a data one](#the-hazard-that-is-silent-and-is-a-schema-failure-rather-than-a-data-one)
- [Vercel will not take a variable for a branch that is not on GitHub](#vercel-will-not-take-a-variable-for-a-branch-that-is-not-on-github)
- [Why the three steps are in that order](#why-the-three-steps-are-in-that-order)
- [When the hook does not run](#when-the-hook-does-not-run)
- [Teardown](#teardown)
- [What it costs](#what-it-costs)
- [What will try to reopen it](#what-will-try-to-reopen-it)
- [Consequences](#consequences)

## What falsified ADR-0023's premise

ADR-0023 accepted "two concurrent previews share one database" on a stated ground:

> work here is solo with one branch open at a time

**That is false and was already false when it was written.** Six CanonCore worktrees were open
simultaneously on 17 August 2026, and `orca worktree list --json` returned **five** on 21 August
2026 — `can-128`, `can-138`, `can-142`, `can-144`, `can-147` — while this decision was being made.
Lanes have been dispatched in parallel since 16 August
([`../agents/workflow.md`](../agents/workflow.md) → *Dispatching a lane, and what one starts with*),
so the premise did not decay; it was overtaken by a change in how the repository is worked.

ADR-0023's own *What will try to reopen it* names the trigger and the answer:

> **A second person landing work.** … The answer then is one of the rejected shapes above, and the
> root-branch allowance is the first thing to check.

and

> **The five-root-branch ceiling** … It is an argument for a plan or for child branches of
> `preview`, not for cloning production.

Both are right, and the allowance turns out not to bind. **A child of `preview` is an ordinary
child, not a root branch** — verified by experiment on 21 August 2026 rather than inferred, which is
what the research left open: the branch read back with `parent_id` set, `parent_lsn`,
`parent_timestamp` and `init_source: parent-data`. Children spend the **total** branch allowance
rather than the **root** one, so `main` and `preview` still spend two of five roots and nothing
here changes that.

**What the same experiment corrected is what a child contains.** It holds no production row —
`story` read `0` against production's `2` — so ADR-0023's premise that `preview` carries no
production data still holds and is not what changed. But it inherits *`preview`'s own accumulated
rows*, which on 21 August 2026 were two `user` rows, both at `mail.canoncore.com`. That domain is
the one [`../infrastructure.md`](../infrastructure.md) → *Transactional email: Resend* treats as an
address that cannot be a person, so these are the project's own test mailboxes rather than anybody's
personal data. **The general point survives the particular one**: whatever `preview` has accumulated
is copied into every worktree database, so a real address signing in on a preview would be
multiplied by the number of open lanes. The remedy if that ever happens is to empty `user` on
`preview`, after which its children inherit nothing.

It also inherits `preview`'s **ownership** and its **seeded Drizzle journal** — fourteen rows,
matching the repository, with every table owned by `canoncore_migrator`. So a worktree database is
migratable from its first run and needs none of the provisioning
[`../infrastructure.md`](../infrastructure.md) → *The ownership repair of 21 August 2026* describes.

## The hazard that is silent, and is a schema failure rather than a data one

This is the argument for changing that is independent of everything above, and ADR-0023 did not
know about it. `drizzle-kit migrate` decides what to apply from a **high-water mark on a timestamp**,
read once before the loop, and never consults the `hash` column it writes.
[`../../scripts/apply-migrations-ahead-of-merge.sh`](../../scripts/apply-migrations-ahead-of-merge.sh)
carries the quoted source, and
[`../research/per-worktree-preview-databases.md`](../research/per-worktree-preview-databases.md) has
the full path through the two packages.

With two worktrees on one database, whichever migration has the **earlier** timestamp is skipped
**permanently** if the later one reached the database first — no row is inserted for it, so the
predicate stays false on every future run, and `drizzle-kit` exits 0 reporting success. That is a
green check over a preview whose schema is somebody else's, and with lanes running in parallel it
is roughly half of all orderings rather than an edge case. The count check in that script cannot see
it, because both sides carry the same number of migrations.

**A branch per worktree removes it rather than mitigating it**, and this was demonstrated rather
than argued. On 21 August 2026 a migration was applied to one worktree's database and the other's
read back unchanged — journal at 14 rows against 15, and the new table absent — with both holding
none of production's rows.

## Vercel will not take a variable for a branch that is not on GitHub

**This is the finding that reshaped the design, and it falsifies the research this ticket was
written from.** That document concluded that the race ADR-0023 rejected the branch-scoped-variable
shape over "does not exist here", because Orca creates a worktree hours before any push. Orca's
timing is real and necessary. It is not sufficient:

```
POST /v10/projects/canoncore/env   { "gitBranch": "jacobdrees/can-138", … }
→ 400  {"error":{"code":"BAD_REQUEST",
         "message":"Branch \"jacobdrees/can-138\" not found in the connected Git repository."}}
```

Read against the API directly on 21 August 2026, not only through the CLI, so it is Vercel's rule
rather than a client-side check. **The branch must exist on GitHub before the variable can name
it** — and the push that would create it is the same push that creates the first deployment. The
race is therefore back, in a different place from where ADR-0023 met it.

**What dissolves it is creating the branch without pushing to it.** `gh api … git/refs` creates
`refs/heads/<branch>` at a commit `origin` already has, which fires GitHub's `create` event rather
than `push` — and Vercel builds on `push`. Verified by watching the deployment list across the
creation: the newest deployment stayed 25 minutes old while the ref appeared. So the branch exists
on GitHub, nothing is deployed, the variable is accepted, and the first real push already reads the
worktree's own database.

**The alternative that was rejected** is setting the variable after the first push and forcing a
redeploy. It needs no ref on GitHub and leaves an abandoned lane no trace, and it loses on the case
this ADR exists for: a branch carrying a migration would open its pull request with the *first*
deployment reading the shared `preview` branch, which lacks that migration, so the required `Vercel`
context goes red on a branch that is perfectly correct. Trading a silent wrong schema for a loud
wrong check is not the trade worth making when a third option has neither.

## Why the three steps are in that order

1. **The GitHub ref**, because Vercel refuses step 3 without it. Created at
   `git merge-base HEAD origin/main` and never at `HEAD` — at worktree creation the two are the same
   commit, and later they are not, and a setup hook that pushed unpushed work would be the one thing
   a setup hook must never do.
2. **The Neon branch**, a child of `preview`, named `wt/<git-branch>`. **The prefix is load-bearing
   rather than tidy**: `main` and `preview` live in the same project, and the only thing standing
   between the sweeper and production is that neither can be named by `gitBranchOf`.
3. **The Vercel variable**, Preview, branch-scoped, `--no-sensitive`. The last is not cosmetic:
   `parseVercelEnv` in [`../../scripts/lib/doc-checks.ts`](../../scripts/lib/doc-checks.ts) merges
   every row of one name and takes Sensitive if any row is, and the roster check compares
   sensitivity — so one Sensitive branch-scoped row would redden `check-docs` for every lane at once.

**Only `NEON_PGHOST` is per-branch.** `NEON_PGDATABASE` is `neondb` on every branch and a Neon role
belongs to the project rather than the branch, so
[`../../apps/web/src/db/database-url.ts`](../../apps/web/src/db/database-url.ts) composes the rest
unchanged and is not touched by this decision. One variable per open worktree, against a Vercel
limit of 1,000 per environment per project.

## When the hook does not run

**Nothing here has a failure mode that reaches production, and that is what makes it safe to
automate.** If the hook does not run, if the key is missing, if Neon is down, if a branch was made
outside Orca — the branch-scoped variable simply does not exist, the environment-wide Preview
`NEON_PGHOST` applies, and the preview reads the shared `preview` branch. **That is the behaviour
every preview had before this existed.** Verified on 21 August 2026: a branch with no override
pulled the shared branch's host, not production's.

So the script **exits 0 on every failure** and reports SKIP rather than FAIL. A hook that aborted
`orca worktree create` over a database the lane may never need would be worse than one that leaves
the lane on the shared branch and says so. The cost of the degraded state is exactly the cost
ADR-0023 accepted: shared rows, and a migration that can collide with another lane's. Re-running the
script is the whole of the repair.

`database-url.ts` still refuses production's compute in every one of these cases, because it
compares compute ids rather than whole hostnames.

## Teardown

**A sweeper, run attended, rather than a hook or an expiry.**

- **`orca.yaml`'s `scripts.archive` runs on `worktree rm` only with `--run-hooks`**, so the ordinary
  removal path skips it silently. A teardown that fires on the tidy path alone tidies nothing.
- **Neon's `expires_at` does work here**, which settles a question the research left open on a
  direct conflict between Neon's guide and its own OpenAPI specification: a branch created with it
  on 21 August 2026 read back `expires_at` and `ttl_interval_seconds: 22412`, so the Early Access
  caveat does not bind this organisation. **It is still not used.** It deletes the Neon half and
  leaves the Vercel variable pointing at a host that no longer answers — which is worse than the
  fallback, because the variable still overrides it — and it can fire under a lane that is open.

The sweeper takes both halves together and is **dry by default**; `--apply` is the difference
between reading a plan and destroying one. It sweeps two classes, established differently: a git
branch **gone from origin**, which is finished work, and a branch **still on origin carrying no
commit `main` lacks**, which is an abandoned lane — the second also removing the ref, since it
carries nothing to lose.

**Two absences are refused rather than read as emptiness**, and both would otherwise delete
databases somebody is using. `git ls-remote` returns nothing both when there are no branches and
when it could not reach origin, so an empty result refuses the whole run. And `orca worktree list`
being unreadable is not "no lane is open": the abandoned-lane class is kept without it, while the
gone-from-origin class proceeds, so a degraded run still does the useful half.

**The one case it can get wrong** is a branch created outside Orca with the script run on it by
hand and no commit made yet: no Orca worktree exists, so it reads as abandoned. Nothing in the
documented flow produces that, since the hook only runs under `orca worktree create`.

## What it costs

- **A Neon API key, which this project deliberately did not hold.** The real cost, and
  [ADR-0016](0016-provisioning-plain-api-keys-neon-excepted.md) is amended for it rather than
  quietly contradicted. It is **project-scoped**, not organisation-wide, and that was verified by
  experiment rather than assumed: it reads `canoncore` and answers `404` on the sibling `waveger`
  project and on every `/organizations/…` path. It lives on the machine that runs the hook and
  nowhere a deployment can reach — [`../infrastructure.md`](../infrastructure.md) → *The Neon API key*.
- **Reading the Vercel CLI's own token for teardown.** `vercel env rm` has no `--git-branch` flag on
  58.7.1, so the CLI can create a branch-scoped variable and cannot delete one. The sweeper runs a
  `vercel` command to refresh the CLI's short-lived token and then reads it, rather than minting a
  second permanent secret to sit beside the Neon key. It stops rather than guessing if that file's
  shape moves.
- **One Neon branch and one compute per open worktree.** Each inherits the project's
  `default_endpoint_settings` — no endpoint options are passed, deliberately, so compute size stays
  one decision in one place. **CAN-144 Bound or detect the Neon bill owns that setting and the
  billing figures; do not restate them here.** What matters to this decision is that the branch
  count is bounded by open lanes and that the sweeper is what bounds it.
- **A quota suspends these too.** A per-project consumption quota suspends every compute in the
  project, so a worktree database can exist and refuse connections. That reads as the degraded case
  above rather than as an outage, and CAN-144 owns the quota.
- **What a worktree database costs is its duty cycle, not its existence.** Measured on 21 August
  2026 under CAN-144: `canoncore`'s `main` compute ran **63.8%** of wall clock because something
  polls the site every five minutes, while `waveger`, which nothing polls, ran **2.5%**. A branch
  that only wakes when a person opens its preview scales to zero the rest of the time. **So nothing
  here may grow a keep-warm, health-check or readiness poll per worktree** — that, and not the
  number of branches, is what would make this expensive.
- **An abandoned lane leaves a ref on GitHub** until the sweeper takes it. That is new: before this,
  a lane that was opened and never worked left nothing anywhere.
- **A rebase makes the first push non-fast-forward.** The ref is created at the base commit, so a
  lane that rebases onto a newer `main` cannot fast-forward it. `../agents/workflow.md` already
  prescribes `git fetch origin && git rebase origin/main && git push --force-with-lease`, and the
  fetch in that line is what makes the lease current.

## What will try to reopen it

- **Re-ticking the Neon integration's `Create Database Branch For Deployment → Preview`.** ADR-0023
  calls this "the one regression here with no automated guard" and it is now worse rather than the
  same: the webhook's per-deployment value overrides a branch-scoped variable too, so every lane
  would silently go back to reading a clone of production while appearing to work.
- **`expires_at`, now that it is known to work.** It is refused above for reasons that are not
  availability, and "it is available" does not answer either of them.
- **Deleting the variable by hand.** `vercel env rm NEON_PGHOST preview` cannot target a branch, so
  the reflex reaches the environment-wide row — the fallback every other preview reads. The sweeper
  excludes that row **by shape rather than by name**, so no string can select it; a person at a
  terminal has no such guard.
- **Pointing the sweeper at a schedule.** It deletes databases and its safety comes from being read
  before it is applied. An unattended run is a different decision and should be taken as one.
- **Making the hook fatal** the first time it silently leaves a lane on the shared branch. The
  degraded state is a working preview; a lane that will not open is not.

## Consequences

- **`orca.yaml` gains a second setup step**, and it is read from the commit, so a lane based on a
  branch predating this change gets nothing and falls back — which is the designed behaviour rather
  than a failure.
- **[`../../scripts/apply-migrations-ahead-of-merge.sh`](../../scripts/apply-migrations-ahead-of-merge.sh)
  targets this worktree's own branch**, offered as the default rather than pasted, and its standing
  warning that only one branch at a time may ever migrate `preview` is retired for lanes that have a
  database of their own.
- **`/review-pr` runs the sweeper after the merge**, which is both the moment a branch is deleted and
  an attended one.
- **The roster check cannot see a branch-scoped variable.** `vercel env ls` shows no git branch and
  the parser merges rows by name, so these rows are invisible to
  [`../../scripts/check-docs.ts`](../../scripts/check-docs.ts) — which is why they must match the
  documented row's environment and sensitivity exactly, and why the sweeper rather than the gate is
  what keeps them from accumulating.
- **A Provider repository inherits none of this**, exactly as ADR-0023 says of its own decision.
