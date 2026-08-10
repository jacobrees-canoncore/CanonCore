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

Reports go to the National Crime Agency through the **Child Sexual Exploitation & Abuse Industry Reporting
Portal (CSEA-IRP)**. The portal is for CSEA only: "Providers must only use the CSEA-IRP to report CSEA to
the NCA and no other crime type" ([NCA, *The Child Sexual Exploitation & Abuse Industry Reporting Portal*](https://www.nationalcrimeagency.gov.uk/what-we-do/crime-threats/child-sexual-abuse-and-exploitation/the-child-sexual-exploitation-abuse-industry-reporting-portal)).

## Registration: deliberately deferred

**Reg. 4(1)**: "A provider and any third party provider must register with the NCA **prior to submitting
their first report** pursuant to the reporting duty."

Registration is therefore a precondition of *reporting*, not of *operating*, and this service is **not
registered**. Two reasons, both recorded so the decision is reviewable:

1. **Reg. 5(1)** requires the registering party to appoint an organisation administrator *and* "a
   replacement organisation administrator in the event that the person appointed … ceases to act in that
   capacity". **Reg. 5(2)** requires the administrator to be a senior manager or equivalent. A
   single-operator service cannot name an honest replacement.
2. There is no report to make, and none is anticipated given the absence of any image or video upload.

**The cost of this choice, stated plainly:** "Organisation registration requests are reviewed and processed
during working hours (Monday – Friday 07:00-17:00, excluding weekends and UK bank holidays)"
([NCA, *The Child Sexual Exploitation & Abuse Industry Reporting Portal*](https://www.nationalcrimeagency.gov.uk/what-we-do/crime-threats/child-sexual-abuse-and-exploitation/the-child-sexual-exploitation-abuse-industry-reporting-portal)). If CSEA content is ever
detected, registration must complete before the report can be submitted, and that delay falls inside the
"so far as possible" window of `s.66(1)`. **Revisit this decision the moment the service carries content
from any account other than the operator's.**

## What to do if CSEA content is detected

1. **Do not delete it.** Reg. 8 requires retention, and deletion would also destroy evidence. Set the
   record's Visibility to private so it is no longer publicly encounterable, and record the Operation and
   audit entry as for any takedown.
2. **If there is a current or imminent risk to a person, call 999 first.** The NCA says that where an
   organisation "has not yet registered to use the portal and has identified a current or imminent risk to
   an individual", it should "call 999 to report an emergency to your local UK police force"
   ([NCA, *The Child Sexual Exploitation & Abuse Industry Reporting Portal*](https://www.nationalcrimeagency.gov.uk/what-we-do/crime-threats/child-sexual-abuse-and-exploitation/the-child-sexual-exploitation-abuse-industry-reporting-portal)) rather than waiting on portal access.
3. **Register with the CSEA-IRP** at the National Crime Agency, naming the accountable individual as
   organisation administrator. Allow for working-hours review.
4. **Submit the report**, containing the Schedule 1 information **so far as it is available** — see below.
5. **Retain** per reg. 8: the unique report reference number for **five years**; the detected content, the
   information submitted, the assessment data and the associated user data for **one year**.
6. **Do not duplicate an NCMEC report.** The NCA says organisations already reporting to the National
   Centre for Missing and Exploited Children's CyberTipline "should continue to do so", that the CSEA-IRP
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
