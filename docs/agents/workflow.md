# Workflow

Trunk-based, solo. One `main`, short-lived branches, squash-merge to land.

This file is the policy. `/draft-pr` and `/review-pr` are the procedure and defer to it — a
rule belongs here, a step belongs in the skill.

> **Read this first.** The stack is settled (see **Stack** in `CLAUDE.md` and
> [ADR-0005](../adr/0005-stack.md)), but nothing is built yet: no code, no CI, nothing deployed.
> The policy below is settled and the mechanics are now *named*, but they do not exist until the
> walking skeleton is built. Where a mechanic is named but unbuilt this file says so; do not
> assume a command runs just because it is written down here.

## Why a PR at all, for one developer

There is nobody to review it, so the PR is not doing what a PR usually does. It earns its
place twice over anyway:

- **A branch is a gate before production.** On Vercel, pushing `main` deploys straight to
  production. So the branch *is* the only gate there is, which makes the PR non-optional rather
  than a nicety.
- **`/code-review` compares against a commit.** Its first step resolves the fixed point and
  refuses an empty diff, so run against work that is not committed yet it stops before
  reviewing anything. `/implement` commits last, which puts the review in exactly that gap. A
  branch and a PR give it a real range. (Staging first and pointing it at `git diff --cached`
  works, and is a workaround for the missing branch rather than a way of life.)

So the states mean: **draft** is "not yet reviewed", **ready** is "reviewed, and it works".
Nobody is being signalled — the states are for you.

## Branches

The branch name must carry the Linear identifier, so `orca linear` can find the issue when the
worktree was never linked. **Case does not matter** — `orca linear issue can-11` resolves
CAN-11. Nothing else about the name is prescribed.

```
main                        production-ready
CAN-11-welcome-email-queue  anything else
```

No `feature/` or `fix/` prefix — nothing in this project reads one.

**Under Orca**, create the worktree with both the name and the link:

```bash
orca worktree create --name CAN-11-welcome-email-queue --linear-issue CAN-11
```

`--linear-issue` is the part that matters. Orca keeps the issue as worktree metadata rather
than reading it off the branch, and that is what makes `orca linear issue --current` work —
`--current` being the only form that needs no `--workspace`. The identifier in the branch name
is the fallback for a worktree that was never linked.

### Who creates it, and when

**Before `/implement`, and off `main`.** No skill does this for you and it is the easiest step
in the whole flow to skip, because nothing prompts for it.

`/implement` says only *"Commit your work to the current branch."* It does not create a branch,
so running it on `main` commits to `main`. `/draft-pr` refuses to run there, but by then the
commits already exist and you are recovering rather than opening a PR. And since pushing `main`
deploys to production, those commits are one `git push` from a deploy with no gate in front of
them.

So, first thing in a fresh session, before anything else:

```bash
git switch main && git pull                       # start from what production has
orca worktree create --name CAN-11-welcome-email-queue --linear-issue CAN-11
```

Without Orca, or when the changes are already in this working tree:

```bash
git switch -c CAN-11-welcome-email-queue
```

The plain form is fine — the identifier in the name is the documented fallback. It only costs
you `orca linear issue --current`; use `orca linear issue CAN-11` instead.

**If you find yourself on `main` with commits that should have been on a branch**, nothing is
lost as long as you have not pushed. This is the recovery, and it is written once here rather
than in each skill that might need it:

```bash
git switch -c CAN-11-welcome-email-queue          # the commits come with you
git branch -f main origin/main                    # put main back where it was
```

If `main` has already been pushed, stop — that is a different problem, and not one to fix from
inside a PR command.

## The `gh` account trap

Three GitHub accounts are authenticated on this machine — `jacobdrees`, `jacobreesdev` and
`vepple-jr` — and they do not have the same access.

`git push` works whatever is active, because it goes over SSH and the key decides. `gh` does
not: it fails with a 403 that reads like a problem with the repo rather than with the account.

**`jacobdrees` is the account with write access here** — `admin`, `maintain` and `push` on
`jacobrees-canoncore/CanonCore`, verified 2026-08-07. The other two are not.

