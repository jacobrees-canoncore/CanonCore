# Triage Labels

The skills speak in terms of canonical triage roles. This file maps those roles to the actual
label strings used in this repo's issue tracker (Linear, team `CAN` — see
[issue-tracker.md](./issue-tracker.md)).

## Category roles

Exactly one per triaged issue. These map onto labels Linear created by default, so they
already exist.

| Label in mattpocock/skills | Label in our tracker | Meaning                    |
| -------------------------- | -------------------- | -------------------------- |
| `bug`                      | `Bug`                | Something is broken        |
| `enhancement`              | `Feature`            | New feature or improvement |

## State roles

Exactly one per triaged issue that is still waiting to be worked — see **Landed issues**
below for the one case where none applies.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

## Prerequisite: create the five state roles in Linear first — human-only

**None of the five exist on team `CAN` yet.** The team currently has `Feature`, `Bug` and
`Improvement` and nothing else.

`orca linear` can add and remove labels on an issue but cannot *create* a label definition,
so applying one that doesn't exist fails. **An agent cannot do this step.** Create all five in
the Linear web UI before running `/triage`, using the exact lowercase strings above — Linear
label matching is exact.

Create them as **workspace-level** labels rather than team-level, as Waveger does, so any
future team in the CanonCore workspace inherits them.

```bash
orca linear team labels --team CAN --workspace ad2669ec-93a5-4ce1-97fa-c7d9247a1452 --json
```

## Landed issues carry no state role

When a PR merges, remove whichever state role the issue carries and add nothing back, leaving
only the category label. Correct, not an oversight.

None of the five means "done". Triage routes work that has **not** been done — to a human, to
an agent, back to the reporter, or to nowhere — and a merged ticket needs no routing. Leaving
`ready-for-agent` on one is a standing invitation to pick up work that is already in
production. Delivery progress lives in Linear's workflow state instead, which is the axis that
has a `Done`.

Read the issue's labels before removing one. It is `ready-for-agent` most of the time and
`ready-for-human` or `needs-info` often enough to matter, and removing a label the issue does
not carry leaves the real one in place.

## Notes

- Linear's `Improvement` label is **unmapped** — it has no canonical role, so `/triage` will
  neither apply nor interpret it. Use it by hand if you want.
- Triage state lives in **labels**, not workflow states. `needs-info` and `ready-for-agent`
  have no workflow-state equivalent, and the workflow states are already carrying delivery
  progress. `needs-triage` looks like `Backlog` and `wontfix` looks like `Canceled`, but a
  ticket needs to be able to sit in `Todo` while labelled `ready-for-agent`.
- Change labels with `label add` / `label remove`, never `label set` — it replaces the entire
  set and would drop the category label. A state transition is two calls.
- Labels sync two ways to GitHub Issues once the GitHub integration is wired, so a label
  applied here shows up there and vice versa.
- `wayfinder:map` and `wayfinder:<type>` labels, if `/wayfinder` is used, need creating the
  same way.

Edit the right-hand columns to match whatever vocabulary you actually use.
