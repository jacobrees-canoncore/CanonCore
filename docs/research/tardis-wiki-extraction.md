# Extracting chronology from tardis.wiki — feasibility proof

Live-tested 8 August 2026 against <https://tardis.wiki> (the independent wiki, never the Fandom
mirror). MediaWiki 1.39.11 / PHP 8.3.32 / MariaDB 10.11, SemanticMediaWiki installed.
The site owner has granted this project permission to extract.

**Scope.** This is a feasibility proof, not an implementation. The question answered here is
"can we reliably get the data out, and what shape is it in". Edge cases are named and left
unsolved on purpose.

**Verdict up front: yes, reliably — but only through a real browser.**

> **Exclusion note.** No repository or page matching `canoncore*`, `CanonCore*` or `universora*`
> was read, fetched or quoted. None surfaced; had one, it would have been discarded and noted.

---

## 1. Access: one method, and the browser is mandatory

### The load-bearing yes/no

**A plain HTTP client does not work, at any User-Agent. The Playwright browser is mandatory.**

Tested with `curl` (HTTP/2, three User-Agents, three URLs, nine combinations, all **403**):

| User-Agent | `/robots.txt` | `/api.php?...` | `/index.php?...&action=raw` |
|---|---|---|---|
| `CanonCorePersonalImporter/0.1 (jacobrees@icloud.com)` | 403 | 403 | 403 |
| `CanonCorePersonalImporter/0.1 (+https://…; jacobrees@icloud.com) python-requests/2.32` | 403 | 403 | 403 |
| `Mozilla/5.0 (Macintosh…) Chrome/128.0.0.0 Safari/537.36` (spoofed) | 403 | 403 | 403 |

The response headers say exactly why:

```
HTTP/2 403
cf-mitigated: challenge
server: cloudflare
content-security-policy: … script-src 'nonce-…' 'unsafe-eval' https://challenges.cloudflare.com …
```
```html
<!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title>…
```

`cf-mitigated: challenge` is a Cloudflare **Managed Challenge**: an interstitial that must be
solved by executing JavaScript. It is not a User-Agent blocklist, so a descriptive UA changes
nothing — spoofing Chrome does not help either, because the TLS/client fingerprint is also wrong.
`WebFetch` on `https://tardis.wiki/robots.txt` likewise returned **HTTP 403 Forbidden**.

Through Playwright, everything works: the challenge clears in a few seconds and all endpoints
return 200.

**Operational cost of the browser requirement**, which matters because this will be a
standalone service (see §6):
- The service must ship a headless Chromium (~400 MB image layer) and cannot be a plain
  serverless function with a `fetch` loop. Playwright on Lambda/Vercel is possible but awkward;
  a small always-on container is the honest shape.
- Cold start is seconds, not milliseconds, and the *first* request of a session pays the
  challenge-solving delay on top.
- Once cleared, the browser context holds a `cf_clearance` cookie (533 bytes, HttpOnly,
  **expiry exactly 365 days** from issue). Fetches issued from inside the page via
  `fetch()` reuse it for free, which is what makes a session worth keeping warm.
- Whether that cookie can be **exported and replayed from a plain HTTP client** is
  **unverified** — extracting the token to disk was blocked by this environment's permission
  classifier, and Cloudflare normally binds `cf_clearance` to IP + UA + TLS fingerprint, so the
  expected answer is no. It is the one thing worth re-testing, because a yes would collapse the
  service to a simple fetch loop.
- The cleaner fix is not technical: **ask the owner to add a Cloudflare WAF skip rule for the
  importer's User-Agent or IP.** Permission has been granted; the challenge simply has not been
  told about it. That would remove the browser dependency entirely.

### Which endpoint to use

All four bulk methods were tested live against `Theory:Timeline_-_Tenth_Doctor` and **all four
work** through the browser:

| Method | Status | Content-Type | Bytes | Notes |
|---|---|---|---|---|
| `/index.php?title=X&action=raw` | 200 | `text/x-wiki` | 145,467 | pure wikitext, zero envelope |
| `api.php?action=query&prop=revisions&rvprop=content&rvslots=main` | 200 | `application/json` | 147,946 | + `pageid`, `revid`, `timestamp` |
| `api.php?action=parse&prop=wikitext\|templates` | 200 | `application/json` | 149,043 | + resolved template list |
| `Special:Export` (GET or POST, page list) | 200 | `application/xml` | 231,600 (2 pages) | full XML envelope |

Verbatim head of the `action=raw` response:

