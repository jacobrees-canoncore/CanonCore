# Code of Practice measures register

**INTERNAL RECORD — NOT PUBLISHED.** Kept to satisfy `s.23(3)`. Ofcom's *Record-Keeping and Review
Guidance* §4.2 requires a written record of **each measure** taken, which must describe the measure,
identify the relevant Code of Practice, and give the date it takes effect.

> **DRAFT.** The effective date is the launch date and is the same for every row. Complete it once.

**Code of Practice:** Ofcom's *Illegal Content Codes of Practice for User-to-User Services* (ICU).
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

## Illegal Content Codes (ICU)

| Ref | Measure | How it is met | Effective |
| --- | --- | --- | --- |
| **ICU A2** | An individual accountable for the illegal content safety duties and the reporting and complaints duties | Recorded in [`accountable-individual.md`](accountable-individual.md). Sole operator, who is both the accountable individual and the only member of the senior governance body, as Ofcom expressly permits (Volume 1 §5.98) | `[ ]` |
| **ICU C1** | Content moderation function to review and assess suspected illegal content | Content reported or otherwise noticed is reviewed by the operator. **The C1.3(b) route is used**: the terms of service prohibit illegal content by category, so content is assessed against the terms rather than by making a full `s.192` illegal content judgement | `[ ]` |
| **ICU C2** | Content moderation function allowing swift takedown | An admin can set any public record's Visibility to private, which removes it from public view. Recorded as an Operation with an audit entry | `[ ]` |
| **ICU D1** | Enabling complaints | A reporting route reachable **without an account**, covering all five limbs of "relevant complaints" and open to affected persons who are not users. Described in [`../../content/legal/reporting-and-complaints.md`](../../content/legal/reporting-and-complaints.md) | `[ ]` |
| **ICU D2** | Complaints systems easy to find, access and use | Reporting route linked from the footer of every page and from each publicly visible record; minimal steps; a field for supporting information; keyboard-navigable and screen-reader-usable. **See the gap noted below** | `[ ]` |
| **ICU D7** | Appropriate action on complaints about suspected illegal content | A complaint is treated as reason to suspect the content may be illegal and is reviewed under C1.3. Considered promptly; ICU C4 and C5 do not apply to this service | `[ ]` |
| **ICU D9** | Appeals — determination | Appeals are determined promptly. This measure applies because the service is neither large nor multi-risk | `[ ]` |
| **ICU D10** | Appeals — action following determination | Where a decision that content was illegal is reversed, the takedown is reversed and the position restored: Visibility is set back and any restriction lifted | `[ ]` |
| **ICU D11** | Complaints about proactive technology | **No proactive technology within `s.231` is used**, recorded positively so the trigger is documented as never firing. Stated in the terms of service as `s.10(7)` requires. Revisit if automated filtering is ever added | `[ ]` |
| **ICU D12** | All other relevant complaints | The operator is the nominated responsible individual. Timeframes determined as appropriate under D12.4(b) are recorded in [`review-policy.md`](review-policy.md) | `[ ]` |
| **ICU D13** | Manifestly unfounded complaints | **Not adopted.** D13 is permissive, not mandatory. Relying on it would require a written policy, a mis-identification monitoring process, an annual review and a change record; at this service's complaint volume that costs more than handling every complaint on its merits | `[ ]` |
| **ICU G1** | Terms of service: substance | [`../../content/legal/terms-of-service.md`](../../content/legal/terms-of-service.md) | `[ ]` |
| **ICU G3** | Terms of service: clarity and accessibility | Same document: signposted to the general public without signing in, individually locatable by heading, and accessible to keyboard and screen-reader users | `[ ]` |
| **ICU H1** | Removing accounts of proscribed organisations | The terms of service prohibit proscribed organisation content, which makes the H1.2(b) route available. On becoming aware, the operator applies the H1.6 inference test and removes the account. Reactive only — H1 imposes no scanning obligation, and H1.8 puts private records outside its sampling absent explicit consent | `[ ]` |

## Protection of Children Codes (PCU)

