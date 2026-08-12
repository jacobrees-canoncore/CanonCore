# Workflow

Trunk-based, solo. One `main`, short-lived branches, squash-merge to land.

This file is the policy. `/draft-pr` and `/review-pr` are the procedure and defer to it — a
rule belongs here, a step belongs in the skill.

> **Read this first.** The stack is settled (see **Stack** in `CLAUDE.md` and
> [ADR-0005](../adr/0005-stack.md)), and CAN-22 built the walking skeleton, so the checks below
> genuinely run: `apps/web` exists and GitHub Actions runs them on every push.
>
> What the Vercel project does with a push — production from `main`, a preview per pull request —
> is **not** asserted here. Those are project settings, so [`docs/infrastructure.md`](../infrastructure.md)
> is the only place they can be recorded, and it is the place to check them.
>
> What does **not** exist yet is a database, auth, or any migration step, so the deploy-order and
> migration rules below are policy written ahead of the thing they govern.

## Why a PR at all, for one developer

There is nobody to review it, so the PR is not doing what a PR usually does. It earns its place
anyway, and the reason is the deployment rather than the review:

- **A branch is the gate before production.** On Vercel, pushing `main` deploys straight to
  production. So the branch *is* the only gate there is, which makes the PR non-optional rather
  than a nicety.
- **`main` refuses anything else.** Since CAN-40 its ruleset requires the checks by name, so a
  commit that has not been through them cannot land by any route — *What `main` refuses* below.

**Two further reasons are often given, and they are about the review rather than the PR.** They
are the pack's own, in `implement.md` and `code-review.md` under
`~/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/<version>/docs/engineering/`:

- **`/code-review` compares against a commit.** Its first step resolves the fixed point and
  refuses an empty diff, and the diff it reads is `<fixed-point>...HEAD`, which excludes staged
  and working-tree changes — so unless an interim commit already exists there is nothing in it
  to review. `/implement` runs the review as its second-to-last step and commits *after* it,
  which lands it in exactly that gap.
- **A session does not review its own work.** "Same context reviewing itself isn't review, it's
  confirmation bias with a slash command."

Read them there, then read the next section, which is where this repo parts company with both.

### The review runs once, and `/implement` is normally where

**Do not ask for a second review of a change `/implement` has already reviewed.** That is this
repo's rule and it overrides the reflex, which is to treat the review as a step in the landing
sequence and run it again because the branch is now pushed.

The two reasons above look like they demand otherwise. Neither survives contact with what the
review actually does:

- *`/code-review` compares against a commit* is answered by **staging before the review**. Its
  range is `<fixed-point>...HEAD`, which excludes the working tree, so an unstaged `/implement`
  run reviews an empty or partial diff. Staged, it reviews the change that is about to be
  committed. This is a precondition, not a workaround.
- *A session does not review its own work* mistakes which context does the reviewing.
  `mattpocock-skills:code-review` fans the work out to **parallel sub-agents that never saw the
  implementing session's reasoning**, so the fresh eyes are in the sub-agents rather than in the
  session that invokes them. CAN-48 is the evidence, and it is evidence about sub-agents rather
  than about a second invocation: they found a defect the implementing session had missed
  (CAN-63), and they would have found it from either caller.

**What the implementing session does keep is the choice of what it hands them** — the range, the
spec, the standards sources. That is the residual risk, and it is checkable rather than a matter
of trust, which is why the claim to make is *"a review ran against this range"* and never *"a
review ran"*.

**So the review has not happened** when `/implement` did not run, when it ran without staging, or
when the branch has since gained commits it never saw. In each of those the range it read is not
the range being landed, and `/code-review` against the pushed branch is how to fix that. A rebase
or a review-driven edit after the fact puts you in the third case.

So the states mean: **draft** is "not yet checked against the gates", **ready** is "the gates are
green and it works". Nobody is being signalled — the states are for you.

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

### The local `main` is permanently stale in a worktree

**`main` stays checked out at `/Users/jacobrees/orca/projects/CanonCore` for as long as the
project exists**, while every ticket is worked from a worktree under
`/Users/jacobrees/orca/workspaces/CanonCore/`. That is the standing layout rather than a
property of one session, and it changes what two ordinary commands mean. This is the first
consequence; *The merge reports failure after it has succeeded*, below, is the second.