```
{{Forumheader|Timey-wimey detector}}{{Doctor Who timelines}}
This page lists '''appearances of the [[Tenth Doctor]] in the order in which he experienced
them'''. This timeline is based upon observations of the [[Doctor Who universe|''Doctor Who''
universe]] and the events that occur during each of these stories.
```

and of the `prop=revisions` response:

```json
{"batchcomplete":true,"query":{"normalized":[{"from":"Theory:Timeline_-_Tenth_Doctor",
"to":"Theory:Timeline - Tenth Doctor"}],"pages":[{"pageid":104722,"ns":114,
"title":"Theory:Timeline - Tenth Doctor","revisions":[{"revid":4284413,"parentid":4279670,
"timestamp":"2026-07-15T20:14:18Z","slots":{"main":{"contentmodel":"wikitext",
"contentformat":"text/x-wiki","content":"{{Forumhea…
```

**Use `api.php?action=query&prop=revisions&rvprop=content|ids|timestamp&rvslots=main&format=json&formatversion=2&titles=…`.**

Rationale: it is the only method that returns the **content plus the `revid` and `timestamp`** in
one call, which is what makes the extraction resumable and cacheable (re-fetch only when `revid`
changes). It also **accepts multiple titles in one request** — verified live, three large
timeline pages (197 KB + 145 KB + 80 KB of wikitext) returned in a single response with no
`warnings` and no truncation. `action=raw` is the simplest but returns no revision id;
`Special:Export` works with page lists but wraps everything in XML for no gain (and note that
sending a `templates` parameter, even empty, expanded a 2-page request to **30 `<page>`
elements** — a trap).

For thousands of story pages the same endpoint applies, batched ~20 titles per call; that path
was not exercised at volume and is **unverified** beyond the 3-title proof.

### No database dumps

`/dumps/`, `/dumps`, `/dump/`, `/backups/`, `Tardis:Database_download` and `Tardis:Database_dump`
all return **404**. `Special:Statistics` mentions none. `siprop=general` reports
`misermode: true`; `siprop=dbrepllag` returns `lag: -1` (single server, no replication to wait
for, so `maxlag` is moot here). The only bulk artefact published is a sitemap index
(`/sitemap/sitemap-index-tardis.wiki.xml`, 4 gzipped sitemaps, `lastmod 2026-08-07`) which lists
URLs, not content. **Page-by-page API fetching is the only route.**

---

## 2. One entry, end to end

Verbatim wikitext from `Theory:Timeline_-_Tenth_Doctor` (the `{{SourceFilter}}` block inside the
`=== A new body ===` section, which is the single richest entry on the page):

```wikitext
== Timeline ==
: ''Previous page: '''[[Theory:Timeline - Ninth Doctor|Ninth Doctor]]'''''

----
{{SourceFilterTop}}
=== A new body ===
…
{{SourceFilter|PROSE|valid|annual|BBC|DIARYENTRY}}
* [[PROSE]]: ''[[First Day of the Doctor (short story)|First Day of the Doctor]]''
: The Doctor writes in [[Tenth Doctor's diary|his diary]] about defeating of the Sycorax, setting this shortly after ''The Christmas Invasion''.
{{SourceFilterEnd}}
```

Structured record:

```json
{
  "timeline_page":      "Theory:Timeline - Tenth Doctor",
  "timeline_revid":     4284413,
  "timeline_timestamp": "2026-07-15T20:14:18Z",
  "sequence":           17,
  "phase":              "A new body",
  "depth":              0,
  "prefix":             "PROSE",
  "story_page":         "First Day of the Doctor (short story)",
  "story_url":          "https://tardis.wiki/wiki/First_Day_of_the_Doctor_(short_story)",
  "display_title":      "First Day of the Doctor",
  "entry_type":         "DIARY ENTRY",
  "validity":           "valid",
  "series":             ["annual"],
  "publisher":          "BBC",
  "source_type":        null,
  "placement_argument": "The Doctor writes in [[Tenth Doctor's diary|his diary]] about defeating of the Sycorax, setting this shortly after ''The Christmas Invasion''.",
  "section":            "timeline"
}
```

Field derivations, each mechanical:

