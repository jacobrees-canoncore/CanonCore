# Source licence risk, and how to stop depending on a private agreement

Researched 15 August 2026. Every licence claim below was read from the provider's own terms page,
API documentation or licence file on that date, and the operative clause is quoted rather than
summarised.

**The question this answers.** [ADR-0009](../adr/0009-external-source-tmdb.md) selects TMDB, and the
selection rests on a private written exception to TMDB's published terms, held on **CAN-34 Attach
TMDB's written retention approval**. This document asks: which sources could this product rely on
with **no private agreement at all**, what does it cost to be wrong about TMDB, and what
architectural changes make the answer not matter?

> **Method note.** A three-agent background sweep, plus foreground verification. The machine slept
> mid-run and every agent died; §§1–4 were gathered in the foreground, and the three agents were then
> recovered from their transcripts and all delivered. §5 (comics, prose, audio) and §7 (prior art)
> were measured live against source code and providers' own terms; §8 (the legal position) reads
> statutes and judgments directly. Sources reached through a real browser rather than a plain HTTP
> client are marked, because two of them (isfdb.org, metron.cloud) sit behind challenge pages that
> refuse `curl`. **§8 is analysis for a decision record, not legal advice.** What is missing is in
> *Not covered*. The two gaps that mattered most — the CC BY-SA legal code, and the adult-flag
> question for the television sources — were closed afterwards and are answered in §11 and §6.

> **Exclusion note.** No repository or page matching `canoncore*`, `CanonCore*` or `universora*` was
> read, fetched or quoted. None surfaced; had one, it would have been discarded and noted.

---

## The one-paragraph answer

The risk in ADR-0009 is not the six-month cache limit, which a rolling refresh survives. It is
**§1.D, the purge-on-termination clause**, which turns a revoked key into a duty to delete the
catalogue — and TMDB is not the only source that has one, so this is a clause to check for by name
rather than a TMDB quirk. **Seven sources impose neither a retention limit nor a purge clause** and
are usable with no agreement of any kind: **TVmaze** (CC BY-SA 4.0), **Wikidata** (CC0), **Open
Library** (CC0), **MusicBrainz** (CC0 core), the **Grand Comics Database** (CC BY-SA 4.0), **Metron**
(CC BY-SA 4.0) and **ISFDB** (CC BY 4.0, the most permissive found). TheTVDB publishes no retention
or purge clause either, but gates access behind a licence tier. **Moving the key to the user does not
work** — it buys nothing on rate limits, forfeits the retention exception, and does not even achieve
privity separation, because registering the application already made us a party. So the durable
answer is **source choice, not key ownership**. v1 currently uses **neither** of the two capabilities
TMDB was selected for, so the cost of changing course has never been lower than it is today. Two
things have no clean answer at any price: **audio drama**, where no lawful machine-readable source
exists, and the **adult-content flag** ADR-0012 depends on, which no other surveyed source carries in
a compatible form.

---

## 1. Two layers, and why "it is only facts" is the wrong defence

These must not be conflated, because the intuitive argument fails on the interaction between them.

**Layer 1 — intellectual property.** This binds with or without a contract, and here it is close to
absent:

