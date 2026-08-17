---
name: review-pr
description: Land a reviewed draft PR — run the gates, mark it ready, squash-merge, and close out Linear.
disable-model-invocation: true
argument-hint: 'PR number or URL (optional; defaults to the PR for the current branch)'
---

Take a reviewed draft PR to production.

**This body is self-sufficient — run it without reading anything else.** Every command the landing
needs is here. The pointers name where an argument or a piece of evidence lives, for when a step
surprises you: `docs/agents/workflow.md` is the standing policy, `docs/agents/issue-tracker.md` and
`docs/agents/triage-labels.md` the tracker's, `docs/infrastructure.md` the register of what is
provisioned, and `docs/incidents.md` the observation behind any rule that has one.

Solo, "mark ready" signals nobody and GitHub simply refuses to merge a draft, so it is a step on the
way rather than the destination. This skill is the landing.

**A code review should already have covered this branch's range.** `/implement`'s own review
satisfies that when it ran against the committed change. Do not send the user back for a second pass
over a range that has already been reviewed. Stop only when no review covered it: `/implement` never
ran, the diff it read was empty or partial, or commits have landed since. A review of an empty range
reports no findings and reads like a clean one, so the question to ask is **which diff command it
ran** — not whether a review happened. Ask rather than assume when this session cannot tell.
(`docs/agents/workflow.md` → *The review runs once*.)

`WS=ad2669ec-93a5-4ce1-97fa-c7d9247a1452` throughout.

## Steps

1. **Resolve the PR.** The argument if given, otherwise the current branch's. Switch to the `gh`
   account with push access first — `jacobdrees` (`docs/agents/workflow.md` → *The `gh` account*).

   ```bash
   gh auth status && gh auth switch --user jacobdrees
   gh pr view --json number,url,isDraft,mergeable,baseRefName
   ```

   If it is already not a draft, report that and stop: this skill has likely run before, and
   re-running it would merge without re-checking anything.

