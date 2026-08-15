---
status: accepted
---

# The external source is TMDB

The catalogue is populated by importing from a general television database rather than by typing
several hundred records by hand. Two candidates cover the television spine adequately, and
[`docs/research/external-metadata-sources.md`](../research/external-metadata-sources.md) checked
both against their own terms and specifications. **We use TMDB.**

This decision is about the *general* database that seeds a catalogue. It is not about which service
speaks our contract: under [ADR-0014](0014-shell-providers-and-per-source-retention.md) **every**
Source is reached through a Provider, including this one, and TMDB is reached through
`provider-tmdb`.

> **Amended 15 August 2026** by
> [CAN-97 Record the shell architecture, the reachability split and per-Source retention](https://linear.app/jacobrees-canoncore/issue/CAN-97).
> The decision survives; roughly a quarter of the reasoning did not. **All previous TMDB
> correspondence is disregarded entirely** (decision 5 of CAN-96 Record the architecture
> decisions of 15 August, and make the repository agree): there is no retention exception,
> none will be sought, and TMDB is used on its published terms only. That voided two approvals
> rather than one — retention and the GDPR export — so the retention section, the three-weaknesses
> block, the export bullet and every reversal condition resting on the exception are gone, and
> **Fallback** is re-derived on triggers that can actually fire. What replaces the retention
> machinery is per-Source retention in
> [ADR-0014](0014-shell-providers-and-per-source-retention.md).

## Contents

- [What the published terms require](#what-the-published-terms-require)
- [Why TMDB, when it is the worst candidate on retention](#why-tmdb-when-it-is-the-worst-candidate-on-retention)
- [What we accept by choosing it](#what-we-accept-by-choosing-it)
- [Consequences](#consequences)
- [Fallback: TheTVDB](#fallback-thetvdb)

## What the published terms require

Read from the [TMDB API Terms of Use](https://www.themoviedb.org/api-terms-of-use) on 15 August
2026, and quoted in full in
[`source-licence-risk-and-decoupling.md`](../research/source-licence-risk-and-decoupling.md) → *2.
The clause that actually matters*:

- **`§1.C`** forbids caching "for longer than 6 months, any information obtained through or from
  TMDB or the TMDB APIs". A limit on the **age of the copy**, survivable by refreshing each record
  inside the window.
- **`§1.D`** requires that on termination "you must immediately cease all use of the TMDB APIs,
  TMDB Content, and any TMDB API key(s), and you must promptly delete or otherwise purge all TMDB
  Content, including any cached content". **This is the dangerous clause**, because it is an event
  rather than a duration and a revoked key becomes a duty to empty the catalogue.
- **`§1.A`** grants the licence "non-exclusive, non-transferable, non-sublicensable", which is why
  `provider-tmdb` is the one Provider whose endpoint is closed
  ([ADR-0014](0014-shell-providers-and-per-source-retention.md) → *Decision 3*).
- **`§1.B`** makes attribution an *Additional License Condition*, so failing `§3` is a licence
  breach and `§1.D` is the remedy.
- **`§1.C`** also prohibits use "in connection with, including for training, a machine learning (ML)
  or artificial intelligence (AI) based Application". It is not merely a commercial-use trigger, so
  it binds us as we are.

**How this product satisfies them** is not this ADR's job.
[ADR-0014](0014-shell-providers-and-per-source-retention.md) → *Decision 6* records the answer —
`source.retention`, `snapshot.fetched_at`, refresh before expiry, drop what cannot be refreshed —
together with the two traps that make a naive implementation fail silently, and with the honest
statement that `§1.D` has **no representation yet**: nothing detects termination, and a purge would
have to reach `supersededValue` and the audit payloads as well as the Snapshots.

## Why TMDB, when it is the worst candidate on retention

Retention is the axis on which TMDB is worst, and an earlier version of this ADR was unable to say
so: its heading read *"Why TMDB, once retention is not disqualifying"*, which told the section not to
weigh the thing that matters most. Weighed properly:

**TheTVDB is strictly better on retention, and the evidence was already in this file.** Its posture
is the opposite of TMDB's published one: "We strongly recommend maintaining your own copy of the
database or making use of a caching proxy if your end users make direct use of data from TheTVDB."
Its API information page carries **no retention limit and no purge clause**
([research §4](../research/source-licence-risk-and-decoupling.md)). Seven other surveyed sources
impose neither either.

**What outweighs it**, and both reasons rest on public sources rather than on correspondence:

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
artwork (CAN-13 Artwork: uploads, rights and takedown) a rights problem we own outright; choosing
TMDB does not. *This claim is contested:*
research §4 records that the live `api-information` page carries no such language and says the
opposite-adjacent thing about ownership, and lists the discrepancy as the highest-value remaining
gap. It must be resolved before TheTVDB is relied on either way.

**Cost is a wash, and an earlier draft of this ADR got that wrong.** Both are free at this scale:
TMDB's API is "free to use for non-commercial purposes as long as you attribute TMDB", and
TheTVDB's first licensing tier is free for parent-company revenue under $50k/year. The only
difference is friction — a TMDB key is a signup, where TheTVDB wants either a revenue declaration
or a subscription PIN, and scopes the key to one declared project.

**And the architecture now absorbs the retention cost rather than contradicting it.** When this
decision was first taken, a Snapshot was permanent and `§1.C` was irreconcilable with
[ADR-0004](0004-layered-overlay-for-sources-and-edits.md); the exception was what closed the gap.
Per-Source retention closes it without one, so "worst on retention" is a scheduled job and a
tombstone rather than a contradiction. That is what makes the trade above payable at all.

**What this comparison still does not do.** It re-weighs TMDB against TheTVDB, which is the pair the
original research assessed. It does not re-run the comparison against the completed source set —
TVmaze, the Grand Comics Database, Metron and ISFDB were never assessed and all four beat TheTVDB on
exactly this axis. **CAN-94 Re-derive ADR-0009's fallback from the completed source set** owns that,
and until it lands the **Fallback** below is provisional in its target, though not in its triggers.

## What we accept by choosing it

- **Attribution is a product requirement with a prescribed form.** TMDB requires its logo, less
  prominent than our own, plus this notice placed prominently: "This [website, program, service,
  application, product] uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise
  approved by TMDB." The FAQ places attribution in an About or Credits section and requires an
  approved logo. It is a condition of the licence under `§1.B`, and
  [ADR-0014](0014-shell-providers-and-per-source-retention.md) → *Decision 9* is the mechanism that
  discharges it.
- **The free licence is non-commercial**, where commercial means "the primary purpose is to create
  revenue for the benefit of the owner". If CanonCore ever monetises, the licence changes and this
  ADR is reopened.
- **The non-commercial licence carries an AI/ML prohibition** in paragraph 1.C. It is not merely a
  commercial-use trigger, so it binds us as we are.
- **The licence grants no redistribution to third parties.** The terms' restrictions on use,
  display, distribution and redistribution all bind. Providers are not a route around this:
  [ADR-0014](0014-shell-providers-and-per-source-retention.md) has them serving data *into*
  CanonCore, never receiving ours.
- **The GDPR export carries no TMDB fields beyond what the terms already permit.** The written
  approval that once widened it is disregarded, so
  [CAN-30 GDPR export and erasure](https://linear.app/jacobrees-canoncore/issue/CAN-30) is built on
  the published terms alone and its scope is now an open question rather than a settled one. The
  export must in any case be built from the composed read rather than by serialising Snapshot rows,
  which was true under the approval and remains true without it.
- **Identifier churn is real and already anticipated.** ADR-0004 records that TMDB loses roughly 2%
  of movie ids a year with no merge model, serving a 301 before a final 404. That is precisely why
  external ids live on the Snapshot and never on the record — and under per-Source retention it is
  now also why the **daily ID exports** are load-bearing
  ([ADR-0014](0014-shell-providers-and-per-source-retention.md) → *The daily ID exports are the
  oracle for "genuinely gone"*): a 404 that cannot be distinguished from an outage turns 2% a year
  into permanent data loss.
- **Coverage stops at film and television.** Audio drama, novels, comics and magazine strips are
  absent. TheTVDB's audio coverage was a Big Finish series record admitted as a web series — the
  research calls it "a workaround, not a modelled medium" with completeness unverified — so
  nothing real was given up. Audio is MusicBrainz's job when it arrives.
- **Neither source models Versions.** TMDB refuses editorially and says so in public: its
  Contribution Bible states "We currently do not support alternative film versions—including
  extended editions, director cuts, 3D versions and fan cuts of previous films", and "This is also
  true for TV series"
  ([New Content bible](https://www.themoviedb.org/bible/new_content)). TheTVDB has no version
  entity. The Version layer in [ADR-0001](0001-two-levels-story-and-version.md) is ours to populate
  either way.

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
- **More than one Source exists from the start**, so the overlay is exercised rather than
  speculative. ADR-0014's keyless class names five, and ADR-0004 already keys Snapshots per source
  and composes them in a configured order.
- **Retention is established per source and never assumed.** TMDB's position is a prohibition with a
  six-month window and we hold nothing that softens it. A future source is not compatible with the
  Snapshot model until its terms have been read, and "we have always done it" is not a reading. Ask
  whether a record may be kept, and for how long, before assessing coverage or data quality — and
  check for a purge-on-termination clause **by name**, because TMDB is not the only source that has
  one (ISBNdb has the same clause and it is fatal to a permanent catalogue).

## Fallback: TheTVDB

Recorded because the conditions that would reverse this decision are foreseeable, and because
`§1.D` makes the failure cheap for TMDB to trigger and expensive for us.

**Go here if any of these fires.** Each rests on published terms or on observable behaviour; none
rests on correspondence, which is what made the previous list unable to fire.

1. **`§1.D` is exercised** — the key is revoked or access is otherwise terminated. This is the
   realistic trigger and it is administrative rather than legal. TMDB staff are blunt about it:
   *"We kill API keys fairly often as we find out about apps doing bad or illegal things"*
   ([TMDB Talk](https://www.themoviedb.org/talk/65bb413111c066017bd01c3d)).
2. **CanonCore becomes commercial in TMDB's sense**, which changes the licence.
3. **The AI/ML prohibition blocks something the product needs.** `§1.C` binds now, not on
   monetisation, so this can fire without anything else changing.
4. **The six-month refresh cannot be held.** If the sweep cannot keep every Snapshot inside `§1.C`'s
   window at the scale actually reached — rate limits, user growth, the O(users × records) fan-out
   ADR-0014 records — then the copy is unlawful and the Source has to change rather than the
   schedule.
5. **Attribution cannot be delivered in the prescribed form.** `§1.B` makes it a licence condition,
   so this is a `§1.D` trigger wearing a different hat.

**Removed, and why.** The previous list had four triggers and every one of them rested on the
written exception: withdrawal of it, a change to the terms it rested on, a lapse, and "the exception
proves narrower than the reading recorded above". With the correspondence disregarded there is no
exception to withdraw, narrow or reread, so none of them can fire. Only *becomes commercial*
survived, and it survives above.

**The target is provisional.** TheTVDB's posture on storage is the opposite of TMDB's: "We strongly
recommend maintaining your own copy of the database or making use of a caching proxy if your end
users make direct use of data from TheTVDB." It names a per-series default order through
`defaultSeasonType`. A key comes either from the free tier, for parent-company revenue under
$50k/year, or the auto-approved End-User Subscriptions route at $11.99/year, and is valid only for
the one project declared when issued.

What switching would cost: images and trailers are explicitly outside its licence — subject to the
discrepancy recorded above; orderings are seven fixed slots rather than unlimited named groups; and
its attribution must link directly to TheTVDB.com.

**But TheTVDB was selected from an incomplete candidate set.** TVmaze, the Grand Comics Database,
Metron and ISFDB were never assessed, and all four are better than TheTVDB on the exact axis a
fallback exists to protect: no retention limit, no purge clause, and an open licence permitting
public redistribution outright. **CAN-94 Re-derive ADR-0009's fallback from the completed source
set** owns the re-derivation.
