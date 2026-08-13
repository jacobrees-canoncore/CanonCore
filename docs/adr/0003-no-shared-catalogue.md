# No shared catalogue: Anchors, per-user records, per-user merge

CanonCore is multi-user, but there is **no shared catalogue**. Each person's Stories, Versions and
Orderings are their own rows, which nobody else can edit.

Sharing works through an **Anchor**: a shared identity carrying no metadata at all — no title, no
year, no artwork. Separate people's Stories attach to the same Anchor when they are about the same
thing, and Placements point at Anchors rather than at anyone's rows.

## Why this shape

The obvious alternative is one canonical catalogue with an edit pipeline, which is what
MusicBrainz runs: edits queue, trusted editors auto-apply, others stay open a week, three
unanimous votes resolve immediately, voting unlocks after two weeks and ten accepted edits. It
works, and it needs a community to work. A voting quorum with one user is theatre.

The Anchor removes the problem rather than solving it. Because an Anchor holds nothing, **there is
nothing to edit, so there is nothing to moderate** — no queue, no votes, no trust levels, no
default. And a Placement pointing at an Anchor resolves against whichever records the *viewer*
has, so a published Ordering shows the reader their own ownership and progress rather than a list
of references into a stranger's account.

## Minting and merging

Anchors are minted by anyone, with **suggested matches offered at creation time** — the standard
move in every crowd-catalogued database, and the only moment a person has the context to judge.
Where a source has a stable identifier the match is determined; where none exists, which is
exactly the material this product is for, it is a suggestion.

**Merges are per-user and reversible.** A merge is one person's assertion that two Anchors are the
same thing, held as an alias rather than a rewrite, undone by discarding it.

## Consequences

- Anchors are not globally unified identity. If one person merges two and another does not, they
  see different things — and both continue to work, because the alias resolves per viewer.
- Duplicates are never cleaned up globally and the Anchor space slowly fragments. An escape exists
  if it ever matters: when enough people independently make the same merge, suggest it globally.
  Consensus-derived, still no moderators.
- **The shared layer is Anchors, and nothing else.** Snapshots are per-user rows keyed on the
  owner's record ([ADR-0004](0004-layered-overlay-for-sources-and-edits.md)'s `(record, source)`),
  and overrides are per-person, so no one can damage anyone else's view — the multi-tenant property
  falls out of the overlay rather than being added to it. An earlier draft of this bullet said "the
  shared layer is source data only", which read as a shared snapshot table; settled the other way
  on 13 August 2026 (CAN-73 Settle the Snapshot layer): deduplicating external data per Anchor was
  rejected because it puts person-forks in a shared table, hardens erasure, and makes the
  Anchor↔external-id mapping global truth, which this ADR's per-viewer merges forbid. The cost —
  the same TMDB payloads stored once per importing user — is storage, not legality, since the
  retention exception is project-wide.
