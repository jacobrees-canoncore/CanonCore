# How existing systems handle versions, sets and orderings

Read 8 August 2026. Covers Plex and Jellyfin (the media-server prior art) and TheTVDB and
TMDB (the metadata sources that already model alternate orderings). The headline: **nobody
does the thing this product exists for, and the shape of their failure is informative.**

## Plex splits "version" into two concepts, and the split is the point

**Versions** are file variants of the same release — different encodes, resolutions or
containers. Several files collapse into **one** library item, each file a Media/Part under a
single metadata record. Declared by naming (`Pulp Fiction (1994) - 1080p.mkv` and
`Pulp Fiction (1994) - SD.m4v` in one folder) or by multi-select → Merge, reversible with
Split Apart (works on movies, series and artists, explicitly **not** individual episodes).
Because it is one item, **watched state and progress are single and shared**.

**Editions** are different releases or cuts — Theatrical vs Director's Cut vs Final Cut, 2D
vs 3D, colour vs black-and-white. These are **separate library items**, one per cut, and
Plex states plainly that "their watched status, user ratings, etc. are all tracked
separately". Declared with `{edition-Director's Cut}` in the filename or folder, or via the
Edition tag in Edit Details (Plex Pass required).

The two compose: one edition folder can hold four encodes. Renaming a file to add an edition
creates a *new* item and loses watched state; editing the tag preserves it. Editions are
excluded from Plex's cloud watch-state syncing.

**Why this matters here.** The brief says versions "differ in length and content, some cover
only part of the work" and that watching one version is not watching another. That is Plex's
*Edition*, not Plex's *Version*. Two different encodes of the same broadcast are one thing;
a 90-minute omnibus and a four-part serial are not. Any design that has a single "version"
concept will end up conflating these two, and the watched-state semantics differ between
them.

## Plex's answer to alternate orderings is to duplicate the show

From Plex's own TV Editions article, listing it as a use case verbatim:

> You may just want more than one episode order for a show to be available as separate
> listings.

