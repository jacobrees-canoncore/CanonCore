# The shape of a fan chronology, read from the reference

First-hand reading of the tardis.wiki timeline pages named as the reference for this
product. Read 8 August 2026 with the Playwright MCP browser (plain fetching returns 403;
the Cloudflare challenge clears in a few seconds). Source: <https://tardis.wiki>, never the
Fandom mirror.

Pages read in full:

- <https://tardis.wiki/wiki/Theory:Timey-wimey_detector> — the index
- <https://tardis.wiki/wiki/Theory:Timeline_-_Eighth_Doctor> — cited by the index as the
  model page for all others
- <https://tardis.wiki/wiki/Theory:Timeline_-_Tenth_Doctor>

Every observation below was taken from the rendered pages, not from a description of them.

## Scale

| Page | List entries | Page text |
| --- | ---: | ---: |
| Eighth Doctor | 551 | ~147,000 chars |
| Tenth Doctor | 614 | ~114,000 chars |

These are per-incarnation pages. The index lists timelines for incarnations 1–16 plus War,
plus non-Doctor entities, plus separate pages for Age, Events, Early life and Sonic
screwdriver. One "ordering" in the product sense is spread across many such pages, chained
by `Previous page: <n>th Doctor` links.

## Medium is not the spine

Prefix counts, taken from the rendered text:

| Prefix | Eighth | Tenth |
| --- | ---: | ---: |
| AUDIO | 278 | 73 |
| PROSE | 203 | 148 |
| COMIC | 58 | 297 |
| NC | 50 | 3 |
| GAME | 7 | 21 |
| NOTVALID | 6 | 50 |
| TV | 4 | 81 |
| WC | 3 | 3 |
| NOTCOVERED | — | 10 |

Television is 0.7% of the Eighth Doctor's chronology and 13% of the Tenth's. The dominant
medium is different for each (audio for the Eighth, comics for the Tenth). A model that
treats television as the primary case and other media as an annex is wrong on the first
page.

## Six orthogonal facet axes

The Tenth Doctor page carries a filter UI, exposing the axes the maintainers actually use.
Verbatim from the page:

- **Prefixes** — TV, PROSE, AUDIO, COMIC, WC, HOMEVID, GAME, GRAPHIC, POEM, STAGE,
  NOTVALID, NOTCOVERED
- **Validity** — Valid, Invalid, Not Covered, Unreleased
- **Source Type** — Parodies, Trailers, Poems, Novelisations
- **Series** — 23 named ranges: Doctor Who, Doctor Who TV series, Virgin New Adventures,
  Virgin Missing Adventures, BBC Eighth Doctor Adventures, BBC Past Doctor Adventures, Big
  Finish's Main Range, Big Finish's Eighth Doctor Adventures, Faction Paradox, Annuals, DWM
  Comics, DWA Comics, Titan backup strips, Iris Wildthyme, The Brenda and Effie Mysteries,
  Lethbridge-Stewart, Torchwood, Sarah Jane Adventures, Class, Time Lord Victorious, Doom's
  Day, Dr. Men, Doctor Who: Lockdown!, P.R.O.B.E.
- **Publisher** — 19: BBC, Big Finish, BBV, Virgin Books, IDW, Titan Comics, Polystyle,
  Marvel, Panini, Target Books, Mad Norwegian Press, Obverse Books, Metal Mutt Productions,
  Snowbooks, Candy Jar Books, Arcbeatle Press, Self-published, Other
- **Entry Type** — REFERENCE, FLASHBACK, FRAMING DEVICE, SEGMENT, PROLOGUE, EPILOGUE, NOTE,
  LETTER, DIARY ENTRY, POSTCARD, CONJECTURE, CAMEO

Note that the Prefix axis conflates medium (TV, PROSE) with validity (NOTVALID,
NOTCOVERED), while Validity is *also* its own axis. The taxonomy overlaps itself in the
reference. Any clean single-enum "kind" field contradicts the source material.

## An entry is not a link to a story

Three findings, each of which breaks a naive join-table-with-a-sort-key model.

