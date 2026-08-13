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

5. **Check the base, and whether the branch is on it.** GitHub computes the PR against
   `origin/<base>`, not against the local ref, and so does step 6. A local base carrying
   unpushed commits puts every one of them in the PR, which is how a four-file change opens as
   ten. A local base that has merely fallen behind puts nothing anywhere. Telling those two
   apart is the whole of this step.

   ```bash
   git fetch origin <base>
   git rev-list --left-right --count origin/<base>...<base>   # behind <TAB> ahead
   ```

   `0	0` — carry on.

   Read the two numbers as one shape rather than one at a time. **A non-zero *ahead* count ends
   the step**, whatever the behind count says; the gate further down applies to the behind
   reading only.

   **Ahead (`0	n`).** The local base holds commits the remote does not, and this branch sits on
   top of them. Stop. Either push the base first, if those commits belong on it, or lift this
   branch off them:

   ```bash
   git rebase --onto origin/<base> <base>
   ```

   **Both (`n	m`).** The base has diverged. Stop and say so. Sorting that out is a deliberate
   act on the repository, not something to do inside a PR command. Do not carry on into the
   behind case below: its gate cannot tell a diverged base from a stale one, so a diverged base
   reaches its rebase, which replays the base's unpushed commits onto this branch and makes them
   permanently part of it.

   **Behind only (`n	0`).** Expected under Orca, and usually not a problem: nothing a worktree
   does moves the local `main` ref, so it is stale here as a matter of course
   (`docs/agents/workflow.md` → Branches → *The local `main` is permanently stale in a
   worktree*). Do not act on this count. Ask instead whether the branch already contains the
   remote base:

   ```bash
   git merge-base --is-ancestor origin/<base> HEAD   # exit 0 = it does
   ```

   **Exit 0** — nothing to rebase, and step 6's range is already the one GitHub will show.
   Carry on, and do not report the count as a finding.

   **Exit 1** — the branch is genuinely on a stale base. Step 6 still describes the PR
   correctly, so this is not about what you are about to read; it is that nothing has been
   checked against the base this will merge into. Rebase, so that step 7's push runs the gates
   against that base and any conflict surfaces here rather than in `/review-pr`:

   ```bash
   git rebase origin/<base>
   ```

   This is a precondition, not a gate. `/review-pr` runs the gates; `docs/agents/workflow.md`
   names them.

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
   diff cannot apply to** rather than leaving it as noise: a checklist of things that cannot be
   done is worse than no checklist. The first two apply to every change, so dropping either needs
   a reason particular to the diff.

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

    Both this and step 9's `Fixes CAN-<n>` are sync triggers, so keep the issue's description out
    of this skill entirely (`docs/agents/issue-tracker.md` → *A description write must not be
    bundled with anything else*).

11. **Report the PR URL**, and say that `/review-pr` is what comes next. If you mention the checks
    or the preview, be accurate about what queued them: **step 7's push did, not step 9's PR
    creation.** Both the workflow and Vercel trigger on push, so they were already running before
    the PR existed.

    **Do not tell the user to run a code review that has already run.** `/implement` runs it, and
    `docs/agents/workflow.md` → *The review runs once, and `/implement` is normally where* says that
    is the review — asking for a second pass on the same range is the noise this line exists to
    prevent. Say a review is needed only in the three cases that section names, and say which one
    applies: `/implement` never ran, the diff its review read was empty or partial, or the branch
    has gained commits it never saw. Ask rather than assume when you cannot tell from this session.

    **Do not wait for the checks here either.** They were queued seconds ago, so waiting blocks for
    a full run before anyone has read the diff, and any green seen now is stale the moment anything
    changes the branch. `/review-pr` waits, and it waits because it merges.

## Notes

- Do not set reviewers or labels. Nobody is reviewing it, and triage labels live on the Linear
  issue rather than on the PR.
- Branch history does not need tidying — the merge squashes it.
