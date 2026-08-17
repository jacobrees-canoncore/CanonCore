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
illustrates, and asserts the closed vocabularies against `CONTEXT.md`. Every check in
`check-docs.ts` compares a document against a source that can be unreachable and therefore reports
SKIP; this one compares a file against a schema shipped inside a dependency, so it can never skip
and a skip would be the wrong outcome.

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
| Usage restrictions | `restrictions`, an open vocabulary reserving `non-commercial` and `no-ai-training` |
| Content classification | `classification.vocabulary`, reserving `adult` |
| A source-scoped identifier with liveness semantics | `Record.id` and `Record.liveness`, with `liveness.confirmsDeletion` saying what `gone` is worth here |

**Four members are required and the feature blocks are not.** `source` and `licence` say who is
being served and under what terms, which no Provider can be conformant without; `retention` and
`attribution` are required because they are the two whose absence a consumer would otherwise fill
with a permissive default — no limit, and no credit. `classification`, `orderings` and `liveness`
are optional because a Provider may genuinely not classify, not serve Orderings, and not be able to
confirm a deletion, and in each of those cases the consumer's answer is to withhold something rather
than to assume something.

**Attribution must be able to say `required: false`, and that is a design constraint rather than a
nicety.** Open Library and MusicBrainz core are CC0 and oblige nothing (ADR-0014 → *Decision 9*), so
a schema demanding a notice would make every Provider invent one. Where attribution *is* required
the schema then demands the notice and the link, conditionally, so "required" cannot be a claim with
nothing behind it.

**`licence.shareAlike` is declared rather than derived.** A consumer cannot compute it from a
`LicenseRef-` identifier it has never seen, and CC BY-SA 3.0 and 4.0 differ materially — only 4.0's
§4(b) deems a database Adapted Material
([research](../research/source-licence-risk-and-decoupling.md) §11). Deriving it would mean shipping
a licence table into the application, which is source knowledge by another name.

**Nobody else has built this.** Plex, Stremio, Stash and Navidrome all have capability discovery and
none of them carries a rights field of any kind (research §7). The two precedents worth stealing are
OPDS 1.2's per-entry `atom:rights` and Wikimedia Commons' `extmetadata`, whose field set —
`License`, `UsageTerms`, `AttributionRequired`, `Artist`, `Credit`, `Permission`, `Restrictions` —
is most of the shape above, arrived at independently for the same reason.

**Rejected: the declaration as advice.** A consumer that reads the obligations and then applies its
own defaults has a decorative capability endpoint. The refusals are what make it load-bearing, and
[CAN-104 Read a Provider's capability declaration, and refuse what it does not serve](https://linear.app/jacobrees-canoncore/issue/CAN-104)
is where they become code.

**A declared `source.id` is scoped to the Provider that declared it**, and the contract says so.
Anyone may stand up a service claiming `id: tmdb`; the identifier says what a Provider calls its
Source and never that two Providers serve the same one. Blurring that is precisely the failure
[CAN-113 Add a Provider by pasting its URL](https://linear.app/jacobrees-canoncore/issue/CAN-113)
has to keep visible.

## Decision 3 — a record answers with its whole containment chain

`GET /records/{recordId}` returns the record, **every** Story it is contained by transitively, the
Versions of it, and a page of its direct parts.

**`containers` is complete and is never paginated.** [ADR-0012](0012-adult-works-catalogued-artwork-never-displayed.md)
records that an episode's classification has to be derived through `part of` from its series,
because the flag sits on the series and not on the episode — so a response that drops a container
makes the derivation impossible **and the rule then fails silently**, displaying an image because a
flag was absent rather than because it said no. A page boundary in that array is the same defect
wearing a different hat, which is why the completeness is written into the contract rather than left
to a Provider's judgement.

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
refused.** Its `series[].sequence` expresses one sequence per named series
([audit](../research/tracker-and-repository-audit.md) §5, correcting ADR-0007's stronger claim), and
this product exists because one Story sits in several orderings that disagree. A contract published
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
  media types, new OAuth flows — is used here, and the validators this repository checks the
  document with support 3.1.x. 3.1 is also where OpenAPI's schemas became JSON Schema 2020-12, which
  is what lets the test validate an example against the schema beside it.
- **[RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html) problem details** for every error.
  Audiobookshelf declares `{ "error": string }` and its own client discards the body, which is what
  an invented error format is worth.
- **SPDX identifiers** for the licence, including `LicenseRef-` for terms that are not on the list,
  which is what SPDX reserves it for. The identifier carries the version, and the version is the
  part that changes the obligation.
- **ISO 8601 durations** for `retention` and `runtime`. Audiobookshelf's `duration` is an integer of
  minutes in a field that says so nowhere; `PT45M` needs no agreement kept somewhere else.
- **BCP 47** for language, and a partial-date string (`2007`, `2007-06`, `2007-06-09`) for
  `released`. A year-only field is fatal for a magazine issue, where the date *is* the identity.
- **`Authorization: Bearer`**, rather than Audiobookshelf's verbatim header value, so a credential
  looks the same at every Provider.

## What version 1 deliberately cannot express

Each of these is absent because nothing in v1 needs it, and each can arrive additively.

- **Entities and Appearances.** Cast, crew, characters and the roles that connect them are a whole
  second model, and the founding case
  ([CAN-26 Import a series from TMDB, with the overlay behind it](https://linear.app/jacobrees-canoncore/issue/CAN-26))
  imports Stories, Versions and `part of` edges only. They arrive as new endpoints when
  [CAN-14 Entity pages with prose](https://linear.app/jacobrees-canoncore/issue/CAN-14) needs them.
- **Artwork.** CAN-26 imports none, and
  [CAN-13 Artwork: uploads, rights and takedown](https://linear.app/jacobrees-canoncore/issue/CAN-13)
  is out of scope for v1. The classification vocabulary is here *before* the images it governs on
  purpose: it is the declaration whose absence must already be a refusal on the day artwork lands.
- **Cross-source identifiers**, so a consumer cannot ask a Provider which IMDb identifier a record
  carries. Matching records across Sources is what an Anchor is for
  ([ADR-0003](0003-no-shared-catalogue.md)), and a contract that helped would be inviting the shared
  catalogue that ADR refuses.
- **Bulk export and batch fetch.** The retention sweep is O(users × records) against one Provider
  (ADR-0014 → *Decision 6*), so a batch endpoint is a plausible addition — after something has run
  the sweep and can say what it costs, rather than before.
- **A relevance score on a search result.** A number a consumer cannot compare across Providers is
  worse than no number.

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