| Field | Derived from |
|---|---|
| `sequence` | ordinal of the entry line within the page, counting from the top |
| `phase` | nearest preceding `=== … ===` heading |
| `depth` | length of the leading `:`-run before the `*` (0 for `*`, 1 for `:*`) |
| `prefix` | the `[[X]]:` at the start of the line |
| `story_page` | left side of the `[[target\|display]]` piped link |
| `display_title` | right side of the pipe |
| `placement_argument` | the immediately following line(s) starting with `:` at depth+1 |
| `entry_type`, `validity`, `series`, `publisher`, `source_type` | positional args of the enclosing `{{SourceFilter\|…}}` — see §4 |
| `section` | `timeline` / `currently_unplaced` / `awaiting_placement`, from the nearest `== … ==` |

The plainer, far more common shape needs only the first seven of those:

```wikitext
* [[TV]]: ''[[The Christmas Invasion (TV story)|The Christmas Invasion]]''
: Recovering from his regeneration trauma at the [[Powell Estate]], the Doctor repels a [[Sycorax]] [[Sycorax invasion of Earth|invasion of Earth]] during [[Christmas]] [[2006]], losing [[The Tenth Doctor's hand|his hand]] in a swordfight with [[Fadros Pallujikaa|the leader]]. …
```

---

## 3. Structure: regular enough to parse

**Verdict: regular. Hand-written wikitext, but strikingly disciplined.** One regex catches
essentially every entry:

```
^([:*]*\*)\s*\[\[([A-Z]+)\]\]:\s*(.*)$
```

Measured live:

| Page | Bytes | Entry lines matched | Bullet lines missed |
|---|---:|---:|---:|
| `Theory:Timeline - Tenth Doctor` | 145,467 | **642** | **0** |
| `Theory:Timeline - Eighth Doctor` | 197,552 | **561** | **3** |

Three misses out of 1,206 lines, and all three are genuine prose bullets in the "Complications"
narrative, not malformed entries.

### How each thing is encoded

- **Templates: almost none.** The whole Tenth Doctor page uses only `{{Forumheader}}`,
  `{{Doctor Who timelines}}`, `{{SourceFilterTop}}`, one `{{SourceFilter}}`/`{{SourceFilterEnd}}`
  pair, `{{Scroll}}`, `{{reflist}}`, two actor-name templates, and **48 × `{{cs|…}}`**
  (a redirect to `Template:Cite source`). The Eighth Doctor page uses 95 `{{cs}}` and no
  `SourceFilter` at all. **Entries are not template-wrapped.** This is a plain
  bullet-list-plus-indent document, which is why it parses so cleanly.

- **Medium prefix** — a **literal wikilink to a shortcut page**, not a template:
  `* [[TV]]: `, `* [[PROSE]]: `, `* [[AUDIO]]: `, `* [[COMIC]]: `, `* [[NOTVALID]]: `,
  `* [[NOTCOVERED]]: `. Observed prefixes across the two pages: `TV, PROSE, AUDIO, COMIC, WC,
  GAME, POEM, NOTVALID, NOTCOVERED, NC`. Note **`NC` is used 50 times on the Eighth Doctor page
  and 3 times on the Tenth but is not in the documented tag list** — it links to
  `[[Charity publication#Unbound]]`-style targets. Treat the prefix set as open.

- **Entry type** — a literal underlined string on its own indented line, immediately followed by
  the italicised description:

  ```wikitext
  :: (<u>REFERENCE</u>)
  :: ''Shortly after Christmas dinner with the Tylers and Mickey, the Doctor goes to join the celebration in [[Trafalgar Square]], where a photograph of him is taken by [[Ursula Blake]]. ([[TV]]: ''[[Love & Monsters (TV story)|Love & Monsters]]'')''
  ```

  Regex `\(<u>([^<]+)</u>\)`. Live counts — Tenth: `SEGMENT 13, FLASHBACK 6, REFERENCE 4,
  SEGMENTS 3, YOUNGER COUNTERPART 2, CONTEXT 1, NOTE 1, REFERENCES 1, FOOTAGE 1` (32 total).
  Eighth: `REFERENCE 23, FLASHBACK 14, NOTE 5, CONJECTURE 4, EPILOGUE 3, SEGMENT 2, SEGMENTS 2,
  FRAMING DEVICE 1, CONTEXT 1, FUTURE COUNTERPART 1` (56 total). **The vocabulary is wider than
  the documented 12** — `CONTEXT`, `FOOTAGE`, `YOUNGER COUNTERPART`, `FUTURE COUNTERPART`,
  and unpluralised/pluralised doublets (`SEGMENT`/`SEGMENTS`) all occur. Normalise, do not
  validate against a closed enum.

  These annotation blocks are **standalone pseudo-entries with no story link of their own** —
  the story they cite is inline in the prose, in `([[TV]]: ''[[…]]'')` form.

