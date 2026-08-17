# CanonCore

A workspace for a media collection where one Story legitimately belongs in more than one place
at once. The natural containment of franchise, series, season and episode is real but not
sufficient, because an episode also sits in an in-universe chronology that disagrees with the
broadcast one, and it must appear in both without being duplicated.

Examples throughout are drawn from Doctor Who's 2005 series onward, because that is the seed
collection. Nothing in the language is specific to it.

## Contents

- [Using these documents](#using-these-documents)
- [Language](#language)
  - [The catalogue](#the-catalogue)
  - [Recurring things](#recurring-things)
  - [Orderings](#orderings)
  - [Sources and edits](#sources-and-edits)
  - [Ownership and sharing](#ownership-and-sharing)

## Using these documents

**Read this file and any relevant [`docs/adr/`](docs/adr/) before working in an area.** Both are
populated. The layout is single-context: one `CONTEXT.md` and one `docs/adr/` at the repo root, and
it stays that way until at least two packages have genuinely distinct vocabulary — the same word
meaning different things in different packages is the signal, not merely having more than one
package.

**Use the glossary's vocabulary whenever your output names a domain concept** — an issue title, a
refactor proposal, a hypothesis, a test name. Don't drift to the synonyms each `_Avoid_` list names.
A concept that isn't here yet is a signal: either you're inventing language the project doesn't use
(reconsider), or there's a real gap (note it for `/domain-modeling`).

**If your output contradicts an ADR, surface it** rather than silently overriding:

> _Contradicts ADR-0014 (the app is a shell) — but worth reopening because…_

**[`docs/research/`](docs/research/) is not domain documentation.** It holds investigation output;
its contents are findings, not decisions. Decisions belong in `docs/adr/`.

## Language

Each `_Avoid_` list names words not to use **for that concept**. The same word used for a
different concept is fine: a Catalogue is never "a collection", but this is still a media
collection.

**A proper name is exempt.** An Ordering called "Broadcast order" is written as it is called — here,
in the product, and in a ticket title — even though `order` is on the Ordering list. The lists ban
the common noun for the concept, never the title of one particular thing. So "in broadcast order" is
correct and "sorted into the right order" is not.

### The catalogue

**Story**:
The thing that happened, independent of how anyone watches, reads or listens to it. A Story may be
part of other Stories, and may be part of more than one.
_e.g._ Blink. Series 1. The Day of the Doctor.
_Avoid_: Work, title, item, entry, media, content

**Version**:
One specific way a Story can be watched, read or listened to, whole or in part. Versions of one
Story are not interchangeable: they differ in length and content, and some cover only part of it.
_e.g._ The Day of the Doctor as broadcast, and the 3D cinema release of it, are two Versions of
one Story.
_Avoid_: Edition, cut, release, copy, manifestation, format, file

**Version reason**:
Why a Version differs from the others of its Story: extended, shortened, omnibus, censored,
restored, colourised, reconstruction, abridged, translated, re-narrated. A Version may have
several, and runtime is a consequence rather than a reason.
_Avoid_: Type, variant, edit type

**Medium**:
The form a Version takes. It belongs to the Version rather than the Story, because a change of
form alone is what makes a new Version.
_e.g._ Television, prose, audio, comic, webcast, game, stage.
_Avoid_: Format, type, kind, category

**Nature**:
What a Version is besides its Medium, where that is a property of the thing itself rather than a
relationship to another thing. A Version may be several at once.
_e.g._ A Doctor Who Magazine strip is Medium `comic` and Nature `magazine strip`. Charity
release and unlicensed are others.
_Avoid_: Kind, subtype, flags, category

**Part of**:
Unordered containment between Stories, many to many. It carries no position, because inventing one
for a set that has none would be a lie.
_e.g._ Rose is part of Series 1; Series 1 is part of Doctor Who.
_Avoid_: Parent, child, tree, hierarchy, folder, nesting

**Adapted from**:
An edge between two Stories where one is derived from the other by new authored text rather than
by a change of form.
_e.g._ The 2018 Target novelisation of Rose, written by Russell T Davies, is a separate Story
adapted from the 2005 television Story. Its audiobook is a Version of the novelisation.
_Avoid_: Based on, remake, port, tie-in

**Canonical version**:
An optional pointer from a Story to the Version whose details best represent it, so a Story can
state a runtime and a year without adjudicating which of its Versions is the real one. May be
left unset.
_Avoid_: Default, primary, main, preferred

### Recurring things

**Entity**:
Something that recurs across many Stories and outlives any of them, and that is worth browsing on
its own. All of them behave the same way, so they are one kind of thing with a type rather than
six kinds.
_e.g._ The Ninth Doctor and Rose Tyler (characters), Billie Piper (person), UNIT (organisation),
Gallifrey (place), the Daleks (species), the sonic screwdriver (object).
_Avoid_: Tag, subject, topic, keyword, character, credit

**Appearance**:
A record that an Entity takes part in a Story, and in what way. Playing a part involves three
things rather than two, so an Appearance may name a second Entity.
_e.g._ Christopher Eccleston plays the Ninth Doctor in Rose names both Entities. Russell T Davies
wrote Rose names one.
_Avoid_: Credit, link, mention, tag, cast, role

### Orderings

**Ordering**:
A named, authored sequence over Stories or Versions. It is a piece of work someone made and can
be disagreed with, never a property of the things it orders.
_e.g._ Broadcast order. An in-universe chronology. One character's own life, told as they lived it.
_Avoid_: List, order, sort, sequence, timeline, collection, playlist

**Placement**:
One Story's or one Version's place in one Ordering, carrying its position, its entry type and its
argument. Which of the two it points at is how one Ordering lists a serial in a single Placement
while another lists its episodes separately. A Placement may exist with neither behind it, because a
chronology carries bridges that argue for what comes next without being a Story or a Version
themselves, and one Story may have several Placements in the same Ordering.
_e.g._ Blink follows The Family of Blood in broadcast order and Evolution of the Daleks in
production order. One Story, two Placements, no duplication.
_Avoid_: Item, member, node, link, row

**Argument**:
The stated reason a Placement sits where it does, in terms of evidence from the stories
themselves. A position without one cannot be agreed or disagreed with.
_Avoid_: Note, comment, description, justification, rationale

**Phase**:
A named group of Placements within one Ordering. Phases are the Ordering's own groupings and do
not correspond to seasons or to any broadcast structure.
_e.g._ Meeting Martha. The Library ordeal. Time Lord Victorious.
_Avoid_: Section, arc, group, chapter, act, part

**Entry type**:
What kind of appearance a Placement records. An open vocabulary, not a fixed set.
_e.g._ A full placement, or a reference, flashback, framing device, segment, prologue, epilogue
or cameo. A flashback to the Time War is placed where the flashback occurs, not where the war did.
_Avoid_: Kind, category, class, appearance type

**Rank**:
How strongly a Placement is held: preferred, ordinary, or discredited. Several preferred
Placements for one Story in one Ordering means the disagreement is real and unresolved.
_e.g._ Two irreconcilable positions for the same Story, both preferred, both argued, neither
chosen.
_Avoid_: Confidence, score, status, priority, certainty

**Unplaced**:
A Placement that belongs to an Ordering but has no position yet, because the evidence does not
settle one. Unplaced things stay visible rather than vanishing.
_Avoid_: Orphan, uncategorised, backlog, inbox, unsorted

**Validity**:
Whether the thing a Placement records counts within that Ordering. Carried as a label and
filtered on, never decided by the product.
_Avoid_: Canon, canonical, canonicity, official, legitimate

### Sources and edits

**Source**:
Where a record's values came from when CanonCore did not author them: an external database, or
another person whose work has been forked, who is a Source like any other. Each one carries its own
retention policy, so how long a Snapshot may be kept is a fact about the Source rather than about
the product — though what a *forked* Snapshot's retention is remains an open question ADR-0014
marks unresolved, owned by CAN-9 Fork and divergence (*caveat added 16 August 2026*). That policy
is `source.retention`, a duration or an explicit indefinite, held once per Source and shared by
everyone rather than once per person
([ADR-0014](docs/adr/0014-shell-providers-and-per-source-retention.md) → *Decision 6*, settled
16 August 2026).
_e.g._ TMDB, the Grand Comics Database, tardis.wiki.
_Avoid_: API, integration, service, backend, upstream, provider

**Provider**:
A service that speaks CanonCore's contract and stands between the product and one Source. Every
Source is reached through one, and a Provider never lives in this repository.
_Avoid_: Plugin, extension, connector, agent, scraper, adapter, source

**Listed Provider**:
A Provider this project writes and runs, named in the product's own list rather than pasted in by a
person. Anything off that list is a stranger's service however familiar the Source behind it looks.
_e.g._ `provider-tmdb`, which is authenticated; `provider-tardis-wiki`, keyless and licence-only
since 16 August 2026; the other keyless Providers, which anyone may self-host.
_Avoid_: Default, official, first-party, built-in, bundled, core, trusted

**Snapshot**:
What one Source last said about one Story or Version, stored verbatim, never edited, and kept only
as long as that Source's retention allows. Every one records `snapshot.fetched_at`, the moment the
**Source** was read — never the moment the row was written, since those differ as soon as a
Provider serves anything it already held, and it is the first that a retention term limits.
Snapshots from different Sources disagree, and both are kept.
_Avoid_: Cache, mirror, copy, sync, archive

**Override**:
A field a person changed by hand, stored apart from every Snapshot so that neither can destroy
the other. Reverting an Override means discarding it, not restoring from anywhere.
_Avoid_: Edit, lock, customisation, user data, patch

**Liveness**:
What a Source is currently saying about a record it used to have: present, missing, or gone. A
Source ceasing to carry something is never by itself a reason to delete anything local; only that
Source's own retention is.
_Avoid_: Status, health, deleted, stale

**Tombstone**:
What is left where a Story used to be once every Source's content has been dropped from it and the
owner overrode nothing: the identity, what kind of thing it was, and when it went. It carries no
value any Source supplied, which is the whole of why it may remain. **It replaces the Story's row
rather than marking it**, in a table of its own
([ADR-0014](docs/adr/0014-shell-providers-and-per-source-retention.md) → *Decision 8*, settled
17 August 2026).
_Avoid_: Soft delete, archived, hidden, placeholder, stub

**Artwork**:
An image of a known shape doing a known job, and for most of this collection none exists
anywhere. Every image records where it came from and whether it may be shown.
_e.g._ A poster, a wide backdrop, a title logo. Three different things, not one field.
_Avoid_: Image, cover, thumbnail, art, media

### Ownership and sharing

**Catalogue**:
One person's own Stories, Versions and Orderings. There is no shared catalogue: two people
recording the same thing have two separate sets of rows, and neither can edit the other's.
_Avoid_: Library, collection, database

**Anchor**:
A shared identity carrying no metadata at all. Separate people's Stories attach to the same
Anchor when they are about the same thing, and Placements point at Anchors rather than at
anyone's rows.
_e.g._ Your record of Blink and mine are different rows on the same Anchor, so an Ordering
naming it resolves against whichever of us is reading.
_Avoid_: Canonical record, master, shared item, concept, peg

**Merge**:
One person's assertion that two Anchors are the same thing. It holds only for the person who made
it and is undone by discarding it.
_Avoid_: Deduplicate, link, alias, combine, resolve

**Fork**:
Taking a copy of someone else's public records into your own Catalogue. A Fork copies claims
about the work and never claims about a person.
_e.g._ Titles, runtimes, Placements and Arguments are copied. Ownership, Location, Progress and
private notes are not.
_Avoid_: Copy, clone, import, duplicate, remix

**Lineage**:
The people a forked record descends from. A list rather than a single pointer, because a record
can be forked from more than one person.
_Avoid_: Parent, origin, ancestry

**Divergence**:
The state of a forked record whose Source has changed since it was taken. Surfaced to its owner
and never applied automatically.
_Avoid_: Conflict, drift, out of date, stale

**Visibility**:
Whether a record can be seen by people other than its owner. Set per record, not per Catalogue.
_Avoid_: Sharing, permissions, published, privacy

**Operation**:
One thing a person did, however many records it touched. Undo works on Operations, never on rows,
and what the product does unbidden — a retention sweep, a purge — is never one.
_e.g._ Importing a series, forking a Catalogue, merging two Anchors.
_Avoid_: Action, transaction, change, batch, job

**Ownership**:
A record that one person holds one Version, and where their copy is. No Source can supply it: an
encyclopedia knows what exists, not what is on your shelf.
_Avoid_: Have, collection, library, owned

**Location**:
Where a held copy actually is, as a short kind and free text for the detail. It answers which of
several Versions can be reached tonight.
_e.g._ On the Series 1 Blu-ray. In a folder on Drive. Kinds are physical, local file, cloud,
streaming, other.
_Avoid_: Path, URL, storage, availability

**Progress**:
How far one person has got through one Version: a fraction of the way through, and a label for it
in the units of that medium. Both may be absent, because some media have no position to be had,
and the label is whatever was recorded at the time rather than anything recalculated.
_e.g._ Fourteen minutes into an episode. Page 143 of the Rose novelisation.
_Avoid_: Status, history, bookmark, timestamp, page, offset, locator

**Watched**:
That a person has watched, read or listened to a Story in full, which counts everywhere that Story
appears. Distinct from Progress, which is about one Version.
_Avoid_: Seen, completed, done, consumed
