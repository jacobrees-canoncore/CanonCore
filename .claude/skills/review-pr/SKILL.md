---
name: review-pr
description: Land a reviewed draft PR — run the gates, mark it ready, squash-merge, and close out Linear.
disable-model-invocation: true
argument-hint: 'PR number or URL (optional; defaults to the PR for the current branch)'
---

Take a reviewed draft PR to production. `docs/agents/workflow.md` has the gates and why they
are the gates; this is the procedure.

Solo, "mark ready" signals nobody and GitHub simply refuses to merge a draft, so it is a step
on the way rather than the destination. This skill is the landing.

**A code review should already have run against this branch.** If it has not, say so and stop.

`WS=ad2669ec-93a5-4ce1-97fa-c7d9247a1452` throughout.

## Steps

1. **Resolve the PR.** The argument if given, otherwise the current branch's. Get a `gh`
   account with push access first — the active one may not have it, and the failure is a 403
   that reads like a repo problem (`docs/agents/workflow.md`).

   ```bash
   gh pr view --json number,url,isDraft,mergeable,baseRefName
   ```

   If it is already not a draft, report that and stop: this skill has likely run before, and
   re-running it would merge without re-checking anything.

2. **Run the gates.**

   `docs/agents/workflow.md` names them and is the only place they are written down. Read the
   commands from there rather than from memory. **Until the walking skeleton exists there is nothing to run — say that
   plainly and do not treat it as a pass.** The absence of a failing check is not a green check,
   and a landing that reports "gates passed" when nothing ran is the specific thing this step
   exists to prevent.

   Once they exist, treat anything red as a full stop. Pay particular attention to the
   cross-tenant row-level-security tests: a broken policy returns an empty result rather than an
   error, so that failure is invisible anywhere except in those tests.

   **A local run is not the gate.** This skill merges a few steps below, so the green has to belong
   to the commit being landed and has to have come from a clean checkout.

   **First, check there is anything to wait for.** If `.github/workflows` holds no workflow files,
   nothing will ever report and the wait below would burn its ceiling and stop a PR that is
   perfectly landable. Say there are no checks yet, exactly as the paragraph above says to, and go
   to step 3. Everything from here to the end of this step is conditional on that directory being
   populated.

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
   failure under `set -e` or in a `&&` chain, and the wait aborts. Do not pass `--required`: it
   errors while no required check has reported. `docs/agents/workflow.md` → *The gates* has the
   references for all three.

   Put a ceiling on the wait, around fifteen minutes, and report a timeout as a stop rather than a
   pass.

   **Then re-read the head SHA.** If it moved while you waited, the result describes a commit that
   is not the one you are about to merge. Wait again on the new one, and carry the final SHA to
   step 6.

   `gh pr view --json statusCheckRollup` on its own is not a substitute. A rollup can be green
   because a deployment succeeded while carrying no tests at all. Confirm that every check the
   workflow files declare is present and passing — **read the job names out of `.github/workflows`**
   rather than assuming they are `test`, `typecheck` and `lint`. `workflow.md` defines the gates as
   three pnpm commands; how those map onto job names is the workflow file's business, and a matrix
   or a single combined job would make the literals wrong.

3. **Confirm it works.** Vercel builds a preview deployment per pull request — read its URL from
   the PR's checks or comments. Until the first deploy exists there is no preview, and that is a
   "nothing to check" rather than a pass.

   **An empty read means "not yet", not "none".** Step 2's wait covers this whenever Vercel's own
   check is among the ones it waited on. Where it is not, poll for the URL instead of concluding
   from a single look that no preview exists. Reporting "no preview" while one is still building is
   the same error as reporting "gates passed" when nothing ran.

   Either way, **ask the user to confirm they have looked at the change working**, unless they
   have already said so. This is what a solo repo has instead of a reviewer, and an agent
   asserting that something looks right is not the same as a person seeing it.