- **Named phases** — ordinary `=== H3 ===` headings inside the `== Timeline ==` H2. Association
  is purely positional: an entry belongs to the nearest preceding H3. Tenth Doctor has 51 of them
  (`A new body`, `The Library ordeal`, `Time Lord Victorious`, `Final reward`, …); Eighth has 68,
  including one nested `==== Avoiding the Time War ====` H4.

- **Placement argument prose** — the line(s) immediately after the entry, prefixed with `:` at
  one greater indent depth than the entry's bullet (`*` → `:`, `:*` → `::`). Many entries have
  none. On the Tenth Doctor page, line-start counts are `* 615`, `: 482`, `:* 27`, `:: 123`.

- **Unplaced sections** — plain H2 headings after the timeline, each with its own italic
  explanatory blurb, verbatim:

  ```wikitext
  == Currently unplaced ==
  :: ''These entries are placed here due to being part of ongoing storylines that have yet to offer sufficient enough evidence to be placed in a specific part of this Doctor's timeline, unless further evidence arises in the stories to come.''

  == Awaiting placement ==
  :: ''These entries are placed here until a suitable position in the timeline can be determined based on the available evidence.''
  ```

  `Currently unplaced` still carries an H3 sub-phase of its own (`=== Dealing with temporal
  distortion ===`), so the phase logic must keep running past the timeline H2.

### Variants I did NOT chase

Named honestly, because each will need work later and none blocks the proof:

1. **`{{cs|Page name}}`** in place of the italic link — 48 uses on the Tenth page,
   e.g. `* [[AUDIO]]: {{cs|The Kraken of Hagwell (audio story)}}`. Trivially resolvable
   (the template arg *is* the page title) but it is a second code path.
2. **Multi-story entries** — one bullet listing four stories separated by ` / `, e.g.
   `''[[Wrath of the Warrior (comic story)|…]]'' / ''[[The Screaming Prison (comic story)|…]]'' / …`.
3. **Sub-work placement** — `''[[The Infinite Quest (TV story)|The Infinite Quest]]'': ''Part 1''`,
   `…: ''Epilogue''`, `…: Episodes 76-80`, `''[[Things to do with a Defeated Enemy]]'' #4`.
   The chapter/part designator is free text after the link.
4. **Issue-number suffixes** — `''[[Untitled (10DY3 2 comic story)|Untitled]]'' ([[10DY3 2]])`.
5. **Section-anchor targets** — `[[Charity publication#Unbound|Victorious]]`, which point at a
   section of a shared page rather than a story page of their own.
6. **Malformed prose attachment** — at least one entry (`Crash and Burn`) has its argument on a
   bare unprefixed line rather than a `:` line. Rare; will drop silently.

Of the 642 Tenth Doctor entries, **565 (88%)** are the plain `''[[Page|Display]]''` form and
another 48 the `{{cs}}` form, so **95% of entries fall into two shapes**.

---

## 4. The facet data: per-entry in the wikitext, but almost entirely unpopulated

This was the big potential win. The answer is a clear **yes in principle, no in practice**.

The filter UI is `{{SourceFilterTop}}` plus a Scribunto module. Reading the sources:

- `Template:SourceFilterTop` renders the button table; each button is
  `{{SourceFilterButton|tag|Label}}`, which emits a `mw-customtoggle-<tag>` span.
- `Template:SourceFilter` is `{{#invoke:SourceFilter|startFilterBlock}}`; `Module:SourceFilter`
  simply wraps the following content in one nested
  `<div class="mw-collapsible" id="mw-customcollapsible-<arg>">` **per positional argument**.
- `Template:SourceFilterEnd` closes them.

So the facets are **pure per-entry positional tags in the wikitext**, hidden and shown by
MediaWiki's built-in collapsible CSS/JS. Nothing is computed from the linked story pages; there
is no SMW involvement at all.

The tag vocabulary, verbatim from `Template:SourceFilter/doc` (the authoritative list):