That is the whole product justification in one sentence, written by the incumbent. Plex has
one `Episode Ordering` setting per library or series ("How episodes are named/numbered on
disk. If your naming follows The MovieDB or TheTVDB choose that here"), and the documented
workaround for wanting two is to hold the show twice.

## Jellyfin has only the versions half

No editions equivalent. Versions are declared by filename inside the movie's own folder:
each file "must begin exactly with the parent folder name — including any year and/or
metadata provider IDs — before adding a version label", then space-hyphen-space and a label:
`Movie (2021) [imdbid-tt12801262] - 2160p.mp4`. Also `POST /Videos/MergeVersions`, undone by
`DELETE /Videos/{itemId}/AlternateSources`.

The model: `Video` carries `PrimaryVersionId`, `LinkedAlternateVersions[]` and
`LocalAlternateVersions[]`. Collapsing happens because `Video.CreatePresentationUniqueKey()`
returns the primary's id and `InternalItemsQuery.GroupByPresentationUniqueKey` defaults true
— alternates fold into one row and surface as `MediaSources` on the primary.
`UserItemDataDto` (`PlaybackPositionTicks`, `Played`, `PlayCount`) is per item, so
**playback state is shared across versions**.

Consequence worth noting: `- Directors Cut` is a legal Jellyfin version label, but a
theatrical and an extended cut merged this way share one watched state and one resume
position. Jellyfin cannot track two cuts separately except as two unrelated movie items.

## Sets versus sequences

| | Plex Collections | Plex Playlists | Jellyfin BoxSet | Jellyfin Playlists |
| --- | --- | --- | --- | --- |
| Item in many? | yes (multi-valued tag) | yes | yes (`GET /Items/{id}/Collections`) | yes |
| Manual order? | yes, dumb collections only | yes | **no** | yes |
| Nests? | **no** | n/a | **no** | n/a |
| Mixed media types? | yes | **no** (`audio\|video\|photo`) | yes | yes |
| Duplicate entries? | no | yes (`playlistItemID`) | no | yes (`PlaylistItemId`) |

Plex collections are membership-by-tag, so an item can be in many; dumb collections can be
drag-reordered (Plex Web 4.61.2+), smart ones always sort by their filter. Nested collections
have been an open request since December 2018.

Jellyfin's `BoxSet` is a real Folder with `LinkedChildren`, but implements `IHasDisplayOrder`
with `DisplayOrder` defaulting to `"PremiereDate"` and applied in `GetChildren` — there is no
move/reorder endpoint at all. Nesting is feature request #4039; hiding a child collection
hides it everywhere.

**Two orderings over the same episodes at once: no, in both.** Jellyfin's
`Series.DisplayOrder` is a single string, commented in source as "Valid options are airdate,
dvd or absolute".

**Named phases or sub-sections inside an ordering: no, in both.** A collection or playlist is
a flat sequence with no headings, and with nesting unsupported there is not even a parent to
hang sub-groups off. Only the metadata providers model this.

## TheTVDB: orderings are first-class, and richer than the brief assumed

TVDB calls an ordering a **season type**. Verified against the v4 OpenAPI spec
(`thetvdb/v4-api`, `docs/swagger.yml`).

- `GET /seasons/types` (`operationId: getSeasonTypes`) returns `SeasonType`:
  `{ id, name, type, alternateName }`.
- `GET /series/{id}/episodes/{season-type}` — documented example values `default`, `official`,
  `dvd`, `absolute`, `alternate`, `regional`.
- **Default named on the series record:** `SeriesBaseRecord.defaultSeasonType` (int64 → a
  SeasonType id). `SeriesExtendedRecord` also carries `seasons[]`, `seasonTypes[]` (which
  orders actually exist for that series) and `isOrderRandomized`.
- **An episode can be absent from an order:** `EpisodeBaseRecord.seasons[]` is an array of
  `SeasonBaseRecord` each with its own `type`. Live: Firefly has 20 episodes in `official`,
  17 in `dvd`, 15 in `absolute`. Most orders simply don't exist per series — Firefly's
  `alternate` and `regional` are empty, while **Doctor Who (2005) has 187 episodes in
  `alternate`** and Pokémon has 1339 in `regional`.
- **An order owns its own named seasons:** `SeasonBaseRecord` has `number`, `name`, `type`,
  `image`, `year`, `companies`, and a season belongs to exactly one order type. Names are
  real content (`Season 3 - Secrets Revealed` on Clone Wars).
- **Specials placement:** `airsBeforeSeason`, `airsBeforeEpisode`, `airsAfterSeason` on the
  episode record, plus a "Special is Critical to Show's Story" flag
  ([FAQ 19](https://support.thetvdb.com/kb/faq.php?id=19)).
- **Editorial policy:** alternate orders are created only by admins on submitted evidence,
  and "requests to follow 'scene' orders will be denied"
  ([Contested Series Orders](https://support.thetvdb.com/kb/faq.php?id=5)). Note the word
  *contested* in TVDB's own title — they hit the same problem and solved it with gatekeeping.
- TVDB **Lists / Franchises** (`ListBaseRecord`) are a flat set across series and movies, not
  an ordering.

## TMDB Episode Groups: the closest existing model to named phases

`GET /3/tv/{series_id}/episode_groups` lists them; `GET /3/tv/episode_group/{id}` fetches one.

Type enum: **1** Original air date, **2** Absolute, **3** DVD, **4** Digital, **5** Story arc,
**6** Production, **7** TV.

A group record has `id`, `name`, `description`, `type`, `network`, `group_count`,
`episode_count`, and `groups[]` — where **each sub-group has its own `id`, `name`, `order`,
`locked` and `episodes[]`**.

So a TMDB episode group is one complete ordering, subdivided into arbitrarily named,
explicitly ordered sub-groups. That is exactly the "an ordering groups into its own named
phases, and those groupings are not the broadcast ones" requirement, already modelled by a
general database with an open API. It is strictly richer than TVDB's, which reuses numbered
seasons. Episodes can be omitted from a group. And type 5 is literally **Story arc**.

This is the single most reusable finding: the phases requirement is not exotic, and there is
a public schema for it to borrow vocabulary from.

## What none of them do

- Present two orderings over one set of items **at the same time**. Plex duplicates the show;
  Jellyfin picks one string.
- Group an ordering into named phases *in a media server*. Only the metadata providers do it,
  and the servers do not consume that structure.
- Attach evidence or an argument to a position. Every ordering above is an assertion of fact.
- Hold an item that cannot be placed yet, visibly.
- Order across media. Every ordering above is scoped to one series' episodes.

That absence is the product's justification, and it is documented in the incumbent's own
support article rather than inferred.

## Marked unverified

- Plex sharing watched state across *versions* is inferred from the docs explicitly stating
  that *editions* track it separately. No Plex article states the version case directly.
- Whether the Plex UI lets you add the same item to one playlist twice (the `playlistItemID`
  model permits it; untested).
- A sixth TVDB order, "Alternate DVD Order", appears in Kodi wiki and community sources but
  not in TVDB's own swagger examples or KB.
- Whether TMDB flags one episode group as canonical/default for a series. No
  `defaultSeasonType` analogue found; the series' own season numbering appears to be the
  implicit default.
- Jellyfin nesting: `BoxSet` is a Folder taking arbitrary `LinkedChildren` so the model does
  not forbid it, and one forum reply claims manual nesting works, but it is unsupported and
  the child stays visible at root.

## Sources

[Plex Multi-Version Movies](https://support.plex.tv/articles/200381043-multi-version-movies/) ·
[Plex Multiple Editions – Movies](https://support.plex.tv/articles/multiple-editions/) ·
[Plex Multiple Editions – TV Shows](https://support.plex.tv/articles/multiple-editions-tv-shows/) ·
[Plex Merge or Split Items](https://support.plex.tv/articles/201018248-merge-or-split-items/) ·
[Plex Collections](https://support.plex.tv/articles/201273953-collections/) ·
[Plex Lists](https://support.plex.tv/articles/lists/) ·
[Plex TV Series Agent settings](https://support.plex.tv/articles/advanced-setting-plex-tv-series-agent/) ·
[Jellyfin movie naming](https://jellyfin.org/docs/general/server/media/movies/) ·
[Jellyfin OpenAPI](https://api.jellyfin.org/openapi/jellyfin-openapi-stable.json) ·
[BoxSet.cs](https://github.com/jellyfin/jellyfin/blob/master/MediaBrowser.Controller/Entities/Movies/BoxSet.cs) ·
[Video.cs](https://github.com/jellyfin/jellyfin/blob/master/MediaBrowser.Controller/Entities/Video.cs) ·
[Series.cs](https://github.com/jellyfin/jellyfin/blob/master/MediaBrowser.Controller/Entities/TV/Series.cs) ·
[TheTVDB v4 swagger](https://github.com/thetvdb/v4-api/blob/main/docs/swagger.yml) ·
[TVDB Contested Series Orders](https://support.thetvdb.com/kb/faq.php?id=5) ·
[TVDB Specials](https://support.thetvdb.com/kb/faq.php?id=19) ·
[TMDB episode group details](https://developer.themoviedb.org/reference/tv-episode-group-details) ·
[TMDB series episode groups](https://developer.themoviedb.org/reference/tv-series-episode-groups)