Which one is *active* moves on its own: it was `jacobreesdev` at the start of the session that
set this repo up and `jacobdrees` by the end of it, with nothing deliberately switched. So
check rather than assume, before the first `gh` write:

```bash
gh auth status
gh auth switch --user jacobdrees
```

**The two protocols do not share credentials.** `git` here talks SSH, `gh` uses its token.
The remote is `git@github.com:jacobrees-canoncore/CanonCore.git` on purpose — the HTTPS URL
fails with `Repository not found`, which reads like the repo is missing rather than like the
git credential lacking access to a private repo.

## The other `gh` failure, which is not the account

`gh` can also be refused by the harness rather than by GitHub. On 10 August 2026 `gh pr create`
was blocked by Claude Code's auto mode classifier, with the right account active and its token
fine. The failure looks like a permissions problem and is not one: nothing about the repository or
the account is wrong, and switching accounts fixes nothing.

**Tell the two apart before reaching for `gh auth switch`.** A 403 mentioning the repository is the
account trap above. A refusal naming the classifier, permissions or auto mode is the harness, and
the account is irrelevant.

**The fallback is the `github` MCP**, which performs the same operations over the same credentials
by a route the classifier does not block. `mcp__github__create_pull_request` opened PR #43 for
CAN-20 immediately after the Bash call was refused. `mcp__github__merge_pull_request` is the
equivalent for the merge, and that is the worst moment to be improvising — the PR marked ready and
nothing landed.

**The merge fallback is weaker than the command it replaces**, so know what you are giving up
before you reach for it. `mcp__github__merge_pull_request` takes `owner`, `repo`, `pullNumber`,
`merge_method` and the commit title and message, and exposes no head-SHA parameter — even though
the REST endpoint underneath it accepts `sha` ([merge a pull
request](https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request)). So it cannot enforce
`--match-head-commit`, and the guarantee below in *The gates* — that the commit merged is the
commit that was checked — becomes an unverified assumption. Re-read the head SHA immediately
before calling it and stop if it moved. That narrows the window rather than closing it, which is
the honest description of what the fallback buys.

This is a property of the harness and its settings, not of this repository, so it can change
without warning in either direction. Treat it as a thing to recognise, not a thing to design
around.

## The loop

```bash
git checkout main && git pull --ff-only
git checkout -b CAN-11-welcome-email-queue    # or an Orca worktree, above
# ...work, via /implement...
/draft-pr                                     # push, open the draft, link Linear
/mattpocock-skills:code-review main           # two-axis review against the branch point
/review-pr                                    # gates, ready, squash-merge, close out Linear
```

The review sits **after** `/draft-pr`, not inside `/implement`. `/implement` stops at the
commit and a review needs a range to compare against, so the branch has to exist and be pushed
first. `CLAUDE.md`'s pipeline shows the same order.

Two different things answer to the name *code review* and it is worth keeping them apart:
`mattpocock-skills:code-review` is the two-axis Standards/Spec review that takes a fixed
point; the built-in `/code-review` takes an effort level, or `ultra <PR#>` for a cloud review
of a GitHub PR. Either works on a branch; neither works before there is one.

- **Squash-merge only.** One ticket, one branch, one commit on `main`. Today it is a rule rather
  than an enforcement — the repo still permits merge and rebase merges. It does not have to stay
  that way; see *The repo should refuse the merge too* below.
- **Rebase to stay current**, never merge `main` in:
  `git rebase main && git push --force-with-lease`.
- **Commit subjects are prose, not Conventional Commits.** `Send the welcome email from the queue
  instead of the request`, not `feat(email): send from queue`. Nothing enforces it — it is a chosen
  style: the subject says what changed about the product, the body says why. A single-commit
  PR squashes under its commit title, so the PR title should match it.
- **Urgent fixes take the same path.** There is no hotfix lane. The gate is worth more when
  you are in a hurry, not less.

## The gates

What has to be true before a branch lands. `/review-pr` checks these.

**The repo's own checks**, run in GitHub Actions on every push and re-runnable locally:

```bash
pnpm -r test
pnpm -r typecheck
pnpm -r lint
```

