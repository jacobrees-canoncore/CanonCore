# Children's access assessment

**INTERNAL RECORD — NOT PUBLISHED.** Kept to satisfy `s.36(7)`, which requires a written record "in an
easily understandable form" of every children's access assessment.

The conclusion is settled: the child user condition is **met**. The reasoning, and what it costs, are
recorded in [The conclusion](#the-conclusion-and-what-it-costs).

| | |
| --- | --- |
| Service name | CanonCore (`https://www.canoncore.com`) |
| Completion date | 13 August 2026 |
| Re-read | 17 August 2026 — against the children's risk assessment as redone under `s.11(4)` by [CAN-108 Re-assess the illegal-content risk before a user can paste an arbitrary Provider URL](https://linear.app/jacobrees-canoncore/issue/CAN-108). **Neither stage moved**, and *Re-read on 17 August 2026* below records why, because "no change" is the answer that most looks like it was never checked |
| Next assessment due | 13 August 2027 — at most 12 months after completion (`s.36(3)`) |
| Completed by | Jacob Rees |
| Named person responsible | Jacob Rees |
| Approved by | Jacob Rees — sole operator; see [`accountable-individual.md`](accountable-individual.md) |

> **Dated before launch, deliberately.** `s.36(1)` fixes the first assessment by reference to
> [Schedule 3](https://www.legislation.gov.uk/ukpga/2023/50/schedule/3), and `s.37(5)(a)` then deems the
> service likely to be accessed by children from that deadline whether or not an assessment was made. The
> reasoning is the same as the [illegal content risk assessment](illegal-content-risk-assessment.md)'s and
> is not repeated: the trigger date is at latest the day the service first carries user-generated content,
> and dating now is the conservative reading.

Structure follows Ofcom's *Children's access assessment: template*. Two stages, and that is the whole
document.

## Stage 1 — Is it possible for children to access the service, or part of it?

**Answer: yes.**

`s.35(2)` is narrow: a provider "is **only** entitled to conclude that it is not possible for children to
access" a service if age verification or age estimation is used with the result that children are not
normally able to access it. CanonCore uses neither, and has no plans to. Public records are readable by
anyone with the URL and no account.

Per Ofcom's template, a "yes" at this stage **requires no recorded evidence**. Continue to Stage 2.

## Stage 2 — Is the child user condition met?

**Answer: yes.**

`s.35(3)` sets two limbs, and the condition is met if **either** is satisfied:

1. there is a significant number of children who are users of the service, or
2. the service is **of a kind likely to attract a significant number of users who are children**.

Limb 1 is not evidenced either way: the service has not launched, so there is no usage data at all.
`s.35(4)(b)` says the significance test is judged "based on evidence about who actually uses a service,
rather than who the intended users are" — and a pre-launch service has no such evidence to point at.

Limb 2 is the operative one, and it is met. A general media-cataloguing service places no restriction on
what may be catalogued, carries no age restriction, and is free to read without an account. Services of
this kind — catalogues and trackers for film, television, books and games — are not plausibly
characterised as adult-oriented.

Per Ofcom's template, a "yes" at this stage **requires no recorded evidence**.

**Consequence:** the service is treated as likely to be accessed by children. A **children's risk
assessment** is required under `s.11` within three months, and the Protection of Children Codes apply.

## The conclusion, and what it costs

This is the highest-stakes judgement in CAN-21, so the reasoning and the trade-off are recorded rather
than assumed.

**Answering "met" (as drafted):**

- Requires no evidence, and the record is complete as it stands.
- Adds a children's risk assessment and the `s.12` children's duties.
- **`s.12(5)` is the escape hatch from age assurance**: prohibiting every kind of primary priority content
  harmful to children, for all users, in the terms of service removes the `s.12(4)` requirement to deploy
  age verification or age estimation. That prohibition is included in the drafted terms of service, so
  this route is already taken.

**Answering "not met":**

- Requires recorded evidence and reasoning under Ofcom's template, which a pre-launch service cannot
  supply, since `s.35(4)(b)` directs the test at actual usage.
- Carries an asymmetric downside: `s.37(4)–(5)` deems a service likely to be accessed by children from
  the assessment deadline until a valid assessment concludes otherwise, so a "not met" that does not hold
  up leaves the children's duties switched on anyway, retrospectively.

**Concluded: met.** Three reasons, in order of weight. First, `s.35(4)(a)` says "significant" includes a
number significant **in proportion to** the total number of United Kingdom users, so on a service with a
few dozen users a handful of children is significant — small size makes "met" *more* likely, not less.
Second, the test in limb 2 is about the **kind** of service, and media catalogues and collection trackers
demonstrably carry substantial under-18 populations. Third, "not met" requires recorded evidence that a
pre-launch service cannot have. The asymmetry settles it: a wrong "not met" is punished retrospectively by
`s.37(4)–(5)`, while a wrong "met" costs paperwork. The expensive consequence, age assurance, is avoided
by a terms-of-service clause that costs three sentences.

**Revisit at the first review.** Once there is real usage data, limb 1 becomes answerable on evidence, and
"not met" may become properly available.

## Re-read on 17 August 2026

`s.36(4)` requires this assessment to be redone before a significant change to the design or operation
of the service, among other triggers, and accepting a pasted third-party Provider URL
([CAN-113 Add a Provider by pasting its URL](https://linear.app/jacobrees-canoncore/issue/CAN-113))
is one. It was re-read against the children's risk assessment as redone the same day. **Neither stage
moves, and neither could have** — which is the finding, not an excuse for skipping the read.

**Stage 1 turns on age assurance and on nothing else.** `s.35(2)` entitles a provider to conclude
"not possible" **only** where age verification or age estimation is used with the result that children
are not normally able to access the service. Accepting a pasted URL deploys neither. No fact about
Providers is capable of reaching this stage's test.

**Stage 2 turns on the kind of service.** Limb 2 asks whether the service is of a kind likely to
attract a significant number of users who are children. An ingress that lets a person fill their own
records from a service of their own choosing does not make a media catalogue a different kind of
thing; if it does anything, it widens what may be catalogued, which points the same way the existing
answer already points. Limb 1 is still unevidenced, because the service still has no usage data.

**What would change the answer** is deploying highly effective age assurance, which is the only route
to a Stage 1 "no". The two conditions that would put age assurance into the build at all are recorded
in [`code-measures-register.md`](code-measures-register.md) → *Protection of Children Codes*, and
neither is touched by anything decided on 17 August 2026.
