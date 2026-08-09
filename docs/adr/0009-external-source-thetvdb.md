# The external source is TheTVDB

The catalogue is populated by importing from a general television database rather than by typing
several hundred records by hand. Two candidates cover the television spine adequately, and
[`docs/research/external-metadata-sources.md`](../research/external-metadata-sources.md) checked
both against their own terms and specifications. **We use TheTVDB.**

This decision is about the *general* database that seeds a catalogue. It says nothing about
Providers, which are third-party services speaking our own contract
([ADR-0007](0007-provider-contract.md)) and are added by pasting in a URL.

## Retention decides it on its own

TMDB's API terms forbid caching "for longer than 6 months, any information obtained through or from
TMDB or the TMDB APIs", and require that on termination "you must promptly delete or otherwise purge
all TMDB Content".

[ADR-0004](0004-layered-overlay-for-sources-and-edits.md) makes a Snapshot a permanent, verbatim
record of what a Source last said, and states that a Source ceasing to carry something sets
`liveness` on one row and is **never** a local delete. A source whose licence obliges us to delete
what we hold cannot live in that table without contradicting the reason the table exists.

TheTVDB points the other way in its own best-practice guidance: "We strongly recommend maintaining
your own copy of the database or making use of a caching proxy if your end users make direct use of
data from TheTVDB."

This is not a claim that TMDB is worse data. It is that TMDB's terms and our storage model are
incompatible, and the storage model was decided first.

The research marks one detail **unverified**: whether a row that is refreshed counts as having been
cached beyond six months. The incompatibility does not depend on it. The termination clause above is
unambiguous on its own, and a Snapshot that must be purged on termination is not permanent.

## A source-declared default order

`defaultSeasonType` is present on TheTVDB's series record and holds the id of the order that series
treats as its own default.

TMDB has episode groups — Doctor Who has five — but nothing that marks one as the series' own. The
`/3/tv/{series_id}` response carries no episode-group field, so there is no default to read.
Choosing among the five would be our adjudication rather than something taken from the data, and an
adjudication is a position we would then have to defend on a public page. An imported ordering
should be the source's claim, not ours.

## What we accept by choosing it

- **A key is a human prerequisite.** Either the free commercial tier (parent-company revenue under
  $50k/year) or the auto-approved End-User Subscriptions route with a personal subscription PIN. The
  licence makes a key valid only for the one project declared when it was issued.
- **Attribution is a product requirement, not a README line.** TheTVDB requires attribution with a
  direct link to TheTVDB.com to be displayed to end users viewing metadata from the API. It
  therefore appears on the public page.
- **The licence does not cover displaying images, trailers or programming**, in capitals in the
  terms, which leaves securing those rights to us. This costs nothing today: artwork is its own
  piece of work with its own rights and takedown questions (CAN-13) and is not in the first
  release, so nothing imports it.
- **No rate limit is published**, so there is no number to code against — only a prohibition on
  "excessive calls to the API, as determined by us". An importer has to be conservative by default,
  because the limit is discovered by exceeding it.
- **TMDB is the richer ordering model, and we lose that.** Both sources put the ordinal on the
  membership rather than on the work, so neither has an advantage on the shape
  [ADR-0002](0002-orderings-are-separate-from-containment.md) requires. Where they differ, TMDB is
  ahead: it allows unlimited named groups, each sub-group carrying its own id and name, while
  TheTVDB has exactly seven slots per series whose display names are per-series overrides. The
  research calls TMDB Episode Groups "the closest existing model to named phases". Retention
  outweighs it, and the loss is bounded because Orderings are authored here rather than imported —
  only the one imported broadcast Ordering is affected.
- **Neither source models Versions**, so nothing was given up here. TMDB refuses in writing and
  TheTVDB has no version entity. The Version layer in
  [ADR-0001](0001-two-levels-story-and-version.md) is ours to populate either way.

## Consequences

- **The imported broadcast Ordering carries no Phases.** TheTVDB's seasons of the default order are
  the broadcast seasons, which are already modelled as Stories with `part of` edges. `CONTEXT.md`
  defines a Phase as the Ordering's own grouping, not corresponding to seasons or to any broadcast
  structure, so mirroring seasons as Phases would contradict the glossary.
- **An episode record's numbers are not the queried order's numbers.** Per TheTVDB's own README,
  `seasonNumber`, `number` and `absoluteNumber` on a bare episode record are that episode's
  information within the series' *default* order. Reading them as the position in whichever order
  was requested produces a silently wrong Ordering, so position comes from the order actually
  queried.
- **One Source exists, and the schema is built for more.** The overlay in
  [ADR-0004](0004-layered-overlay-for-sources-and-edits.md) already keys Snapshots per source and
  composes them in a configured order, so adding a second source is rows rather than a rewrite.
- **Retention has to be checked per source.** The two candidates' terms point in opposite
  directions, so a future source is not compatible with the Snapshot model until its terms have
  been read. Whether it permits keeping a record indefinitely is the question to ask first, before
  any assessment of coverage or data quality.
