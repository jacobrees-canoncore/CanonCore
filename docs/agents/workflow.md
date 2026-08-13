# Workflow

Trunk-based, solo. One `main`, short-lived branches, squash-merge to land.

**This file is the standing policy: what has to be true.** The steps that make it true live in the
skill that executes them — `/draft-pr` and `/review-pr` in `.claude/skills/` — and each is written
to be runnable from its own body alone. The observations these rules rest on live once in
[`docs/incidents.md`](../incidents.md). Where a step has **no** skill to live in, its commands stay
here and the text says so; branch creation is the one case.

That is a seam by **change cadence**, and it replaced a rule-vs-step seam on 13 August 2026
(**CAN-76 Restructure the agent documents: policy, procedure and incidents get their own homes**).
Rule-vs-step did not hold: every rule here is only actionable *as* a step, and a skill has to be
self-sufficient at execution time, so both sides accreted the same content. Policy changes rarely,
procedure changes when a command changes, and evidence only ever accumulates.

**Where a rule needs restating to be executable, the skill carries the imperative in one line and
cites the owner for the argument.** A one-line imperative is not the duplication this split exists
to remove — a retold incident is.

> **What exists.** CAN-22 built the walking skeleton and CAN-23 One Story from Neon, behind
> row-level security connected it to the database, so `apps/web` exists, a `story` table exists
> behind a policy, and GitHub Actions runs the checks below and then the release on every push to
> `main`. Auth does **not** exist yet — **CAN-24 A signed-in and a signed-out path** brings it —
> so the only session user any request sets is the anonymous one.
>
> Anything the Vercel project does with a push — production from `main`, a preview per pull request
> — is a project setting, so [`docs/infrastructure.md`](../infrastructure.md) is the only place it
> can be recorded and the place to check it.

## Contents

