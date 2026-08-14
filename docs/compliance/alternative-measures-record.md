# Alternative measures record

**INTERNAL RECORD — NOT PUBLISHED.** Kept to satisfy **`s.23(4)`** and **`s.23(5)`**, which are a
different duty from the `s.23(3)` register of measures taken. `s.23(3)` records what was adopted from a
Code; **this records what was not**, and what stands in its place.

| | |
| --- | --- |
| Service name | CanonCore (`https://www.canoncore.com`) |
| Completion date | 13 August 2026 |
| Next review date | 13 August 2027 — reviewed with the risk assessments, and immediately if the justification below stops holding |
| Completed by | Jacob Rees |
| Named person responsible | Jacob Rees |
| Approved by | Jacob Rees — sole operator; see [`accountable-individual.md`](accountable-individual.md) |

**One alternative measure is taken.** Everything else applicable in the
[Code measures register](code-measures-register.md) is adopted as the Code describes it, except
**ICU D13** and **PCU D14**, which are permissive exceptions declined rather than measures replaced —
declining a permission is not an alternative measure and is recorded in the register, not here.

## `s.23(4)(a)` — the Code measure not taken

**ICU D2.2(a)**, and **PCU D2.2(a)**, which is the identical requirement under the children's codes:

> "for relevant complaints regarding a specific piece of content, a **reporting function or tool is
> clearly accessible in relation to that content**"

