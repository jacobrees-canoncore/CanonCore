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

5. **Mark ready.** `gh pr ready`. Reversible with `gh pr ready --undo`.

6. **Ask before merging.** This is the one step here that puts the change into production and
   the one that is not a click away from being undone. On a yes:

   ```bash
   gh pr merge --squash --delete-branch
   ```

   Squash only. If the repo permits merge or rebase merges, do not use them.

   If the merge is blocked by conflicts, rebase onto `main` and force-push with
   `--force-with-lease`. Never merge `main` into the branch.

7. **Close out Linear.** Resolve the issue the way `/draft-pr` does — `orca linear issue
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
   the diff.

   **Leave the issue's acceptance-criteria checkboxes alone here.** Step 8 sets them, from what it
   actually verified, so that the two steps do not both write the description.

8. **Verify what the ticket promised, in the deployed environment.** The step that gets
   skipped. Check whatever the ticket actually claimed — a cron entry that registered, an
   environment variable set for production, a route that answers and still refuses without its
   secret. A green suite says the code is right. It says nothing about whether the platform is
   doing what the ticket said it would.

   While nothing is deployed, say that this could not be done rather than omitting it.

   **Then set the issue's acceptance-criteria checkboxes to match, and only to match.** Tick what
   this step confirmed. Leave everything else unticked — a criterion carried to another ticket, one
   nothing could prove yet, one you simply did not check. Name every box you left unticked, in the
   step 7 comment and again in the step 9 report.

   Ticking is not a closing formality and must never be done as one. The rule from step 2 applies
   unchanged: the absence of a failing check is not a green check. A box ticked by an agent that did
   not check it is worse than a blank one, because it is a claim someone will later build on, and
   nothing in the issue records who ticked it or on what evidence. When in doubt, leave it and say
   why.

   A landed issue with every box blank is the failure this exists to fix: CAN-18 merged with 13 of
   13 unticked, two of which were genuine deferrals to CAN-22 that no reader could distinguish from
   the eleven nobody had confirmed. Unticked boxes only carry meaning once the ticked ones are
   ticked.

   ```bash
   orca linear issue CAN-<n> --workspace "$WS" --full --json   # read .description first
   orca linear save-issue --id CAN-<n> --workspace "$WS" --body-file <path> --json
   ```

   `save-issue` replaces the **entire** description. Read the current body, change only `- [ ]` to
   `- [x]` on the lines you verified, and write everything else back byte for byte. Re-read the
   issue afterwards to confirm: this CLI reports writes as unconfirmed even when they land
   (`docs/agents/issue-tracker.md`), so never retry blind.

9. **Report** the merged PR, the Linear state, and what you verified — including, explicitly,
   anything you could not.
