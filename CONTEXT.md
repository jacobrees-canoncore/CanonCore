# CanonCore

A workspace for a media collection where one item legitimately belongs in more than one place
at once. The natural hierarchy of franchise, series, season and episode is real but not
sufficient, because an episode also sits in an in-universe chronology that disagrees with the
broadcast one, and it must appear in both without being duplicated.

## Language

### The catalogue

**Story**:
The thing that happened, independent of how anyone consumes it. A Story may be part of other
Stories, and may be part of more than one.
_Avoid_: Work, title, item, entry, media, content

**Version**:
One specific way a Story can be watched, read or listened to, whole or in part. Versions of one
Story are not interchangeable: they differ in length and content, and some cover only part of
the Story.
_Avoid_: Edition, cut, release, copy, manifestation, format, file

**Version reason**:
Why a Version differs from its Story's others: extended, shortened, omnibus, censored, restored,
colourised, reconstruction, abridged, translated, re-narrated. A Version may have several. Runtime
is not a reason, it is a consequence.
_Avoid_: Type, variant, edit type

**Medium**:
The form a Version takes: television, prose, audio, comic, webcast, game, stage. It belongs to
the Version rather than to the Story, because a change of form alone is what makes a new Version
in the first place, and a narrated soundtrack of a television serial is genuinely audio. A Story
carries a nominal Medium, taken from its canonical Version, for the sake of being listed.
_Avoid_: Format, type, kind, category

**Nature**:
What a Version is besides its Medium, where that is genuinely a property of the thing itself: a
charity release, unlicensed, a magazine strip. An open list, and a Version may be several at
once. Deliberately small, because most of what looks like a kind turns out to be a Relationship:
a trailer is not a sort of thing, it is a thing that promotes another thing.
_Avoid_: Kind, subtype, flags, category, format

**Part of**:
Unordered containment between Stories, many to many. A franchise contains its series; a serial
contains its episodes. Carries no position, because imposing an order on a set that has none
would be a lie.
_Avoid_: Parent, child, tree, hierarchy, folder, nesting

**Adapted from**:
An edge between two Stories where one is derived from the other by new authored text rather than
by a change of form. A novelisation of a serial is a separate Story adapted from it. A narrated
soundtrack of the same serial is a Version of it, not an adaptation.
_Avoid_: Based on, remake, port, tie-in

**Canonical version**:
An optional pointer from a Story to the Version whose details best represent it, so a Story can
state a runtime and a year without adjudicating which of its Versions is the real one. May be
left unset.
_Avoid_: Default, primary, main, preferred

### Recurring things

**Entity**:
Something that recurs across many Stories and outlives any of them, and that is worth browsing
on its own: a person, a character, a place, an organisation, a species, an object. All of them
behave the same way, so they are one kind of thing with a type rather than six kinds.
_Avoid_: Tag, subject, topic, keyword, character (as a general term), credit

**Appearance**:
A record that an Entity takes part in a Story, and in what way: appearing in it, writing it,
publishing it, or playing someone in it. Playing a part involves three things rather than two,
so an Appearance can name a second Entity: Tom Baker plays the Fourth Doctor in Genesis of the
Daleks is one Appearance naming both. Writing a story names one. Keeping the performer and the
character as separate Entities linked by the Appearance, rather than one of them being text
attached to the other, is the whole point.
_Avoid_: Credit, link, mention, tag, cast, role

### Orderings

**Ordering**:
A named, authored sequence over Stories or Versions. Broadcast order, in-universe chronology, a
story arc cutting across seasons, one character's own timeline. An Ordering is a piece of work
someone made and can be disagreed with, never a property of the things it orders.
_Avoid_: List, order, sort, sequence, timeline, collection, playlist

**Placement**:
One entry in one Ordering. Carries its position, its entry type, and the argument for why it sits
where it sits. A Placement may exist with no Story behind it, and one Story may have several
Placements in the same Ordering.
_Avoid_: Entry, item, member, node, link, row

**Argument**:
The stated reason a Placement sits where it does, in terms of evidence from the stories
themselves. A position without one cannot be agreed or disagreed with.
_Avoid_: Note, comment, description, justification, rationale

**Phase**:
A named group of Placements within one Ordering. Phases are the Ordering's own groupings and do
not correspond to seasons or to any broadcast structure.
_Avoid_: Section, arc, group, chapter, act, part

**Entry type**:
What kind of appearance a Placement records: a full placement, or a reference, flashback, framing
device, segment, prologue, epilogue, cameo. An open vocabulary, not a fixed set.
_Avoid_: Kind, category, class, appearance type

**Rank**:
How strongly a Placement is held: preferred, ordinary, or discredited. Several preferred
Placements for one Story in one Ordering means the disagreement is real and unresolved, which is
a thing worth saying rather than a thing to hide. A discredited Placement stays listed, because
the argument against it is itself worth keeping.
_Avoid_: Confidence, score, status, priority, certainty

Rank and Entry type are independent, and both are needed. Entry type says what kind of
appearance this is; Rank says how sure anyone is that it belongs here. A Story appearing twice
because it genuinely happens twice is not the same as a Story appearing twice because nobody
knows which position is right, and a reader must be able to tell those apart.

