# Position and progress: the locator reference

**Trimmed 8 August 2026.** This was a 2,119-line investigation into two problems. The first, how
owner edits and refreshed source data coexist without destroying each other, is settled in
[ADR-0004](../adr/0004-layered-overlay-for-sources-and-edits.md), which carries the Plex, Jellyfin,
Sonarr, Radarr and Kubernetes evidence that mattered. That survey is spent and cut.

The second is kept below, because it is spec detail rather than a decision.

## What was decided about position

A Position has a float `progression` and a stored human `label`, both nullable. Absent means no
position exists, which is the honest state for a medium that has none. The label is **stored, never
recomputed**, because the file is not here to recalculate from.

The `{scheme, value}` anchor list this research recommended was **dropped**: holding no bytes,
nothing can produce a precise anchor and nothing can consume one, so it was speculative structure.
Readium's own split explains why. Locators divide into those tied to a resource's structure (CFI,
XPath), which need the file, and those that are not (`progression`, `position`), which do not.

EPUB CFI was rejected outright: it is an IDPF document rather than a W3C recommendation, and it
requires the bytes to validate or repair.

---

### 6. Readium `Locator`

The Readium Locator is a cross-format position primitive designed for exactly this
problem. Spec: <https://readium.org/architecture/models/locators/> (source:
<https://github.com/readium/architecture/blob/master/models/locators/README.md>).

Its stated purpose, verbatim:

> Locators are meant to provide a precise location in a publication in a format that can
> be stored and shared.

And the use cases it names: "reporting and saving the current progression", bookmarks,
highlights and annotations, search results, "human-readable (as-in shareable) references",
"jumping to a location", "enhancing a table of contents".

**The `locator` object** (table quoted verbatim from the spec):

| Key | Definition | Format | Required |
| --- | --- | --- | --- |
| `href` | The URI of the resource that the Locator Object points to. | URI | Yes |
| `type` | The media type of the resource that the Locator Object points to. | Media Type | Yes |
| `title` | The title of the chapter or section which is more relevant in the context of this locator. | String | No |
| `locations` | One or more alternative expressions of the location. | Location Object | No |
| `text` | Textual context of the locator. | Text Object | No |

Two constraints in the prose matter: each locator **must** contain `href` and `type`, and
"`href` **must not** point to the fragment of a resource" — the fragment lives inside
`locations.fragments`, never in the href.

**The `location` object:**

| Key | Definition | Format | Required |
| --- | --- | --- | --- |
| `fragments` | Contains one or more fragment in the resource referenced by the Locator Object. | Array of strings | No |
| `progression` | Progression in the resource expressed as a percentage. | Float between 0 and 1 | No |
| `position` | An index in the publication. | Integer where the value is > 0 | No |
| `totalProgression` | Progression in the publication expressed as a percentage. | Float between 0 and 1 | No |

Crucially: "Additional locations **may** also be included in this object, using an
extension officially registered on this repository or a URI." The location object is an
open bag. One extension is registered, the HTML Extension
(<https://github.com/readium/architecture/blob/master/models/locators/extensions/html.md>),
which adds `cssSelector`, `partialCfi` and `domRange`.

**The `text` object:** `before`, `highlight`, `after`, all optional strings. Used to give
the locator context, and to re-find it if the underlying document shifts.

**The reference JSON Schema** (<https://readium.org/architecture/schema/locator.schema.json>)
confirms the shape and the constraints: `progression` and `totalProgression` are
`"type": "number", "minimum": 0, "maximum": 1`; `position` is `"type": "integer",
"minimum": 1`; `required` is exactly `["href", "type"]`.

**How it handles a page vs a percentage vs a CFI.** The answer is that it does not
special-case them. It carries *whatever is available*, in parallel, and lets the consumer
pick:

- A **page** is a media-type-specific fragment string in `fragments`. The spec's own PDF
  example uses `"fragments": ["page=5", "viewrect=50,50,640,480"]`, citing RFC 3778.
- A **percentage** is `progression` (within the resource) and `totalProgression` (within
  the whole publication). These are the format-agnostic fields — every medium can produce
  them.
- A **CFI** is not a first-class field at all. It arrives via the HTML extension as
  `partialCfi`, and the extension is explicit that it is *partial*: "an expression
  conforming to the 'right-hand' side of the EPUB CFI syntax, that is to say: without the
  EPUB-specific OPF spine item reference that precedes the first `!` exclamation mark …
  Note that the wrapping `epubcfi(***)` syntax is not used". The spine reference is
  redundant because `href` already names the resource.

The spec's own worked examples, verbatim:

```json
{
  "href": "http://example.com/chapter1",
  "type": "text/html",
  "title": "Chapter 1",
  "locations": {
    "position": 4,
    "progression": 0.03401,
    "totalProgression": 0.01349
  },
  "text": {
    "after": "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife."
  }
}
```

```json
{
  "href": "http://example.com/track6",
  "type": "audio/ogg",
  "title": "Chapter 5",
  "locations": {
    "fragments": ["t=389.84"],
    "progression": 0.607379,
    "totalProgression": 0.50678
  }
}
```

```json
{
  "href": "http://example.com/document",
  "type": "application/pdf",
  "title": "Page 5",
  "locations": {
    "fragments": ["page=5", "viewrect=50,50,640,480"],
    "progression": 0.12703,
    "totalProgression": 0.12703
  }
}
```

**The per-format best-practice table is the most useful single artefact in the whole
spec** (<https://github.com/readium/architecture/blob/master/models/locators/best-practices/format.md>).
It states, per medium, what a progression locator must carry:

- **EPUB**: must have `href`, `type`, `progression`; should have `totalProgression`,
  `position`, and "a CSS Selector, DOM Range or CFI ?" — note the question mark is in the
  spec. Readium itself has not settled which anchor to prefer.
- **PDF**: must have `href`, `type`, `progression`, `position`, and a `page` fragment.
- **Audiobooks**: must have `href`, `type`, `progression`, and a `t` fragment.
- **Comics**: must have `href`, `type`, `position`; should have `totalProgression`; may
  have `title` and "an `xywh` fragment for `fragments`".

That last line answers the comic panel case directly: page is `position` (the index of the
image resource in the reading order), panel is an `xywh` media fragment on that image.

**It is implemented, not just specified.** The Readium Kotlin toolkit's `Locator.kt`
(<https://github.com/readium/kotlin-toolkit/blob/develop/readium/shared/src/main/java/org/readium/r2/shared/publication/Locator.kt>)
is a direct transcription, and shows the extension point as a typed escape hatch:

```kotlin
public data class Locator(
    val href: Url,
    val mediaType: MediaType,
    val title: String? = null,
    val locations: Locations = Locations(),
    val text: Text = Text(),
) : JSONable, Parcelable {

    public data class Locations(
        val fragments: List<String> = emptyList(),
        val progression: Double? = null,
        val position: Int? = null,
        val totalProgression: Double? = null,
        val otherLocations: @WriteWith<JSONParceler> Map<String, Any> = emptyMap(),
    )
```

Note that everything in `Locations` is nullable and defaults to empty. **A Locator with an
empty `locations` is valid** — only `href` and `type` are required. That is how "no
position exists" is expressed: you still have a pointer to the work, with nothing inside
it. That falls out of the model rather than needing a special case.