**1. Entries exist with no story at all.** Narrative bridges carrying the argument for what
comes next. Observed annotation counts on the Eighth Doctor page: REFERENCE 24, FLASHBACK
14, NOTE 5, EPILOGUE 5, CONJECTURE 4, SEGMENTS 2, SEGMENT 2, FUTURE COUNTERPART 1, FRAMING
DEVICE 1, CONTEXT 1. Example, verbatim:

> (CONJECTURE) Presumably, at some point following The Last of Forever, the Eighth Doctor
> regains his regenerations and resolves to return for Fitz and Compassion.

**2. One story occupies several positions in the same ordering.** `(SEGMENTS)` splits
*Interference: Shock Tactic* across multiple points. `(FRAMING DEVICE)` places *The Castle
of Kurnos 5* a second time, at the point where it is recounted rather than where it
happened. The unit of an ordering is therefore a placement of *some part of* a story, not
the story.

**3. Placement happens below the work.** `PROSE: Vampire Science: Chapter 1` is placed as
its own entry. Not merely serial-versus-episode: chapter level.

## Every position carries its argument

Each entry is followed by prose justifying the placement, citing in-story evidence. Verbatim
examples:

> Sam's "Jones-Richter Scale of trouble" from Genocide is used. She is still a school girl,
> setting this before her four year separation from the Doctor which began in Longest Day.
> The Doctor has grey-blue eyes.

> Fitz still has a suntan from the events of Frontier Worlds and his dreams are now being
> affected by the TARDIS.

The evidence is the content. A position without it is not usable by a reader deciding
whether they agree.

## Constraints, not just positions

The Tenth Doctor page opens with "Limiting factors" that are interval constraints over the
whole ordering rather than facts about any one entry:

> Any story with Rose Tyler travelling must be after TV: The Christmas Invasion and before
> TV: Army of Ghosts. Any story with Martha Jones travelling must be after TV: Smith and
> Jones and before TV: Utopia.

The Eighth Doctor equivalent constrains on props:

> Any story with the Doctor's silver sonic screwdriver must take place either between Doctor
> Who and The Silver Turk, where it is destroyed.

So the chronology is partly *derived* from constraints rather than wholly hand-sequenced.

## Orderings branch

The Eighth Doctor page has a "Complications" section describing mutually exclusive
placements held simultaneously. On duplicate Gallifreys created during the War in Heaven:

> anything involving Romana III must therefore take place before The Ancestor Cell or the
> reversal of Romana II's regeneration in Enemy Lines. Alternatively, anything involving
> Gallifrey could take place either on a different duplicate Gallifrey or sometime after a
> hypothetical recreation of Romana III's Gallifrey following The Gallifrey Chronicles.

Three incompatible placements, all recorded, none chosen. The same section notes that the
BBC novels, DWM comics and Big Finish audios are largely non-interleavable continuities with
only two documented exceptions.

## Named phases are narrative arcs

The H3 groupings are not seasons and do not align with any broadcast structure. Eighth
Doctor: "Meeting Sam Jones", "Travels with Fitz & Compassion", "Exiled in the Divergent
Universe", "Losing Charley & C'rizz". Tenth Doctor: 50 of them, "The Library ordeal",
"Swearing off companions", "Time Lord Victorious", "Final reward".

## Unplaced items are two states, not one

The Tenth Doctor page ends with two distinct sections:

- **Currently unplaced** (5 entries) — and it still carries a named sub-phase of its own,
  "Dealing with temporal distortion". Grouped, but not sequenced.
- **Awaiting placement** (6 entries) — described verbatim as "These entries are placed here
  until a suitable position in the timeline can be determined based on the available
  evidence."

The distinction appears to be "we know roughly where this sits but cannot sequence it"
versus "not yet triaged at all".

## Non-canon is included and flagged, not excluded

`NOTVALID:` and `NOTCOVERED:` entries sit inline in the chronology with full placement
argument, marked. Verbatim:

> NOTVALID: Moments in Time — Set during Doctor Who, with the Doctor trying on new outfits
> in front of Grace.

> NOTCOVERED: Regenerations — During an alternative timeline created by corruption during
> the Time War.

The reference does not resolve the canon question. It records a validity label and lets the
reader filter. Note the Tenth Doctor page has 50 NOTVALID entries against 81 TV entries.

## What the reference does not have

No concept of ownership, no concept of what has been watched, no concept of which version
is held. Those exist only in the owner's head and must come from the product, never from a
source.
