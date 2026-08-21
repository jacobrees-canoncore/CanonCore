---
name: next-lanes
description: Decide which tickets to dispatch as lanes next — gate the candidates, order what survives, check what is already in flight, then dispatch on approval.
disable-model-invocation: true
argument-hint: 'optional ceiling, e.g. 2 (default 3)'
---

Choose the next lanes, propose them, and dispatch them once the user approves.

**This body is self-sufficient — run it without reading anything else.** The pointers name where an
argument or a piece of evidence lives, for when a step surprises you: the evidence under every rule
here is [`docs/research/choosing-what-to-dispatch-next.md`](../../../docs/research/choosing-what-to-dispatch-next.md),
the standing policy is `docs/agents/workflow.md` → *How a batch is chosen* and, for what independence
means, → *A batch is independent in git, and coupled through the platform*. The tracker's is
`docs/agents/issue-tracker.md`, and the labels are `docs/agents/triage-labels.md` → *The roster*.

**This skill destroys nothing.** It reads the board and it opens lanes. It never removes a worktree,
never closes one out and never writes to the tracker. Closing a lane out belongs to `/review-pr`.

**Propose, then wait.** It never dispatches without approval.

## The ceiling is policy, not a derived number

**Three lanes, unless the user says otherwise.** Say so plainly when you report, because the number is
a starting value rather than a truth: **no published source gives a safe number of concurrent agents.**
Orca states none and says agents choose their own concurrency; Anthropic's only number is unmeasured
advice for a different architecture; every vendor cap found is a plan limit. The Kanban Guide requires
that a limit exist and be explicit but gives no formula, and the only documented procedure is to set
one slightly above the average and tune it empirically. **Take a ceiling from the argument when one is
given.**

**The count is not what predicts trouble anyway** — coupling is, at an odds ratio of 6.13 against
1.04-1.09 for how long a branch lives. That is what step 3 is for, and it may hold the board below the
ceiling.

## Steps

1. **Read the board.**

   ```bash
   node scripts/next-lanes.ts              # or --ceiling N
   ```

   It reads the lanes from Orca and the open issues and their `blocks` graph from the tracker, asks
   git what each lane has already changed, and prints the report. **Every command it runs is a read.**

   **Deal with a stalled lane before anything else.** A lane waiting on a permission prompt, or whose
   agent has finished without the lane being closed out, holds a slot and does nothing. Freeing one
   costs less than starting one — Reinertsen W9, *"Quickly apply extra resources to an emerging
   queue"*. Orca reports no event and no timeout for either, so this report is the only thing that
   notices.

2. **Read what survived the gate.** A ticket is dispatchable when it is open, carries a state role
   that dispatches, has no *open* blocker, and is not already in a lane.

   **Two state roles dispatch, and each gets its own prompt:**

   | Label | Dispatched with | Because |
   | --- | --- | --- |
   | `ready-for-agent` | `/implement` | Fully specified; nothing needs a browser. |
   | `ready-for-human` | `use playwright mcp for human tasks and /implement for coding ones` | The work has steps a person would click through. The lane drives the browser for those and writes code for the rest. |

   `needs-triage`, `needs-info` and `wontfix` dispatch nothing — `docs/agents/triage-labels.md` →
   *The roster*. A ticket carrying both roles is dispatched as `ready-for-agent`, which is the cheaper
   of the two to be wrong about.

   **Only one browser lane may run at a time.** The Playwright MCP profile is shared across sessions,
   so a second lane reaching for it gets "Browser is already in use" and neither proceeds. The report
   marks a browser lane `[holds the browser]` and holds every other one back while it flies. This is
   a coupling class git isolation does not reach, exactly like the platform ones below, and it was
   established by running into it rather than from any document.

   The order is band first — `v1`, then `Readiness`, then `Later` — then what the ticket unblocks.
   **The band is standing in for a cost-of-delay figure**, because `priority`, `estimate` and `dueDate`
   are unset on every open issue and inventing one would be worse than not having it.
   `docs/agents/issue-tracker.md` → *The three bands*.

