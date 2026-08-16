# Illegal content risk assessment

**INTERNAL RECORD — NOT PUBLISHED.** Publishing a summary of risk assessment findings is a Category 1
duty (`s.10(9)`, ICU G2) that does not apply to this service. This document is kept to satisfy `s.23(2)`
and is provided to Ofcom on request.

| | |
| --- | --- |
| Service name | CanonCore (`https://www.canoncore.com`) |
| Service type | User-to-user service (`s.3(1)`). Not a search service |
| Completion date | 13 August 2026 |
| Last revised | 14 August 2026 (substantive edits), revision row added 16 August 2026 per RKRG §2.7 |
| Next review date | 13 August 2027 — the service's 12-month policy cadence (Ofcom good practice; `s.9(3)` imposes keep-up-to-date, not a fixed interval — corrected 16 August 2026), and earlier before any significant change (`s.9(4)`) |
| Reason for review | First assessment, before launch |
| Completed by | Jacob Rees |
| Named person responsible | Jacob Rees |
| Approved by | Jacob Rees — sole operator; see [`accountable-individual.md`](accountable-individual.md) |

> **Why this is dated before launch rather than at it.** `s.9(2)` fixes the first assessment by reference
> to [Schedule 3](https://www.legislation.gov.uk/ukpga/2023/50/schedule/3): three months from the day the
> service becomes a Part 3 service. `www.canoncore.com` is already deployed, so the trigger date is at
> latest the day the service first carries user-generated content, and possibly earlier. Dating now is the
> conservative reading and costs nothing but an earlier review date. The decision is recorded in
> `docs/research/tracker-and-repository-audit.md` §9; it inverted the rule **CAN-44 Make the Online Safety
> Act records live, and create the reporting address** originally carried, which was to date the records
> immediately before sharing the URL.

Structure follows Ofcom's *Illegal content duties: record-keeping template*. Risk levels and reasoning
follow the *Risk Assessment Guidance and Risk Profiles* **V2.0 (25 June 2026)**. The evidence and
citations behind every methodological statement here are in
[`docs/research/online-safety-act-obligations.md`](../research/online-safety-act-obligations.md).

## The service being assessed

CanonCore is a personal media-catalogue service. Each account holds its own Catalogue of Stories (works),
Versions of them, and Orderings (authored sequences over Stories, each entry carrying a free-text
"Argument" justifying its position). There is **no shared catalogue**: two people recording the same work
hold separate rows and neither can edit the other's.

The functionality that makes it a user-to-user service is narrow and worth stating precisely, because the
whole assessment turns on it:

- **Accounts** — anyone may sign up with an email address and a password (CAN-24).
- **Visibility** — a per-record flag. A record may be made public and then read by anyone, including
  people with no account (CAN-23).
- **Free text** — titles, notes and Arguments are authored by the account holder.

Those three, together, are what make this a user-to-user service: one person authors, sets a record
public, and another person encounters it.

> **Fork is deliberately not in scope at launch.** Copying another account's public records into your own
> Catalogue is [CAN-9](https://linear.app/jacobrees-canoncore/issue/CAN-9), which CAN-17 lists as out of
> scope for v1. **This assessment describes the service without it.** Fork is a re-posting and forwarding
> mechanism, which Ofcom associates with several harms, so shipping it is a significant change requiring
> reassessment before it goes live. It is listed in Step 4.

### Functionality the service does not have

Each of these is a mechanism absent by design, not a feature switched off, and together they carry most
of the findings below:

- No image, video or file upload of any kind, and no stored media bytes (ADR-0006). **v1 displays no
  artwork at all**: CAN-26 states "No artwork is imported", and artwork is CAN-13, out of scope for v1.
- No copying of one account's records into another's — Fork is out of scope, as above.
- No direct messaging, no group messaging, no live streaming, no encrypted messaging.
- No comments on another user's content, and no reply or mention mechanism.
- No user-to-user connections, no followers, no closed groups.
- No marketplace, listings, payments or advertising.
- No recommender system, no engagement ranking, no virality mechanics.
- No search across other users' content.
- **User free text renders as plain text and is never hyperlinked**, so a URL typed into an Argument is
  not followable from the page. This is a design constraint owned by
  [CAN-27 Orderings and Placements, and the imported broadcast Ordering](https://linear.app/jacobrees-canoncore/issue/CAN-27),
  which carries it as an acceptance criterion and a test; it is not yet a property of shipped code,
  because no free text ships yet.

## Step 1 — Risk Profiles and risk factors

Ofcom's Risk Profiles have been consulted. The questionnaire in Part 3 Section 1 of the Risk Assessment
Guidance was worked through; the answers are recorded here.

| Question | Answer |
| --- | --- |
| Service type | **None of the above.** Not a social media, messaging, gaming, adult, discussion forum, marketplace or file-sharing service |
| Do child users access some or all of the service? | **Yes** — see `docs/compliance/childrens-access-assessment.md` |
| User identification functionalities | **User profiles**; **users without accounts** (anonymous visitors may read public records) |
| User networking functionalities | **None of the above** |
| User communication functionalities | **None of the above.** No livestreaming, direct messaging, encrypted messaging, commenting, image/video posting, location sharing, or re-posting/forwarding. CAN-17 rules out comments, likes, notifications and activity feeds by name, and Fork is out of scope |
| Users can post goods or services for sale | **No** |
| Finding or encountering content | **None of the above.** No search over user-generated content; no hyperlinking, because user free text is not linkified |
| Content or network recommender systems | **No** |

**The risk factors that apply to this service are therefore:** user profiles; users without accounts; and
child users. **Three.**

"User profiles" is ticked on a thin basis and the basis is recorded so it can be checked: v1 has accounts
but no profile page, and CAN-17 permits "public Orderings and attribution", so a public Ordering carries
an author attribution. That attribution is the profile.

That is a very short list, and the absence of the others is the single most important input to Step 2.

> **One thing displayed on the service is not user-generated content**: Snapshots hold TMDB's payload
> verbatim (CAN-26), which includes synopsis text, and that text may be rendered. It is **provider
> content** sourced from a curated third-party database, not content authored by a user, so it is outside
> the user-to-user duties. It is noted here so the assessment is not read as claiming every word on the
> page was written by an account holder.

## Step 2 — Risk of each kind of priority illegal content

All 18 kinds are assessed separately, with the three CSEA sub-categories assessed separately again, and
"other illegal content" assessed collectively (Part 2 §2.17). Levels are negligible / low / medium / high.

Where evidence is not conclusive, the higher level has been taken (Part 3 §3.3). **Small user numbers
have not been treated as a reason for a lower level anywhere in this assessment**: Ofcom's guidance is
explicit that severity can produce a medium or high impact "even if the number of individuals affected is
low", and its own worked negligible example is a service with roughly 10 million users where the harm had
no mechanism. Every negligible finding below rests on an absent mechanism, never on size.

| # | Kind | Level | Reasoning |
| --- | --- | --- | --- |
| 1 | Terrorism | **Low** | Text-based promotion is possible in principle. No image or video upload, no messaging, no search over others' content and no linkification, so there is no dissemination or recruitment channel. No evidence of any such content. Mitigated by review, reporting and takedown |
| 2a | CSEA — grooming | **Low** | No direct messaging, no user connections, no comments, no closed groups. Ofcom's own worked low-risk grooming example is an individually-run public site with no direct messaging, which is this service's shape. Contact between users is not possible by any route |
| 2b | CSEA — CSAM imagery | **Negligible** | No image or video upload exists anywhere in the service and no media bytes are stored. The harm has no mechanism by means of this service |
| 2c | CSEA — CSAM URLs | **Low** | **Assessed separately from 2b and deliberately not treated as negligible.** The no-upload argument does not carry here: a URL is text, and free-text fields accept text. Mitigated by non-linkification, by a corpus small enough to review, and by reporting and takedown. Reassess immediately if free text is ever linkified |
| 3 | Hate | **Low** | A pure-text offence with a genuine vector: Arguments are opinionated prose about works and their creators, and public Visibility carries that text to any reader. No mechanism argument is available. Mitigated by prohibition in the terms, review, reporting and takedown |
| 4 | Harassment, stalking, threats and abuse | **Low** | Also pure text. There is no direct channel to a target — no messaging, no comments, no mentions — so content can be *about* a person but cannot be *sent to* them. This materially limits the harm without eliminating it |
| 5 | Controlling or coercive behaviour | **Negligible** | The offence requires a repeated course of conduct against a person in a relevant relationship, which needs a communication channel between two people. The service provides none: no messaging, no connections, no groups, no comments |
| 6 | Intimate image abuse | **Low** | No image upload, so the imagery route is absent. Text describing a person, or a URL, remains possible. Interlocks with the `s.20A` reporting route and the 48-hour takedown duty in `s.10(3A)`, both of which are implemented regardless of this level |
| 7 | Extreme pornography | **Negligible** | The offence concerns the image itself. No image or video can be uploaded, and no media bytes are held or served (ADR-0006). The catalogue may record adult works as text, which is not this offence, and artwork on adult-flagged records is never publicly displayed — see the children's risk assessment for that constraint |
| 8 | Sexual exploitation of adults | **Low** | No marketplace, listings, payments or messaging, so the advertising and contact routes are absent. Text remains possible |
| 9 | Human trafficking | **Low** | As above: no marketplace, no listings, no messaging, no closed groups. No recruitment or coordination channel |
| 10 | Unlawful immigration | **Low** | No marketplace, no messaging. Text-based promotion possible in principle only |
| 11 | Fraud and financial offences | **Low** | No marketplace, no payments, no advertising, no messaging and no linkification, which together remove the usual delivery routes for fraud |
| 12 | Proceeds of crime | **Low** | As above. No listings, no payments, no linkification |
| 13 | Drugs and psychoactive substances | **Low** | No marketplace, no listings, no messaging, no linkification |
| 14 | Firearms, knives and other weapons | **Low** | As above. Note the V2.0 profile change adding this harm to file-sharing services; this service is not one and stores no files |
| 15 | Encouraging or assisting suicide and serious self-harm | **Low** | Text-only and severe. The re-posting and forwarding factor Ofcom associates with this harm is **absent** at launch, since Fork is out of scope, and there is no recommender or amplification of any kind. The level is low rather than negligible anyway, because severity means a small number of instances would defeat a low finding and text is always possible. Mitigated by prohibition in the terms, by a reviewable corpus, and by reporting and swift takedown. **The most important harm on this list to keep under review** |
| 16 | Foreign interference | **Low** | Ofcom associates this harm with re-posting and forwarding, which is absent at launch. No recommender, no virality mechanics, no search over others' content, so there is no amplification route. Authored text remains possible |
| 17 | Animal cruelty | **Low** | Typically image or video content, which cannot be uploaded. Text remains possible |
| 18 | Cyberflashing | **Negligible** | The offence is sending a photograph or film of genitals to another person. The service has neither image sending nor any user-to-user delivery channel. Ofcom associates this harm with social media, messaging, direct messaging and image posting, none of which exist here |
| — | Other illegal content | **Low** | Assessed collectively, as Part 2 §2.17 permits. No knowledge, experience or evidence of any specific non-priority offence arising. The same text-only vector and the same mitigations apply |

**Overall: low or negligible for all 18 kinds.** On Ofcom's classification the service is therefore
**smaller** (well under 7 million monthly active UK users) and **low-risk** (low for all kinds), and is
**not multi-risk**. This determines the Code measures in Step 3.

### Existing controls relied on

**Two kinds of control appear here, and the distinction is load-bearing.** Most are **absences** —
mechanisms the service does not have — and an absence is true of `main` the moment it is written down.
Two are **things that must be built**, and they are marked as such rather than asserted, because a
control claimed but not shipped is worse evidence than one honestly deferred. Neither absence nor
deferral changes a level below; the two built controls are what hold several *low* findings at low once
there is content, so the gate that keeps content out until they exist is part of the control.

| Control | What it mitigates | Effect on levels | Built? |
| --- | --- | --- | --- |
| No image, video or file upload | CSAM imagery, extreme pornography, intimate image abuse, animal cruelty, cyberflashing | The basis of three negligible findings (2b, 7 and 18) | Absence |
| No messaging, connections or comments | Grooming, controlling or coercive behaviour, harassment delivery, trafficking coordination | The basis of one negligible finding and a limiting factor on several low ones | Absence |
| No marketplace, payments or advertising | Fraud, proceeds of crime, drugs, weapons, sexual exploitation, trafficking | Holds these at low rather than higher | Absence |
| User free text not linkified | CSAM URLs, terrorism, drugs, weapons, fraud | Removes the hyperlinking risk factor entirely | **Not yet — CAN-27**, which carries it as an acceptance criterion and a test. There is no free text on `main` to render, so nothing is linkified today; what CAN-27 owns is that it stays that way |
| No recommender or engagement ranking | Foreign interference, suicide and self-harm, hate | Removes amplification | Absence |
| A corpus small enough for the operator to review | All | Reviewability in full, which is what makes reactive moderation adequate at this size. **The provider's own reasoning, not a position attributed to Ofcom** | Absence, and reviewed at each risk-assessment review |
| All shared content is public; no closed groups | CSEA, hate | Ofcom treats unreviewed closed groups as a high-risk factor; their absence reduces risk | Absence |
| Admin takedown, recorded as an Operation with an audit entry | All | Enables the swift takedown in ICU C2 | **Not yet — CAN-32 Roles, takedown, and the Online Safety Act surfaces**. No `admin` role and no audit entry exist on `main`; `story` has carried a Visibility since CAN-23, but nothing can change one. The Code measures register records ICU C2 and PCU C2 as not in effect for the same reason |

## Step 3 — Measures

The ICU measures binding a smaller, low-risk service are recorded separately in
[`code-measures-register.md`](code-measures-register.md), each with its description, its Code reference
and the date it takes effect. **Most are recorded there as not yet in effect**, because `main` has no
accounts and so no user-generated content: the register's own *What the `Effective` column means* section
says which ticket each one waits on, and the URL-sharing gate is what keeps user content from arriving
before they do.

**One alternative measure is taken: ICU D2.2(a), a per-item report control, is not adopted at launch.**
In its place the reporting route is published as an address reachable without an account.

That record is [`alternative-measures-record.md`](alternative-measures-record.md), and it is a separate
file rather than a paragraph here because it satisfies a **different duty**. `s.23(3)` — which this
assessment and the register discharge — records measures *taken*. `s.23(4)` records the Code measures
*not* taken, the alternatives, and how those alternatives amount to compliance; `s.23(5)` adds the
`s.10(4)` and `s.12(8)` areas; and `s.49(5)` requires particular regard to freedom of expression and
privacy whenever a provider complies otherwise than by a Code measure. None of that is a `s.23(3)` record,
and an earlier version of this section cited `s.23(3)` for it, which was wrong.

Otherwise every applicable Code measure is adopted, with one exception:
**ICU D13 is not adopted.** D13 is permissive rather than mandatory — it allows a provider to decline
manifestly unfounded complaints — and relying on it would require a written policy, a mis-identification
monitoring process, an annual review and a change record. At this service's expected complaint volume
that costs more than handling every complaint on its merits, which is what will be done. **Declining a
permission is not an alternative measure** and needs no `s.23(4)` record: there is no Code measure
standing unmet in its place.

**No proactive technology within `s.231` is used.** This is recorded positively so that ICU D11's trigger
is documented as never firing rather than merely unexercised.

> **What the terms of service say about it is voluntary, and should not be read as compelled.** `s.10(7)`
> requires terms giving information about "**any proactive technology used** by a service for the purpose
> of compliance with a duty set out in subsections (2) to (3A)". A service that uses none owes nothing
> under `s.10(7)`, and ICU D11 requires no terms-of-service provision at all — it is about what to do with
> a complaint *about* proactive technology. The statement in the terms is published anyway, because a
> stated absence is checkable by a reader and an unstated one is not, and because it is what makes the
> commitment to say so if that ever changes meaningful. An earlier version of this section said the
> statement was made "as `s.10(7)` requires", which was wrong.

## Step 4 — Review

Recorded in [`review-policy.md`](review-policy.md). In summary: reviewed at least every 12 months;
re-assessed **before** any significant change to the design or operation of the service; re-assessed when
Ofcom materially changes a relevant Risk Profile.

**Changes that would require this assessment to be redone before they ship**, identified during it:

- **Shipping Fork** ([CAN-9](https://linear.app/jacobrees-canoncore/issue/CAN-9)) — it is a re-posting
  and forwarding mechanism, which Ofcom associates with intimate image abuse, suicide and serious
  self-harm, and foreign interference. **This is the most likely of these changes to actually happen**,
  and the assessment must be redone before it goes live.
- Adding image, video or file upload — would reopen three negligible findings (2b, 7 and 18).
- Adding direct messaging, comments, mentions or user connections — would reopen grooming and
  controlling or coercive behaviour.
- **Linkifying user free text** — would switch on the hyperlinking risk factor and reopen CSAM URLs.
  **This constraint is owned by
  [CAN-27 Orderings and Placements, and the imported broadcast Ordering](https://linear.app/jacobrees-canoncore/issue/CAN-27)**,
  which since 12 August 2026 carries both the prohibition ("no `dangerouslySetInnerHTML`, no markdown
  renderer and no autolinking") and a test asserting that a URL typed into an Argument renders as text and
  produces no anchor element. That test is what this finding rests on; an earlier version of this section
  recorded the constraint as unowned.
- Adding search across other users' content.
- Adding a recommender, ranking or engagement signal.
- Adding a marketplace, listings or payments.
