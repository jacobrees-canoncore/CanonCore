---
status: accepted
---

# Undo works on Operations, and the audit trail outlives them

Adding one thing creates many — importing a series creates its episodes, a fork copies a
catalogue, a merge rewrites references — so mistakes are large and everything destructive has to
be undoable. Every mutation is recorded as an **Operation**: one thing a person did, however many
records it touched. Undo reverts an Operation, never a row.

## Considered options

**Row-level soft delete** — meaning **undo at the granularity of a row** — is what is rejected here,
and the `deleted_at` column is not. The column is adopted: *Two retentions, not one* below puts one on
every soft-deleted row. What fails is the row as the *unit of undo*, because undoing a fifty-episode
import then means fifty restores, and a person who imported a series once expects to undo it once.
So an Operation's undo is one update over exactly that column, and the reader who meets
`deleted_at` further down this page is not looking at a reversal *(clarified 17 August 2026 — the
wording here previously read as rejecting the column)*.

**Event sourcing** would allow rebuilding any past state, and is rejected as over-committing. AWS
and microservices.io both warn that the event store is hard to query because ordinary reads must
reconstruct state; and Azure's Architecture Center warns that once a system becomes an event
sourcing system, every later design decision is constrained by it, with a high cost of migrating
to or from it *(re-attributed 16 August 2026 — the sentence previously stood here as a quote of
the first two sources, and belongs to neither)*. This is the rare case
where the expensive choice is the trap rather than the cheap one.

**The Command pattern** is what remains, and it is the standard name for it: turn each request
into a first-class object that can be stored, logged and undone, so undo becomes a stack push.

## Two retentions, not one

The undo buffer and the audit trail are different things with different lifetimes, and collapsing
them is a compliance problem rather than a tidiness one. Real accounts mean UK GDPR, and an
erasure request must be honoured without undue delay and within one month, so an undo buffer
holding personal data indefinitely cannot exist.

- **Undo window: 30 days**, the SaaS norm — `deleted_at` plus a `deletion_scheduled_for`, with an
  automated hard delete or anonymisation at the end.
- **Audit entries outlive it**, surviving erasure by scrubbing the payload while keeping the fact:
  what happened, when, and by what process. That is the proof of compliance, and it is a separate
  table.
- **Erasure reaches into other users' forks, bounded.** Fork-snapshots whose Source is the erased
  person are anonymised by the same job: attribution severed, their authored prose (Arguments)
  deleted, factual fields kept — [ADR-0004](0004-layered-overlay-for-sources-and-edits.md) → *A
  person is a Source* records the reasoning. Settled 13 August 2026, CAN-73 Settle the Snapshot
  layer.

## Consequences

- An import, a fork and a merge are each one Operation carrying a batch id, so each is one undo.
- **Undoing an import leaves Overrides orphaned rather than destroying them.** They live in a
  different table from Snapshots (ADR-0004), so removing Snapshots cannot touch them, and they
  reattach if the import is repeated. This is not a special case; it is the schema working.
- Batches need a ceiling. One Operation covering hundreds of thousands of Placements is a restore
  rather than an undo, so bulk imports are batched per ordering.
- Deletion **by a Source** is never an Operation and never a local delete: it sets `liveness` on
  one Snapshot row (ADR-0004).
