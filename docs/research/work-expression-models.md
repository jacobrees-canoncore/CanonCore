# Work and version models: what survived

**Trimmed 8 August 2026.** This was a 1,729-line survey of IFLA LRM, RDA, BIBFRAME, schema.org,
EIDR, EBUCore, Comic Vine and the Grand Comics Database, run to decide how many levels sit between
"the thing" and "what you own". That decision is settled in
[ADR-0001](../adr/0001-two-levels-story-and-version.md) and
[ADR-0002](../adr/0002-orderings-are-separate-from-containment.md), which quote the load-bearing
evidence. The survey itself is spent and has been cut.

What remains is the comparison still worth consulting, and the three cases no surveyed model
handles, which are design work rather than settled decisions.

---

## 6. What the five models agree and disagree about

### 6.1 Levels

| Model | Levels | Where "same story, different cut" lives | Where "your copy" lives |
| --- | --- | --- | --- |
| IFLA LRM | 4 — Work / Expression / Manifestation / Item | Expression | Item |
| RDA | 4, plus Nomen, Place, Timespan, Agent | Expression | Item |
| BIBFRAME | 3 — Work / Instance / Item, plus Hub (2021) | **an edge between two Works** (`bf:hasExpression`) | Item |
| schema.org | 1 — `CreativeWork` throughout | an edge between two `CreativeWork`s (`workExample`), undifferentiated | not modelled |
| EIDR | 3 in a tree — Abstraction / Edit / Manifestation, plus Collections | **Edit** (creative change only) | not modelled (Manifestation is the file, not your copy) |
| EBUCore | 2 — `EditorialObject` / `MediaResource`→`Essence` | not distinguished (no Expression layer) | Essence |
| GCD | 4 — Publisher / Series / Issue / Story-sequence | **an edge between two Stories** (`Reprint`, with the modified-becomes-new-origin rule) | not modelled |
| Comic Vine | 2 — Volume / Issue | not modelled | not modelled |

**The convergence worth noticing:** the three models built most recently for real graph data —
BIBFRAME, schema.org and GCD — all express "same content, different version" as **an edge between
two rows of the same type**, not as a second table at a lower level. EIDR keeps a level but makes
it a strict single-parent tree with inheritance, which is a table only in the sense that a
self-join is a table.

**And the one warning:** BIBFRAME collapsed a level, then had to add `bf:Hub` back in 2021 to
regain grouping. The level people regret dropping is the **top** one (the thing that collocates
versions), never the bottom one (the copy). Nobody has ever had to add Item back.

### 6.2 The three questions the standards actually disagree on

| Question | LRM / RDA | BIBFRAME | EIDR | GCD |
| --- | --- | --- | --- | --- |
| Is a **translation** the same work? | Yes — new Expression | Edge `bf:translationOf` between Works | **No, it is not even a new version** — a dub is a Manifestation, a technical change | A translated reprint "becomes a new original sequence" |
| Is an **adaptation to another medium** the same work? | **No** — new Work, `is a transformation of` | New Work + edge | Out of scope (EIDR is AV only) | Out of scope |
| Where does **ordering** live? | `precedes`, pairwise and intrinsic; **no user-defined orderings at all** | `bf:precededBy`, pairwise | **`AlternateNumber`, 0-32, each requiring `@domain`** | Derived at query time from issue dates; no arc position |

On ordering, only two surveyed sources solve the multi-ordering problem, and they solve it the
same way from opposite directions: **schema.org's `ListItem`** ("ListItem is used with ordered
lists … when the same item might be in different places in different lists") and **EIDR's
domain-attributed `AlternateNumber`**. Both refuse to store a position on the work. Both are
right, and LRM's omission here is disqualifying for this product's central feature.

### 6.3 The cases no surveyed model handles

Three, and they need to be designed rather than adopted:

1. **A reconstruction of a missing episode.** Not a cut of surviving footage, so EIDR's
   `Restored` ("more closely resembles the original release") is wrong; not an aggregate of
   existing works, so `Composite` is a stretch. LRM would call it a new Work (independent
   creative effort in assembling telesnaps and off-air audio) which loses the fact that you watch
   it *instead of* the episode. **Genuine gap.**
2. **One story split across two magazine issues.** GCD, the best comics source there is, admits
   this is unimplemented: "we intend to have links between stories where one sequence is clearly
   the basis for material in another sequence… **This has NOT yet been implemented**" (Ballot 303,
   2016-12-20). Its workaround is "Part 2 of 5" as free text inside the title.
3. **Newspaper and syndicated strips.** Explicitly out of scope for GCD ("it cannot be indexed at
   this stage (which is the case for newspaper strips)"), absent from Comic Vine, absent from
   EIDR. The coverage gap the brief identified is real and no source closes it.

---

### 7.4 What to do about the three gaps

- **Recon of a missing episode** — a Version with reason `recon`, and accept that no standard
  supports it. It must be a Version rather than a Story because you watch it *instead of* the
  episode, which is the whole test.
- **Story split across two magazine issues** — the reified ordering table already handles reading
  order. What it does not handle is "this Version covers only part of that Story". Add an optional
  `covers` qualifier on the Version→Story link, following EIDR's Composite `Element`, which
  carries `SourceStart`/`SourceDuration`/`DestStart`/`DestDuration`. Start with something far
  smaller — a nullable free-text range plus a `complete`/`partial` flag — and only reach for
  offsets if a real query needs them.
- **Newspaper and syndicated strips** — no source covers them. Data will be hand-entered. This
  argues for the schema being tolerant of sparse records rather than for any extra structure.

