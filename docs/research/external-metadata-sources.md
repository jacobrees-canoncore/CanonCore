# External metadata sources for a personal media-collection workspace

**Worked example: Doctor Who.** Researched 2026-08-08.

## Why this document exists

A Doctor Who collection is the adversarial case for media metadata. It spans film, television, audio drama, novels,
comics and magazine strips; the same story exists as a broadcast serial, a novelisation, an audiobook and a re-edit;
and fans order it by broadcast, by production, by range number, and by in-universe chronology, all of which disagree.
This document asks of each candidate source: **what can it actually hold, where does it stop, and what are the licence
and access terms?**

Everything below was checked against the source that owns the claim — official API documentation, the provider's own
terms pages, or a live call to the API itself. Live results are dated 2026-08-08. Nothing here comes from a
third-party write-up.

> **Exclusion note.** Per this repository's standing constraint, no prior repository or page matching `canoncore*`,
> `CanonCore*` or `universora*` was read, fetched, cloned or quoted during this research. No such result surfaced in
> any search performed; had one, it would have been discarded and noted here.

## The one-paragraph answer

No single source covers the domain. **tardis.wiki** is the only complete catalogue and the one you are least free to
harvest: `api.php` works, is fully semantic, and is `Disallow`ed for every user agent. **MusicBrainz** is the only
source whose data model natively expresses both "multiple orderings of the same set" and "multiple versions of the
same work", and its core data is CC0. **Wikidata** is the join table, not a catalogue. **TMDB** and **TheTVDB** cover
the television and film spine well and everything else barely; they disagree about whether a canonical ordering
exists, and about whether you may keep what you fetch. **Open Library** models editions well and covers Doctor Who
prose only partially. **Big Finish** has no API at all. The gaps in the matrix at the end are the design problem, and
the licensing differences are the second one.

---

## 1. TMDB (API v3 / v4)

