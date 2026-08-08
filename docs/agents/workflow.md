# Workflow

Trunk-based, solo. One `main`, short-lived branches, squash-merge to land.

This file is the policy. `/draft-pr` and `/review-pr` are the procedure and defer to it — a
rule belongs here, a step belongs in the skill.

> **Read this first.** CanonCore has a remote (`jacobrees-canoncore/CanonCore`, private) and
> nothing else: no stack, no CI, nothing deployed. The policy below is settled; several of the
> *mechanics* it refers to do not exist yet. Every such place is marked **PENDING** with what
> has to be decided. Do not invent a value for one — leave it pending and say so.

## Why a PR at all, for one developer

There is nobody to review it, so the PR is not doing what a PR usually does. It earns its
place twice over anyway:

- **A branch is a gate before production.** Whether pushing `main` deploys straight to
  production is **PENDING** on the hosting decision. If it does, the branch is the only gate
  there is, and that makes the PR non-optional rather than a nicety.
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

- **Squash-merge only.** One ticket, one branch, one commit on `main`. Configure the repo to
  permit nothing else if you can; until then it is a rule, not an enforcement.
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

**The repo's own checks. PENDING — there are none yet.** Waveger's shape is
`test && typecheck && lint` run locally because it has no CI. Whether CanonCore has CI, and
what the commands are called, is settled when the stack is. Until then `/review-pr` has
nothing to run and must say so rather than passing silently.

**A deployed preview works. PENDING** on the hosting decision. The value of a preview is that
it is a real environment rather than a smoke screen; a preview sharing production's data is
worth less.

**Everything the branch changes actually reaches production. PENDING** on the hosting
decision, and it is a question to answer *before* the first change of a kind that needs it,
not after. A build applies some artefacts automatically and leaves others exactly as they
were — a schema, a queue topology, a scheduled job, a permission — and merging one of those
deploys the code that depends on it while the thing itself stays behind. Which artefacts a
merge carries, and which need a hand-run step, has to be written down here once the host is
known. Waveger learned this the expensive way: nothing in its build ran its migration
command, that was true for months, and it was written down nowhere until a migration landed
whose safety turned out to depend on the day of the week.

The second half of that lesson generalises even before the host is chosen. **A change that
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

## After the merge

**Verify what the ticket promised, in the deployed environment.** Not optional, and not
something a test suite can do: anything living in project settings or platform state — cron
registration, environment variables, function configuration — cannot be asserted by a file in
the repo. A green suite says the code is right. It says nothing about whether the platform is
doing what the ticket said it would.

**Close out Linear.** Status to `Done`, and a comment saying what shipped and what to expect
next — not a summary of the diff, because the PR is the diff. See `issue-tracker.md`.

A landed issue ends up carrying **no** triage state role, which is correct rather than an
oversight — `triage-labels.md` has the reasoning.

**Anything found on the way** becomes its own Linear issue, not a late commit on a branch that
is about to merge.