2. **Wait for the gates.** They run in Actions on every push, so there is normally something to wait
   for. **If nothing ever reports, say so plainly and do not treat it as a pass.** The absence of a
   failing check is not a green check, and a landing that reports "gates passed" when nothing ran is
   the specific thing this step exists to prevent.

   **A local run is not the gate.** This skill merges a few steps below, so the green has to belong
   to the commit being landed and has to have come from a clean checkout — that is the failure a
   solo repo has no other way to see.

   ```bash
   gh pr view <n> --json headRefOid --jq .headRefOid              # note the SHA; step 6 needs it
   gh pr checks <n> --json bucket --jq '.[].bucket' || true       # poll until this returns anything
   gh pr checks <n> --watch --fail-fast --interval 15
   ```

   **Poll first, watch second.** For a few seconds after a push the API reports no checks at all and
   `--watch` exits 1 rather than waiting — the same code a genuine failure exits with, so the two
   cannot be told apart. Read `bucket` (`pass` / `fail` / `pending` / `skipping` / `cancel`), not the
   exit code: `gh pr checks` exits 8 whenever anything is pending, `--json` included, which is the
   normal state throughout the poll. Hence the `|| true` — without it the healthy path reads as a
   failure under `set -e` or in a `&&` chain, and the wait aborts. `--fail-fast` works only alongside
   `--watch`, and `--interval` defaults to 10 seconds. **Do not pass `--required`**: it errors while
   no required check has reported. References:
   [gh pr checks](https://cli.github.com/manual/gh_pr_checks),
   [cli/cli#9691](https://github.com/cli/cli/pull/9691),
   [cli/cli#7401](https://github.com/cli/cli/issues/7401),
   [cli/cli#9682](https://github.com/cli/cli/issues/9682).

   Treat anything red as a full stop. Pay particular attention to the cross-tenant
   row-level-security tests: a broken policy returns an empty result rather than an error, so that
   failure is invisible anywhere except in those tests.

   Put a ceiling on the wait, around fifteen minutes, and report a timeout as a stop rather than a
   pass — after running the cross-check below, and saying which state it was.

   ### The third state: registered, finished, never reported

   *Poll first, watch second* separates *not registered yet* from *failed*. Neither separates either
   from a check-run whose work has finished and whose record never closed: the run reads
   `completed`/`success`, every step passed, and the check-run on that SHA still reads `in_progress`
   with a null `completed_at`, so `bucket` stays `pending` and the watch runs to the ceiling
   (`docs/incidents.md` → *A check-run finished and its record never closed*).

   Before concluding CI is slow, run **all three** of these. The third is not optional: the required
   `Vercel` context is a commit **status**, not a check-run, so the context most likely to hang
   never appears in the second command's output.

   ```bash
   gh run list --branch <branch> --limit 1 --json headSha,status,conclusion
   gh api 'repos/{owner}/{repo}/commits/<sha>/check-runs' \
     --jq '.check_runs[] | "\(.status)/\(.conclusion // "-")\t\(.completed_at // "NULL")\t\(.name)"'
   gh api 'repos/{owner}/{repo}/commits/<sha>/status' \
     --jq '.statuses[] | "\(.state)\t\(.updated_at)\t\(.context)"'
   ```

   `--limit 1` returns the newest run on the branch, which need not be the run for the SHA you are
   waiting on, so `headSha` is selected to be *checked* rather than displayed: if it does not match,
   the commands describe different commits and the comparison means nothing. `gh` fills in
   `{owner}/{repo}` from the checkout. A status has no run record and no `completed_at` — its fields
   end at `updated_at` ([commit
   statuses](https://docs.github.com/en/rest/commits/statuses)) — so its tell is a `state` still
   `pending` after the deployment it reports on has finished, which the `vercel` MCP or the
   dashboard answers.

   A run reading `completed/success` while one of its check-runs reads `in_progress` with a null
   `completed_at` is a **stuck record, not a slow check**. The two want opposite remedies, which is
   why the cross-check earns its ten seconds.

   **If it reads stuck, the remedy is a fresh run, not a longer wait.** `gh run rerun <run-id>`
   first, which costs no history. When the stuck context is the `Vercel` status there is no run to
   re-run, so skip straight to the next resort: an empty commit
   (`git commit --allow-empty`) pushed to the branch, which the squash merge discards anyway and
   which asks Vercel for a fresh deployment as well as Actions for a fresh run. **Do not reach for a
   rebase** — it is the reflex, and in a worktree whose `HEAD` already contains `origin/main` it
   rewrites nothing, produces no new SHA and triggers no new run; it is worth trying only when
   `git merge-base --is-ancestor origin/main HEAD` exits 1. Then start this step again on the SHA
   the fresh run belongs to.

   **Do not edit `.github/workflows/ci.yml` for this.** It is GitHub's record rather than the
   pipeline — one run of six was affected on the same workflow and job as the five that finalised
   normally — and permanent configuration added to work around a one-off data inconsistency is what
   `CLAUDE.md`'s engineering principles rule out. The record also **back-fills itself**, so the
   cross-check only answers while the wait is still on: re-running it afterwards returns a healthy
   record and makes a correct diagnosis look like a mistaken one. Make the call during the wait and
   record what you saw.

   ### Confirm the right checks, not just a green rollup

   `gh pr view --json statusCheckRollup` on its own is not a substitute: a rollup can be green
   because a deployment succeeded while carrying no tests at all.

   **`main`'s ruleset holds the list the merge is actually judged against**, and it includes
   `Vercel`, which no workflow file declares. Ask it for its names and confirm each is present and
   green on the SHA:

   ```bash
   gh api repos/{owner}/{repo}/rules/branches/main \
     --jq '.[] | select(.type == "required_status_checks")
                 | .parameters.required_status_checks[].context'
   ```

   Also confirm every check the workflow files declare is present and passing — **read the job names
   out of `.github/workflows`** rather than assuming them. The gates are four pnpm commands; how
   those map onto job names is the workflow file's business, and a matrix or a split job would make
   any literal here wrong. The two reads are complementary rather than a cross-check: the workflow
   files say what CI promises, the ruleset says what blocks the merge.

   A required context missing from the rollup is not a slow check. It is a context nothing emits,
   which blocks the merge **for ever** rather than until CI finishes — report it as a stop and fix
   the ruleset or the workflow. Do not wait for it.

   ### Run the document check locally

   ```bash
   node scripts/check-docs.ts --verbose
   ```

   CI runs it too, but cannot reach every source: `orca` drives a desktop app and never runs on a
   runner, so the label roster gates **here or nowhere**. **Read the skips** — a skip is not a pass,
   and the summary says so. Treat a FAIL as red, like any other gate
   (`docs/agents/workflow.md` → *The gates*).

   **Then re-read the head SHA.** If it moved while you waited, the result describes a commit that
   is not the one you are about to merge. Wait again on the new one, and carry the final SHA to
   step 6.

3. **Confirm it works.** Read the preview deployment's URL from the PR's checks or comments. Step 2
   does not finish until the required `Vercel` context is green on the SHA, so by this step the
   preview exists and has deployed — a URL that cannot be found means step 2 ended somewhere it
   should not have, not a state to work around here.

   **Ask the user to confirm they have looked at the change working**, unless they have already said
   so. This is what a solo repo has instead of a reviewer, and an agent asserting that something
   looks right is not the same as a person seeing it.

4. **Tick the body's checklist** to match what is now true, so the PR records the state it merged in
   rather than the state it opened in. Leave unticked anything that genuinely did not happen; do not
   tick a box because the step was skipped.

   These are the PR's own boxes. The issue's acceptance criteria are a different list held to a
   stricter bar, and step 7 sets those.

   ```bash
   gh pr edit <n> --body-file <path>
   ```

   **A refusal naming the classifier, permissions or auto mode is the harness, not GitHub: use the
   `github` MCP, do not switch accounts** (`docs/agents/workflow.md` → *The `gh` account*). **It
   applies to every `gh` write in this skill** — step 2's `gh run rerun` can hit it before this line
   ever runs — which is why it is said once here rather than at each.

5. **Mark ready.** `gh pr ready`. Reversible with `gh pr ready --undo`.

6. **Ask before merging.** This is the one step here that puts the change into production and the
   one that is not a click away from being undone. On a yes:

   ```bash
   gh pr merge <n> --squash --match-head-commit <the SHA step 2 ended on>
   gh pr view <n> --json state,mergedAt                   # decide from this, not from the exit code
   git ls-remote --heads origin <branch>                  # empty means GitHub already deleted it
   ```

   **Squash only, and the repository offers nothing else** — merge commits and rebase merges are
   off, and `main`'s ruleset refuses a non-linear history anyway.

   **`--match-head-commit` is what makes step 2 binding.** Steps 3 to 5 sit between the check and
   the merge and one of them waits on a person, so a push landing in that window would otherwise be
   squashed into `main` having never been checked at all — the exact property step 2 exists to
   guarantee. With the flag, GitHub refuses the merge instead.

   **`main` refuses a merge its checks do not support, so a refusal here is a stop.** Do not pass
   `--admin`: there is no bypass actor for it to use, and an agent that made it work would have
   removed the guard rather than satisfied it. If GitHub declines, step 2 ended somewhere it should
   not have — read `gh pr view <n> --json mergeStateStatus,mergeable`, say what it returned, and go
   back to step 2 rather than trying the merge a second way.

   **The merge command's exit code is not the answer, and no `--delete-branch`.** That flag makes
   `gh` fail *after* GitHub has already merged, every time, from a worktree (`docs/incidents.md` →
   *`--delete-branch` fails after the merge has already succeeded*). Read `state,mergedAt` and
   branch on that: `MERGED` means the landing succeeded no matter what the command printed, so carry
   on to step 7 rather than retrying — a second merge attempt would be a decision made from a false
   report.

   **The remote branch deletes itself**, since `delete_branch_on_merge` is on, so the third line
   confirms rather than acts: no output is the expected result. Read that output rather than the
   exit code — `--exit-code` would make the ordinary case exit 2 and abort the healthy path under
   `set -e`, the same trap the `|| true` in step 2 exists for. Run `git push origin --delete
   <branch>` only if the branch is somehow still there, and only after `state` reads `MERGED`: done
   on a merge that did not happen, it closes the PR and discards the pushed work.

   **If the classifier refuses this one**, `mcp__github__merge_pull_request` is the fallback — but
   it has no head-SHA parameter, so it cannot enforce the paragraph above. Re-read
   `gh pr view <n> --json headRefOid` immediately before calling it and stop if it no longer matches
   step 2's SHA. Say in the report that the merge went by that route and that the match was checked
   by hand rather than by GitHub.

   If the merge is blocked by conflicts, fetch and rebase onto `origin/main` — never the local
   `main`, which is permanently stale in a worktree, so a rebase onto it reuses the stale base — and
   force-push with `--force-with-lease`. Never merge `main` into the branch.

7. **Verify what the ticket promised, in the deployed environment, and set its checkboxes.** The
   step that gets skipped. Check whatever the ticket actually claimed — a cron entry that
   registered, an environment variable set for production, a route that answers and still refuses
   without its secret. A green suite says the code is right. It says nothing about whether the
   platform is doing what the ticket said it would.

   **Set the issue's acceptance-criteria checkboxes from what this step verified.** Work them one at
   a time: take a criterion, check that one, record its outcome, then move to the next. Each box
   ends in one of two states:

   - **Ticked**, with the check named and what it returned — the command and its status line, the
     query and its row, the variable listed for the target claimed. Prefer a check someone else
     could re-run and compare.
   - **Unticked**, with a reason: carried to another ticket, unprovable until something else exists,
     or not checked. "Not checked" is a legitimate outcome.

   The evidence belongs beside each criterion in the step 8 comment, which is why that comment is
   written after this step. A tick recorded without its check cannot be told from a guess once the
   terminal is closed, and the issue records neither who ticked it nor why.

   **This step runs before the status change, and the ordering is the point.** A status change or a
   comment can simply be written again; a description cannot, because the Linear↔GitHub sync can
   revert it without saying so, silently and with nothing logged. Step 6's merge is one of the
   events that opens that window — it closes the mirrored GitHub issue, which pushes GitHub's body
   back to Linear — so the first wait below is not optional. (`docs/agents/issue-tracker.md` → *A
   description write must not be bundled with anything else*; `docs/incidents.md` → *The
   Linear→GitHub sync reverted a description write*.)

   **Settle after the merge, then read.** One command, backgrounded — the wait and the read the
   write needs anyway. `sleep` in the foreground is blocked in Claude Code, and an unbacked "wait
   half a minute" is a wait that does not happen:

   ```bash
   sleep 45; orca linear issue CAN-<n> --workspace "$WS" --full --json   # run in background
   ```

   **Write.** Linear's `issueUpdate` takes the description as one whole string and offers no partial
   patch ([Linear GraphQL API](https://linear.app/developers/graphql)), so `save-issue` replaces the
   entire body. Toggle only the `- [ ]` lines you verified; write everything else back unchanged:

   ```bash
   orca linear save-issue --id CAN-<n> --workspace "$WS" --body-file <path> --json
   ```

   **Grep the body for a bare identifier before you write it, not only after.** Because the write
   replaces the body whole, a `[CAN-<n>](<url>)` anywhere in it — including on a line you did not
   touch — is rewritten by the sync into a GitHub number naming a *different* ticket. Any citation
   this step adds puts the title **inside** the link text, and any bare one already in the body is
   repaired in the same write rather than left to decay:

   ```bash
   grep -nE '\[(CAN-[0-9]+|[^]]*CanonCore#[0-9]+)\]\(' <path>   # expect no output
   ```

   (`docs/agents/issue-tracker.md` → *A bare identifier does not survive the sync*.)

   **Settle again, then confirm by reading** — same backgrounded form. Confirm this write by reading
   rather than by repeating it, and read only after the delay. An immediate read proves nothing
   here: the write *has* landed, and the overwrite has not arrived yet, so a description that will
   survive and one seconds from being reverted read identically.

   Match `- [[xX]]`. Linear stores a ticked box as `- [X]`, so a case-sensitive check for `- [x]`
   reports zero ticked and looks exactly like a write that silently failed.

   If the settled read comes back reverted, write once more and settle-and-read again — repair, not
   a blind retry. If the second write is reverted too, leave it and say so in the report.

8. **Close out Linear.** Resolve the issue the way `/draft-pr` does — the `--current` form first,
   the identifier from the branch name as the fallback, and `--workspace "$WS"` on everything that
   is not `--current`:

   ```bash
   orca linear status set CAN-<n> --to Done --workspace "$WS" --json   # skip if already Done
   orca linear comment add CAN-<n> --workspace "$WS" --body-file <path> --json
   ```

   **Read `.state.name` before setting it** — step 7's settled read already has it. The GitHub
   integration transitions the issue on merge, so it is normally `Done` before this line runs. Skip
   the call when it is, and credit the sync in the report. Running it anyway is harmless;
   *reporting* it as the thing that closed the issue is not, because that describes work which had
   already happened.

   Then drop the state role. **Read the issue's labels first and remove the one it actually has** —
   it is `ready-for-agent` most of the time and `ready-for-human` or `needs-info` often enough to
   matter, and removing a label the issue does not carry leaves the real one behind:

   ```bash
   orca linear issue CAN-<n> --workspace "$WS" --json   # read .labels
   orca linear label remove CAN-<n> --label <the one it has> --workspace "$WS" --json
   ```

   `--label` is singular and repeated, and **never `label set`**. A landed issue is left with no
   triage state role at all, on purpose (`docs/agents/triage-labels.md`, which owns both rules).

   The comment says what shipped and what to expect next, not a summary of the diff. The PR is the
   diff. It carries step 7's evidence, which is why it is written after that step.

   **Step 7 owns the description.** If it turned up something that belongs in the issue's body, put
   it in this comment instead.

   On `linear_write_unconfirmed` from `comment add`, retry **once** with the pinned `--write-id`
   from the error's own `nextSteps`, identical body, explicit issue target. From `status set`,
   re-read the issue instead of retrying blind. `save-issue` is never retried blind — step 7 has its
   repair path.

9. **Report** the merged PR, the Linear state, and what you verified — including, explicitly,
   anything you could not. Quote step 6's `state` and `mergedAt` as the evidence that it landed;
   "the merge command exited zero" is not that evidence, and neither is its failing. Name the
   acceptance criteria you left unticked, and why. If the description had to be rewritten after a
   sync reverted it, say that too.
