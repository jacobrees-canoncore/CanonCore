# Triage labels

The skills speak in terms of canonical triage roles. This file is the mapping from those roles to
the label strings this repo's tracker actually holds, and it **owns every rule about applying them**
— other documents point here rather than restating.

The tracker itself is [issue-tracker.md](./issue-tracker.md) (Linear, team `CAN`).

## The roster

All eight exist on team `CAN`. `scripts/check-docs.ts` compares this table against
`orca linear team labels` and fails when they disagree.

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

**Unmapped:** Linear's `Improvement` has no canonical role, so `/triage` will neither apply nor
interpret it. Use it by hand if you want.

The five state roles were created on 8 August 2026 as **workspace-level** labels, so any future team
in the CanonCore workspace inherits them.

```bash
orca linear team labels --team CAN --workspace ad2669ec-93a5-4ce1-97fa-c7d9247a1452 --json
```

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
