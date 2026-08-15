---
status: accepted
---

# Undo works on Operations, and the audit trail outlives them

Adding one thing creates many — importing a series creates its episodes, a fork copies a
catalogue, a merge rewrites references — so mistakes are large and everything destructive has to
be undoable. Every mutation is recorded as an **Operation**: one thing a person did, however many
records it touched. Undo reverts an Operation, never a row.

## Considered options

**Row-level soft delete** gives every row a `deleted_at`. Simple, and useless for the actual
failure: undoing a fifty-episode import means fifty restores.

**Event sourcing** would allow rebuilding any past state, and is rejected as over-committing. AWS
and microservices.io both warn that the event store is hard to query because ordinary reads must
reconstruct state, and that "once your system becomes an event sourcing system, all future design
decisions are constrained by it, with a high cost to migrate to or from it". This is the rare case
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
