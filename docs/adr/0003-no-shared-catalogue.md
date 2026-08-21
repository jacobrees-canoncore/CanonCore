---
status: accepted
---

# No shared catalogue: Anchors, per-user records, per-user merge

CanonCore is multi-user, but there is **no shared catalogue**. Each person's Stories, Versions and
Orderings are their own rows, which nobody else can edit.

Sharing works through an **Anchor**: a shared identity carrying no metadata at all — no title, no
year, no artwork. Separate people's Stories attach to the same Anchor when they are about the same
thing, and Placements point at Anchors rather than at anyone's rows.

## Why this shape

The obvious alternative is one shared catalogue with an edit pipeline, which is what
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

**Merges are per-user and reversible.** A Merge is one person's assertion that two Anchors are the
same thing, held beside them rather than as a rewrite of either, undone by discarding it.

## Consequences

- Anchors are not globally unified identity. If one person merges two and another does not, they
  see different things — and both continue to work, because a Merge resolves per viewer.
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
  the same TMDB payloads stored once per importing user — is **storage and obligation, and the
  second half is the larger**: under TMDB's published terms each copy carries its own `§1.C`
  six-month clock and its own `§1.D` purge duty, so refresh is O(users × records), a missed refresh
  is a breach rather than a stale cache, dormant users hold rows nobody will refresh, and a purge
  fans out across every tenant. **The conclusion is unaffected** — it stands on the three reasons
  named above, none of which touches cost. *Amended 15 August 2026 (CAN-97 Record the shell
  architecture, the reachability split and per-Source retention): this clause read "storage, not
  legality, since the retention exception is project-wide", and both halves were false. There is no
  exception ([ADR-0009](0009-external-source-tmdb.md)), and duplication multiplies obligations
  rather than only bytes.* *Amended again 16 August 2026 (CAN-102 Give Source a retention policy,
  and Snapshot a fetched-at): **"the shared layer" means the catalogue, and one table now sits
  outside it.** `source` holds one row per Source carrying that Source's retention terms, shared by
  everyone and under no policy —
  [ADR-0014](0014-shell-providers-and-per-source-retention.md) → *Decision 6*. It is not an Anchor
  and it is not a counter-example: it holds nothing anybody recorded, so there is no view of
  anyone's for it to damage and nothing on it to edit or moderate, which are the two properties
  this bullet exists to protect.*
