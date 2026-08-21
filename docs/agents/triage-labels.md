# Triage labels

The skills speak in terms of standard triage roles. This file is the mapping from those roles to
the label strings this repo's tracker actually holds, and it **owns every rule about applying them**
— other documents point here rather than restating.

The tracker itself is [issue-tracker.md](./issue-tracker.md) (Linear, team `CAN`).

## The roster

All eight exist on team `CAN`. `scripts/check-docs.ts` compares this table against
`orca linear team labels` and fails when they disagree — **on a laptop, and nowhere else**. Why
that is a decision rather than a gap: *Where this check gates, and where it does not* below.

**Category roles** — exactly one per triaged issue. These map onto labels Linear created by default.

| Label in mattpocock/skills | Label in our tracker | Meaning                    |
| -------------------------- | -------------------- | -------------------------- |
| `bug`                      | `Bug`                | Something is broken        |
| `enhancement`              | `Feature`            | New feature or improvement |

**State roles** — exactly one per triaged issue that is still waiting to be worked. See *Landed
issues* below for the one case where none applies.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

**Unmapped:** Linear's `Improvement` maps to no role, so `/triage` will neither apply nor
interpret it. Use it by hand if you want.

The five state roles were created on 8 August 2026 as **workspace-level** labels, so any future team
in the CanonCore workspace inherits them.

```bash
orca linear team labels --team CAN --workspace ad2669ec-93a5-4ce1-97fa-c7d9247a1452 --json
```

## Where this check gates, and where it does not

**The roster gates locally and skips in CI, and that is the settled answer** — **CAN-109 Decide
whether the label roster check needs enforcing, or is honest as it stands**. `orca` drives a
desktop application on Jacob's machine, so on a runner the CLI is absent and the check reports SKIP
with the reason. **So run the script before landing**, which `/review-pr` does, and read the skips.

**Unenforced is tolerable; unenforced and unannounced was not**, and the second half is what the
job summary fixed — [`workflow.md`](workflow.md) → *The gates*. A green run's own page now names this
check as skipped rather than leaving the tick to imply it ran.

**What was rejected.** A Linear API token in Actions would replace the desktop CLI and buy real
enforcement. It was turned down **on the cost of holding a credential**: it would need a roster row
and a rotation story of its own — a credential added to gate eight strings, when a credential is the
thing these checks exist to keep honest. Whether such a key even carries an expiry is not documented
either way, which is one more thing that would have to be established rather than a cost that can be
asserted.

**Not because such a key must be broad.** Linear offers to "restrict it to certain permissions (Read,
Write, Admin, Create issues, Create comments)" and to "limit an API key's access to specific teams in
your workspace" ([API and webhooks](https://linear.app/docs/api-and-webhooks), read 18 August 2026),
so a read-only key confined to team `CAN` is available. A key does still inherit the access of
whoever made it. **This corrects a second ground that used to stand here** — that such a key is
"workspace-wide" — which Linear's own documentation contradicts; it is recorded rather than deleted
so the reach of the key is not offered again as a reason to reopen.

**What that leaves exposed is small, because the two ways this table can drift are not
symmetrical:**

- **The document invents a label.** Already loud, and at the moment of use: the CLI cannot create a
  label definition, so applying one the tracker does not have fails outright.
- **The tracker gains a label the document does not map.** The silent direction, and the cheap one:
  `/triage` neither applies nor interprets a label it has no role for, which is exactly what it
  already does with `Improvement` on purpose.

Neither is the failure mode a credential roster has, where the silent direction is a secret nobody
recorded. That is why the same decision widened the credential roster to compare the GitHub Actions
secrets — though a keyless route to them from CI turned out not to exist either, so both rosters
ended up gating in the same place. The three options as posed, and which was taken:
[`docs/infrastructure.md`](../infrastructure.md) → *What this check compares, and what it cannot*.

**GitHub's mirror is not a second source.** Labels sync two ways to GitHub Issues, so the mirror
looks like something a runner could read with `gh label list` and no credential at all. It is a
different set. Read back on 16 August 2026 it held fourteen labels: six of this table's names, eight
of the defaults GitHub creates a repository with
([Managing labels](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/managing-labels)),
and neither `Bug` nor `Improvement`. `Bug` is the one name of ours that collides with a default,
case aside, and the mirror carries `bug` instead. Comparing against that set would report
disagreement on a roster that is correct.

## Changing them

- **Use `label add` / `label remove`. Never `label set`** — it replaces the entire label set and
  would silently drop the category label. A state transition is therefore **two calls**.
- **`--label` is singular and repeated**, not a list.
- **Read the issue's labels before removing one.** It is `ready-for-agent` most of the time and
  `ready-for-human` or `needs-info` often enough to matter, and removing a label the issue does not
  carry leaves the real one in place.
- **`orca linear` can add and remove labels but cannot *create* a label definition**, so applying
  one that does not exist fails. A human creates it in the Linear web UI first, using exact
  lowercase strings — Linear label matching is exact. That includes the `wayfinder:map` and
  `wayfinder:<type>` labels, if `/wayfinder` is ever used.

## Landed issues carry no state role

When a PR merges, remove whichever state role the issue carries and add nothing back, leaving only
the category label. Correct, not an oversight.

None of the five means "done". Triage routes work that has **not** been done — to a human, to an
agent, back to the reporter, or to nowhere — and a merged ticket needs no routing. Leaving
`ready-for-agent` on one is a standing invitation to pick up work that is already in production.
Delivery progress lives in Linear's workflow state instead, which is the axis that has a `Done`.

## Why triage state lives in labels, not workflow states

`needs-info` and `ready-for-agent` have no workflow-state equivalent, and the workflow states are
already carrying delivery progress. `needs-triage` looks like `Backlog` and `wontfix` looks like
`Canceled`, but a ticket needs to be able to sit in `Todo` while labelled `ready-for-agent`.

Labels sync two ways to GitHub Issues, so a label applied here shows up there and vice versa.