Required because the [children's access assessment](childrens-access-assessment.md) concludes the child
user condition is met. Obtained from Ofcom's *Check how to comply with the protection of children rules*
tool (reference code `POCVMT95NIB`), run with all kinds low, non-designated content negligible, fewer than
700,000 monthly active UK users, terms prohibiting all four kinds of primary priority content, and no
principal purpose of hosting harmful content.

The tool returns 16 measures. **Thirteen bind, and the three that do not are recorded here with the
reason**, since a reader will otherwise wonder where they went.

| Ref | Measure | How it is met | Effective |
| --- | --- | --- | --- |
| **PCU A2** | Individual accountable for the children's safety duties and the reporting and complaints duties | The same individual as ICU A2. See [`accountable-individual.md`](accountable-individual.md) | `[ ]` |
| **PCU C1** | Content moderation function to review and assess suspected content harmful to children | The same function as ICU C1, extended to content harmful to children | `[ ]` |
| **PCU C2** | Content moderation function allowing swift action | Admin sets Visibility to private. Takedown **is** technically feasible here, which is why PCU B4 and B5 do not apply | `[ ]` |
| **PCU D1** | Enabling complaints | The same reporting route as ICU D1, reachable without an account | `[ ]` |
| **PCU D2** | Easy to find, access and use complaints systems | As ICU D2. **The same D2.2(a) gap applies** — see below | `[ ]` |
| **PCU D7** | Appropriate action for complaints about content harmful to children | Considered promptly; the prioritisation and target measures do not apply to this service | `[ ]` |
| **PCU D9** | Content appeals — determination (neither large nor multi-risk) | Determined promptly, per the timeframes in [`review-policy.md`](review-policy.md) | `[ ]` |
| **PCU D10** | Content appeals — action following determination | Visibility restored and restrictions lifted where a decision is reversed | `[ ]` |
| **PCU D12** | Age assessment appeals (neither large nor multi-risk) | **Never fires.** The service performs no age assessment, so there is no age assessment decision to appeal. Recorded positively rather than omitted | `[ ]` |
| **PCU D13** | Complaints about non-compliance with certain duties | The operator is the nominated responsible individual | `[ ]` |
| **PCU D14** | Exception: manifestly unfounded complaints | **Not adopted**, for the same reason as ICU D13: it is permissive, and its policy, annual review and record-keeping cost more than handling every complaint | `[ ]` |
| **PCU G1** | Terms of service: substance | [`../../content/legal/terms-of-service.md`](../../content/legal/terms-of-service.md) | `[ ]` |
| **PCU G3** | Terms of service: clarity and accessibility | Same document | `[ ]` |

**Listed by the tool but not applicable:**

| Ref | Why not |
| --- | --- |
| **PCU B1** | Principles of age assurance. Applies only where highly effective age assurance is used to identify child users. **This service uses none**, and does not need to: `s.12(5)` removes the requirement because the terms prohibit all four kinds of primary priority content for all users |
| **PCU B4** | Applies where it is not currently technically feasible to take content down. Takedown is feasible here |
| **PCU G2** | Category 1 services only. Summarising the children's risk assessment findings in the terms is not required of this service |

> **The `s.12(5)` prohibition is doing real work.** It is what keeps PCU B1 and the whole age-assurance
> apparatus out of scope. Weakening the primary priority content prohibition in the terms would pull age
> verification or age estimation into the build.

## Known gap against ICU D2.2(a)

**ICU D2.2(a)** requires that "for relevant complaints regarding a specific piece of content, a
**reporting function or tool is clearly accessible in relation to that content**" — a per-item report
control, not only a published address.

At launch, CAN-32 surfaces the reporting address from the footer and from the public Ordering page but
defers the report form, the reports table and the administrator queue to a later increment. The address
satisfies D2.2(b) for other kinds of complaint; **it does not fully satisfy D2.2(a)**.

This is recorded as a known and deliberate gap rather than an oversight, with the closing work tracked on
CAN-32. It should be closed before the service carries content from any account other than the operator's.