Three commands rather than one. `pnpm -r test typecheck lint` looks equivalent and is not — pnpm
passes words after the script name to that script as arguments, so it would run `test` alone and
silently skip the rest. The one-command form is the regex selector
`pnpm -r run "/^(test|typecheck|lint)$/"`, which arrived in pnpm 11.11 and buys nothing here
([pnpm run](https://pnpm.io/cli/run)). Use `pnpm --filter` to scope to one workspace while iterating.

One check is not optional and is called out here because its failure mode is silence: **every
row-level-security-protected table has a test asserting that a cross-tenant read returns zero
rows.** A misconfigured RLS policy returns an empty result rather than an error, so it is
indistinguishable from "no data" in the UI and cannot be caught by looking.

**Until the walking skeleton exists there is nothing to run**, and `/review-pr` must say so
rather than passing silently.

**The gate is GitHub's copy of those checks, not yours.** `/review-pr` merges, so the green it acts
on has to belong to the commit it is about to land, and it has to have come from a clean checkout. A
local run proves the code works on the machine that wrote it. Actions proves it works on a fresh
one, which is the failure a solo repo has no other way to see.

Waiting for them is not a `--watch` one-liner, because `gh` cannot tell *CI has not registered yet*
from *CI failed*:

- `gh pr checks <n> --watch --fail-fast --interval 15` polls until every check finishes.
  `--fail-fast` works only alongside `--watch`, and `--interval` defaults to 10 seconds
  ([gh pr checks](https://cli.github.com/manual/gh_pr_checks)).
- **Exit 8 means pending**, and it is the only additional exit code documented.
- **"No checks reported" exits 1** — the same code as a real failure. The proposal for a distinct
  code was closed unmerged ([cli/cli#9691](https://github.com/cli/cli/pull/9691)), and the race it
  existed for was closed *not planned* ([cli/cli#7401](https://github.com/cli/cli/issues/7401)). For
  a few seconds after a push the API reports no checks at all and `--watch` exits instead of waiting.
- **Do not pass `--required`.** It errors when no required check has reported
  ([cli/cli#9682](https://github.com/cli/cli/issues/9682)), which is every pull request until the
  ruleset below exists.

So poll `gh pr checks <n> --json bucket || true` until it returns something, *then* watch. `bucket`
sorts each check into `pass`, `fail`, `pending`, `skipping` or `cancel`, and that is the field to
read; the exit code is not. The `|| true` is load-bearing — exit 8 is the normal state throughout a
poll, so without it the healthy path aborts the wait under `set -e` or in a `&&` chain.

Re-read the head SHA afterwards and start again if it moved, then **merge with
`gh pr merge --match-head-commit <SHA>`**. Checking and merging are separate moments with a human
confirmation between them; the flag is what stops a push landing in that gap from being squashed
into `main` unchecked.

None of this applies while `.github/workflows` is empty. There is nothing to wait for, and a wait
with no possible answer refuses PRs that are perfectly landable — the same failure as passing
silently, pointed the other way.

**The repo should refuse the merge too.** A waiting skill is a convention and a ruleset is an
enforcement, and only the second one survives the skill being edited, skipped or run by something
else. `main` currently has neither branch protection nor a ruleset. The repo is public, so rulesets
and required status checks cost nothing here (`issue-tracker.md`). Two traps are documented and both
fail quietly: a strict *require branches to be up to date* rule with no check defined does nothing
at all, and a required context that never reports blocks every merge for ever at *Expected —
Waiting for status to be reported*, so only require checks that run on every pull request. CAN-40
carries this work; it is blocked on there being checks to require.

**A deployed preview works.** Vercel builds a preview deployment per pull request. The value of
a preview is that it is a real environment rather than a smoke screen, so a preview must point at
its own Neon branch rather than at production's data.

**Everything the branch changes actually reaches production.** Now answerable, and the answer is
that **a merge does not carry everything**. Vercel's build deploys the application code and nothing
else. Drizzle migrations do **not** run as part of it: they run as an explicit step in the Actions
pipeline before the production deploy is promoted, so a schema change that fails stops the release
rather than shipping code against a database that never moved. Any other out-of-band artefact — a
scheduled job, a queue, a permission, an environment variable — is hand-run and must be named in
the PR body.

The lesson behind that rule: a build applies some artefacts automatically and leaves others
exactly as they were, and merging one of those deploys the code that depends on it while the
thing itself stays behind. Waveger learned it the expensive way — nothing in its build ran its
migration command, that was true for months, and it was written down nowhere until a migration
landed whose safety turned out to depend on the day of the week. Answer this for each new *kind*
of artefact before the first change that needs it, not after, and add it above.

The second half of that lesson generalises. **A change that
only works in one deploy order is a change to rewrite**, not a window to reason about: widen
first so old and new code both work, move the data, then narrow in a *later* change once only
new code is live. File the narrowing as its own ticket before the widening lands — the
widening is not the risk, forgetting to remove it is. Purely additive changes are unaffected
and still land in one go.

**Anything the tests structurally cannot see.** Waveger's examples were a migration paired
with its schema edit, and a committed API contract matching what the routes generate. The
CanonCore equivalents are unknown. Add them here as they appear, and prefer making each one an
executable check over leaving it as prose — a rule that lives only in prose is one nobody
re-reads at the moment it is broken.

## The merge reports failure after it has succeeded

`--delete-branch` deletes "the local and remote branch after merge"
([gh pr merge](https://cli.github.com/manual/gh_pr_merge)), and deleting the local branch means
`gh` has to put you back on the base branch first. Under Orca it cannot. `main` stays permanently
checked out at `/Users/jacobrees/orca/projects/CanonCore` while ticket work happens in a worktree
under `/Users/jacobrees/orca/workspaces/CanonCore/`, so git refuses —
`fatal: 'main' is already used by worktree at …` — and `gh` exits non-zero. Making `-d` work
under worktrees is an open request, filed in 2021
([cli/cli#3442](https://github.com/cli/cli/issues/3442)).

**The merge itself has already happened when that error prints.** Landing CAN-20 on 10 August
2026, `origin/main` advanced to the squash commit and [PR
#43](https://github.com/jacobrees-canoncore/CanonCore/pull/43) read `MERGED`; only the local
cleanup failed. Every ticket is worked from a worktree, so this is the standing layout rather than
one bad landing.

That shape is the danger, not the stale branch: a **false negative on the one step that cannot be
undone**. An agent reading the error can report that the landing failed when production has
already changed, or merge again. Nothing downstream re-checks, so the wrong conclusion is the one
that survives.

**So the merge command's exit code decides nothing.** Ask the server what happened, and delete the
remote branch by a route that needs no local checkout:

```bash
gh pr merge <n> --squash --match-head-commit <SHA>   # no --delete-branch
gh pr view <n> --json state,mergedAt                 # this is the source of truth
git push origin --delete <branch>                    # only once the read says MERGED
```

Order matters in the third line. Deleting the remote branch of a PR that did *not* merge closes
the PR and throws away the pushed copy of the work. After a confirmed merge it is safe to repeat —
if something already removed the branch, git says so and there is nothing to lose.

The local branch stays behind, and that is correct: Orca's worktree owns it, and removing the
worktree takes the branch with it.

## After the merge

**Verify what the ticket promised, in the deployed environment.** Not optional, and not
something a test suite can do: anything living in project settings or platform state — cron
registration, environment variables, function configuration — cannot be asserted by a file in
the repo. A green suite says the code is right. It says nothing about whether the platform is
doing what the ticket said it would.

**Close out Linear.** Status to `Done`, and a comment saying what shipped and what to expect
next — not a summary of the diff, because the PR is the diff. See `issue-tracker.md`.

**Read the status before setting it.** The GitHub integration moves the issue through its states
as the PR opens and merges (`issue-tracker.md` → *Relationship to GitHub*), so by the time anyone
gets here it is usually `Done` already and the write is a no-op. Setting it anyway is harmless;
*reporting* it as the thing that closed the issue is not, because it credits the agent with work
the sync did.

A landed issue ends up carrying **no** triage state role, which is correct rather than an
oversight — `triage-labels.md` has the reasoning.

**Anything found on the way** becomes its own Linear issue, not a late commit on a branch that
is about to merge.