- The EU/UK **sui generis database right** has no international treaty behind it and is available
  only to makers who are nationals of, resident in, or established in a qualifying state. TMDB is a
  US company, so **it holds no UK or EU database right in its database**. Post-Brexit the UK retained
  the right but tied eligibility to UK or qualifying establishment
  ([LexisNexis UK, database right qualification](https://www.lexisnexis.com/en-gb/legal/guidance/copyright-in-databases-database-right)).
- Database **copyright** protects selection and arrangement where they are the author's own
  intellectual creation. It does not reach the facts. An episode number, a title, a runtime and an
  air date are facts.

**Layer 2 — contract.** The API terms you accept to obtain a key. And this is where the intuition
inverts. In *Ryanair Ltd v PR Aviation BV* (CJEU C-30/14, 15 January 2015) the Court held that where
a database is protected by **neither** copyright nor the sui generis right, the Database Directive's
mandatory lawful-user rights (Arts 6(1), 8, 15) do not apply, **so the owner is free to impose
whatever contractual conditions it likes**
([IPKat](https://ipkitten.blogspot.com/2015/01/breaking-cjeu-says-that-owner-of-online.html),
[Kluwer Copyright Blog](https://legalblogs.wolterskluwer.com/copyright-blog/ryanair-ltd-v-pr-aviation-bv-contracts-rights-and-users-in-a-low-cost-database-law/)).

**So the weaker the IP position, the stronger the contract.** "These are unprotectable facts" is not
a defence against the terms; it is a reason the terms are unimpeded. The only question that ever
matters is **who accepted them** — a contract binds its parties and nobody else.

---

## 2. The clause that actually matters

Read from the [TMDB API Terms of Use](https://www.themoviedb.org/api-terms-of-use) on 15 August 2026:

| Clause | Text | Why it matters here |
| --- | --- | --- |
| **§1.C** | "Cache, for longer than 6 months, any information obtained through or from TMDB or the TMDB APIs" | The clause ADR-0009 is about. Survivable by refreshing each record inside the window |
| **§1.D** | "You must immediately cease all use of the TMDB APIs, TMDB Content, and any TMDB API key(s), and you must promptly delete or otherwise purge all TMDB Content, including any cached content" | **The real exposure.** A revoked key becomes a duty to empty the catalogue |
| **§1.A** | Licence granted on a "non-exclusive, **non-transferable, non-sublicensable**" basis | Bites regardless of the exception. One project key serving many users' catalogues resembles sublicensing access |
| **§1.C** | No use "in connection with… a machine learning (ML) or artificial intelligence (AI) based Application" | Binds now, not only on monetisation. ADR-0009 already records this |
| **§3** | The TMDB logo plus the prescribed notice | A product requirement, in a fixed form |

ADR-0009 already understood that §1.D was the dangerous one — it specifically records that the
exception "survives the end of API access". Without the exception, that protection is gone, and the
realistic trigger is mundane. TMDB staff are blunt about key revocation: *"We kill API keys fairly
often as we find out about apps doing bad or illegal things"*
([TMDB Talk](https://www.themoviedb.org/talk/65bb413111c066017bd01c3d)).

**Right-sizing the risk.** Breaching an API's terms is a civil matter between two parties, not
criminality. The realistic remedy is not litigation; it is §1.D being exercised administratively.
That is precisely why it is the clause to design around: the failure mode is cheap for TMDB to
trigger and catastrophic for a catalogue that has no other source.

---

## 3. The exception is written, but it is not verifiable

Four provenance gaps, each already recorded in this repository. Together they are the reason the
"what if it is revoked" question is well aimed.

1. **The correspondence is not in the repo**, deliberately. It is held on **CAN-34 Attach TMDB's written retention
   approval**, so the one load-bearing claim in ADR-0009 is the one a reader must leave the repo to check
   ([ADR-0009](../adr/0009-external-source-tmdb.md)).
2. **Neither copy carries headers, a sender address or a date.** ADR-0009: "Both are pasted bodies
   rather than saved messages, so the exception's age cannot be established and neither can be tied
   to a thread."
3. **Nothing ties the correspondence to the TMDB account in use.**
   [`docs/infrastructure.md`](../infrastructure.md) says so in terms: "Nothing here ties the CAN-34
   correspondence to this TMDB account. The registered application name and the exception's project
   scope agree with each other, which is consistency rather than proof."
4. **The recorded scope is one person's reading**, made on 10 August 2026, never independently
   checked — which is why "proves narrower than understood" survives as a reversal condition in
   ADR-0009's own **Fallback** section.

None of this suggests bad faith by anyone. It means the exception is **undated, unattributable,
untied to the account it covers, and read once**. That is a different risk profile from "we hold
written permission", and it is a good enough reason to design so the answer does not depend on it.

---

## 4. Source survey

Retrieved 15 August 2026. The two columns that decide everything are the first two.

| Source | Retention limit | Purge on termination | Licence | Key required | Public display | Media covered |
| --- | --- | --- | --- | --- | --- | --- |
| **TVmaze** | **None stated** | **None stated** | CC BY-SA 4.0 | **No** | Licensed expressly | TV only |
| **Wikidata** | **None** | **None** | CC0 | No | Licensed expressly | All, thinly |
| **Open Library** | **None** | **None** | CC0 | No | Licensed expressly | Books |
| **Grand Comics Database** | **None** | **None** | CC BY-SA 4.0 | No | Licensed expressly | Comics |
| **MusicBrainz** | **None** | **None** | CC0 core; CC BY-NC-SA 3.0 supplementary | No | Licensed expressly | Audio |
| **TheTVDB** | None stated | **None stated** | Tiered licence | Yes | Attribution with direct link | TV, film |
| **TMDB** | **6 months (§1.C)** | **Yes (§1.D)** | Proprietary, non-commercial free tier | Yes | Permitted under §3 attribution | TV, film |
| **Metron** | **None stated** | **None stated** | CC BY-SA 4.0 | Account for any read | Licensed expressly | Comics |
| **ISFDB** | **None stated** | **None stated** | **CC BY 4.0** | **No** | Licensed expressly | SF/fantasy/horror prose |
| **Comic Vine** | None stated | No, but must stop use | Proprietary, non-commercial | Yes | **Ambiguous** — see §5 | Comics, film, TV |
| **Google Books** | None found | None found *(ToS unread)* | Proprietary | Effectively yes | Yes, subject to takedown | Books |
| **OMDb** | Not established | Not established | CC BY-NC 4.0 | Yes | Non-commercial only | TV, film |
| **ISBNdb** | **Life of subscription** | **Yes — deletion required** | Proprietary, paid | Yes | While subscribed, no bulk | Books by ISBN |
| **Hardcover** | n/a | n/a | Proprietary | Personal token | **No** — compilation barred | Books |
| **Big Finish** | n/a | n/a | Proprietary | **No API** | **No** — personal use only | Audio drama |
| **tardis.wiki** | None | None | CC BY-SA 3.0 Unported | No (Cloudflare) | Share-alike on prose | All, best coverage |

**The headline answer to "which sources have no strict terms":** TVmaze, Wikidata, Open Library,
MusicBrainz, the **Grand Comics Database**, **Metron** and **ISFDB** impose **neither a retention
limit nor a purge-on-termination clause**, and all are under an open licence that permits public
redistribution outright rather than merely tolerating it. ISFDB is the most permissive of the set,
being **CC BY 4.0 with no share-alike at all**.

**And TMDB is not unique.** One other source surveyed carries an explicit purge clause — ISBNdb:
*"All stored and cached data must be deleted if the subscription expires or is cancelled"*
([terms](https://isbndb.com/terms-and-conditions)). That is fatal to a permanent catalogue and rules
ISBNdb out. The pattern is real and worth checking for by name in any future source assessment.

### Per-source detail

**TVmaze** — [API page](https://www.tvmaze.com/api). "Use of the TVmaze API is licensed by CC BY-SA."
No API key for the public API. Rate limited "to allow at least 20 calls every 10 seconds per IP
address". Commercial use permitted. Its weakness is real: **airdate ordering only** — alternate
episode lists exist on the website but are not exposed through the API — and it is television only.
Carries Doctor Who at `/shows/210`.

**Wikidata** — [Licensing](https://www.wikidata.org/wiki/Wikidata:Licensing). All structured data in
the main, Property, Lexeme and EntitySchema namespaces is CC0; **attribution is not required**. This
repository's own [`external-metadata-sources.md`](external-metadata-sources.md) already assessed it
and its verdict stands: "a good join table and a poor catalogue."

**Open Library** — [Developer Center](https://openlibrary.org/developers). Contributions are
requested under CC0 1.0, and the Internet Archive "does not assert any new copyright or other
proprietary rights over any of the material in the Open Library database". Note the access shape:
the API "is not intended to serve as a bulk data backend"; bulk use is directed to the free
[monthly data dumps](https://openlibrary.org/developers/dumps).

**Grand Comics Database** — [Data Distribution](https://docs.comics.org/wiki/Data_Distribution).
CC BY-SA 4.0, with full compressed MySQL dumps published for download. This is a materially better
comics source than anything ADR-0009's candidate set contained, and it was never assessed.

**MusicBrainz** — core data CC0, supplementary data CC BY-NC-SA 3.0. Already assessed in
`external-metadata-sources.md`; the split licence is the thing to watch, because the boundary decides
whether the non-commercial restriction reaches you.

**TheTVDB** — [API information](https://www.thetvdb.com/api-information). Revenue-tiered: free under
$50k/year, then $1,000, $10,000, or contact sales. "Unless approved by TheTVDB, attribution with a
direct link to TheTVDB.com must be displayed to end users viewing metadata from our API." The page
carries **no retention limit and no purge clause**, and states "We do not claim ownership of any of
the images or data in the API." It also operates a documented **user-supported key** model, where
"all end users of a project sign up for a user subscription to access your project's API"
([FAQ](https://support.thetvdb.com/kb/faq.php?id=62)) — that is the bring-your-own-licence pattern
formalised by the provider itself.

> **A discrepancy to resolve before relying on this.** ADR-0009 states that TheTVDB's terms say in
> capitals that its API licence does not authorise using or displaying images. The
> `api-information` page fetched today does not carry that language and says the opposite-adjacent
> thing about ownership. Both cannot be the whole picture. **Unverified** which page ADR-0009's
> claim came from; it must be re-read before TheTVDB is relied on either way.

**Comic Vine** ([API terms](https://comicvine.gamespot.com/api/)) — non-commercial only, with
commercial use resulting in key revocation; requires
caching and a link back; roughly 200 requests per resource per hour.

**OMDb** — [API](https://www.omdbapi.com/apikey.aspx). CC BY-NC 4.0, so commercial use is excluded
outright.

**Trakt** — assessed and set aside. It is a tracking service layered over other databases rather than
a general metadata source, its terms prohibit copying or reselling the Service, and it would
reintroduce a dependency rather than remove one.

---

## 5. Comics, prose and audio drama — measured live

TMDB and TheTVDB stop at film and television, which ADR-0009 accepts explicitly. This is the survey
of what covers the rest. Figures were measured on 15 August 2026, several through a real browser
because the sites refuse plain HTTP clients.

### Grand Comics Database — the strongest comics option

CC BY-SA 4.0, declared site-wide: *"All portions of the Grand Comics Database™… are licensed under a
Creative Commons Attribution-ShareAlike 4.0 International License… This includes but is not
necessarily limited to our database schema and data distribution format."* No key required.
**232,100 series** measured live via `comics.org/api/series/`. Deep credits: each issue carries a
`story_set` with per-story `script`, `pencils`, `inks`, `colors`, `letters`, `editing`, `genre`,
`characters` and `synopsis`.

Three operational facts that decide how it must be used:

- **Rate limit is severe anonymously.** From its own
  [`settings.py`](https://raw.githubusercontent.com/GrandComicsDatabase/gcd-django/beta/settings.py):
  `'DEFAULT_THROTTLE_RATES': { 'anon': '30/hour', 'user': '2000/day' }`. A free account is
  effectively mandatory.
- **Attribution has a prescribed form**, ratified by Board resolution: *"Naming the Grand Comics
  Database™ (spelled out) with a link to the main site and the license at least once on each page
  containing our data."* That is a per-page obligation, stricter than TMDB's About-or-Credits
  placement.
- **`robots.txt` sets `Content-Signal: search=yes, ai-train=no, use=reference`** and disallows
  ClaudeBot, GPTBot, CCBot and Google-Extended. Reference use is permitted; training is not. Note the
  parallel with tardis.wiki, which carries the same signal.

Bulk MySQL dumps exist behind a free account, a declared purpose and licence acceptance. Covers are
excluded: *"All rights to cover images reserved by the respective copyright holders."*

### Metron — the only source anywhere with an ordering model

CC BY-SA 4.0, declared in its OpenAPI document. **Requires an account for any API read at all**
(`401` anonymously; `basicAuth`, `cookieAuth` or a Knox token, all personal credentials rather than
an issuable app key, so not transferable).

**This is the find worth noting.** Metron is the only source in this entire survey — across
television, film, comics, prose and audio — that models alternative orderings natively. Its
[`reading_lists/models.py`](https://github.com/Metron-Project/metron/blob/master/comicsdb/models/)
defines a `ReadingList` with `ReadingListItem.order`, an `issue_type` of
`PROLOGUE / CORE / TIE_IN / EPILOGUE`, `previous`/`next` self-references chaining lists into longer
orders, a `list_type` of `CREATOR / EVENT / STORY / CHARACTERS / TEAMS / MASTER`, and an
`attribution_source` crediting external reading-order sites.

That is strikingly close to this product's own model: Placements with positions, entry types, and
Phases. It is prior art for [ADR-0002](../adr/0002-orderings-are-separate-from-containment.md) that
[`versions-and-orderings-prior-art.md`](versions-and-orderings-prior-art.md) does not carry, and it
is worth reading before CAN-27 Orderings and Placements, and the imported broadcast Ordering is
built, whether or not Metron is ever used as a source.

### ISFDB — the most permissive licence found

**CC BY 4.0 — attribution only, no share-alike**, stated on the front page and in `ISFDB:Policy`. No
key; verified live anonymously. **2,539,543 titles** (273,912 novels, 745,291 short fiction, 28,916
anthologies, 36,991 collections, 15,684 omnibuses), 958,613 publications, 302,470 authors, 59,255
series, from its own weekly-regenerated statistics page. Science fiction, fantasy and horror only.

It also carries the inverse of a purge clause — a *retention commitment*: *"Like other major
bibliographic sites, the ISFDB doesn't delete publications/titles that are known to have been
published"*, with a carve-out for a living author's biographical information on request. That is
philosophically aligned with ADR-0004's Snapshot, and it is the only source found that says so.

Access note: isfdb.org sits behind a Cloudflare JS challenge that 403s `curl` and `WebFetch` alike.
Every figure above was read through a real browser. **Unverified:** the location and licence wording
of its MySQL dumps — the wiki page is now login-gated and the old paths 404.

### Comic Vine — usable but contradictory

Non-commercial only, key revoked on commercial use, 200 requests per resource per hour. Two clauses
in its published terms conflict directly: *"Don't redistribute in another form: Do not edit,
manipulate or reproduce on any other medium"* against *"On any page you use our data, please link
back to us"*, which plainly contemplates you having such pages. It also says **"Don't build a
competing product"**, which a public catalogue arguably is. The incorporated Fandom terms add an
express AI/ML prohibition and bar *"unauthorized spidering, 'scraping,' data mining or harvesting"*.
Usable non-commercially, but the redistribution position is genuinely ambiguous rather than merely
strict.

### Ruled out

- **ISBNdb** — the purge clause quoted in §4. Fatal.
- **Hardcover** ([terms of service](https://hardcover.app/pages/terms-of-service)) — prohibits the
  use case in terms: *"Systematically retrieve data or other
  content from the Site to create or compile, directly or indirectly, a collection, compilation,
  database, or directory without written permission from us."* Its token is also a personal account
  credential that can delete the account, and the API is explicitly beta.
- **League of Comic Geeks** — no public API. `/api/` returns 403, no developer programme, and the
  site 403s even `robots.txt`.

### Audio drama: there is no lawful machine-readable source

This is the significant negative result, and it matters because audio drama is a first-class part of
this domain — `external-metadata-sources.md` measures 2,495 audio story pages on tardis.wiki.

**Big Finish, the dominant publisher in the genre, forbids the use outright.** Its
[terms](https://www.bigfinish.com/pages/v/terms-conditions): *"we
authorise the User to access and make use of the Big Finish Productions Web Site for personal use
only"*, and *"The Information may not be used for any other purpose including, publication,
reproduction, or transmission without the express written permission of BFP."* `robots.txt` carries
`Disallow: /api/`, so an internal API exists and crawling it is disallowed. Its sitemap yields 1,081
release URLs, 139 ranges and 1,000 contributors — a real catalogue, closed.

MusicBrainz remains the only open option, and `external-metadata-sources.md` already measured its
coverage at roughly a third of tardis.wiki's audio story pages. **So for audio drama the realistic
answer is tardis.wiki through the provider on CAN-8 Provider: tardis.wiki chronologies (separate
repo), or nothing.** That strengthens the case for the provider work rather than weakening it.

---

## 6. The dependency nobody expects: ADR-0012 rests on a source-specific field

[ADR-0012](../adr/0012-adult-works-catalogued-artwork-never-displayed.md) keeps highly effective age
assurance out of scope, and the mechanism that lets it do so is TMDB's `adult` flag. **CAN-26 Import
a series from TMDB, with the overlay behind it** carries it as a criterion: the flag must be
resolvable for every Story the import creates, derived down the `part of` edges because TMDB carries
`adult` on the series object only.

TMDB also publishes an editorial definition — by its [contribution bible](https://www.themoviedb.org/bible/movie)
the flag means hardcore
pornography specifically, with 18+ erotic titles deliberately excluded.

**A source swap therefore has a statutory consequence, not merely a data one.** If the replacement
source has no equivalent flag, or has one meaning something different, ADR-0012 loses its input and
the Part 5 analysis has to be redone before anything ships.

**Measured 15 August 2026, and the answer is worse than "some have one".** Across every comics, prose
and audio source surveyed, **no source carries a pornography flag at all**:

| Source | Flag | Hangs on | Readable from search results? |
| --- | --- | --- | --- |
| **TMDB** | `adult`, **boolean, pornography-specific** | movie, TV series, person | No — absent from `discover/tv` results |
| **TheTVDB** | `contentRatings[]` — **certification**, not a flag | Extended record only | **No** — absent from `SeriesBaseRecord` |
| **TVmaze** | **None. Verified live** | | |
| **Grand Comics Database** | `rating`, **free text** (`maxLength: 255`) | `Issue` | **No** — absent from the list serializer |
| **Metron** | `rating`, controlled vocabulary | `Issue` | **No** — absent from `IssueListSerializer` |
| **Comic Vine** | `rating`, but **only on `movie`** | `movie` | Comics objects carry none |
| **ISFDB** | **None found** | | |
| **Google Books** | `maturityRating` reported | | **Unverified** — reference page not read |

**TVmaze verified live**, `GET api.tvmaze.com/shows/210` (Doctor Who) on 15 August 2026. All 23
top-level fields: `_links, averageRuntime, dvdCountry, ended, externals, genres, id, image, language,
name, network, officialSite, premiered, rating, runtime, schedule, status, summary, type, updated,
url, webChannel, weight`. **Not one is a content classification.** `rating` is `{"average": 8.3}` — a
community score, not a maturity rating. And note it *does* serve `image` poster URLs, so an artwork
importer against TVmaze would have **no way whatever** to know whether a poster may be displayed.

**TheTVDB** carries a real `ContentRating` schema (`id, name, description, country, contentType,
order, fullName`) but it is a **national certification system** — country-scoped labels like an age
rating — not a pornography boolean, and it appears on the **extended** record, not `SeriesBaseRecord`.

Three findings follow, and each is a problem in its own right:

1. **The top of every scale is "Mature", not "pornographic".** Metron's vocabulary runs
   `Unknown / Everyone / Teen / Teen Plus / Mature`, where Mature is *"Appropriate for readers age 17
   and older"*. TMDB's flag, by its [contribution bible](https://www.themoviedb.org/bible/movie), means
hardcore pornography **specifically**
   and deliberately excludes 18+ erotic titles. These are not the same predicate, so the flags are
   **not interchangeable**: mapping one onto the other would either over-block or under-block, and
   ADR-0012 depends on the narrow reading.
2. **Every flag found is detail-only.** None is readable back from a search or list endpoint. So a
   catalogue cannot filter at query time; it must fetch each record before it knows. That is a
   throughput problem on a 30/hour anonymous rate limit.
3. **GCD's is free text and patchily populated.** Verified live: `Preacher (1995 series) #1` and `#2`
   both return `rating = 'Suggested for Mature Readers'`, but eight randomly sampled older issues
   returned `''`. A free-text field with gaps cannot carry a compliance decision.

**The question is now closed, and the answer changes the ranking.** TMDB's `adult` boolean is
**unique across every source surveyed**. Nothing else has a pornography-specific flag: TheTVDB has
national certifications (a different predicate, detail-only), TVmaze has nothing at all, and the
comics and prose sources have age-suitability labels topping out at "Mature".

So **ADR-0012's mechanism cannot survive a source swap.** Replacing TMDB does not merely cost episode
groups and artwork rights; it removes the input to the one decision keeping highly effective age
assurance out of scope, with no replacement available anywhere. Per §8 the stakes are statutory: text
is outside Part 5 under `s.79(4)(a)`, but an automated artwork importer with no adult signal has no
principled way to stay there.

That does not make TMDB unconditional. It makes the **artwork** decision and the **source** decision
the same decision. As long as CAN-13 Artwork: uploads, rights and takedown stays in the Later band and
no artwork is imported, the flag has nothing to gate and any source will do. The moment artwork
lands, the source must carry an adult signal — and today only TMDB does.

---

## 7. The structural fix: stop being the licensee

Since the only question that matters is who accepted the terms, the obvious move is to make someone
else accept them. **Sixteen comparable products were read at source to test that, and the finding is
negative: per-user keys do not do what they appear to do.** Keep this section's conclusion when
reading §10's ranking, because it demotes an option that looked strong.

### Bring-your-own-key fails for a centrally hosted service, for four separate reasons

**1. TMDB rate-limits by IP, not by key.** Travis Bell, TMDB staff: *"We do rate limiting based on IP
address, not API key. With more and more users your single IP will be doing more and more requests
and will very likely easily trip our rate limiting"*
([TMDB Talk](https://www.themoviedb.org/talk/512403ec760ee37257037fdb)), and *"we do not issue custom
rate limits"*. CanonCore is hosted, so every request leaves our IPs whoever's key is attached.
Per-user keys buy **nothing** on throughput. They only help self-hosted architectures where each
user's traffic originates from their own machine.

**2. The exception would be lost, not preserved.** TMDB §10.E: *"The rights and obligations of these
Terms of Use are personal to you and may not be transferred by you."* The retention exception attaches
to **CanonCore's** licence. Under per-user keys each user becomes their own licensee on the standard
six-month terms, and the exception does not follow them. **This inverts the proposal**: BYOK would
trade a negotiated advantage for a weaker position than the one we hold today.

**3. It does not even achieve privity separation.** Privity is not a fact about whose key is used at
runtime; it is a fact about who accepted terms. TMDB requires the **application** to be registered
before any key is issued, and CanonCore's is registered — `docs/infrastructure.md` records it as
application `CanonCore`, `https://www.canoncore.com`. **We are already a party.** See §8. A
bring-your-own-key architecture separates privity only for a vendor that never registers anything,
which for TMDB is not possible.

**4. Serving more than one person makes you the licensee anyway, and the sources themselves enforce it.** A Radarr
maintainer, on why they proxy rather than let users connect directly:

> "`api.radarr.video` is serving more than one user… We already had issues with another arr where a
> user provided scripts to scrape the metadata API with a random user-agent to bypass the rate limit,
> but it contained the name of the arr and **we were notified to stop doing that, even if it was us or
> not**." ([Radarr#11026](https://github.com/Radarr/Radarr/issues/11026#issuecomment-2781399207))

TheTVDB has written the same thing into its terms as a binary: *"All API keys are required to have
either a commercial license, or have subscriptions enabled for end users"*, and *"API keys are no
longer given out to individual end users of projects. The projects themselves will apply for a key"*
([FAQ 62](https://support.thetvdb.com/kb/faq.php?id=62),
[FAQ 81](https://support.thetvdb.com/kb/faq.php?id=81)).

### What the prior art actually does

The dominant pattern is **project key mandatory, user key optional as an entitlement upgrade** — not
as a licence substitute. Jellyfin, Kodi, Emby and tinyMediaManager all ship a project key and treat a
user key as a perk. Fanart.tv, from the provider side, says why on its
[personal API keys page](https://fanart.tv/personal-api-keys/): *"the personal API key is an optional
additional key not a replacement"*, and its tiers are about image freshness (7 days → 48 hours → VIP),
not about who is licensed.

Jellyfin's is the decision record worth reading. Its lead in 2019: *"I strongly dislike forcing the
user to use their own API keys."* The agreed plan was staged — ship our own key, then make it
user-fillable — and **stage two never shipped in seven years**. Jellyfin's TMDB key has sat in a public
repository since January 2019 and has not been revoked. Its config page deliberately hides the key
field: *"This is intentionally excluded from the settings page as the API key should not need to be
changed by most users."*

Kodi rejected BYOK outright, on the provider's own authority: *"themoviedb.org only provides API key
for developers, no keys being issued officially to be used as personal key in an application."*

### The public-display question, now answered

Earlier I recorded this as unsettled. It is now partly settled, and the answer is a **clean negative**:
**no project anywhere routes a genuine per-end-user key into publicly displayed output.**

Three projects do publish externally-sourced metadata to anonymous strangers — Calibre-Web (embedded
Comic Vine key, admin-supplied Google Books key, `config_anonbrowse`), Audiobookshelf (its
`PublicRouter` share links serve provider metadata and **re-hosted** cover art with no auth), and
BookWyrm — but in every case the key belongs to the **project or the operator**, never to the end
user. The two models segregate cleanly by deployment shape: user-supplied keys appear only in private,
authenticated, self-hosted contexts; project-held or operator-held keys appear wherever data is
normalised, cached and redistributed at scale. CanonCore is unambiguously the second shape.

**BookWyrm is the one project with no licensing exposure at all**, and the reason is instructive: its
connectors point only at open or public-institution data (Open Library, Inventaire, Finna, Libris),
**none of which requires a key**. It did not solve the licensing problem. It chose sources that do not
have one.

### A provider contract relocates the question; it does not answer it

Plex's new custom-provider system is the reference implementation, and its own example provider has the
operator paste `TMDB_API_KEY` into a `.env`. So the TMDB obligation lands on **whoever runs the
provider**. A community member hosting one public provider for many users becomes a single licensee
serving many people from one key and one IP — **exactly CanonCore's position today, relocated to
someone with fewer resources and no agreement with TMDB**. Plex's system has no registry, no review,
and says nothing about licensing or responsibility for returned data.

### The gap worth filling

**No provider contract anywhere declares licence, required attribution, or image rights.** Plex,
Stremio, Stash and Navidrome all have capability discovery; none carries a rights field. Calibre-Web
alone carries per-record provenance (`MetaSourceInfo(id, description, link)`). Two near-precedents to
steal from: **OPDS 1.2** mandates `atom:rights` per entry, and **Wikimedia Commons' `extmetadata`**
proves the exact field set for the artwork problem — `License`, `LicenseShortName`, `UsageTerms`,
**`AttributionRequired`** as a boolean, `Artist`, `Credit`, `Permission`, `Restrictions`.

That is the capability endpoint [ADR-0007](../adr/0007-provider-contract.md) already proposes as its
first fix, and **CAN-14 Entity pages with prose** already assumes ("provider-supplied text carries its
own licence and attribution, and the renderer displays attribution from that metadata"). Nobody else
has built it. It would be genuinely novel, and it is the piece that makes a multi-source catalogue
legible rather than merely possible.

**And one design detail worth stealing outright:** Sonarr's Metadata Source settings page is inert
(`showSave={false}`) — the slot where an API key field would sit holds **TheTVDB's required
attribution instead**. If CanonCore stays project-as-licensee, that is where TMDB's prescribed notice
belongs.

**The counter-example is instructive too.** Radarr, on the same shipped-key model, carries no
attribution at all: no TMDB notice in any of its 2,051 localisation strings and no TMDB logo asset,
only per-movie deep links. Whether that breaches TMDB §3 was not assessed, but it shows how easily
the attribution obligation goes missing when nothing in the interface forces the question — which is
the argument for putting it in the key slot rather than in a footer nobody owns.

### What still holds

**The overlay supports every posture.** [ADR-0004](../adr/0004-layered-overlay-for-sources-and-edits.md)
keys Snapshots `(record, source)`, composes several Sources by configured order and represents their
disagreement rather than resolving it. **CAN-17 v1: the walking skeleton in production, then the
founding case** names the gap in its own out-of-scope list: "The Source table is built for more than
one; only one exists."

### What other projects got wrong, and paid for

Recorded as findings rather than as rules. Each is a failure observed in a shipped product, and each
would bear on a paste-a-URL provider if one is built:

- **SSRF-guard the pasted URL.** Audiobookshelf's entire validation is `new URL(rawUrl).toString()` —
  no scheme restriction, no internal-address blocking. BookWyrm's `raise_not_valid_url` is the mature
  version: scheme allow-list, hostname required, IP literals rejected, blocklist checked.
- **Encrypt provider credentials at rest and never return them from an API.** ABS stores
  `authHeaderValue` in plaintext and `getAll` returns raw rows, handing the token back to any admin.
- **Never let the updater own the file holding the secret.** Stash: *"This is unfortunate if you
  install them through the web interface as any updates will overwrite your changes."*
- **Version with forward-compatible parsing.** Stash uses `parser.SetStrict(true)`, so an unknown key
  is a hard failure — there is no "ignore what you don't understand" path.
- **Build deactivation-with-reason and fallback from day one.** BookWyrm's connectors carry `active`,
  `deactivation_reason`, `most_recent_success`, `latest_error`, and are never deleted.
- **Moderate the registry from the start.** Stremio retrofitted moderation after *"malicious addons,
  spam"*; Stash's scraper index is unsigned, so whoever controls the source URL controls both hash and
  payload, and one scraper action type executes an arbitrary local binary with no sandbox.
- **Gate artwork at least as tightly as metadata.** stash-box gates metadata behind roles but serves
  poster images from unauthenticated, permanently-cacheable UUID URLs. Given
  [ADR-0012](../adr/0012-adult-works-catalogued-artwork-never-displayed.md), that inversion is the
  precise failure this product cannot afford.

---

## 8. The legal position, tested against primary sources

Statutory text and judgments read directly. **Analysis for a decision record, not legal advice.**

### The database right does not exist here, and the statutory chain is now pinned

`SI 1997/3032 reg 18` requires the maker to be a UK national, resident, or a body incorporated in
part of the UK with its central administration or principal place of business here. Every "United
Kingdom" in that regulation replaced "EEA" via `SI 2019/605 reg 28(3)`, in force 31 December 2020,
with `reg 38` grandfathering rights that already existed. The EU counterpart, Directive 96/9/EC
Art 11, has never been extended to the US by an Art 11(3) agreement.

**So a US-made database attracted no UK database right before Brexit and attracts none now.** The
change ran in two directions, and neither touched the United States — a point routinely stated
backwards.

The consequence for `reg 19` (which voids terms preventing extraction of insubstantial parts) is
that **it never engages**, because it bites only where database right subsists. There is no
statutory shield against the contract.

### Text and data mining does not help. At all

`CDPA s.29A` fails on four independent grounds, and the fourth is the one that surprises:

1. **Purpose.** It requires "the **sole** purpose of research for a non-commercial purpose". A public
   catalogue is a product, not research. Non-commercial is satisfied; research is not.
2. **Scope.** s.29A sits in Part I and covers **copyright only**. Database right has its own regime,
   and `SI 1997/3032 reg 20` covers **extraction only** — the word "re-utilises" is absent, so
   publication is never covered — and requires "illustration for teaching or research". Schedule 1,
   which reg 20(2) points at, is headed *"Exceptions to database right for public administration"*.
   **There is no TDM exception for database right in UK law at all.**
3. **Publication.** `s.29A(2)` makes transfer to any other person, or use for any other purpose, an
   infringement in itself.
4. **Therefore the contract override is inert.** `s.29A(5)` voids a term only "to the extent that"
   it restricts a copy which "**by virtue of this section**" would not infringe. If the section does
   not permit the act, it voids nothing.

The UK never implemented DSM Arts 3 and 4 — which, unlike s.29A, expressly extend to Art 7(1)
database right. As at August 2026 no replacement is enacted, and the
[March 2026 Government report](https://www.gov.uk/government/publications/report-and-impact-assessment-on-copyright-and-artificial-intelligence)
points towards a **rights-reservation model**, i.e. more restrictive, not less.

### The purge clause is enforceable, and the fix is architectural

- **The penalty rule does not reach it.** *Cavendish Square v Makdessi* [2015] UKSC 67 at [32]
  applies to **secondary** obligations. A purge triggered by termination however arising — including
  by expiry or by the licensee — is a **conditional primary obligation**, outside the rule entirely.
- **UCTA does not apply**, twice over: it regulates the exclusion of liability, not positive
  obligations imposed on the licensee; and post-2015 `s.3(3)` confines it to business contracts.
- **The consumer argument is real but unsettled.** `CRA 2015 s.2(3)` defines a consumer by *purpose*,
  and `s.2(4)` puts the burden of disproving it on the trader. *Costea* (C-110/14), assimilated and
  binding, holds the concept "objective in nature and distinct from the concrete knowledge the person
  may have" — so professional skill does not disqualify. No UK authority resolves it for a free,
  non-monetised, public service. **Engineering consequence: the characterisation is degraded by
  anything that makes the project look like an undertaking** — donations, sponsorship, advertising, a
  company, paid tiers. That is a product decision with a legal side-effect, and worth recording.

**The mitigation that actually works is the one this repo already has.** If third-party fields are
stored source-tagged and segregated so they can be dropped in one operation without destroying
user-authored content, a purge demand costs a migration rather than the product. ADR-0004's
`(record, source)` Snapshot key **is** that design.

### Privity is a much weaker shield than it looks

Three findings, and the second one dismantles the BYOK case completely.

**1. Deliberate ignorance is the dangerous posture, not the safe one.** The tort of inducing breach
of contract (*OBG Ltd v Allan* [2007] UKHL 21) turns on knowledge, and Lord Hoffmann at [39]–[41] is
explicit: honest belief that no breach is involved is a **complete answer**, even if the belief is
wrong — but "a conscious decision not to inquire into the existence of a fact is in many cases
treated as equivalent to knowledge of that fact". **"Don't read the terms so we can't be fixed with
knowledge" is precisely backwards.** Reading the terms, recording a reasoned view, and asking the
provider where genuinely unclear is the protective posture.

**2. Registering an application makes you a party anyway.** Privity is not a fact about whose key is
used at runtime; it is a fact about **who clicked "I agree"**. Most metadata APIs require the
*application* to be registered before any key — user-supplied or not — can be issued. If the project
holds a developer account or accepted API terms at any point, it is a party in its own right and the
entire privity analysis is irrelevant. **A bring-your-own-key architecture achieves privity
separation only if the project never registers anything**, which for TMDB it cannot.

**3. Written permission is worth more than this document previously credited.** The first element of
the tort is an **actual breach by the user**. If the provider confirms in writing that the use is
permitted, there is no breach, and every downstream theory — inducement, joint tortfeasance —
evaporates. That reframes CAN-34 Attach TMDB's written retention approval: it is not only a
retention permission, it is the thing that collapses the accessory-liability analysis.

### Who publishes, when a user's key fetched it — unsettled, but leaning one way

Recorded earlier as open. It remains open: **no authority in any jurisdiction addresses this
configuration.** But the balance is clearer than it was.

*Toward the service being the publisher* — all assimilated and binding: *Football Dataco v Sportradar*
(C-173/11) holds that the operator of the **sending web server** performs the re-utilisation, even
though it sends at the visitor's request. *Innoweb* (C-202/12) held that a service holding **no copy
at all**, merely relaying queries in real time, re-utilises. *Renckhoff* (C-161/17) holds that
re-posting to a site under your own control is a fresh act, distinguished from linking.

*Toward the user being the publisher*: *YouTube/Cyando* (C-682/18) — **but note this is 22 June 2021,
after IP completion day, so under EUWA s.6 it is persuasive only in the UK, not binding.** And the
hosting defence in `SI 2002/2013 reg 19`.

**Three things weigh against the hosting defence on our architecture.** Reg 19 protects storage of
"information provided by **a recipient of the service**" — but where our server made the API call and
wrote the record, the information came from the API, not the recipient; the user supplied a
credential and an instruction. Reg 19(b) excludes recipients "acting under the authority or the
control of the service provider". And *YouTube/Cyando* itself at [84] names "participates in
selecting" and "provides tools specifically intended for" as markers of deliberate intervention — an
importer that fetches specific records from a specific provider does both, by working correctly.

**The single fact that flips it is whether the server ever holds the data.** Genuinely client-side —
browser holds the key, browser calls the provider, our server never sees the response — and the
service is close to a mere facility. **Server-side fetch, or persistence in our database, and the
service is very likely the publisher.** CanonCore is unambiguously the second.

### The Online Safety Act, and strong statutory backing for ADR-0012

**Imported metadata is provider content, not user-generated content.** `s.55(4)(b)(ii)` provides that
a bot or automated tool is a user **only** where it "is not controlled by or on behalf of the provider
of the service". Our importer is ours, so what it publishes is provider content under `s.55(7)`.
`s.236(7)` runs one way only — it stops a provider laundering *user* content into *provider* content,
not the reverse. So the import never puts the service into Part 3.

**What does put it there is user-authored text.** `Schedule 1 para 4` exempts a service where users
may communicate **only** by commenting on, reviewing, rating or reacting to provider content. The
moment users author something that is not a comment on provider content — a catalogue name, a
description, an Argument — and another user can encounter it, the exemption is lost. That is exactly
the analysis in [`illegal-content-risk-assessment.md`](../compliance/illegal-content-risk-assessment.md),
now confirmed against the statute.

**And ADR-0012's artwork rule has statutory support, not merely prudential support:**

- `s.79(4)(a)` puts content consisting **only of text** outside regulated provider pornographic
  content. **Cataloguing an adult work in text is outside Part 5 entirely**, however explicit the work.
- `s.79(2)(a)` expressly reaches content displayed "by means of software or an automated tool or
  algorithm applied by the provider". **An automated poster importer is exactly that.**
- `s.79(7)`'s user-generated carve-out does not save it, because the importer is not a user.
- `s.79(6)(a)(ii)` closes the hotlinking route: content "embedded on the service" is caught.
- `s.81` then requires **highly effective age assurance**, a written record and a public statement,
  with **no size threshold and no non-commercial exemption**.

So "catalogue the work, never display the artwork" is the difference between no Part 5 duties and
mandatory age assurance. ADR-0012 reaches the right answer; this is the citation chain under it.

### The GDPR export, confirmed as already correct

`Art 20` is confined to data "**which he or she has provided to a controller**", and the ICO's [guidance on the right to data
portability](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-data-portability/)
draws the provided/observed/inferred line explicitly. **Data fetched from a third-party API
was not provided by the data subject**, so portability has a strong argument for not reaching it at
all. `Art 15(4)` and `Art 20(4)` add that the right "shall not adversely affect the rights and
freedoms of others", and Recital 63 names intellectual property expressly — while equally expressly
forbidding a refusal to provide *all* information.

The resolution is an engineering one, and **CAN-30 GDPR export and erasure already specifies it**:
export the user's own structure and their stable third-party *identifiers*, not the provider's field
values. Note also that a contractual restriction is not obviously a "right or freedom of others"
within Art 15(4), and per the database-right finding above a US provider may hold no UK right to
invoke — so the trimming route is narrower than it looks, and strongest for **prose** fields, where
*Technomed Ltd v Bluecrest Health Screening Ltd* [2017] EWHC 2142 (Ch) found copyright subsisting in
individual short factual entries.

---

## 9. Blast radius of a source change, measured in this repository

Checked 15 August 2026 against the working tree.

**No code.** `apps/web/src` contains `env`, `db` and the front page only; there is no TMDB client,
because **CAN-26 Import a series from TMDB, with the overlay behind it** has not been built.
`scripts/check-docs.ts` pins no TMDB claim, so CI would not break.

**Documentation:** ADR-0009 entirely; ADR-0012's Part 5 analysis (see §6 above); passing references
in ADR-0002, ADR-0003 and ADR-0004; `CLAUDE.md`'s closed-decisions list; `docs/infrastructure.md`'s
credential roster and *External data source* section; this file and
[`external-metadata-sources.md`](external-metadata-sources.md);
[`versions-and-orderings-prior-art.md`](versions-and-orderings-prior-art.md).

**Tickets:** criteria inside CAN-26, **CAN-27 Orderings and Placements, and the imported broadcast
Ordering**, **CAN-29 Author the Doctor Who in-universe chronology in production**, **CAN-30 GDPR
export and erasure**, **CAN-57 Make a public Ordering discoverable and shareable**, **CAN-13 Artwork:
uploads, rights and takedown**.

**And the cost is at its minimum right now.** ADR-0009 gives exactly two reasons for TMDB over
TheTVDB, cost being explicitly a wash: the ordering model, and images being covered by the same
attribution regime. **v1 uses neither**, on the evidence of three tickets:

- **CAN-27 Orderings and Placements, and the imported broadcast Ordering** carries the criterion
  "It does **not** read an episode group to do this."
- **CAN-26 Import a series from TMDB, with the overlay behind it** states "No artwork is imported",
  with artwork deferred to **CAN-13 Artwork: uploads, rights and takedown** in the `Later` band.
- The in-universe Ordering is hand-authored by a human under **CAN-29 Author the Doctor Who
  in-universe chronology in production**.

So **v1 consumes seasons, episode numbers, titles, runtimes and identifiers — the most generic
television metadata there is.** The switching cost rises steeply the moment CAN-13 Artwork: uploads,
rights and takedown lands.

---

## 10. The options, and how they rank against the evidence

**A finding, not a decision.** What follows ranks the available options against what §§1–9 measured.
Which option is taken is [ADR-0009](../adr/0009-external-source-tmdb.md)'s to record, not this
file's.

Ranked against the stated constraint: a public website with per-record public and private
visibility, and no reliance on a private agreement.

1. **Keep TMDB, but design as if the exception does not exist.** Rolling refresh inside six months,
   store the composed fields rather than the verbatim payload, and hold a second Source so §1.D is
   survivable. Cheapest, keeps every ADR-0009 advantage, and is the only option that needs no
   decision reversed. Costs two things in ADR-0004: "verbatim" Snapshots, and "a Source ceasing to
   carry something… is never a local delete", since an unrefreshable record must go. Note CAN-30 GDPR
export and erasure
   already uses the facts-not-payload pattern.
2. **Add an open-licensed second Source alongside TMDB.** TVmaze for television, and the overlay
   composes them. Removes the single point of failure without removing TMDB, and finally exercises
   the multi-source machinery ADR-0004 was built for. The share-alike consequence is real and
   quantified in §11 below. **Promoted on the prior art**: BookWyrm is the only project surveyed with
   no licensing exposure at all, and it got there by choosing sources that need no key — not by
   solving the licensing problem.
3. **Replace TMDB outright with an open-licensed source.** Only option where public display is
   unambiguously licensed rather than tolerated. **Demoted on the closed flag question in §6**: no
   other source carries a pornography flag, so this option removes ADR-0012's mechanism with nothing
   to put in its place. Safe only while artwork stays out of scope — i.e. while **CAN-13 Artwork:
   uploads, rights and takedown** remains in the Later band. Also loses episode groups and film.
4. **Move the licence to the user** — per-user keys. **Demoted from second place to fourth on the
   evidence in §7**, and this is the main thing the research changed. It buys nothing on rate limits,
   because TMDB limits by IP and CanonCore is centrally hosted; it would **lose** the retention
   exception, because §10.E makes the terms personal and non-transferable; and serving more than one
   person makes you the licensee regardless, which TheTVDB has written into its terms and Radarr's
   maintainers learned by being contacted about it. No surveyed project routes a per-user key into
   public output. The prior art uses BYOK as an entitlement upgrade, essentially never as a licence
   substitute.
5. **Fall back to TheTVDB**, as ADR-0009 currently directs. Ranked last because it re-introduces a
   licence gate, and because the fallback was chosen from a candidate set that never contained
   TVmaze, the Grand Comics Database, Metron or ISFDB.

**On the provider contract specifically.** It remains right for tardis.wiki, and §5 strengthens that:
for audio drama there is no lawful alternative at all. But it is **not** a licence-shedding device for
the general source. Plex's own reference implementation puts the API key in the provider operator's
`.env`, which relocates the obligation onto a community member with fewer resources and no agreement
with TMDB rather than dissolving it. The part of the contract genuinely worth building is the
**capability endpoint declaring licence, attribution and image rights** — which no product anywhere
has, and which ADR-0007 and CAN-14 Entity pages with prose both already anticipate.

tardis.wiki as a custom provider is unaffected by all of this and remains correct as recorded on
**CAN-8 Provider: tardis.wiki chronologies (separate repo)**.

---

## 11. The share-alike consequence, and the mixing problem

If an open CC BY-SA source is adopted, this is the cost, and it is smaller than it first appears.

**Read verbatim from the [CC BY-SA 4.0 legal code](https://creativecommons.org/licenses/by-sa/4.0/legalcode.en)
on 15 August 2026**, closing the gap this section previously flagged. Section 4:

> Where the Licensed Rights include Sui Generis Database Rights that apply to Your use of the Licensed
> Material: […] **if You include all or a substantial portion of the database contents in a database in
> which You have Sui Generis Database Rights, then the database in which You have Sui Generis Database
> Rights (but not its individual contents) is Adapted Material, including for purposes of Section
> 3(b)**; and You must comply with the conditions in Section 3(a) if You Share all or a substantial
> portion of the contents of the database.

**It is a deeming provision** — which was the open question. Share-alike attaches because §4 says so,
not because copyright subsists in anything, and the parenthesis "(but not its individual contents)"
is express. Section 3(b), which makes the mixing problem below a hard one rather than a drafting one:

> You may not offer or impose any **additional or different terms or conditions** on, or apply any
> Effective Technological Measures to, Adapted Material that **restrict exercise of the rights granted
> under the Adapter's License You apply**.

CanonCore, UK-established, **would** hold a UK sui generis right in its own database — unlike TMDB.
So §4(b) bites. What it reaches:

| | Caught by share-alike? |
| --- | --- |
| The catalogue as a database | **Yes** |
| The individual facts | **No** — expressly excluded |
| Arguments and other authored prose | **No** — separate literary works, not contents of the licensed database |
| The application source code | **No** — not the database |

For a product whose premise is publishing Orderings, that is close to costless, and it is the
identical trade tardis.wiki already imposes under CAN-8 Provider: tardis.wiki chronologies
(separate repo).

### Mixing licence regimes in one database is not coherent

This was the open question, and it now has an answer that constrains the multi-source design.

| Source type | What it demands of the aggregate |
| --- | --- |
| **CC0** | Nothing. Absorbable into anything. Never the problem |
| **CC BY-SA 4.0** | If the result is Adapted Material it must be BY-SA, **and no additional or different terms may be imposed that restrict the granted rights** |
| **Proprietary API terms** | The data must **not** be freely redistributable, must be purgeable, and carries restrictions |

**The last two contradict directly, and no drafting reconciles them.** You cannot offer an aggregate
as BY-SA when part of it is data you are contractually forbidden to redistribute; and you cannot obey
the provider's terms while offering the aggregate as BY-SA.

**The answer is segregation with per-record provenance** — each source's records identifiable, and no
output mixing them into a single new database in which the project claims database rights. Which is
**precisely what ADR-0004 already does**: `(record, source)` keys every Snapshot, sources compose by
configured order, and provenance is per row. The architecture built for representing disagreement
turns out to be the same architecture that keeps licences separable, and the same one that makes a
purge survivable. That is a genuinely fortunate alignment rather than a designed one, and it is worth
recording as a reason not to flatten the overlay later for convenience.

Attribution reinforces it: CC BY and CC BY-SA both require it per source, so **per-record provenance
is required by the licences, not merely convenient**.

Both provisions are now read verbatim above, so this conclusion no longer rests on inference.

---

## Not covered

Listed rather than hidden. None of these changes a conclusion above; the two that would have were
closed (§6, §11).

1. **The TheTVDB image-rights discrepancy** (§4). ADR-0009 says its terms deny image display rights in
   capitals; the live `api-information` page says TheTVDB claims no ownership of images or data. Both
   cannot be the whole picture, and it must be resolved before TheTVDB is relied on either way. **The
   highest-value remaining gap.**
2. **Ofcom's guidance** on the scope of regulated services and on highly effective age assurance.
   The statutory analysis in §8 is complete; Ofcom's gloss on it is not retrieved.
3. **Whether TMDB's UK-establishment position could ever satisfy `SI 1997/3032 reg 18(1)(b)`.** The
   database-right conclusion assumes not, on the ordinary facts of a US corporation. Fact-specific
   and unchecked.
4. **Navidrome's Share feature** — the one remaining place in the prior art where a user-supplied key
   might reach anonymous strangers. The negative in §7 is therefore provisional, though nothing turns
   on it given the other three reasons BYOK fails.
5. **Coverage measurements against the Doctor Who corpus specifically.** §5 measures each source's
   total scale; none was measured against this collection, the way
   `external-metadata-sources.md` does for the original seven.
6. **Simkl, Watchmode, JustWatch, DBpedia, EIDR, AniList, Fanart.tv, IMDb's non-commercial datasets**
   — named in the brief, not reached.
7. **ISFDB's bulk dumps** — known to exist, location and licence wording unverified; the wiki page is
   now login-gated and the old paths 404.
8. **BBC Programmes.** One fact is verified: `bbc.co.uk/programmes/b006q2x0.json` returns HTTP 200
    today with real JSON (brand *Doctor Who (2005–2022)*, `aggregated_episode_count: 186`). The
    governing BBC terms, the `.rdf`/`.xml` variants and whether Nitro still exists are all unverified.
    Worth pursuing — it is the broadcaster's own data for the seed collection.
9. **Library of Congress, Internet Archive, Podcast Index, Amazon PA-API/Audible, British Library,
    DNB, BnF, OCLC/WorldCat.** Dispatched, never returned. Amazon's caching and purge clauses are
    reportedly strict and were the main thing wanted there.
10. **Google Books**: the incorporated Google APIs ToS — where a general termination clause would
    live — plus attribution requirements, published rate limits, and `maturityRating`.

---

## What these findings bear on, and who owns each

**Findings, not decisions.** This file records what was measured; what to do about any of it belongs
in `docs/adr/` or on a ticket, per [`README.md`](README.md)'s precedence rule. Each item below names
its owner.

One is live today regardless of whether TMDB ever withdraws anything.

**1. ADR-0009's Fallback was selected from an incomplete candidate set.** The candidates were TMDB,
TheTVDB, MusicBrainz, Open Library, Wikidata, tardis.wiki and Big Finish. **TVmaze, the Grand Comics
Database, Metron and ISFDB were never assessed**, and all four are better than TheTVDB on the exact
axis the Fallback exists to protect: no retention limit, no purge clause, and an open licence
permitting public redistribution.
**Owned by CAN-94 Re-derive ADR-0009's fallback from the completed source set**, which carries the
re-derivation as acceptance criteria.

**2. `versions-and-orderings-prior-art.md` is missing the closest prior art there is.** It records
TMDB Episode Groups and TheTVDB season types as "the two public schemas worth borrowing vocabulary
from". **Metron's reading lists are closer to this product's model than either** — ordered items,
typed entries, chained lists, and an attribution field crediting the external ordering the list came
from. Worth reading before **CAN-27 Orderings and Placements, and the imported broadcast Ordering**
is built, regardless of whether Metron is ever used as a source.

**3. The audio-drama gap is now measured, and it is closed.** No lawful machine-readable source
exists: Big Finish permits personal use only and MusicBrainz covers roughly a third of the story
pages. This makes **CAN-8 Provider: tardis.wiki chronologies (separate repo)** more load-bearing than
its Later placement implies — for a large part of this domain, the provider is not an enrichment, it
is the only route.

**4. ADR-0012 should cite the statute, not only the reasoning.** §8 supplies the chain: `s.79(4)(a)`
puts text-only cataloguing outside Part 5; `s.79(2)(a)` catches an automated poster importer;
`s.79(7)` does not save it because the importer is not a user; `s.79(6)(a)(ii)` closes hotlinking;
`s.81` then requires highly effective age assurance with no size threshold. The ADR reaches the right
answer already — this is the citation chain that makes it checkable.

**5. CAN-34 Attach TMDB's written retention approval is worth more than it looks.** It has been read
as a retention permission. It is also the thing that collapses the accessory-liability analysis in
§8: the first element of inducing breach of contract is an actual breach, and written permission
means there is none. Its four provenance gaps (§3) matter more once that second job is visible.

**6. Nothing in the repo should adopt CDPA s.29A as a justification.** §8 shows it fails four ways.
Recorded here because it is the obvious-looking argument a future reader will reach for.