A per-item report control on each publicly visible record. It is not built, and
[CAN-43 Report form, reports table and an administrator queue](https://linear.app/jacobrees-canoncore/issue/CAN-43)
is deliberately outside v1.

**The rest of ICU D2 and PCU D2 is adopted**, and only limb 2.2(a) is replaced. D2.2(b) (other kinds of
complaint easy to find), D2.2(c) (only reasonably necessary steps) and D2.2(d) (possible to give
supporting information) are met by the address itself.

## `s.23(4)(b)` — the alternative measure taken

A **reporting address published as a public document**, reachable with no account and no sign-in, stating
what to send and what happens next. It is
[`content/legal/reporting-and-complaints.md`](../../content/legal/reporting-and-complaints.md), surfaced
by [CAN-32 Roles, takedown, and the Online Safety Act surfaces](https://linear.app/jacobrees-canoncore/issue/CAN-32)
from the footer of every page and from the public Ordering page, with the address itself created by
[CAN-44 Make the Online Safety Act records live, and create the reporting address](https://linear.app/jacobrees-canoncore/issue/CAN-44).

**The address has shipped; the surfaces have not.**
[CAN-44 Make the Online Safety Act records live, and create the reporting address](https://linear.app/jacobrees-canoncore/issue/CAN-44)
created `report@canoncore.com` on 14 August 2026 and proved a message arrives in a mailbox a person
reads. Until the document renders, the service carries no user-generated content, and the only public
record is the operator's own — inserted by a migration, and creatable by nobody else. So there is
nothing to report and the alternative is not yet load-bearing. It becomes so at the moment the URL is
shared, which is the gate in `docs/infrastructure.md` → *The URL-sharing gate*.

## `s.23(4)(c)` — how the alternative amounts to compliance

The duty is **`s.20(2)`**: systems and processes allowing users and affected persons to **easily report**
content they consider to be illegal content. It does not name a control. ICU D2.2(a) is one way to
discharge it, and `s.49(1)` makes that way *deemed* compliance; it does not make it the only way.

Four things carry the argument, and each is checkable:

1. **The address sits on the same public page as the content.** Once CAN-32 renders it, a reporter is one
   click from it, from the footer of every page and from the public Ordering page. Distance, not control
   type, is what "easily" measures.
2. **No account and no sign-in.** `s.20(5)` affected persons are by definition not users, and a per-item
   control reachable only to signed-in users would serve them worse than the address does.
3. **There is no volume for a per-item control to manage.** No upload, no messaging, no comments, no
   search across other users' content, so the corpus is small enough for the operator to read in full.
   **That reviewability is the provider's own reasoning and is not attributed to Ofcom**, whose guidance
   makes proportionality turn on the size, capacity and risk of a service without saying that a readable
   corpus substitutes for a reporting control.
4. **Nothing about the address limits what can be reported.** A per-item control constrains a reporter to
   the item it is attached to; free-form contact does not, which is why D2.2(d) supporting information is
   satisfied without a field to type it into.

**What would break this argument**, and make CAN-43 urgent rather than an improvement: user numbers
growing past what one person can read; any upload; any messaging or commenting; linkified free text; or
search across other users' content. Each is already listed as a change requiring the risk assessments to
be redone.

## `s.23(5)` — the areas in `s.10(4)` and `s.12(8)`

`s.23(5)` requires this record to indicate, for every area listed in `s.10(4)` (illegal content) and
`s.12(8)` (children), whether the alternative measure has been taken or is in use in that area. The two
lists are the same eight areas, so they are answered once.

| Area | Alternative measure taken or in use? |
| --- | --- |
| (a) Regulatory compliance and risk management arrangements | **No.** The Code measures are adopted as described. This record, the register and the review policy are the arrangement |
| (b) Design of functionalities, algorithms and other features | **Yes.** The replaced measure is a functionality — a per-item report control — and the alternative is the absence of that control alongside a published address |
| (c) Policies on terms of use | **No.** ICU G1, G3, PCU G1 and G3 are adopted as described |
| (d) Policies on user access to the service or to particular content | **No.** ICU H1 and the Visibility model are adopted as described |
| (e) Content moderation, including taking down content | **No.** ICU C1, C2, PCU C1 and C2 are adopted as described. What is reported still reaches the same moderation function |
| (f) Functionalities allowing users to control the content they encounter *(s.12(8)(f): especially by children)* | **No.** No measure in this area applies to this service |
| (g) User support measures | **Yes.** The published address, and the public document explaining what to send and what happens next, are the support measure standing in for the control |
| (h) Staff policies and practices | **No.** There is one person and no staff. ICU A2 is adopted as described |

**Two areas, (b) and (g).** Everywhere else the Codes are followed as written.

## `s.49(5)` — freedom of expression and privacy

`s.49(5)` requires a provider complying otherwise than by a Code measure to have **particular regard to**
the importance of protecting users' right to freedom of expression within the law, and protecting users'
privacy. Both were considered before the alternative was chosen, and both point the same way here.

**Freedom of expression.** The alternative is *less* restrictive of expression than the measure it
replaces, which is unusual and worth stating plainly. A per-item report control puts a one-click takedown
request on every piece of content. **What follows is the provider's own expectation, not Ofcom's
position:** that a friction-free control produces reports which are not about illegality at all, that
handling them costs a sole operator the time to read each one, and that the cheap resolution under
pressure is to take content down rather than assess it. It is offered as the reason for the choice
rather than as evidence for it. An address that requires a person to describe what is wrong raises the floor
on a report without putting it out of reach, and every report still reaches a human who assesses it
against the terms under ICU C1.3(b) rather than acting on the complaint alone. The appeal route (ICU D9,
D10) restores content and lifts restrictions where a decision is reversed, so a wrong takedown is
recoverable.

**Privacy.** The alternative collects **less** personal data than the measure it replaces. A report form
and a reports table would hold reporters' contact details and free text in this service's own database,
under this service's own retention rules, on a service that today stores no such thing. The address
routes a report to a mailbox instead, so the only personal data held is what the reporter chose to put in
a message, and it is held where email is already held rather than in a new store. When CAN-43 builds the
form, that table becomes a new category of personal data and needs a retention rule with it — which is
noted here because the privacy consideration runs the other way at that point.

**The residual risk, stated rather than argued away.** The address is worse than the control for a
reporter who cannot easily describe where content is: it asks them to identify the content in words
where a button would have identified it for them. That is the real cost of this choice. It is accepted
because the corpus is small enough that "the Ordering page for X, the entry for Y" locates anything, and
because ICU D2.3 requires the route to be designed for the accessibility needs of the user base, which
the public document addresses directly.

## When this record is deleted

**When [CAN-43](https://linear.app/jacobrees-canoncore/issue/CAN-43) lands**, D2.2(a) becomes an adopted
Code measure, this file is deleted, and the register's D2 rows lose their pointer to it. A record of a
measure not taken must not outlive the taking of it.