- [Why a PR at all, for one developer](#why-a-pr-at-all-for-one-developer)
- [The review runs once, and `/implement` is normally where](#the-review-runs-once-and-implement-is-normally-where)
- [Branches](#branches)
- [The `gh` account, and the two ways `gh` fails](#the-gh-account-and-the-two-ways-gh-fails)
- [The loop](#the-loop)
- [The gates](#the-gates)
- [What `main` refuses](#what-main-refuses)
- [What a merge carries](#what-a-merge-carries)
- [After the merge](#after-the-merge)

## Why a PR at all, for one developer

There is nobody to review it, so the PR is not doing what a PR usually does. It earns its place on
the deployment rather than the review:

- **A branch is the gate before production.** A push to `main` releases: since CAN-23 the release
  is the tail of the CI job rather than Vercel's own build, so the gates run first — but they run
  on a commit that is already on `main`, and a red gate leaves `main` red rather than unreleased.
  The branch is where a change can still be wrong for free.
- **`main` refuses anything else.** Since CAN-40 its ruleset requires the checks by name, so a
  commit that has not been through them cannot land by any route.

So the states mean: **draft** is "not yet checked against the gates", **ready** is "the gates are
green and it works". Nobody is being signalled — the states are for you.

## The review runs once, and `/implement` is normally where

**Do not ask for a second review of a change `/implement` has already reviewed.** That overrides the
reflex, which is to treat the review as a step in the landing sequence and run it again now that the
branch is pushed.

Two arguments look like they demand otherwise, and they are the pack's own, in `implement.md` and
`code-review.md` under
`~/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/<version>/docs/engineering/`.
Neither survives contact with what the review actually does:

- *`/code-review` compares against a commit* is answered by **making the review read the change that
  gets committed** — and **staging alone does not do that**
  ([incident](../incidents.md#a-review-of-a-staged-but-uncommitted-change-reads-an-empty-range)).
  Commit first and review against the branch point, or hand the review `git diff --cached
  <branch-point>` explicitly.
- *A session does not review its own work* — *"same context reviewing itself isn't review, it's
  confirmation bias with a slash command"* — mistakes which context does the reviewing. The fresh
  eyes are in sub-agents that never saw the implementing session's reasoning, whoever invokes them
  ([incident](../incidents.md#sub-agent-reviews-find-defects-for-the-session-that-invoked-them)).

**What the implementing session keeps is the choice of what it hands them** — the range, the spec,
the standards sources. That is the residual risk, and it is checkable rather than a matter of trust,
which is why the claim to make is *"a review ran against this range"* and never *"a review ran"*.

**So the review has not happened** in three cases: `/implement` did not run; the diff it read was
empty or partial; or the branch has since gained commits it never saw. A rebase or a review-driven
edit after the fact puts you in the third. In each, run
`/mattpocock-skills:code-review <branch-point>` against the pushed branch.

The middle case is the quiet one: a review of an empty range **reports no findings**, which reads
exactly like a clean review.

Two different things answer to the name *code review*. `mattpocock-skills:code-review` is the
two-axis Standards/Spec review that takes a fixed point; Claude Code's bundled `/code-review` is a
bug hunt that takes an effort level. **In this repository the bare name reaches the first one** —
`.claude/skills/code-review/` owns it and forwards, which leaves the bundled one unreachable here;
its `references/rationale.md` says why.

## Branches

The branch name must carry the Linear identifier, so the tracker CLI can find the issue when the
worktree was never linked. **Case does not matter** — a `can-11` in the name resolves CAN-11.
Nothing else about the name is prescribed, and no `feature/` or `fix/` prefix: nothing reads one.

```
main                        production-ready
CAN-11-welcome-email-queue  anything else
```

**Create it before `/implement`, and off `main`.** No skill does this for you and it is the easiest
step in the flow to skip, because nothing prompts for it. `/implement` says only *"Commit your work
to the current branch"*, so on `main` it commits to `main` — and pushing `main` migrates the
production database and releases whatever passed. `/draft-pr` refuses to run there, but by then the
commits already exist and you are recovering rather than opening a PR.

```bash
git switch main && git pull                       # start from what production has
orca worktree create --name CAN-11-welcome-email-queue --linear-issue CAN-11
```

`--linear-issue` is the part that matters: Orca keeps the issue as worktree metadata rather than
reading it off the branch, and that is what makes the `--current` form work — the only form that
needs no `--workspace`. Without Orca, `git switch -c CAN-11-welcome-email-queue` is fine; it only
costs you `--current`.

**If you find yourself on `main` with commits that should have been on a branch**, nothing is lost
as long as you have not pushed:

```bash
git switch -c CAN-11-welcome-email-queue          # the commits come with you
git branch -f main origin/main                    # put main back where it was
```

If `main` has already been pushed, stop — that is a different problem, and not one to fix from
inside a PR command.

### The local `main` is permanently stale in a worktree

**`main` stays checked out at `/Users/jacobrees/orca/projects/CanonCore` for as long as the project
exists**, while every ticket is worked from a worktree under
`/Users/jacobrees/orca/workspaces/CanonCore/`. That is the standing layout, and nothing a worktree
does moves the local `main` ref, so it falls a commit further behind with every merge that lands.

Two consequences, and both have bitten:

- **A count against the local ref reads *behind* almost every time, and almost every time that means
  nothing** ([incident](../incidents.md#a-worktree-branch-reads-behind-while-being-in-perfect-shape)).
  Ask where `HEAD` sits instead: `git merge-base --is-ancestor origin/main HEAD` exits 0 when there
  is nothing to rebase. Two limits on that check — it answers the *behind* reading only, so read the
  *ahead* count first and stop there when it is non-zero, and it cannot tell a diverged base from a
  stale one.
- **`gh pr merge --delete-branch` fails after the merge has already succeeded**
  ([incident](../incidents.md#--delete-branch-fails-after-the-merge-has-already-succeeded)). Never
  pass it, and never read the merge command's exit code as the outcome.

**Rebase onto `origin/main`, never the local `main`** — a rebase onto a stale base reuses it, so the
conflict it was meant to clear survives. And rebase rather than merging `main` in:

```bash
git fetch origin && git rebase origin/main && git push --force-with-lease
```

## The `gh` account, and the two ways `gh` fails

**`jacobdrees` is the account with write access here.** Check rather than assume before the first
`gh` write — which account is active moves on its own
([incident](../incidents.md#gh-fails-with-a-403-when-the-wrong-account-is-active)):

```bash
gh auth status
gh auth switch --user jacobdrees
```

**A refusal is not always GitHub's.** Claude Code's auto mode classifier blocks `gh` writes
sometimes, with the right account active and its token fine, and switching accounts fixes nothing
([incident](../incidents.md#the-harness-classifier-refused-gh-pr-create)). Tell them apart before
reaching for `gh auth switch`: a 403 naming the repository is the account; a refusal naming the
classifier, permissions or auto mode is the harness. **The fallback for the harness case is the
`github` MCP**, which performs the same operations over the same credentials. For the merge it is
weaker than the command it replaces — no head-SHA parameter — so re-read the head SHA immediately
before calling it and say in the report that the match was checked by hand.

**Send a slash command as its own message**, never as the tail of one
([incident](../incidents.md#a-slash-command-sent-mid-message-never-loaded)). The tell that it worked
is that a loaded skill echoes its own instructions.

## The loop

```bash
# create the branch first — Branches, above
# ...work, via /implement, which runs the review...
/draft-pr                                     # push, open the draft, link Linear
/review-pr                                    # gates, ready, squash-merge, close out Linear
```

**No review step sits between those two.** `/implement` already ran it; reach for a review only in
the three cases named above.

- **Squash-merge only.** One ticket, one branch, one commit on `main`. Since CAN-40 the repository
  offers no other merge method.
- **Commit subjects are prose, not Conventional Commits.** `Send the welcome email from the queue
  instead of the request`, not `feat(email): send from queue`. Nothing enforces it — the subject
  says what changed about the product, the body says why. A single-commit PR squashes under its
  commit title, so the PR title should match it.
- **Urgent fixes take the same path.** There is no hotfix lane. The gate is worth more when you are
  in a hurry, not less.

## The gates

What has to be true before a branch lands. **The repo's own checks**, run in GitHub Actions on every
push and re-runnable locally:

```bash
pnpm -r test
pnpm -r typecheck
pnpm -r lint
pnpm -r build
```

Three commands rather than one for the first three. `pnpm -r test typecheck lint` looks equivalent
and is not — pnpm passes words after the script name to that script as arguments, so it would run
`test` alone and silently skip the rest. The one-command form is the regex selector `pnpm -r run
"/^(test|typecheck|lint)$/"`, which arrived in pnpm 11.11 and buys nothing here
([pnpm run](https://pnpm.io/cli/run)). Use `pnpm --filter` to scope to one workspace while iterating.

**The fourth is deliberately not one of the three.** `next build` fails on things the others cannot
see — a server-only API reached from a client component, a page that throws during static
generation, an environment variable nobody set ([`apps/web/src/env.ts`](../../apps/web/src/env.ts))
— and without it the first machine to find out is the one doing the deploy. The three are what
CAN-22 required; this one is ours.

**All four run in one Actions job, in that order, so the first failure stops the rest.** That job is
the single check a pull request reports and one of the two contexts `main`'s ruleset requires;
[`docs/infrastructure.md`](../infrastructure.md) → *The ruleset* is the only document that names it,
and `scripts/check-docs.ts` fails the build if that name and `ci.yml` ever disagree. Requiring the
three commands as three contexts would require names nothing emits, which is worse than requiring
too little — a required context that never reports blocks every merge for ever.

**A fifth step checks the documents against the sources they describe**, `node scripts/check-docs.ts`
— the required contexts, the label roster, the variable roster, and every cross-document pointer.
**Not all of it reaches CI, and the difference is not an oversight:**

| Check | Where it gates | Why |
| --- | --- | --- |
| Job name, ruleset, links, pointers | CI | Local files, plus `gh` with the workflow's own token |
| Variable roster vs `vercel env ls` | CI | The runner installs `vercel` and holds a `VERCEL_TOKEN` secret. An undocumented credential is how a roster goes stale, so this one is worth a secret |
| Label roster vs the tracker | **Locally only** | `orca` drives a desktop app on Jacob's machine and cannot run on a runner |

A check whose source is unreachable reports **SKIP with the reason** and does not fail the build: a
transient outage must not block every merge, which is the same reasoning that keeps a
never-reporting context out of the ruleset. **A skip is not a pass**, and the summary line says so.
So run the script locally before landing — `/review-pr` does — and read the skips.

**Cancellation is scoped to branches other than `main`.** Superseding a run is only safe where a
later commit replaces the earlier one as the thing being judged, which is true on a branch and false
on `main`, where every push is its own release and a cancelled run is not a passing one.

**One check is not optional, because its failure mode is silence: every row-level-security-protected
table has a test asserting that a cross-tenant read returns zero rows.** A misconfigured RLS policy
returns an empty result rather than an error, so it is indistinguishable from "no data" in the UI
and cannot be caught by looking. `story` is the first such table and
[`apps/web/src/db/rls.test.ts`](../../apps/web/src/db/rls.test.ts) is the shape every later one
copies; ADR-0005 rule 2 is what requires it.

**Those tests need a real PostgreSQL, and `pnpm -r test` behaves differently depending on whether
it has one.** In Actions the job runs a `postgres:17` service container and the suite always runs.
Locally it runs only when `RLS_TEST_MIGRATOR_URL` and `RLS_TEST_APP_URL` are set, and skips
otherwise — but **it fails outright rather than skipping when `CI` is set**, because a skipped
cross-tenant read test reports exactly what a broken policy reports. To run them on a laptop, point
those two at any PostgreSQL that has had [`apps/web/src/db/roles.sql`](../../apps/web/src/db/roles.sql)
applied to it.

**The Playwright suite is not one of the four.** It drives a *deployed* URL rather than a build, so
there is nothing for it to talk to inside a CI job that has deployed nothing. Run it against
whatever a change is meant to have changed:

```bash
CANONCORE_E2E_BASE_URL=<preview url> pnpm --filter @canoncore/web test:e2e
```

Without that variable it runs against production, which is a check on a deploy that has already
happened — *After the merge* below, not a gate.

**The gate is GitHub's copy of those checks, not yours.** A local run proves the code works on the
machine that wrote it; Actions proves it works on a fresh one, which is the failure a solo repo has
no other way to see. So the green `/review-pr` acts on has to belong to the commit it is about to
land, which is what `--match-head-commit` enforces.

**Waiting is not a one-liner**, because `gh` cannot tell *CI has not registered yet* from *CI
failed*, and neither of those from *finished, and its record never closed*
([incident](../incidents.md#a-check-run-finished-and-its-record-never-closed)). `/review-pr` owns
that wait and carries the commands.

**A deployed preview works.** The value of a preview is that it is a real environment rather than a
smoke screen, so a preview must point at its own Neon branch rather than at production's data.

## What `main` refuses

The gates are a wait, and a wait is a step that can be skipped — which is what CAN-40 fixed, by
moving the last word from the skill to the repository. A waiting skill is a convention and a ruleset
is an enforcement, and only the second survives the skill being edited, skipped or run by something
else. The provisioned form is in [`docs/infrastructure.md`](../infrastructure.md) → *The repository,
and what `main` refuses*, because it is repository configuration and no file here can assert it.
What belongs here is what it means for the loop:

- **Squash is no longer a convention.** Merge commits and rebase merges are off, and
  `required_linear_history` refuses a merge commit reaching `main` by any other route.
- **The remote branch deletes itself on merge**, so a delete step is a confirmation rather than an
  action. Read its output, never its exit code.
- **Never pass `--admin` to `gh pr merge`.** There is no bypass actor to use it, so the flag cannot
  work — but reaching for it is what an agent does when a merge is refused, and an agent that got it
  working would have removed the guard rather than passed it.
- **A refused merge is a stop, not a retry.** `gh pr view <n> --json mergeStateStatus,mergeable`
  says whether GitHub will take it, which is a better question than what the merge command printed.
  If it refuses, the wait ended somewhere it should not have; find out where.

**The wait does not become redundant.** The ruleset refuses; it does not wait, and it does not
report. Without the wait, `/review-pr` reaches the merge while CI is still queued, is refused, and
has to work out from a rejection whether the branch is broken or simply early. The wait is how the
landing succeeds; the ruleset is what happens when the wait was skipped.

## What a merge carries

**Drizzle migrations run in Actions, before the production deploy is promoted**, so a schema change
that fails stops the release rather than shipping code against a database that never moved. Since
CAN-23 that is enforced rather than intended: [`apps/web/vercel.json`](../../apps/web/vercel.json)
turns Vercel's Git integration off for `main` alone, and the job migrates, then builds, then
deploys. Nothing weaker would do — a push starts a Vercel build immediately, so leaving the
integration on would mean a migration racing a deploy it cannot see.

**Previews still deploy from Git and are not migrated.** A preview branch is a copy of Neon's
`main` taken when the deployment starts, so it carries whatever schema `main` had *then*. A branch
whose code reads a table its migration has not yet put on `main` will therefore 500 in preview and
work in production, and the fix is the one below: land the widening first.

Any other out-of-band artefact — a scheduled job, a queue, a permission,
an environment variable — is hand-run and must be named in the PR body.

Answer this for each new **kind** of artefact before the first change that needs it, not after, and
add it here ([incident](../incidents.md#waveger-the-build-ran-no-migrations-and-nobody-knew)).

**A change that only works in one deploy order is a change to rewrite**, not a window to reason
about: widen first so old and new code both work, move the data, then narrow in a *later* change
once only new code is live. File the narrowing as its own ticket before the widening lands — the
widening is not the risk, forgetting to remove it is. Purely additive changes are unaffected and
still land in one go.

**Anything the tests structurally cannot see** goes here as it appears, and prefer making each one
an executable check over leaving it as prose — a rule that lives only in prose is one nobody
re-reads at the moment it is broken. `scripts/check-docs.ts` is the first of those.

## After the merge

- **Verify what the ticket promised, in the deployed environment.** Not optional, and not something
  a test suite can do: anything living in project settings or platform state — cron registration,
  environment variables, function configuration — cannot be asserted by a file in the repo. A green
  suite says the code is right. It says nothing about whether the platform is doing what the ticket
  said it would.
- **Close out Linear.** Status to `Done`, and a comment saying what shipped and what to expect next,
  not a summary of the diff — the PR is the diff. `issue-tracker.md` has the commands and the write
  ordering the sync forces.
- **Read the status before setting it.** The GitHub integration moves the issue as the PR opens and
  merges, so it is usually `Done` already. Setting it anyway is harmless; *reporting* it as the
  thing that closed the issue is not, because it credits the agent with work the sync did.
- **A landed issue carries no triage state role**, which is correct rather than an oversight —
  `triage-labels.md` has the reasoning.
- **Anything found on the way** becomes its own Linear issue, not a late commit on a branch that is
  about to merge.
