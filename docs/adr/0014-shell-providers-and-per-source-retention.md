---
status: accepted
---

# The app is a shell: Providers hold the Sources, and retention is a property of the Source

`apps/web` carries no source-specific code and no Source credential. Every Source is reached through
a **Provider** — a separate service in a separate repository — and everything the application knows
about any Source arrives through the published contract. Retention stops being a project-wide fact
and becomes a property of each Source, so a Snapshot lives as long as that Source's terms allow and
no longer.

> **Settled 15 August 2026** in the grilling session recorded on
> [CAN-96 Record the architecture decisions of 15 August, and make the repository agree](https://linear.app/jacobrees-canoncore/issue/CAN-96),
> on the evidence in
> [`source-licence-risk-and-decoupling.md`](../research/source-licence-risk-and-decoupling.md),
> landed under **CAN-95 Land the source licence and decoupling research**. This ADR records
> decisions **1, 2, 3, 6, 8 and 9** of the ten taken there. Decision 5 — all previous TMDB
> correspondence is disregarded entirely — is recorded in
> [ADR-0009](0009-external-source-tmdb.md), which it rewrites.
>
> **This supersedes [ADR-0007](0007-provider-contract.md).** Its decision sentence — "No store, no
> review process, no manifests" — cannot survive a listed set of Providers this project writes and
> runs. *What survives of ADR-0007* below says what is kept, what breaks, and what is re-derived on
> stronger grounds than it had.

## Contents

- [Decision 1 — the app is a shell](#decision-1--the-app-is-a-shell)
- [Decision 2 — Listed Providers are written and run by this project](#decision-2--listed-providers-are-written-and-run-by-this-project)
- [Decision 3 — reachability splits by credential, in three classes](#decision-3--reachability-splits-by-credential-in-three-classes)
- [What survives of ADR-0007](#what-survives-of-adr-0007)
- [Decision 6 — retention is a property of the Source](#decision-6--retention-is-a-property-of-the-source)
  - [It models `§1.C` and cannot represent `§1.D`](#it-models-1c-and-cannot-represent-1d)
  - [The `/tv/changes` trap: refreshing only what changed is prohibited](#the-tvchanges-trap-refreshing-only-what-changed-is-prohibited)
  - [The daily ID exports are the oracle for "genuinely gone"](#the-daily-id-exports-are-the-oracle-for-genuinely-gone)
  - [What per-Source retention does not fix](#what-per-source-retention-does-not-fix)
- [Decision 8 — an expired or purged Story is a tombstone](#decision-8--an-expired-or-purged-story-is-a-tombstone)
- [Decision 9 — per-field provenance on every displayed value](#decision-9--per-field-provenance-on-every-displayed-value)
- [Consequences](#consequences)

## Decision 1 — the app is a shell

**Decided.** No source-specific code in `apps/web`, and **no Source credential anywhere in it**. The
application composes, renders and stores; it never knows that TMDB exists.

**The wording is bounded to *Source* credentials, and the bound is the point.** Credentials for this
project's own infrastructure are untouched: the database connection, better-auth's secrets, and
`RESEND_API_KEY`. That last one is an external API key on any reading, and CAN-96 Record the
architecture decisions of 15 August says in terms that it is **not** what this rules out.
[ADR-0011](0011-transactional-email-resend.md) is therefore not contradicted, and a reader who takes
this decision as "the app holds no API keys" has taken it too wide.

**`provider-tmdb` is authenticated, so the application does hold a credential for it — and that
credential is not a Source key.** It authenticates *us to our own Provider*, in the same class as
`DATABASE_URL`. TMDB's own bearer token lives in `provider-tmdb` and nowhere else;
**CAN-99 Move the TMDB credential out of the app, atomically with its roster row** moved it on 15
August 2026: [`docs/infrastructure.md`](../infrastructure.md) → *Where a Source credential lives*
records the token as held nowhere until `provider-tmdb` exists.

**The user's session cannot be that credential**, and
[ADR-0010](0010-canonical-host-www.md) is why. The session cookie is host-only, so it is returned
only to `www.canoncore.com` and never to a Provider on any other host. There is no arrangement in
which the person's own login authenticates the call to `provider-tmdb`; the application authenticates
it, server to server, with a secret of its own.

**Rejected: keep the TMDB key in the app and split only the code.** It leaves the application a
licensee of TMDB's terms — which is the exposure the whole shape exists to remove — and leaves a
`§1.D` purge duty attached to the thing holding every user's rows.

**Rejected: bring your own key**, each person supplying their own TMDB credential. Read at source
across sixteen comparable products and found to fail four separate ways
([research §7](../research/source-licence-risk-and-decoupling.md)): TMDB rate-limits by IP rather
than by key, so a hosted service gains nothing; registering the application already made us a party,
so privity is not separated; serving more than one person makes you the licensee anyway, which
TheTVDB has written into its terms as a binary; and no project anywhere routes a genuine per-end-user
key into publicly displayed output.

**What would reverse it.** A Source whose terms forbid an intermediary — where the licensee must be
the process that renders — would put source-specific code back in the application. Nothing surveyed
does that, and the pattern to watch for is a clause naming the *displaying* service rather than the
*fetching* one.

## Decision 2 — Listed Providers are written and run by this project

**Decided.** Every **Listed Provider** is ours, each in its own repository, each deployed by us.
[ADR-0005](0005-stack.md) already requires that Providers live outside `apps/`; this decides who
operates the listed ones, which ADR-0005 left open.

**Listed is the operative word, and `CONTEXT.md` defines it.** A pasted URL pointing at a stranger's
service is still supported — decision 7 of CAN-96 Record the architecture decisions of 15 August
accepts third-party Providers and the duties that come with them. What this decides is that the
Providers *this project vouches for* are ours, not a community's, and that the list is a real
boundary: anything off it is a stranger's service however familiar the Source behind it looks. That
is the half ADR-0007 cannot carry, because a list is a review process.

**Rejected: a community registry.** Stremio retrofitted moderation after "malicious addons, spam",
and Stash's scraper index is unsigned, so whoever controls the source URL controls both the hash and
the payload (research §7). A registry is a moderation commitment, and
[ADR-0003](0003-no-shared-catalogue.md) already refuses one on the catalogue for the same reason: a
quorum of one is theatre.

**Rejected: let a community member host the Providers.** Plex's custom-provider system is the
reference implementation and its own example has the operator paste `TMDB_API_KEY` into a `.env`, so
whoever runs the Provider becomes the licensee. That relocates this project's exact position "to
someone with fewer resources and no agreement with TMDB" (research §7).

**What would reverse it.** Operating cost. Each Provider is a deployment with its own uptime,
credentials and terms exposure; if the roster grows past what one person can run, either the roster
shrinks or somebody else runs part of it, and the second answer needs its own decision.

## Decision 3 — reachability splits by credential, in three classes

**Decided.** Listed Providers do not form one class. They form three, and the axis is the
credential.

| Class | Listed Provider | Source it answers for | Endpoint | Self-hostable |
| --- | --- | --- | --- | --- |
| **Authenticated** | `provider-tmdb` | TMDB | Reachable only by `canoncore.com` | **No** — the key is ours |
| **Keyless** | one each | TVmaze, the Grand Comics Database, ISFDB, Open Library, MusicBrainz | Public, listable | **Yes** |
| **Permission-bound** | `provider-tardis-wiki` | tardis.wiki | Reachable only by `canoncore.com` | **No** — the permission is ours |

**Every repository is public, in all three classes**, which is why there is no column for it: what
varies is the endpoint, never the source code.

**Provider and Source get a column each on purpose.** A Provider is not its Source, and this is the
table where confusing them costs most: the **credential** belongs to the Provider, the **terms**
belong to the Source, and the class is decided by the first while the retention policy is decided by
the second.

**Why the first class is closed.** TMDB's licence is granted "non-exclusive, **non-transferable,
non-sublicensable**" (`§1.A`, read from the
[API terms](https://www.themoviedb.org/api-terms-of-use) on 15 August 2026 and quoted in research
§2's table). A public endpoint serving our key to strangers resembles sublicensing access, so the
endpoint is authenticated and the key sits in a Vercel Sensitive variable that never appears in
source. The repository is still public; the key is what is closed, not the code.

**Why the second class is open.** TVmaze, the Grand Comics Database, ISFDB, Open Library and
MusicBrainz require no key at all and impose neither a retention limit nor a purge clause (research
§4). **There is no credential to sublicense**, so there is nothing to protect: the endpoints are
public and listable, and a stranger can self-host the code and reach the same data on their own
terms.

**Amended 16 August 2026 — tardis.wiki is second class after all, licence-only, and the third
class is dissolved.** As first written, this section rested on a factual premise the 16 August
verification sweep refuted: it claimed the wiki's `robots.txt` disallows `/api.php` for every user
agent, citing a research passage the 13 August audit had already flagged stale. The live file
(fetched three ways on 16 August) reads `User-agent: *` → `Allow: /`, with only named AI crawlers
disallowed and a Cloudflare content-signals block (`ai-train=no`) — and it had changed within a day
of being read, so it is volatile as well as permissive. With the premise gone, the owner decided
(CAN-115 Land the 16 August verification sweep: the decisions, the corrections, and what they
touch) to **stop relying on the personal permission entirely**: tardis.wiki is a keyless Source on
its licence — CC BY-SA **3.0**, attribution and share-alike per its terms, noting 3.0 has no §4(b)
database deeming — with an honest technical posture: honour the live `robots.txt`, rate-limit,
identify truthfully, and re-read that file at build time rather than trusting any record of it. The
self-hostability bar this section imposed dissolves with the premise; the Cloudflare challenge
remains a build reality, not a legal gate. **CAN-8 Provider: tardis.wiki chronologies (separate
repo)** carries the consequences.

*(The three paragraphs below are the original argument, kept for the record; read them through the
16 August amendment above. Two classes are now exactly right — tardis.wiki sits in the open bucket
because nothing but its licence governs it — and the reversal trigger about a "general permission"
is spent, since no permission is load-bearing at all.)*

Recording three classes rather than two was the whole point of this decision as first taken. Two
classes — "has a key" and "does not" — put tardis.wiki in the open bucket, and the open bucket is
defined by being safe to self-host; that placement was thought wrong on a premise the amendment
refutes, and is now correct.

**Rejected: one class, everything closed.** It costs the self-hostability decision 10 of CAN-96
Record the architecture decisions of 15 August commits to, for nothing: there is no credential to
protect on the keyless Providers, and closing them protects nothing. *(Still rejected — this
argument survives the amendment untouched.)*

**Rejected: one class, everything open.** It sublicenses TMDB's key and hands out a permission that
was never ours to give. *(Still rejected — the TMDB half of the argument carries it alone.)*

**What would reverse it.** A keyless source adding a key moves its Provider between classes — a row
in the table, not a new decision, though a source moving *into* the authenticated class means its
Provider's endpoint closes, which is a deployment change. The former second trigger — tardis.wiki
granting a general rather than personal permission — is spent: since 16 August no permission is
relied on, so there is nothing for a wider grant to change.

## What survives of ADR-0007

ADR-0007 is superseded rather than deleted, because most of it is still right and it is cited from
several documents that this change deliberately does not touch.

**Kept unchanged.** The paste-a-URL shape for third-party Providers; versioning in the URI; the
capability endpoint; a real parameter surface rather than configuration smuggled into URL paths; a
published OpenAPI spec as the single source of truth; and the refusal to take Audiobookshelf's
schema, which is audiobook-shaped and cannot express an Ordering.

**Broken: its opening premise.** ADR-0007 scoped the contract to "Sources that no general database
covers" — the residual. Under decisions 1 and 2 the general database is itself reached through a
Provider, so **the contract is the only ingress**, not the leftovers. Everything downstream of that
sentence was sized for the residual and is now load-bearing.

**Broken: "No store, no review process, no manifests."** There is now a list of Providers this
project writes, runs and reviews. The absence of a *public* store survives; the claim that nothing is
listed or reviewed does not.

**Re-derived: why the contract is additive-only.** ADR-0007 justified the exception to the
no-backward-compatibility rule with "someone else's service implements it and deploys on their
schedule". That is **false for every Provider that will exist in v1**, because we write and run all
of them. The correct reason, under decisions 2 and 3 above and decision 10 of CAN-96 Record the
architecture decisions of 15 August — a hosted public instance plus self-hostable code, the
Mastodon/Gitea/Plausible shape — is **self-hostability**: someone else may
be running our code on their own schedule, and a self-hosted copy is a fork we cannot upgrade even
though we wrote it. That argument is stronger than the one it replaces, and it survives even if no
third party ever implements the contract.

**Corrected: the Audiobookshelf-compatible Provider.** ADR-0007 says to "ship an
Audiobookshelf-compatible adapter anyway", which reads as source-specific code inside the product,
and decision 1 forbids that outright. It is a Listed Provider in a repository of its own, like every
other.

**Extended: the capability endpoint carries five things it was never sized for.** Under decision 1
anything the application must honour has to arrive through the contract, because the application
cannot know it any other way:

1. **Retention policy** — the value `source.retention` takes (*Decision 6* below).
2. **Required attribution**, including a *logo* and not merely a text credit. TMDB `§1.B` lists
   "Giving TMDB attribution for all TMDB Content, as specified in Paragraph 3" among its *Additional
   License Conditions* ([API terms](https://www.themoviedb.org/api-terms-of-use), read 15 August
   2026), so failing it is a licence breach and `§1.D` is the remedy.
3. **Usage restrictions** — the non-commercial limit and the AI/ML prohibition are examples that
   bind today.
4. **Content classification**, because [ADR-0012](0012-adult-works-catalogued-artwork-never-displayed.md)'s
   rule runs on a flag the application must no longer know the name of.
5. **A source-scoped external identifier with liveness semantics**, which is what makes the drop below
   safe.

Items 1 to 3 are legal obligations expressed as contract fields. **No provider contract anywhere
declares licence, attribution or image rights** (research §7, which surveyed Plex, Stremio, Stash and
Navidrome); the two near-precedents worth stealing from are OPDS 1.2's per-entry `atom:rights` and
Wikimedia Commons' `extmetadata`, which already has the field set — `License`, `LicenseShortName`,
`UsageTerms`, `AttributionRequired`, `Artist`, `Credit`, `Permission`, `Restrictions`.

**CAN-7 Provider contract: define and publish it** carries all of this, and moved into `v1` under
decision 4 of CAN-96 Record the architecture decisions of 15 August, because third-party
implementors exist from the start.

## Decision 6 — retention is a property of the Source

**Decided.** `source.retention` and `snapshot.fetched_at`; refresh before expiry; **drop what cannot
be refreshed**. Single-source: no second Source is added as a floor under an expiring one.

This replaces the project-wide answer [ADR-0009](0009-external-source-tmdb.md) used to give.
[ADR-0004](0004-layered-overlay-for-sources-and-edits.md)'s two rules — a Snapshot is verbatim, and a
Source ceasing to carry something is never a local delete — survive **per Source** rather than
universally.

**Rejected: one project-wide retention answer.** That is what a written exception bought, and
disregarding the correspondence (decision 5 of CAN-96 Record the architecture decisions of
15 August) removes it. It was also wrong on its own
terms once a second Source existed: five of the keyless Providers impose no retention limit at all,
so a single answer is either too strict for them or unlawful for TMDB.

**Rejected: a second Source as a floor**, kept indefinitely underneath an expiring one so the
composed read never blanks. Decision 6 rules it out explicitly. It buys a floor by importing a
second set of terms for every record, and where the floor is CC BY-SA it imports share-alike into an
aggregate that also holds proprietary data — which research §11 shows cannot be reconciled.

**Rejected: promote a value out of the expiring Snapshot into an owner-authored row**, so the
composed read keeps something to show. A fig leaf: it is still that Source's content, moved into a
table with no clock on it, which is evasion rather than compliance. And where the owner has genuinely
overridden the field it is redundant as well, because that Override survives the sweep on its own —
*What per-Source retention does not fix* below.

**The columns land with the first schema, not later.** Retrofitting `fetched_at` onto live Snapshot
rows is a data migration; landing it before any production Snapshot exists is free. This is the same
argument **CAN-26 Import a series from TMDB, with the overlay behind it** already makes for the
Operation batch id.

### It models `§1.C` and cannot represent `§1.D`

TMDB's two clauses are different shapes, and only one of them is a duration.

- **`§1.C`** forbids caching "for longer than 6 months, any information obtained through or from
  TMDB or the TMDB APIs". That is a limit on the **age of the copy**, and a `fetched_at` column with
  a refresh schedule is exactly its representation.
- **`§1.D`** requires that on termination "you must promptly delete or otherwise purge all TMDB
  Content, including any cached content". That is an **event**, not a duration. Nothing in
  `source.retention` can express it, because there is no value of a retention period that means
  "everything, now".

**What is unresolved, named rather than left to be discovered:**

1. **What detects termination.** A revoked key is indistinguishable at the call site from an outage
   or a rate-limit wall, and revocation is ordinary rather than exceptional —
   [ADR-0009](0009-external-source-tmdb.md) → *Fallback: TheTVDB* quotes TMDB's own staff on how
   often they do it. Nothing currently watches for it, and a purge duty nobody notices is a breach
   that runs quietly.
2. **The purge must reach `supersededValue`.** ADR-0004 stores the composed value at the moment of
   override as the merge base, so it is by construction a verbatim copy of Source content sitting in
   the **override** table. Decision 6 specifies `snapshot.fetched_at` only. If the sweep does not
   reach it, the six-month limit is evaded through the override table; if it does, the retention job
   writes override rows, which contradicts ADR-0004's disjoint-tables property and
   [ADR-0008](0008-operations-and-undo.md)'s "removing Snapshots cannot touch them" — stated there as
   a virtue. And purging it destroys the merge base, collapsing ADR-0004's four-cell table to two, so
   every field after an expiry-and-refetch cycle looks as though the Source moved.
3. **The purge must reach the audit payloads.** ADR-0008's audit trail deliberately outlives the undo
   buffer and survives erasure by scrubbing the payload while keeping the fact. A `§1.D` purge is a
   second reason to scrub a payload, on a different trigger, and the two jobs are not the same job.
4. **The fan-out is per user.** ADR-0004 keys Snapshots `(record, source)` on the owner's record, so
   refresh is O(users × records) against one credential held by one Provider, and a `§1.D` purge is a
   cross-tenant delete. Under the old exception this was pure storage cost;
   [ADR-0003](0003-no-shared-catalogue.md)'s amendment records that it is now an obligation cost.

**CAN-98 Make every document agree with the new architecture decisions** does not resolve these;
they need their own decision and their own tickets.

> **Amended 17 August 2026 by
> [CAN-118 Purge every Snapshot of a Source whose licence terminates, and tombstone what it touched](https://linear.app/jacobrees-canoncore/issue/CAN-118),
> which built the purge all four items are about.** What each is now:
>
> - **Item 1 stands, unresolved.** Nothing watches for termination and nothing in `apps/web` can,
>   since under decision 1 it does not know which Sources exist. What exists is a named check, a
>   named operator and a dispatched command — [`../runbook.md`](../runbook.md) → *A Source's licence
>   terminates* — which is a procedure rather than a detector, and the distinction is left standing
>   rather than papered over.
> - **Items 2 and 3 stand, and are no longer silent.** Neither the override table nor an audit
>   payload exists, so neither can be purged yet. What the purge adds is that the gap cannot pass for
>   a discharge: it reads the live schema, and a table it cannot account for makes the run a **partial
>   purge** — the Snapshots go, the Source's own row is kept, the run names the table and exits
>   non-zero ([`purge-source.ts`](../../apps/web/src/db/purge-source.ts)). **Deliberately not a
>   refusal**, which was the first draft: refusing would make the duty undischargeable exactly when it
>   is owed, and that module holds the argument. The pressure to decide sits earlier instead, in
>   `rls.test.ts`, which fails in the pull request that adds the table. It is a tripwire and not an
>   answer: what the purge should *do* with `supersededValue` is still item 2's question, and
>   ADR-0004's disjoint-tables property is still what makes it hard.
> - **Item 4 stops being prospective.** It is an observation about cost rather than a thing to build,
>   and the cross-tenant delete it describes now exists: keyed on the Source, run as
>   `canoncore_migrator` because the application role holds no write privilege on anything
>   (**CAN-123 Revoke the application role's write privileges, and decide whether the blanket
>   default privilege should exist**). The obligation cost the item names is now a command somebody
>   runs.

### The `/tv/changes` trap: refreshing only what changed is prohibited

The obvious refresh strategy is TMDB's own changes feed — poll
[`/tv/changes`](https://developer.themoviedb.org/reference/changes-tv-list), refresh what it names,
skip the rest. **It is the wrong predicate and it is forbidden here.**

`§1.C` limits the **age** of the copy, not its **staleness**. A record TMDB has not touched in a year
never appears in the changes feed, so a changes-driven job never refreshes it — and its Snapshot ages
past six months while the job reports success every night. The endpoint is also bounded to "up to 14
days at a time", so it cannot even enumerate the window it would need to.

A changes feed is a legitimate *optimisation on top of* an age-driven sweep — refresh the expiring
rows, and additionally refresh whatever changed. It is never the sweep itself. Recorded as a
prohibition because it is the first thing anyone reaches for and it fails silently.

### The daily ID exports are the oracle for "genuinely gone"

"Drop what cannot be refreshed" is the dangerous half of decision 6, and ADR-0004 already names the
failure it invites: Sonarr's unguarded `DeleteMany(existingEpisodes)`, where "a provider returning a
well-formed empty list wipes every local episode". A provider outage, a revoked key, a rate-limit
wall, a 404 from identifier churn and a genuine deletion at the Source are all "cannot be
refreshed", and the clock does not care which.

**TMDB's daily ID exports are what separates them.** Every valid identifier is published as
newline-delimited JSON at `https://files.tmdb.org/p/exports/`, one file per type per day; the job
"runs every day starting at around 7:00 AM UTC, and all files are available by 8:00 AM UTC", and
files are kept for three months
([daily ID exports](https://developer.themoviedb.org/docs/daily-id-exports)). Crucially: **"There is
currently no authentication on these files"** — no key, no licence gate, nothing that a revoked
credential takes away.

So the test is not "did the fetch fail". It is:

- **Present in today's export, fetch failed** → transient. Do not drop. Retry, and let the row expire
  on the clock if it never succeeds.
- **Absent from today's export** — *amended 16 August 2026*: "the export" means the **union of the
  main and `adult_*` export sets**, because the main files exclude adult titles entirely (verified:
  all 1,233,086 rows of one day's movie export are `adult:false`), and reading them alone would
  silently drop every adult work ADR-0012 deliberately catalogues. **Episodes and seasons appear in
  no export at all**: their liveness derives from the parent series — the series absent from the
  union means its episodes are gone with it; the series present while an episode's refresh 404s is
  settled against the live season listing, one call, absent-there meaning genuinely deleted. With
  that, → genuinely gone. `liveness` is `gone`, and the row is dropped when
  its retention expires.

Without that oracle, "drop what cannot be refreshed" *is* the unguarded `DeleteMany`. With it, the
drop is gated on a fact about the Source rather than on the shape of one failed response.

**Under decision 1 the application cannot read that export itself** — it does not know TMDB exists.
The distinction has to arrive through the contract, which is why the capability endpoint carries "a
source-scoped external identifier with liveness semantics" above. The Provider consults the export;
the application acts on `liveness`.

### What per-Source retention does not fix

Recorded because the qualifier is **necessary and not sufficient**, and three of these break quietly.

- **The composed read loses its Snapshot layer, and only sometimes has a floor under it.** An
  earlier draft of this bullet said it has *no* floor, which is wrong: the Override table is one.
  Overrides hold the owner's own authored values rather than any Source's, and
  [ADR-0008](0008-operations-and-undo.md) already states that "removing Snapshots cannot touch
  them". Three cases separate, and only the second reaches decision 8:
  - **A field the owner overrode survives the sweep.** Dropping such a record would destroy a value
    a person typed, which ADR-0004 forbids in terms ("nothing is destroyed in either direction"), so
    **a record carrying Overrides degrades to them rather than becoming a tombstone.**
  - **A field with no Override and no second Source has nothing beneath it.** That is the case with
    no floor, and decision 8 answers it.
  - **An Override whose value came from `supersededValue` is not the owner's**, since that column is
    by construction a verbatim copy of Source content. It cannot serve as a floor, which is
    unresolved item 2 above wearing a different hat.

  Decision 6 rules out adding a second Source as a floor, and promoting a Snapshot value into an
  owner-authored row is the fig leaf rejected above. **What a partly-overridden record renders as
  once its Snapshots are gone is not decided here**; CAN-90 Decide how an Ordering reads, and what
  the interface calls its parts owns it.
- **A Story with no title is therefore a routine rendering state**, not an exceptional one. ADR-0004
  records that TMDB loses roughly 2% of movie identifiers a year (a project estimate); each of
  those is now a drop rather than a flag. Nothing in
  [`frontend-design-scope.md`](../research/frontend-design-scope.md) treats it as routine, and
  **CAN-90 Decide how an Ordering reads, and what the interface calls its parts** owns what it looks
  like.
- **`liveness = gone` stops being durable** for a finite-retention Source, since a row the Source no
  longer carries cannot be refreshed by definition and must be dropped at expiry. It is a durable
  state only where retention is indefinite.
- **Where `source.retention` lives was unresolved. It is one shared row per Source** — *settled
  16 August 2026 by
  [CAN-102 Give Source a retention policy, and Snapshot a fetched-at](https://linear.app/jacobrees-canoncore/issue/CAN-102),
  the ticket that landed the column.* Per-user rows were the alternative, and they fail on meaning
  rather than on cost: retention is a term this project is held to, so a row per person makes
  compliance a setting somebody holds, and a setting is a thing that can be changed.

  **The two costs this bullet named are paid rather than avoided.** A shared table is not an
  Anchor, so ADR-0003's "the shared layer is Anchors, and nothing else" did not survive intact;
  [ADR-0003](0003-no-shared-catalogue.md) now carries what a shared table holding no catalogue
  metadata does to that sentence. And it sits outside ADR-0005 rule 2's cross-tenant test, which
  nothing can put back — a table with one row per Source has no tenant for a read to cross. What
  stands in place of the test it cannot have is three tripwires in `apps/web/src/db/rls.test.ts`:
  one refuses any table nobody has classified as protected or deliberately not, one asserts
  `source`'s whole column list, so a column that could belong to one person fails a test instead
  of arriving quietly on the one table with no policy over it, and one asserts what the
  application role may do to every table.

  **The third was added on 16 August 2026 by
  [CAN-123 Revoke the application role's write privileges, and decide whether the blanket default
  privilege should exist](https://linear.app/jacobrees-canoncore/issue/CAN-123), which found the
  first two insufficient.** With no policy over `source`, the grant is the only control on it, and
  the grant said `INSERT, SELECT, UPDATE, DELETE` — so the application role could set every
  retention window to `'infinity'` and make this decision's own guarantee false at the database
  level. Neither of the other two looks at a privilege. **A fourth test in that file asserts that
  no default privilege exists**, and is deliberately not counted here: it guards tables nobody has
  created yet, not `source`.

  **The third answer was never a third location, which is why it survives the choice untouched.**
  Under decision 1 the application cannot know TMDB's six-month rule without source-specific code,
  so **the value arrives from the capability endpoint** whichever row holds it — which means
  trusting a Provider's self-declared retention policy for a compliance decision. That consequence
  is forced by decision 1 and is recorded rather than argued away.
- **"A person is a Source" launders finite retention into indefinite retention.** Retention attaches
  to the Source, and a Source is the *conduit*. Fork changes the conduit: if A imports from TMDB and B
  forks A, B holds a Snapshot whose Source is *the person A*, and ADR-0004 is explicit that "factual
  fields (titles, runtimes, positions) remain". The obligation attaches to the content's **origin**,
  not to the last hop that delivered it, so per-Source is the wrong axis for this one case. Unresolved,
  and it needs either origin-carrying provenance on a forked Snapshot or a rule that a fork inherits
  the strictest retention in its Lineage.

**What would reverse decision 6.** Every Source in the roster imposing no retention limit — which
seven of the surveyed sources already satisfy (research §4) — would make the machinery dead weight.
It would still be right to keep the columns, because the next Source is the one that needs them, and
retrofitting is the migration this decision exists to avoid.

## Decision 8 — an expired or purged Story is a tombstone

**Decided.** A Story left with nothing to display, once the retention sweep or a purge has taken
every Source value it had and it carries no Override the owner actually authored, becomes a
**tombstone**, following
ActivityPub: the object is replaced by a `Tombstone`, and the URL answers **410 Gone** rather than
404. A record with Overrides keeps them and is not tombstoned — see *What per-Source retention does
not fix* above.

ActivityStreams 2.0 defines the shape and this project adopts it verbatim rather than inventing one:
a `Tombstone` "represents a content object that has been deleted"; `formerType` "identifies the type
of the object that was deleted"; `deleted` is "a timestamp for when the object was deleted"
([ActivityStreams 2.0 Vocabulary](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-tombstone)).
ActivityPub supplies the status code: a server "SHOULD respond with either the HTTP 410 Gone status
code if a `Tombstone` object is presented as the response body, otherwise respond with a HTTP 404 Not
Found" ([ActivityPub §6.4](https://www.w3.org/TR/activitypub/#delete-activity-outbox)).

**Why it earns its place.** 410 and 404 say different things, and both audiences need the
difference: a reader following a published Ordering learns that the Story existed and is gone rather
than that they mistyped, and a crawler learns to drop the URL rather than to retry it.
`CONTEXT.md` already defines a Placement as something that may exist with no Story behind it, so
the Ordering stays intact around the hole.

**Rejected: hard delete with a 404.** Cheapest, and it destroys the one distinction that matters —
"existed, now gone" collapses into "never existed", for the reader and the crawler alike.

**Rejected: keep the row and hide it.** It does not discharge `§1.C` or `§1.D` at all. The bytes are
still cached; a `visible` flag is not a purge.

**What would reverse it.** A finding that a tombstone itself retains Source content. It must not:
what survives is the identity, the `formerType` and the timestamp, never the Source's values. If the
shape ever grows a title "so the page reads better", the decision has been reversed by accident.

**What a tombstone renders as** beyond this shape is deliberately not decided here; **CAN-90 Decide
how an Ordering reads, and what the interface calls its parts** owns it.

> **The shape landed 17 August 2026** as the `tombstone` table, under
> [CAN-118 Purge every Snapshot of a Source whose licence terminates, and tombstone what it touched](https://linear.app/jacobrees-canoncore/issue/CAN-118),
> which needed something to write. **Its own table, with the Story's row deleted** — rather than
> `former_type` and `deleted` columns on a `story` row that stays. Both shapes destroy the title,
> because a purge that leaves it behind is not a purge; what separates them is which one makes the
> accidental reversal above cheap. A table with no title column can only grow one by a migration,
> where a surviving `story` row keeping a nullable title grows one by deleting a line. ActivityPub
> permits the shape rather than requiring it — a server *"MAY replace the `object` with a `Tombstone`
> of the object that will be displayed in activities which reference the deleted object"*
> ([ActivityPub §6.4](https://www.w3.org/TR/activitypub/#delete-activity-outbox), read 17 August
> 2026) — so this is a permission taken up, not a requirement met. It carries `owner_id`
> and `visibility` as well, because a policy needs them and neither is a value a Source supplied;
> `schema.ts` holds that argument and `rls.test.ts` asserts the whole column list against this
> paragraph. **CAN-111 Decide and build what a dropped Story renders as still owns the 410 and the
> Ordering's behaviour around the hole**; what it looks like stays with CAN-90 Decide how an Ordering
> reads, and what the interface calls its parts, as above.

## Decision 9 — per-field provenance on every displayed value

**Decided.** Every displayed value carries which Source it came from, at **field** granularity.

One mechanism discharges three obligations that would otherwise need three:

1. **TMDB `§3` attribution** — the logo plus the prescribed notice, in a fixed form, and a
   condition of the licence rather than a courtesy: `§1.B` lists it among the *Additional License
   Conditions* ([API terms](https://www.themoviedb.org/api-terms-of-use), read 15 August 2026).
2. **Licence obligations across the keyless Sources — including "none" *(corrected 16 August
   2026)*.** TVmaze and the Grand Comics Database are CC BY-SA 4.0; tardis.wiki is CC BY-SA **3.0**
   (licence-only per the amendment to Decision 3 above); ISFDB is CC BY 4.0; **Open Library and
   MusicBrainz core are CC0, which requires no attribution at all** — and Open Library's CC0
   designation is itself unverifiable on any live page ([research
   §4](../research/source-licence-risk-and-decoupling.md)), so its row reads *unverified* until
   resolved. The declared obligation must therefore express **none**, and must carry the licence
   identity and version — share-alike under 4.0 and 3.0 differ materially. Research §11's point
   stands where a licence does impose the duty: per-record provenance is **required by those
   licences**, not merely convenient.
3. **Cross-viewer misattribution.** ADR-0003's Placements resolve against whichever records the
   *viewer* holds, so a published Ordering shows the reader values from the reader's own Sources.
   Without provenance on the value, an Ordering's author appears to have asserted something a
   stranger's Source actually said.

Research §11 also settles why this cannot be flattened later: proprietary terms and CC BY-SA
contradict directly in one aggregate, and **segregation with per-record provenance is the only
coherent answer**. ADR-0004's `(record, source)` key already provides it. That the architecture built
for representing disagreement is also the one that keeps licences separable is fortunate rather than
designed, and it is a reason not to collapse the overlay for convenience.

**Rejected: one credit block in the footer.** It cannot name which Source supplied which value, so it
discharges neither the per-source CC BY-SA condition nor the cross-viewer case. Radarr is the
cautionary example: on the same shipped-key model it carries no TMDB notice in any of its 2,051
localisation strings and no logo asset (research §7).

**Rejected: provenance per record rather than per field.** The composed read picks field by field
across Sources by configured order (ADR-0004), so a record-level credit is simply false for the
fields the other Source won.

**Prior art worth taking.** Calibre-Web is the only surveyed product carrying per-record provenance
at all (`MetaSourceInfo(id, description, link)`). Sonarr's Metadata Source settings page is inert and
holds TheTVDB's required attribution in the slot where an API key field would sit — which is the
right instinct: put attribution where the interface forces the question rather than in a footer
nobody owns.

**What would reverse it.** Every Source in the roster being CC0, which requires no attribution at
all. Two of the surveyed sources already are; the roster as a whole will not be.

## Consequences

- **`docs/infrastructure.md`'s roster and `scripts/check-docs.ts` are coupled.** The check compares
  the documented roster against `vercel env ls --project canoncore`, so removing the TMDB variable
  from either side alone fails a required status check and blocks every merge. CAN-99 Move the TMDB
  credential out of the app, atomically with its roster row is one atomic change, and it must land
  before **CAN-69 Record the credential purge, regenerate the credentials table, and lint-ban
  `NEON_` reads**, which regenerates that table.
- **The check sees one Vercel project.** Once a credential lives in a Provider's own project it is
  invisible to `check-docs`, and a roster row whose Holder no longer says "Vercel" silently drops out
  of the comparison and becomes unchecked prose.

  *Amended 16 August 2026 under* **CAN-109 Decide whether the label roster check needs enforcing, or
  is honest as it stands**, which took this consequence in its general form and settled it. Half of
  it no longer holds. A dropped row is **not silent**: `parseUncheckedVariables` names every row no
  source reaches, and the run's own summary page carries the report, so what a run did and did not
  compare is legible without opening a log. A row held as a **GitHub Actions secret is compared**
  rather than dropped, though only where a credential to read it already exists, which is a laptop
  and not a runner. What survives unchanged is the first clause: the Vercel half still reads one
  project, deliberately, so a Provider's own project remains out of reach and is named rather than
  counted as agreement. [`docs/infrastructure.md`](../infrastructure.md) → *What this check compares,
  and what it cannot* holds the reach of each source and the options weighed, and
  [`docs/agents/triage-labels.md`](../agents/triage-labels.md) → *Where this check gates, and where
  it does not* the check deliberately left unenforced.
- **The retention sweep and the purge are not Operations.** [ADR-0008](0008-operations-and-undo.md)
  defines an Operation as one thing a *person* did, and undo works on Operations. Nobody performs a
  sweep and nothing undoes one, which `CONTEXT.md`'s definition of Operation now says in terms.
- **ADR-0012's flag chain runs through the contract.** Under decision 1 the application must not know
  what a TMDB `adult` flag is, so content classification is a contract field. If the graph response
  drops the series node when an episode is fetched, the `part of` derivation ADR-0012 depends on
  becomes impossible and the rule fails silently.
- **The compliance work is not this decision.** Decision 7 makes both risk assessments a v1 blocker
  under `s.9(4)` and `s.11(4)`, but that gates **shipping**, not documenting, and the assessments were
  correct about the service as it was.
