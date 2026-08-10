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

   `gh pr view --json statusCheckRollup` is not a substitute. A rollup can be green because a
   deployment succeeded while carrying no tests at all.

3. **Confirm it works.** Vercel builds a preview deployment per pull request — read its URL from
   the PR's checks or comments. Until the first deploy exists there is no preview, and that is a
   "nothing to check" rather than a pass.

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
   gh pr merge --squash --delete-branch
   ```

   Squash only. If the repo permits merge or rebase merges, do not use them.

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
