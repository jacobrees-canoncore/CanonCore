---
status: accepted
---

# The Provider contract: five read-only endpoints, versioned in the URI, declaring what it obliges

Every Source is reached through a Provider, so the contract is the only ingress and everything the
application honours has to arrive through it. Version 1 is five `GET` endpoints published as an
OpenAPI document — [`docs/provider-contract/v1/openapi.yaml`](../provider-contract/v1/openapi.yaml)
— whose first endpoint is a **capability declaration** carrying the retention limit, the licence,
the attribution obligation including *none*, the usage restrictions, the classification vocabulary
and what this Provider can prove about a record that has stopped answering.

> **Landed 17 August 2026** under
> [CAN-7 Provider contract: define and publish it](https://linear.app/jacobrees-canoncore/issue/CAN-7).
> **The YAML file is normative and this document is not**: what a Provider must do is written
> there, and what is written here is why, and what was rejected on the way. Where they disagree the
> file wins, and one of them is wrong.
>
> [ADR-0014](0014-shell-providers-and-per-source-retention.md) → *What survives of ADR-0007* is the
> brief this is built to. It supersedes [ADR-0007](0007-provider-contract.md), keeps the paste-a-URL
> shape, the version in the URI, the capability endpoint, a real parameter surface and a published
> spec, and refuses Audiobookshelf's schema.

## Contents

- [Where the contract lives, and what publishing it means](#where-the-contract-lives-and-what-publishing-it-means)
- [Decision 1 — five endpoints, all `GET`](#decision-1--five-endpoints-all-get)
- [Decision 2 — the capability declaration, where absence is refusal](#decision-2--the-capability-declaration-where-absence-is-refusal)
- [Decision 3 — a record answers with its whole containment chain](#decision-3--a-record-answers-with-its-whole-containment-chain)
- [Decision 4 — three liveness values, and who is allowed to say `gone`](#decision-4--three-liveness-values-and-who-is-allowed-to-say-gone)
- [Decision 5 — Orderings are in version 1](#decision-5--orderings-are-in-version-1)
- [Decision 6 — additive-only, with feature declarations instead of version negotiation](#decision-6--additive-only-with-feature-declarations-instead-of-version-negotiation)
- [Standards taken rather than invented](#standards-taken-rather-than-invented)
- [What version 1 deliberately cannot express](#what-version-1-deliberately-cannot-express)
- [Consequences](#consequences)

## Where the contract lives, and what publishing it means

**The document is `docs/provider-contract/v1/openapi.yaml`, and the repository is the publication.**
The repository is public, so the file is reachable by anyone who is going to implement against it,
and the directory carries the major version so a second one is a sibling rather than a rewrite.

**Rejected: an npm package.** It is the obvious way to hand a contract to another repository, and it
buys nothing yet — no Provider exists to consume it, and `CLAUDE.md` refuses a package boundary
before a second consumer does. A Provider repository vendors or fetches the file until that changes.

**Rejected: serving it from `www.canoncore.com`.** A machine-readable contract at a stable product
URL is the tidy answer, and it collides with
[`docs/infrastructure.md`](../infrastructure.md) → *The URL-sharing gate*: the address is
deliberately not shared, so publishing *at* it would be publishing where nobody has been invited.
The gate opening is what would reverse this, not a new argument.

**Its gate is a test rather than a `check-docs` check.**
[`scripts/provider-contract.test.ts`](../../scripts/provider-contract.test.ts) validates the
document against the OpenAPI meta-schema, validates every example against the schema it
illustrates, and reads `CONTEXT.md` to check that every closed vocabulary is still the one the
glossary defines.

**Most of `check-docs.ts` compares a document against a source that can be unreachable**, so those
checks report SKIP rather than failing a build over an outage. This one compares a file against a
schema shipped inside a dependency: nothing to be unreachable, so nothing to skip. The precedent is
that script's own ninth check, which gates `CLAUDE.md` against the target in its maintainer comment
and is documented there as the one that "can never be a SKIP" for the same reason — its source is
the file it gates.

## Decision 1 — five endpoints, all `GET`

`/capabilities`, `/records` (search), `/records/{recordId}`, `/orderings` and
`/orderings/{orderingId}`. Nothing writes, so a Provider is never asked to hold anything and there
is no state for a stranger's service to lose.

**A real parameter surface is one of the three things ADR-0007 set out to fix**, and the fix is not
only *having* parameters. `/records` takes `q`, `type`, `medium`, `year`, `language`, `limit` and
`cursor` — and **a Provider that cannot honour one refuses the request with `400`**. That rule is
the actual repair: Audiobookshelf's contract has two declared parameters, so its community
providers smuggle configuration into the URL path (`/audioteka/lang:pl`), and a thin contract
relocates configuration somewhere unvalidated rather than removing it
([research](../research/audiobookshelf-provider-contract.md)). A Provider that silently ignored a
parameter would leave a consumer believing a filter applied.

**Rejected: one endpoint, as Audiobookshelf has.** Its `GET /search` is the whole contract, which is
why a client cannot discover anything, cannot fetch a record it already knows the identifier of, and
cannot walk a containment chain.

**And the upside of matching it is smaller than it reads, which the audit of 13 August 2026 asked to
have restated before anything was designed for it.** It means "~13 self-hosted audiobook-shaped
providers, two with public addresses" ([audit](../research/tracker-and-repository-audit.md) §5).
Audiobook-shaped is the operative word: none of them serves television, comics or audio drama, and
none can express an Ordering, so what compatibility would inherit is a set of Sources this product
does not catalogue. It is not a reason to shape anything here — and where an
Audiobookshelf-compatible Provider is still wanted, ADR-0014 puts it in a repository of its own like
every other, translating that contract into this one rather than this one bending toward it.

**Rejected: GraphQL.** It answers the graph-shaped question well and costs a Provider a schema
server, resolvers and query-cost defence to implement — against a consumer that asks four questions
in total. The self-hostability that makes this contract additive-only also makes it something a
person must be able to implement in an afternoon.

## Decision 2 — the capability declaration, where absence is refusal

**One rule governs every optional block: its absence means the Provider does not do that thing, and
a consumer refuses accordingly.** A declaration cannot be read as a default, because the two
readings differ exactly where it matters — a Provider that has said nothing about classification is
not a Provider that has said there is nothing to classify.

ADR-0014 → *What survives of ADR-0007* names five things the endpoint has to carry. Where each one
landed:

| ADR-0014's item | In the contract |
| --- | --- |
| Retention policy | `retention`, an ISO 8601 duration or `indefinite`, **required** |
| Required attribution, including a logo | `attribution` (**required**) and `licence`, plus `authors` and `sourceUrl` on each record |
| Usage restrictions | `restrictions` (**required**, `[]` for none), an open vocabulary reserving `non-commercial` and `no-ai-training` |
| Content classification | `classification.vocabulary`, each term declaring what it obliges |
| A source-scoped identifier with liveness semantics | **Split across both halves** — see below |

**The fifth item is the only one that is not a single field, and the split is deliberate.** An
identifier is per record and cannot live in a declaration, so what the declaration carries is the
*semantics*: `source.id`, which scopes the identifier space and says a consumer must not read two
Providers' identifiers as the same, and `liveness.confirmsDeletion`, which says what the strongest
liveness value is worth here. The identifier itself is `Record.id` and the value is
`Record.liveness`. Read as "five fields on `/capabilities`" the item is unsatisfiable; read as
"five things that arrive through the contract" it is discharged, and the second is what ADR-0014's
own sentence says — *anything the application must honour has to arrive through the contract*.

**What is required is what the Source's terms say; what is optional is what the Provider does.**
That is the whole rule, and it puts `restrictions` with `retention` and `attribution` rather than
with the feature blocks. All three are facts about the terms, and for all three the absence a
consumer would have to interpret resolves the permissive way: no limit, no credit, nothing
forbidden. So each is stated, and each has an explicit way to say nothing — `indefinite`,
`required: false`, `[]`. `classification`, `orderings` and `liveness` are optional because a
Provider may genuinely not classify, not serve Orderings, and not be able to confirm a deletion —
and in each of those cases the consumer's answer is to withhold something rather than assume
something, so silence costs the Provider rather than the reader.

**Attribution must be able to say `required: false`, and that is a design constraint rather than a
nicety.** MusicBrainz's core data is CC0 and obliges nothing (ADR-0014 → *Decision 9*), so a schema
demanding a notice would make its Provider invent one. Open Library is the *other* reason the field
has to exist and cannot be cited as a CC0 case: the same passage records its designation as
unverifiable on any live page, so its row reads **unverified** — a third posture, and one a
contract that only knew "credit" and "no credit" could not represent honestly either.

Where attribution *is* required the schema then demands the notices and the link, conditionally, so
"required" cannot be a claim with nothing behind it.

**Two obligations are prose in the contract rather than schema, and the boundary is not arbitrary.**
JSON Schema binds one document; `perRecord` is declared on `/capabilities` and discharged on every
record `/records` serves, and no `if`/`then` reaches across two responses. The same holds for a
notice's placement, which a Provider states and only the consumer's own pages can satisfy. So both
are written as normative sentences — a Provider declaring `perRecord` and serving records without a
`sourceUrl` is not conformant — and the gate cannot catch either. **That is the real cost of the
capability declaration**: what a Provider says about itself binds it in places the schema cannot
check, and the honest response is to say so rather than to pretend the shape is self-enforcing.

**`notices` is a list because one Source can prescribe more than one text.** TMDB is that Source:
`§3` prescribes a notice, and its FAQ separately requires an About or Credits section whose wording
differs — recorded on CAN-105 Carry each Source's attribution obligation through to every surface
that displays it, which says the declaration must carry the notice verbatim per Source rather than
assume one canonical string. A single slot would have pushed the second text into the prose
`conditions` field, which a consumer is not obliged to render, so the obligation would have been
declared and undischargeable at once. Each notice carries its own condition, because the two differ
in placement as well as in wording.

**`licence.shareAlike` is declared rather than derived.** A consumer cannot compute it from a
`LicenseRef-` identifier it has never seen, and CC BY-SA 3.0 and 4.0 differ materially: ADR-0014 →
*Decision 9* records that the two versions' share-alike "differ materially" and that only 4.0 has
the §4(b) database deeming. Deriving it would mean shipping a licence table into the application,
which is source knowledge by another name.

**Nobody else has built this.** Plex, Stremio, Stash and Navidrome all have capability discovery and
none of them carries a rights field of any kind
([research](../research/source-licence-risk-and-decoupling.md) §7). The two precedents worth
stealing are OPDS 1.2's per-entry `atom:rights` and Wikimedia Commons' `extmetadata`, whose field
set — `License`, `LicenseShortName`, `UsageTerms`, `AttributionRequired`, `Artist`, `Credit`,
`Permission`, `Restrictions`, as ADR-0014 → *What survives of ADR-0007* lists it — is most of the
shape above, arrived at independently for the same reason.

**A classification term declares what it obliges, so a consumer matches no word.** The vocabulary is
a list of terms each carrying `suppressesArtwork`, rather than a list of strings with `adult`
reserved. ADR-0014's item 4 asks for a flag "the application must no longer know the name of", and
CAN-104 Read a Provider's capability declaration, and refuse what it does not serve makes it a
criterion in terms — *no TMDB-specific field name anywhere in this path, `adult` included*. A
reserved string would have failed that on its own wording, because `adult` **is** TMDB's field
name, and a consumer would have had to hardcode it to run ADR-0012's rule. Reading a boolean beside
the term costs nothing and generalises: a Source classifying something else that also must not be
shown says so without the contract being revised.

**Rejected: the declaration as advice.** A consumer that reads the obligations and then applies its
own defaults has a decorative capability endpoint. The refusals are what make it load-bearing, and
[CAN-104 Read a Provider's capability declaration, and refuse what it does not serve](https://linear.app/jacobrees-canoncore/issue/CAN-104)
is where they become code.

**The declaration carries `declaredAt`, so two reads can be ordered.** CAN-104 Read a Provider's
capability declaration, and refuse what it does not serve requires that what
the application stored under an old declaration is not silently re-interpreted under a new one.
Comparing whole payloads detects that something changed; it cannot say which read is later, and a
consumer holding two declarations with no order between them has to guess. It is the Provider's own
clock rather than `fetchedAt`'s meaning, and the two are deliberately different: one is when the
terms were last restated, the other when the Source was last read.

**A declared `source.id` is scoped to the Provider that declared it**, and the contract says so.
Anyone may stand up a service claiming `id: tmdb`; the identifier says what a Provider calls its
Source and never that two Providers serve the same one. Blurring that is precisely the failure
[CAN-113 Add a Provider by pasting its URL](https://linear.app/jacobrees-canoncore/issue/CAN-113)
has to keep visible.

## Decision 3 — a record answers with its whole containment chain

`GET /records/{recordId}` returns the record, **every** Story it is contained by transitively, the
Versions of it, and a page of its direct parts.

**`containers` is complete and is never paginated**, which is the one place this contract spends
response size to buy a guarantee. [ADR-0012](0012-adult-works-catalogued-artwork-never-displayed.md)
records that an episode's classification has to be derived through `part of` from its series,
because the flag sits on the series and not on the episode. **A dropped container does not make
that derivation fail — it makes it succeed with the wrong answer**, and the rule then fails
silently: an image is displayed because a flag was absent rather than because it said no. A page
boundary in the array is the same defect wearing a different hat, which is why completeness is
written into the contract rather than left to a Provider's judgement.

**`parts` is paged and `versions` is not.** Direct parts are unbounded — a franchise node can carry
hundreds — and the Versions of one Story are bounded by the domain.

**A cursor sits beside its collection rather than wrapping it**, which is what makes that judgement
reversible instead of permanent. Under additive-only an array cannot become a page object later, so
a wrapper would have made the guess about `versions` binding for the life of version 1; a
`nextVersionsCursor` beside the array is a new optional member and may arrive at any time. It also
answers the question a wrapper cannot: a response holding three collections has no honest place for
one anonymous `nextCursor`.

**Rejected: one call returning the whole subtree.** It is what an importer wants — the founding
case is one series and every episode under it — and it makes response size a function of how large
the Source's tree is, with no way for either side to bound it. The scale is not hypothetical: the
1963 series carries around seven hundred episodes
([audit](../research/tracker-and-repository-audit.md) §5). Walking down through paged parts is more
calls and no unbounded response.

**Rejected: `404` for a record the Source has deleted.** It collapses "this Provider has never heard
of this identifier" into "the Source no longer carries it", and those are the two facts the retention
sweep has to tell apart. A deleted record answers `200` with `liveness: gone` and no values.

## Decision 4 — three liveness values, and who is allowed to say `gone`

`present`, `missing`, `gone` — the vocabulary `CONTEXT.md` already defines, closed for the life of
version 1.

The separation is ADR-0014 → *The daily ID exports are the oracle for "genuinely gone"* made into a
field. A provider outage, a revoked credential, a rate-limit wall, a 404 from identifier churn and a
genuine deletion all look identical at the call site, and treating them alike is Sonarr's unguarded
`DeleteMany(existingEpisodes)`, where a well-formed empty response wipes every local episode
([ADR-0004](0004-layered-overlay-for-sources-and-edits.md)).

**`liveness.confirmsDeletion` is what makes `gone` mean anything.** A Provider may only serve it
where it has evidence beyond the fetch that failed — a published list of live identifiers, a listing
endpoint, an export. One that declares `false` never says `gone`, so a consumer reading `missing`
knows it is reading "unknown" rather than "deleted", and never drops on it.

**Under decision 1 of ADR-0014 the application cannot consult such an oracle itself**, because it
does not know which Source it is talking to, let alone that the Source publishes an export. The
Provider consults it; the application acts on `liveness`. That is the whole reason this is a
contract field rather than a job somewhere in `apps/web`.

## Decision 5 — Orderings are in version 1

`/orderings` and `/orderings/{orderingId}` serve an Ordering, its Phases, and its Placements with
their positions, entry types, ranks, validity labels and **Arguments**.

**They are in from the start because their absence is the stated reason Audiobookshelf's schema is
refused.** The audit of 13 August 2026 found that its schema "does express one ordering
(`series[].sequence`)" ([audit](../research/tracker-and-repository-audit.md) §5) — narrower than
ADR-0007's claim that it has no way to express an ordering at all, and still one sequence per named
series rather than the several disagreeing Orderings this product exists for. A contract published
without them would repeat the defect it was written to fix, and
[ADR-0002](0002-orderings-are-separate-from-containment.md) is the shape they take: position lives
on the Placement, never on the Story.

**A Placement may point at nothing**, because a chronology carries bridges that argue for what comes
next without being a Story, and **a Placement with no position is Unplaced** rather than absent.
Both are in `CONTEXT.md` and both would be unrepresentable in a contract that modelled an Ordering
as a sorted array of record identifiers.

**`canonical` is gated twice.** An Ordering declares whether it is the Source's own sequence, and a
consumer treats that as `false` unless the capability declaration says this Provider may serve a
canonical Ordering at all. One community's reading imported as the Source's own is the
misattribution ADR-0014 → *Decision 9* is about, arriving through a different door.

**Serving no Orderings is conformant**, and the declaration's absence is how a Provider says so.
`provider-tmdb` will be such a Provider; `provider-tardis-wiki` exists chiefly for the opposite.

## Decision 6 — additive-only, with feature declarations instead of version negotiation

`CLAUDE.md` forbids compatibility layers. `CODING_STANDARDS.md` records this contract as the single
bounded exception, and ADR-0014 re-derives why: **the code is self-hostable**, so somebody may be
running a Provider we wrote on their own schedule, and a self-hosted copy is a fork nobody can
upgrade. The rule holds even though every Provider in v1 is ours.

What additive-only means concretely is in the document's own `info.description`: new endpoints,
optional members and open-vocabulary terms at any time; closed vocabularies never gaining a value;
removals, renames and narrowings only at a new major URI. Three vocabularies are closed and marked
as such — `liveness`, `rank` and a record's `type` — and every other vocabulary is open, so a Source
with a Medium nobody listed serves its own word for it rather than flattening it into a near-miss.

**Rejected: a revision number in the response that a consumer negotiates on.** The capability
declaration already says what a Provider serves, feature by feature, so a number beside it is a
second answer to the same question and the two go out of step in the direction where the number is
believed. The document still carries `info.version`, which is a different job: it tells an
implementor which revision they built against, and nothing reads it at run time.

**Rejected: negotiation by header or media type.** URI versioning is the most debuggable and
familiar form — the version is visible in a log, a bug report and a `curl` — and ADR-0007 chose it
for that reason. Nothing since has argued otherwise.

**The deprecation policy** is one sentence and two standards: a member this contract stops wanting
is marked `deprecated: true` and keeps working for the life of the major version, and a *Provider*
retiring an endpoint says so on the response with
[`Deprecation`](https://www.rfc-editor.org/rfc/rfc9745.html) (RFC 9745, March 2025) and
[`Sunset`](https://www.rfc-editor.org/rfc/rfc8594.html) (RFC 8594, May 2019). ADR-0007 promised a
deprecation policy and never wrote one; this is it.

## Standards taken rather than invented

Each of these replaces something this contract would otherwise have made up, and every one of them
is a place a consumer's existing tooling already works.

- **OpenAPI 3.1.1**, not 3.2.0 (September 2025). Nothing 3.2 adds — structured tags, streaming
  media types, new OAuth flows — is used here. 3.1 is where OpenAPI's schemas became JSON Schema
  2020-12, which is what lets the gate validate an example against the schema beside it, and 3.2
  keeps that rather than extending it. **Tooling is not the reason**: the validator this
  repository checks the document with reports `3.2` among its supported versions, so moving would
  cost nothing and buy nothing.
- **[RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html) problem details** for every error.
- **SPDX identifiers** for the licence, including `LicenseRef-` for terms not on the list.
- **ISO 8601 durations** for `retention` and `runtime`.
- **BCP 47** for language, and a partial-date string for `released`.
- **`Authorization: Bearer`** for the credential.

Each field says at its own definition what it would otherwise have invented, so the reasons are not
repeated here. The one worth stating twice is the pattern behind them: **every one of these replaces
a decision Audiobookshelf made for itself** — an ad-hoc error body its own client discards, an
integer of minutes in a field named neither, a verbatim header string no two providers agree on
([research](../research/audiobookshelf-provider-contract.md)). None of those is a bad decision in
isolation; together they are why nothing else can read that contract.

## What version 1 deliberately cannot express

Each of these is absent because nothing in v1 needs it, and each can arrive additively.

- **Entities and Appearances.** Cast, crew, characters and the roles that connect them are a whole
  second model, and the founding case
  ([CAN-26 Import a series from TMDB, with the overlay behind it](https://linear.app/jacobrees-canoncore/issue/CAN-26))
  imports Stories, Versions and `part of` edges only. They arrive as new endpoints when
  [CAN-14 Entity pages with prose](https://linear.app/jacobrees-canoncore/issue/CAN-14) needs them.
- **Artwork.** CAN-26 Import a series from TMDB, with the overlay behind it imports none, and
  [CAN-13 Artwork: uploads, rights and takedown](https://linear.app/jacobrees-canoncore/issue/CAN-13)
  is out of scope for v1. The classification vocabulary is here *before* the images it governs on
  purpose: it is the declaration whose absence must already be a refusal on the day artwork lands.
- **Cross-source identifiers**, so a consumer cannot ask a Provider which IMDb identifier a record
  carries. Deciding that two Sources describe one thing is the owner's act inside their own
  Catalogue, over the `(record, source)` key ADR-0004 already provides — **and it is deliberately
  not a shared fact**: [ADR-0003](0003-no-shared-catalogue.md) rejected deduplicating external data
  per Anchor precisely because it "makes the Anchor↔external-id mapping global truth, which this
  ADR's per-viewer merges forbid". A contract that volunteered the mapping would be offering the
  shared catalogue that decision refuses.
- **Bulk export and batch fetch.** The retention sweep is O(users × records) against one Provider
  (ADR-0014 → *Decision 6*), so a batch endpoint is a plausible addition — after something has run
  the sweep and can say what it costs, rather than before.
- **A relevance score on a search result**, for the reason `/records` gives at its own definition.
- **A Version's Nature and Version reason.** Both are `CONTEXT.md` concepts and both are open
  vocabularies, so each is a new optional member the day something reads one. Nothing does:
  CAN-26 Import a series from TMDB, with the overlay behind it imports Stories, Versions, `part of`
  edges and a runtime. **`Story.adaptedFrom` is kept while those two go**, and the asymmetry is the
  point — it is a structural edge between records rather than a descriptive string, and
  [ADR-0001](0001-two-levels-story-and-version.md)'s boundary rule turns on it: new authored text
  is a new Story, so a Provider with nowhere to say what a novelisation derives from cannot express
  the distinction that ADR draws at all.
- **Discovery across major versions.** Every path sits under `/v1`, so a Provider speaking only a
  later major is indistinguishable from a service that is not a Provider at all: both answer `404`.
  CAN-113 Add a Provider by pasting its URL has a criterion this bears on — a URL that "answers a
  version the application does not speak" must be refused with a reason the person can act on — and
  its refusal cannot currently say which of the two it met.

  **It costs nothing today and is recorded so that it is chosen rather than rediscovered.** v1 is
  the only major that exists, so no Provider can yet answer a version this application does not
  speak. An unversioned discovery endpoint is a *new endpoint*, which this contract admits at any
  time, so the answer is available the day a second major is designed — and designing it now would
  mean every Provider implementing a route with nothing to discover.

## Consequences

- **Six tickets are waiting on this one, and one of them is a whole repository.** CAN-101 Create the
  provider-tmdb repository, and give it the TMDB credential, CAN-104 Read a Provider's capability
  declaration, and refuse what it does not serve, CAN-105 Carry each Source's attribution obligation
  through to every surface that displays it, CAN-110 Carry per-field provenance to every displayed
  value, CAN-113 Add a Provider by pasting its URL, and CAN-8 Provider: tardis.wiki chronologies
  (separate repo) all name this contract as the thing they build against.
- **`source.retention` and `snapshot.fetched_at` now have a wire format.** The column is an interval
  or `'infinity'` and the declaration is a duration or `indefinite`, which is the same distinction
  with the same two cases and no null in either.
- **The contract is trusted for a compliance decision, and that is forced rather than chosen.**
  ADR-0014 → *Decision 6* already records it: under decision 1 the application cannot know a
  Source's retention limit without source-specific code, so it takes the Provider's word for it. The
  same is now true of the attribution obligation and the classification vocabulary.
- **Nothing here ships a capability.** No route, no ingress, no rendering and no functionality
  changes, so neither statutory assessment is engaged — the change that engages them on this axis is
  CAN-113 Add a Provider by pasting its URL, which
  [`illegal-content-risk-assessment.md`](../compliance/illegal-content-risk-assessment.md) →
  *Step 4 — Review* already lists and which was already reassessed for.
- **A Provider repository is a deployment of its own**, so nothing in this repository's merge moves
  one. [`docs/agents/workflow.md`](../agents/workflow.md) → *Work that spans two repositories* holds
  what that costs, including landing the contract side before the consumer.

**What would reverse it.** A Source whose data cannot be expressed in Stories, Versions and
Orderings at all — the contract is CanonCore's model on the wire, and a Source shaped differently
enough would need either a translation nobody can write or a second contract. Nothing in the roster
is close, and the thing to watch for is a Provider whose records only fit by being lied about.
