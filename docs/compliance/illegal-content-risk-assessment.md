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
| Revised | 16 August 2026 — the terms amendment of that date, and why it triggers no redo, recorded in Step 4. Carried by [CAN-81 Disclose Sentry's US error storage in the terms of service](https://linear.app/jacobrees-canoncore/issue/CAN-81). No level or finding changed |
| Revised | 17 August 2026 — **redone under `s.9(4)`**, before the ingress it assesses can ship. Carried by [CAN-108 Re-assess the illegal-content risk before a user can paste an arbitrary Provider URL](https://linear.app/jacobrees-canoncore/issue/CAN-108). **No level moved.** What did: text imported through a *pasted* Provider is classified as user-generated content, Step 1's *Finding or encountering content* answer is re-derived rather than carried forward, finding 2c is assessed on that route separately, the non-linkification control is widened from user free text to everything rendered, and whether pasted Providers are moderated is decided |
| Revised | 17 August 2026 — **accounts ship, and the non-linkification control is narrowed in wording only.** Carried by [CAN-24 A signed-in and a signed-out path](https://linear.app/jacobrees-canoncore/issue/CAN-24). **No level, finding or answer changed, and no `s.9(4)` redo is owed** — the reasons are in Step 4, under *Why shipping accounts triggers no redo* and the linkification bullet |
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
- **Imported text** — a person may bring a third party's prose about a work into their own
  Catalogue, through a **Provider**, which is the only way this application reaches any Source
  ([ADR-0014](../adr/0014-shell-providers-and-per-source-retention.md)). **There are two routes and
  the difference between them carries this revision**: a *Listed* Provider is one this project
  writes and runs, and a *pasted* one is any URL a person types in.

Those four, together, are what make this a user-to-user service: one person authors or imports, sets
a record public, and another person encounters it.

> **The pasted route does not exist yet, and that is why this assessment was redone now.**
> [CAN-113 Add a Provider by pasting its URL](https://linear.app/jacobrees-canoncore/issue/CAN-113)
> builds it, and `s.9(4)` requires the assessment to be redone **before** a significant change to
> the design or operation of the service ships rather than after it. Pasting an arbitrary URL is
> one: it is a route by which text nobody here has seen reaches a rendered page. CAN-113 carries
> the gate as its own last acceptance criterion, so the order is recorded in the ticket that could
> break it as well as in this one.

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
- **Nothing any other party wrote is hyperlinked**, so a URL reaching a page is not followable from
  it. It is an absence in the sense that matters — JSX escapes what it interpolates, so an anchor has
  to be reintroduced deliberately — rather than a feature. Two revisions have moved this wording and
  neither moved what it protects:
    - **Until 17 August 2026 it read "user free text"**, which left a Provider's prose outside a
      control several findings rest on. Widening it to everything rendered is what CAN-108 Re-assess
      the illegal-content risk before a user can paste an arbitrary Provider URL did.
    - **Later the same day it stopped saying "nothing rendered"**, because
      [CAN-24 A signed-in and a signed-out path](https://linear.app/jacobrees-canoncore/issue/CAN-24)
      gives the product its first navigation: a page has to be able to link to `/sign-in`. **The
      clause that carries the finding is the second one** — *a URL reaching a page is not followable
      from it* — and an `href` that is a string literal in this repository is not a URL that reached a
      page. So the control is now stated by **origin** rather than by counting anchors, and the
      assertion behind it is stricter than it was: every rendered `href` must be one of a closed set
      of this application's own routes, which no value from a Source, a Provider or a person can be.
      *Existing controls relied on* below records how much of it is built.

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
| Finding or encountering content | **None of the above** — re-derived on 17 August 2026 rather than carried forward, because the old answer's second half was scoped to user text. Both limbs are worked through in *Finding or encountering content, re-derived* below |
| Content or network recommender systems | **No** |

**The risk factors that apply to this service are therefore:** user profiles; users without accounts; and
child users. **Three.**

"User profiles" is ticked on a thin basis and the basis is recorded so it can be checked: v1 has accounts
but no profile page, and CAN-17 permits "public Orderings and attribution", so a public Ordering carries
an author attribution. That attribution is the profile.

That is a very short list, and the absence of the others is the single most important input to Step 2.

### What counts as user-generated content here

Not every word on a page was written by an account holder, and the assessment has never claimed
otherwise. **What changed on 17 August 2026 is that the answer stopped being the same for both
import routes.**

`s.55(3)` is the test, and it has two limbs: content "generated directly on the service by a user of
the service, or uploaded to or shared on the service by a user of the service", **and** content "that
may be encountered by another user, or other users, of the service by means of the service"
([s.55](https://www.legislation.gov.uk/ukpga/2023/50/section/55), read 17 August 2026). `s.55(2)`
builds **regulated** user-generated content out of that definition by subtracting seven categories,
and the Part 3 user-to-user duties run on the result — so text that never satisfies `s.55(3)` never
reaches the subtraction at all.

- **A Listed Provider's text is not user-generated content.** A Snapshot holds what a Source *this
  project* chose, vouches for and reaches through a Provider it runs last said — TMDB's payload
  verbatim, synopsis included ([CAN-26 Import a series from TMDB, with the overlay behind
  it](https://linear.app/jacobrees-canoncore/issue/CAN-26)). The person picked a work to catalogue,
  not a service to trust, and nobody uploaded or shared the prose. `s.55(3)(a)` is not satisfied.
- **A pasted Provider's text is user-generated content.** The person chose a stranger's service and
  directed this one to fetch its prose, which is text "shared on the service by a user" however
  automatically the fetch then runs; and the moment they set the record public, `s.55(3)(b)` is
  satisfied too. **Both readings are arguable, and the conservative one is taken** — the same posture
  this assessment takes on levels under Part 3 §3.3, applied to a classification rather than to a
  level. `s.55(7)` points the same way within its own subsection: "content that is user-generated
  content in relation to a service is not to be regarded as provider content in relation to that
  service."

**The line is who chose the Source, not who ran the fetch**, because both routes fetch with this
service's own software and neither is a person typing prose.
[ADR-0014](../adr/0014-shell-providers-and-per-source-retention.md) draws the same line for an
unrelated reason — "Listed is a real boundary: anything off it is a stranger's service however
familiar the Source behind it looks" — and it turns out to be the line the duties fall along too.

> **An earlier version of this note reached the right answer by the wrong instrument**, calling a
> Snapshot's text "provider content" and concluding it was outside the user-to-user duties. The
> conclusion holds, but `s.55(7)` defines that term **for the purposes of `s.55(6)`**, which is the
> exclusion for comments and reviews on provider content — not a general category that content can
> be sorted into. `s.55(3)` is what does the work, and it does it by not being satisfied. *(Corrected
> 17 August 2026.)*

### Finding or encountering content, re-derived

Ofcom's question 7 is "Does my service have any of the following functionalities that allow users to
find or encounter content?", with two limbs: **7a, searching for user-generated content** and **7b,
hyperlinking** (*Risk Assessment Guidance and Risk Profiles* V2.0, 25 June 2026, Part 3 Section 1).
Both are still **No**. The 7a answer survives untouched; the 7b answer does not, and it is the one
this revision had to re-derive.

**7a — no.** Unchanged. A pasted Provider is reached by its URL, not found by
searching, and what a person searches *through* it is that Source's own catalogue rather than
anything another user of this service generated. There is still no search across other users'
content.

**7b — no, on a control that now covers the text in question.** The previous answer read "no
hyperlinking, because **user free text** is not linkified". A Provider's prose is not user free text,
so on the pasted route that sentence answered a question nobody had asked; the control has been
widened to everything rendered, and 7b is answered on the widened one. The pasted URL itself is not
the functionality either: a person types it into their own account to say where their records come
from, and `s.55(3)(b)` fails on it, because it is not content another user encounters by means of the
service.

> **Answering *No* to 7b removes the functionality, not the behaviour, and finding 2c is where that
> is carried.** Ofcom's own description of the risk factor is that "perpetrators use hyperlinks **and
> plain-text URL linking** to share illegal images among themselves on various types of services"
> ([V2.0](https://www.ofcom.org.uk/siteassets/resources/documents/online-safety/information-for-industry/illegal-harms/updates/risk-assessment-guidance-and-risk-profiles.pdf),
> risk factor 7b, *Hyperlinking*, read 17 August 2026). A URL that is not clickable can still be read
> and retyped.
> That is why 2c is low rather than negligible, and why non-linkification is never cited below as
> though it were the whole of the mitigation.

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
| 2c | CSEA — CSAM URLs | **Low** | **Assessed separately from 2b, deliberately not treated as negligible, and re-assessed on the pasted-Provider route on 17 August 2026.** The no-upload argument does not carry here: a URL is text, and text is what a free-text field and a Provider's payload both carry. Mitigated by non-linkification — which since 17 August covers text of any origin rather than user text alone — by a corpus small enough to review, and by reporting and takedown. **The two routes are held apart in [Finding 2c on the pasted-Provider route](#finding-2c-on-the-pasted-provider-route)**, because non-linkification is the only mitigation they share. Reassess immediately if anything rendered is ever linkified |
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

### Finding 2c on the pasted-Provider route

**Assessed on this route specifically rather than folded into the row above.** The two routes share
exactly one mitigation — non-linkification — and it is the one that had to be widened before it
reached this route at all. Folding them together would have concealed precisely that.

**The route, stated so the level can be argued about rather than asserted.** A person pastes the URL
of a service nobody here has reviewed; the application speaks the published contract to it and stores
what it returns as a Snapshot; that text is rendered on their records; and a reader encounters it if
and when the person sets a record public. Anywhere in that chain the returned prose may contain a
CSAM URL, and nothing upstream of this service was in a position to notice.

**Why it is low rather than medium**, in the order the arguments actually carry weight:

1. **It is the same two deliberate acts as the route already assessed, with a longer way round.**
   Reaching a reader takes an account holder choosing a hostile Provider *and* publishing a record.
   Typing the URL into an Argument takes authoring it *and* publishing. A stranger's service in the
   middle changes who composed the text, not how many decisions stand between it and a reader.
2. **Non-linkification now covers it**, which it did not before this revision. That is a real change
   in the mitigation rather than a restatement of it.
3. **There is no discovery route to a stranger's public record**: no search across other users'
   content, no feed, no recommender. A public record is reached by someone who already has its URL.
4. **Reporting and takedown reach the whole route rather than a symptom.** Takedown is the record's
   Visibility going private, and its Snapshots are readable only while the Story is
   (`snapshot_readable_when_its_story_is`), so what the Provider supplied goes down with what it was
   attached to and there is no orphan to sweep up separately.

**Why it is not negligible.** The mechanism exists. A negligible finding in this assessment always
rests on an absent mechanism, and here the text arrives, is stored and is rendered; only its
clickability is removed, and Ofcom's own evidence for risk factor 7b names plain-text URL linking.

**Which control this route actually strains, stated rather than glossed.** It is *a corpus small
enough for the operator to review* — the one control that scales with volume rather than with design.
A person types free text at typing speed; a Provider returns it at fetch speed. What holds the
control at v1 is that import is per record, so what arrives is bounded by what its owner chose to
catalogue. **That bound is a property of what is built, not a promise**, which is why it appears in
the reassessment triggers in Step 4 rather than only here.

**No review of the Provider itself is relied on anywhere above.** There is none, by decision — see
*Pasted Providers are not moderated; their content is* in Step 3 — and a finding that quietly assumed
one would be the worst kind of wrong here.

### Existing controls relied on

**Two kinds of control appear here, and the distinction is load-bearing.** Most are **absences** —
mechanisms the service does not have — and an absence is true of `main` the moment it is written down.
Two are **things that must be built**, and they are marked as such rather than asserted, because a
control claimed but not shipped is worse evidence than one honestly deferred. **One of those two is
now partly in effect**: from this revision the non-linkification prohibition is enforced by lint over
every `.ts` and `.tsx` file under `apps/web/src`, while the surfaces it protects are still being
built, and the
`Built?` column says that in those words rather than rounding it to a yes or a no. Neither absence nor
deferral changes a level below; the two built controls are what hold several *low* findings at low once
there is content, so the gate that keeps content out until they exist is part of the control.

| Control | What it mitigates | Effect on levels | Built? |
| --- | --- | --- | --- |
| No image, video or file upload | CSAM imagery, extreme pornography, intimate image abuse, animal cruelty, cyberflashing | The basis of three negligible findings (2b, 7 and 18) | Absence |
| No messaging, connections or comments | Grooming, controlling or coercive behaviour, harassment delivery, trafficking coordination | The basis of one negligible finding and a limiting factor on several low ones | Absence |
| No marketplace, payments or advertising | Fraud, proceeds of crime, drugs, weapons, sexual exploitation, trafficking | Holds these at low rather than higher | Absence |
| **Nothing any other party wrote is linkified** | CSAM URLs, terrorism, drugs, weapons, fraud | Answers risk factor 7b — with the caveat under *Finding or encountering content, re-derived* about what answering *No* does not remove | **Partly, and the assertion strengthened on 17 August 2026.** The *prohibition* is origin-blind over every `.ts` and `.tsx` file under `apps/web/src`: [`apps/web/eslint.config.mjs`](../../apps/web/eslint.config.mjs) carries `react/no-danger`, which is a real guard because JSX escapes what it interpolates, and a restricted-import group naming the markdown renderers and autolinkers most likely to be reached for. **That group matches package names, so it is a tripwire and not a proof** — a renderer it does not name gets through, and an `<a href>` written by hand gets past both rules. The *rendered assertion* is [`no-linkification.test.tsx`](../../apps/web/src/app/no-linkification.test.tsx), which is the only check that sees any of that. **It no longer counts anchors; it pins the exact set of them**, because CAN-24 A signed-in and a signed-out path gave the product its first navigation and an assertion of *zero* anchors would have been failed by a link to `/sign-in`. Every rendered `href` must now be one of a closed list of this application's own routes, so a data-derived `href` fails whether or not it looks like a link — which is a stronger property than the count it replaced, and the one the finding actually needs. It covers the three surfaces drawing text today (the front page signed in and signed out, and both forms); CAN-27 (Ordering and Story pages), CAN-26 (a Listed Provider's prose) and CAN-113 (a pasted one's) each add their own |
| No recommender or engagement ranking | Foreign interference, suicide and self-harm, hate | Removes amplification | Absence |
| A corpus small enough for the operator to review | All | Reviewability in full, which is what makes reactive moderation adequate at this size. **The provider's own reasoning, not a position attributed to Ofcom.** It is also the one control here that scales with volume rather than with design, so an import route is what strains it — *Finding 2c on the pasted-Provider route* says how, and Step 4 carries the trigger | Absence, and reviewed at each risk-assessment review |
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

### Pasted Providers are not moderated; their content is

**Decided 17 August 2026**, because the question has to have an answer rather than an assumption.
[ADR-0014](../adr/0014-shell-providers-and-per-source-retention.md) rejects a community registry, and
a registry is a moderation commitment; refusing one and then leaving the posture unstated would read
as a commitment nobody had written down.

**A pasted Provider is never reviewed, listed, allowlisted or vouched for.** There is no queue it
passes through and no state in which the product says it is safe. What is moderated is the
**content** — under ICU C1 and C2 and PCU C1 and C2, identically to content an account holder typed,
which is what the classification in *What counts as user-generated content here* makes it. The
operator assesses it against the terms by the C1.3(b) route and acts by setting the record's
Visibility to private.

**Three things make that sufficient rather than merely convenient:**

1. **A duty attaches to content, not to a supplier of it.** The `s.10` duties are about illegal
   content present on the service, and no measure this service is bound by — the whole applicable set
   is in [`code-measures-register.md`](code-measures-register.md) — asks a provider to vet where
   content came from.
2. **Nothing a stranger's Provider returns reaches a reader unless an account holder decides it
   should.** They chose the URL, and their Catalogue is private until they set a record public. The
   choice and the publication are both theirs, and both are already the acts the rest of this
   assessment is built on.
3. **Takedown reaches the route rather than a symptom of it.** Visibility going private takes the
   Snapshots out of public view with the record, because a Snapshot is readable only while its Story
   is, so nothing the Provider supplied stays reachable by another path once the record is down.

**Rejected: an operator blocklist of Provider URLs**, refusing a named service for everyone once it
is found to carry illegal content. It is a moderation commitment on Providers rather than on content
— what a registry is refused for, arrived at from the other end — and it needs a build, a register
row, and a written policy for how a URL gets onto the list and off it again. The takedown that exists
already reaches the same content, on the records of the person who actually imported it, without any
of that. **It is the first thing to build if a reassessment trigger in Step 4 fires**, and it is
recorded here so that the option is on the record rather than reinvented under pressure.

**Rejected: reviewing each pasted URL before the application will speak to it.** That is a registry
by another name. ADR-0014 refuses it, CAN-113 Add a Provider by pasting its URL is shaped against it,
and [ADR-0003](../adr/0003-no-shared-catalogue.md) has already refused the same commitment on the
catalogue, where a quorum of one is theatre.

**No Code measure and no alternative measure follows from this decision.** Nothing here declines a
measure the Codes recommend, so `s.23(4)` has nothing to record and the `s.23(3)` register gains a
pointer rather than a row. **Which is the reason for writing it down at all**: with the posture
unstated, a reader cannot tell a decision from an omission.

## Step 4 — Review

Recorded in [`review-policy.md`](review-policy.md). In summary: reviewed at least every 12 months;
re-assessed **before** any significant change to the design or operation of the service; re-assessed when
Ofcom materially changes a relevant Risk Profile.

**Changes that would require this assessment to be redone before they ship**, identified during it:

- **Shipping Fork** ([CAN-9](https://linear.app/jacobrees-canoncore/issue/CAN-9)) — it is a re-posting
  and forwarding mechanism, which Ofcom associates with intimate image abuse, suicide and serious
  self-harm, and foreign interference. **This is the most likely of the changes still outstanding** —
  the pasted-Provider item below was the other candidate, and it is discharged — and the assessment
  must be redone before it goes live.
- **Accepting a pasted third-party Provider URL**
  ([CAN-113 Add a Provider by pasting its URL](https://linear.app/jacobrees-canoncore/issue/CAN-113))
  — arbitrary text from a service nobody here has reviewed reaching a rendered page. **This is the
  change the 17 August 2026 revision was done for**, and it is listed rather than struck out so the
  *next* move along the same axis is caught by this record instead of by memory. **Four such moves,
  each of which needs this assessment redone again:** importing from a pasted Provider in bulk or on
  a schedule rather than a record at a time chosen by its owner, which is the bound
  *Finding 2c on the pasted-Provider route* rests on; adopting a registry, a blocklist or any other
  review of Providers, which would reverse the posture decided in Step 3; rendering a Provider's
  prose anywhere the controls above do not reach; and any Provider-supplied value becoming
  displayable without a declared classification behind it, which the children's assessment owns.
- Adding image, video or file upload — would reopen three negligible findings (2b, 7 and 18).
- Adding direct messaging, comments, mentions or user connections — would reopen grooming and
  controlling or coercive behaviour.
- **Linkifying anything this service did not author** — would switch on the hyperlinking risk factor
  and reopen CSAM URLs. *(This read "user free text" until 17 August 2026, which left a Provider's
  prose outside it; the gap that widening closed is what CAN-108 Re-assess the illegal-content risk
  before a user can paste an arbitrary Provider URL was raised for. Later the same day it stopped
  reading "anything rendered", because CAN-24 A signed-in and a signed-out path ships a link to
  `/sign-in`; the substance is unchanged and the assertion behind it is stricter — see the control's
  row, and the second sub-bullet under *Functionality the service does not have*.)* **What is now
  listed here is the change to watch for: an `href` derived from a value rather than written as a
  literal.** That is the move this record exists to catch, and adding a route to the closed list is
  not it. What holds it, and how far each half reaches, is the *Nothing any other party wrote is
  linkified* row in *Existing controls relied on*; the rendered assertion is
  [`no-linkification.test.tsx`](../../apps/web/src/app/no-linkification.test.tsx). **Each surface adds
  its own case to that file rather than arguing from another's**:
  [CAN-27 Orderings and Placements, and the imported broadcast Ordering](https://linear.app/jacobrees-canoncore/issue/CAN-27)
  the Ordering and Story pages, which is where it carries the prohibition and a test for a URL typed
  into an Argument;
  [CAN-26 Import a series from TMDB, with the overlay behind it](https://linear.app/jacobrees-canoncore/issue/CAN-26)
  a Listed Provider's prose; and
  [CAN-113 Add a Provider by pasting its URL](https://linear.app/jacobrees-canoncore/issue/CAN-113)
  a pasted one's.
- Adding search across other users' content.
- Adding a recommender, ranking or engagement signal.
- Adding a marketplace, listings or payments.

> **Why shipping accounts triggers no redo, though it is the largest change so far.**
> [CAN-24 A signed-in and a signed-out path](https://linear.app/jacobrees-canoncore/issue/CAN-24)
> ships the accounts this assessment has described since it was written: *Accounts — anyone may sign up
> with an email address and a password (CAN-24)* is the first bullet of *The service being assessed*, and
> the first risk factor in Step 1 is ticked on their existence. **`s.9(4)` requires a redo before a
> significant change to the design or operation of the service, and this is a change to neither** — it
> makes a described mechanism real. An assessment that had to be redone at the moment its own subject
> arrived would be an assessment written about the wrong service.
>
> **What was checked before saying so**, because the claim is easy to make and this list is the place it
> would be wrong: every entry above and in the children's assessment was read against the change. None is
> engaged. No upload, messaging, connection, search, recommender or marketplace mechanism is added; Fork
> is untouched; and the one entry that *is* engaged, linkification, is engaged in wording only and is
> recorded in its own bullet. **Two things that might look like triggers are not.** The service still
> carries no content from any account other than the operator's, because nothing in this release creates
> a record — that is worked through in
> [`csea-reporting-procedure.md`](csea-reporting-procedure.md) → *The revisit of 17 August 2026*, which
> corrects a criterion on CAN-24 that claimed otherwise. And an account now stores a name and an email
> address, which are personal data and are **not** user-generated content under `s.55(3)`: no page renders
> either to anybody but their owner, so neither can be encountered by another user.
>
> **What it does move is the URL-sharing gate**, which tightens rather than opening:
> `docs/infrastructure.md` → *Gate one: lawfulness* records that the sentence *nobody but the operator can
> put content here* stops resting on the absence of accounts from this date.

> **The terms amendment of 16 August 2026 is on neither this list nor the children's additions to
> it.** It added a data-location disclosure for error reporting to
> [`terms-of-service.md`](../../content/legal/terms-of-service.md) → *Your privacy, and where your
> data is held*, and changed no prohibition, no minimum age and no functionality of the service. Both
> lists were checked before it shipped, which is the check
> [`childrens-risk-assessment.md`](childrens-risk-assessment.md) → *Step 4 — Review* records for the
> amendment of 14 August 2026. Carried by [CAN-81 Disclose Sentry's US error storage in the terms of
> service](https://linear.app/jacobrees-canoncore/issue/CAN-81).
