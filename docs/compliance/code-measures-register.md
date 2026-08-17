# Code of Practice measures register

**INTERNAL RECORD — NOT PUBLISHED.** Kept to satisfy `s.23(3)`. Ofcom's *Record-Keeping and Review
Guidance* §4.2 requires a written record of **each measure** taken, which must describe the measure,
identify the relevant Code of Practice, and give the date it takes effect.

| | |
| --- | --- |
| Completion date | 13 August 2026 |
| Last revised | 14 August 2026 (substantive edits), revision row added 16 August 2026 per RKRG §2.7 |
| Revised | 17 August 2026 — read alongside both risk assessments as redone by [CAN-108 Re-assess the illegal-content risk before a user can paste an arbitrary Provider URL](https://linear.app/jacobrees-canoncore/issue/CAN-108). **No row changed and none was added**; *Content from a pasted Provider, and why no row changes* says why that is the right answer rather than an unfinished one |
| Next review date | 13 August 2027 — and alongside either risk assessment whenever that is reviewed |
| Completed by | Jacob Rees |
| Named person responsible | Jacob Rees |
| Approved by | Jacob Rees — sole operator; see [`accountable-individual.md`](accountable-individual.md) |

**Codes of Practice:** Ofcom's *Illegal Content Codes of Practice for User-to-User Services* (ICU) **and**
its *Protection of Children Codes of Practice for User-to-User Services* (PCU). Record-Keeping Guidance
§4.2 requires each measure to identify the Code it comes from, and every row below does.

**Applicability:** this service is **smaller** (well under 7 million monthly active UK users) and
**low-risk** (low or negligible for all 18 kinds), per
[`illegal-content-risk-assessment.md`](illegal-content-risk-assessment.md). It is **not** a large service
and **not** multi-risk.

There is no obligation to record measures that do not apply (Record-Keeping Guidance, footnote 31), so
this register lists only those that bind.

**Two codes apply to this service**, and they are recorded in two sections below: the **Illegal Content
Codes (ICU)**, which apply to every regulated user-to-user service, and the **Protection of Children
Codes (PCU)**, which apply because the children's access assessment concludes the child user condition is
met. Several measures pair across the two, and where they do the same implementation satisfies both.

## What the `Effective` column means, and why most rows carry no date

`s.23(3)` records measures **taken or in use**. A date against a measure that is not in use would make
this record false, so the column carries one of three determinate values and never a placeholder:

- **A date** — the measure is in effect. Nothing further is needed for it to operate.
- **Not in effect — CAN-n** — the measure needs a surface the application does not have. The ticket named
  is the one that builds it, and the date is filled when it merges.
- **Not adopted** — a permissive measure declined on the record. There is no effective date for a measure
  not taken.

**Why most rows read the second way.** There are no accounts, no footer and no `/legal` route, so there is
nothing to moderate, report or take down. Since **CAN-23 One Story from Neon, behind row-level security**
`main` does carry one record, and that record is public — but it is the operator's own, inserted by a
migration, and nobody else can create one. What these rows wait on is *user-generated* content, and that
arrives with accounts.
Two tickets close the gap between them, and **one of them has landed**:
[CAN-44 Make the Online Safety Act records live, and create the reporting address](https://linear.app/jacobrees-canoncore/issue/CAN-44)
created `report@canoncore.com` on 14 August 2026 and proved a message arrives in it, so no row below
waits on an address any more.
[CAN-32 Roles, takedown, and the Online Safety Act surfaces](https://linear.app/jacobrees-canoncore/issue/CAN-32)
still owes the public surfaces, the roles and the takedown, and every remaining *Not in effect* row
names it alone.

**This is not a compliance gap, because of the gate.** The service must carry no user-generated content
until both have landed, and that is enforced as the URL-sharing gate in `docs/infrastructure.md` →
*The URL-sharing gate*. A measure has nothing to bite on until there is content for it to bite on; what
would be a gap is content arriving first.

## Illegal Content Codes (ICU)

| Ref | Measure | How it is met | Effective |
| --- | --- | --- | --- |
| **ICU A2** | An individual accountable for the illegal content safety duties and the reporting and complaints duties | Recorded in [`accountable-individual.md`](accountable-individual.md). Sole operator, who is both the accountable individual and the only member of the senior governance body, as Ofcom expressly permits (Volume 1 §5.98) | 13 August 2026 |
| **ICU C1** | Content moderation function to review and assess suspected illegal content | Content reported or otherwise noticed is reviewed by the operator. **The C1.3(b) route is used**: the terms of service prohibit illegal content by category, so content is assessed against the terms rather than by making a full `s.192` illegal content judgement — which needs those terms published | Not in effect — CAN-32 |
| **ICU C2** | Content moderation function allowing swift takedown | An admin will be able to set any public record's Visibility to private, removing it from public view, recorded as an Operation with an audit entry. **No role, no Visibility and no audit entry exist on `main`** | Not in effect — CAN-32 |
| **ICU D1** | Enabling complaints | A reporting route reachable **without an account**, covering all five limbs of "relevant complaints" and open to affected persons who are not users. Described in [`../../content/legal/reporting-and-complaints.md`](../../content/legal/reporting-and-complaints.md), which is written and addressed but not yet published | Not in effect — CAN-32 (route) |
| **ICU D2** | Complaints systems easy to find, access and use | Reporting route to be linked from the footer of every page and from the public Ordering page; minimal steps (D2.2(c)). **D2.2(d) supporting information is met by the address itself** — a reporter can include anything in a message, so no field is needed and none is built. **D2.2(a) is replaced by an alternative measure** — see below | Not in effect — CAN-32 (route) |
| **ICU D7** | Appropriate action on complaints about suspected illegal content | A complaint is treated as reason to suspect the content may be illegal and is reviewed under C1.3. Considered promptly; ICU C4 and C5 do not apply to this service | Not in effect — CAN-32 |
| **ICU D9** | Appeals — determination | Appeals are determined promptly. This measure applies because the service is neither large nor multi-risk | Not in effect — CAN-32 |
| **ICU D10** | Appeals — action following determination | Where a decision that content was illegal is reversed, the takedown is reversed and the position restored: Visibility is set back and any restriction lifted | Not in effect — CAN-32 |
| **ICU D11** | Complaints about proactive technology | **No proactive technology within `s.231` is used**, so D11.2's trigger cannot fire: it requires proactive technology to have taken content down or restricted it. Recorded positively so the absence is auditable rather than assumed. Revisit if automated filtering is ever added | 13 August 2026 |
| **ICU D12** | All other relevant complaints | The operator is the nominated responsible individual under D12.3 — nominated today, and recorded below. Timeframes determined as appropriate under D12.4(b) are in [`review-policy.md`](review-policy.md). **Handling** needs a route for a complaint to arrive by | Not in effect — CAN-32 |
| **ICU D13** | Manifestly unfounded complaints | **Not adopted.** D13 is permissive, not mandatory. Relying on it would require a written policy, a mis-identification monitoring process, an annual review and a change record; at this service's complaint volume that costs more than handling every complaint on its merits | Not adopted |
| **ICU G1** | Terms of service: substance | [`../../content/legal/terms-of-service.md`](../../content/legal/terms-of-service.md), which is written but is not rendered anywhere | Not in effect — CAN-32 |
| **ICU G3** | Terms of service: clarity and accessibility | Same document: to be signposted to the general public without signing in (G3.2(a)(i)), individually locatable by heading (G3.2(a)(ii)), and usable by keyboard and screen reader (G3.2(d)). See the reading-age items below | Not in effect — CAN-32 |
| **ICU H1** | Removing accounts of proscribed organisations | On becoming aware, the operator applies the H1.4 inference test and removes the account under H1.5. Reactive only — H1 imposes no scanning obligation, and H1.8 puts private records outside its sampling absent explicit consent. **H1.6's test does not fit this service** and H1.7 is the operative route — see below | Not in effect — CAN-32 |

### ICU H1: which inference route can actually run

H1.6 finds reasonable grounds where at least two of three things are true **of the user profile**: the
username matches a proscribed organisation or a `s.3(6)` Terrorism Act 2000 alias; the profile image is
proscribed organisation content; the profile bio or descriptive text is proscribed organisation content.

**This service has no profile page, no profile image and no bio.** The illegal content risk assessment
records "user profiles" as a risk factor on the thin basis of an author attribution on a public Ordering,
and that attribution is the whole of the profile. So limbs (b) and (c) can never be true, at most one of
the three can be satisfied, and **H1.6 cannot reach its two-of-three threshold**.

**H1.7 is therefore the operative route**: reasonable grounds may also arise where a significant
proportion of a reasonably sized sample of the regulated user-generated content recently generated on an
account is proscribed organisation content. That is a route this service can actually run, because the
corpus is small enough to read. It is recorded here so that nobody later reads the H1 row as promising a
profile test that has nothing to test.

**The terms of service prohibition is a choice, not a requirement.** H1 does not require the terms to
prohibit proscribed organisation content. H1.2 defines "relevant content" as content the provider has
determined either (a) *is* proscribed organisation content, or (b) is in breach of terms designed to
prohibit it. Route (a) is available to every provider. Carrying the prohibition adds route (b), which is
the cheaper determination to make and is why the terms carry it — not because the Code obliges it.

### ICU G1: how the terms of service answer `s.10(5)`

ICU G1 is "terms of service: substance", and the substance `s.10(5)` demands is specific. It requires
provisions specifying how individuals are protected from illegal content, **addressing (a) each paragraph
of `s.10(3)` — and, for `s.10(3)(a)`, separately addressing terrorism content, CSEA content and other
priority illegal content — and (b) `s.10(3A)`**. The mapping is recorded so the claim is checkable rather
than asserted.

| `s.10(5)` limb | Answered by |
| --- | --- |
| (a) `s.10(3)(a)`, **terrorism content** separately | *How we protect people from illegal content* → *Terrorism content* |
| (a) `s.10(3)(a)`, **CSEA content** separately | Same section → *Child sexual exploitation and abuse content* |
| (a) `s.10(3)(a)`, **other priority illegal content** separately | Same section → *Other illegal content* |
| (a) `s.10(3)(b)` — minimise the length of time illegal content is present | Same section, opening line: "We keep the time that illegal content is present on CanonCore as short as we can" |
| (a) `s.10(3)(c)` — swift takedown on becoming aware | Same section → *Taking content down* |
| **(b) `s.10(3A)`** — the intimate image duty | Same section → *Intimate images shared without consent* |

**Limb (b) post-dates the drafting** and is the one that had to be added. `s.10(3A)` and `s.10(3B)` were
inserted by the Crime and Policing Act 2026 amendments in force 29 June 2026, after the terms were written
on **CAN-21 Write the Online Safety Act documents and establish the reporting address**. The
provision now states the 48-hour deadline, that it runs **from receipt** rather than from
when the report is opened, the "same or substantially the same" limb, and the two `s.10(3B)` exceptions —
that the provider considers the content is not intimate image content, or that the reporter is neither the
subject nor acting on their behalf — as the only two grounds for refusing.

**`s.21(2A)`**, the expedited complaints procedure for someone who has made an intimate image content
report, is stated in both public documents. It is recorded here rather than as its own measure because no
Code measure carries it; it is a statutory duty answered directly.

**The report path itself is not built.** `s.20A(2)` intimate image content reports arrive by the published
address like any other report, and
[CAN-72 The intimate image report path, which s.20A already requires](https://linear.app/jacobrees-canoncore/issue/CAN-72)
owns the dedicated path. The terms describe what happens on receipt, which is true of a report arriving by
email.

## Protection of Children Codes (PCU)

Required because the [children's access assessment](childrens-access-assessment.md) concludes the child
user condition is met. Obtained from Ofcom's *Check how to comply with the protection of children rules*
tool (reference code `POCVMT95NIB`), run with all kinds low, non-designated content negligible, fewer than
700,000 monthly active UK users, terms prohibiting all four kinds of primary priority content, and no
principal purpose of hosting harmful content.

The tool returns 16 measures, and they do not all land the same way. **Twelve bind. One (D14) is
permissive and is not adopted. Three do not apply**, and the reason for each is recorded below, since a
reader will otherwise wonder where they went. Twelve plus one plus three is the sixteen.

| Ref | Measure | How it is met | Effective |
| --- | --- | --- | --- |
| **PCU A2** | Individual accountable for the children's safety duties and the reporting and complaints duties | The same individual as ICU A2. See [`accountable-individual.md`](accountable-individual.md) | 13 August 2026 |
| **PCU C1** | Content moderation function to review and assess suspected content harmful to children | The same function as ICU C1, extended to content harmful to children | Not in effect — CAN-32 |
| **PCU C2** | Content moderation function allowing swift action | Admin sets Visibility to private, which is a takedown under C2.3(a) rather than the C2.3(b) fallback. **Takedown being feasible is load-bearing** — see the note under the table | Not in effect — CAN-32 |
| **PCU D1** | Enabling complaints | The same reporting route as ICU D1, reachable without an account | Not in effect — CAN-32 (route) |
| **PCU D2** | Easy to find, access and use complaints systems | As ICU D2. **PCU D2.2(a) is replaced by the same alternative measure** — see below | Not in effect — CAN-32 (route) |
| **PCU D7** | Appropriate action for complaints about content harmful to children | Considered promptly; the prioritisation and target measures do not apply to this service | Not in effect — CAN-32 |
| **PCU D9** | Content appeals — determination (neither large nor multi-risk) | Determined promptly, per the timeframes in [`review-policy.md`](review-policy.md) | Not in effect — CAN-32 |
| **PCU D10** | Content appeals — action following determination | Visibility restored and restrictions lifted where a decision is reversed | Not in effect — CAN-32 |
| **PCU D12** | Age assessment appeals (neither large nor multi-risk) | **Never fires.** The service performs no age assessment, so there is no age assessment decision to appeal. Recorded positively rather than omitted | 13 August 2026 |
| **PCU D13** | Complaints about non-compliance with certain duties | The operator is the nominated responsible individual, as for ICU D12 | Not in effect — CAN-32 |
| **PCU D14** | Exception: manifestly unfounded complaints | **Not adopted**, for the same reason as ICU D13: it is permissive, and its policy, annual review and record-keeping cost more than handling every complaint | Not adopted |
| **PCU G1** | Terms of service: substance | [`../../content/legal/terms-of-service.md`](../../content/legal/terms-of-service.md) | Not in effect — CAN-32 |
| **PCU G3** | Terms of service: clarity and accessibility | Same document | Not in effect — CAN-32 |

**The three the tool listed but which do not apply.** Two of them, B1 and B4, are **age assurance**
measures: Section B of the Protection of Children Codes is the age assurance section. An earlier version
of this register described B4 as a measure about the technical feasibility of takedown, which is what its
*applicability test* turns on, not what the measure *is*. Corrected here.

| Ref | Measure | Why not |
| --- | --- | --- |
| **PCU B1** | Implementing an age assurance process | B1.1 applies to a service "that **uses** highly effective age assurance to identify which United Kingdom users of the service are child users for the purpose of targeting measures recommended in this Code at such users, their user accounts or their content feeds (whether because any of Recommendations B2 to B7 apply to the service or otherwise)". **This service uses none**, none of B2 to B7 applies, and no measure in this Code is targeted at child users here, so B1's own applicability test is not met. `s.12(5)` is why the service *needs* none — the terms prohibit all four kinds of primary priority content for all users — but that is the statutory escape from `s.12(4)`, and it is a different question from whether this Code measure applies |
| **PCU B4** | Use of highly effective age assurance — services that do not prohibit primary priority content | B4.1 applies where (a) PCU B2 does not apply, **and** (b) either (i) one or more specific kinds of primary priority content are allowed on the service, or (ii) all kinds are prohibited but it is not currently technically feasible to take down all content the provider determines is in breach of its terms under PCU C1.3(a). Limb (a) is satisfied — B2 does not apply, since the principal purpose of the service is not hosting or disseminating primary priority content — but **both limbs of (b) fail**: the terms prohibit all four kinds for all users, and takedown is technically feasible |
| **PCU G2** | Summarising the children's risk assessment in the terms | Category 1 services only. Not required of this service |

That is the three, and the sixteen is closed. **PCU B5 below sits outside that count**, and the section
says why. **The `Effective` column is absent from this table on purpose**: a measure that does not apply
is not a measure taken, and `s.23(3)` asks for the date measures take effect, not a date against
something that never starts.

> **Two conditions hold PCU B4 out of scope, and both can be lost.** The first is the `s.12(5)`
> prohibition on primary priority content in the terms, which is what makes B4.1(b)(i) false. The second
> is quieter: **B4.1(b)(ii) applies where takedown is not technically feasible**, so B4 stays out of scope
> only while takedown works. CAN-32 is what makes it work. A design that ever made some content
> undeletable would bring highly effective age assurance into scope by that route alone, with the terms
> unchanged.
>
> **B1 follows B4 rather than the terms.** B1 applies to a service that *uses* highly effective age
> assurance, so it comes into scope only once something else has put age assurance into the build. Losing
> either condition above is that something else.

### PCU B5, which the tool did not return

**B5 is not among the sixteen recorded** and is kept here anyway, because this register previously
described it as a measure about the technical feasibility of takedown. It is not. Whether the tool
returned it and it was set aside, or never returned it, is not recoverable from what was written down;
reference code `POCVMT95NIB` is retained so the run can be resumed rather than guessed at. **PCU B5
is "use of highly effective age assurance — services that do not prohibit priority
content"**, and B5.1 applies where (a) PCU B3 does not apply, **and** (b) the service is at **medium or
high risk of one or more specific kinds of priority content** and either that content is allowed on the
service or it is prohibited but takedown is not technically feasible.

**It does not apply here, and limb (b) is why**: the children's risk assessment finds **low for all eight
kinds** of priority content, so the threshold is never reached and the sub-limbs are never read. B3 does
not apply either, so limb (a) is satisfied and does no work. B5 *is* referenced inside PCU C2.6(b)(i),
C2.7(a) and C2.8(a), which is presumably how it reached this register in the first place — but there it
names a **class of service** ("a service to which Recommendation PCU B5 applies"), not a rule about
feasibility.

> **B5 turns on a risk level, not on the terms.** It comes into scope if any kind of priority content —
> abusive content, content inciting hatred, bullying, the three violent kinds, harmful substances,
> dangerous stunts — is ever assessed at **medium or high** rather than low. That is a finding the
> children's risk assessment can change at a review without anything about the product changing, and it is
> a different lever from the `s.12(5)` terms prohibition, which answers primary priority content only.

## Content from a pasted Provider, and why no row changes

**Recorded 17 August 2026.** A person will be able to paste the URL of a Provider this project does
not run ([CAN-113 Add a Provider by pasting its URL](https://linear.app/jacobrees-canoncore/issue/CAN-113)),
and the prose it returns is user-generated content — derived in
[`illegal-content-risk-assessment.md`](illegal-content-risk-assessment.md) → *What counts as
user-generated content here*. It is therefore moderated by the same function as any other content,
under **ICU C1 and C2** and **PCU C1 and C2**, exactly as their rows above already describe:
assessed against the terms by the C1.3(b) route, and acted on by setting the record's Visibility to
private.

**Pasted Providers themselves are not moderated** — not reviewed, listed, allowlisted or vouched for.
That decision, its two rejected alternatives and what would reverse it are in
[`illegal-content-risk-assessment.md`](illegal-content-risk-assessment.md) → *Pasted Providers are
not moderated*. It declines no measure any Code recommends, so it produces no `s.23(4)` entry either
and the alternative measure recorded in
[`alternative-measures-record.md`](alternative-measures-record.md) is untouched by it.

**What would put a row here.** Adopting an operator blocklist of Provider URLs, which that section
records as the first thing to build if its reassessment triggers fire. A blocklist is a moderation
commitment with a date it takes effect, and `s.23(3)` would then want it written down.

## Sub-measures recorded explicitly

Three sub-measures are satisfied by a fact rather than by a feature, so they are easy to lose inside a
row. Ofcom's guidance asks for the measure to be described; these are the descriptions.

| Ref | What it requires | How it is met | Effective |
| --- | --- | --- | --- |
| **ICU D12.3** | The provider should nominate a responsible individual or a team to ensure such complaints are directed to an appropriate individual or team to be processed | **Jacob Rees**, the same person as ICU A2 and PCU A2. Why a sole operator satisfies a measure written around routing: [`review-policy.md`](review-policy.md) → *Nominated responsible individual* | 13 August 2026 |
| **ICU D2.3(e)** | The reporting and complaints process should be designed having regard to comprehensibility, "based on the likely reading age of the youngest individual permitted to use the service without the consent of a parent or guardian" | The youngest permitted user is **13**, set by the terms of service. [`../../content/legal/reporting-and-complaints.md`](../../content/legal/reporting-and-complaints.md) is written to that reading age: short sentences, no legal terminology, and every heading a question a reporter would ask. The minimum age is a product decision, confirmed as 13 on 14 August 2026 by CAN-44 Make the Online Safety Act records live, and create the reporting address; if it moves, this obligation moves with it | Not in effect — CAN-32 |
| **ICU G3.2(b) and (c)** | The terms should be "laid out and formatted in a way that helps United Kingdom users read and understand them", and "written to a reading age comprehensible for the youngest individual permitted to use the service" | Same reading age, 13, and the same drafting standard. G3.2(b) is met by the section structure: one heading per obligation, so a provision is locatable without reading the whole document, which is also what G3.2(a)(ii) asks. **Neither is asserted as tested** — no readability measurement has been run, and the claim is about how the document was drafted | Not in effect — CAN-32 |

## The one alternative measure

**ICU D2.2(a) and PCU D2.2(a) — a per-item report control — are not adopted at launch.** In their place
the reporting route is published as an address reachable without an account.

That is an **alternative measure** under `s.23(4)`, not an unexplained gap, and `s.23(4)` is a different
duty from the `s.23(3)` register above. The record is
[`alternative-measures-record.md`](alternative-measures-record.md) → *`s.23(4)(c)` — how the alternative
amounts to compliance*, which carries the measures not taken, the alternative, the compliance argument,
the `s.23(5)` areas and the `s.49(5)` freedom-of-expression and privacy consideration.

Building the per-item control is
[CAN-43 Report form, reports table and an administrator queue](https://linear.app/jacobrees-canoncore/issue/CAN-43),
which is deliberately outside v1. **When it lands, this section and that record are both deleted**,
because the Code measure will then simply be adopted.
