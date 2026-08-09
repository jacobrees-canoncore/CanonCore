# Research

Investigation output from `/research` and from the grilling session of 8 August 2026. **This is
not domain documentation.** Vocabulary lives in `CONTEXT.md`; decisions live in `docs/adr/`. If a
file here contradicts an ADR, the ADR wins and the file is out of date.

Read the ADRs first. Come here only for the detail an ADR deliberately left out.

| File | Status | Read it when |
| --- | --- | --- |
| [external-metadata-sources.md](external-metadata-sources.md) | **Live reference** | Touching TMDB, TheTVDB, MusicBrainz, Open Library, Wikidata, tardis.wiki or Big Finish. Endpoints, field names, coverage, rate limits, and the licence terms for each — including which data may be stored and for how long |
| [chronology-reference-shape.md](chronology-reference-shape.md) | **Live reference** | Building or importing Orderings. First-hand reading of a real fan chronology: entry counts by medium, the six facet axes, entry types, branching, and the two kinds of unplaced |
| [audiobookshelf-provider-contract.md](audiobookshelf-provider-contract.md) | **Live reference** | Designing or implementing the provider contract. The full prior-art contract, field by field, plus where its schema fails this domain |
| [versions-and-orderings-prior-art.md](versions-and-orderings-prior-art.md) | **Live reference** | Implementing orderings or versions. TMDB Episode Groups and TheTVDB season types are the two public schemas worth borrowing vocabulary from |
| [tardis-wiki-extraction.md](tardis-wiki-extraction.md) | **Belongs elsewhere** | Building the provider that reads that wiki. **Move this to the provider repository when it exists** — it is not this product's concern |
| [platform-reach.md](platform-reach.md) | Trimmed | Building the mobile or TV app. Kept: react-native-tvos versioning, focus management, the monorepo TV tax, and the Apple bill. Decision is in [ADR-0005](../adr/0005-stack.md) |
| [work-expression-models.md](work-expression-models.md) | Trimmed | Comparing our model against the standards, or hitting one of the three cases no standard handles. Decisions are in [ADR-0001](../adr/0001-two-levels-story-and-version.md) and [ADR-0002](../adr/0002-orderings-are-separate-from-containment.md) |
| [edits-refresh-and-progress.md](edits-refresh-and-progress.md) | Trimmed | Implementing Position. Kept the Readium `Locator` reference. The merge survey is spent — its decision is [ADR-0004](../adr/0004-layered-overlay-for-sources-and-edits.md) |

## What was cut, and why

Three files were surveys run to reach a decision. Once the decision became an ADR, the survey was
evidence rather than reference, so each was trimmed to the part still worth consulting: 4,551 lines
down to 504. The ADRs quote the load-bearing evidence directly, so nothing that decided anything
was lost.

Nothing here was written by reading any earlier attempt at this product. Every agent was given that
constraint explicitly and all reported no such source appeared.
