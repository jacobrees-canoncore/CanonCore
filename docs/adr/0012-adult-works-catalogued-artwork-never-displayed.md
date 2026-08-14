# Adult works may be catalogued; their artwork is never displayed

The catalogue is unbounded: any work may be recorded, including pornographic films. Their **artwork is
never publicly displayed**, and that single constraint is the whole of what keeps a Part 5 highly
effective age assurance duty out of this product.

> **Rewritten 14 August 2026 on the law that actually governs it**, by
> [CAN-74 Rewrite ADR-0012 on Part 5 grounds](https://linear.app/jacobrees-canoncore/issue/CAN-74).
> The conclusion survived the audit; almost none of the first version's reasoning did — see
> [`docs/research/tracker-and-repository-audit.md`](../research/tracker-and-repository-audit.md) →
> *CAN-13 Artwork*. That version routed the artwork question through `s.12(5)` and dated the duty to
> 25 July 2025. Both errors ran the same way: they made the terms of service look load-bearing over
> something the terms cannot reach.

## The poster is provider content, so the Part that governs it is Part 5

A poster this product would display is fetched from TMDB by our importer and put on the page by our
renderer. Nobody uploads it. That is **provider pornographic content** under `s.79(2)`: pornographic
content "published or displayed on the service by the provider of the service", expressly including
content published or displayed "by means of … software or an automated tool or algorithm applied by the
provider" ([s.79](https://www.legislation.gov.uk/ukpga/2023/50/section/79)).

**We are the provider, on the limb that reaches a user-to-user service.** Ofcom's guidance quotes
`s.226(8)` — control over which content is published or displayed — but that subsection is written for
"an internet service, other than a user-to-user service or a search service", and the same guidance's
footnote 12 says so: for a user-to-user service the provider is "the entity or individual with control
over who can use the site (section 226(2) and (3))". CanonCore is a user-to-user service, so that is the
definition, and it is plainly met. The Part 5 question is therefore not who the provider is but whether
the provider published or displayed the content, and on that Ofcom is "likely to consider a
service provider to have exercised control over the pornographic content appearing on its service where
it exercises **editorial control over the nature, selection or presentation** of the content"
([*Guidance on highly effective age assurance and other Part 5 duties*](https://www.ofcom.org.uk/siteassets/resources/documents/consultations/category-1-10-weeks/statement-age-assurance-and-childrens-access/guidance-on-highly-effective-age-assurance-and-other-part-5-duties.pdf?v=388810),
16 January 2025, ¶3.15). Choosing which image belongs to a record, and where it appears, is that.

**Being a user-to-user service does not route this into Part 3 instead.** Ofcom says both apply at once:
"Provider pornographic content may be present on different types of online service, including those which
are predominantly U2U services. Such services will be subject to the Part 5 duties in relation to the
pornography that the provider itself (or a person acting on behalf of the provider) publishes or displays
on the service" (¶3.13).

`s.80(2)` then sets exactly three conditions, and there is no fourth: regulated provider pornographic
content is published or displayed on the service, the service is not exempt, and the service has links
with the United Kingdom. The UK link is settled by a fact already established rather than by a new one:
`s.80(4)(b)` is Part 5's own target-market limb, worded identically to the `s.4(5)(b)` limb that puts
this service inside Part 3, and
[`docs/research/online-safety-act-obligations.md`](../research/online-safety-act-obligations.md) →
*1. Scope* records that limb as satisfied. There is no children's-access threshold and no size gate to
fall below.

The duty that follows is `s.81(2)`: ensure "by the use of age verification or age estimation (or both),
that children are not normally able to encounter" the content, by means "highly effective at correctly
determining whether or not a particular user is a child" (`s.81(3)`), with a written record of the method
and of the privacy reasoning behind it (`s.81(4)`) and a public summary of that record (`s.81(5)`)
([s.81](https://www.legislation.gov.uk/ukpga/2023/50/section/81)).

**Part 5 contains no terms-of-service exception.** `s.12(5)` disapplies "that requirement", meaning the
`s.12(4)` requirement to use age verification or age estimation, and nothing else — the `s.12(3)(a)` duty
to prevent children encountering primary priority content survives it. It is also a Part 3 provision
about content users post, and `s.79(7)` puts user-generated content outside Part 5 altogether. The
prohibition in the terms is real and load-bearing where it applies. It cannot reach an image the service
itself chooses to display.

**The counter is `s.236(7)`, and it separates the two ways artwork can arrive rather than defeating the
route.** It says content that is user-generated "does not cease to be such content in relation to the
service when published or displayed on the service by means of … software or an automated tool or
algorithm applied by the provider" — the mirror image of `s.79(2)`, and the reason rendering code cannot
turn a user's content into ours. It bites only on content that was user-generated to begin with, and `s.55(3)`–`(4)` is where that is
settled: content "generated directly on the service by a user of the service, or uploaded to or shared
on the service by a user of the service", with an automated tool counted as a user only where it "is not
controlled by or on behalf of the provider of the service" (`s.55(4)(b)`)
([s.55](https://www.legislation.gov.uk/ukpga/2023/50/section/55),
[s.236](https://www.legislation.gov.uk/ukpga/2023/50/section/236)). Our importer is ours, so nothing it
fetches is user-generated content, and `s.236(7)` never engages. So the two artwork paths
[CAN-13 Artwork: uploads, rights and takedown](https://linear.app/jacobrees-canoncore/issue/CAN-13)
covers land in different Parts: an image a user uploads stays user-generated content under `s.236(7)`,
in Part 3, where the prohibition in the terms and `s.12(5)` remove the `s.12(4)` age assurance
requirement and leave the `s.12(3)(a)` duty standing; an image we import is provider content under
`s.79(2)`, in Part 5, where they remove nothing.

**The duty has bound since 17 January 2025**, not 25 July 2025. `s.81` was commenced on that date by
regulation 2(1)(a) of
[S.I. 2024/1333](https://www.legislation.gov.uk/uksi/2024/1333/made), the Online Safety Act 2023
(Commencement No. 4) Regulations 2024. 25 July 2025 is the Part 3 children's safety date and belongs to
a different duty; the first version of this ADR cited it for this one.

## Whether a poster is pornographic content at all is unresolved, and the answer does not change the rule

`s.236(1)` defines pornographic content as content "of such a nature that it is reasonable to assume that
it was produced solely or principally for the purpose of sexual arousal"
([s.236](https://www.legislation.gov.uk/ukpga/2023/50/section/236)). A poster is produced principally to
market a film. Read strictly, that is a different purpose and the poster is not pornographic content at
all.

**Nothing available settles it.** Ofcom's Part 5 guidance, 50 pages, contains no occurrence of "poster",
"promotional", "marketing", "thumbnail", "trailer" or "artwork" (checked against the published PDF on
14 August 2026). What it does say points both ways without deciding: the definition "encompasses content
in a range of forms, including still and moving images" (¶3.10), and reaches past the BBFC's R18 category
to "other content of a strong sexual nature that seeks to sexually arouse or stimulate" (¶3.7) — under
which a poster designed to arouse is caught and a headshot with a title is not.

**So this ADR states the question rather than assuming an answer**, because the rule is the safe course
under either answer and the two answers cost wildly different amounts:

- If a poster is not pornographic content, the rule costs a thumbnail that nobody comes here for.
- If it is, the rule is the only thing standing between this service and `s.81` — highly effective age
  assurance with a vendor and a bill, a written record, and a public statement.

Resolving it would take Ofcom addressing promotional imagery, or an enforcement case that does. Until
then the asymmetry decides it, and the decision does not depend on the question being answered.

## "Cataloguing is not carrying" rests on the text-only carve-outs

The first version argued this from the `s.236(1)` definition alone, which is an inference. The statute
says it directly, twice, once in each Part:

- **`s.79(4)`** takes content out of regulated provider pornographic content where it "consists only of
  text, or … only of text accompanied by (i) a GIF which is not itself pornographic content, (ii) an
  emoji or other symbol, or (iii) a combination" of those.
- **`s.61(6)`** does the same on the Part 3 side: `s.61(2)` makes pornographic content primary priority
  content "other than content within subsection (6)", and subsection (6) is content that "consists only
  of text", or only of text accompanied by text-only identifying content, "other identifying content
  which is not itself pornographic content", "a GIF which is not itself pornographic content", or "an
  emoji or other symbol"
  ([s.61](https://www.legislation.gov.uk/ukpga/2023/50/section/61)).

A record here is a title, a year, a runtime and a `part of` edge. **Neither carve-out admits an arbitrary
image.** Beside the text they allow a GIF, or other identifying content, expressly qualified as one
"which is not itself pornographic content", and otherwise only an emoji or symbol. A poster is none of
those, so attaching one to a record is precisely what forfeits the carve-out. They do not merely permit
the artwork rule — they identify it.

## Blurring is not a remedy, and neither is hotlinking

`s.79(6)(a)(i)` counts as published or displayed any pornographic content "only visible or audible to
users as a result of interacting with content that is blurred, distorted or obscured (for example, by
clicking on such content), but only where the pornographic content is present on the service".
Click-to-reveal, a spoiler blur and an interstitial are each named rather than merely implied.

Serving the file from TMDB's image CDN instead of our own storage is not an escape either:
`s.79(6)(a)(ii)` reaches "pornographic content that is embedded on the service". That also closes the gap
the two might be read to leave together — `s.79(6)(a)(i)` qualifies blurred content with "but only where
the pornographic content is present on the service", and an embedded image is published or displayed on
the service by (a)(ii) whoever stores the bytes.

Both are recorded because both are the obvious cheaper alternative to a flat rule, and each of them looks
like a compromise and is not one.

## What TMDB's `adult` flag actually is

The rule runs on one flag, so the flag's shape is part of the decision.

- It is carried on the **movie**, **TV series** and **person** objects
  ([movie](https://developer.themoviedb.org/reference/movie-details),
  [TV series](https://developer.themoviedb.org/reference/tv-series-details) and
  [person details](https://developer.themoviedb.org/reference/person-details)), and is **absent from
  season and episode details**, where it appears only on the nested person objects
  ([TV season details](https://developer.themoviedb.org/reference/tv-season-details)). An episode's adult
  status therefore has to be derived through `part of` from its series, which is what
  [CAN-26 Import a series from TMDB, with the overlay behind it](https://linear.app/jacobrees-canoncore/issue/CAN-26)
  carries it onto the Snapshot for.
- It is **absent from `discover/tv` results** ([discover TV](https://developer.themoviedb.org/reference/discover-tv)):
  `include_adult` filters such a query, but the flag is not on the rows it returns and cannot be read back.
- By [TMDB's contribution bible](https://www.themoviedb.org/bible/movie) it means **hardcore pornography
  specifically**: full-length movies "are set to `adult:true` if they have a minimum of two hardcore
  scenes in their original version", short films on one. **18+ erotic titles are deliberately outside
  it** — the bible names *Fifty Shades of Grey* and *Nymphomaniac* as films that "should not be flagged
  as adult movies", and names the same two again as films that should **not** be classified softcore
  either. `softcore` is in any case a contribution-side flag, "the correct flag to set for 18+ erotic
  movies and TV shows", which **the API does not expose at all**.

**So the flag under-covers, and this ADR says so rather than assuming otherwise.** A title can be plainly
adult-oriented, carry a poster designed to arouse, and still be `adult: false` — and for the titles the
bible puts in neither bucket, the API carries no signal at all. The rule is a
proportionate measure on the best signal the source publishes, not a guarantee. Two things bound the
residual: `display_permitted` is a per-image decision the public renderer refuses to override, so a
manual `false` is always available; and whether such a poster is pornographic content at all is the same
unresolved question as above, on which this rule is again the safe side.

## The alternatives

**Excluding adult works from the catalogue** is what Trakt does, filtering them out of its TMDB import.
Simpler, and with nothing to get wrong later. Rejected because it contradicts the unbounded catalogue this
product exists to be, and because the exposure it avoids is one flag on a mechanism
[CAN-13 Artwork: uploads, rights and takedown](https://linear.app/jacobrees-canoncore/issue/CAN-13)
already builds for licensing.

**A per-account toggle** is Letterboxd's answer: adult films behind a setting that is off by default. It
is worse than either option, because it is self-declaration. `s.81(3)` requires age assurance "highly
effective at correctly determining whether or not a particular user is a child", and a checkbox is not
that; nor would it satisfy `s.12(4)` on the Part 3 side. Part 5 offers no route a user setting could
satisfy at all.

**Playback changes nothing**, for reasons [ADR-0006](0006-no-playback-hand-off-to-media-servers.md) owns
rather than having them restated here. A hand-off tells a server the person already runs to play
something on their own device, so nothing is published or displayed on this service — which is the whole
of the Part 5 test. `CONTEXT.md` does the same job for Fork, which copies no Ownership, Location or
Progress.

## Consequences

- **The import does not filter adult works.** It carries TMDB's `adult` flag through onto the Snapshot,
  so the renderer has something to decide on (CAN-26 Import a series from TMDB, with the overlay behind
  it).
- **Artwork on adult-flagged records is `display_permitted = false`**, and the public renderer refuses to
  override it. CAN-13 Artwork: uploads, rights and takedown already builds that flag for licensing
  reasons; this gives it a second job, and its grill inherits the corrected constraint above — Part 5
  rather than `s.12(5)`, and a flag that under-covers.
- **What the terms of service buy, stated precisely**, because the first version overstated it: the
  prohibition plus `s.12(5)` keeps `s.12(4)` age assurance off the *user-generated* side. The artwork
  rule, and only the artwork rule, keeps `s.81` off the *provider* side. Weakening either one costs a
  different duty, and neither substitutes for the other.
- **The terms of service carry a carve-out** stating that recording a work in a catalogue is not posting
  that work's content. Without it, the prohibition on posting pornographic content reads as forbidding
  the catalogue this product is. The carve-out mirrors `s.61(6)` and weakens nothing, since it describes
  what the statute already excludes.
- **Making adult artwork publicly displayable brings `s.81` into scope** — highly effective age
  assurance, the `s.81(4)` written record and the `s.81(5)` public statement — and invalidates the
  children's risk assessment, which lists it as a change requiring reassessment before it ships.
- v1 is unaffected either way: CAN-26 Import a series from TMDB, with the overlay behind it imports no
  artwork at all, and CAN-13 Artwork: uploads, rights and takedown is out of scope for v1.
