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

> **What exists.** CAN-22 A page on a public URL, deployed, with CI built the walking skeleton
> and CAN-23 One Story from Neon, behind row-level security connected it to the database, so `apps/web` exists, a `story` table exists
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
- [When `/implement` may push, and what it must never leave behind](#when-implement-may-push-and-what-it-must-never-leave-behind)
- [The gates](#the-gates)
- [What `main` refuses](#what-main-refuses)
- [What a merge carries](#what-a-merge-carries)
- [Work that spans two repositories](#work-that-spans-two-repositories)
- [After the merge](#after-the-merge)

## Why a PR at all, for one developer

There is nobody to review it, so the PR is not doing what a PR usually does. It earns its place on
the deployment rather than the review:

- **A branch is the gate before production.** A push to `main` releases: since CAN-23 One Story from
  Neon, behind row-level security the release is the tail of the CI job rather than Vercel's own build, so the gates run first — but they run
  on a commit that is already on `main`, and a red gate leaves `main` red rather than unreleased.
  The branch is where a change can still be wrong for free.
- **`main` refuses anything else.** Since
  **CAN-40 Give main a ruleset that refuses an unchecked merge**, that ruleset requires the checks by
  name, so a commit that has not been through them cannot land by any route.

So the states mean: **draft** is "not yet checked against the gates", **ready** is "the gates are
green and it works". Nobody is being signalled — the states are for you.

## The review runs once, and `/implement` is normally where

**Do not ask for a second review over a range `/implement` has already reviewed.** That overrides the
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
`/mattpocock-skills:code-review <branch-point>` against the pushed branch. **A review-driven edit
into the third case has an end**, below. A rebase into it does not, and neither do the first two.

The middle case is the quiet one: a review of an empty range **reports no findings**, which reads
exactly like a clean review.

**The third case is the one that recurs.** Every round that finds something produces a commit the
round never saw, so read alone the list always answers *run another*, and the last fix on every
branch is unreviewed anyway. The list is not wrong — that commit *is* unreviewed. What it does not
carry is when to answer that with a round and when to answer it by declaring it. The three sections
below are the missing half, and they follow from what the list is already doing: **a review is owed
to a range, not to a stage of the process.** Running one again over a range that has not changed is
the repeat this section opens by refusing; a range that has grown by a fix commit is a different
range, which is the whole of why the third case is on the list at all.

Two different things answer to the name *code review*. `mattpocock-skills:code-review` is the
two-axis Standards/Spec review that takes a fixed point; Claude Code's bundled `/code-review` is a
bug hunt that takes an effort level. **In this repository the bare name reaches the first one** —
`.claude/skills/code-review/` owns it and forwards, which leaves the bundled one unreachable here;
its `references/rationale.md` says why.

### Two rounds, and the second is the last

**Round one is `/implement`'s own. Run a second whenever round one produced a commit. Then stop
reviewing and disclose what round two's commit is.** There is no third round.

**The count is the rule because the count is the only part of this a session can apply to its own
work without grading it.** Every alternative hands that judgement straight back: *review until a
round comes back clean* makes the author of the fixes decide which findings are real, *stop when
what is left is minor* makes it decide when its own defects do not matter. That is what happened on
**CAN-54 Fail a push that adds a known-vulnerable dependency**: the rule asked for another round and
the branch merged anyway, on the session's own reckoning that each fix had been checked another way
(`docs/incidents.md` → *A round of fixes failed the standard its own findings had named*). A rule
that hands the same reckoning back under a new name has fixed nothing.

**Round two is not a formality.** Its range is the implementation *plus* round one's fixes, and that
is where the defects turned up on CAN-54: some of round two's findings were in sentences round one
had just written (`docs/incidents.md` → *A round of fixes failed the standard its own findings had
named*).

**Stopping at two is a decision, not a finding.** No third round has run here, so nothing says what
one would have caught. The case for the number is that a loop needs an end that is not a judgement
call, and two is the smallest end that still reads the corrections. The risk left over is answered
by the two sections below, not by a claim that the branch is clean.

### A correction and a change carry different risk

Where the loop stops, what stops it has to be one kind of commit.

**A correction applies findings the round itself raised, and nothing else.** Every hunk traces to a
named finding, and the commit's own message enumerates those findings, so the correspondence is
written down rather than held in the session's head. A correction may land unreviewed, provided the
pull request discloses it.

**A finding that asks for a behaviour change is still a correction**, and the fix for a real defect
nearly always is one. What decides is not the size or the kind of the change but the correspondence:
findings beside the diff, each hunk either naming a finding or not. Same shape as *which diff command
did it run* — a question with an answer, rather than one that asks you to trust yourself.

**Anything the findings did not name is not a correction**, whatever prompted it — a better idea the
review reminded you of, a neighbouring defect noticed while fixing, a refactor that would make the
fix cleaner. Nobody has reviewed the need for it or the answer to it, which is the risk a correction
does not carry. **It comes off the branch and becomes a ticket.** It does not become round three,
and it does not become round one of a fresh loop: the two rounds belong to the branch, and a count
that can be restarted by renaming what sits on it is not a count. **The session never resets it.**

That holds even when a round rejects the implementation outright. The rewrite still traces to the
finding that asked for it, so it is a correction by the test above and lands like one — disclosed,
in front of the person `/review-pr` asks before merging. Whether a rewrite that size should land on
one round of review is their call, and putting it to them is the point of the disclosure. It is not
a call the session makes by declaring itself back at round one.

### What the pull request must disclose

The session that made an unreviewed commit is the only thing that knows it is unreviewed, and it
stops existing at the merge. So the body carries a `## Review` section — **always, whether or not
anything is unreviewed**, because a disclosure that shows up only when something is wrong cannot be
told apart from one that was forgotten. It says:

- **How many rounds ran, and against what range.** *"Both axes, twice, against `main`."* Never
  *"reviewed"* — the claim is *"a review ran against this range"*, for the reason above.
- **Which commit is unreviewed, by SHA**, and that it is the response to the last round. Say *none*
  when round two found nothing: that is this line's other answer, not a line to drop.
- **That every hunk in it traces to a finding of that round, and where those findings are written
  down** — the commit's own message, normally. It is the licence the commit lands under, so it is
  asserted and left readable rather than assumed. **The enumeration is the session's own**, so this
  narrows the residual rather than closing it: it is the same residual as the range, above, and the
  merge question is where a person can act on it.
- **What stood in for the review** — what each fix was checked against, named. On CAN-54 that was a
  primary source apiece: GitHub's OpenAPI description, a fetch of `pnpm.io/cli/audit`, `ci.yml`'s
  own `if:` conditions, and `git show 19223b0` for the step count.

`/draft-pr` writes it, and `/review-pr` repeats it in the question it asks before merging, because
the merge is the moment the disclosure is for.

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
git fetch origin                                  # refresh the ref the worktree is based on
orca worktree create --name CAN-11-welcome-email-queue \
  --linear-issue CAN-11 --base-branch origin/main
```

**Fetch, never `git switch main`.** The switch fails from inside a worktree, which is where work now
happens — `main` cannot be checked out twice, and *The local `main` is permanently stale in a
worktree* below says where it already is. Nor is the local ref what a new worktree is based on: Orca
uses `refs/remotes/origin/main`, and refreshes that ref itself only where a per-machine setting says
so, so the explicit fetch is what makes the base current wherever the recipe is run.
[`../research/orca-gaps-and-the-worktree-workflow.md`](../research/orca-gaps-and-the-worktree-workflow.md)
→ *Question two: should worktree-off-`main` be the documented default?* has both, with the commands
that checked them.

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

### Dispatching a lane, and what one starts with

**The command above opens a worktree you then go and work in. Add `--agent` and `--prompt` and it
becomes a different act: you dispatch, and leave.**

```bash
orca worktree create --name CAN-11-welcome-email-queue --linear-issue CAN-11 \
  --base-branch origin/main --agent claude --prompt "/implement"
```

That is how every lane since 16 August 2026 has been created, and **several run at once**. Nothing
inside a lane changes — it still runs `/implement`, then `/draft-pr`, then `/review-pr`, on its
own branch. What changes is that you are not in it. Four concurrent lanes are demonstrable from
the pull requests of 16 and 17 August; a fifth is claimed and cannot be proved either way from git,
because a lane leaves no trace between `worktree create` and `worktree rm`
([`../research/orca-gaps-and-the-worktree-workflow.md`](../research/orca-gaps-and-the-worktree-workflow.md)
→ *The lane era is datable, and "thirteen" is exactly right*).

Two commands are worth knowing because nothing else gives the same view. `orca worktree ps` returns
every lane in one call with its agent's `state`, `prompt`, `lastAssistantMessage` and current
`toolName`, and `orca worktree set --comment` is where to record why one is stuck — with several
running, the only cheap way to tell them apart
([`../research/orca-gaps-and-the-worktree-workflow.md`](../research/orca-gaps-and-the-worktree-workflow.md)
→ *Every Orca surface, with a verdict*).

**A lane starts with no `node_modules`.** A worktree is a fresh checkout, so nothing carries over,
and [`orca.yaml`](../../orca.yaml) at the repository root is what pays for it: `scripts.setup` runs
`pnpm install --frozen-lockfile`, the same command CI runs.

**pnpm covers most of that by itself, and the gap it leaves is one of the gates.**
`verifyDepsBeforeRun` defaults to `install`, so a missing or stale `node_modules` is installed before
the command runs — but *"the check runs on `pnpm run` and `pnpm exec` commands"*
([pnpm settings](https://pnpm.io/settings/build#verifydepsbeforerun)), and the seventh gate step
invokes `node` directly rather than through `pnpm run`, so pnpm never sees it. In an uninstalled lane
that step fails with `ERR_MODULE_NOT_FOUND` instead of installing, which is what this lane did before
`orca.yaml` existed. So the file is not only a declaration: it is what lets a fresh lane run the
gates as documented.

**Two things about the hook stop a slow first command reading as a broken lane.** Orca takes the file
from the commit, so no per-machine script or policy has to be set for it to run; and the agent
starts **concurrently** with the install rather than after it, because the policy that would make it
wait exists only per machine and cannot be committed
([`../research/orca-gaps-and-the-worktree-workflow.md`](../research/orca-gaps-and-the-worktree-workflow.md)
→ *`orca.yaml`: the complete schema, and what it cannot carry*). The concurrency is harmless for
`pnpm` commands, which is where the qualifier above matters: a second `pnpm install` waits on the
first rather than corrupting it.

**Nothing gitignored carries over either, and one day that will matter.** There is nothing worth
copying today — no `.env` file exists here — so no `.worktreeinclude` is committed. The moment
local work needs one, every lane will silently lack it and fail in a way that looks like broken
code, and that is the day to add the file.
[`../research/orca-gaps-and-the-worktree-workflow.md`](../research/orca-gaps-and-the-worktree-workflow.md)
→ *Recommendation one: commit a four-line `orca.yaml`* has both, with the probe that established
what shell the hook runs in and that it finds `pnpm` at all.

### A batch is independent in git, and coupled through the platform

**Lanes in flight together must be independent, and independence has two axes.** The first is what
made the thirteen lanes of 16 and 17 August safe. The second was learnt by getting it wrong.

**In git: always `--base-branch origin/main`.** Never base a lane on an unmerged parent branch. This
repository squash-merges only, so when the parent lands its work is rewritten into a commit whose
ancestry does not contain the child's base — the child then carries the parent's whole diff until
someone runs `git rebase --onto origin/main <old-parent-tip>`, and every review change on the parent
means doing that again against a base that has moved. The cost is not one conflict, it is a rebase
per parent revision, paid by whoever is least expecting it. When a ticket cannot start until another
lands **it waits**, and the tracker's `blocks` relation is the record of that.
[`../research/orca-gaps-and-the-worktree-workflow.md`](../research/orca-gaps-and-the-worktree-workflow.md)
→ *Question three: should a lane ever branch off something other than `main`?* has the argument, and
the six-lanes-behind-one-design-ticket case that is the worst of it.

**Orca's `--parent-worktree` is a different thing, and free.** It records lineage in Orca's own
graph and moves no git state — `orca worktree create --help`: *"`--no-parent` only affects Orca
lineage; omit `--base-branch` to use the repo default base, or pass the default base ref explicitly
for independent top-level work."* That last clause is the recipe above. Group related lanes freely.

**Through the platform: a lane that changes shared state is independent of nothing.** Six of
`check-docs`'s checks compare a document against a live source rather than against the working tree,
so their answer turns on when the run happens rather than on what the commit contains. **Where each
one gates is the table in *The gates* below, and it decides the blast radius.** Three of the six
reach CI, so a lane that provisions an environment variable, or changes `main`'s ruleset, reddens
every other lane's gate and `main`'s own release with no git relationship between them at all. The
other three gate locally only, so a lane that adds a secret, a label or a security setting reddens a
local run and nothing on a runner.

**Two rules follow, and the incident is the argument for both**
([incident](../incidents.md#a-concurrent-lane-reddened-main-and-the-merge-that-failed-had-not-caused-it)).
Sequence a lane that changes shared state, or land its roster update in the same change that
provisions the thing. And read which check failed, and against which source, before blaming a red
`main` on the last merge that landed.

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
# ...work, via /implement, which runs the review and the second round if there is one...
/draft-pr                                     # push, open the draft, link Linear
/review-pr                                    # gates, ready, squash-merge, close out Linear
```

**No review step sits between those two.** `/implement` already ran it; reach for a review only in
the three cases named above, and the third of those ends after round two.

- **Squash-merge only.** One ticket, one branch, one commit on `main`. Since
  **CAN-40 Give main a ruleset that refuses an unchecked merge**, the repository offers no other
  merge method.
- **Commit subjects are prose, not Conventional Commits.** `Send the welcome email from the queue
  instead of the request`, not `feat(email): send from queue`. Nothing enforces it — the subject
  says what changed about the product, the body says why. A single-commit PR squashes under its
  commit title, so the PR title should match it.
- **Urgent fixes take the same path.** There is no hotfix lane. The gate is worth more when you are
  in a hurry, not less.

## When `/implement` may push, and what it must never leave behind

The loop above gives the push to `/draft-pr`, and `/implement` stops at the commit. **One thing
overrides that, and only one: a fact the acceptance criteria ask for that nothing but a run on
GitHub can produce.**

Such facts exist because **the gate is GitHub's copy of those checks, not yours** — *The gates*,
below, for the general form of that, and `docs/incidents.md` → *The audit gate was proved by a
critical advisory, then reverted* for the sharper one this exception turns on, which is what a local
exit code cannot show about a step's position in the job. What follows is this: a criterion phrased
as *fails the job* is asking for a run id, and no amount of local work satisfies it. **CAN-54 Fail a
push that adds a known-vulnerable dependency** was exactly that criterion, and that entry is what
its push produced.

**Name the fact and where it will be read, before pushing.** A run id and the statuses of the steps
in it is the shape it has taken so far, and a check-run's own record is the other thing this
repository has had to read off GitHub (`docs/incidents.md` → *A check-run finished and its record
never closed*). *So the work is not lost*, *so the branch exists* and *so the gates get a head
start* are not facts of that kind. They are conveniences, and `/draft-pr` delivers all three
shortly afterwards at no cost. If the answer to *what will this push return* is not a thing you
could quote back, the push was `/draft-pr`'s.

**It is the ticket's branch, and never `main`.** Everything in *Why a PR at all, for one developer*
applies unchanged: a push to `main` runs the gates on a commit that is already there and then
releases whatever passed. An experiment is the last thing to do that with.

### A commit broken on purpose is never the head of a pushed branch

Evidence of this kind usually needs a commit that is broken deliberately — a dependency carrying a
live advisory, or a step removed to prove that what follows it depends on it. The run reports on
whatever the branch's head is, so that commit has to be pushed, and when the run finishes the branch
is still sitting on it.

**On CAN-54 Fail a push that adds a known-vulnerable dependency the branch sat there for ten hours,
across the end of a session** (`docs/incidents.md` → *The audit gate was proved by a critical
advisory, then reverted*). Nothing in the loop is scheduled to move such a commit on, which is the
general point: the next push after it is `/draft-pr`'s, nothing says when that runs, and a session
that has ended runs nothing at all.

**What that costs is not the merge.** `main`'s ruleset refuses a branch whose checks are red
whatever made them red, so nothing bad can land. It is that the branch stops being readable: a red
run on a pushed branch is how a genuine failure looks too, and nobody arriving at it can tell the
two apart without reading a commit message they have no reason to open. Anyone who checks that
branch out and installs gets the advisory with it, and anything the branch deploys — a preview, for
as long as the head is that commit — deploys the broken state.

So, in this order and in the same session:

- **Read the run and write the evidence down**, before touching the branch. That is the only thing
  the push was for, and it is the step a session with the fix in mind skips.
- **Commit the undo, and prove it before pushing it rather than after.** `git diff <the commit
  before the experiment> HEAD -- <the files it touched>` returns nothing when the reversal is
  complete. That commit is the base, not `origin/main`: a ticket that legitimately changes one of
  the same files would read as a failed undo against `main` while being perfectly undone. The two
  coincided on CAN-54 Fail a push that adds a known-vulnerable dependency, which is why that entry
  can say *"byte-identical to `main` again"*. A dependency experiment touches a manifest and a
  lockfile, and the lockfile is the half that gets forgotten — pushed unproved, an incomplete undo
  is discovered as the remote head, which is the state this whole section exists to prevent.
- **Then push it.** The undo push needs no justification of its own; it is the second half of the
  push the exception already allowed, and it is not `/draft-pr`'s to make.
- **If the run cannot be read before the session ends, the branch still does not stay there.** Put
  it back on the last good commit and force it, then run the experiment again next session. It costs
  minutes to repeat; a branch nobody can read costs whoever finds it next, and that is usually a
  session with none of this context.

  ```bash
  git reset --hard <last good commit> && git push --force-with-lease
  ```

### The run id and the commit go into the record, before the merge

**Evidence is the entire return on the push, so a run nobody wrote down makes the push pointless.**
The record is an entry in [`docs/incidents.md`](../incidents.md) — that is where an observation
lives once, and the pull request cites it rather than retelling it. What the entry owes is the run
id, the commit as a SHA, and **which of the run's outcomes the push actually proves**. Not
everything that changed behind a deliberate failure changed because of it: on CAN-54 Fail a push
that adds a known-vulnerable dependency two of the four steps that skipped after the failing one
would have skipped whatever the audit did, and that entry says which two and why. An entry claiming
the skip list whole would be claiming a run that never happened.

**Write it before the merge, because the merge takes both away.** The squash-merge puts a single
commit on `main` and the branch deletes itself, so afterwards the experiment's commit is on no
branch of this repository and its run is reachable only by the id you kept. What still serves the
commit is GitHub's retention of a pull request's own refs, which that entry records as observed on
one day rather than as a guarantee to lean on.

## The gates

What has to be true before a branch lands. **The repo's own checks**, run in GitHub Actions on every
push and re-runnable locally:

```bash
pnpm -r run test
pnpm -r run typecheck
pnpm -r run lint
pnpm -r run build
pnpm run knip
```

Three commands rather than one for the first three. `pnpm -r test typecheck lint` looks equivalent
and is not — pnpm passes words after the script name to that script as arguments, so it would run
`test` alone and silently skip the rest. The one-command form is the regex selector `pnpm -r run
"/^(test|typecheck|lint)$/"` — restored in pnpm 11.11, having first shipped in January 2023
(*attribution corrected 16 August 2026*) — and it buys nothing here
([pnpm run](https://pnpm.io/cli/run)). Use `pnpm --filter` to scope to one workspace while iterating.

**`run` is spelled out rather than left to pnpm's shorthand**, which is a change of 17 August 2026
and not a stylistic one. Knip's shell parser reads `pnpm -r typecheck` as a call to a binary named
`typecheck` and reports it as unlisted; the alternative was an `ignoreBinaries` entry per script,
which would suppress a genuinely missing binary of that name for ever. The shorthand still works —
nothing enforces the longer form except that the shorter one makes the gate below noisy.

**The fourth is deliberately not one of the three.** `next build` fails on things the others cannot
see — a server-only API reached from a client component, a page that throws during static
generation, an environment variable nobody set ([`apps/web/src/env.ts`](../../apps/web/src/env.ts))
— and without it the first machine to find out is the one doing the deploy. The three are what
**CAN-22 A page on a public URL, deployed, with CI** required; this one is ours.

**A fifth finds what is in the repository and reaches nothing**, `pnpm run knip`, added by **CAN-61 Keep
the codebase and its dependencies from silting up** — unused files, unused dependencies and unused
exports, across all four workspace members from one run at the root. It is with the four above
rather than with the two below because its verdict is a property of this commit and the lockfile:
nothing published overnight can turn it red, which is the line that separates these five from the
two whose sources are remote.

**Its baseline is clean rather than ignored, and that is the standing requirement.** A report nobody
expects to be empty is a report nobody reads, so what the first run found was fixed at the source —
three `export` keywords on things nothing outside their own module used. What `knip.jsonc` carries
is two overrides for `apps/web`, both there to reproduce what knip's own Drizzle plugin would have
derived if `drizzle.config.ts` could be loaded without a credential. That file argues for them, and
names what the second one costs: `apps/web/src/db/schema.ts` is an entry, so every export in it is
exempt rather than only the ones drizzle-kit reaches.

**It also carries one ignored binary, `orca`, which is a change of 21 August 2026 and needs
distinguishing from the case rejected above.** That one was a false positive — knip reading `pnpm -r
typecheck` as a call to a binary of that name — and a false positive is fixable at the source, which
is what spelling out `run` did. `orca` is the opposite: the report is *true*. It is the Orca desktop
app's own CLI, installed with the app, so there is no dependency to resolve it against and no version
to pin, and `scripts/check-linear-bodies.ts` runs it by name. The only way to silence that without an
entry is to stop passing the name as a literal, which is gaming the checker rather than answering it.
`knip.jsonc` argues it there.

When knip reports something new, the default is to delete what it found; an entry in that file is
the exception and owes a reason beside it.

**A sixth step audits the dependency tree**, `pnpm audit --audit-level=high`, added by **CAN-54 Fail
a push that adds a known-vulnerable dependency**. **This file owns the three decisions in that line**,
and `ci.yml` points here rather than repeating them:

- **It runs after the five**, for the reason the documents check runs after them too. An advisory
  published overnight is not a broken build, and the first failure stops the rest, so a red audit
  must not be what hides a genuine compile error from the person who caused it.
- **`high`, not the `low` default**, is a threshold rather than a preference. The `drizzle-kit`
  pinned in [`apps/web/package.json`](../../apps/web/package.json) reaches a moderate `esbuild`
  advisory, so a lower threshold would be red on arrival — and a gate that is red on arrival is a
  gate that gets ignored.
- **`--ignore-registry-errors` is deliberately not passed**, though it exists and is pitched at
  exactly this use. The flag makes the process *"exit with 0"* on a non-200 from the registry, so it
  *"will fail only if the registry actually successfully responds with found vulnerabilities"*
  ([pnpm audit](https://pnpm.io/cli/audit)); `pnpm audit --help` at 11.20.0 goes further and calls it
  *"useful when audit checks are used in CI"*. Taking it would make an unreachable registry
  indistinguishable from a clean audit, which is the silence `check-docs` spends a whole report
  avoiding. A red run that says so and can be re-run is the better failure.

**This one is a gate; Dependabot alerts are not** — they arrive after the merge, on GitHub's
schedule. What is turned on, and what each is worth, is
[`../infrastructure.md`](../infrastructure.md) → *Dependency and secret scanning*.

**Neither is Renovate, which since 17 August 2026 raises the updates and merges them itself.** It is
the one thing that reaches `main` without going through *The loop* above: no `/draft-pr`, no
`/review-pr`, so for that weekly pull request these gates are the entire review. Why that is
acceptable, and the three ways it fails quietly, is
[`../infrastructure.md`](../infrastructure.md) → *Dependency updates*.

**All of them run in one Actions job, in that order, so the first failure stops the rest.** That job
is the single check a pull request reports and one of the two contexts `main`'s ruleset requires;
[`docs/infrastructure.md`](../infrastructure.md) → *The ruleset* is the only document that names it,
and `scripts/check-docs.ts` fails the build if that name and `ci.yml` ever disagree. Requiring the
three commands as three contexts would require names nothing emits, which is worse than requiring
too little — a required context that never reports blocks every merge for ever.

**A seventh step checks the documents against the sources they describe**, `node scripts/check-docs.ts`
— the required contexts, the label roster, the variable roster, the Actions secrets, the release
token's expiry, the repository's security settings, the Provider baseline's composed context,
every cross-document pointer, and `CLAUDE.md` against its own line target. **Not all of it reaches
CI, and the difference is not an oversight:**

| Check | Where it gates | Why |
| --- | --- | --- |
| Job name, ruleset, links, pointers | CI | Local files, plus `gh` with the workflow's own token |
| The Provider baseline's composed context | CI and locally | Both halves are files here, so it can never skip. What it does not reach is the Provider rulesets requiring the composed string — `provider-tmdb`'s has existed since 21 August 2026 — because `scripts/provision-provider-repository.ts` reads those back and exits non-zero on any that has drifted, and a check here would need a roster of Provider repositories to iterate. [`../infrastructure.md`](../infrastructure.md) → *What the first real run showed* |
| Variable roster vs `vercel env ls` | CI | The runner installs `vercel` and holds a `VERCEL_TOKEN` secret. An undocumented credential is how a roster goes stale, so this one is worth a secret |
| Secret roster vs `gh secret list` | **Locally only** | The workflow's own token cannot be granted the secrets API, and every route that reaches a runner costs a credential |
| Label roster vs the tracker | **Locally only** | `orca` drives a desktop app on Jacob's machine and cannot run on a runner. A Linear credential to reach it from CI was weighed and refused |
| Security-settings roster vs the repository | **Locally only** | `security_and_analysis` comes back only to a caller with admin, and `permissions:` grants no such scope — the same wall as the secret roster. It is also what makes the other two calls' `404` an answer, so a runner reads none of the seven rather than some. [`../infrastructure.md`](../infrastructure.md) → *Dependency and secret scanning* |
| `CLAUDE.md`'s loaded lines vs its own stated target | CI and locally | The only source that is the file being gated, so it can never skip. The number is read from that file's own maintainer comment rather than written into the script, and the count excludes the block comment because that is stripped before the content is loaded |
| Release token's expiry vs `vercel tokens ls` | CI and locally | The same `VERCEL_TOKEN` as the variable roster. Listing an account's tokens is a user-level call rather than a project one, so this was recorded as unknown until a runner answered it: run `31964525778` on `6b03296` reported PASS, naming the expiry and the scope. A refused listing exits non-zero, which is a SKIP carrying whatever the CLI said rather than a failed build — reproduced on 16 August 2026 with an invalid token, `Error: Not authorized`, which is the nearest case available: the project-scoped token that would have been the real test is revoked |

A check whose source is unreachable reports **SKIP with the reason** and does not fail the build: a
transient outage must not block every merge, which is the same reasoning that keeps a
never-reporting context out of the ruleset. **A skip is not a pass**, and the summary line says so.
So run the script locally before landing — `/review-pr` does — and read the skips.

**In CI the whole report is written to the job summary**, so which checks compared and which
skipped is on the run's own page rather than only in its log. That is what stops a skip reading, from
a green tick, exactly like a pass — and the two rows above that gate locally depend on it, because a
local gate nobody is told about is no gate. Why each row is where it is:
[`../infrastructure.md`](../infrastructure.md) → *What this check compares, and what it cannot*, and
[`triage-labels.md`](triage-labels.md) → *Where this check gates, and where it does not*.

**Cancellation is scoped to branches other than `main`.** Superseding a run is only safe where a
later commit replaces the earlier one as the thing being judged, which is true on a branch and false
on `main`, where every push is its own release and a cancelled run is not a passing one.

**One check is not optional, because its failure mode is silence: every row-level-security-protected
table the application can read has a test asserting that a cross-tenant read returns zero rows.** A
misconfigured RLS policy returns an empty result rather than an error, so it is indistinguishable from
"no data" in the UI and cannot be caught by looking. `story`, `version`, `part_of`, `snapshot` and
`tombstone` are those tables today, the middle two having joined with **CAN-25 The catalogue:
Version, part of, Anchor, canonical version**, and every one of them is tested from
[`apps/web/src/db/rls.test.ts`](../../apps/web/src/db/rls.test.ts) — one file rather than one per table,
for the reason that file's own header gives and cites. ADR-0005 rule 2 is what requires it.

**Three of those five name no owner of their own**, and that is the shape to copy rather than a gap:
`version`, `part_of` and `snapshot` each ask whether the *Story* is readable and let `story`'s policy
answer, so the rule is written once and two policies cannot drift apart. `part_of` asks it of **both**
Stories an edge names, because an edge returned on the strength of one end tells its reader that the
other end exists.

**Since CAN-24 A signed-in and a signed-out path there is a second shape of answer, and it is the
stronger one.** better-auth's five tables — `user`, `session`, `account`, `verification`, `rate_limit` —
are ones `canoncore_app` is granted **nothing** on, because nothing in the application reads them. So the
test is a *refusal* rather than a zero-row read: `permission denied for table "user"` is a loud error
where an empty result is the silence rule 2 is about. **Prefer that shape wherever it is available** —
a table the application never reads should not be granted to it in order to be tested. Migration 0009
records the reasoning, including why an earlier draft did the opposite.

**The reader in either shape is `canoncore_app`, never `canoncore_auth`.** better-auth connects as a
third role which reads every row of its own five tables and has to —
[`apps/web/src/auth/auth.ts`](../../apps/web/src/auth/auth.ts) holds the argument. So the tenant question
is only ever asked of the role every page runs as, and what bounds the other role is asserted separately:
a fifth tripwire pins what `canoncore_auth` may do to **every** table, because it has no policy at all on
any of the product tables and only the absent grant refuses a write there.

**A table deliberately left unprotected still owes the gate three tripwires**, because an exclusion
nothing enforces is indistinguishable from a table somebody forgot: one asserting that every table
in `public` is classified as protected or not, one asserting the unprotected table's whole
column list, and one asserting what the application role may do to every table. `source` is the
first and the reason it is exempt is
[ADR-0014](../adr/0014-shell-providers-and-per-source-retention.md) → *Decision 6*.

**`anchor` is not tenant-scoped either, and it is a different case rather than a second `source`.** It
carries two policies, so row-level security is *on*: anyone may read an Anchor, any signed-in reader may
mint one, and nobody may change or remove one. What it owes is therefore the column-list tripwire — an
Anchor carrying no metadata is what [ADR-0003](../adr/0003-no-shared-catalogue.md) rests on, so a column
arriving there is that decision being reversed — and a test of each policy in **both** directions, which
is what a table with no cross-tenant question to ask has instead of a cross-tenant test. Its exclusion
and the reason for it are recorded in `rls.test.ts` beside the cross-tenant tests, which is where a
reviewer meets them.

**It is also the one table the application role may write to**, which is why the invariant below
excepts `anchor` by name rather than reading *writes nothing*. It is an `INSERT` and nothing else,
there and nowhere else, and migration 0011 holds the argument.

**The third is there because the first two were not enough.** Where there is no policy, the grant
is the only control, and CAN-123 Revoke the application role's write privileges, and decide whether
the blanket default privilege should exist found the application role holding INSERT, UPDATE and
DELETE on every table — from a default privilege that existed in production and in no file, so no
reading of the migrations could have shown it. A fourth test in the same file asserts that no
default privilege exists; it is not one of the three, because it guards tables nobody has created
yet rather than the unprotected one. [`docs/infrastructure.md`](../infrastructure.md) → *Roles*
records what that leaves, including the one thing those tests still cannot see.

**Those tests need a real PostgreSQL, and `pnpm -r test` behaves differently depending on whether
it has one.** In Actions the job runs a `postgres:17` service container and the suite always runs.
Locally it runs only when `RLS_TEST_MIGRATOR_URL`, `RLS_TEST_APP_URL` and `RLS_TEST_AUTH_URL` are set, and
skips otherwise — but **it fails outright rather than skipping when `CI` is set**, because a skipped
cross-tenant read test reports exactly what a broken policy reports. To run them on a laptop, point
those three at any PostgreSQL that has had [`apps/web/src/db/roles.sql`](../../apps/web/src/db/roles.sql)
applied to it:

```bash
psql "$SUPERUSER_URL" -f apps/web/src/db/roles.sql
RLS_TEST_MIGRATOR_URL=postgresql://canoncore_migrator:canoncore_migrator@localhost:5432/<db> \
RLS_TEST_APP_URL=postgresql://canoncore_app:canoncore_app@localhost:5432/<db> \
RLS_TEST_AUTH_URL=postgresql://canoncore_auth:canoncore_auth@localhost:5432/<db> \
  pnpm -r test
```

**The third arrived with CAN-24 A signed-in and a signed-out path**, and the suite refuses to run on two:
it asserts what each of the three roles may reach, so a run missing one would be asserting less than it
appears to.

**The Playwright suite is not one of the four.** It drives a *deployed* URL rather than a build, so
there is nothing for it to talk to inside a CI job that has deployed nothing. Run it against
whatever a change is meant to have changed:

```bash
CANONCORE_E2E_BASE_URL=<preview url> pnpm --filter @canoncore/web test:e2e
```

Without that variable it runs against production, which is a check on a deploy that has already
happened — *After the merge* below, not a gate.

**One spec in that suite skips unless it is given a second variable, and the skip is the safety.**
`apps/web/e2e/verification-by-inbox.spec.ts` signs up for real and reads the verification email out of
Resend's inbound store, so it needs a preview URL *and* a `full_access` Resend key in
`CANONCORE_E2E_RESEND_API_KEY` — [`../infrastructure.md`](../infrastructure.md) → *Reading the inbox*
holds the key, the two quota units a run spends, and why that credential must never become an Actions
secret. Every other spec in the suite writes nothing.

**A path that crosses a closed Provider is out of the suite's reach from a preview**, which bounds
what an end-to-end run can prove about an import. *Work that spans two repositories* below says why,
and it is a Provider deployment decision rather than anything this file can fix.

**The gate is GitHub's copy of those checks, not yours.** A local run proves the code works on the
machine that wrote it; Actions proves it works on a fresh one, which is the failure a solo repo has
no other way to see. So the green `/review-pr` acts on has to belong to the commit it is about to
land, which is what `--match-head-commit` enforces.

**Waiting is not a one-liner**, because `gh` cannot tell *CI has not registered yet* from *CI
failed*, and neither of those from *finished, and its record never closed*
([incident](../incidents.md#a-check-run-finished-and-its-record-never-closed)). `/review-pr` owns
that wait and carries the commands.

**A deployed preview works.** The value of a preview is that it is a real environment rather than a
smoke screen, so a preview must point at a database that is not production's.

**A schema change therefore has a step before the gates, not after them.** Every preview reads the
shared, schema-only `preview` Neon branch, and nothing ever copies `main` onto it, so a migration this
branch adds has to be applied to `preview` *before* the preview deploys — otherwise the preview's reads
fail, the required `Vercel` context goes red, and the pull request cannot merge.
[`../infrastructure.md`](../infrastructure.md) → *The shared preview branch* is what that branch is, and
[ADR-0023](../adr/0023-one-shared-schema-only-preview-branch.md) is why it is one branch rather than one
per deployment.

[`../../scripts/apply-migrations-ahead-of-merge.sh`](../../scripts/apply-migrations-ahead-of-merge.sh)
is that step. **A human runs it and no agent can**: it needs `canoncore_migrator`'s connection string,
which lives in the `MIGRATION_DATABASE_URL` Actions secret and cannot be read back, and Neon grants
`neondb_owner` membership in that role with `set_option = false`, so `SET ROLE` is refused — while every
table has to be owned by it, because an owner bypasses row security. The script reads the credential
with hidden input, asks separately for the `preview` branch's host, and **refuses if that host is
production's own compute** — a Neon role is project-level, so the pasted credential opens every branch
and the host is the only thing keeping the two apart.

**It applies to `preview` and reads production back without writing to it**, which is a narrowing
CAN-79 Previews clone production rows, and the integration has no switch to stop it made deliberately:
the only reason it ever wrote to `main` was that previews were cloned from it. Production is migrated by
the release and by nothing else — [ADR-0019](../adr/0019-ci-owns-the-production-release.md) — so **a
preview is now the rehearsal for that migration**, run against a faithful copy of production's schema
and read by a person before the release runs it for real.

Six invariants are checked on **both** branches, read from the repository and the database rather than
carried: no table is owned by anything else, **no schema, enum or journal object is either**, neither
application role has `BYPASSRLS`, `canoncore_app` can write nothing but `anchor`, no table without a
policy is reachable by anybody except `source`, and no default privilege exists. The second is newer
than the rest and was added because the first passed a branch that could not be migrated at all —
[`../infrastructure.md`](../infrastructure.md) → *The ownership repair of 21 August 2026* is the
account, and the short version is that a table check cannot see the schema the table is in. On `preview` it also requires the journal to match `_journal.json` exactly, and
asserts that `preview` holds **none** of production's `story` rows — a row count rather than a settings
field, because only a row count would notice the branch having been replaced by a clone. On production
the journal is allowed to lag and refused only when it is *ahead*, which would mean a migration nothing
here carries. It prints both privilege matrices for a human to compare against *Roles*, which is the one
comparison no test can make — [`../infrastructure.md`](../infrastructure.md) → *Roles* says why.

## What `main` refuses

The gates are a wait, and a wait is a step that can be skipped — which is what
**CAN-40 Give main a ruleset that refuses an unchecked merge** fixed, by moving the last word from
the skill to the repository. A waiting skill is a convention and a ruleset is an enforcement, and
only the second survives the skill being edited, skipped or run by something else. The provisioned
form is in [`docs/infrastructure.md`](../infrastructure.md) → *The repository, and what `main`
refuses*, because it is repository configuration and no file here can assert it.
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
CAN-23 One Story from Neon, behind row-level security, that ordering is enforced rather than
intended: [`apps/web/vercel.json`](../../apps/web/vercel.json) turns Vercel's Git integration off for `main`
alone, and the job migrates, then builds, then deploys. **Why this job owns the release rather than
Vercel, and why previews are deliberately left on Git, is
[ADR-0019](../adr/0019-ci-owns-the-production-release.md)** — the argument lives there and not here.

**Previews still deploy from Git and are not migrated.** Every preview reads the shared `preview`
Neon branch, which carries whatever schema somebody last applied to it. A branch whose code reads a
table its migration has not yet put on `preview` will therefore 500 in preview, and the fix is *The
gates* above: run the ahead-of-merge script before pushing.

**What that no longer means is a widening on production.** Until 17 August 2026 the same step wrote
the migration to `main`, so a schema change was briefly live on production before its code was, and
this section treated that as the one-deploy-interval widening `CLAUDE.md` → *Engineering principles*
allows. Previews no longer branch from `main`, so the write stopped and the widening with it —
production takes a migration only from the release, on a commit that passed the gates
([ADR-0023](../adr/0023-one-shared-schema-only-preview-branch.md)).

Any other out-of-band artefact — a scheduled job, a queue, a permission,
an environment variable — is hand-run and must be named in the PR body.

Answer this for each new **kind** of artefact before the first change that needs it, not after, and
add it here ([incident](../incidents.md#waveger-the-build-ran-no-migrations-and-nobody-knew)). The
decisions of 15 August 2026 bring one new kind, and sharpen the check on a kind the rule above
already covers:

**A separately deployed service carries nothing.** A merge to `main` here moves `apps/web` and
nothing else, whatever the ticket said, because a Provider is a deployment of its own. A change
needing both is two merges in a chosen order — *Work that spans two repositories* below.

**For the retention sweep, check the schedule rather than the output**
([ADR-0014](../adr/0014-shell-providers-and-per-source-retention.md#decision-6--retention-is-a-property-of-the-source)).
It is a scheduled job like any other, so the rule above already has it — but **a sweep that was never
registered looks exactly like a sweep with nothing to do**, which is what makes a missed registration
a licence breach rather than a stale cache.

**A change that only works in one deploy order is a change to rewrite**, not a window to reason
about: widen first so old and new code both work, move the data, then narrow in a *later* change
once only new code is live. File the narrowing as its own ticket before the widening lands — the
widening is not the risk, forgetting to remove it is. Purely additive changes are unaffected and
still land in one go.

**Anything the tests structurally cannot see** goes here as it appears, and prefer making each one
an executable check over leaving it as prose — a rule that lives only in prose is one nobody
re-reads at the moment it is broken. `scripts/check-docs.ts` is the first of those.

## Work that spans two repositories

Every Provider is a repository of its own and a deployment of its own
([ADR-0014](../adr/0014-shell-providers-and-per-source-retention.md)), so from the first Provider
ticket the loop above stops being confined to one repo. Three of its mechanisms then **break** rather
than merely going quiet, and each breaks in the direction that reads as fine:

- **One ticket, two PRs, and the first merge closes it.** A branch carries its `CAN-n` and Linear's
  GitHub integration moves the issue as a PR opens and merges (*After the merge* below), so two PRs
  carrying the same identifier both drive the same issue and the first to land reports it `Done`
  while the other half is unmerged. **Give each repository its own ticket** and relate them in
  Linear. An extra issue costs nothing; a status that closed early is never re-opened by anything.
- **A Provider's gates are a shared baseline: not these gates, and not a copy of them.** *The
  gates* above is one Actions job that carries a production release and a documents check, and
  `main`'s ruleset requires it by name — both are configuration of *this* repository, and neither
  can travel. What travels is the baseline **CAN-107 Give every Provider repository a CI baseline**
  built: a Provider repository inherits test, typecheck, lint and build, plus the dependency audit,
  by *calling* a reusable workflow that lives here, and gets secret scanning, push protection and its
  own ruleset from one provisioning run.
  [`../infrastructure.md`](../infrastructure.md) → *The Provider repository baseline* holds both
  halves, the composed status check context — **written down there and nowhere else**, because a
  rename would block every merge in every Provider repository at once — and what the baseline
  deliberately leaves out.
- **A Provider repository is provisioned before its first pull request, not after.** `/review-pr`
  polls until checks appear and then reads the ruleset for the contexts it must see, so a
  repository emitting none gives the wait nothing to tell *not registered yet* from *never will
  be*. The baseline's own provisioning runs in the same direction and refuses to require a context
  no run has been seen reporting, which is **CAN-40 Give main a ruleset that refuses an unchecked
  merge**'s lesson rather than a new one. **The deployment is still per-Provider and the baseline
  does not provision it** — nor the monitor that would say it had gone.
- **A preview only reaches a Provider that admits it.** `provider-tmdb` and `provider-tardis-wiki`
  are closed endpoints — one because the key is ours, one because the permission is
  ([ADR-0014](../adr/0014-shell-providers-and-per-source-retention.md#decision-3--reachability-splits-by-credential-in-three-classes))
  — so a caller not presenting the application's own credential is refused. A preview is a separate
  deployment, so whether it holds that credential, and whether a closed Provider should admit a
  throwaway host at all, is a decision on the Provider's side that **nothing has taken yet**.

**Land the contract side first, then the consumer**, which is the widening rule above one repository
further out. The contract evolves additive-only, because someone may be self-hosting our Provider on
their own schedule
([ADR-0014](../adr/0014-shell-providers-and-per-source-retention.md#what-survives-of-adr-0007)), so a
Provider already answering the new shape is safe for old and new consumers alike while the reverse
order ships a consumer calling something that does not exist.

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
