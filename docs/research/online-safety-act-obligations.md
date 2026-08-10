# Online Safety Act obligations

Researched 10 August 2026 for [CAN-21](https://linear.app/jacobrees-canoncore/issue/CAN-21). Primary
sources only: the **revised** text on legislation.gov.uk (the as-enacted text is now wrong in several
places that matter here) and Ofcom's own guidance, codes and templates.

Nothing here was written by reading any earlier attempt at this product. Searches were domain-restricted
to `legislation.gov.uk`, `ofcom.org.uk` and `gov.uk`, so no such result could surface.

> **This is evidence, not a decision.** It records what the law requires and what Ofcom's guidance says.
> What CanonCore chooses to do about it belongs in the ticket and in an ADR.

## The five things CAN-21 does not currently know

1. **The Act was amended on 29 June 2026.** The Crime and Policing Act 2026 (c. 20), ss. 100–101,
   commenced by S.I. 2026/689 reg. 2(1)(j), inserted **s.20A** (intimate image content reports),
   **s.10(3A)–(3B)** (a **48-hour** takedown clock) and **s.21(2A)** (expedited complaints), and rewrote
   **s.10(5)**. No size or risk threshold. In force now.
2. **A CSEA reporting duty to the National Crime Agency came into force on 7 April 2026** — s.66,
   commenced by S.I. 2026/262, with detail in S.I. 2026/268. It applies regardless of service size or
   assessed CSEA risk, and carries an advance NCA registration step and data-retention expectations.
3. **The children's access assessment (s.35/s.36) is mandatory for every Part 3 service**, and skipping
   it is self-punishing: **s.37(4)–(5)** deems the service "likely to be accessed by children" from the
   deadline until it is actually done, which switches on the s.11 and s.12 children's duties.
4. **There are 18 kinds of priority illegal content, not 17**, since Ofcom's statement and Risk
   Assessment Guidance **V2.0** of 25 June 2026.
5. **s.71 does not apply** — it is a Category 1 duty. The terms-of-service requirements that bind us are
   **s.10(5)–(8)** and **s.21(3)**.

The ticket names three deliverables. The real set is **nine** (see [Deliverables](#deliverables)).

## 1. Scope: confirmed, and there is no way out short of deleting a feature

**s.3(1)** — a user-to-user service is one "by means of which content that is generated directly on the
service by a user … may be encountered by another user". Titles, notes and Arguments are generated
directly by users; Visibility and Fork mean they may be encountered by others.
([s.3](https://www.legislation.gov.uk/ukpga/2023/50/section/3))

Two sub-sections kill the "we are mostly private" argument outright:

> **s.3(2)** "(a) it does not matter if content is actually shared with another user or users **as long as
> a service has functionality that allows such sharing**; (b) it does not matter **what proportion** of
> content on a service is content described in that subsection."

So private-by-default is worth nothing legally, and shipping the functionality disabled does not help
either — it must genuinely not exist. **The only lever that takes CanonCore out of scope is removing
Visibility and Fork entirely**, which deletes a core feature. Worth stating so the choice is made
knowingly rather than by accident.

**UK links** — s.4(5)(b), the target-market limb, is satisfied and is enough on its own; the "significant
number of users" limb (a) is arguable at low tens but does not need to be reached.

**Schedule 1 exemptions**, all ten walked. Two deserve the operative words:

- **Para 4, "limited functionality"** — the one a catalogue app might hope for. It requires that users can
  communicate **"only"** by commenting/reviewing **provider content**, sharing those comments elsewhere,
  or liking/rating. It fails twice: para 4(3) says "content that is user-generated content in relation to
  a service **is not to be regarded as provider content**", so a user's own Stories and Orderings can
  never be provider content; and independently, **Fork is not one of the permitted modes**, so the word
  "only" defeats it on its own.
- **Para 7, internal business services** — fails the "available only to a closed group" condition. Note
  para 7(3): "business" includes any "other concern (**whether or not carried on for profit**)", so
  being non-commercial helps nowhere.

> **There is no small-service, hobby or non-commercial exemption anywhere in Schedule 1.** Size and
> revenue affect what is *proportionate* under s.10(10)(b) and which Code measures bind. They do not
> affect whether the Act applies.

## 2. The duties that actually bite

The gateway is **s.7(2)**. It is not the whole list: the children's access assessment sits in Chapter 4
and the CSEA duty in Part 4.

| Duty | Section | By when | Artefact |
|---|---|---|---|
| Illegal content risk assessment | s.9 | 3 months from the first day it is a Part 3 service (Sch. 3 Pt 1 para. 3) | Written assessment, all 18 kinds separately |
| Safety duties about illegal content | s.10(2)–(8) | Launch, continuing | Proportionate measures, moderation, ToS provisions |
| **48-hour intimate image takedown** | **s.10(3A)–(3B)** *(new)* | Launch | Documented takedown process with a 48-hour clock |
| Content reporting | s.20 | Launch | Easy route open to **users and non-users** |
| **Intimate image content reports** | **s.20A** *(new)* | Launch | Route capturing the s.20A(2) declarations |
| Complaints procedure | s.21(2)–(4) | Launch | A *procedure*, plus ToS provisions (s.21(3)) |
| **Expedited complaints** | **s.21(2A)** *(new)* | Launch | Faster route for s.20A reporters |
| Freedom of expression and privacy | s.22(2)–(3) | Continuous | Recorded reasoning |
| Record-keeping and review | s.23(2)–(6) | Continuous | Written records; regular review |
| **Children's access assessment** | s.35, s.36 | Same 3 months | Written record "in an easily understandable form" (s.36(7)); repeat at least annually |
| **CSEA reporting to the NCA** | s.66 + S.I. 2026/268 | Launch | NCA registration, named administrator, documented process |

**Ruled out explicitly:** s.71–73 and the user-empowerment, journalistic and democratic-importance duties
are Category 1 only; the categorisation thresholds are missed by roughly six orders of magnitude; the
fees regime is revenue-gated at £250m qualifying worldwide revenue (S.I. 2025/1204) with a further £10m
UK-referable exemption.

### The children's access assessment is the highest-leverage document

**s.35(2)**: a provider "is **only** entitled to conclude that it is not possible for children to access"
the service if age verification or age estimation is used. CanonCore has neither, so *possible* is
settled: yes.

That leaves the **child user condition** (s.35(3)): a significant number of child users, **or** a service
"of a kind likely to attract a significant number of users who are children". s.35(4)(b) says this is
judged "based on evidence about **who actually uses a service, rather than who the intended users** are"
— which a pre-launch service does not have.

> **Open decision, flagged rather than settled.** A Doctor Who catalogue is plausibly "of a kind likely to
> attract" children. Concluding "likely" roughly doubles the document set (it adds a children's risk
> assessment under s.11 and the s.12 duties), but concluding "not likely" without evidence is fragile,
> and s.37(4)–(5) makes the fragile answer the expensive one if it is wrong. **s.12(5) is the escape
> hatch**: prohibiting every kind of primary priority content harmful to children, for all users, in the
> terms of service switches off the s.12(4) requirement to deploy age assurance. That single clause is
> the highest-value paragraph in the whole ToS.

## 3. The illegal content risk assessment

**Governing document:** Ofcom's *Risk Assessment Guidance and Risk Profiles*, currently **V2.0, 25 June
2026**. Resolve it through the [regulatory documents index](https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/online-safety-regulatory-documents)
— Ofcom's own *Illegal content duties* page still links a superseded copy that says "17 kinds".

### The 18 kinds

1. Terrorism · 2. CSEA — with three separate sub-assessments for U2U: **(a) grooming, (b) CSAM imagery,
(c) CSAM URLs** · 3. Hate · 4. Harassment, stalking, threats and abuse · 5. Controlling or coercive
behaviour · 6. Intimate image abuse · 7. Extreme pornography · 8. Sexual exploitation of adults ·
9. Human trafficking · 10. Unlawful immigration · 11. Fraud and financial offences · 12. Proceeds of
crime · 13. Drugs and psychoactive substances · 14. Firearms, knives and other weapons · 15. Encouraging
or assisting suicide **and serious self-harm** · 16. Foreign interference · 17. Animal cruelty ·
**18. Cyberflashing**.

So a complete assessment carries **21 risk levels** for priority content, plus one collective level for
"other illegal content" (which need not be assessed offence by offence — Part 2 §2.17).

The common summary of what changed is wrong and worth getting right: "encouraging or assisting serious
self-harm" was a **brand-new** offence (s.184 OSA 2023, designated December 2025), never one of the old
17, and Ofcom folded it into the existing suicide item — so that change netted zero. **The entire +1 is
cyberflashing** (s.66A Sexual Offences Act 2003).

### What can and cannot be called negligible

The four levels are negligible, low, medium, high, and each of the 18 needs its own justified level. The
tie-break rule should govern the document's whole tone:

> "Where the evidence of risk is not conclusive … we expect providers to **err on the side of caution and
> select the higher risk level**." (Part 3 §3.3)

**"We are tiny" is not a route to negligible.** Ofcom blocks it from four directions: the negligible test
is about structural impossibility ("not possible or extremely unlikely … **by means of your service**"),
not size; Ofcom's only worked negligible example is a service with ~10 million monthly UK users where the
harm has **no mechanism**; its converse example is a 50,000-user forum assessed **high** risk; and
severity overrides volume — medium or high impact can follow "even if the number of individuals affected
is low".

**What CanonCore can defensibly argue, all of it mechanism rather than size:** no image or video upload
and no stored media bytes (bears on CSAM imagery, intimate image abuse, extreme pornography,
cyberflashing); no direct messaging (Ofcom's own low-risk grooming example turns on exactly this); no
marketplace, listings or payments; no recommender or virality mechanics; a corpus small enough for one
person to genuinely review; and — counter-intuitively — **all shared content is public**, which Ofcom
treats as *reducing* risk, its high-risk CSAM example turning on unreviewed "closed user groups", which
CanonCore does not have.

Ofcom's closest published analogue is worth citing directly in the assessment: a voluntary,
individually-run sporting-events site, ~5,000 monthly UK users, all content public, periodic checks by
the operator, a basic reporting system, no direct messaging — assessed **low** risk for grooming.

**What cannot be waved away.** Hate, and harassment/stalking/threats/abuse, are **pure-text** offences,
and Arguments are prose about works, creators and other fans reaching others through public Visibility
and Fork. There is no "no mechanism" argument. Expect **low with stated mitigation, not negligible**.
Same for suicide and serious self-harm, where severity means even a small number of instances defeats a
low finding. And note the asymmetry inside CSEA: **CSAM imagery has a genuine no-upload argument; CSAM
URLs does not** — if free text can carry a followable link, Ofcom's hyperlinking risk factor is engaged.
It would be an error to let the imagery argument carry the URL one.

> **Do not write "free-text fields" and call it an Ofcom risk factor** — the phrase does not appear in the
> guidance. Map it onto the factors Ofcom does name: commenting on content, UGC searching, hyperlinking,
> profiles and anonymity. Public sharing *is* squarely covered, by the re-posting/forwarding factor.

### Deadline

> "**If you start a new service … you must complete your risk assessment within three months of doing
> so.**" (Part 1 §2.19; statutory hook is Sch. 3 Pt 1 para. 3, which Ofcom does not itself cite)

The clock starts **at launch** — the holding page is not a Part 3 service, so nothing is overdue today.
Because launch is after 25 June 2026 the first assessment must cover all 18 from the outset. **The s.10
safety duties are not deferred by the three months**; that period buys time for the assessment, not the
measures. Doing both assessments *before* launch is the right call, and avoids arguing about whether
early post-launch changes are "significant changes" triggering re-assessment.

## 4. The Codes: 14 measures, not the obvious four

CanonCore is **smaller** (under 7 million monthly active UK users) and, if the assessment supports it,
**low-risk** (low for all kinds). That combination binds these:

| Ref | Measure |
|---|---|
| **A2** | Named individual accountable for the illegal content, reporting and complaints duties |
| **C1** | Content moderation function to review and assess suspected illegal content |
| **C2** | Content moderation function allowing swift takedown |
| **D1** | Enabling complaints — all five limbs, from users **and affected persons** |
| **D2** | Complaints systems easy to find, access and use |
| **D7** | Appropriate action on illegal content complaints |
| **D9** | Appeals — determination (the small-service replacement for the D8 performance machinery) |
| **D10** | Appeals — action following determination, including restoring the position |
| **D11** | Complaints about proactive technology |
| **D12** | All other relevant complaints |
| **D13** | Manifestly unfounded complaints — **permissive; recommend not adopting** |
| **G1** | Terms of service: substance |
| **G3** | Terms of service: clarity and accessibility |
| **H1** | Removing accounts of proscribed organisations |

The intuitive short list (accountable individual, complaints tool, ToS, takedown) is right in spirit but
misses the **D9–D13 appeals cluster**, **G3**, and **H1**.

Three things make this tractable for one person:

- **Ofcom expressly permits it.** "If a provider is run by a single individual **nothing in our measure
  prevents that individual from being both the individual accountable and the only member of the senior
  governance body**" (Volume 1 §5.98). The name need not be published or notified to Ofcom, only one
  person may hold it, and it carries no individual liability.
- **C1.3(b) is the small-service route**: where the terms of service prohibit the category, content can
  be assessed against **its own terms** rather than by making a full s.192 illegal content judgement.
  This is why the ToS needs explicit prohibitions.
- **D13 is a trap.** It permits refusing manifestly unfounded complaints, but only with a written policy,
  a mis-identification monitoring process, an annual review and a change record. For a service expecting
  a handful of complaints a year that costs more than simply handling all of them.

**"Swiftly" and "promptly" are undefined**, and the measures that would set numeric targets (C4, C5, D4)
are all excluded for a smaller low-risk service. The only hard number in the regime is the **48-hour**
intimate image takedown. The one place CanonCore *must* set its own is **D12.4(b)** — "timeframes the
provider has determined are appropriate" — so those must be decided and written down.

Record-keeping is per measure: a description, the Code identified, and the date it took effect. There is
**no obligation to record why an inapplicable measure does not apply**.

## 5. Terms of service: the required provisions

From **s.10(5)–(8)**, **s.21(3)**, **ICU G1** and **ICU G3**. Not generic boilerplate, and not a large
platform's terms.

**A. Illegal content protection** — how individuals are protected, addressing both limbs of s.10(3), and
for the "minimise the time present" limb written in **three separate treatments**: terrorism content,
CSEA content, and other priority illegal content. A single merged paragraph does not satisfy "separately".

**B. Intimate image content** *(new)* — how to make an intimate image content report, and the commitment
to take down reported content and "any other content identified by the provider as the same, or
substantially the same" as soon as reasonably practicable and **no later than 48 hours**, subject to the
s.10(3B) exceptions.

**C. Proactive technology** — if none is used, say so explicitly. That statement doubles as the D11
record.

**D. Complaints** — the policies and processes governing handling and resolution, covering all five limbs
of s.21(4): reporting illegal content; complaining that we are not complying with s.10, s.20 or s.22;
**appealing a takedown**; **appealing a warning, suspension, ban or restriction**; and proactive
technology complaints. Plus the expedited route for s.20A reporters, and the D12.4(b) timeframes.

**E. Prohibitions** — not expressly demanded by G1, but load-bearing: a prohibition on illegal content
generally (unlocks the C1.3(b) route), a specific prohibition on proscribed organisation content (unlocks
H1.2(b)), and — **if the children's access assessment concludes "likely"** — a prohibition on every kind
of primary priority content harmful to children, applying to all users, which is what s.12(5) requires to
switch off age assurance.

**F. Form** — clear and accessible; **reachable by the general public without signing in** (G3.2(a)(i),
the most commonly missed); the G1 provisions individually locatable *within* the document via headings;
written to a reading age suitable for the youngest permitted user; keyboard-navigable and
screen-reader-usable. G3 attaches only to the G1 provisions, not to the whole document.

**G. Consistency** — s.10(6) requires the provisions be applied consistently. Operational, not a clause,
but the moderation record should show the same rule producing the same outcome.

**Do not copy from a large platform:** a summary of risk assessment findings, the ss.71–73 machinery, and
user-empowerment/journalistic/democratic-importance provisions are all Category 1 only.

## 6. The reporting address is necessary and not sufficient

| Question | Answer |
|---|---|
| Free of charge? | **No express requirement.** The phrase "free of charge" appears **nowhere in the Act**. The standards are "easy" (s.20(2)) and "easy to access, easy to use … and transparent" (s.21(2)(c)). Free is the right design and effectively compelled, but do not cite a requirement that does not exist. |
| Available to non-users? | **Yes, unambiguously.** s.20(5) defines an "affected person" as someone "**other than a user of the service**". The route cannot be login-gated. |
| Must acknowledge receipt? | **No.** ICU D4, which would require acknowledgement and indicative timeframes, applies only to large or medium/high-risk services. Good practice, not a duty. |
| Response time? | **No numeric one**, except the 48-hour intimate image takedown, which is a *takedown* deadline, not a response deadline. D12.4(b) makes us set our own for other complaints. |

**Three reasons an address alone falls short:**

1. **ICU D2.2(a) requires a per-item control** — "for relevant complaints regarding a specific piece of
   content, a **reporting function or tool is clearly accessible in relation to that content**". That is a
   "Report" affordance on the record itself. A footer address satisfies D2.2(b), for other kinds of
   complaint, but not D2.2(a).
2. **s.21 needs a procedure, not an inbox** — it requires accepting **appeals against our own moderation
   decisions**, both takedowns and account restrictions, with appropriate action taken and the process
   described in the terms. The address is the transport; the procedure is the duty.
3. **Accessibility attaches** — keyboard navigation, screen-reader usability, minimal steps, a
   supporting-information field.

> The existing `mail.canoncore.com` inbox is genuinely useful: it already receives at any local part, so
> distinct addresses can route the different complaint types with no new infrastructure. But it is the
> transport layer, and neither of the parts that actually discharge the duties is an email address.

## 7. Enforcement reality

**Nobody has to tell Ofcom the service exists.** There is no registration regime, and the s.83 fees
notification is revenue-gated far above us.

The penalty headline is "the greater of £18m or 10% of qualifying worldwide revenue" — note that **the
£18m cap does not scale down**, because 10% of nothing gives no relief. In practice the dominant pattern
across Ofcom's issued penalties is **failure to respond to information requests**, which is also the one
genuine criminal exposure for a solo operator: an offence for non-response, and up to two years for
providing false information or destroying material. The practical lesson is narrow and cheap: **if Ofcom
ever writes, answer it.**

## 8. Is there a free service that writes these for us?

Short answer: **no tool writes these documents, and no generator produces a single OSA-specific clause.**
Ofcom's own tools are free and worth one pass each; everything else is either boilerplate or a licence
trap. Both Ofcom tools below were driven end to end as CanonCore, so the runs do not need repeating.

### Ofcom's own tooling — free, no account, no email

| Tool | Verdict |
|---|---|
| [Digital Support Tool](https://www.ofcom.org.uk/os-toolkit/check-how-to-comply) | **Worth one pass, for Step 3 only.** Only Steps 1 and 3 take input; Steps 2 and 4 have zero fields and are reading material. Step 3 asks for a user-band and 21 risk levels, then returns the recommended measures **with Code references and OSA sections already attached** — the exact "description / relevant code / relevant duties" the record-keeping template asks you to log. |
| [Illegal content record-keeping template (ODT)](https://www.ofcom.org.uk/siteassets/online-safety/documents/ofcom-illegal-content-duties-record-keeping-template.odt?v=420212) | **Use it as the assessment's structure.** Already updated to 18 kinds. Header block, Step 1 questionnaires, Step 2 per-harm blocks (risk level / risk factors / additional characteristics / existing controls / evidence), Step 3 measures, Step 4 review. Ofcom's caveat: "using it does not guarantee your compliance." |
| [Children's access assessment tool](https://www.ofcom.org.uk/os-toolkit/child-access-assessment/childrens-access-assessment-tool) | **The best-value thing found.** Output is four real pre-filled ODT files on fixed URLs, not a print dialog. |
| [Regulation Checker](https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/check) | **Skip.** It answers "are you in scope", which §1 already settles. |

The children's access assessment templates, direct: [blank](https://www.ofcom.org.uk/siteassets/online-safety/caa/ofcom-childrens-access-assessment-template-blank.odt) ·
[condition met](https://www.ofcom.org.uk/siteassets/online-safety/caa/ofcom-childrens-access-assessment-template-met.odt) ·
[not met](https://www.ofcom.org.uk/siteassets/online-safety/caa/ofcom-childrens-access-assessment-template-not-met.odt) ·
[age assurance](https://www.ofcom.org.uk/siteassets/online-safety/caa/ofcom-childrens-access-assessment-template-heaa.odt).

The structure is genuinely small: two stages, and answering **yes** at both ("children can access" and
"the child user condition is met") requires **no recorded evidence at all** — only "no" answers demand
evidence. So on the conservative reading, **deliverable #2 is the `-met.odt` file plus a service name and
a date.** That is the entire document. The cost is not the paperwork, it is that "met" triggers the
children's risk assessment and the Protection of Children Codes.

> ### ⚠️ Ofcom's toolkit is behind the current law
>
> The toolkit page is stamped February 2025. Its recommended-measures output contains **nothing** about
> **s.20A**, **s.10(3A)'s 48-hour clock** or the **s.66 NCA duty** — all of which are in force now (§0).
> **Treat the tool's output as a floor, not a ceiling.** This was found independently by both research
> passes and verified against legislation.gov.uk.

**Reconciling the measure count.** The tool returns "15 measures"; §4 above lists 14. There is no
conflict: the tool's list includes **ICU G2**, which it simultaneously labels Category 1 only and
inapplicable. Fourteen apply.

**What the tool flags as our risk factors** — useful, because it means CanonCore does not have a clean
sheet: user profiles, fake/anonymous user profiles, re-posting or forwarding content, and user-generated
content searching. Plus child users, if the access assessment says so. This is the concrete input to the
per-harm reasoning in §3.

### Third-party generators: all nine checked, all fail

TermsFeed, Termly, iubenda, Shopify, WebsitePolicies, FreePrivacyPolicy, Rocket Lawyer UK, GetTerms and
Genie AI. **Not one produces an OSA-specific clause** — they are US boilerplate plus GDPR. TermsFeed's
only adjacent material covers KOSA, the *US* Kids Online Safety Act, which is a confusable different law.
Genie AI's UK template is actively misleading: it still calls it the "Online Safety **Bill** … pending
legislation", three years after Royal Assent.

Most are also email-walled or card-walled at the download step, and the licences are worse than the
paywalls. iubenda's is disqualifying on its own terms: *"Users are authorized … to use the documents
generated only as long as they have an active subscription"*, plus an express ban on reproduction. **A
document we are legally required to display cannot depend on a subscription staying paid.**

### What is actually worth using

**[onlinesafetyact.co.uk](https://onlinesafetyact.co.uk/)** — Neil Brown (decoded.legal), a UK tech
lawyer, **CC BY-SA 4.0**, no login or email. The only lawyer-authored free OSA template text found. It
fills the real gap, which is that **Ofcom publishes no terms-of-service wording at all**:

- [Template OSA terms of service](https://onlinesafetyact.co.uk/online_safety_act_terms/) — maps onto
  ICU G1 and G3.
- [Template policies and processes](https://onlinesafetyact.co.uk/online_safety_act_policies_and_processes/)
  — this is the reporting and complaints mechanism, ICU D1/D2/C2 in plain English.
- [A worked single-user Mastodon risk assessment](https://onlinesafetyact.co.uk/ra_my_self_hosted_single_user_mastodon_instance/)
  — every priority offence rated with rationale, mitigation and measure codes. The closest structural
  model to what we need. *(Its blog-with-comments example is a scoping exercise that stops at a
  Schedule 1 exemption, not a full assessment — do not use that one as the model.)*

Also [derickr/online-safety-assessments](https://github.com/derickr/online-safety-assessments) — **CC BY
4.0**, two full assessments following Ofcom's ODT structure plus an ICU G1 terms fragment.

> **The licence question is a real decision, not a footnote.** Neil Brown's text is **share-alike**, so
> building published terms directly on it arguably attaches CC BY-SA to those terms. derickr's is
> attribution-only. **The safe play for text we publish: use the share-alike material as a checklist and
> write our own prose, or start from the CC BY fragment.** Ofcom's material may be reproduced accurately
> with attribution, but its logo needs written permission — strip it from anything published.

### The Playwright verdict

**Almost nothing here is worth automating.** The Ofcom tools drive fine — no login, no payment, no CAPTCHA
challenge — but they hand back nothing a browser is needed for. The children's access tool resolves to one
of four static ODT files, so `curl` beats the browser. The record-keeping template is a plain download.
The Digital Support Tool's PDF export is wired to `window.print()` and cannot be captured by Playwright at
all, but that does not matter, because the whole output is DOM text.

Two gotchas recorded so nobody rediscovers them: read `textContent`, not `innerText`, or the measures sit
in hidden panels and go missing; and the Salesforce-hosted Regulation Checker ignores a JavaScript
`.click()` because it needs the AJAX postback — though that tool is skippable anyway.



## Deliverables

The ticket names three. The set is nine, and the order matters: the illegal content risk assessment
establishes the low-risk status that determines which Code measures bind, and the children's access
assessment determines whether a children's risk assessment exists at all.

| # | Artefact | Duty |
|---|---|---|
| 1 | **Illegal content risk assessment** — 18 kinds + 3 CSEA sub-levels + other illegal content | s.9; s.23(2) |
| 2 | **Children's access assessment** record | s.35, s.36(7) |
| 3 | **Children's risk assessment** — *only if #2 concludes "likely"* | s.11; s.23(2) |
| 4 | **Code measures register** — the 14 ICU measures, each with description, Code and effective date | s.23(3) |
| 5 | **Terms of service** — per the §5 checklist | s.10(5)–(8), s.21(3); G1, G3 |
| 6 | **Reporting and complaints procedure** — per-item control, non-user route, intimate image option, appeals | s.20, s.20A, s.21; D1, D2, D7, D9–D12 |
| 7 | **CSEA/NCA escalation procedure**, registration decision and named administrator | s.66; S.I. 2026/268 |
| 8 | **Named accountable individual** record — may be one line | ICU A2 |
| 9 | **Review policy** — 12-month cycle, re-assess before significant change, subscribe to Ofcom updates | s.9(3)–(4), s.23(6), s.36(3) |

## Open questions

1. **Whether the children's access assessment concludes "likely"** — a deliberate decision, not a
   detail. It roughly doubles the document set.
2. ~~Whether any s.20A regulations exist.~~ **Resolved 10 August 2026: none have been made.** The
   Secretary of State has the power under s.20A(2)(f) and s.20A(3) but has not used it, so the
   requirements are those on the face of **s.20A(2)**: a declaration that intimate image content is
   present; confirmation the reporter is the subject or acting on their behalf; sufficient information to
   identify the content; and contact details. Re-check at launch, since this can change by SI.
3. ~~CSEA retention against data minimisation.~~ **Resolved, and more favourably than first read.**
   Reg. 6(4)(a) requires a report to contain the Schedule 1 information **"where that information is
   available"** — a conditional. **There is no duty to start logging IP addresses, ports or connection
   data in order to be able to report.** What Schedule 1 does not find, it does not demand. Reg. 8 then
   attaches retention only to content actually reported: the report reference number for **five years**,
   and the content, the submitted information and associated user data for **one year**, covering the two
   weeks before upload.
   > So the honest position is: **collect nothing new; retain what we hold if we ever report.** The
   > conflict with data minimisation and the s.22(3) privacy duty largely dissolves — but the *retention*
   > obligation is real and would bite a service that hard-deletes on erasure requests, so it interlocks
   > with **CAN-30** (GDPR export and erasure) and should be settled there.
4. **Pending Autumn 2026 Code amendments** (C14–C16) do not reach us on current scoping, but their
   in-force date is still bracketed in Ofcom's draft. Re-check at launch.
5. **Ofcom's own links go stale.** Its *Illegal content duties* page links a superseded record-keeping
   guidance, and its compliance tool still shows the March 2025 deadline. Always resolve through the
   regulatory documents index.
