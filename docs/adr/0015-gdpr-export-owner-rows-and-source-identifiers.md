---
status: accepted
---

# The export carries the owner's rows whole, and a Source's identifiers only

A person leaving with their catalogue takes every row they authored, in full. What a **Source**
supplied is reduced to the external identifier that names the record: the Source's own field values
do not travel. The export **names each value it withheld and why**, so what arrives is re-importable,
and visibly incomplete rather than quietly short.

> **Decided 16 August 2026** in the walkthrough recorded on
> [CAN-115 Land the 16 August verification sweep: the decisions, the corrections, and what they touch](https://linear.app/jacobrees-canoncore/issue/CAN-115),
> and derived here by
> [CAN-106 Decide what the GDPR export may contain under TMDB's published terms](https://linear.app/jacobrees-canoncore/issue/CAN-106).
> It replaces the position [ADR-0009](0009-external-source-tmdb.md) held until 15 August — the export
> carries Snapshots whole — which rested on TMDB correspondence now **disregarded entirely**
> (decision 5 of CAN-96 Record the architecture decisions of 15 August, and make the repository
> agree, recorded in [ADR-0014](0014-shell-providers-and-per-source-retention.md)).
>
> **The wording is reused; the justification is not.**
> [CAN-36 Obtain written confirmation that the GDPR export is not redistribution](https://linear.app/jacobrees-canoncore/issue/CAN-36)
> pre-wrote this narrowing as its own contingency, and that wording is taken verbatim rather than
> re-derived. What does **not** travel with it is the reason it gave — a redistribution prohibition
> that [does not exist in the terms](#why-the-answer-is-not-the-terms-forbid-it).

## Contents

- [The owner's own rows leave whole](#the-owners-own-rows-leave-whole)
- [A Source's values are withheld; its identifiers travel](#a-sources-values-are-withheld-its-identifiers-travel)
- [Why the answer is not "the terms forbid it"](#why-the-answer-is-not-the-terms-forbid-it)
- [Article 15(4) and Recital 63 are the withholding support, and Recital 63 is also its limit](#article-154-and-recital-63-are-the-withholding-support-and-recital-63-is-also-its-limit)
- [The export says what it withheld, and why](#the-export-says-what-it-withheld-and-why)
- [The question is per-Source, and today it is a rule rather than a column](#the-question-is-per-source-and-today-it-is-a-rule-rather-than-a-column)
- [The alternatives](#the-alternatives)
- [Consequences](#consequences)

## The owner's own rows leave whole

**Stories, Versions, Overrides, Orderings, Phases, Placements and Arguments leave in full**, exactly
as [CAN-30 GDPR export and erasure](https://linear.app/jacobrees-canoncore/issue/CAN-30) already
specifies — the Catalogue, not a summary of it.

Nothing in this decision narrows them, and the narrowing must not be allowed to creep into them.
An Argument is the person's own prose. An Override is their correction. A Placement is their
judgement about where something sits, and a Phase is a grouping they named. Under
[ADR-0003](0003-no-shared-catalogue.md) those rows are theirs rather than a shared record's, so
there is no other party whose terms could reach them. **Withholding a person's own data from them
under a licence that never governed it would be the opposite failure**, and a more serious one:
the narrowing below is a defensible reading of a silent licence, whereas trimming the owner's own
rows has nothing to argue at all.

## A Source's values are withheld; its identifiers travel

The line runs where the person's own act stops and the Source's content begins.

- **The external identifier travels.** That *this* person put *this* record in their catalogue is a
  fact about them, not content the Source wrote. It is also the whole of what keeps the export
  re-importable: whoever receives it resolves the identifier against their own Source and gets the
  values back **from that Source directly**, under their own relationship with it rather than
  through ours.
- **The Source's field values do not.** Title, runtime, overview, air date, and anything else the
  Source returned.
- **Snapshot rows are not serialised into the export.** They hold what the Source returned verbatim,
  which is far more than the identifier. The export is built from the composed read
  ([ADR-0004](0004-layered-overlay-for-sources-and-edits.md)), which is the one thing that survived
  every version of this decision.
- **`supersededValue` is withheld with the values, and it is the trap here.** ADR-0004 stores the
  composed value at the moment of override as the merge base, so it is by construction a verbatim
  copy of Source content sitting in the **override** table — a table the previous bullet's rule
  would otherwise wave through as the owner's own. It is the same trap
  [ADR-0014](0014-shell-providers-and-per-source-retention.md) → *It models `§1.C` and cannot
  represent `§1.D`* names for the retention sweep, arriving a second time by a different route.
  The Override's own value is the person's and travels; the value it superseded is the Source's and
  does not.

**An identifier is still TMDB Content, and this decision does not pretend otherwise.** `§1.A`
defines the term as "any content (including audio or visual content) or other information available
through, on, or from the TMDB APIs or TMDB" ([TMDB API Terms of
Use](https://www.themoviedb.org/api-terms-of-use), read 16 August 2026), and an id obtained from the
API is information obtained from the API. The claim is not that identifiers fall outside the licence.
It is that they are **the smallest copy that leaves the export useful** — which is what makes this a
narrowing rather than an escape, and why the attribution duty below still attaches to the file.

## Why the answer is not "the terms forbid it"

**No clause of TMDB's published terms uses *redistribute*, *distribute* or *provide access to third
parties*.** Verified against the [API Terms of Use](https://www.themoviedb.org/api-terms-of-use) on
16 August 2026, by the sweep recorded in
[`verification-sweep-16-august.md`](../research/verification-sweep-16-august.md) → *The serious
findings*. The nearest clauses are these two, and neither is about handing a copy to the person whose
catalogue it is:

- **`§1.C`** prohibits "Sell, lease, or sublicense the TMDB APIs, access to the TMDB APIs, or TMDB
  Content, or derive revenues from the use or provision of TMDB, the TMDB APIs, or TMDB Content,
  whether for direct commercial or monetary gain or otherwise, except as expressly permitted in a
  written agreement between You and TMDB". A GDPR export is none of those and earns nothing.
- **`§1.A`** licenses the APIs "on a worldwide (except as limited below), non-exclusive,
  non-transferable, non-sublicensable, basis". That makes the **licence** non-transferable, which is
  not the same as making a copy of the content unlawful to hand over.

**So the published position is silence, and silence decides nothing by itself.** It is not
permission — nothing in the terms licenses the recipient, and a copy handed on carries no
entitlement with it. It is equally not prohibition, and **ADR-0009 asserted one until 16 August**,
in a sentence corrected there rather than repeated here.

**This decision is therefore a policy adopted, not a conclusion derived.** The owner took the
conservative reading outright rather than resting a shipped product on a gap in a licence, and it is
recorded as policy deliberately (CAN-115 Land the 16 August verification sweep: the decisions, the
corrections, and what they touch). No solicitor was instructed and none of this is legal advice.

**The weakness runs both ways, and stating only one side would be dishonest.**
[`source-licence-risk-and-decoupling.md`](../research/source-licence-risk-and-decoupling.md) → *The
GDPR export, confirmed as already correct* records that a contractual restriction is not obviously a
"right or freedom of others" within Art 15(4), and *The database right does not exist here, and the
statutory chain is now pinned* in the same document establishes that TMDB, a US company, holds no UK
sui generis database right to invoke. **So the support for withholding is weaker than it looks, just
as the case for withholding is.**

**What actually decides it is the asymmetry of the two errors**, and CAN-36 Obtain written
confirmation that the GDPR export is not redistribution wrote the argument before the question
arose: narrowing an export that has already gone out is a breach already committed, whereas widening
one is a one-line change. **Nothing has shipped**, so the narrowing is still free and the wide
reading is the only one that could cost anything. Read the two unknowns against that and the answer
is not close.

## Article 15(4) and Recital 63 are the withholding support, and Recital 63 is also its limit

The duty is **UK GDPR Art 15(3)** — a copy of the personal data undergoing processing. What permits
trimming it is the next paragraph, quoted in full because it is one sentence:

> **Art 15(4)**: "The right to obtain a copy referred to in paragraph 3 shall not adversely affect
> the rights and freedoms of others."
> ([legislation.gov.uk](https://www.legislation.gov.uk/eur/2016/679/article/15))

**Recital 63 names intellectual property expressly**, which is why it is cited alongside:

> "That right should not adversely affect the rights or freedoms of others, including trade secrets
> or intellectual property and in particular the copyright protecting the software. **However, the
> result of those considerations should not be a refusal to provide all information to the data
> subject.**"
> ([legislation.gov.uk](https://www.legislation.gov.uk/eur/2016/679/introduction))

**That second sentence is why the narrowing stops at identifiers rather than at nothing**, and why
the export has to say what it withheld. A recital that forbids refusing *all* information is not
satisfied by an export that silently drops fields and lets the reader assume it is complete.

**Art 20 does not reach the values at all, by a test that has nothing to do with the licence.**
Art 20(1) is confined to personal data "which he or she has provided to a controller", and the ICO
reads *provided to* as extending to "personal data resulting from observation of an individual's
activities" but no further ([ICO, right to data
portability](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-data-portability/)).
A title the Source wrote is neither provided by the person nor observed from their activity. **The
identifier sits on the other side of that line**: which record they put in their catalogue is
observed from what they did here. Art 20(4) then mirrors Art 15(4) word for word.

**Two unrelated tests landing on the same boundary is what makes this line the natural one** rather
than a compromise struck between two worse options. It is not evidence that the licence question is
settled — it is not — but a narrowing that a portability analysis reaches independently is a
narrowing that will read as principled to whoever inherits it.

## The export says what it withheld, and why

**A withheld value appears in the export as a withholding, naming the field, the Source that
supplied it and the reason.** It is never a silent omission. Three things make this part of the
decision rather than a nicety:

1. **Recital 63 sets it.** The sentence above forbids letting those considerations end in a refusal
   to provide all information. An export that names its gaps is on the right side of that; one that
   hides them is closer to the thing the recital rules out.
2. **The mechanism already exists.** [ADR-0014](0014-shell-providers-and-per-source-retention.md) →
   *Decision 9 — per-field provenance on every displayed value* puts Source identity on every value
   at field granularity, which is exactly the granularity this notice needs. No new machinery.
3. **It makes a future widening observable.** When a Source's terms do permit its values to travel,
   the notice is the place the change shows — to the person receiving the export, not only in a
   document.

**The attribution duty attaches to the file regardless.** Because an identifier is TMDB Content,
TMDB `§3`'s notice and logo are a condition of the licence under `§1.B`, and the export carries them
as CAN-30 GDPR export and erasure already requires. Narrowing the contents does not narrow that.

## The question is per-Source, and today it is a rule rather than a column

**This is a property of the Source's declared usage restrictions, not a rule about TMDB.**
[ADR-0014](0014-shell-providers-and-per-source-retention.md) → *Decision 6 — retention is a property
of the Source* made the same move for how long a copy may be kept, and for the same reason: Sources
differ, and a project-wide answer is either too strict for the permissive ones or unlawful for the
strict ones. Export scope differs the same way — two of the keyless roster are CC0, which permits
the copy outright, and ADR-0014's Decision 9 records that the roster's licences range from CC0
through CC BY to two versions of CC BY-SA.

**And yet no `source.export_scope` column lands, because every Source answers the same way today.**
Retention got columns because a job reads them each night. Nothing would read an export-scope column
while its value is the same for every row, and a column with one possible value is the speculative
configuration `CLAUDE.md` rules out. What lands instead is **a question on the Source-adoption
reading**, one step past the retention question ADR-0009 → *Consequences* already requires:

> *May a record be kept, and for how long?* — retention.
> *May its values leave with the owner?* — export scope.

Both are answered by reading that Source's terms before it is adopted, and "we have always done it"
is not a reading. A Source whose licence permits the copy is widened by a decision recorded at
adoption, and the column is written **then**, against two Sources that genuinely disagree, rather
than now against one.

**What would reverse this.** The first Source whose published terms permit its values to be handed
to the account holder. That is a widening, which CAN-36 Obtain written confirmation that the GDPR
export is not redistribution's timing note makes a one-line change rather than a breach — so the
reversal is cheap by construction, which is the property the conservative reading was chosen for.

## The alternatives

**Export the Snapshots whole.** What ADR-0009 said until 15 August 2026, on a written approval that
decision 5 of CAN-96 Record the architecture decisions of 15 August, and make the repository agree
now disregards entirely. Rejected because the document permitting it is set aside and nothing in the
published terms replaces it — and because CAN-36 Obtain written confirmation that the GDPR export is
not redistribution had already declined to tick its own first criterion, recording the reply as
"attested, not checked".

**Withhold the Source-derived rows entirely, identifiers included.** Rejected on Recital 63's second
sentence, and rejected again on the product: an export that cannot be resolved back against a Source
is a summary, and CAN-30 GDPR export and erasure commits to the Catalogue rather than a summary.
This is the option the *narrowing is to identifiers, not to nothing* rule exists to foreclose.

**Ask TMDB.** CAN-36 Obtain written confirmation that the GDPR export is not redistribution did, and
its reply is disregarded. Decision 5 of CAN-96 Record the architecture decisions of 15 August, and
make the repository agree forecloses a fresh request: TMDB is used on its published terms only, no
approval is sought and none would be relied on. Asking again would rebuild the exact dependency the
15 August change removed, and would block a v1 ticket on somebody else's inbox.

**Ship the wide export now and narrow it if challenged.** Rejected on the asymmetry above. It
inverts the one part of this question that was never uncertain.

## Consequences

- **CAN-30 GDPR export and erasure builds to this**: the owner's rows whole, external identifiers
  only from any Source, a withheld-values notice, built from the composed read. Its export criterion
  and CAN-17 v1: the walking skeleton in production, then the founding case's **user story 51** are
  settled at this scope, and their forward pointers to CAN-106 Decide what the GDPR export may
  contain under TMDB's published terms resolve here.
- **[ADR-0009](0009-external-source-tmdb.md) → *What we accept by choosing it* keeps the TMDB
  instance and points here for the derivation.** The general rule does not live in the TMDB ADR,
  because the next Source's assessment will not look there.
- **No schema change, and CAN-102 Give Source a retention policy, and Snapshot a fetched-at is
  untouched.** The Source columns it lands stay as they are.
- **A second, smaller reason the conservative reading pays.** `§1.D` requires that on termination
  we "promptly delete or otherwise purge all TMDB Content, including any cached content", and
  ADR-0014 records that nothing yet detects termination — CAN-118 Purge every Snapshot of a Source
  whose licence terminates, and tombstone what it touched owns it. **An export already handed to a
  person is permanently beyond reach of any purge we could run.** Narrowing what it carries narrows
  what a `§1.D` event would leave irrecoverable. This is a supporting reason rather than the
  decision's basis, and it is recorded that way because it would not have decided the question
  alone.
- **Erasure is unaffected.** This decision governs what leaves with a person, not what is destroyed
  when they go; CAN-30 GDPR export and erasure's erasure criteria and the CSEA retention carve-out
  in `docs/compliance/csea-reporting-procedure.md` stand untouched.
