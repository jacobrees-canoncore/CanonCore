# Audiobookshelf's custom metadata provider contract

The closest existing prior art to "let a fan-run source be added without a store or a review
process". Read 8 August 2026 against the spec file, the server source and the docs repo.

## Licence, corrected

Audiobookshelf is **GPL-3.0**, not AGPL. The `LICENSE` file is GNU GPL v3, `package.json`
declares `"license": "GPL-3.0"`, and the GitHub API reports `spdx_id: GPL-3.0`. The only
Affero mention is the standard GPLv3 §13 compatibility clause. Whether "or any later
version" applies is unverified beyond "GPLv3".

More usefully: **the spec YAML carries its own `info.license: MIT`**
(`https://opensource.org/licenses/MIT`), the only licence statement inside the file. Whether
that licenses the document or merely describes the API is not stated anywhere and is
unverified. Taken at face value, adopting the contract carries no copyleft.

Sources: [spec YAML](https://raw.githubusercontent.com/advplyr/audiobookshelf/master/custom-metadata-provider-specification.yaml),
[repo LICENSE](https://github.com/advplyr/audiobookshelf/blob/master/LICENSE).

## The contract

`custom-metadata-provider-specification.yaml`, OpenAPI 3.0.0, `info.title: Custom Metadata
Provider`, `version: 0.1.0`.

**One endpoint: `GET /search`.** The server stores a base URL and appends the path
(`server/providers/CustomProviderAdapter.js`):

```js
const url = `${provider.url}/search?${queryString}`
```

**Auth.** `securitySchemes.api_key`: `type: apiKey`, `in: header`, `name: AUTHORIZATION`.
The raw stored string is sent verbatim as the `Authorization` header. No `Bearer` prefix, no
scheme. Omitted entirely if left blank.

**Query parameters.** The spec declares only `query` (required) and `author`. The client
actually sends more, so the spec is incomplete:

```js
const queryObj = { mediaType, query: title }
if (author) queryObj.author = author
if (isbn)   queryObj.isbn  = isbn
```

`mediaType` is always the literal `book`. `getForClientByMediaType` returns `[]` for anything
else and the add-modal hardcodes it. Podcast custom providers do not exist.

**Response.** `200` → `{ "matches": [ BookMetadata ] }`. The adapter hard-requires
`Array.isArray(res.data.matches)` or throws. Error bodies are `{ "error": string }` for 400,
401 and 500 — but the adapter's `.catch` swallows everything and returns `[]`, so the error
body is never surfaced. Timeout 10,000 ms.

### `BookMetadata` — required: `[title]`

| Field | Spec type | Notes |
| --- | --- | --- |
| `title` | string | string/number coerced; array joined with `,` |
| `subtitle` | string | |
| `author` | string | single flattened string |
| `narrator` | string | single flattened string |
| `publisher` | string | |
| `publishedYear` | string | a **year**, not a date |
| `description` | string | run through `htmlSanitizer.sanitize` |
| `cover` | string | one URL; downloaded via `CoverManager` |
| `isbn` | string | `format: isbn`, not actually validated |
| `asin` | string | `format: asin`, not actually validated |
| `genres` | string[] | array or comma-separated string; trimmed, deduped |
| `tags` | string[] | as genres |
| `series` | `SeriesMetadata[]` | |
| `language` | string | |
| `duration` | integer | `int64`, **minutes** |

`SeriesMetadata` — required `[series]`, properties `series` (string) and `sequence` (string).
Decimal sequences are meaningful; Audiobookshelf uses them to slot novellas between main
entries.

### What a spec reader would miss

- Any key outside that list is **discarded** — the adapter destructures a fixed set and
  rebuilds the payload.
- `duration` is accepted but is not in `Scanner.js`'s `detailKeysToUpdate`, so on quick-match
  it is never written to the item. Display-only.
- `explicit` and `abridged` *are* in `detailKeysToUpdate` but the adapter strips them. Dead
  ground between the two layers: a custom provider can never set them.
- `BookFinder.search` short-circuits for `custom-*` slugs with the comment
  `// Custom providers are assumed to be correct`. No fuzzy filtering, no reordering. Your
  first match is what gets auto-applied.
- The controller normalises the URL with `new URL(rawUrl).toString()`, which appends a
  trailing slash to a bare origin, producing `https://example.com//search`. Unverified live,
  read from source.
- Server-side URL validation is only "does `new URL()` parse it". No scheme restriction, no
  reachability check, no test-connection button.

## The add-a-provider flow

No registry, no store, no review, no submission API, no manifest. The provider list is a
**markdown table in a docs repo**; you add yourself by opening a PR. The page warns
verbatim: *"The following projects are not maintained by the Audiobookshelf team nor did any
of the Audiobookshelf team members check them for security issues. Use at your own risk."*

In the app (admin only): Settings → Item Metadata Tools → Custom Metadata Providers → Add.
Four controls:

- **Name** — free text, required. Display label only.
- **Media Type** — a **readonly** input showing `Book`.
- **URL** — free text, required. The base; `/search` is appended.
- **Authorization Value** — password field, optional. Sent verbatim.

`POST /api/custom-metadata-providers`. Stored with slug `custom-<uuid>`. Deleting it silently
falls every library that used it back to `google`.

The Big Finish one that works today: URL `https://provider.vito0912.de/bigfinish`, auth value
`abs`. That is [abs-agg](https://github.com/vito0912/abs-agg), covering ARD Audiothek,
Audioteka, **Big Finish**, BookBeat, Goodreads, Graphic Audio, Hardcover, LibriVox, Storytel,
Die drei ??? and Soundbooth.

**The design lesson worth stealing:** because the contract has only three query parameters,
abs-agg smuggles provider configuration into the **URL path** — `/audioteka/lang:pl`,
`/bookbeat/market:austria`, `/storytel/language:en`. The URL is the only field the user can
vary, so all configurability collapses into it. A minimal contract does not eliminate
configuration; it relocates it somewhere unvalidated.

## Where the schema fails this domain

It is not book-shaped, it is **audiobook-shaped**, and shaped for one-folder-one-item.
Concretely homeless:

- **No type discriminator in the response.** Every match is a book. Episode, issue, film,
  volume all flatten into `title` + `series`/`sequence`. Two levels only — a show → season →
  episode tree has to become a string.
- **No date.** Only `publishedYear`, a string year. No broadcast date, release date, cover
  date or on-sale date. For magazines, where the issue *is* a date, this is fatal.
- **No people beyond two roles.** `author` and `narrator`, each a single flattened string.
  Director, writer, penciller, inker, colourist, letterer, composer, cast: nowhere. No
  role-qualified credits, no person identity.
- **No identifiers except `isbn` and `asin`.** No IMDb, TMDB, TVDB, ISSN, GCD, MusicBrainz,
  Big Finish product code, no generic map, and no source URL for the match.
- **No episode or issue numbering.** No `episodeNumber`, `seasonNumber`, `issueNumber`,
  `volume`, `part`, `disc`. `sequence` is the single numeric slot and it belongs to a series.
- **No format, edition or version distinction.** Nothing separates a theatrical cut from a
  director's cut, or a hardback from a webcomic.
- **No relationships.** No contains, collects, adapts, sequel-to, reprinted-in. A trade
  collecting issues 1–6, or a box set containing four stories, cannot say so.
- **One cover, one language.** No variant covers, no poster/backdrop/logo distinction.

The surrounding model compounds it: each item belongs to exactly one library, collections are
book-only and public, playlists are private, and **neither can contain groups** — no
collections of collections. A franchise spanning TV, audio and comics cannot be one thing.

## How Audiobookshelf handles the three things this product needs

**Multiple versions of one work: not modelled.** No `edition`, `version` or `variant` column
on `Book`. The docs treat two books in one folder as a user error. Two narrations of the same
novel are two unrelated items with independent progress. The only nod to editions anywhere is
a regex in `BookFinder` that *strips* "2nd ed." from titles before searching.

**Series vs collections vs playlists.** Series is first-class: a book can be in multiple
series, ordered by `sequence`, decimals supported, non-numeric allowed but unsorted, empty
series auto-deleted. Collections and playlists both hold only individual items, never series
or other groups. Collections are public, book-only, RSS-feedable. Playlists are private to
their creator and can mix books and podcast episodes.

**Progress.** `MediaProgress` is per-user and polymorphic against `book` or `podcastEpisode`,
never a library item or collection. Fields include `currentTime` (float seconds),
`ebookLocation` (string), `ebookProgress` (float), `isFinished`, `finishedAt`. Audio position
and ebook position are separate columns in the same row — they did not unify the locator,
they just added a column per medium. Progress sync is explicitly outside the provider
contract.

## Sources

[spec YAML](https://raw.githubusercontent.com/advplyr/audiobookshelf/master/custom-metadata-provider-specification.yaml) ·
[community providers](https://audiobookshelf.org/docs/documentation/community/community-providers/) ·
[CustomProviderAdapter.js](https://github.com/advplyr/audiobookshelf/blob/master/server/providers/CustomProviderAdapter.js) ·
[CustomMetadataProviderController.js](https://github.com/advplyr/audiobookshelf/blob/master/server/controllers/CustomMetadataProviderController.js) ·
[AddCustomMetadataProviderModal.vue](https://github.com/advplyr/audiobookshelf/blob/master/client/components/modals/AddCustomMetadataProviderModal.vue) ·
[Scanner.js](https://github.com/advplyr/audiobookshelf/blob/master/server/scanner/Scanner.js) ·
[MediaProgress.js](https://github.com/advplyr/audiobookshelf/blob/master/server/models/MediaProgress.js) ·
[series management](https://github.com/audiobookshelf/audiobookshelf-docs/blob/master/docs/documentation/libraries/book-library/3.series-management.md) ·
[book directory structure](https://github.com/audiobookshelf/audiobookshelf-docs/blob/master/docs/documentation/libraries/book-library/1.book-directory-structure.md)