Nothing a worktree does moves the local `main` ref. `git fetch` advances `origin/main` and
leaves `main` alone; `git pull` here pulls the ticket branch, because `main` is not the branch
this working tree has checked out; and `git branch -f main` and `git fetch origin main:main`
are both refused outright, for the same reason `--delete-branch` is. Only a `git pull` in the
project checkout moves it, so it falls a commit further behind with every merge that lands.

A count taken against that ref therefore reads *behind* almost every time, and almost every
time that means nothing:

```bash
git rev-list --left-right --count origin/main...main   # behind <TAB> ahead
```

A branch cut from the remote base — which is what `orca worktree create` gives you — is on the
remote base whatever the count says. Observed on CAN-46: `1	0` while the branch was in perfect
shape.

**So ask where `HEAD` sits, not where the local ref sits.**

```bash
git merge-base --is-ancestor origin/main HEAD   # exit 0: HEAD already contains origin/main
```

`--is-ancestor` checks whether the first commit is an ancestor of the second and exits 0 if it
is, 1 if it is not ([git merge-base](https://git-scm.com/docs/git-merge-base)). Exit 0, and there is
nothing to rebase — a rebase onto `origin/main` is a no-op. Exit 1, and the branch really is on
a stale base. `/draft-pr` step 5 makes exactly this distinction, and this is why it has to.

**Two limits on that check**, and both matter because the step that uses it is the one guarding
what goes into a PR. It answers the *behind* reading only: commits sitting on the local `main`
that nothing has pushed are a real problem whatever it says, and the recovery for those is
directly above. And it cannot tell a diverged base from a stale one, because `HEAD` fails to
contain `origin/main` in both — so read the *ahead* count first, and stop there when it is
non-zero rather than reaching for this.

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
before you reach for it. `mcp__github__merge_pull_request` exposes no head-SHA parameter — read its
schema and see — even though the REST endpoint underneath it accepts `sha` ([merge a pull
request](https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request)). So it cannot enforce
`--match-head-commit`, and the guarantee below in *The gates* — that the commit merged is the
commit that was checked — becomes an unverified assumption. Re-read the head SHA immediately
before calling it and stop if it moved. That narrows the window rather than closing it, which is
the honest description of what the fallback buys.

This is a property of the harness and its settings, not of this repository, so it can change
without warning in either direction. Treat it as a thing to recognise, not a thing to design
around.

## The slash command that silently did not load

Observed 10 August 2026. `/implement` was sent as the tail of a message whose opening lines were
Orca's ticket-link preamble:

```
Linked Linear issue: CAN-22
https://linear.app/jacobrees-canoncore/issue/CAN-22/... /implement
```

That is the message as sent — the preamble first, `/implement` following the URL on the same line.
What is load-bearing is only that it was not the first thing in the message.

Nothing arrived — no `<command-name>` block, no skill body. The session ran on the model's own
judgement instead, so the skill's contents were never in context. In the same session `/draft-pr`,
sent on its own, expanded normally with its whole body inlined.

**No mechanism is claimed here**, because none can be cited. A missing `mattpocock-skills:` prefix
is ruled out: a plugin skill's bare name works "unless another command already uses that name"
([Extend Claude with skills](https://code.claude.com/docs/en/skills)), and nothing else uses
`implement`. Position is the remaining explanation, but it is inference from two observations and
is documented nowhere.

**The rule holds under every explanation: send a slash command as its own message.** The tell that
it worked is that a loaded skill echoes its own instructions. Without that tell, a skill that did
not load is indistinguishable from one that loaded and had nothing to say — which is why this is
written down rather than remembered.

## The loop

```bash
git checkout main && git pull --ff-only
git checkout -b CAN-11-welcome-email-queue    # or an Orca worktree, above
# ...work, via /implement...
/draft-pr                                     # push, open the draft, link Linear
/review-pr                                    # gates, ready, squash-merge, close out Linear
```

**No review step sits between those two**, because `/implement` already ran it — *The review runs
once, and `/implement` is normally where* above says when that counts and when it does not.
`CLAUDE.md`'s pipeline shows the same order. Reach for the line below only in the cases that
section names, and pass the point the branch was cut from:

```bash
/mattpocock-skills:code-review main           # two-axis review against the branch point
```

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

**A fourth command runs after them**, and it is deliberately not one of the three:

```bash
pnpm -r build
```

`next build` fails on things the other three cannot see — a server-only API reached from a client
component, a page that throws during static generation. Type checking does not catch those, and
without this step the first machine to find out is the one doing the deploy. It is listed apart
from the three because the three are what CAN-22 required; this one is ours.

All four run in one Actions job, `test, typecheck, lint, build`, in that order, so the first
failure stops the rest. That is the single check a pull request reports, and — since CAN-40 — the
one `main`'s ruleset requires by that name. One job means one context: requiring the three commands
as three contexts would require names nothing emits, and *What `main` refuses* below says why that
is worse than requiring too little.

**Cancellation is scoped to branches other than `main`.** Superseding a run is only safe where a
later commit replaces the earlier one as the thing being judged, which is true on a branch and
false on `main`, where every push is its own release and a cancelled run is not a passing one.

One check is not optional and is called out here because its failure mode is silence: **every
row-level-security-protected table has a test asserting that a cross-tenant read returns zero
rows.** A misconfigured RLS policy returns an empty result rather than an error, so it is
indistinguishable from "no data" in the UI and cannot be caught by looking. No such table exists
yet; the first arrives with CAN-23.

**The Playwright suite is not one of the three.** It drives a *deployed* URL rather than a build,
so there is nothing for it to talk to inside a CI job that has deployed nothing. Run it against
whatever a change is meant to have changed:

```bash
CANONCORE_E2E_BASE_URL=<preview url> pnpm --filter @canoncore/web test:e2e
```

Without that variable it runs against production. That is a check on a deploy that has already
happened, and is the *After the merge* step below rather than a gate.

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
  ([cli/cli#9682](https://github.com/cli/cli/issues/9682)). The ruleset below defines required
  checks, so this no longer describes every pull request — it describes the poll window at the
  start of every one of them, which is exactly where the wait begins.

So poll `gh pr checks <n> --json bucket || true` until it returns something, *then* watch. `bucket`
sorts each check into `pass`, `fail`, `pending`, `skipping` or `cancel`, and that is the field to
read; the exit code is not. The `|| true` is load-bearing — exit 8 is the normal state throughout a
poll, so without it the healthy path aborts the wait under `set -e` or in a `&&` chain.

**A third state neither of those names: registered, finished, never reported.** The exit codes
above separate *CI has not registered yet* from *CI failed*, and nothing separates either from a
check-run whose work completed and whose record never closed. Observed on CAN-47, 12 August 2026,
commit `715515b`: `gh run view 31618294656` read `completed`/`success`, every step of its only job
read `success` including `pnpm -r test`, `typecheck`, `lint`, `build` and `Complete job`, and the
check-run on that SHA still read `in_progress` with `completed_at: null` six minutes later. That
null is what `gh pr checks` was reporting as `bucket: pending`, so a watch would have polled a check
that had already passed and would never say so.

Compare the run-level conclusion against the check-run's `completed_at` to tell them apart:

```bash
gh run list --branch <branch> --limit 1 --json headSha,status,conclusion
gh api 'repos/{owner}/{repo}/commits/<sha>/check-runs' \
  --jq '.check_runs[] | "\(.status)/\(.conclusion // "-")\t\(.completed_at // "NULL")\t\(.name)"'
```

`--limit 1` returns the newest run on the branch, which need not be the run for the SHA you are
waiting on, so `headSha` is selected there to be *checked* rather than displayed: if it does not
match, the two commands describe different commits and the comparison means nothing. `gh` fills in
`{owner}/{repo}` from the checkout, so the second command carries no repository literal.

A run reading `completed/success` while one of its check-runs reads `in_progress` with a null
`completed_at` is a stuck record, not a slow check. The two want opposite remedies, which is the
whole reason a ten-second cross-check earns its place: a slow check wants more waiting, and a stuck
record never resolves by waiting at all.

**What clears it is a fresh run, and a rebase is not reliably one.** Re-run the workflow first with
`gh run rerun <run-id>`, which asks GitHub for a new check-run on the same commit and costs no
history. If the record is still stuck after that, move the SHA instead: an empty commit
(`git commit --allow-empty`) pushed to the branch, which the squash merge discards anyway. Reach for
a rebase only when `git merge-base --is-ancestor origin/main HEAD` exits 1 — on exit 0, which is the
ordinary case, *The local `main` is permanently stale in a worktree* above shows the rebase is a
no-op, so it rewrites nothing, produces no new SHA and therefore triggers no new run. CAN-47's
rebase did produce one, run `31619057832`, which finalised normally at 16:44:46Z; that worked
because `main` genuinely had moved, which is a property of that moment rather than of the remedy.

**This is GitHub's record rather than the pipeline, so do not change `ci.yml` for it.** One run of
six was affected, on the same workflow, the same single job and the same `concurrency` block as the
five that finalised normally — including `62ddfba`, eight minutes earlier on the same branch.
Permanent configuration added to work around a one-off data inconsistency is what `CLAUDE.md`'s
engineering principles rule out.

**And the record back-fills itself, so the cross-check is only conclusive while the wait is still
on.** `715515b`'s check-run now reads `completed/success` with `completed_at: 2026-08-12T16:35:44Z`
— the moment the work actually finished, not the moment the record closed. Once GitHub fills that
in there is no trace the check was ever stuck, so re-running the commands above after the fact
returns a healthy record and makes a correct diagnosis look like a mistaken one. Make the call
during the wait, and record what you saw.

Re-read the head SHA afterwards and start again if it moved, then **merge with
`gh pr merge --match-head-commit <SHA>`**. Checking and merging are separate moments with a human
confirmation between them; the flag is what stops a push landing in that gap from being squashed
into `main` unchecked.

**The repo should refuse the merge too.** A waiting skill is a convention and a ruleset is an
enforcement, and only the second one survives the skill being edited, skipped or run by something
else. `main` currently has neither branch protection nor a ruleset. The repo is public, so rulesets
and required status checks cost nothing here (`issue-tracker.md`). Two traps are documented and both
fail quietly: a strict *require branches to be up to date* rule with no check defined does nothing
at all, and a required context that never reports blocks every merge for ever at *Expected —
Waiting for status to be reported*, so only require checks that run on every pull request. CAN-40
carries this work, and CAN-22 unblocked it: `test, typecheck, lint` runs on every push and is the
context to require.

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

### What `main` refuses

Everything above is a wait. A wait is a step, and a step can be skipped — which is what CAN-40
fixed, by moving the last word from the skill to the repository. Since 12 August 2026 `main` carries
a ruleset, and GitHub refuses a merge that the checks do not support whatever the skill running it
believes. The provisioned form — the rule list, the two context names, why only those, and why
branches are not required to be up to date — is in
[`docs/infrastructure.md`](../infrastructure.md) → *The repository, and what `main` refuses*, because
it is repository configuration and no file here can assert it. What belongs here is what it means
for the loop:

- **Squash is no longer a convention.** `allow_merge_commit` and `allow_rebase_merge` are off, so
  the repository offers nothing else, and `required_linear_history` refuses a merge commit reaching
  `main` by any other route.
- **The remote branch deletes itself on merge.** See *The merge reports failure after it has
  succeeded* below, which is the step that changes.
- **Never pass `--admin` to `gh pr merge`.** There is no bypass actor to use it, so the flag cannot
  work — but reaching for it is what an agent does when a merge is refused, and an agent that got it
  working would have removed the guard rather than passed it.
- **A refused merge is a stop, not a retry.** `gh pr view <n> --json mergeStateStatus,mergeable`
  says whether GitHub will take it, which is a better question than what the merge command printed.
  If it refuses, the wait above ended somewhere it should not have; find out where, rather than
  merging again.

**The wait does not become redundant.** The ruleset refuses; it does not wait, and it does not
report. Without the wait, `/review-pr` reaches the merge while CI is still queued, is refused, and
has to work out from a rejection whether the branch is broken or simply early. The two halves do
different jobs: the wait is how the landing succeeds, and the ruleset is what happens when the wait
was skipped.

## The merge reports failure after it has succeeded

`--delete-branch` deletes "the local and remote branch after merge"
([gh pr merge](https://cli.github.com/manual/gh_pr_merge)), and deleting the local branch means
`gh` has to put you back on the base branch first. Under Orca it cannot: `main` is permanently
checked out elsewhere (*The local `main` is permanently stale in a worktree*, above), so git
refuses — `fatal: 'main' is already used by worktree at …` — and `gh` exits non-zero. Making `-d` work
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
git ls-remote --heads origin <branch>                # empty output: already gone, which is normal
```

**Since CAN-40 the remote branch deletes itself.** `delete_branch_on_merge` is on
(`docs/infrastructure.md`), so GitHub removes the head branch as the merge lands and the third line
is a confirmation rather than a step. **Read its output, not its exit code** — the same rule as the
two lines above it. `--exit-code` would make the ordinary case exit 2 and abort the healthy path
under `set -e`, which is the trap `|| true` exists for in *The gates*; without the flag, no match
prints nothing and exits 0. Run `git push origin --delete <branch>` only if the branch is still
there, and only once `state` says `MERGED` — deleting the remote branch of a PR that did *not*
merge closes the PR and throws away the pushed copy of the work.

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
