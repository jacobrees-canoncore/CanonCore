---
status: accepted
---

# Layered overlay: source snapshots, owner overrides, and a person as a Source

Metadata arrives from several external sources that disagree, over the top of things the owner has
edited by hand, and neither may destroy the other. We store **one row per (record, source) holding
that source's last-seen values verbatim**, plus **one row per field the owner has actually
overridden**, and compose them on read. The displayed record is derived and never written directly.

## Contents

- [Why not the obvious alternatives](#why-not-the-obvious-alternatives)
- [What the overlay buys](#what-the-overlay-buys)
- [Identity and liveness](#identity-and-liveness)
- [Retention is a property of the Source](#retention-is-a-property-of-the-source)
- [The key is per-user, deliberately](#the-key-is-per-user-deliberately)
- [A person is a Source](#a-person-is-a-source)

## Why not the obvious alternatives

Plex locks a field with a per-(item, field) boolean. Jellyfin has an array of nine hardcoded
lockable fields plus a stronger item-level lock. **Neither stores provenance**, so neither can tell
you what the source now says, and Jellyfin cannot answer "revert this field to what TMDb said".
Sonarr and Radarr have no overrides at all: the provider owns metadata and the user owns disjoint
fields, which Radarr promotes into a table split.

Kubernetes Server-Side Apply is the rigorous field-provenance implementation, and its own KEP notes
`managedFields` can reach "up to 60% of the total size of an object". It stores paths, not prior
values, so it arbitrates rather than merges — and it buys something only when multiple *machine*
writers contend for one field, which is not this situation.

## What the overlay buys

- **Nothing is destroyed in either direction.** Snapshots are written only by the fetcher,
  overrides only by their owner. Disjoint tables, enforced by schema rather than by discipline.
- **Disagreement is representable rather than resolved.** Both snapshots exist; the composed view
  picks by configured source order, and the loser can still be shown.
- **Revert is deleting a row** — the operation neither Plex nor Jellyfin can perform at all.
- **`supersededValue` is the merge base.** Storing the composed value at the moment of override
  gives dpkg's two booleans (did the user change it, did the source change it) and therefore the
  four-cell table. Where both moved, the default is to keep the owner's value and surface that the
  source has moved. Cost is one column on the rows actually edited.

## Identity and liveness

Local ids are sovereign and external ids live on the snapshot, never on the record. Sonarr removed
its unique TVDB episode id in 2013 over renumbering and refused to reinstate it in 2023 because
records "often saw things deleted and recreated". TMDb loses roughly 2% of movie ids a year with no
merge model and serves a 301 before a final 404.

**A source ceasing to carry something sets `liveness` on one snapshot row. It is never a local
delete.** Sonarr's `DeleteMany(existingEpisodes)` has no guard, so a provider returning a
well-formed empty list wipes every local episode; there is a test pinning that behaviour.

## Retention is a property of the Source

> **Amended 15 August 2026** by
> [CAN-97 Record the shell architecture, the reachability split and per-Source retention](https://linear.app/jacobrees-canoncore/issue/CAN-97).
> A Snapshot was permanent when this ADR was written, because
> [ADR-0009](0009-external-source-tmdb.md) rested on a written retention exception. That
> correspondence is disregarded entirely, so permanence is gone and **retention becomes a property
> of each Source**: `source.retention`, `snapshot.fetched_at`, refresh before expiry, drop what
> cannot be refreshed. The decision, its traps and what it does **not** fix are
> [ADR-0014](0014-shell-providers-and-per-source-retention.md) → *Decision 6*.

**This ADR's two rules survive per Source rather than universally.**

- **Verbatim.** A Snapshot still holds what that Source last said, unedited, for as long as that
  Source's retention allows. What changes is the "for as long as", not the "unedited".
- **Never a local delete.** A Source ceasing to carry something still sets `liveness` and still
  never deletes a local row. What may now delete one is the **clock** — a fact about the age of our
  copy rather than about the shape of a response — and only where the Source's own retention is
  finite.

The distinction matters because it is the whole guard against becoming Sonarr's
`DeleteMany(existingEpisodes)` above. A provider outage, a rate-limit wall and a genuine deletion at
the Source are all "cannot be refreshed", and ADR-0014 records what separates them and what happens
to the row when it goes (a tombstone, not a hole).

**Four things per-Source retention does not fix**, each recorded in ADR-0014 rather than here
because none of them is settled: the composed read has no floor when the only Source expires;
`supersededValue` is a verbatim copy of Source content sitting in the **override** table, outside
the retention machinery entirely; "a person is a Source" attaches retention to the conduit when the
obligation attaches to the origin, so a fork launders finite retention into indefinite; and the
per-user key below turns what was storage cost into obligation cost.

## The key is per-user, deliberately

`(record, source)` hangs every snapshot off the owner's record, so snapshots are per-user rows and
carry row-level security like everything else user-scoped — one uniform rule, one cross-tenant
test shape ([ADR-0005](0005-stack.md)). Deduplicating external data into a shared per-Anchor table
was considered and rejected (13 August 2026, CAN-73 Settle the Snapshot layer): see
[ADR-0003](0003-no-shared-catalogue.md)'s consequences for the reasons.

## A person is a Source

Forking someone else's public records creates a snapshot whose source is that person. Their later
changes arrive as a new snapshot; yours are overrides. **Divergence is surfaced and never applied
automatically.** Every platform that ships forking without an upstream path is asked for one
forever and does not build it. This one gets it free, because it is the same machinery.

**GDPR bounds "nothing is destroyed" here.** When the person behind a Source is erased
([ADR-0008](0008-operations-and-undo.md)), fork-snapshots sourced from them are **anonymised, not
kept whole and not fully deleted**: the attribution is severed to an opaque tombstone, their
authored prose — Arguments — is deleted from the snapshot values, and factual fields (titles,
runtimes, positions) remain, since facts stop being personal data once de-attributed. The forker
keeps structure, facts and all of their own overrides; the person is gone. Settled 13 August 2026
(CAN-73); CAN-30 GDPR export and erasure implements the job, CAN-9 Fork and divergence creates the
rows it will one day act on.

**Retention is the unsolved half of this section.** A fork's Source is the *person*, whose retention
is indefinite, but the values may have originated at a Source whose retention is not — so the
factual fields this section preserves can outlive the obligation attached to where they came from.
Named as unresolved in
[ADR-0014](0014-shell-providers-and-per-source-retention.md) → *What per-Source retention does not
fix*, with the two candidate answers.