4. **Tick the body's checklist** to match what is now true, so the PR records the state it
   merged in rather than the state it opened in. Leave unticked anything that genuinely did
   not happen; do not tick a box because the step was skipped.

   These are the PR's own boxes. The issue's acceptance criteria are a different list held to a
   stricter bar, and step 7 sets those.

5. **Mark ready.** `gh pr ready`. Reversible with `gh pr ready --undo`.

6. **Ask before merging.** This is the one step here that puts the change into production and
   the one that is not a click away from being undone. On a yes:

   ```bash
   gh pr merge --squash --delete-branch --match-head-commit <the SHA step 2 ended on>
   ```

   Squash only. If the repo permits merge or rebase merges, do not use them.

   **`--match-head-commit` is what makes step 2 binding.** Steps 3 to 5 sit between the check and
   the merge and one of them waits on a person, so a push landing in that window would otherwise be
   squashed into `main` having never been checked at all — the exact property step 2 exists to
   guarantee. With the flag, GitHub refuses the merge instead. Omit it only if step 2 found no
   checks to wait for, since then there is no verified SHA to match.

   If the merge is blocked by conflicts, rebase onto `main` and force-push with
   `--force-with-lease`. Never merge `main` into the branch.

7. **Verify what the ticket promised, in the deployed environment, and set its checkboxes.** The
   step that gets skipped. Check whatever the ticket actually claimed — a cron entry that
   registered, an environment variable set for production, a route that answers and still refuses
   without its secret. A green suite says the code is right. It says nothing about whether the
   platform is doing what the ticket said it would.

   While nothing is deployed, say that this could not be done rather than omitting it.

   **Set the issue's acceptance-criteria checkboxes from what this step verified.** Work them one
   at a time: take a criterion, check that one, record its outcome, then move to the next.

   Each box ends in one of two states:

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
   revert it without saying so. `docs/agents/issue-tracker.md` → *A description write must not be
   bundled with anything else* has the mechanism, the triggers and the rule. Step 6's merge is one
   of those triggers, so the first wait below is not optional.

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

   **Settle again, then confirm by reading** — same backgrounded form. `save-issue` sits outside the
   retry rule in `docs/agents/issue-tracker.md`, so confirm this write by reading rather than by
   repeating it, and read only after the delay. An immediate read proves nothing here: the write
   *has* landed, and the overwrite has not arrived yet, so a description that will survive and one
   seconds from being reverted read identically.

   Match `- [[xX]]`. Linear stores a ticked box as `- [X]`, so a case-sensitive check for `- [x]`
   reports zero ticked and looks exactly like a write that silently failed.

   If the settled read comes back reverted, write once more and settle-and-read again — repair, not
   the blind retry the doc rules out. If the second write is reverted too, leave it and say so in
   the report.

8. **Close out Linear.** Resolve the issue the way `/draft-pr` does — `orca linear issue
   --current` first, the identifier from the branch name as the fallback:

   ```bash
   orca linear status set CAN-<n> --to Done --workspace "$WS" --json
   orca linear comment add CAN-<n> --workspace "$WS" --body-file <path> --json
   ```

   Then drop the state role. **Read the issue's labels first and remove the one it actually
   has** — it is `ready-for-agent` most of the time and `ready-for-human` or `needs-info`
   often enough to matter, and removing a label the issue does not carry leaves the real one
   behind:

   ```bash
   orca linear issue CAN-<n> --workspace "$WS" --json   # read .labels
   orca linear label remove CAN-<n> --label <the one it has> --workspace "$WS" --json
   ```

   `--label` is singular and repeated; never `label set`, which would drop the category label
   too. A landed issue is left with no triage state role at all, on purpose —
   `docs/agents/triage-labels.md` says why.

   The comment says what shipped and what to expect next, not a summary of the diff. The PR is
   the diff. It carries step 7's evidence, which is why it is written after that step.

   **Step 7 owns the description.** If it turned up something that belongs in the issue's body, put
   it in this comment instead.

9. **Report** the merged PR, the Linear state, and what you verified — including, explicitly,
   anything you could not. Name the acceptance criteria you left unticked, and why. If the
   description had to be rewritten after a sync reverted it, say that too.