| Axis | Tags |
|---|---|
| **Prefix** | `TV PROSE AUDIO COMIC WC HOMEVID GAME GRAPHIC POEM STAGE NOTVALID NOTCOVERED` |
| **Validity** | `valid invalid notcovered unreleased` |
| **Source type** | `parody trailer poem novelisation` |
| **Series** | `DW DWTV VNA VMA BBCEDA PDA MR BF8DA FP annual DWMComics DWA TitanBackups IW BrendaAndEffie LethbridgeStewart TW SJA class TLV doom DrMen lockdown PROBE` |
| **Publisher** | `BBC BF BBV virgin IDW titan polystyle marvel panini target MadNorwegian obverse MetalMutt snowbooks candy arcbeatle self other` |
| **Entry type** | `REFERENCE FLASHBACK FRAMINGDEVICE SEGMENT PROLOGUE EPILOGUE NOTE LETTER POSTCARD DIARYENTRY CONJECTURE CAMEO` |

Arguments are **positional and unnamed**, in the order prefix / validity / [source type] /
series* / publisher / [entry type]. The doc's own worked example is
`{{SourceFilter|PROSE|valid|DrMen|DW|other}}`; the one real use on the Tenth Doctor page is
`{{SourceFilter|PROSE|valid|annual|BBC|DIARYENTRY}}`. **There is no fixed arity** — an entry may
carry several series tags — so a parser must classify each argument against the vocabulary
tables above rather than read it by position. That is easy (the vocabularies are disjoint except
`poem`/`POEM` and `notcovered`/`NOTCOVERED`, which differ by case) but it is not "arg[3] is the
publisher".

**The killer measurement.** Despite the documentation saying "All entries should receive a tag":

| Page | Entries | `{{SourceFilter}}` blocks | Coverage |
|---|---:|---:|---:|
| `Theory:Timeline - Tenth Doctor` | 642 | **1** | 0.2% |
| `Theory:Timeline - Eighth Doctor` | 561 | **0** | 0% |

So the facet mechanism is real, documented and machine-readable — and on the two flagship pages
it is used **once**. Plan for `validity`, `series`, `publisher`, `source_type` and the
`SourceFilter` form of `entry_type` to be **null on nearly every record**, and derive what you
can instead:

- `prefix` from the `[[X]]:` literal (100% coverage).
- `entry_type` from the `(<u>…</u>)` annotation (covers the 32 / 56 annotation pseudo-entries).
- `validity` roughly from the prefix (`NOTVALID` → invalid, `NOTCOVERED` → not covered).
- `publisher`, `series`, `release date` from the **linked story page's SMW properties** (§5),
  not from the timeline page.

The wiki has **no CirrusSearch** (confirmed absent from the extension list; an `insource:` query
returned `totalhits: 0`), so you cannot cheaply find which pages *do* use `SourceFilter`. You
would have to fetch and count. If a handful of pages are well tagged, they are worth finding.

---

## 5. Corpus and story-page probe

**Enumeration** (one call, verified): `Theory:` is **namespace 114**. 
`api.php?action=query&list=allpages&apnamespace=114&apprefix=Timeline&aplimit=500` returns
**492 pages** titled `Theory:Timeline - …`, paging to exhaustion. The category route,
`list=categorymembers&cmtitle=Category:Timey-wimey detector`, returns **477** members, of which
14 are `User:`/`Template:` pages, so ~463 real timelines — the category is slightly behind the
title prefix. **Use the `apprefix` route; it is one call and complete.** Titles cover the 16
Doctors plus War/Fugitive/Curator, ~120 companions and characters, decades and centuries,
species, organisations and places. Total `Theory:` namespace: 1,271 pages. Wiki totals:
372,782 pages / 127,910 articles.

**Story-page structured data** — one probe, `action=browsebysubject` on
`The Christmas Invasion (TV story)`, returned **~95 SMW properties**. The useful ones:

```
Medium = "tv"                Release_date = "1/2005/12/25"    Writer = Russell T Davies
Director = James Hawes       Series = "[[Doctor Who television stories|…]]"
Episode_code = "1DW 02.00"   Doctor = Tenth Doctor            Special = "[[Christmas Special]] 2005"
Story_info = "[[Russell T Davies]], ''[[Doctor Who]]'' [[Christmas special]] ([[BBC One]], [[2005 (releases)]])."
Has_image = "File:Did you miss me? (The Christmas Invasion).jpg"
```

The rest are production credits (`Gaffer`, `Focus_puller`, `Props_storeman`, …). A companion
`action=ask` query confirmed the same values come back through the query API with typed results
(`Release date` as `{"timestamp":"1135468800","raw":"1/2005/12/25"}`).

