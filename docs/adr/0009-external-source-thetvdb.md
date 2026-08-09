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

Note the shape of this argument. It is not that TMDB is worse data — it is that TMDB's terms and our
storage model are incompatible, and the storage model is already decided.

## A source-declared default order

`defaultSeasonType` is present on TheTVDB's series record and holds the id of the order that series
treats as its own default. TMDB's series response carries no episode-group field at all, so choosing
among Doctor Who's five episode groups would be our adjudication rather than something read from the
data.

The founding case wants broadcast order to arrive as data. An adjudication is a position we would
then have to defend on a public page, which is the opposite of what an imported ordering should be.

## The shape matches how we model orderings

In TheTVDB an order owns its own named seasons as addressable records carrying a type, and an
episode lists the several typed seasons it belongs to. That is position carried on the membership,
which is what [ADR-0002](0002-orderings-are-separate-from-containment.md) requires. TMDB's
sub-groups are named, but they are anonymous members of a single group with no independent identity.

## What we accept by choosing it

- **A key is a human prerequisite.** Either the free commercial tier (parent-company revenue under
  $50k/year) or the auto-approved End-User Subscriptions route with a personal subscription PIN. The
  licence makes a key valid only for the one project declared when it was issued.
- **Attribution is a product requirement, not a README line.** TheTVDB requires attribution with a
  direct link to TheTVDB.com to be displayed to end users viewing metadata from the API. It
  therefore appears on the public page.
- **The licence does not cover displaying images or trailers**, in capitals in the terms. This costs
  nothing: artwork is out of scope for v1 and nothing is imported.
- **No rate limit is published.** The only governing text prohibits "excessive calls to the API, as
  determined by us", so the importer is sequential and throttled rather than parallel.
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
- **One Source exists, and the schema is built for more.** Snapshots are keyed per (record, Source)
  and the composed read picks by configured Source order. Adding a second source is rows, not a
  rewrite.
- **Retention is a per-source property.** The two candidates' terms point in opposite directions, so
  a future source has to be checked rather than assumed compatible with the Snapshot model. That
  check is this ADR's first section, generalised.
