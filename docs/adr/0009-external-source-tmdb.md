# The external source is TMDB

The catalogue is populated by importing from a general television database rather than by typing
several hundred records by hand. Two candidates cover the television spine adequately, and
[`docs/research/external-metadata-sources.md`](../research/external-metadata-sources.md) checked
both against their own terms and specifications. **We use TMDB.**

This decision is about the *general* database that seeds a catalogue. It says nothing about
Providers, which are third-party services speaking our own contract
([ADR-0007](0007-provider-contract.md)) and are added by pasting in a URL.

## Retention: the published answer is no, and we hold an exception

TMDB's published API terms forbid caching "for longer than 6 months, any information obtained
through or from TMDB or the TMDB APIs", and require that on termination "you must promptly delete
or otherwise purge all TMDB Content".

Read literally, that is irreconcilable with this product.
[ADR-0004](0004-layered-overlay-for-sources-and-edits.md) makes a Snapshot a permanent, verbatim
record of what a Source last said, and states that a Source ceasing to carry something sets
`liveness` on one row and is **never** a local delete. A Snapshot that must be purged is not a
Snapshot.

**TMDB has approved indefinite retention for this project.** Recorded 9 August 2026 on the project
owner's statement; the written approval is to be attached to CAN-33. Everything below assumes it.

This is the one load-bearing claim in this ADR that does not cite a document, and it is flagged
rather than buried because everything else here does cite one. If the approval lapses, is not
renewed, or proves narrower than understood, the decision inverts — see **Fallback** below, which
exists so that inversion is a lookup rather than a fresh investigation.

## Why TMDB, once retention is not disqualifying

Two reasons, and cost is not one of them — see below.

**The ordering model is the best available.** TMDB allows unlimited episode groups, each carrying a
type — `5` is literally "Story arc" — and each sub-group within a group carries its own `id`,
`name`, `order` and `episodes[]`. Doctor Who already has five groups, three of them story-arc, with
named sub-groups like "First Doctor".
[`versions-and-orderings-prior-art.md`](../research/versions-and-orderings-prior-art.md) calls
Episode Groups "the closest existing model to named phases". TheTVDB offers seven fixed slots per
series whose display names are per-series overrides, which cannot express a new named ordering
without consuming one.

**Images are covered by the same attribution regime as the metadata.** TheTVDB's terms state in
capitals that its API licence does not authorise using or displaying images, trailers or
programming, and leaves securing those rights to the consumer. Choosing TheTVDB would have made
artwork (CAN-13) a rights problem we own outright; choosing TMDB does not.

**Cost is a wash, and an earlier draft of this ADR got that wrong.** Both are free at this scale:
TMDB's API is "free to use for non-commercial purposes as long as you attribute TMDB", and
TheTVDB's first licensing tier is free for parent-company revenue under $50k/year. The only
difference is friction — a TMDB key is a signup, where TheTVDB wants either a revenue declaration
or a subscription PIN, and scopes the key to one declared project.

## What we accept by choosing it

- **Attribution is a product requirement with a prescribed form.** TMDB requires its logo, less
  prominent than our own, plus this notice placed prominently: "This [website, program, service,
  application, product] uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise
  approved by TMDB." The FAQ places attribution in an About or Credits section and requires an
  approved logo.
- **The free licence is non-commercial**, where commercial means "the primary purpose is to create
  revenue for the benefit of the owner". If CanonCore ever monetises, the licence changes and this
  ADR is reopened.
- **The non-commercial licence carries an AI/ML prohibition** in paragraph 1.C. It is not merely a
  commercial-use trigger, so it binds us as we are.
- **Identifier churn is real and already anticipated.** ADR-0004 records that TMDB loses roughly 2%
  of movie ids a year with no merge model, serving a 301 before a final 404. That is precisely why
  external ids live on the Snapshot and never on the record; choosing TMDB makes that existing
  decision load-bearing rather than precautionary.
- **Coverage stops at film and television.** Audio drama, novels, comics and magazine strips are
  absent. TheTVDB's audio coverage was a Big Finish series record admitted as a web series — the
  research calls it "a workaround, not a modelled medium" with completeness unverified — so
  nothing real was given up. Audio is MusicBrainz's job when it arrives.
- **Neither source models Versions.** TMDB refuses in writing; TheTVDB has no version entity. The
  Version layer in [ADR-0001](0001-two-levels-story-and-version.md) is ours to populate either way.

## Consequences

- **Broadcast order is the canonical episode set, not an episode group.** TMDB stores one episode
  set in original air order as editorial policy — "episodes should be added as they first aired on
  their original channel", and "Please do not ask us to change the episodes to a non-original
  order. There is an 'Episode Group' feature that can be used for all and any alternative orders."
  Doctor Who's five groups are DVD, Digital and three Story Arc; none is an air-date group. So the
  import reads seasons and episode numbers directly and no adjudication is required. Note this is
  editorial policy rather than a schema guarantee — nothing in the API enforces it. `/3/tv/{id}`
  carries no episode-group field either, so if an *alternative* ordering is ever imported the
  choice among the five is ours to make and record. This is the
  point on which TheTVDB's `defaultSeasonType` looked like an advantage; it is not one.
- **The imported broadcast Ordering carries no Phases.** Its groupings are the broadcast seasons,
  already modelled as Stories with `part of` edges. `CONTEXT.md` defines a Phase as the Ordering's
  own grouping, not corresponding to seasons or to any broadcast structure, so mirroring seasons as
  Phases would contradict the glossary.
- **One Source exists, and the schema is built for more.** The overlay in ADR-0004 already keys
  Snapshots per source and composes them in a configured order, so adding a second source is rows
  rather than a rewrite.
- **Retention has to be established per source, not assumed.** TMDB's default position is a
  prohibition and we hold an exception to it. A future source is not compatible with the Snapshot
  model until its terms have been read, and "we have always done it" is not a reading. Ask whether
  a record may be kept indefinitely before assessing coverage or data quality.

## Fallback: TheTVDB

Recorded because this decision rests on a project-specific exception rather than on public terms,
so the conditions that would reverse it are foreseeable.

**Go here if** the TMDB approval lapses, is not renewed, proves narrower than understood, or
CanonCore becomes commercial in TMDB's sense.

TheTVDB's posture on storage is the opposite of TMDB's published one: "We strongly recommend
maintaining your own copy of the database or making use of a caching proxy if your end users make
direct use of data from TheTVDB." It names a per-series default order through `defaultSeasonType`.
A key comes either from the free tier, for parent-company revenue under $50k/year, or the
auto-approved End-User Subscriptions route at $11.99/year, and is valid only for the one project
declared when issued.

What switching would cost: images and trailers are explicitly outside its licence; orderings are
seven fixed slots rather than unlimited named groups; and its attribution must link directly to
TheTVDB.com.