So **release date, series, writer and medium are machine-readable; `Publisher`, `Range` and
`Isbn` are declared properties but were empty on this TV story** (they are populated on prose and
audio pages per prior research). **No external identifiers of any kind** — no TMDB, TVDB,
MusicBrainz or ISBN property on this record; only a `Corresponding_Wikipedia_link` (which here
pointed at `Viking 1`, i.e. an in-article link, not a page-level identifier). Cross-source joins
will have to go through Wikidata, not through tardis.wiki. One probe only, per the narrowed
brief; other media types are **unverified**.

---

## 6. Rate limit and standalone-service notes

**Rate: 1 request per second, no concurrency, and cache by `revid` so nothing is fetched twice.**

`robots.txt` (34,742 bytes, 1,109 lines, adapted from runescape.wiki) contains **no
`Crawl-delay` directive at all** — verified by scanning every line. It does contain, under
`User-Agent: *`:

```
Disallow: /api.php
Disallow: /rest.php/
Disallow: /*?action=
Disallow: /*?*&action=
Disallow: /wiki/Special:
```

which covers **all three** bulk methods (`api.php`, `action=raw`, and `Special:Export`). There is
no `Crawl-delay` to obey and no allowance to rely on, so the 1 rps figure comes from MediaWiki's
own API etiquette (serial requests, one at a time, back off on errors) rather than from the site.
`maxlag` is not useful here: `siprop=dbrepllag` reports `lag: -1`, a single database server with
nothing to lag behind. `misermode: true` means expensive special pages are throttled server-side
anyway.

**Say plainly:** the owner's permission is what authorises this, and robots.txt has not been
updated to reflect it. An outside observer reading robots.txt would see a violation. Worth asking
the owner to (a) add a WAF skip rule for the importer's User-Agent, and (b) optionally add an
allow stanza to robots.txt, so the permission is legible from the outside as well as agreed
privately.

At 1 rps with ~20 titles per `prop=revisions` call, all 492 timeline pages fetch in **under a
minute**. There is no volume problem here. Resume by storing `(title, revid)` and skipping any
page whose current `revid` is unchanged — one cheap `prop=revisions&rvprop=ids` call can check
50 titles at once.

**Standalone-service implications** (this will be a separate third-party custom-provider service
in the Audiobookshelf style: one endpoint, user pastes a URL, no store, no review):

- **The browser is the whole architecture.** A custom metadata provider is normally a stateless
  HTTP handler. This one cannot be: it needs a long-lived Chromium with a warm Cloudflare
  clearance. Design it as a small container with a single shared browser context and a request
  queue, not as a function.
- **Warm the session at boot**, then serve requests from the same context. The `cf_clearance`
  cookie lasts a year, so a container that stays up rarely re-solves the challenge.
- **Serialise everything behind one queue.** The 1 rps budget is per-site, not per-user; with an
  in-process queue you get politeness for free and never need distributed rate limiting.
- **Cache aggressively and permanently.** Keyed on `(pageid, revid)`, the wikitext never changes,
  so a hit is free and a miss costs one request. This is what keeps the service polite when
  several users ask for the same Doctor.
- **The provider's natural input is a `Theory:Timeline - …` page title or URL**, which maps to a
  single API call and yields an ordered list. That fits the "paste a URL" model exactly.
- **Do not try to enrich story records in the same request.** Resolving 642 linked story pages at
  1 rps is 11 minutes. Return the timeline with `story_page` titles and let enrichment be a
  separate, cached, background concern.

---

## Unverified

Kept short deliberately; everything else above was tested live.

1. **Replaying `cf_clearance` from a plain HTTP client.** Extracting the cookie value to disk was
   blocked by this environment's permission classifier. Cloudflare normally binds the cookie to
   IP + UA + TLS fingerprint, so the expected answer is "no", but a positive result would remove
   the browser dependency and is the single highest-value follow-up test.
2. **`prop=revisions` batching beyond 3 titles.** Proven at 3 large pages with no warnings; the
   MediaWiki limit for anonymous users is 50 titles but content-bearing queries are often capped
   lower. Not pushed, to stay polite.
3. **Whether any timeline page is well covered by `{{SourceFilter}}`.** Measured on two pages
   (1 tag and 0 tags). Without CirrusSearch there is no cheap way to find out; it would take a
   full 492-page fetch to answer, which the narrowed brief does not justify.
4. **SMW property coverage for non-TV media.** One probe was run, on a TV story, per the brief.
   `Publisher`, `Range` and `Isbn` came back empty there; prior research in this repo found them
   populated on audio and prose pages.
5. **Fetching thousands of story pages at volume.** The method is the same endpoint and the rate
   budget is known, but it was not exercised.