3. **Check each candidate against what is already flying.** The report says three different things and
   you should weigh them differently:

   - **`COLLIDES`** — a lane in flight has *already changed* that file, read from its branch. This is
     measured, so treat it as a refusal. Two changes here share a file 59.0% of the time, and it is
     documents rather than code that drive it: `docs/infrastructure.md` is touched by 62% of merges.
   - **`MAY TOUCH SHARED PLATFORM STATE`** — the ticket's body reads as though it provisions a
     variable, edits the ruleset, adds a secret or migrates the schema. **Read the ticket before
     believing it** — the match is on wording and over-fires — and if it holds, sequence that lane
     alone. Git isolation reaches none of this: several of `check-docs`'s checks read a live source
     rather than the working tree, so such a lane reddens every other lane's gate with no git
     relationship at all. `docs/agents/workflow.md` → *The gates* has the table that decides the blast
     radius, and `docs/incidents.md` → *A concurrent lane reddened `main`, and the merge that failed
     had not caused it* is what it cost.
   - **`may touch`** — predicted from the ticket body and nothing has touched it yet. Information, not
     a refusal.

4. **Treat a blocked high-value ticket as a bundle, not as its blocker.** When the best candidate is
   only reachable through a blocker, say what the *bundle* is worth — the blocker plus what it unblocks
   — rather than scoring the blocker alone, which understates it. Do not instead pick whatever unblocks
   the most: that rule optimises how soon everything finishes rather than what is worth most, and it is
   only the right objective for `v1`, which ends at a single event.

   **Never count leverage through a `Later` ticket.** That band is one chain of `blocked-by` links that
   are mostly a chosen order rather than real dependencies, so traversing it makes the queue's own
   order look like leverage. `docs/agents/issue-tracker.md` → *`Later` is a work queue, not a dependency
   graph*. The report already stops there; do not undo it by eye.

5. **Report, then stop.** Give the user, in this order: what holds a slot and what is stalled; how many
   slots are free; the ranked candidates with the reason each is ranked where it is; and your
   recommendation with its collision reasoning. Name every ticket with its title.

   Then handle the state the board is actually in:

   | State | What to do |
   | --- | --- |
   | **Nothing in flight** | Propose up to the ceiling, but only a set that is mutually independent — check the candidates against *each other*, not only against what is flying. At most one may be a browser lane. If the best ticket carries shared platform state, propose it **alone** and say why the other slots stay empty. |
   | **Some slots free** | Propose one at a time, best first, and re-check collisions after each. Do not fill to the ceiling for its own sake: the limit is a limit, not a target, and Reinertsen W17 asks for *more* throttling as you approach it. |
   | **At the ceiling** | **Do not choose a ticket.** Report what would free a slot — which lane is stalled, which is waiting on review, which is finished but not closed out — and stop. Reinertsen W6: *"Block all demand when WIP reaches its upper limit."* The report lists candidates under `WOULD BE DISPATCHABLE` at the ceiling; that heading is context, not an invitation. |

6. **Dispatch only what the user approves**, one command per lane, with the prompt the report gave for
   that ticket:

   ```bash
   orca worktree create --name CAN-<n>-<slug> --linear-issue CAN-<n> \
     --base-branch origin/main --agent claude --prompt "<the prompt from step 2>"
   ```

   **`--base-branch origin/main` always.** Never base a lane on an unmerged parent branch: this
   repository squash-merges, so the parent's ancestry does not survive and the child pays a rebase per
   parent revision. When a ticket cannot start until another lands **it waits**.
   `docs/agents/workflow.md` → *A batch is independent in git, and coupled through the platform*.

   Then re-run step 1 and report the new state of the board.

## What this skill will not do

- **It will not remove or close out a lane**, however stalled. It reports one and leaves the decision.
- **It will not open a second browser lane**, whatever the first one is doing.
- **It will not raise the ceiling to fit a good ticket in.** Say the board is full and let the user
  decide; W19 makes adjusting the limit a deliberate act, not a convenience.
- **It will not treat a clean git separation as independence.** A third of merges that git reports as
  clean are build or test conflicts, and the platform classes in step 3 are invisible to git entirely.