No TMDB API key was available in this environment (`env | grep -i tmdb` empty; an unauthenticated
`GET /3/tv/121/episode_groups` returned `401 {"status_code":7,"status_message":"Invalid API key…"}`). Everything below
therefore comes from TMDB's own OpenAPI 3.1 spec
([developer.themoviedb.org/openapi/tmdb-api.json](https://developer.themoviedb.org/openapi/tmdb-api.json)), TMDB's
reference docs, TMDB's Contribution Bible, and TMDB's own rendered pages for Doctor Who (TV id 121), which are live
TMDB data.

### Episode groups: the type enum

From [tv-episode-group-details](https://developer.themoviedb.org/reference/tv-episode-group-details), introduced by
"Groups support 7 different types which are enumerated as the following:"

| `type` | Name |
|---|---|
| 1 | Original air date |
| 2 | Absolute |
| 3 | DVD |
| 4 | Digital |
| 5 | Story arc |
| 6 | Production |
| 7 | TV |

Two traps: this table appears **only** on the details reference page, not on
[tv-series-episode-groups](https://developer.themoviedb.org/reference/tv-series-episode-groups); and the OpenAPI spec
types `type` as a bare `integer` with **no enum**, so nothing in the machine-readable contract tells a client what 5
means.

### Response shapes (verbatim field names)

`GET /3/tv/{series_id}/episode_groups`:

```
results[]  { description, episode_count, group_count, id (string, 24-hex), name,
             network { id, logo_path, name, origin_country }, type (integer) }
id         (integer — the series id)
```

`GET /3/tv/episode_group/{tv_episode_group_id}` (path param typed `string`):

```
description, episode_count, group_count, id (string), name, type (integer),
network { id, logo_path, name, origin_country },
groups[] {
  id (string), name, order (integer), locked (boolean),
  episodes[] { air_date, episode_number, id, name, overview, production_code,
               runtime, season_number, show_id, still_path, vote_average,
               vote_count, order (integer) }
}
```

Note the **two distinct `order` fields**: `groups[].order` sequences the sub-groups; `groups[].episodes[].order`
sequences episodes within a sub-group (0-based in TMDB's own example).

### Can an episode be in more than one group?

**Yes, verified against live TMDB data.** Doctor Who (TV id 121) has five episode groups
([themoviedb.org/tv/121-doctor-who/episode_groups](https://www.themoviedb.org/tv/121-doctor-who/episode_groups)):

| Group | Type shown | Sub-groups / episodes |
|---|---|---|
| Doctor Who: The Collection (Blu-ray) | DVD | 18 / 409 |
| BBC iPlayer | Digital | 29 / 642 |
| The Doctor Order | Story Arc | 8 / 699 |
| Story Order | Story Arc | 156 / 723 |
| Official Stories Order | Story Arc | 27 / 701 |

Season 1 episode 1 appears both in the "First Doctor" sub-group of *The Doctor Order* and in the first sub-group of
*Official Stories Order*. TMDB's General Bible says so as policy too: "Please do not ask us to change the episodes to
a non-original order. There is an 'Episode Group' feature that can be used for all and any alternative orders."
([themoviedb.org/bible/general](https://www.themoviedb.org/bible/general))

Whether the same episode may appear **twice inside one group** is **unverified** — no TMDB document states a
uniqueness rule and the schema imposes none. Live data is consistent with uniqueness (The Doctor Order's eight
sub-groups sum to exactly its stated 699) but that does not establish the rule.

### Nesting

**No. Exactly one level of sub-group.** A `groups[]` item has only `id`, `name`, `order`, `episodes`, `locked` — no
nested `groups` key, no parent id
([OpenAPI spec](https://developer.themoviedb.org/openapi/tmdb-api.json)). Sub-group URLs are
`/episode_group/{id}/group/{group_id}` with no deeper level. The model is fixed at:
**series → episode group (one ordering) → named sub-group (one run) → episodes.** `locked` marks a sub-group as
moderator-locked.

But the sub-groups *are* named, which is the useful half: "First Doctor", "Second Doctor" … are exactly the named
sub-groups of *The Doctor Order*.

### Is there a default group?

**No.** The `/3/tv/{series_id}` response schema has no episode-group field at all. Across the entire 3 MB OpenAPI
document the string `episode_group` occurs 4 times, all inside the two episode-group paths; the only group-related
keys anywhere are `groups`, `group_count`, and the path parameter. `/3/configuration`'s `change_keys` list has no
episode-group key either.

**Consequence:** choosing which of Doctor Who's five orderings is "the" order is a client-side product decision, not
data you can read.

### Alternative cuts and versions

TMDB **explicitly refuses to model them.** Contribution Bible, New Content
([themoviedb.org/bible/new_content](https://www.themoviedb.org/bible/new_content)), verbatim:

> "We currently do not support alternative film versions—including extended editions, director cuts, 3D versions and
> fan cuts of previous films… Exceptions to this rule are very, very rare and DRASTIC changes are required… Any
> alternative version added without Travis' approval will be deleted."
>
> "This is also true for TV series. Duplicate entries for alternative episode splits are not allowed."

The "Not Supported" list on the same page names "Alternative versions, including 3D/IMAX, director's cut, extended
versions, dubbed versions, remastered versions, commentary…".

For television, General Bible: "episodes should be added as they first aired on their original channel. We do not
support different episode splits at this time (e.g. if a miniseries aired as three episodes in the US and five
episodes in the UK)." That is the direct answer on omnibus-vs-episodic: **TMDB stores one canonical split.**

The only place a special edition can be recorded is free text: the Movie Bible's release-date `Note` field "can be
used to add relevant info relating to the release: … A special edition e.g. Blu-ray - Collector's Edition"
([themoviedb.org/bible/movie](https://www.themoviedb.org/bible/movie)). Structurally the spec has no `versions`,
`cut`, or `edition` field.

### Images

| Endpoint | Keys returned |
|---|---|
| `/3/movie/{id}/images`, `/3/tv/{id}/images` | `backdrops`, `logos`, `posters`, `id` |
| `/3/tv/{id}/season/{n}/images` | `posters`, `id` |
| `/3/tv/{id}/season/{n}/episode/{n}/images` | `stills`, `id` |
| `/3/person/{id}/images` | `profiles`, `id` |
| `/3/network/{id}/images`, `/3/company/{id}/images` | `logos`, `id` |

Each item carries `aspect_ratio, height, width, iso_639_1, file_path, vote_average, vote_count`.
Size buckets from `/3/configuration`, base `https://image.tmdb.org/t/p/`:

```
poster_sizes:   w92, w154, w185, w342, w500, w780, original
backdrop_sizes: w300, w780, w1280, original
logo_sizes:     w45, w92, w154, w185, w300, w500, original
profile_sizes:  w45, w185, h632, original
still_sizes:    w92, w185, w300, original
```

Aspect ratios, verbatim from the Image Bible ([themoviedb.org/bible/image](https://www.themoviedb.org/bible/image)):

- **Posters** — JPEG only. "An aspect ratio of 1:1.5 (2:3) is usually preferred"; 1:1.33, 1:1.41 and 1:1.5 supported.
  "at least 500x750px and cannot be larger than 2000x3000px". Primary poster must be "naked/clean… no credits, text
  (other than title), taglines or logos", exactly 1:1.5, minimum 1000x1500px. Season posters minimum 400x578px.
- **Backdrops** — JPEG only. "Backdrops should have an aspect ratio of 1.78:1 (16x9)"; "at least 1280x720px and
  cannot be larger than 3840x2160px".
- **Stills** — an API-level name only; the bible files them as episodic backdrops with a 400x225px minimum.
- **Profiles** — JPEG only, "aspect ratio of exactly 1:1.5 (2:3) is required", 300x450px to 2000x3000px.
- **Logos** — "SVG, transparent PNG and last, PNG on a solid background"; "There are no aspect ratio restrictions";
  max 2000px in either dimension. Note `/3/configuration`'s caveat that `logo_path` always returns `.png` for
  backwards compatibility, and "For SVG's, you should call the original image size since we don't resize them"
  ([image-basics](https://developer.themoviedb.org/docs/image-basics)).

### Terms of use for a public non-commercial app

Canonical page: [themoviedb.org/api-terms-of-use](https://www.themoviedb.org/api-terms-of-use), last updated
20 October 2023. The old `/documentation/api/terms-of-use` URL 301s to it.

**Attribution (Paragraph 3), verbatim:**

> "You must use the TMDB logo to identify Your use of TMDB, the TMDB APIs, or TMDB Content. Any use of any TMDB logos
> in Your Application must be less prominent than the logos or marks that primarily describe or identify Your
> Application and must make it clear that use of any TMDB logos does not imply any endorsement, certification, or
> other approval by TMDB. In addition, You must place the following notice prominently in or on Your Application:
> 'This [website, program, service, application, product] uses TMDB and the TMDB APIs but is not endorsed, certified,
> or otherwise approved by TMDB.'"

The FAQ adds that attribution "must be within your application's 'About' or 'Credits' type section" and that an
approved logo must be used ([developer.themoviedb.org/docs/faq](https://developer.themoviedb.org/docs/faq)); approved
SVGs and brand colours (`#0d253f`, `#01b4e4`, `#90cea1`) at
[themoviedb.org/about/logos-attribution](https://www.themoviedb.org/about/logos-attribution).

**Rate limits**, verbatim from [docs/rate-limiting](https://developer.themoviedb.org/docs/rate-limiting):

> "As of December 16, 2019, we have disabled the original API rate limiting (40 requests every 10 seconds.)… While our
> legacy rate limits have been disabled for some time, we do still have some upper limits to help mitigate needlessly
> high bulk scraping. They sit somewhere in the 40 requests per second range. This limit could change at any time so
> be respectful of the service we have built and respect the `429` if you receive one."

**Caching and storage.** The Restrictions list (Paragraph 1.C) forbids you to:

> "Cache, for longer than 6 months, any information obtained through or from TMDB or the TMDB APIs."

and to "Make derivatives of the TMDB APIs or TMDB Content", and to "Use the TMDB APIs or TMDB Content in connection
with, including for training, a machine learning (ML) or artificial intelligence (AI) based Application."
Paragraph 1.D requires that on termination "you must promptly delete or otherwise purge all TMDB Content, including
any cached content."

**This is the single most load-bearing constraint in this whole document for TMDB:** a permanent local import of TMDB
data is not permitted. The persistence layer needs a TTL and refresh policy from day one. (Whether a continuously
refreshed row counts as "cached for longer than 6 months" is not addressed by TMDB and is **unverified**; the safe
reading is that every record must be re-fetched or dropped inside six months.)

The AI/ML prohibition sits in 1.C, in the *non-commercial* licence — it is not merely a commercial-use trigger.

Free non-commercial use is confirmed in the FAQ: "Our API is free to use for non-commercial purposes as long as you
attribute TMDB as the source of the data and/or images." A project is commercial "if the primary purpose is to create
revenue for the benefit of the owner."

Auth ([authentication-application](https://developer.themoviedb.org/docs/authentication-application)): v3 takes
either an `api_key` query parameter or the API Read Access Token as `Authorization: Bearer <token>`; the bearer token
works for both v3 and v4.

### The four questions

- **(a) Covers DW audio drama / comics / magazine strips?** No. The New Content bible lists as not supported
  "Audio-only content including audiobooks, narrative podcasts, radio dramas, and audio movies", and there is no
  comics or print category at all (motion comics are the single exception, as screen content).
  ([bible/new_content](https://www.themoviedb.org/bible/new_content))
- **(b) Story-order rather than broadcast order?** Yes — `type: 5` is literally "Story arc", and Doctor Who already
  carries three live story-arc groups plus DVD and Digital groups.
- **(c) More than one version of the same work?** No, and TMDB says so explicitly. Episode groups reorder and rebundle
  one canonical episode set; they cannot add, merge or split episode records.
- **(d) May this project legally read and store it?** Yes, non-commercially, subject to three conditions: approved
  logo plus the Paragraph 3 notice in an About/Credits section; **no cache older than 6 months**; no use in or for any
  AI/ML application.

---
## 2. TheTVDB v4 API

Primary sources: TheTVDB's own OpenAPI document
[thetvdb.github.io/v4-api/swagger.yml](https://thetvdb.github.io/v4-api/swagger.yml) (`info.version: 4.7.10`, served
as `text/yaml`; `swagger.json` at the same host is a 404), TheTVDB's own
[`thetvdb/v4-api` README](https://raw.githubusercontent.com/thetvdb/v4-api/main/README.md), their support
knowledgebase at `support.thetvdb.com`, and their own rendered site pages. No TVDB API key was available:
`GET https://api4.thetvdb.com/v4/seasons/types` unauthenticated returns `401 {"message":"Unauthorized"}`.

### Season / order types — the full list

The order is a **path segment**, not a query parameter:

```
GET /series/{id}/episodes/{season-type}
GET /series/{id}/episodes/{season-type}/{lang}
```

> "Returns series episodes from the specified season type, default returns the episodes in the series default season
> type"

The `SeasonType` schema is a free-form record with no enum, verbatim:

```yaml
SeasonType:
  description: season type record
  properties:
    alternateName: { type: string }
    id:            { format: int64, type: integer }
    name:          { type: string }
    type:          { type: string }
```

The spec's `examples` for the path parameter list only `default | official | dvd | absolute | alternate | regional`
— **that list is incomplete.** Recovered from TheTVDB's own site markup (`<a href="#seasons-{slug}"
class="change_seasontype" data-type="{id}">` on [thetvdb.com/series/the-office-us](https://thetvdb.com/series/the-office-us),
with canonical names confirmed from the `<title>` of `/series/{slug}/allseasons/{slug}` pages), the complete set is
**seven**:

| `id` | `type` (URL slug) | canonical `name` |
|---|---|---|
| 1 | `official` | Aired Order |
| 2 | `dvd` | DVD Order |
| 3 | `absolute` | Absolute Order |
| 4 | `alternate` | Alternate Order |
| 5 | `regional` | Regional Order |
| 6 | `altdvd` | Alternate DVD Order |
| 7 | `alttwo` | Alternate Order 2 |

Probing the router confirms the closed set: all seven slugs return 200 on
`https://thetvdb.com/series/naruto-shippuden/allseasons/{slug}`, while `altthree`, `chronological`, `story`,
`production`, `streaming`, `netflix` and `combined` all 404. The literal `default` is additionally accepted by the API
path and means "this series' own default order".

**The important subtlety: an order slot can be re-labelled per series.** From TheTVDB's README, §Season Types:

> "Season types can also be named. Using the Money Heist example, we don't display 'Alternate Order' on the site but
> rather 'Netflix'. This information is included when retrieving the seasons for a series."

So slot 4 (`alternate`) is displayed as **"Story Order"** on [One Piece](https://thetvdb.com/series/one-piece) and as
**"BBC iPlayer"** on [Doctor Who (2005)](https://thetvdb.com/series/doctor-who-2005); slot 6 is displayed as "BluRay
Order" on The Office with the caption *"Usable as 'Alternate DVD Order' in API-connected systems"*. Which of
`SeasonType.name` and `SeasonType.alternateName` carries the canonical name versus the per-series label is
**unverified** — both carry `x-go-name: Name` in the spec, which is a spec bug. The strong inference is `name` =
canonical, `alternateName` = per-series label, since `/seasons/types` is series-independent.

**Design consequence: there are only seven slots, globally, and their meaning is per-series.** A consumer cannot rely
on `alternate` meaning "story order" anywhere except by reading the label.

### Does a series name a default order?

**Yes — the field TMDB lacks.** Present on both `SeriesBaseRecord` and `SeriesExtendedRecord`:

```yaml
defaultSeasonType:
  format: int64
  type: integer
  x-go-name: DefaultSeasonType
```

It holds a `SeasonType.id`, not a slug. README: "The series base record includes the id of the default season order,
which is generally 'Aired Order'." `SeriesExtendedRecord` additionally exposes `seasonTypes: [SeasonType]` (the orders
this series actually has) and `seasons: [SeasonBaseRecord]`.

### Can an episode be absent from a given order?

**Yes — an order is a partial covering, and TheTVDB says so in as many words.** README, §Season Types:

> "All series can have multiple seasons associated with them. **Episodes don't have to exist within every season
> type.** For example, when Netflix aired Money Heist, they completely re-cut the episodes. The episodes representing
> the original order are different than those representing the Netflix order. Both sets are assigned to the series
> using a different season type."

Note the stronger implication: in the re-cut case those are **different episode records**, not the same records
reshuffled. That is the closest thing to a version model anywhere in TheTVDB, and it is a side effect rather than a
feature. Visible on [The Office alternate-DVD order](https://thetvdb.com/series/the-office-us/allseasons/altdvd),
which ends with an "Additional Specials" block of episodes belonging to no season of that order.

A caveat that will bite an importer: `EpisodeBaseRecord.seasonNumber` / `number` / `absoluteNumber` are, per the
README, "that episode's information within the **default** season order" — so the numbers on a bare episode record
are not the numbers of the order you queried.

### Does an order get its own named seasons?

**Yes, and they are addressable entities.** `SeasonBaseRecord`:

```yaml
SeasonBaseRecord:
  properties:
    id, image, imageType, lastUpdated, name, nameTranslations,
    number:   { type: integer, format: int64 }
    overviewTranslations, companies
    seriesId: { type: integer, format: int64 }
    type:     { $ref: '#/components/schemas/SeasonType' }
    year:     { type: string }
```

`SeasonExtendedRecord` adds `episodes`, `artwork`, `trailers`, `translations`, `tagOptions`. And crucially
`EpisodeBaseRecord` / `EpisodeExtendedRecord` both carry `seasons: [SeasonBaseRecord]` — **one episode lists the
several typed seasons it belongs to.** Live evidence:
`https://thetvdb.com/series/doctor-who-2005/seasons/absolute/1` is season record 1747450, titled "The Complete
Series - Season 1" — a *named* season inside a non-default order.

This is a stronger model than TMDB's flat, anonymous sub-groups.

### Endpoint paths, verbatim

All relative to `https://api4.thetvdb.com/v4`.

```
POST /login                                   (token "valid for 1 month", per info.description)
GET  /series/{id}                             GET /series/{id}/extended
GET  /series/{id}/episodes/{season-type}      GET /series/{id}/episodes/{season-type}/{lang}
GET  /series/{id}/artworks                    GET /series/{id}/nextAired
GET  /series/{id}/translations/{language}     GET /series/slug/{slug}
GET  /series      GET /series/filter          GET /series/statuses
GET  /seasons     GET /seasons/{id}           GET /seasons/{id}/extended
GET  /seasons/types                           GET /seasons/{id}/translations/{language}
GET  /episodes    GET /episodes/{id}          GET /episodes/{id}/extended
GET  /movies      GET /movies/{id}            GET /movies/{id}/extended
GET  /movies/filter  GET /movies/slug/{slug}  GET /movies/statuses
GET  /artwork/{id}   GET /artwork/{id}/extended
GET  /artwork/types  GET /artwork/statuses
GET  /search      GET /search/remoteid/{remoteId}
GET  /updates     GET /lists/{id}/extended    GET /entities
```

`operationId`s: `getSeriesExtended`, `getSeriesEpisodes`, `getSeriesSeasonEpisodesTranslated`, `getSeason`,
`getSeasonExtended`, `getSeasonTypes`, `getSeriesArtworks`, `getAllArtworkTypes`.

`/series/{id}/artworks` description, verbatim: *"Returns series artworks base on language and type. Note: Artwork type
is an id that can be found using /artwork/types endpoint."* `ArtworkType` fields: `id`, `name`, `recordType`, `slug`,
`width`, `height`, `thumbWidth`, `thumbHeight`, `imageFormat`.

Artwork type ids recovered from TheTVDB's own upload links:

- **Series** (7): 1 Banner, 2 Poster, 3 Background, 5 Icon, 20 Cinemagraph, 22 ClearArt, 23 ClearLogo
  ([KB 98](https://support.thetvdb.com/kb/faq.php?id=98))
- **Season** (4): 6 Banner, 7 Poster, 8 Background, 10 Icon ([KB 58](https://support.thetvdb.com/kb/faq.php?id=58))
- **Movie** (7): 14 Poster, 15 Background, 16 Banner, 18 Icon, 21 Cinemagraph, 24 ClearArt, 25 ClearLogo
  ([KB 99](https://support.thetvdb.com/kb/faq.php?id=99))
- Episode / person / list artwork type ids: **unverified** (not exposed to logged-out visitors).

TheTVDB advises against hard-coding these: "We recommend against hard-coding the values from these endpoints unless
necessary" (README, §Endpoints To Heavily Cache).

### Alternative cuts and versions

**Not modelled.** No version, cut or edition field exists on `MovieBaseRecord`, `MovieExtendedRecord`,
`EpisodeBaseRecord` or `EpisodeExtendedRecord`. `MovieExtendedRecord.releases` is `[{country, date, detail}]` — a
territory release date, not a cut. Aliases are alternative *titles*.

Editorial policy is separate records, rarely:

> "For any director's cuts, re-cuts, or other alternate cuts of a film, a new, separate record may be created **only
> if the plot of the re-cut is significantly different than the original**… If the re-cut simply has an alternate
> ending or a few deleted scenes, it is not to be added."
> ([KB 83](https://support.thetvdb.com/kb/faq.php?id=83))

> "Director's cuts of individual episodes are also not allowed, however, exceptions may be made in strange cases."
> ([KB 19](https://support.thetvdb.com/kb/faq.php?id=19))

### Licensing and API-key terms

**Two routes to a key, both viable for a personal project.**

Commercial licence pricing, verbatim from [thetvdb.com/api-information](https://thetvdb.com/api-information):

| Company Revenue | Licensing Fee |
|---|---|
| Less than $50k per year | **free** — *requires attribution* |
| $50k to $250k per year | $1,000 / year |
| $250k to $1M per year | $10,000 / year |
| $1M+ or custom terms | Contact Us |

> "When determining your tier, please consider the revenue of your parent company. It is your responsibility to
> ensure that you select the correct tier."

Alternatively the user-supported route: "All API keys are required to have either a commercial license, or have
subscriptions enabled for end users" ([KB 62](https://support.thetvdb.com/kb/faq.php?id=62)). At key creation you
pick **Negotiated Contract** (queued for sales review, key inactive until approved) or **End-User Subscriptions**
("your key will be automatically approved and ready for use"), and "Developers of projects may begin development
immediately by creating a single subscription account for yourself, and use your own PIN for authentication"
([KB 81](https://support.thetvdb.com/kb/faq.php?id=81)). A user subscription is **$11.99/year**
([thetvdb.com/subscribe](https://thetvdb.com/subscribe)), and can be earned free by contributing data.

**Licence terms**, verbatim from [thetvdb.com/tos](https://thetvdb.com/tos) §2:

> API licence: "a worldwide, non-exclusive, non-transferable, revocable and limited license to access and use the API
> **solely for the product or project for which you have been provided access**, as reflected in the information that
> you provided to us prior to being provided with the API key."

> Restrictions: "you may not: (i) modify, disclose, alter, translate or create derivative works of the API…;
> (ii) license, sublicense, resell, distribute, lease, rent, lend, transfer, assign or otherwise dispose of the API
> **or the Data**; … (iv) **make excessive calls to the API, as determined by us**; or (v) use the API or the Data in
> any unlawful manner."

> In caps: "THE TERMS OF THE API LICENSE DO NOT GIVE YOU AUTHORIZATION TO USE OR DISPLAY IMAGES, TRAILERS OR
> PROGRAMMING ASSOCIATED WITH THE API; IF YOU CHOOSE TO USE IMAGES, TRAILERS OR PROGRAMMING, IT IS YOUR
> RESPONSIBILITY TO SECURE FROM AND PAY TO THE RELEVANT CONTENT OWNERS ANY AND ALL RIGHTS AND PAYMENTS YOU REQUIRE."

**Read that clause carefully: artwork paths are metadata you may fetch, not a licence to display the images.** That is
a materially different posture from TMDB, whose terms cover images under the same attribution regime.

**Attribution**, verbatim from [api-information](https://thetvdb.com/api-information):

> "Unless approved by TheTVDB, attribution with a direct link to TheTVDB.com must be displayed to end users viewing
> metadata from our API. Command line products or development libraries may display attribution on your about or
> readme pages."

Their sample string: *"Metadata provided by TheTVDB. Please consider adding missing information or subscribing."*

**Rate limits: no published number.** The swagger spec contains no mention of rate limiting, 429, throttling or
quotas, and neither the README nor the knowledgebase gives a figure. The only governing text is the ToS prohibition
on "excessive calls to the API, as determined by us". Login tokens are "valid for 1 month".

**Caching and storage: explicitly encouraged** — the opposite of TMDB. README, §Best Practices:

> "We strongly recommend maintaining your own copy of the database or making use of a caching proxy if your end users
> make direct use of data from TheTVDB."

with a documented pattern of full import followed by polling `/updates`, and reference endpoints that "can safely
cache these for a week or even longer". Note the tension with the ToS clause forbidding you to "distribute … the
Data": **storing it for your own product is endorsed; redistributing it is not.**

Terms may change unilaterally: ToS §9, and the README's "We reserve the right to change our interfaces, fees, or
licensing terms at any point without notice." Governing law is California, venue Los Angeles County (ToS §12).

### The four questions

- **(a) Covers DW audio drama / comics / magazine strips?** Audio drama: **partially and unexpectedly yes** —
  [thetvdb.com/series/doctor-who-big-finish](https://thetvdb.com/series/doctor-who-big-finish) exists as a real series
  record (Series ID 426420, first aired 1 September 1998, orders Aired + Absolute), because audio content is
  admissible as a web series/podcast ([KB 21](https://support.thetvdb.com/kb/faq.php?id=21)). Completeness of that
  record is **unverified**. Comics and magazine strips: no — the only record types that exist are Series, Movie,
  Person and List.
- **(b) Story-order rather than broadcast order?** Yes within a series, as one of seven fixed slots — One Piece's
  slot 4 is literally labelled "Story Order". Specials additionally carry `airsBeforeSeason` / `airsBeforeEpisode` /
  `airsAfterSeason` for story placement. **Across** works the only primitive is a List
  (`ListExtendedRecord.entities: [{seriesId, movieId, order}]`), and lists become official only at TheTVDB's
  editorial discretion ([KB 63](https://support.thetvdb.com/kb/faq.php?id=63)).
- **(c) More than one version of the same work?** No. Separate movie records only where "the plot of the re-cut is
  significantly different"; alternate cuts of episodes are disallowed outright. Season types re-order, they do not
  version.
- **(d) May this project legally read and store it?** Yes, with conditions: obtain a key under End-User Subscriptions
  (auto-approved) plus a $11.99/yr subscription PIN, or a free-tier licensed key if parent-company revenue is under
  $50k/yr. Storing a local copy is explicitly recommended. You must show attribution with a direct link to
  TheTVDB.com; the key is valid only for the one project you declared; you may not redistribute the Data; and the
  licence does **not** cover displaying artwork or trailers.

---
## 3. MusicBrainz

### The entity model

MusicBrainz separates four things that a media-collection app is tempted to conflate.

- **Work** — "a distinct intellectual or artistic creation, which can be expressed in the form of one or more audio
  recordings" ([musicbrainz.org/doc/Work](https://musicbrainz.org/doc/Work)). The abstract script/play.
- **Recording** — "an entity in MusicBrainz which can be linked to tracks on releases"
  ([musicbrainz.org/doc/Recording](https://musicbrainz.org/doc/Recording)). Properties are Title, Artist, Length, ISRC,
  MBID, disambiguation, annotation.
- **Release** — "the unique release (i.e. issuing) of a product containing at least one audio medium (a disc, for
  example, on a CD release)" ([musicbrainz.org/doc/Release](https://musicbrainz.org/doc/Release)). This is the *edition*
  level: the 1999 UK 2-CD jewel case is one release; the download is another.
- **Release group** — "used to group releases into a single logical entity. Every release belongs to one, and only one,
  release group" ([musicbrainz.org/doc/Release_Group](https://musicbrainz.org/doc/Release_Group)).

So **release group : release** is exactly the *work : version* distinction this project needs, and it is one-to-many.

### How audio drama is typed

There is no "audio drama" primary type. It is expressed as **primary type `Other` + secondary type `Audio drama`**
([musicbrainz.org/doc/Release_Group/Type](https://musicbrainz.org/doc/Release_Group/Type)), defined verbatim as:

> "An audio drama is an audio-only performance of a play (often, but not always, meant for radio). Unlike audiobooks,
> it usually has multiple performers rather than a main narrator."

Adjacent secondary types that Big Finish material also uses: `Audiobook` ("a book read by a narrator without music"),
`Spokenword` ("Non-music spoken word releases"), `Interview`, `Compilation` (same page).

Verified live on `The Sirens of Time` (release group
[`fc3029ef-41f9-47be-837d-9309e38fff6c`](https://musicbrainz.org/ws/2/release-group/fc3029ef-41f9-47be-837d-9309e38fff6c?fmt=json)):
`"primary-type": "Other"`, `"secondary-types": ["Audio drama"]`.

### The Series entity — the ordering mechanism

A series is "a sequence of separate release groups, releases, recordings, works, artists or events with a common theme"
([musicbrainz.org/doc/Series](https://musicbrainz.org/doc/Series)). A live query of the series index
(`/ws/2/series?query=*`) returned **37,152 series** and these type values in the first page:
`Catalogue`, `Event series`, `Festival`, `Recording series`, `Release group award`, `Release group series`,
`Release series`, `Run`, `Tour`, `Work series`.

The critical detail is that **series membership is a relationship that carries a number**. Live on the same release
group with `inc=series-rels`:

```
rel: part of | target-type series | attribute-values {}              | ordering-key 2  | Doctor Who - The Classic Series
rel: part of | target-type series | attribute-values {"number": "1"} | ordering-key 11 | Doctor Who - The Monthly Adventures
```

Two things follow, and both matter for design:

1. **One item can belong to several series at once, with a different number in each.** This is a genuine multi-ordering
   model, not a single sequence field.
2. Each membership has both an editor-set `number` attribute and a computed `ordering-key`.

`Doctor Who - The Monthly Adventures`
([`6ac06505-e896-4905-8b88-7df463c1b07c`](https://musicbrainz.org/ws/2/series/6ac06505-e896-4905-8b88-7df463c1b07c?inc=release-group-rels&fmt=json))
has **272 release-group members**.

A `/ws/2/series?query=Doctor Who` search returns **138 series**, including two distinct `Work series` entries both
named `Doctor Who - Target novelisations`, disambiguated "Target numbering"
([`ce030e33-…`](https://musicbrainz.org/ws/2/series/ce030e33-956a-477d-aa6c-5b463da33b21?inc=work-rels&fmt=json)) and
"publication order"
([`f3799326-…`](https://musicbrainz.org/ws/2/series/f3799326-8570-4ab3-8553-a3c62ec4c484?inc=work-rels&fmt=json)).
Verified live: the *same Work* "Doctor Who and the Auton Invasion" is a member of both, with
`attribute-values {}` in the first and `attribute-values {"number": "6"}` in the second. **MusicBrainz already models
the exact thing this project needs — one work, two competing orderings, different position in each.**

Caveat: both Target series currently hold only **10 work members**, so the mechanism is proven and the data is not
populated. Note also that the first series relies on the computed `ordering-key` alone while the second sets an
explicit `number` — the two are not interchangeable and a consumer must handle both.

### How complete is Big Finish coverage

Measured live:

| Query | Count |
|---|---|
| Releases on label `Big Finish Productions` (`dd10cb9b-f1cd-4d9c-8b6c-1a5082fe6d43`) | **2,793** |
| Release groups matching `"Doctor Who" AND secondarytype:"audio drama" AND primarytype:Other` | **789** |
| Release groups matching `secondarytype:"audio drama"` and `"Doctor Who"` (looser) | **802** |
| Series matching `Doctor Who` | **138** |

Coverage is **good and deep, not merely present**. Fields genuinely populated on a sampled Big Finish release
(`9dd53391-7d7d-4528-b9ea-4793b10ed1d3`): `date`, `country`, `barcode` (the ISBN-13 `9781903654286`), `packaging`
(`Jewel Case`), `status`, `text-representation`, per-medium `format` and `track-count`, full track list with per-track
`length` in ms, `artist-credit` with join phrases (`"Nicholas Briggs" starring "Peter Davison", ...`), and every track
recording carries a `performance` relationship to a Work.

External links present on the release group: `discogs`, `wikidata` (→ `Q7764517`), and **two** `official homepage`
links back to distinct bigfinish.com release pages.

**What is thin:** the free-text search index for `secondarytype:"audio drama"` returns 802 Doctor Who release groups
against 2,795 audio-medium story pages on tardis.wiki (§6), so MusicBrainz has roughly a third of the story-level
universe, weighted to the physically released ranges. Anthology volumes are one release group containing several
stories, so the story-level shortfall is smaller than the raw ratio suggests — but the exact figure is **unverified**.

### Licence and rate limits

- **Data licence** (not code): "The core data of the database is licensed under the CC0, which is effectively placing
  the data into the Public Domain." "The remaining portions of the database are released under the Creative Commons
  Attribution-NonCommercial-ShareAlike 3.0 license." "This allows for non-commercial use of the data as long as
  MusicBrainz is given credit and that derivative works are also made available under the same license."
  ([musicbrainz.org/doc/About/Data_License](https://musicbrainz.org/doc/About/Data_License))
- The split is spelled out per dump file at
  [MusicBrainz_Database/Download](https://musicbrainz.org/doc/MusicBrainz_Database/Download): `mbdump.tar.bz2`
  (artists, releases, recordings — the core) is **CC0**; `mbdump-derived` (annotations, ratings, tags, search
  indexes), `mbdump-edit`, `mbdump-editor`, `mbdump-cover-art-archive`, `mbdump-stats` are **CC BY-NC-SA 3.0**.
- **Rate limit**: "1 request per second" on average per source IP; a properly identified User-Agent is allowed more
  generously, and the global cap is "300 requests each second (on average)". Breaching returns **503 Service
  Unavailable**. ([MusicBrainz_API/Rate_Limiting](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting))
- **User-Agent is mandatory**: "Each request sent to MusicBrainz needs to include a User-Agent header, with enough
  information in the User-Agent for us (MusicBrainz) to contact the application maintainers." Suggested format
  `Application name/<version> ( contact-url )`. (same page)

### The four questions

- **(a) Covers DW audio drama / comics / magazine strips?** Audio drama: yes, deeply (789+ DW audio-drama release
  groups). Comics and magazine strips: no — MusicBrainz is an audio database and has no comic entity.
- **(b) Story-order rather than broadcast order?** Yes, and better than any other source here: multiple Series per
  item, each with its own `number` attribute per membership.
- **(c) More than one version of the same work?** Yes, natively: release group → many releases (CD, download,
  re-recorded, regional), plus Work ← performance ← Recording for the script-vs-performance axis.
- **(d) May this project legally read and store it?** Yes. Core data is CC0 (no conditions). Tags/ratings/annotations
  are CC BY-NC-SA 3.0 — fine for a personal non-commercial workspace with credit, but they would infect a
  redistributable derivative, so **prefer to store only core data**.

---

## 4. Open Library

### Work vs edition

Open Library uses a two-level model exposed directly as URL types: `/works/OL…W` and `/books/OL…M` (editions). Any
identifier takes a `.json`, `.rdf` or `.yml` suffix
([openlibrary.org/developers/api](https://openlibrary.org/developers/api)).

Verified live on the first Eighth Doctor Adventures novel:

- **Work** [`/works/OL3354340W.json`](https://openlibrary.org/works/OL3354340W.json) — keys: `authors`, `covers`,
  `description`, `first_publish_date`, `identifiers`, `subject_people`, `subject_places`, `subjects`, `title`.
- **Edition** [`/books/OL7851862M.json`](https://openlibrary.org/books/OL7851862M.json) — keys include `isbn_10`,
  `isbn_13`, `identifiers` (`{"librarything": ["191939"]}`), `lc_classifications`, `local_id`, `number_of_pages`
  (288), `ocaid`, `physical_dimensions`, `physical_format`, `publish_date` (`"1997-02"`), `publish_places`,
  `publishers` (`["BBC Books"]`), `series`, `source_records`, `subjects`, `weight`, and `works`
  (`[{"key": "/works/OL3354340W"}]`).

**The ordering finding.** Series is present but is *free text on the edition*, not a modelled relation:

```json
"series": ["Eighth Doctor Adventures, 1"]
```

and on the work it survives only as a subject string: `"series:Eighth_Doctor_Adventures"`. There is no numeric
series-position field and no work-to-work "follows" relation. Any reading order has to be parsed out of that string
or supplied by this project.

### Novelisations and tie-in fiction

Open Library does not have a distinct "novelisation" type. A novelisation is an ordinary work whose relationship to
its source is only implied by title and subject strings. The Target novelisation of the first Dalek serial is
[`/works/OL5907885W`](https://openlibrary.org/works/OL5907885W) "Doctor Who and the Daleks", Whitaker, 1964, 2
editions — with no machine-readable link to the TV serial. **Unverified** whether any tie-in work in the DW corpus
uses a source-work relation; none was found in the sampled records.

### Identifiers

Editions carry `isbn_10`, `isbn_13`, `lccn`, `oclc_numbers`, `ocaid` (Internet Archive item), `local_id`, and a free
`identifiers` map that in the sample held `librarything`. Works and editions have OLIDs. Open Library IDs are
themselves a Wikidata property (P648, §5).

### Coverage of Doctor Who prose — measured live

| Query (`/search.json`, `limit=0`) | `numFound` |
|---|---|
| `"doctor who"` | **2,569** |
| `series:"doctor who"` | 135 |
| `doctor who` + `publisher=Target` | **91** |
| `doctor who` + `publisher="Target Books"` | 62 |
| `"eighth doctor adventures"` | **22** |
| `"new adventures" doctor who` | **20** |
| Subject index `/subjects/doctor_who.json` `work_count` | 91 |

Read that carefully: the raw 2,569 is a keyword match across everything with "doctor who" in it. The **structured**
handles are much weaker — the subject `doctor_who` has only 91 works, and the two big original-fiction ranges return
22 and 20 hits respectively, and Target novelisations 91. The true size of each range is **unverified** from a primary
source here, so these are floors rather than percentages. What is verifiable is the shape: **series membership is not
queryable as structured data, so range completeness cannot be reconstructed from Open Library alone.**

### Cover images

`https://covers.openlibrary.org/b/$key/$value-$size.jpg` where key ∈ ISBN, OCLC, LCCN, OLID, ID (case-insensitive)
and size ∈ S (thumbnail) / M (details page) / L. Pixel dimensions are not stated. Author photos use `/a/$key/…`.
([openlibrary.org/dev/docs/api/covers](https://openlibrary.org/dev/docs/api/covers))

### Licence and rate limits

- **Licence.** The only statement Open Library's own licensing page makes is: "The Internet Archive does not assert
  any new copyright or other proprietary rights over any of the material in the Open Library database. There may be
  existing rights issues on some contributions and in some jurisdictions."
  ([openlibrary.org/developers/licensing](https://openlibrary.org/developers/licensing)). That is a
  *non-assertion*, not a grant. A CC0 designation is **not** stated on that page or on
  [developers/dumps](https://openlibrary.org/developers/dumps) — treat "Open Library is CC0" as **unverified**.
  Cover images are a separate matter and no licence is stated for them at all.
- **Rate limits.** "Default (non-identified requests): 1 request per second"; "Identified requests (with `User-Agent`
  and `email`): 3 requests per second"
  ([openlibrary.org/developers/api](https://openlibrary.org/developers/api)). Covers: "Currently only 100 requests/IP
  are allowed for every 5 minutes" for keys other than CoverID and OLID, returning 403 beyond that, plus the blunt
  instruction "Please, do not crawl our cover API. If you do, we may decide to block your crawl."
  ([dev/docs/api/covers](https://openlibrary.org/dev/docs/api/covers)).
- **Explicitly prohibited**: "scraping HTML, distributing traffic across multiple IPs, and harvesting data in bulk";
  the APIs are "not intended to serve as a bulk data backend"
  ([openlibrary.org/developers/api](https://openlibrary.org/developers/api)). Bulk use is meant to go through the
  data dumps instead.

### The four questions

- **(a) Covers DW audio drama / comics / magazine strips?** Novels and novelisations yes (partially); audio drama only
  where a CD or audiobook was catalogued as a book edition; comics/strips essentially absent as ordered runs.
- **(b) Story-order rather than publication order?** No. Only the free-text `series` string on editions carries a
  number, and it is inconsistent.
- **(c) More than one version of the same work?** Yes — that is exactly the work/edition split, and it is well
  populated (`edition_count` up to 15 in the sampled DW records).
- **(d) May this project legally read and store it?** Reading and storing for personal use is consistent with the
  non-assertion statement and the rate limits, provided the app identifies itself and does not bulk-harvest via the
  API. Redistribution rights are **unverified** because no licence grant is published.

---

## 5. Wikidata

### Cross-source identifier properties

Every P-number below was confirmed live via `wbsearchentities` against
`https://www.wikidata.org/w/api.php?action=wbsearchentities&type=property`.

| Source | Property | P-number |
|---|---|---|
| TMDB | TMDB movie ID | **P4947** |
| TMDB | TMDB TV series ID | **P4983** |
| TMDB | TMDB season ID | **P12558** |
| TMDB | TMDB episode ID | **P12559** |
| TMDB | TMDB collection ID (film series) | **P11805** |
| TMDB | TMDB person ID | **P4985** |
| TheTVDB | TheTVDB series ID | **P4835** |
| TheTVDB | TheTVDB season ID | **P12397** |
| TheTVDB | TheTVDB episode ID | **P7043** |
| TheTVDB | TheTVDB movie ID | **P12196** |
| TheTVDB | TheTVDB person ID | **P7920** |
| MusicBrainz | release group ID | **P436** |
| MusicBrainz | release ID (edition) | **P5813** |
| MusicBrainz | recording ID | **P4404** |
| MusicBrainz | work ID | **P435** |
| MusicBrainz | series ID | **P1407** |
| MusicBrainz | artist ID | **P434** |
| MusicBrainz | label ID | **P966** |
| Open Library | Open Library ID (work "W", edition "M", author "A") | **P648** |
| Open Library | Open Library subject ID | **P3847** |

Wikidata therefore **can** be the join table between all four external sources, at every level of granularity that
matters (work, edition/release, episode, season, series). Confirmed live on Doctor Who
([Q34316](https://www.wikidata.org/wiki/Q34316)): `P4983 = 121` and `P4835 = 76107`.

### Does it model fictional chronology?

Partly, and more weakly than the property names suggest.

| Property | P-number | What it means |
|---|---|---|
| narrative location | **P840** | "the narrative of the work is set in this location" |
| set in period | **P2408** | "historical, contemporary, or future period, year, century or day the work … is set" |
| follows | **P155** | "immediately prior item in a series of which the subject is a part, preferably use as qualifier" |
| followed by | **P156** | "immediately following item in a series … preferably use as qualifier" |
| part of the series | **P179** | "series which contains the subject" |
| series ordinal | **P1545** | "position of an item in its parent series (most frequently a 1-based index)" |
| present in work | **P1441** | fictional entity/place/person "appears in that work" |
| fictional universe described in | **P1445** | links a fictional universe to a work describing it |

The important structural fact: **P155/P156 and P1545 are meant to be used as *qualifiers on a P179 statement*, not as
bare item-level statements.** That is what makes multiple orderings expressible at all — an item can have several
`P179` statements, each with its own `P1545` ordinal. It is the same shape as MusicBrainz's Series relationship.

But it is **publication/broadcast order in practice, not in-universe order.** Live SPARQL against
`https://query.wikidata.org/sparql`:

| Query | Result |
|---|---|
| Items in the Doctor Who series tree with a `P155` (follows) | **1,313** |
| Items in the Doctor Who series tree with a `P840` narrative location | **120** |
| Statements in the DW tree with a `P1545` series-ordinal qualifier | **1,067** |
| Items in the DW series tree that are `P31` novel (Q7725634) | **275** |
| Items linked to Big Finish Productions (Q4905688) by any property | **171** (115 production company, 55 publisher) |

So: ordinals and adjacency are well populated (1,067 / 1,313), but they encode the order of the range, not an
in-universe timeline. And Big Finish coverage at **171 items** is an order of magnitude behind MusicBrainz's 2,793
Big Finish releases and tardis.wiki's 2,495 audio pages. **Wikidata is a good join table and a poor catalogue.**

### Access limits and licence

- **Endpoint**: `https://query.wikidata.org/sparql`
  ([Wikidata:Data_access](https://www.wikidata.org/wiki/Wikidata:Data_access)).
- **Hard query timeout: 60 seconds.** "One client (user agent + IP) is allowed 60 seconds of processing time each 60
  seconds"; "access to the service is limited to 5 parallel queries per IP"; "One client is allowed 30 error queries
  per minute". Exceeding these returns **HTTP 429** with a `Retry-After` header, and repeat offenders may be "banned"
  or "blocked completely".
  ([Wikidata Query Service/User Manual](https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual))
- **User-Agent policy is enforced**: "Clients who don't comply with the User-Agent policy may be blocked completely."
  (same page; policy at
  [Wikimedia Foundation User-Agent Policy](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy))
- **Not for bulk**: "WDQS is also not suitable when your desired data is likely to be large, a substantial percentage
  of all Wikidata's data. (Consider using a dump in such cases.)"
  ([Wikidata:Data_access](https://www.wikidata.org/wiki/Wikidata:Data_access)); dumps at
  [dumps.wikimedia.org](https://dumps.wikimedia.org).
- **Licence: CC0.** "All structured data in the main, property and lexeme namespaces is made available under the
  Creative Commons CC0 License" ([Wikidata:Licensing](https://www.wikidata.org/wiki/Wikidata:Licensing)). Text in
  non-main namespaces is CC BY-SA 4.0 and media files have their own terms — neither is what a metadata importer
  touches.

### The four questions

- **(a) Covers DW audio drama / comics / magazine strips?** Thinly. 171 Big Finish-linked items total; comics and
  magazine strips are represented only where individually notable.
- **(b) Story-order rather than broadcast order?** Structurally yes (multiple P179 + P1545 qualifiers per item); in
  the actual Doctor Who data, no — the populated ordinals are range order.
- **(c) More than one version of the same work?** Weakly. There is no work/edition split; separate versions exist only
  as separate items linked by `P144` (based on) or `P155/P156`. **Unverified** whether DW alternative cuts are
  modelled at all.
- **(d) May this project legally read and store it?** Yes, unconditionally — CC0, no attribution required.

---
## 6. tardis.wiki

**Scope note.** This section is about the independent wiki at `tardis.wiki` only. The Fandom-hosted mirror was not
consulted and is not the subject here.

### Reachability and the Cloudflare challenge

Plain HTTP fetching is blocked outright. All three of these returned **403** to `curl` with an honest custom
User-Agent:

```
https://tardis.wiki/                                          403
https://tardis.wiki/api.php?action=query&meta=siteinfo…       403
https://tardis.wiki/robots.txt                                403
```

Through a real browser (Playwright), all three load normally and **`api.php` works fully** — the Cloudflare challenge
gates the transport, not the API. So the block is on non-browser clients, and it applies to `robots.txt` itself,
which is a nuisance: a compliant crawler cannot even read the policy it is meant to obey without running a browser.

Confirmed live via the browser: `MediaWiki 1.39.11`, PHP 8.3.32, `articlepath = /wiki/$1`, `script = /index.php`,
server `https://tardis.wiki`, and `writeapi` enabled.

### What robots.txt says

`https://tardis.wiki/robots.txt` is 1,109 lines, adapted from runescape.wiki. The lines that matter:

```
# If you are using content from our site, please ensure that you are following the terms of our license
# (CC BY-SA 3.0 for text, various for images).
# For more information, see https://tardis.wiki/wiki/Tardis:Copyrights
User-Agent: *
…
Disallow: /api.php
Disallow: /rest.php/
Disallow: /*?action=
…
Sitemap: https://tardis.wiki/sitemap/sitemap-index-tardis.wiki.xml
```

and, at the end, an explicit AI-bot block list (each pair is on two lines in the original; compressed here):

```
### AI bots ###
User-agent: GPTBot          Disallow: /
User-agent: CCBot           Disallow: /
User-agent: Google-Extended Disallow: /
User-agent: meta-externalagent Disallow: /
User-agent: ClaudeBot       Disallow: /
User-agent: AI2Bot          Disallow: /
User-agent: OAI-SearchBot   Disallow: /
User-agent: PerplexityBot   Disallow: /
User-agent: Bytespider      Disallow: /
(also yacybot, thetradedesk, carbon-umbrella-bot)
```

**This is the decisive finding for tardis.wiki: `api.php` is available and functional, but it is `Disallow`ed for all
user agents in robots.txt.** Cloudflare and robots.txt are two independent barriers, and the API clears one but not
the other. Bulk automated harvesting of `api.php` would be against the site's stated wishes even though it is
technically possible.

### The licence

From the API itself (`action=query&meta=siteinfo&siprop=rightsinfo`):

```json
"rightsinfo": { "url": "https://creativecommons.org/licenses/by-sa/3.0/deed.en", "text": "CC BY-SA 3.0" }
```

And verbatim from [`Tardis:Copyrights`](https://tardis.wiki/wiki/Tardis:Copyrights):

> "All material appearing on the Tardis Wiki is available for distribution under the Creative Commons
> Attribution-Share Alike License 3.0 (Unported) (CC-BY-SA) with no invariant sections and no cover texts. Material
> taken from this site should also be available for distribution under said license and should carry a notice to that
> effect."

So: **CC BY-SA 3.0 Unported** for text. Images are "various" and separately encumbered — the same page notes that
Doctor Who and related properties are BBC copyright, that "TARDIS" is a BBC trademark, that the Daleks are trademarked
by the Terry Nation estate, and that "Some characters deriving from Big Finish Productions are Big Finish copyright."

### Scale and structure — SemanticMediaWiki is installed

The wiki reports 372,780 pages / **127,908 articles** / 4,134,660 edits / 86,130 images.

More usefully, the extension list includes **`SemanticMediaWiki`** and `SemanticScribunto`, and story pages use an
`{{Infobox Story SMW}}` template. That means `action=ask` works and the wiki is queryable as a database, not just as
prose. Verified live:

```
/api.php?action=ask&query=[[Medium::audio]]|limit=500|offset=N
```

Story counts by `Medium`, paged to exhaustion:

| `Medium` | Pages |
|---|---|
| `short story` | **2,966** |
| `audio` | **2,495** |
| `comic` | **1,973** |
| `novel` | **976** |
| `TV` | **716** |
| `webcast` | **346** |
| `film` | 0 |

**This is by a wide margin the most complete Doctor Who catalogue of the seven sources**, and it is the only one that
covers comics and magazine strips at story level at all. Magazine strips are inside the `comic` count and are
separable, because `Publisher` is an annotated property: a live `[[Medium::comic]]|?Publisher` sample returned
`Marvel Comics` (the DWM strip), `Polystyle Publications, Ltd.` (TV Comic), `BBC Magazines` (Doctor Who Adventures)
and `Big Finish Productions`.

The SMW properties actually annotated on a sampled story page
(`browsebysubject` on `The Sirens of Time (audio story)`) are:

```
Doctor, Epcount, Has_image, Isbn, Medium, Pagename, Publisher, Range,
Release_date, Release_end_date, Series, Story_info, Writer
```

### The chronology problem

Here is the catch. The infobox on that page contains, in wikitext:

```
|range           = Main Range
|number in range = 1
|setting         = {{il|[[Gallifrey]]|…[[3562]]|''[[U-20]]'', [[7 May]] [[1915]]|…}}
|next            = Phantasmagoria (audio story)
```

but **`number in range`, `setting` and `next` are not among the SMW-annotated properties.** A scan of the
`Property:` namespace (`list=allpages&apnamespace=102`) found `Range`, `Series`, `Series episode number`,
`Citation series`, `Story`, `Story info`, `First appearance`, `Only appearance` — and **no** `Preceded by`,
`Followed by`, `Setting`, `Number in range`, or any in-universe date property.

So the ordering data exists on the page and is invisible to the query API. **A licence-compliant, robots-compliant
reuse of tardis.wiki chronology would require parsing raw wikitext**, which is exactly the traffic robots.txt asks you
not to generate.

### What licence-compliant reuse would actually require

1. **Attribution** naming the Tardis Wiki and each source article, per CC BY-SA 3.0 §4(c).
2. **A link to the CC BY-SA 3.0 licence** and a notice that the material is available under it — the copyrights page
   asks specifically that reused material "carry a notice to that effect".
3. **ShareAlike**: any derivative of the *text* must itself be CC BY-SA 3.0 (or a BY-SA-compatible licence). Structured
   *facts* extracted from the text — a story's position in a range, its release date — are not themselves copyrightable
   in the UK or US, so a pure fact table is arguably outside ShareAlike. Copied prose and copied synopses are not.
   Because ShareAlike would attach to redistributable output, the safe posture for this project is: **extract facts,
   never store synopsis prose.**
4. **Images are out.** They are "various", overwhelmingly BBC-copyright fair-dealing uploads, and not licensed for
   redistribution.
5. **Respect robots.txt**: no automated `api.php` crawling. That leaves manual/occasional retrieval, or a one-off
   human-supervised import, or asking the wiki's administrators for permission.

### The four questions

- **(a) Covers DW audio drama / comics / magazine strips?** Yes — all three, at story level, better than anywhere else
  (2,495 audio / 1,973 comic / 2,966 short story pages).
- **(b) Story-order rather than broadcast order?** The information is there in prose and infoboxes (`setting`, `next`,
  `number in range`) but is **not** exposed as structured SMW properties, so it is not queryable — only scrapable.
- **(c) More than one version of the same work?** Partially — the sampled page documents a 2024 re-edit with a new
  score in prose, and there is a `Release note` / `Reprint` property, but there is no version entity.
- **(d) May this project legally read and store it?** Text: yes under CC BY-SA 3.0 with attribution and ShareAlike;
  images: no. But `api.php` is `Disallow`ed for all agents and Cloudflare blocks non-browser clients, so **automated
  ingestion is against the site's stated wishes** even where the licence permits the reuse.

---

## 7. Big Finish's own site

### Is there a machine-readable surface?

Three surfaces exist, none of them an API.

**1. `robots.txt`** — [`https://www.bigfinish.com/robots.txt`](https://www.bigfinish.com/robots.txt), fetched
successfully with a plain HTTP client (200, no Cloudflare challenge):

```
User-Agent: *
Allow: /
Allow: /news.xml
Allow: /podcasts.xml
Allow: /events.xml
Disallow: /api/
Disallow: /my-account
Disallow: /checkout
Disallow: /basket
Disallow: /login
Disallow: /signup
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /local-auth
Disallow: /bundle/start
Disallow: /bundles/summary

Sitemap: https://www.bigfinish.com/sitemap.xml
```

An `/api/` path exists and is **explicitly disallowed**. Probing it: `/api/` returns 308 (redirect to `/api`), and
`/api/releases`, `/api/v1/releases`, `/api/products` all return **404**. There is no documented public API and the
one internal path is off-limits by their own robots policy.

**2. `sitemap.xml`** — 824 KB, **4,191 `<loc>` entries**, breaking down as:

| Path prefix | URLs |
|---|---|
| `/releases/…` | **1,085** |
| `/contributors/…` | 1,000 |
| `/news/…` | 898 |
| `/podcasts/…` | 700 |
| `/vortex/…` | 211 |
| `/ranges/…` | 139 |
| `/hubs/…` | 58 |
| `/collections/…` | 45 |
| `/pages/…` | 19 |

Note the shortfall: **1,085 release pages in the sitemap against 2,793 Big Finish releases catalogued on MusicBrainz.**
Whether the sitemap is capped, filtered to in-print titles, or genuinely complete is **unverified** — but it cannot be
treated as a full catalogue index.

**3. Three RSS feeds** — `/news.xml`, `/podcasts.xml`, `/events.xml`, all returning
`application/rss+xml; charset=utf-8`. These are news and podcasts, **not the product catalogue**.

**4. Per-page JSON-LD.** Every release page carries one `<script type="application/ld+json">` block, schema.org
`Product`. Full field set observed on a sampled release page:

```
@type = Product
name, description (full multi-part synopsis), url, image
brand.{@type,name,url} = Organization / Big Finish Productions
sku
releaseDate = 2020-01-28T00:00:00.000000Z
offers[].{@type,name,price,priceCurrency,availability,url,seller}
```

**5. Range pages have nothing.** `https://www.bigfinish.com/ranges/v/doctor-who-the-monthly-adventures` returns 200
and 176 KB of HTML with **zero** `ld+json` blocks and only 19 release links on the page (it is paginated). So the one
place the site expresses range membership and order is unstructured, paginated HTML.

(Also worth knowing: the sitemap contains malformed entries of the form
`https://www.bigfinish.com/ranges/v//releases/v/dracula-1409` — a doubled path segment. Any consumer must tolerate
them.)

That is a **commerce** record. It gives you title, synopsis, cover image URL, release date and price. It gives you
**no** range membership, no story number, no cast, no in-universe placement, and no relation to other releases. The
page is server-rendered HTML (no `__NEXT_DATA__`, no `__NUXT__`, no Angular hydration payload), so anything beyond
the JSON-LD has to come from parsing the DOM.

### What the terms of use say

[`https://www.bigfinish.com/pages/v/terms-conditions`](https://www.bigfinish.com/pages/v/terms-conditions) contains
**no clause about scraping, crawling, robots, automated access, data mining, or APIs**. What it does say, verbatim:

> "we authorise the User to access and make use of the Big Finish Productions Web Site for personal use only"

> "all copyright, trademarks and all other intellectual property rights in the Information shall remain vested in BFP
> or its licensors"

> "The Information may not be used for any other purpose including, publication, reproduction, or transmission
> without the express written permission of BFP"

Read together with robots.txt (which `Allow: /` for everything except accounts, checkout and `/api/`): **personal,
private use of catalogue facts is authorised; publication or redistribution is not.** For a personal workspace that
never republishes, that is workable. For anything shared, it is not, without written permission.

### The four questions

- **(a) Covers DW audio drama / comics / magazine strips?** Audio drama: yes, it is the publisher. Comics and magazine
  strips: no.
- **(b) Story-order rather than release order?** No. The JSON-LD carries `releaseDate` and nothing else ordinal;
  `/ranges/` pages group titles but expose no machine-readable position.
- **(c) More than one version of the same work?** Only as `offers[]` (CD + Download vs Download) — that is a purchase
  format, not a distinct cut or version.
- **(d) May this project legally read and store it?** For **personal use only**, yes: robots.txt allows the release
  pages and the terms authorise personal access. Publishing or transmitting the Information requires "express written
  permission of BFP", so a shared or published workspace may not carry it.

---
## Coverage matrix

Covered = the source models this medium as first-class records with useful metadata.
Partial = present but incomplete, unstructured, or a side effect of another model.
Absent = not modelled at all.

| Source | Film | TV | Audio drama | Novels | Comics | Magazine strips |
|---|---|---|---|---|---|---|
| **TMDB** | covered | covered | absent | absent | absent | absent |
| **TheTVDB** | covered | covered | partial | absent | absent | absent |
| **MusicBrainz** | absent | partial | covered | partial | absent | absent |
| **Open Library** | absent | absent | partial | covered | partial | absent |
| **Wikidata** | partial | partial | partial | partial | partial | partial |
| **tardis.wiki** | covered | covered | covered | covered | covered | covered |
| **Big Finish** | absent | absent | partial | absent | absent | absent |

Notes on the judgement calls:

- **TheTVDB / audio drama** is *partial* because audio is admissible as a "web series/podcast": a real
  `doctor-who-big-finish` series record exists (ID 426420) with Aired and Absolute orders. Its completeness is
  unverified and it is a workaround, not a modelled medium.
- **MusicBrainz / TV** is *partial* because TV appears only as soundtracks and as audio releases of televised
  material, not as episodes.
- **MusicBrainz / novels** is *partial* because novels appear only where an audiobook edition exists — the Work series
  "Doctor Who — novelisations" and "Doctor Who: Past Doctor Adventures" exist, but as work groupings hanging off audio
  releases.
- **Open Library / audio drama** is *partial*: audio dramas appear only where a CD or audiobook was catalogued as a
  book edition, incidentally.
- **Open Library / comics** is *partial*: collected graphic novels are catalogued as books; individual strips are not.
- **Wikidata** is *partial* everywhere by design — it has an item for anything separately notable in any medium, and
  a systematic catalogue of nothing. 171 Big Finish-linked items against MusicBrainz's 2,793 releases is the shape of
  it.
- **tardis.wiki** is *covered* everywhere on measured counts: 716 TV, 2,495 audio, 976 novel, 1,973 comic, 2,966 short
  story, 346 webcast story pages. Magazine strips sit inside the comic count and are separable by the annotated
  `Publisher` property — a live sample of `[[Medium::comic]]|?Publisher` returned `Marvel Comics` (the DWM strip),
  `Polystyle Publications, Ltd.` (TV Comic), `BBC Magazines` (Doctor Who Adventures) and `Big Finish Productions`.
- **Big Finish / audio drama** is *partial* despite being the publisher, because the only machine-readable surface is
  a commerce JSON-LD record on ~1,085 sitemap-listed release pages, with no range, story number, cast, or ordering.

## What this means for the design

1. **No source is both complete and free.** The completeness ranking is tardis.wiki ≫ MusicBrainz > Wikidata >
   TMDB/TheTVDB/Open Library > Big Finish. The freedom ranking is almost exactly inverted: Wikidata (CC0, no
   conditions) > MusicBrainz core (CC0) > Open Library (non-assertion) > TMDB/TheTVDB (permissive but conditional) >
   tardis.wiki (CC BY-SA with ShareAlike, and robots-disallowed) > Big Finish (personal use only, no redistribution).
   Any design that assumes "just import the catalogue" fails on the sources worth importing.

2. **Four sources already model multiple orderings, and they all put the ordinal in the same place.** TMDB puts it
   on a group-membership record (`groups[].episodes[].order` inside a typed episode group). TheTVDB puts it on a
   typed Season (`SeasonBaseRecord.type` + `number`, with an episode listing every typed season it belongs to).
   MusicBrainz puts it on a relationship attribute (`number` on a "part of series" relationship, plus a computed
   `ordering-key`). Wikidata puts it on a statement qualifier (`P1545` on a `P179` statement). All four converge:
   **the ordinal belongs to the (item, ordering) pair, never to the item.** Any model that stores a single
   `sort_order` column on the work is fighting all four sources at once.

   Where they differ is whether an ordering is a free-form named thing or a fixed slot. MusicBrainz and Wikidata
   allow unlimited named orderings. TMDB allows unlimited groups but with a 7-value type enum and only one level of
   named sub-group. TheTVDB allows exactly **seven** slots per series, whose display names are per-series overrides.
   Only the first two can express "Doctor Who in in-universe chronological order" as its own thing without stealing
   a slot.

3. **Nobody models alternative cuts.** TMDB refuses in writing ("We currently do not support alternative film
   versions"). TheTVDB has no version entity and disallows alternate episode cuts outright. tardis.wiki records
   re-edits in prose. Only MusicBrainz has a real answer, and only for audio: release group → many releases. If this
   project needs "the 2024 re-edit of *The Sirens of Time*" as a distinct thing, **it must own that concept itself**;
   no source will supply it.

   The one accidental exception is worth knowing: TheTVDB's Money Heist precedent, where a re-cut produced *different
   episode records* filed under a different season type. That is versioning smuggled in through the ordering
   mechanism, and it means an importer cannot assume two orders of one series draw from one episode pool.

4. **TMDB and TheTVDB disagree about whether a canonical order exists, and you have to pick a side.** TheTVDB ships
   `defaultSeasonType` on the series record; TMDB ships nothing equivalent, so the choice among Doctor Who's five
   TMDB episode groups is the client's. If this project federates both, it needs its own notion of "preferred
   ordering per work" regardless, because the two sources will not agree.

5. **The completeness gap is exactly the licensing gap.** The only source that covers comics and magazine strips is
   the one whose `api.php` is `Disallow`ed and which is behind Cloudflare. A design that needs those media has to
   accept manual entry, or seek permission, as a first-class path — not as a fallback.

6. **Retention rules point in opposite directions, so retention must be per-source.** TMDB forbids caching "for
   longer than 6 months" and requires purging on termination. TheTVDB does the reverse and "strongly recommend[s]
   maintaining your own copy of the database". MusicBrainz core and Wikidata are CC0 and unconstrained. That rules
   out one global cache policy, and argues for storing external records as **dated, source-tagged snapshots** with
   per-source TTLs rather than merging them into the canonical rows.

7. **Images are a separate rights question from metadata, and only TheTVDB says so out loud.** Its ToS states in
   capitals that the API licence gives no authorisation to use or display images or trailers, and that securing those
   rights is the consumer's problem. TMDB by contrast covers images under the same attribution regime. tardis.wiki's
   images are "various" and mostly BBC-copyright. **The safe default is to hotlink or omit artwork rather than store
   it**, and to treat "may I show this picture" as a per-source decision separate from "may I store this fact".
