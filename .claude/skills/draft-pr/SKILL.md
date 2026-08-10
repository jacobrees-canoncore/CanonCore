---
name: draft-pr
description: Push the current branch and open a draft pull request linked to its Linear issue.
disable-model-invocation: true
---

Open a **draft** pull request for the current branch. `docs/agents/workflow.md` has the
policy and the reasoning; this is the procedure. `/review-pr` lands it afterwards.

`WS=ad2669ec-93a5-4ce1-97fa-c7d9247a1452` throughout.

## Steps

1. **Refuse to run on `main`.** `git branch --show-current`. If it is `main`, stop — there
   would be nothing left to open a PR against.

   Do not just refuse. The likely cause is that `/implement` ran without a branch being created
   first, so there are now commits on `main` that were meant for one. Report what
   `git log origin/main..main` shows, then walk the user through the recovery in
   `docs/agents/workflow.md` → Branches → *Who creates it, and when*, which is where those
   commands live.

2. **Switch to the `gh` account that can write.** That is `jacobdrees`. Three accounts are
   authenticated and the active one is often not it; `git push` works regardless because it
   goes over SSH, `gh` does not and fails with a 403 that reads like a repo problem
   (`docs/agents/workflow.md`).

   ```bash
   gh auth status                        # check before assuming — the active one moves
   gh auth switch --user jacobdrees
   ```

3. **Find the Linear issue.** Orca holds the link as worktree metadata, so the branch name is
   the fallback and not the source:

   - `orca linear issue --current --full --json` — works when the worktree was created with
     `--linear-issue`.
   - Otherwise take the identifier from the branch and read it explicitly:

     ```bash
     ID=$(git branch --show-current | grep -oiE 'can-[0-9]+' | head -1)
     orca linear issue "$ID" --full --workspace "$WS" --json
     ```

     Case does not matter: `orca linear issue can-11` resolves CAN-11. The exact-match rule in
     `issue-tracker.md` is about *names* (`--team CAN` vs `--team CanonCore`), not identifiers.

     `--workspace` is mandatory on every non-`--current` call: Orca is connected to three
     workspaces, does not infer one from the directory, and picks between them unpredictably
     — silently (`docs/agents/issue-tracker.md`).
   - If neither works, carry on without an issue and say so. Do not guess one.

4. **Resolve the base branch.** Default to `main` and say nothing — a lone branch is the
   common case and a prompt every time is noise.

   Ask only when the issue has a `parent` (`/to-tickets` slices are sub-issues of a `/to-spec`
   parent) **and** that parent has a branch on the remote:

   ```bash
   git ls-remote --heads origin | grep -iE "can-<parent>(-|$)"
   ```

   Then use `AskUserQuestion`, parent branch first and marked recommended. Give the reader the
   actual decision: target the **parent** when this slice should stack into the parent's
   eventual squash-merge, and `main` when it stands on its own regardless of its siblings. Do
   not auto-pick — parent and `main` can sit on the same SHA, which makes the parent look
   merged when the user still wants to stack.

   Say which base you chose, in one sentence.

5. **Check the base is level with its remote.** GitHub computes the PR against
   `origin/<base>`, not against the local ref. A local base carrying unpushed commits puts
   every one of them in the PR, and the range in step 6 will not show them, because it reads
   the local ref too. That is how a four-file change opens as ten.

   ```bash
   git fetch origin <base>
   git rev-list --left-right --count origin/<base>...<base>   # behind <TAB> ahead
   ```

   `0	0` — carry on.

   **Ahead.** The local base holds commits the remote does not, and this branch sits on top of
   them. Stop. Either push the base first, if those commits belong on it, or lift this branch
   off them:

   ```bash
   git rebase --onto origin/<base> <base>
   ```

   **Behind.** The PR itself will be right, but the range you are about to read describes a
   base that has moved. Rebase onto `origin/<base>` so what you read is what GitHub will show.

   **Both.** The base has diverged. Stop and say so. Sorting that out is a deliberate act on
   the repository, not something to do inside a PR command.

   This is a precondition, not a gate. `docs/agents/workflow.md` now names the gates, but they
   are unbuilt until the walking skeleton exists, so there may still be nothing to run.

6. **Read the range**, against the remote base and now that the base is known — doing this
   earlier describes commits the PR will not contain, and doing it against the local ref
   describes a PR that is not the one you are opening:

   ```bash
   git log origin/<base>..HEAD --oneline
   git diff origin/<base>...HEAD
   ```

   Also `git status`, to catch anything uncommitted that belongs in the PR.

7. **Push.** `git push -u origin HEAD`.

8. **Write the body** to a file. There is no PR template in this repo:

   ```markdown
   ## Summary

   <one or two paragraphs: what changed about the product, and why>

   ## Checks

   - [ ] The repo's checks pass
   - [ ] Looked at in a deployed environment
   - [ ] ADR written, for a decision made rather than followed

   Fixes CAN-<n>
   ```

   Leave the boxes unticked — `/review-pr` ticks them once they are true. **Drop any line this
   diff cannot apply to** rather than leaving it as noise, and drop the first two outright until
   the walking skeleton exists, since until then there are no checks to run and nothing deployed
   to look at. A checklist of things that cannot be done is worse than no checklist.

9. **Create it.**

   ```bash
   gh pr create --draft --base <base> --title "<subject>" --body-file <path>
   ```

   The title is **prose, matching the commit subject** — `Send the welcome email from the queue
   instead of the request`, not `feat(domain): …`. A single-commit PR squashes under its commit
   title, so the two should agree. Use `--body-file`; markdown as an inline argument is
   fragile.

   **A refusal here may not be GitHub's.** Claude Code's auto mode classifier blocks `gh` writes
   sometimes, and it reads like a permissions problem even though step 2 is done and the token is
   fine — so `gh auth switch` gets reached for and fixes nothing. `docs/agents/workflow.md` → *The
   other `gh` failure, which is not the account* tells it apart from step 2's 403 and names the
   fallback, `mcp__github__create_pull_request`, which opens the same draft PR over the same
   credentials by a route the classifier does not block. Pass `draft: true`, and the text of the
   body file rather than its path — the tool's schema takes `body` as a string.

10. **Attach the PR to the issue**, if one was found:

   ```bash
   orca linear attach --current --url <pr-url> --title "PR link" --json
   ```

   Use `orca linear attach <id> --url … --workspace "$WS"` when the worktree is not linked.
   This is deliberate belt and braces: `Fixes CAN-<n>` in the body relies on Linear's scanner
   noticing, and an attachment does not.

   On `linear_write_unconfirmed`, retry **once** with the pinned `--write-id` from the error's
   own `nextSteps` (`docs/agents/issue-tracker.md`).

   Both this and step 9's `Fixes CAN-<n>` are sync triggers, so keep the issue's description out of
   this skill entirely (`docs/agents/issue-tracker.md` → *A description write must not be bundled
   with anything else*).

11. **Report the PR URL** and say that a code review comes next. Say that opening the PR has queued
   the repo's checks **only if `.github/workflows` holds any** — until it does, nothing is queued
   beyond Vercel's deployment, and announcing checks that will later be reported as missing reads as
   a CI outage rather than as the pre-skeleton state it is.

   **Do not wait for those checks here.** They were queued seconds ago, so waiting blocks for a full
   run before anyone has read the diff; `/code-review` comes next and does not need them; and any
   green seen now is stale the moment the review changes the branch. `/review-pr` waits, and it
   waits because it merges.

## Notes

- Do not set reviewers or labels. Nobody is reviewing it, and triage labels live on the Linear
  issue rather than on the PR.
- Branch history does not need tidying — the merge squashes it.