**Unplaced**:
A Placement that belongs to an Ordering but has no position yet, because the evidence does not
settle one. Unplaced things stay visible rather than vanishing.
_Avoid_: Orphan, uncategorised, backlog, inbox, unsorted

**Validity**:
Whether the thing a Placement records counts within that Ordering. Contested by nature, carried
as a label and filtered on, never decided by the product.
_Avoid_: Canon, canonical, canonicity, official, legitimate

### Sources and edits

**Source**:
Anything CanonCore reads records from and does not itself author: an external database (TMDB,
TheTVDB, MusicBrainz, Open Library, Wikidata), a Provider, or **another person whose work has
been forked**. A person is a Source like any other, and their changes arrive the same way an
API's do.
_Avoid_: API, integration, service, backend, upstream

**Provider**:
A service that speaks CanonCore's contract and is added by pasting in its URL. Providers are not
shipped with the product and are not reviewed by it. A Provider may front a Source, or may front
something no general database covers.
_Avoid_: Plugin, extension, connector, agent, scraper, adapter

**Snapshot**:
What one Source last said about one Story or Version, stored verbatim and never edited. Snapshots
from different Sources disagree, and both are kept.
_Avoid_: Cache, mirror, copy, sync

**Override**:
A field a person changed by hand, stored apart from every Snapshot so that neither can destroy
the other. Reverting an Override means discarding it, not restoring from anywhere.
_Avoid_: Edit, lock, customisation, user data, patch

**Artwork**:
An image of a known shape doing a known job: a poster, a wide backdrop, or a title logo. Three
different things, not one field, and for most of this collection none of them exists anywhere.
Every image records where it came from and whether it may be shown, and the public view refuses
anything that may not be.
_Avoid_: Image, cover, thumbnail, art, media

**Liveness**:
What a Source is currently saying about a record it used to have: present, missing, or gone. A
Source ceasing to carry something is an event on that Snapshot, never a reason to delete anything
local.
_Avoid_: Status, health, deleted, stale

### Ownership and sharing

**Catalogue**:
One person's own Stories, Versions and Orderings. There is no shared catalogue: two people
recording the same thing have two separate sets of rows, and neither can edit the other's.
_Avoid_: Library (reserved), collection, database, the catalogue

**Anchor**:
A shared identity that carries no metadata at all: no title, no year, no artwork, nothing anyone
would want to edit. Separate people's Stories attach to the same Anchor when they are about the
same thing, and Placements point at Anchors rather than at anyone's rows. Because an Anchor holds
nothing, there is nothing to moderate and nothing to be a default.
_Avoid_: Canonical record, master, shared item, concept, entity, peg

**Merge**:
One person's assertion that two Anchors are the same thing. Holds only for the person who made
it, changes nothing for anyone else, and is undone by discarding it. Suggested at the moment a
record is created, because that is the only point at which anyone has the context to judge.
_Avoid_: Deduplicate, link, alias, combine, resolve

**Fork**:
Taking a copy of someone else's public records into your own Catalogue. A Fork copies claims
about the work and never claims about a person: titles, runtimes, version reasons, part-of edges,
Placements and Arguments are copied; ownership, file locations, progress and private notes are
not.
_Avoid_: Copy, clone, import, duplicate, remix

**Lineage**:
The set of people a forked record descends from. A list rather than a single pointer, because a
record can be forked from more than one person and later merged.
_Avoid_: Parent, origin, source (reserved), ancestry

**Divergence**:
The state of a forked record whose Source has changed since it was taken. Surfaced to its owner,
never applied automatically, and resolved by them keeping theirs, taking the other, or recording
that they have seen it.
_Avoid_: Conflict, drift, out of date, stale

**Operation**:
One thing a person did, however many records it touched. Importing a series, forking a
Catalogue, merging two Anchors are each one Operation. Undo works on Operations, never on rows,
because that is the unit at which mistakes are actually made.
_Avoid_: Action, transaction, change, batch, job

**Visibility**:
Whether a record can be seen by people other than its owner. Set per record, not per Catalogue.
_Avoid_: Sharing, permissions, published, privacy

**Ownership**:
A record that one person holds one Version, and where their copy is. The clearest possible claim
about a person rather than about a work, which is why it is never forked and never public unless
its owner says so. No Source can supply it: an encyclopedia knows what exists, not what is on
your shelf.
_Avoid_: Have, collection, library, owned, in my collection

**Location**:
Where a held copy actually is, as a short kind (physical, local file, cloud, streaming, other)
and free text for the detail. It answers "which of the fifteen can I reach tonight". It is
deliberately not a path the product can open, browse or resolve, because that would make this a
file manager, and it is deliberately not a list of where a thing can be streamed by anyone,
because that would make it a streaming catalogue.
_Avoid_: Path, URL, source, storage, availability

**Progress**:
How far one person has got through one Version. Never shared, never forked, and never inferred
from anyone else's.
_Avoid_: Status, history, bookmark

**Position**:
Where in a Version someone had got to: a fraction of the way through, and a label for it in the
units of that medium. Both may be absent, because some media have no position to be had, and the
label is whatever was recorded at the time rather than anything recalculated, since the file is
not here to recalculate from.
_Avoid_: Timestamp, page, offset, locator, progress (reserved)

**Watched**:
That a person has consumed a Story, which counts everywhere that Story appears. Distinct from
Progress, which is about one Version.
_Avoid_: Seen, completed, done, consumed
