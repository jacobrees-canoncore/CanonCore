---
status: accepted
---

# Orderings are separate from containment, and position lives on the membership

The product exists because one Story legitimately belongs in two places at once. Two distinct
mechanisms carry that, and conflating them was the first thing this design got wrong.

**Containment is `part of`**: recursive, many-to-many, and **unordered**. A franchise contains its
series; a serial contains its episodes. This is the "bag" — a grouping where order carries no
meaning and imposing one would be a lie.

**An Ordering is a first-class authored object** with a name, its own named Phases, and Placements
that carry position. Broadcast order, in-universe chronology, a story arc, one character's life
told out of order. Containment is not an ordering with the numbers hidden; they are different shapes.

## Position never sits on the Story

Every source that models multiple orderings puts the ordinal on the *pair*: TMDB on
`groups[].episodes[].order` inside a typed episode group, TheTVDB on a typed `SeasonBaseRecord`,
MusicBrainz on a `number` attribute of the series relationship, Wikidata on `P1545` qualifying a
`P179` statement. schema.org names the case in its own documentation: "ListItem is used with
ordered lists … when the same item might be in different places in different lists."

So: **no `episode_number` column on Story.** schema.org's `episodeNumber` is a bare integer that
names no series, which is why its TVSeries→Season→Episode hierarchy hard-codes one canonical
ordering and cannot express a second.

Three standards separate the two mechanisms independently — LRM (`has part` vs `precedes`),
schema.org (`hasPart` vs `ListItem`), and EIDR, which makes containment deliberately unordered and
warns against faking an ordering out of it because that "would not indicate their order, number of
uses, position, and duration".

## Consequences

- A Placement may point at a Story **or** a Version, which is how one Ordering lists a serial as a
  single entry while another lists its episodes separately.
- A Placement may exist with no Story at all, because chronologies contain narrative bridges that
  argue for what comes next without being a work.
- One Story may hold several Placements in the same Ordering, because a story can genuinely occur
  at more than one point (a framing device, a split serial).
- Completeness rolls up over containment, not over Orderings, and counts distinct Anchors rather
  than Placements — otherwise a Story that legitimately appears twice is counted twice.
- **Entry type and rank are orthogonal, and both are needed.** There are two different reasons one
  Story appears more than once in one Ordering, and they are structurally identical but mean
  opposite things. Either it genuinely happens more than once (a framing device, a split serial),
  in which case every placement is true and the reader should see them all; or nobody knows which
  position is right, in which case at most one is true. Entry type distinguishes the first, rank
  the second. Conflating them makes a chronology unreadable, because a reader cannot tell whether
  an episode appearing twice means "watch it twice" or "we are not sure". A discredited flashback
  is perfectly coherent.
