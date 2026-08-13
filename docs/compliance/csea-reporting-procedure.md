# CSEA reporting procedure

**INTERNAL RECORD — NOT PUBLISHED.**

Kept to satisfy **`s.66`** of the Online Safety Act 2023, in force **7 April 2026** (S.I. 2026/262), with
detail in **The Online Safety (CSEA Content Reporting by Regulated User-to-User Service Providers)
Regulations 2026, S.I. 2026/268**.

> **This duty has no size or risk threshold.** It applies to any UK provider of a regulated user-to-user
> service, regardless of the CSEA risk levels reached in the
> [illegal content risk assessment](illegal-content-risk-assessment.md). A negligible finding for CSAM
> imagery does not switch it off.

## The duty

**`s.66(1)`**: a UK provider of a regulated user-to-user service "must operate the service using systems
and processes which secure (so far as possible) that the provider reports **all detected and unreported
CSEA content** present on the service to the NCA."

Reports go to the National Crime Agency through **the online portal**, which is the term
**S.I. 2026/268** uses and defines: "the online portal managed by the NCA which has been provided for the
purpose of enabling an organisation administrator or an authorised person to send reports of CSEA content
to the NCA". **Reg. 6(2)** allows only two routes: "through the online portal or using an API".

> **On the name.** The NCA's own public pages call it the *Child Sexual Exploitation & Abuse Industry
> Reporting Portal*, and this document previously used the initialism **CSEA-IRP** throughout as if it
> were the regulations' term. It is not: the regulations never use it. It now appears only inside direct
> quotations from the NCA, whose words they are, because a record that cites a defined term should cite the
> one the instrument defines.
> Tickets written before 13 August 2026 — notably
> [CAN-24 A signed-in and a signed-out path](https://linear.app/jacobrees-canoncore/issue/CAN-24) — still
> say "CSEA-IRP"; they mean this.

The portal is for CSEA only: "Providers must only use the CSEA-IRP to report CSEA to the NCA and no other
crime type" ([NCA, *The Child Sexual Exploitation & Abuse Industry Reporting Portal*](https://www.nationalcrimeagency.gov.uk/what-we-do/crime-threats/child-sexual-abuse-and-exploitation/the-child-sexual-exploitation-abuse-industry-reporting-portal)).

## Registration: deferred, and the unsolved requirement inside the deferral

**Reg. 4(1)**: "A provider and any third party provider must register with the NCA **prior to submitting
their first report** pursuant to the reporting duty."

Registration is therefore a precondition of *reporting*, not of *operating*, and this service is **not
registered**. Two reasons, both recorded so the decision is reviewable:

1. **Reg. 5(1)(b) is an open problem, not a solved one.** Reg. 5(1) requires the registering party to
   appoint an organisation administrator *and* "a replacement organisation administrator in the event that
   the person appointed … ceases to act in that capacity", and **reg. 5(2)** requires the administrator to
   be "a senior manager or other individual whom the registering party considers has an equivalent
   appropriate role in the organisation". **There is one person here and no second one to appoint.**
   Deferring registration does not solve this; it postpones meeting it, and it will still be unmet on the
   day a report has to be made. That is the honest statement of the position, and it is why the procedure
   below does not pretend registration is a step that simply completes.
2. There is no report to make, and none is anticipated given the absence of any image or video upload.

**Nothing about registering later makes reg. 5(1)(b) satisfiable.** The options, none of them free, are:
find a second person willing to be named and to act; ask the NCA at registration how it expects a
sole-operator provider to satisfy reg. 5(1)(b); or accept that registration may be refused or delayed and
that `s.66(1)`'s "so far as possible" is what the delay falls inside. **The middle one is the step below**,
because it is the only one this service can take alone, and because asking on the day a report is due is
worse than asking before.

**The cost of this choice, stated plainly:** "Organisation registration requests are reviewed and processed
during working hours (Monday – Friday 07:00-17:00, excluding weekends and UK bank holidays)"
([NCA, *The Child Sexual Exploitation & Abuse Industry Reporting Portal*](https://www.nationalcrimeagency.gov.uk/what-we-do/crime-threats/child-sexual-abuse-and-exploitation/the-child-sexual-exploitation-abuse-industry-reporting-portal)). If CSEA content is ever
detected, registration must complete before the report can be submitted, and that delay falls inside the
"so far as possible" window of `s.66(1)`. **Revisit this decision the moment the service carries content
from any account other than the operator's.** That trigger is owned: it is an acceptance criterion on
[CAN-24 A signed-in and a signed-out path](https://linear.app/jacobrees-canoncore/issue/CAN-24), the
ticket that ships exactly that condition, so it cannot be missed by being forgotten.

## What to do if CSEA content is detected

1. **Do not delete it.** Reg. 8 requires retention, and deletion would also destroy evidence. Set the
   record's Visibility to private so it is no longer publicly encounterable, and record the Operation and
   audit entry as for any takedown. **That capability is built by
   [CAN-32 Roles, takedown, and the Online Safety Act surfaces](https://linear.app/jacobrees-canoncore/issue/CAN-32)
   and does not exist on `main`** — which is consistent, because until CAN-32 ships there is also no
   account other than the operator's to put content there. The URL-sharing gate is what keeps those two
   facts in step.
2. **If there is a current or imminent risk to a person, call 999 first.** The NCA says that where an
   organisation "has not yet registered to use the portal and has identified a current or imminent risk to
   an individual", it should "call 999 to report an emergency to your local UK police force"
   ([NCA, *The Child Sexual Exploitation & Abuse Industry Reporting Portal*](https://www.nationalcrimeagency.gov.uk/what-we-do/crime-threats/child-sexual-abuse-and-exploitation/the-child-sexual-exploitation-abuse-industry-reporting-portal)) rather than waiting on portal access.
3. **Start registration, and disclose the sole-operator constraint rather than inventing a name.**
   Register with the NCA naming the accountable individual as organisation administrator under
   reg. 5(1)(a), state in the registration that reg. 5(1)(b) cannot be met because the provider is one
   person, and ask the NCA how it wants that handled. **Do not name a replacement who has not agreed to
   act** — a false appointment in a statutory registration is worse than a disclosed gap, and the point of
   recording the problem above is not to resolve it under time pressure with a fiction. Allow for
   working-hours review: "Organisation registration requests are reviewed and processed during working
   hours (Monday – Friday 07:00-17:00, excluding weekends and UK bank holidays)".
4. **Record what was attempted, and when.** `s.66(1)` requires reporting "so far as possible", which is
   judged on what the provider actually did. If registration is refused or stalls, that record and the 999
   call in step 2 are the evidence that the duty was pursued. Registration being incomplete does not
   excuse leaving a person at risk unreported — step 2 exists for exactly that.
5. **Submit the report** once registration completes, containing the Schedule 1 information **so far as it
   is available** — see below. Reg. 6(2) permits the online portal or an API and nothing else.
6. **Retain** per reg. 8: the unique report reference number (from the automated receipt) for **five
   years** from the date of issue; and for **one year** from the date the report was sent, all four of
   reg. 8(1)(b)'s limbs — (i) the detected CSEA content, (ii) the information submitted, (iii) any
   information used to judge that the content is CSEA content, and (iv) the relevant data associated with
   the user who uploaded, created, shared or received it. **Limb (iv) is bounded**: reg. 8(2) defines
   relevant data as five listed kinds of file drawn from **the two-week period before** the content was
   uploaded, created, shared or received — not everything the account ever held. Of those five, this
   service could hold only the first two; the chat-log and connection kinds have no mechanism here at
   all.
7. **Do not duplicate an NCMEC report.** The NCA says organisations already reporting to the National
   Centre for Missing and Exploited Children's CyberTipline "should continue to do so", that the portal
   "will not replace NCMEC reporting", and that providers "should not submit duplicate referrals"
   ([NCA, *The Child Sexual Exploitation & Abuse Industry Reporting Portal*](https://www.nationalcrimeagency.gov.uk/what-we-do/crime-threats/child-sexual-abuse-and-exploitation/the-child-sexual-exploitation-abuse-industry-reporting-portal)).

## What a report must contain, and what this service actually holds

**Reg. 6(4)(a)** requires the Schedule 1 information **"where that information is available"**. That
conditional is load-bearing:

> **There is no duty to begin collecting data in order to be able to report it.** Schedule 1 lists items
> including IP address and port, EXIF data, billing details, phone verification status and login IP
> addresses from the prior three months. This service holds almost none of that, and `s.66` does not
> require it to start. What Schedule 1 does not find, it does not demand.

Of Schedule 1's items, this service can normally supply: the reporting person's contact details, the
detected content itself, how it was detected, platform details, the content URL, and the account
information it holds. It cannot supply EXIF data (no image upload), billing details (no payments) or phone
verification status (none performed).

**The interaction to watch is retention, not collection**, and it is a real conflict with a ticket that
already exists.

**CAN-30** (GDPR export and erasure) requires that on an erasure request "the request sets
`deletion_scheduled_for`, and a scheduled job hard-deletes or anonymises", completing "within one month".
**Reg. 8 requires the opposite** for reported content: the unique report reference retained for **five
years**, and the content, the submitted information and the associated user data for **one year**.

So an erasure request touching content that is the subject of a CSEA report to the NCA **cannot be
honoured by hard deletion within the month**. CAN-30 needs an exception carved for it, and UK GDPR
provides the basis: erasure does not apply where processing is necessary for compliance with a legal
obligation. **This must be settled in CAN-30 rather than here**, and it is a schema decision, because the
scheduled deletion job needs something to check against.

Note that CAN-30's other requirement, that public records "leave public view at the moment of the
request", is unaffected and remains correct: taking content out of public view is not deletion, and it is
also what a takedown does.

## Enforcement

Ofcom enforces this duty, with the same penalty exposure as the rest of the regime.
