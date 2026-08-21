# Infrastructure

**This file is the register: what is provisioned right now.** Current state, one complete variable
roster, and the date each row was last read back. Nothing here is intent, and nothing here is
narrative — the observations behind these settings live once in [`docs/incidents.md`](incidents.md),
and the decisions behind them in [`docs/adr/`](adr/).

That split is the point. A register is bounded by the size of the infrastructure, which is finite;
an evidence archive is unbounded by design. While they were one file the bounded thing inherited the
archive's growth — 152 lines to 1,081 in three days, with no commit ever reducing it
(`docs/research/document-length-for-agents.md`). Split on 13 August 2026 by **CAN-76 Restructure the
agent documents: policy, procedure and incidents get their own homes**.

**Adding to it: record the setting and the date you read it back, then put the story in
`docs/incidents.md` and link it.** If a paragraph would still be worth reading once the setting
changes, it is evidence and does not belong here.

## Contents

- [The production URL](#the-production-url)
- [The URL-sharing gate](#the-url-sharing-gate)
- [Hosting](#hosting)
- [The repository, and what `main` refuses](#the-repository-and-what-main-refuses)
- [The Provider repository baseline](#the-provider-repository-baseline)
- [Environment variables](#environment-variables)
- [Database](#database)
- [External data source: TMDB](#external-data-source-tmdb)
- [Transactional email: Resend](#transactional-email-resend)
- [Reporting address](#reporting-address)
- [Error reporting: Sentry](#error-reporting-sentry)
- [Uptime monitoring: UptimeRobot](#uptime-monitoring-uptimerobot)
- [The estate](#the-estate)
- [Domains](#domains)
- [Agent tooling](#agent-tooling)
- [Firewall](#firewall)
- [The served surface](#the-served-surface)

## The production URL

`https://www.canoncore.com`. The apex `canoncore.com` serves a **301** to it.

This is the URL that **CAN-24 Sign in and sign out** (better-auth base URL and cookie domain),
**CAN-31 Email verification and password reset** (absolute links) and **CAN-21 Write the Online Safety
Act documents** must bake in. `www` is the canonical host rather than the apex so the session cookie stays
host-only; the reasoning and what will try to reopen it are
[ADR-0010](adr/0010-canonical-host-www.md).

## The URL-sharing gate

**The public URL is not shared with anyone until both gates below are open.** Deployed is not shared:
`www.canoncore.com` resolves today and serves a holding page, and that is deliberately as far as it goes.

**What the gates hold shut, concretely: CAN-57 Make a public Ordering discoverable and shareable.** Its first criterion lifts `noindex` and publishes a sitemap — the strongest form of inviting a stranger — so it is `blocked-by` every condition of both gates (drawn 16 August 2026), and must never be worked while either gate is closed.

**There are two of them, and they test different things.** *Lawfulness* asks whether sharing the address
would be legal. *Readiness* asks whether what a stranger finds on the other end is worth the visit, and
whether it will still be there next week. Only the first was ever written down, so it was being read as
though it did both jobs. They open on different conditions and neither one implies the other.

**What sharing covers.** Telling anyone the address, linking it anywhere public, and anything that invites a
stranger to visit. It does not cover the deployment itself, which has to exist for the records to be
completable and for the address to be testable.

**Every compliance record that cites *The URL-sharing gate* means gate one.** Nothing in `docs/compliance/`
turns on readiness; readiness has no statutory content.

### Gate one: lawfulness

**The Online Safety Act records must be live and the reporting address must work.**

| | |
| --- | --- |
| Status | **Closed.** Not shared |
| Condition met | [CAN-44 Make the Online Safety Act records live, and create the reporting address](https://linear.app/jacobrees-canoncore/issue/CAN-44), on **14 August 2026**: the records are dated, the address exists and a test message was seen arriving in it |
| Condition outstanding | [CAN-32 Roles, takedown, and the Online Safety Act surfaces](https://linear.app/jacobrees-canoncore/issue/CAN-32) — the terms of service and the reporting route have to render before they can be relied on |
| Condition outstanding | [CAN-30 GDPR export and erasure](https://linear.app/jacobrees-canoncore/issue/CAN-30) — the terms of service still carry an unresolved privacy-notice placeholder, and they should not be published with it standing |
| Recorded here since | 13 August 2026, by **CAN-71 Make the compliance records valid: dates, the alternative-measures record, and the PCU register** |

**Why it is a gate and not a preference.** The two things that make this a user-to-user service are
accounts and public Visibility. **Since CAN-24 A signed-in and a signed-out path both of them exist** —
`story` has carried a Visibility with one public row since CAN-23 One Story from Neon, behind row-level
security, and accounts arrived on 17 August 2026. **Nobody but the operator can put content here even so,
and the reason is now narrower than it was**: nothing in the product creates a record, so a stranger can
hold an account and author nothing with it. That is what most of the Code measures are recorded as not in
effect for (`docs/compliance/code-measures-register.md` → *What the `Effective` column means*). The failure
this prevents is content arriving before the measures do: a person posting to
a service with no takedown, no published terms and no reporting address.

**Accounts have landed, and this gate tightened rather than moving.** They arrived with
**CAN-24 A signed-in and a signed-out path** on 17 August 2026. What the sentence above rests on changed
with them: it used to rest on accounts not existing, and now rests on nothing in the product creating a
record. **So the margin is one ticket wide.** It closes at
[CAN-27 Orderings and Placements, and the imported broadcast Ordering](https://linear.app/jacobrees-canoncore/issue/CAN-27)
or [CAN-26 Import a series from TMDB, with the overlay behind it](https://linear.app/jacobrees-canoncore/issue/CAN-26),
whichever lands first — and neither may land before
[CAN-32 Roles, takedown, and the Online Safety Act surfaces](https://linear.app/jacobrees-canoncore/issue/CAN-32),
which is the outstanding condition above. Two compliance records turn on the same distinction and were
amended with it: `docs/compliance/csea-reporting-procedure.md` → *The revisit of 17 August 2026*, and
`docs/compliance/code-measures-register.md` → *What the `Effective` column means*.

**Where this gate lived before, and why it moved here.** It was an unticked box on
[CAN-21 Write the Online Safety Act documents and establish the reporting address](https://linear.app/jacobrees-canoncore/issue/CAN-21),
which is closed, and then one line of prose on CAN-44. The audit of 12 to 13 August 2026 found it existed
nowhere in the repository, so an agent reading this repo had no way to know it applied
(`docs/research/tracker-and-repository-audit.md` §6). It is a criterion on that ticket and a row here now,
which are the two places someone about to share the URL would actually be looking.

**The compliance records themselves** are in [`docs/compliance/`](compliance/), and `CLAUDE.md` points at
them.

### Gate two: readiness

**Being allowed to share the URL is not the same as it being worth sharing.** A stranger who finds a service
that has gone quiet for a month, or that ships a megabyte of JavaScript to render a list, does not come
back, and the first visit is the only one most of them make.

| | |
| --- | --- |
| Status | **Closed.** Not shared |
| Condition **met** | [CAN-59 Decide whether the Hobby plan can carry a public service](https://linear.app/jacobrees-canoncore/issue/CAN-59) — decided 20 August 2026, [ADR-0024](adr/0024-vercel-pro-for-a-spend-cap-rather-than-an-outage.md), and **applied on 21 August 2026**: the plan is Pro and Spend Management is set with a pause. *Hosting* below carries the figures |
| Condition **met** | [CAN-60 Gate the front end on bytes, budgets and React lint](https://linear.app/jacobrees-canoncore/issue/CAN-60) — the front-end quality gates. Met 21 August 2026: Lighthouse budgets and react-doctor gate every pull request, [`agents/workflow.md`](agents/workflow.md) → *Two more gates, on pull requests only*, and the measurement products are instrumented with the redaction and the objection route ADR-0020 requires, with Web Analytics switched on and Speed Insights deliberately not — *Hosting* below. **What it does not close is the premise**: the budgets were measured against a skeleton, and CAN-89 Give the product a visual identity and a reading surface changes what these pages are |
| Condition **met** | [CAN-61 Keep the codebase and its dependencies from silting up](https://linear.app/jacobrees-canoncore/issue/CAN-61) — the two hygiene tools whose value scales with codebase age. Met 17 August 2026: knip gates in CI and Renovate owns dependency updates, *Dependency updates* below. The row stays rather than being deleted, so the gate's history reads as conditions met rather than conditions dropped |
| Condition **dissolved** | **An explicit acceptance of Vercel Hobby's 30-day outage risk**, a condition no ticket owned. [ADR-0024](adr/0024-vercel-pro-for-a-spend-cap-rather-than-an-outage.md) removed the risk rather than accepting it, and the plan moved on **21 August 2026**, so there is nothing left to accept. Recorded rather than deleted, so the gate reads as a risk removed rather than a condition dropped |
| Recorded here since | 14 August 2026, by **CAN-93 Record the three bands, the two gates and the Later queue convention** |

**Design is deliberately not a condition**, and that is a decision rather than an omission. A stranger reads
an undesigned site the way they read a wiki, which is exactly what **CAN-17 v1: the walking skeleton in
production, then the founding case** asks of them in its definition of done. **CAN-89 Give the product a
visual identity and a reading surface** lands before the URL is shared anyway, because it sits in `v1` —
that is v1's scope rather than a condition here, and this gate would open without it.
`docs/agents/issue-tracker.md` → *The three bands* holds why it is banded there.

## Hosting

| | |
| --- | --- |
| Vercel account | `jacobreesnew-7380's projects` (user `jacobreesvercel`) |
| Plan | **Pro**, since **21 August 2026** — [ADR-0024](adr/0024-vercel-pro-for-a-spend-cap-rather-than-an-outage.md) |
| Seats | **One deploying seat**, the one the platform fee includes. No additional paid seats and no Viewer seats |
| What it costs | **$24 a month.** The $20 platform fee, plus $4 of tax itemised against the UK billing address at checkout. The fee carries **$20 of monthly usage credit**, and 1 TB Fast Data Transfer and 10M Edge Requests are included on top without spending it ([Pro plan](https://vercel.com/docs/plans/pro-plan), read 21 August 2026) |
| Spend Management | **On. On-demand budget $40, pausing production deployments at 100%.** Read back as `$0 / $40 (0%)`, `Notifications: On`, `Pause Projects: On`. **No webhook.** So Vercel's own metered usage is bounded at $24 plus at most $40, plus what the pause overshoots — but that is not the whole bill, as the next row says |
| Spend Management notifications | **All four channels on: web, e-mail, push and SMS.** Web, e-mail and push fire at 50%, 75% and 100%; **SMS fires at 100% only** ([Spend Management](https://vercel.com/docs/spend-management), read 21 August 2026). A phone number was saved and verified on 21 August 2026, which is what the SMS toggle requires. **None of the four is forced** — all are switchable |
| What the $40 does not bound | **Seats, add-ons and Marketplace integrations**, which Vercel bills monthly and which the spend amount *"does not include"* ([Spend Management](https://vercel.com/docs/spend-management), read 21 August 2026). **Neon is a Marketplace integration billed through Vercel**, so this cap does not bound the database bill at all — *Database* below |
| Project | `canoncore`, `prj_BMzP9Dq7Qx3Eev8WwsvVoH5khnaU` |
| Repository | `jacobrees-canoncore/CanonCore`, production branch `main` |
| Function region | `lhr1` (London) |
| Preview protection | **None — off, and accepted deliberately** (16 August 2026; re-examined 17 August 2026). The live API reads `ssoProtection: disabled`; an earlier row here claimed Vercel Authentication covered previews, which the 16 August verification sweep refuted. **The exposure it was accepted against is closed**: previews no longer run against a clone of production's rows, because they read the shared schema-only branch — *The shared preview branch* below, and **CAN-79 Previews clone production rows, and the integration has no switch to stop it**. What an open preview still exposes is the *code* and whatever a preview's own users put in its database, which is what the acceptance now covers; re-enabling is a dashboard toggle |
| Root Directory | `apps/web` |
| Framework Preset | Next.js |
| Include files outside the root directory | On |
| Node.js version | 24.x |
| Web Analytics | **On**, enabled 21 August 2026 on the tier included in Pro. **Not** the `Web Analytics Plus` add-on, which the enable dialog offers at $10 a month and which was declined. What it has been observed receiving is *What the two measurement products were observed doing* below |
| Observability Plus | **Off**, turned off 21 August 2026 by [CAN-144 Bound or detect the Neon bill, which the Vercel spend cap excludes](https://linear.app/jacobrees-canoncore/issue/CAN-144) and read back from a cold reload. **It was on, and nobody chose it** — it arrived with the Pro upgrade, and its own confirm dialog said *"Your team is currently utilizing Observability Plus"*. Base cost `Included`, then **`$1.20` per 1M events with no allowance**, and as an **add-on** it sits on the excluded side of the *What the $40 does not bound* row above, so Spend Management would not have bounded it. Turning it off loses advanced metrics and their retention, which is no loss while *The URL-sharing gate* is closed and there is no traffic to observe |
| Other add-ons | **All off**, read from the same page on 21 August 2026: `Web Analytics Plus` ($10/mo), `Flags Explorer — Unlimited Overrides` ($250/mo), `Advanced Deployment Protection` ($150/mo), `Preview Deployment Suffix` ($100/mo). The rows sit one click apart and the controls carry no accessible labels, so read the row text before clicking anything here — [incident](incidents.md#a-mis-aimed-click-on-the-add-ons-page-offers-to-enable-a-paid-product) |
| Build machines | **`Elastic` for all projects**, but the **team default for *new* projects is `Turbo`**, the most expensive tier. Read 21 August 2026 from the radio state rather than the badges, which are misleading: `Elastic` carries a *Recommended* badge and `Turbo` carries the *Team Default* one. Nothing is costing meaningfully today — included credit stood at **`$0.30` of `$20`** — so this is recorded rather than changed, and it is a decision for whoever creates the next project |
| Speed Insights | **Off**, and deliberately. $10 per project per month on Pro, for a product whose subject is field traffic there is none of — the note below has the figures and what turning it on would buy. **It is nonetheless receiving data**, which the same section records |

*Read back with `vercel project inspect canoncore`; the Root Directory row and the three under it
set by CAN-22 A page on a public URL, deployed, with CI, on 11 August 2026. Preview protection was set on 13 August 2026 and turned off since —
the row above records the 16 August acceptance.*

**The last two rows are not `vercel project inspect`'s to report**, so they were read from the
dashboard on 21 August 2026 under **CAN-60 Gate the front end on bytes, budgets and React lint**.
`GET /v9/projects/{id}` returns a `webAnalytics` and a `speedInsights` object, and **the ids in them
are present while a product is off**, so an id settles nothing about whether one is running.

> **One field does answer it, and this document said it did not.** The paragraph above used to state
> that the API returns "nothing that says whether either is enabled — no `enabledAt`, no
> `disabledAt`, no status". That was read when **both products were off**, and with one of each it
> is false: the live API on 21 August 2026 returned `webAnalytics: {id, enabledAt: 1787315619366,
> hasData: true}` against `speedInsights: {id, hasData: true, dataReceivedAt: 1787318907512}` — an
> `enabledAt` on the product that is on, and none on the product that is not. **One reading of each
> state is not a rule**, which is why this is recorded as what was seen rather than as how the field
> behaves; the dashboard stays the source for these two rows. Found by
> **CAN-147 Verify the analytics redaction and opt-out against a real deployment**.

**That distinction cost this project a wrong record and a wrong instruction**, and is why it is
written down rather than left as a lookup: the same ticket first recorded both products as *On*, on
the strength of the ids alone, and acted on it. The dashboard showed Speed Insights behind a
*Purchase* button and Web Analytics behind an *Enable* one. **Neither had ever been enabled.** What
the ticket supplied was the instrumentation — the two packages, the redaction and the objection
route that make them lawful here
([`apps/web/src/analytics/analytics.tsx`](../apps/web/src/analytics/analytics.tsx), under
[ADR-0020](adr/0020-no-cookie-consent-banner.md)) — and then Web Analytics was turned on to meet it.
`hasData: false` was consistent with an enabled product that had seen no traffic *and* with a
product that was off, which is exactly why it settled nothing.

**On Pro the two are priced very differently, and one of them is a standing monthly charge.** Web
Analytics has no base fee: unlimited projects, no included events, *"$0.03 per 1K events"* against
the plan's monthly usage credit, and a 12-month reporting window. **Speed Insights has a base fee of
*"$10.00 per-project, per-month"***, *plus* `$0.65 per 10,000 events` on top of the first 10,000, in
exchange for no event cap and a 30-day window; the base fee is charged
*"immediately … when enabling Speed Insights for each project"*, prorated for the remainder of the
cycle ([Speed Insights limits](https://vercel.com/docs/speed-insights/limits-and-pricing),
[Analytics limits](https://vercel.com/docs/analytics/limits-and-pricing), both read 21 August 2026).

**So Speed Insights stays off, and that is a decision rather than an omission.** The thing it is for — real INP and full-session CLS, which
[`research/production-readiness-baseline.md`](research/production-readiness-baseline.md) →
*Front-end quality as a gate* explains cannot be had in a lab — needs field traffic, and *The
URL-sharing gate* above is why there is none. It is a base fee rather than usage, so it is the shape
the *What the $40 does not bound* row names, and Spend Management would not bound it. **Nothing is
lost by leaving it until the gate opens**: there is no history to forfeit, and Vercel's own page says
that on re-enabling *"you won't be charged when you enable it. Instead, the usual 10 USD base fee
will apply at the beginning of every upcoming billing cycle"*
([Speed Insights limits](https://vercel.com/docs/speed-insights/limits-and-pricing)).

*The plan, the seat count and the fee were read from the live team API on 21 August 2026 by
**CAN-59 Decide whether the Hobby plan can carry a public service**: `plan: pro`, `planChangedAt`
11:34 UTC that day, the `pro` line item $20.00 at quantity 1 and `teamSeats` at quantity 0. **The
Spend Management row is the one row here that no API can state**, so it was read back from the
dashboard on 21 August 2026 after a full reload, which is the only way to see it
([incident](incidents.md#spend-management-saves-in-two-steps-and-abandoning-the-second-discards-it)).
Both Spend Management rows were read there again on 21 August 2026 from a second session, off a cold
navigation rather than the one that set them.*

> **Push is enabled and unproven; SMS is enabled and proven.** Push here is **browser push**, not an
> app: *"Push notifications are opt-in per device and are available on desktop and mobile web"*
> ([notifications](https://vercel.com/docs/notifications), read 21 August 2026). **So the ticked box
> is a type preference, and the opt-in is a separate per-device act that nobody has recorded doing** —
> push is enabled without it being established that any device would receive it. **SMS is different in
> kind**: turning it on required a verification code delivered to the number, so the act of enabling it
> exercised the channel end to end on 21 August 2026. [`docs/runbook.md`](runbook.md) → *What warns you
> before a pause* carries the same distinction where it would be acted on.

**The last five rows exist nowhere but here.** They are project settings, so no file in this
repository can assert them, and `vercel.json` cannot set any of them either. Without the first two
the build runs at the repository root, finds no application and produces a 404 on the production
domain; without the third it cannot see `packages/config`, which sits outside `apps/web`. The API
name for the third is `sourceFilesOutsideRootDirectory`, which is not the dashboard's wording
([incident](incidents.md#the-api-name-for-a-project-setting-is-not-the-dashboard-name)).

**The repository is public, and that is still a constraint rather than a default — but only one of
its two reasons survives.** Vercel's Hobby plan refused a private organisation-owned repo, and that
half stopped binding with the Pro upgrade on 21 August 2026
([incident](incidents.md#the-hobby-private-repo-refusal-stopped-binding-on-the-pro-upgrade)). **What
remains is GitHub's**: public is what pays for `main`'s ruleset under GitHub Free
([incident](incidents.md#vercel-hobby-refuses-a-private-organisation-owned-repo)). Made private
again, the ruleset goes and every merge gate with it.

**The non-commercial restriction is gone.** Hobby "restricts users to non-commercial, personal use
only" ([Vercel Hobby plan](https://vercel.com/docs/plans/hobby), citing the
[fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage)), which
made a donate link a licence breach rather than a product decision. **It stopped applying on
21 August 2026 with the upgrade** — [ADR-0024](adr/0024-vercel-pro-for-a-spend-cap-rather-than-an-outage.md).
Recorded rather than deleted, because earlier documents cite it as live.

The Vercel GitHub App is installed on `jacobrees-canoncore`, scoped to this one repository, and
installing it displaced nothing
([incident](incidents.md#installing-the-vercel-github-app-on-a-second-org-displaced-nothing)).

### What the two measurement products were observed doing

**Everything in the two rows above says what was switched on. This says what was received**, which
is a different claim and the only one that discharges
[ADR-0020](adr/0020-no-cookie-consent-banner.md)'s conditions:
[`apps/web/src/analytics/redaction.test.ts`](../apps/web/src/analytics/redaction.test.ts) proves the
redaction as a function, and a function cannot be asked whether anything left the browser. Checked on
**21 August 2026** under **CAN-147 Verify the analytics redaction and opt-out against a real
deployment**, by driving a deployment with Playwright and reading the outbound request bodies, then
reading back what Vercel holds. Times are UTC.

**The two deployments it was run against, so the runs tie to code rather than to a date.** Production
was `dpl_6qKMxW3nueEDFFqAjHhBeTBc6fsR`, built from `dfa48b3` — **CAN-60 Gate the front end on bytes,
budgets and React lint**'s merge — and created at 13:27:00.091, which is the deployment every "after
the production deployment" below counts from. The preview was
`dpl_DccG4etidPznRRappLmKKeSw7Yzd` at `canoncore-or5wgzl5o-jacobreesnew-7380s-projects.vercel.app`,
built from `dcded8f`, that branch's tip before the squash: `git diff dcded8f dfa48b3 -- apps/web
packages` is **empty**, so the preview served the same application code production did.

| What was asked | What was seen |
| --- | --- |
| Does a Story page arrive as its shape? | **Yes.** `https://www.canoncore.com/story/00000000-0000-4000-8000-000000000001` at 13:57:35 sent `o: "https://www.canoncore.com/story/*"` and `dp: "/story/*"`. Vercel reports `/story/*` under both `requestPath` and `route`, and that visit moved production from 2 pageviews to 3. **The identifier is in no field of the body** |
| Does anything after a question mark arrive? | **No.** `https://www.canoncore.com/?canary-b4332512=1` at 13:57:29 was sent as `o: "https://www.canoncore.com/"` and is recorded as `/`. The canary string appears in no recorded path |
| Does `/reset-password` record its token? | **No**, and it was asked with a live one — see below |
| Does the objection work on a deployment? | **Yes.** With it recorded, two further page loads produced **no request at all** from either product; withdrawing it on the same page brought the pageview straight back |
| Has `speedInsights.hasData` flipped? | **Yes**, to `true`, `dataReceivedAt` 13:28:27.512 — **87 seconds after** the production deployment of 13:27:00.091 |

**The reset token was real, and that is the point of it.** On the preview, a reset was requested
through `/forgot-password` for an account already in the shared preview branch; better-auth wrote a
`reset-password:` row expiring one hour later, and the browser was driven to `/reset-password?token=`
with that value, where the page rendered *Choose a new password* — so the token was carried and
honoured. At 13:54:32 what left the browser was `o: ".../reset-password"` and `dp: "/reset-password"`,
and Vercel records `/reset-password`. **The value is deliberately not written here**; it expired at
14:53. A preview rather than production because the account is one a preview may hold and production
may not — *The shared preview branch* below, and
[`apps/web/e2e/verification-by-inbox.spec.ts`](../apps/web/e2e/verification-by-inbox.spec.ts) records
the same bound.

**`hasData` is a fact about the pipe and not about the product, which is sharper than it looks.**
Speed Insights is **off** — never purchased — and it is receiving data anyway: the browser's own
`/_vercel/speed-insights/vitals` request was captured going out from production at 13:57. So the row
above saying *Off* and this section saying *receiving* are both true, and neither implies the other.
**What Vercel does with those measurements while the product is off is not recorded here, because
their documentation does not say** — searched on 21 August 2026 and answered only with how to enable
it and what it costs. **And `dataReceivedAt` did not move for them**: it still read 13:28:27.512 when
the API was read again at 13:58, half a minute after vitals demonstrably left the browser. That is
one intervention rather than a documented contract, so it is written as what happened; it is at least
not a latest-receipt stamp.

> **This falsified a sentence on the page that discharges the information duty, and that is the most
> consequential thing the run found.** `/privacy/analytics` told readers Speed Insights "is not
> switched on, so nothing is being collected for it" — and something is being sent.
> [ADR-0020](adr/0020-no-cookie-consent-banner.md) → *The conditions are the decision* makes "clear
> and comprehensive information" one of the two conditions the whole no-banner position rests on, so
> a reader told nothing is sent while something is, is that condition failing rather than a wording
> nit. Corrected in the same change:
> [`apps/web/src/app/privacy/analytics/page.tsx`](../apps/web/src/app/privacy/analytics/page.tsx) now
> says the measurements are sent and that the objection stops them. **The terms of service needed no
> change**, and the reason is theirs rather than an omission: they claim nothing about Speed Insights,
> and they send the reader to `/privacy/analytics` for what *"exactly … is collected"* — so correcting
> that page is what makes the terms' own sentence true again. `content/legal/` is therefore untouched,
> which is what keeps this clear of the rule that such an edit needs the illegal-content assessment
> redone before it ships.

**Each product names the page twice, and only one of those two namings goes through `beforeSend`** —
the route travels beside the URL and never reaches the hook, which is the distinction
[`redaction.ts`](../apps/web/src/analytics/redaction.ts) draws and not one between the two vendors,
both of which are given the hook. One Speed Insights request carried six samples — `FCP`, `TTFB`,
`LCP`, `FID`, `INP`, `CLS` — and every one of them named the page as `route: "/story/*"` and
`href: ".../story/*"`. That is the surface
[`apps/web/src/analytics/analytics.tsx`](../apps/web/src/analytics/analytics.tsx) exists to close.

> **What nearly made all of this unobservable, and would have looked like success.** Both
> `/_vercel/insights/script.js` and `/_vercel/speed-insights/script.js` refuse an automated browser
> before reading anything. The predicate is byte-identical in the two and only its minified binding
> differs — `t` in Web Analytics, `r` in Speed Insights — read off the live scripts on 21 August 2026:
>
> ```js
> function t(){return!!(navigator.webdriver||navigator.userAgent.includes("Headless"))}
> if(t())return;   // and `r` for the same two lines in the Speed Insights bundle
> ```
>
> So a browser they refuse sends **nothing**, which is worse than a failure: an assertion that a token
> did not leak holds over no requests at all. **A browser driven by the Playwright *test runner* is
> such a browser by default**, which is what this spec had to be built around; the flag that clears it,
> and the guard that turns an empty set into a red test, are in
> [`apps/web/e2e/measurement-on-the-wire.spec.ts`](../apps/web/e2e/measurement-on-the-wire.spec.ts).
>
> **The `playwright` MCP server the ticket prescribes is not affected**, and an earlier draft of this
> section wrongly said its plan "does not work as written". Its Chrome runs headed and already
> carries `--disable-blink-features=AutomationControlled`, read straight off the running process
> (`ps` against `--user-data-dir=/Users/jacobrees/.config/pw-session`, 21 August 2026). So both halves
> of the guard are clear on the route `CLAUDE.md` puts in charge of driving a browser, and the trap
> belongs to the test runner alone.

**This is now a spec rather than only a record**, so the next change to the redaction is checked
rather than re-verified by hand: `measurement-on-the-wire.spec.ts` asserts the three wire claims
above against whatever deployment it is pointed at, and fails loudly when no pageview arrives instead
of passing on nothing. It is off the gate with the rest of the Playwright suite
([ADR-0017](adr/0017-testing-stack.md)) and its header says how to run it.

**The tool that reads this back has a default that hides a preview run**, and it is the same
narrowing that document already records for the same server:
[`agents/tooling.md`](agents/tooling.md) → *The `vercel` MCP answers for one project, and a Provider
is another*.

**What this does not settle stays unsettled.** Real INP and full-session CLS need field traffic and
the URL is deliberately not shared — *The URL-sharing gate* above. What is settled is that the pipe
works and that what goes down it is redacted.

### `main` does not deploy from Git

| | |
| --- | --- |
| Setting | [`apps/web/vercel.json`](../apps/web/vercel.json) sets `git.deploymentEnabled: { "main": false }` |
| Who releases `main` | GitHub Actions: migrate, build, promote, in that order |
| Previews | **Untouched.** Every branch but `main` still deploys from Git |
| Set by | CAN-23 One Story from Neon, behind row-level security, on **14 August 2026** |
| Rollback | **Unaffected by any of the above.** Eligibility is having served the production domain, not having been built from Git, so every deployment Actions promotes is a rollback target ([incident](incidents.md#a-rollback-turns-off-auto-assignment-of-production-domains)) |
| Auto-assignment | `autoAssignCustomDomains`, **`true`** today. A rollback sets it `false` and a promote sets it back, which is the standing state to read after either (same incident) |

*The file is read from the Root Directory, confirmed 14 August 2026 by putting a header in it and
finding that header in `.vercel/output/config.json` after `vercel build`.*

*What to do with a bad release is [`runbook.md`](runbook.md) → *A release is bad*, and why the schema
is never rolled back with it is
[ADR-0027](adr/0027-migrations-are-forward-only-and-a-rollback-moves-code-alone.md).*

**Why CI owns the release rather than Vercel, why the runner-up — a project setting instead of a file
— lost, and why turning previews off would block every merge:
[ADR-0019](adr/0019-ci-owns-the-production-release.md).** The procedure is
`docs/agents/workflow.md` → *What a merge carries*.

## The repository, and what `main` refuses

Provisioned by CAN-40 on 12 August 2026, and blocked until then: a required status check that never
reports blocks every merge for ever, so none of this could exist before CAN-22 gave the repository
checks to require. What it means for the landing loop is `docs/agents/workflow.md` → *What `main`
refuses*.

### Merge methods

| Setting | Value |
| --- | --- |
| `allow_squash_merge` | `true` |
| `allow_merge_commit` | `false` |
| `allow_rebase_merge` | `false` |
| `delete_branch_on_merge` | `true` |

The middle two were `true` until CAN-40. `delete_branch_on_merge` changes a step rather than merely
tidying up: GitHub deletes the head branch as the PR merges, so a remote-branch delete is a
confirmation rather than an action.

### The ruleset

One ruleset, `main`, id `20761164`, `enforcement: active`, targeting `~DEFAULT_BRANCH` — which
resolves to `main` and keeps resolving to whatever the default branch is, so renaming the branch
cannot silently unprotect it.

| Rule | What it does |
| --- | --- |
| `required_status_checks` | Both contexts in the table below must be green on the commit |
| `required_linear_history` | No merge commits reach `main` |
| `non_fast_forward` | `main` cannot be force-pushed |

**The required contexts.** These names are the ones GitHub actually reports, read off merged pull
requests rather than guessed. **This table is the only place in the documentation that names them**,
and `scripts/check-docs.ts` fails the build if it disagrees with `.github/workflows/ci.yml` or with
the live ruleset:

| Context | Source | Where it comes from |
| --- | --- | --- |
| `test, typecheck, lint, build` | `.github/workflows/ci.yml` | The `name:` of the single job. For a workflow, *"the name format is `<job name>`"* ([Troubleshooting rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/troubleshooting-rules#troubleshooting-required-status-checks)), so the commas are part of the context |
| `Vercel` | Vercel GitHub App | A commit **status**, not a check run — the same page's rule for *other checks*. A ruleset accepts either kind |

*Read back 13 August 2026 with:*

```bash
gh api repos/jacobrees-canoncore/CanonCore/rules/branches/main
gh api repos/jacobrees-canoncore/CanonCore/rulesets/20761164 --jq '{bypass_actors,current_user_can_bypass}'
```

**Nobody bypasses it.** `bypass_actors` is empty, and the second command returns
`"current_user_can_bypass": "never"` run as `jacobdrees`, which holds `admin` here. That is the
reading that matters: an admin bypass would make the whole thing decorative, because `gh pr merge
--admin` would then land an unchecked commit and the guard would only ever stop someone who was not
trying.

**A required context that never reports blocks the merge indefinitely** — a different failure from a
red check, and a worse one. So a context only belongs here if it reports on **every** pull request,
including documentation-only ones
([incident](incidents.md#both-required-contexts-report-on-documentation-only-pull-requests)).

**The check contexts are one, not three.** CAN-22 asked for the three gate commands as three
contexts; `ci.yml` runs every one of them in one job so the first failure stops the rest, which
means the pull request reports one check. Requiring three names that nothing emits is the trap above.

**The job's name does not change when a step joins**, so it is a summary of what the job runs rather
than a manifest of it — seven steps have joined without it changing. That matters here because a
rename is an edit to this table *and* to the live ruleset. `ci.yml` carries the argument, at the name
itself, where a rename would be typed. Settled by **CAN-54 Fail a push that adds a known-vulnerable
dependency** on 16 August 2026.

**`Vercel Preview Comments` is deliberately not required.** Vercel posts it as a third check, but it
records that a comment was written, not that a deployment succeeded.

**Neither are the two contexts `.github/workflows/frontend.yml` reports**, added by **CAN-60 Gate the
front end on bytes, budgets and React lint**. They run `on: pull_request`, so unlike the two above
they report on nothing else — and requiring them would cost a ruleset edit, with the window in which
a required context is missing and nothing can merge, to gate what `/review-pr` already reads off the
pull request. They are named in [`agents/workflow.md`](agents/workflow.md) → *Two more gates, on pull
requests only* and nowhere else, which keeps the table above the only place a **required** context is
named — the property `scripts/check-docs.ts` gates.

**No approving-review requirement, and no `pull_request` rule at all.** Solo, a required review can
only block. Requiring a pull request would be a separate decision from the one CAN-40 made, and the
status-check rule already refuses a `main` carrying no green checks.

**Branches are not required to be up to date** — `strict_required_status_checks_policy` is `false`,
GitHub's *loose* setting rather than its default. Strict costs a rebase whenever the base moves,
which solo, with one branch open at a time, is paid on every landing to guard a race that needs two
people. What loose gives up is named in the same table: *"Status checks may fail after you merge
your branch if there are incompatible changes with the base branch"* ([Available rules for
rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets#require-status-checks-to-pass-before-merging)).
Here that means a green pull request can still break `main`, and a push to `main` releases if the
job that follows it is green. CI is `on: push`, so the merge commit is tested too, and `docs/agents/workflow.md` →
*After the merge* is the step that looks. Turn strict on if a second person starts landing work, or
if two branches are ever routinely open at once.

### Dependency and secret scanning

Read back on 16 August 2026 by **CAN-54 Fail a push that adds a known-vulnerable dependency**, with
the calls beside each row. **Three of the seven were flipped by that ticket** — the dependency graph,
secret scanning and push protection. Dependabot alerts were already on. The last three rows were
already off and are recorded so that "off" is a decision rather than a gap.

| Setting | State | Read back by |
| --- | --- | --- |
| Dependency graph | **enabled** | `dependency-graph/sbom` → a package count while on. It answered `404` while off, and **`1`** — the repository's own SBOM entry, nothing indexed beside it — while on and blind, which is a second failure this row cannot express and `check-docs.ts` fails separately |
| Dependabot alerts | **enabled** | `vulnerability-alerts` → `204 No Content` ([the documented *enabled*](https://docs.github.com/en/rest/repos/repos#check-if-vulnerability-alerts-are-enabled-for-a-repository)) |
| Secret scanning | **enabled** | `security_and_analysis.secret_scanning.status` |
| Secret scanning push protection | **enabled** | `security_and_analysis.secret_scanning_push_protection.status` |
| Dependabot security updates | disabled | `security_and_analysis.dependabot_security_updates.status` |
| Secret scanning validity checks | disabled | `security_and_analysis.secret_scanning_validity_checks.status` |
| Secret scanning non-provider patterns | disabled | `security_and_analysis.secret_scanning_non_provider_patterns.status` |

```bash
gh api repos/jacobrees-canoncore/CanonCore --jq .security_and_analysis
gh api -i repos/jacobrees-canoncore/CanonCore/vulnerability-alerts | head -1
gh api repos/jacobrees-canoncore/CanonCore/dependency-graph/sbom --jq '.sbom.packages | length'
```

**Three commands, because these settings live in three places and the first reaches only five of
them.** Alerts are not in `security_and_analysis`; the dependency graph is in neither, and no
*repository* route reaches it — the one that does is an org-level code security configuration, and
*The Provider repository baseline* → *What the first real run showed* is where that is recorded and
why it is not used. **Read all three, or the answer is partial in the row that matters most** —
the graph is what the two Dependabot rows match against, and with it off they report nothing while
still reading as enabled ([incident](incidents.md#dependabot-alerts-were-enabled-and-blind)).

**`scripts/check-docs.ts` compares all seven rows against those three calls on every run** —
**CAN-124 Compare the security-settings roster to the live repository in check-docs**. It fails a row
that has stopped being true, a row whose source no call can read, and a setting the repository
carries that no row records: "off is a decision rather than a gap" holds only while the seven are all
of them. **A value the run cannot read fails rather than skips** — the source answered, so calling it
unreachable would claim nothing was reached when something was.

**The row records the shape of the SBOM's answer rather than a count**, and the count is reported on
every run instead. A number written down here is one nothing compares, so it goes stale between
dependency changes with nothing to catch it, which is the drift this whole section now has a check
against. It read 696 on 16 August 2026 and 697 on 17 August.

**It gates on a laptop and skips in CI**, the same wall as the secret roster below.
`security_and_analysis` comes back only to a caller with **admin on the repository** — *"you must have
admin permissions for the repository or be an owner or security manager for the organization that owns
the repository"* ([Get a repository](https://docs.github.com/en/rest/repos/repos#get-a-repository)) —
and `permissions:` accepts no scope that grants it, `vulnerability-alerts: read` reaching Dependabot's
*alerts* rather than this setting
([Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions)).
Admin is also what makes a `404` from the other two calls an answer rather than an ambiguity, so a run
without it reports having read nothing. Where it gates, beside every other check:
[`docs/agents/workflow.md`](agents/workflow.md) → *The gates*.

One alert is open: `GHSA-67mh-4wv8-2f99`, a moderate `esbuild` development-server advisory reaching
us through `drizzle-kit`, which nothing here can fix.

**Why the three disabled rows are off.** *Security updates* raise fix pull requests, which is
dependency updating rather than dependency alerting. It stayed off for **CAN-61 Keep the codebase
and its dependencies from silting up** to answer, and that ticket answered it on 17 August 2026:
**Renovate does this job now and the row stays off**, because two bots raising a fix for the same
advisory is two pull requests to reconcile rather than one to merge. Renovate reads the same alerts
— *Dependency updates* below is where it and its config live. *Validity checks* send a candidate secret to its
issuer to ask whether it is live, which is a disclosure decision of its own that nothing here needs.
*Non-provider patterns* widen scanning to shapes no issuer vouches for, and their false positives are
what push protection would then be enforcing.

**None of this is the gate.** Alerts arrive after a merge, on GitHub's schedule. The gate is a step
in the CI job, and [`docs/agents/workflow.md`](agents/workflow.md) → *The gates* owns it.

### Dependency updates

**Renovate, configured by [`renovate.jsonc`](../renovate.jsonc), which owns every decision in it.**
Provisioned by **CAN-61 Keep the codebase and its dependencies from silting up** on 17 August 2026.
What belongs here rather than there is the part that is not in the file: what had to be installed,
and what the arrangement costs.

**It is a GitHub App and a human installs it**, at
[github.com/apps/renovate](https://github.com/apps/renovate), on the `jacobrees-canoncore`
organisation and scoped to this repository. Renovate reads GitHub's own Dependabot alerts to raise a
security fix, so the app has to be granted them — *"If using the Renovate app, ensure it has read
permissions for Dependabot alerts"* ([Configuration
options](https://docs.renovatebot.com/configuration-options/#vulnerabilityalerts)) — and the two
repository settings feeding those alerts are the dependency graph and Dependabot alerts, both
**enabled** in the table above.

**Install it only once `renovate.jsonc` is on `main`.** Renovate decides a repository is already
onboarded by looking for a config file **in the default branch's file list**
(`lib/workers/repository/onboarding/branch/check.ts`), so installing while the config sits on a
branch makes it open a *Configure Renovate* pull request proposing a default config of its own.

**Two failure modes belong to this document rather than to that file, because both are about the
estate rather than the configuration**, and each reads as fine until it is not:

- **An uninstalled Renovate is indistinguishable from a quiet week**, and so is one that has stopped
  running: nothing alerts on either, and the config file is inert either way. The Dependency
  Dashboard issue is where both become visible, which is the only reason it is worth having.
- **Majors are the ones that stop**, by construction. A major pull request sitting open is the
  system working, not a stall — so it is not evidence that anything needs looking at.

## The Provider repository baseline

Every Listed Provider is a repository of its own and a deployment of its own
([ADR-0014](adr/0014-shell-providers-and-per-source-retention.md) → *Decision 2 — Listed Providers
are written and run by this project*), so at the first one the gates above stop being all of the
gates there are. Six or more repositories with no lint gate, no dependency audit and no secret
scanning is a worse posture than the one this repository's own gates protect: the protection would
scale with the number of repositories, downwards. Built by **CAN-107 Give every Provider repository
a CI baseline** on 20 August 2026, **before the first Provider repository existed**, which is the
whole of why the ticket blocks **CAN-101 Create the provider-tmdb repository, and give it the TMDB
credential** rather than the reverse. A baseline that arrives second is a retrofit, and the
repository it was retrofitted onto had already merged something unchecked. **It did arrive first**:
`provider-tmdb`'s own first commit carried the caller, and the ruleset was written the same day,
before any pull request had been opened there (*What the first real run showed* below).

**It is two artefacts and one dashboard step, not one workflow**, because half of what a baseline
has to carry is not workflow-shaped: a `uses:` line cannot enable secret scanning and cannot create
a ruleset.

| Part | Shape | How a repository gets it |
| --- | --- | --- |
| test, typecheck, lint, build, dependency audit | A reusable workflow, [`.github/workflows/provider-ci.yml`](../.github/workflows/provider-ci.yml) | One `uses:` line, in one file copied unchanged from [`docs/provider-baseline/ci.yml`](provider-baseline/ci.yml) |
| Secret scanning, push protection, Dependabot alerts, squash-only merges, the ruleset | Repository settings | [`scripts/provision-provider-repository.ts`](../scripts/provision-provider-repository.ts), one run per repository |
| The dependency graph | A repository setting no *repository* route reaches | By hand, at Settings → Advanced Security. An org-level [code security configuration](https://docs.github.com/en/rest/code-security/configurations) carries `dependency_graph` and can be attached to named repositories, which is a shape nothing here has taken — *What the first real run showed* below |

**The required context is `baseline / gates`**, and it is composed rather than chosen: for a
reusable workflow *"the name format is `<job name> / <reusable job name>`"*
([Troubleshooting rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/troubleshooting-rules#troubleshooting-required-status-checks)),
so it is the caller's job id followed by the called job's. **This is the only place it is written
down**, and `scripts/check-docs.ts` composes the two halves on every run and fails if they have
moved — the same rule as *The ruleset* above, and for a worse failure: a job renamed here blocks
every merge in every Provider repository at once, and none of them would report why.

**Neither job carries a `name:`**, so each job id is the name GitHub reports and there is one
string on each side rather than two that have to agree. That shape was read off a live
cross-repository call rather than derived: `withastro/astro`'s job `prettier` calls
`withastro/automation`'s job `format`, and the check run is named `prettier / format` (read
20 August 2026).

### Why the workflow lives in this repository

**Nothing else here needs it, and it is still the right home.** The alternative was a seventh
repository holding one file. Three reasons against that:

- **Renovate runs here.** [`renovate.jsonc`](../renovate.jsonc) is scoped to this repository, so
  the action versions in the baseline are updated by the same weekly pull request as everything
  else. In a repository nothing watches they would rot, and a pinned `actions/checkout` is exactly
  the thing that rots quietly.
- **It sits beside the gates it mirrors.** `.github/workflows/ci.yml` and the baseline differ on
  purpose (below), and a reader comparing them has both in one tree.
- **`check-docs` can reach both halves.** The composition check above needs the caller template and
  the called workflow in one checkout.

**It is deliberately not shared with this repository's own job.** `ci.yml` carries a production
release, a `postgres:17` service, `knip` and the documents check — none of which a Provider has or
could use, and the release is one it must never have. Two files that agree where it matters and
diverge where they should is the honest arrangement; one file with five conditionals in it is not.

### Why the `uses:` reference works, and what would break it

**Both repositories are public, and that is the whole access policy.** A reusable workflow may be
called when *"the called workflow is stored in a public repository, and your organization allows you
to use public reusable workflows"*
([Reusing workflow configurations](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations)),
so nothing has to be granted per Provider. **This holds only while every Provider repository is
public**, which [ADR-0014](adr/0014-shell-providers-and-per-source-retention.md) →
*Decision 3 — reachability splits by credential, in three classes* requires in every class — and
`repositoryProblems` in [`scripts/lib/provider-baseline.ts`](../scripts/lib/provider-baseline.ts)
refuses a private one rather than provisioning it, because the failure mode is a *cannot find
reusable workflow* error that reads like a typo in the `uses:` line.

**The reference is `@main` rather than a tag or a SHA**, which is allowed — the same page says a
public reusable workflow *"can be referenced using a SHA, a release tag, or a branch name"*. A
branch means a fix reaches every Provider at once instead of through six pull requests; the cost is
that a rename reaches them all at once too, which is what the composition check exists for. It is
our own repository on both ends, so this is not a third-party pin.

**No `secrets: inherit`.** The baseline needs no secret: a Source credential lives in the Provider's
own Vercel project and never in Actions (*Where a Source credential lives* below). Inheriting would
also bind the arrangement to one organisation — it works only for callers *"in the same organization
or enterprise"* ([Reuse workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows))
— and a self-hosted copy of a keyless Provider is neither.

### What the gate runs, and what it deliberately does not

`pnpm run test`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run build`, then
`pnpm audit --audit-level=high`. The order, the threshold and the missing `--ignore-registry-errors`
are [`agents/workflow.md`](agents/workflow.md) → *The gates*' decisions rather than new ones.

**`pnpm run` and not `pnpm -r run`.** The recursive form fails with
`ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT` when no selected package declares the script (observed on pnpm
11.20.0), so it would impose this repository's workspace shape on every Provider. A root script that
fans out is the Provider's own decision. What the baseline does require is that the root
`package.json` declares all four, and provisioning refuses a repository missing any of them: a gate
that is red on arrival is a gate that gets ignored.

**A Provider may add jobs of its own beside the calling one**, and provisioning looks for the job
that calls the baseline rather than for a caller with one job in it. Requiring a single job would
refuse a Provider that had added a deploy job, and the only remedy would be deleting it. What must
not change is that job's id, which its ruleset requires by name.

**`knip` and the documents check are not in it.** Both are configured against this repository —
`knip.jsonc` carries a Drizzle override, and `check-docs.ts` reads this register. A Provider adding
either is welcome to; the baseline is the floor, not the ceiling.

**`Vercel` is not in the ruleset**, though it is one of the two contexts this repository requires.
Whether a Provider repository has the Vercel app installed is a per-repository fact, and a required
context that never reports blocks every merge for ever — a worse failure than the one it guards
against. It joins a Provider's ruleset when that Provider has a deployment reporting it.

### Provisioning one repository

The order matters, and the script enforces it rather than documenting it and hoping:

1. **Create the repository, public**, and commit `docs/provider-baseline/ci.yml` to
   `.github/workflows/ci.yml` unchanged, together with a root `package.json` declaring **the four
   scripts and a package manager**. Both halves of that `package.json` are things whose absence
   makes the gate red on its first run: the scripts are what the workflow calls, and the pnpm
   version is what resolves the toolchain, since `pnpm/action-setup` is given no `version:` and its
   README makes that *"Optional when there is a `packageManager` or `devEngines.packageManager`
   field in the `package.json`"* ([pnpm/action-setup](https://github.com/pnpm/action-setup), read
   20 August 2026).
2. **The workflow file is copied rather than written by the script, and that is a limit rather than
   a preference.** For the contents endpoint *"the workflow scope is also required in order to
   modify files in the `.github/workflows` directory"*
   ([repository contents](https://docs.github.com/en/rest/repos/contents)), and the token behind
   `gh` here holds `repo` and not `workflow` (`gh auth status`, read 20 and 21 August 2026). So the
   file travels with the repository's own first commit, and the script verifies that it arrived
   rather than putting it there. **The missing scope binds that endpoint and not the push, and the
   first commit is what settled it**: `provider-tmdb`'s carried `.github/workflows/ci.yml` over ssh
   on 21 August 2026 and was accepted, because an ssh push presents a key rather than that token.
   So `gh auth refresh -s workflow` is not a step here — the same commit that makes the repository
   non-empty is the one that installs the gate.
3. **Let one run finish**, so the composed context has actually reported. The script reports what
   that run concluded and never refuses on it: a red default branch is a reason to provision rather
   than a reason not to, since the ruleset is what stops the *next* unchecked merge.
4. `node scripts/provision-provider-repository.ts provider-tmdb`, which refuses before it writes
   anything if the repository is not the shape above — no job calling the baseline, a copied gate
   rather than a call, a missing script or package manager, or a context no check run has been seen
   reporting. That last one is **CAN-40 Give main a ruleset that refuses an unchecked merge**'s
   lesson in code: nothing is required of a repository until a run has been seen emitting it.
5. **Get the dependency graph seeing something**, then re-run the script. It reports SKIP rather
   than PASS in **two** cases, and only the first is the dashboard step: the graph being *off*, and
   the graph being *on and holding nothing but the repository's own SBOM entry*. Both leave
   Dependabot alerts reporting nothing while still reading as enabled
   ([incident](incidents.md#dependabot-alerts-were-enabled-and-blind)), and the second is the one no
   endpoint status reveals. **A repository created now may need neither a click nor anything else
   you can do** — `provider-tmdb` came with the graph already on and had to wait for GitHub to parse
   its manifests, which is *What the first real run showed* below.

It then reads back everything it set — the merge methods, both secret-scanning settings, the alerts
and the whole ruleset including its bypass actors — because what was asked for is not what is true
until it has been read.

### What the first real run showed

**The write half ran on 21 August 2026, against `provider-tmdb`**, under **CAN-143 Provision
provider-tmdb to the baseline, and correct the register from the first real run**. Until then this
section could say only what the preflight refused. Three things it could not prove are now proved,
and **one step it used to report as passing turned out not to be evidence of anything** — which is
the more useful half, and is below the three.

- **GitHub accepted the ruleset payload unchanged**, which is the half no run here could prove.
  Read back in full, ruleset `21142169` is deep-equal to what `baselineRuleset` composed for every
  field sent — `name`, `target`, `enforcement`, both `ref_name` conditions, all three rules with
  their parameters in the order they were sent, and `bypass_actors: []`. The only difference is the
  key order inside `conditions.ref_name`. GitHub **added** `id`, `source_type`, `source`,
  `node_id`, `created_at`, `updated_at`, `current_user_can_bypass` and `_links`, and normalised,
  defaulted, reordered or dropped nothing. `current_user_can_bypass` came back `never`, which is
  the empty bypass list read from the other end and by a different name.
- **The composed context is the name a check run reports there, character for character.** The
  first run on `main` produced exactly one check run, named `baseline / gates`, from the
  `github-actions` app, concluding `success`
  ([run 32475994986](https://github.com/jacobrees-canoncore/provider-tmdb/actions/runs/32475994986),
  21 August 2026). So the `<job name> / <reusable job name>` format holds across repositories as
  well as within one, and **`scripts/lib/provider-baseline.ts` needed no correction** — the payload
  and the composition are both what they said they were.
- **The update path is proven too, and by accident rather than by design.** A second run the same
  day found the ruleset already there and took the `PUT` branch instead of the `POST`, reporting
  `updated ruleset 21142169` where the first had reported `created`, and the read-back after it was
  the same deep-equal. **The evidence is the script's own report and not the API**, which is worth
  saying because the API cannot corroborate it: `created_at` and `updated_at` are 22 ms apart and
  `rulesets/21142169/history` holds one version — consistent with a `PUT` that changed nothing,
  which is exactly what a correct one does. So re-running provisioning against a repository that
  already carries the baseline is a safe no-op that reports drift. **That is not the same as drift
  detection**: it writes before it reads, and nothing runs it unprompted, so what it catches is
  drift somebody already went looking for. **CAN-145 Give the Provider provisioning a report-only
  mode, and something that runs it** owns both halves.
- **The `workflow` scope was never needed**, per step 2 above: the first push carried the caller
  over ssh and was accepted.

**The one step that did not pass is the dependency graph, and it failed in a new way.** It was
**already on** and had **indexed nothing**, so no dashboard step applied and none would have helped.
The first push landed at 11:10 UTC on 21 August 2026. These were read repeatedly from 11:12 to
12:12, the last of them **sixty-two minutes after the push**, and **no reading was ever different**:

| Read | Answer | CanonCore, same day |
| --- | --- | --- |
| `dependency-graph/sbom` | **`200`** with `.sbom.packages` of length `1` — the SPDX entry describing the repository itself, and no dependency at all | `781` |
| `dependencyGraphManifests` (GraphQL, `hawkgirl-preview`) | `totalCount: 0` | `8`, including `pnpm-lock.yaml` and every `package.json` |
| `github.com/…/network/dependencies`, **signed out** | *"No dependencies found."* | — |

**The `200` is the reading that settles it**, and it is the one the register's own row turns on: the
[incident](incidents.md#dependabot-alerts-were-enabled-and-blind) recorded `404` from this endpoint
while the graph was off. **The third row settles nothing on its own and is here as a reading rather
than as proof** — an unauthenticated fetch would not be shown an *Enable* button whatever the state,
and the Settings page was not read. GitHub's own expectation is that the graph is *"usually populated
within minutes"* of a push
([Configuring the dependency graph](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/configuring-the-dependency-graph)),
which is why sixty-two of them is worth writing down rather than waiting out quietly. **The next Provider
should expect this**, and the step that reports it now says so rather than reporting a pass.

**It is not the lockfile.** `pnpm` is its own row in
[the supported ecosystems](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/dependency-graph-supported-package-ecosystems),
recommended file `pnpm-lock.yaml`, with static transitive dependencies — and CanonCore's own graph
parses that file into 744 exactly-versioned entries. So this is GitHub failing to index a format it
supports, which makes it a vendor fault to escalate rather than a repository to fix.

**Nothing was found that flips it on, because it is already on** — the org-level configuration below
would set the same `enabled` it already holds. **What would sidestep the indexer entirely is the
[dependency submission API](https://docs.github.com/en/rest/dependency-graph/dependency-submission)**,
which is not a workaround but GitHub's own preferred route: submissions are ranked above static
analysis because they happen *"during artifact builds"* and *"have the most complete information"*,
and *"submitted dependencies will receive Dependabot alerts and Dependabot security updates"*. **It
is not adopted here and the cost is why**: it would put a submission step in every Provider's shared
baseline and change what the graph holds from what GitHub detected to what our CI asserted — a gate
that can be wrong in a new direction, for a format static detection is supposed to handle. It is the
answer if this turns out to be permanent rather than slow.

**So the sign that made the incident legible is gone, and that is the correction.** There the graph
was off and answered `404`. Here it answers `200` with a count, reads as on by every route there is,
and the alerts are matching against nothing exactly as they were — the same blindness with no status
code to catch it by. **`readDependencyGraph` now returns `indexed` beside `enabled`**, false when
the count is the repository's own entry alone, and provisioning SKIPs on it rather than reporting
PASS: a green tick that cannot tell *nothing is vulnerable* from *nothing was parsed* is what that
incident exists to stop. The first run reported `11 passed`; the corrected script reports
`10 passed, 1 skipped` against the same repository — run, not predicted — and **that is the honest
number until GitHub indexes it**. **The condition itself is
CAN-146 `provider-tmdb`'s dependency graph is enabled and has indexed nothing**, which owns the
re-read and the escalation: closing the reporting gap is not closing the condition, and a note in a
document owns nothing.

**The same hole was open in this repository, and closing it there is half the fix.** The row above
says `enabled`, a graph holding nothing *is* enabled, so the roster comparison agrees either way —
which means CanonCore, where the incident happened, would have gone on reading green through exactly
the state `provider-tmdb` was in. `scripts/check-docs.ts` now fails separately on it, beside the
roster rather than inside them, because it is not a disagreement with this document. **Pointed at
`provider-tmdb` on 21 August 2026 it did fail, and every roster row agreed on the same run** — which
is the evidence that the rows could not have caught it.

**And there is a REST route after all**, which this section said had never been found. `POST
/orgs/{org}/code-security/configurations` takes `dependency_graph` — `enabled`, `disabled` or
`not_set` — and `…/{id}/attach` applies a configuration to named repositories
([Code security configurations](https://docs.github.com/en/rest/code-security/configurations)). The
org already carries GitHub's unattached `GitHub recommended` configuration, id `17`, and
`provider-tmdb` has none attached. **It is not used here and using it would be a decision, not a
fix**: the recommended one turns on four things *Dependency and secret scanning* above records as
deliberately off, and a configuration of our own would replace half of
`provision-provider-repository.ts` with an attachable object — which is the right shape and is
nobody's ticket yet. What the route does *not* do is make an already-enabled graph index.

**What preceded it is still worth keeping, because it is why two things are shaped as they are.**
The whole preflight was run against *this* repository on 20 August 2026, which is not a Provider and
is refused as one: it reported no job calling the baseline, no `test`, `typecheck`, `lint` or
`build` script at the root, and no check run by the composed name — naming `test, typecheck, lint,
build` as what reported instead — and exited non-zero **before the first write**. The
package-manager half of the third check did **not** fire, because this repository declares
`packageManager`, so the two halves are independently live. And an earlier version of the check-runs
step reported `(.name)` there, which is what sent the parsing into `provider-baseline.ts` where it
is tested: a step that refuses for a plausible-looking reason is indistinguishable from one that is
working. The ruleset itself was this repository's own, read off the live one that day and reproduced
with one context instead of two; every comparison in it is under test in
[`scripts/lib/provider-baseline.test.ts`](../scripts/lib/provider-baseline.test.ts), and the two
workflow files' shape in
[`scripts/provider-baseline-workflows.test.ts`](../scripts/provider-baseline-workflows.test.ts).

### Where a Provider's failure surfaces

A Provider that fails silently looks to the application like a Source with nothing to say, which is
the failure this baseline exists to make loud. Three failures, three routes, and only the first is
in place today:

| The failure | Where it surfaces | State |
| --- | --- | --- |
| Its gate goes red | GitHub's own Actions notification: *"you'll receive a notification when any workflow runs that you've triggered have completed"* ([Notifications for workflow runs](https://docs.github.com/en/actions/concepts/workflows-and-actions/notifications-for-workflow-runs)) | **Inherited rather than built here**, and it holds only while every push to a Provider repository is a person's: it reaches whoever triggered the run and nobody else, so installing Renovate on a Provider repository would make its failures silent. The alternative was a notifying step in the baseline, which would put a sending credential in six public repositories to buy what GitHub already does today |
| The deployment is gone | An UptimeRobot monitor of its own, from the fifty [ADR-0018](adr/0018-observability-sentry-and-an-uptime-monitor-outside-it.md) holds in reserve for exactly this | **Not provisioned.** No Provider deployment exists yet |
| An exception inside it | A Sentry project of its own, as `apps/mobile` and `apps/tv` each get one | **Not provisioned**, and blocked: nothing reports to Sentry at all yet, and **CAN-51 Keep a record of server errors past the hour Vercel keeps them** owns the SDK's shape |

**One thing has to be decided before the second row can be provisioned, and it is not a settings
edit.** The contract's `/capabilities` is the obvious thing to poll, and on an Authenticated
Provider it answers `401` to a caller with no bearer token — while UptimeRobot marks anything
*"answering with an erroneous HTTP status"* down *"instantly ... without verification"*
(*Uptime monitoring: UptimeRobot* below). So a free monitor pointed at a closed Provider's contract
endpoint would page the phone every five minutes for ever. The Provider needs an unauthenticated
liveness route, or the monitor needs a header the free plan may not send.

**CAN-141 Decide how a monitor asks a closed Provider whether it is alive** owns that decision, and
it is a ticket of its own rather than a criterion added to a neighbour. **CAN-101 Create the
provider-tmdb repository, and give it the TMDB credential** is the first repository to meet the
problem but carries no monitor, uptime or liveness-route criterion, so assigning it there would have
been the same homeless scope **CAN-107 Give every Provider repository a CI baseline**'s own amendment
flagged when it found supply-chain scanning assumed to live in **CAN-61 Keep the codebase and its
dependencies from silting up**. It has to be settled before a monitor is pointed at anything, which
is why it is not blocked by the deployment it will watch.

## Environment variables

**The roster for this application.** Every variable the `canoncore` Vercel project holds, plus the
GitHub Actions secrets, in one table. `scripts/check-docs.ts` compares each half against its own
source and fails when either disagrees: the Vercel rows against `vercel env ls --project canoncore`,
the Actions rows against `gh secret list`. The two do not reach equally far, and *What this check
compares, and what it cannot* below is which reaches where.

**It is no longer every variable the estate holds**, and the claim was narrowed on purpose. Under
[ADR-0014](adr/0014-shell-providers-and-per-source-retention.md#decision-1--the-app-is-a-shell) a
*Source* credential lives in its provider's own repository and its own Vercel project, so the
estate has several projects and this table reaches one. **Each provider repository holds the roster
for its own credentials**; the pointer here is *Where a Source credential lives* below.

*Read back from `vercel env ls --project canoncore` on 17 August 2026, and `gh secret list` on
16 August 2026.*

> **Both `NEON_*` rows were created Sensitive and had to be replaced.** `vercel env add` stores a
> Preview or Production value as Sensitive unless `--no-sensitive` is passed, and a Sensitive value
> cannot be read back by anyone — which would have broken two things this design rests on: the
> roster check compares sensitivity and would have failed, and
> [`../scripts/apply-migrations-ahead-of-merge.sh`](../scripts/apply-migrations-ahead-of-merge.sh)
> asks a human to paste the host it pulls from here. Both were removed and re-added with
> `--no-sensitive`, and the values were read back with `vercel env pull` to prove it took.

| Variable | Holder | Environments | Sensitivity | What it is |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Vercel | Production | Sensitive | The application role's connection string, which has to ask for `sslmode=verify-full`. Production only, on purpose: a static string must not be what a preview uses |
| `DATABASE_APP_USER` | Vercel | Production, Preview, Development | Non-sensitive | The application role name, for a preview to compose its own URL |
| `DATABASE_APP_PASSWORD` | Vercel | Production, Preview | Sensitive | Its password. One value serves both environments because a Neon role is a property of the *project*, so the same credential opens `main` and the `preview` branch alike — which is why the host is the only thing keeping the two apart, and why `apply-migrations-ahead-of-merge.sh` refuses a host it recognises as production's |
| `DATABASE_PRODUCTION_HOST` | Vercel | Production, Preview | Non-sensitive | Production's Neon host, so that a preview can assert the host it resolved is not that one. **Non-sensitive deliberately**: a value nobody can read back is a value nobody can catch going stale, and a stale one makes the preview's assertion vacuous |
| `NEON_PGHOST` | Vercel | Preview | Non-sensitive | The shared schema-only `preview` branch's Neon host. Preview only: production reaches `main` through `DATABASE_URL` and must never resolve a branch. **Non-sensitive for the same reason as the row above** — it opens nothing without `DATABASE_APP_PASSWORD`, and it is the value `apply-migrations-ahead-of-merge.sh` asks a human to paste, which a write-only variable could not be. Held by us since 17 August 2026; before then the Neon integration injected it per deployment and no listing could show it |
| `NEON_PGDATABASE` | Vercel | Preview | Non-sensitive | `neondb`, on that branch. A second variable rather than a constant in the code because the pair is what the branch is addressed by, and splitting them across a file and a dashboard is how one gets changed without the other |
| `DATABASE_AUTH_USER` | Vercel | Production, Preview, Development | Non-sensitive | The *auth* role's name. better-auth connects as a third role, because the thing that authenticates cannot be constrained by the identity it establishes — [`apps/web/src/auth/auth.ts`](../apps/web/src/auth/auth.ts) has the argument and *Roles* below has what it may reach |
| `DATABASE_AUTH_PASSWORD` | Vercel | Production, Preview | Sensitive | Its password, project-level exactly as the application role's is |
| `BETTER_AUTH_SECRET` | Vercel | Production, Preview | Sensitive | What better-auth signs session cookies with. **A missing value is worse than an error**: better-auth invents one per process, and Vercel Functions are per-invocation isolates, so every cold start would issue cookies the next isolate cannot verify and a person would appear to be signed out at random. `auth.ts` refuses to serve without it. One value per environment, and never shared with a preview's parent |
| `RESEND_API_KEY` | Vercel | Production, Preview | Sensitive | Two distinct keys under one name, one per environment |
| `EMAIL_FROM` | Vercel | Production, Preview | Sensitive | `CanonCore <noreply@mail.canoncore.com>` |
| `SENTRY_DSN` | Vercel | Production, Preview | Sensitive | Also recorded under *Error reporting* below, since a DSN is not a secret |
| `SENTRY_AUTH_TOKEN` | Vercel | Production, Preview | Sensitive | Organisation auth token, scope `org:ci`, for source-map upload |
| `MIGRATION_DATABASE_URL` | GitHub Actions secret | — | — | The migration role's connection string, which has to ask for `sslmode=verify-full`. Not in Vercel: migrations run in Actions, not in the build. **Two workflows consume it**: `ci.yml`'s migration step, and `purge-source.yml`, which is dispatched by hand and holds the credential so that an operator under a licence deadline has none to fetch — [`runbook.md`](runbook.md) → *A Source's licence terminates* |
| `NEON_API_KEY` | This machine | — | — | **Project-scoped**, Neon, for the worktree databases — *The Neon API key* below. Held in a file on the machine that runs the setup hook and in no deployment, so no reader here can check it, and it appears on every `check-docs` run as unchecked rather than silently absent |
| `TMDB_READ_ACCESS_TOKEN` | provider-tmdb | Production, Preview | Sensitive | **TMDB's bearer token, and the one Source credential this estate holds.** It is not in the `canoncore` project and must not return there — [ADR-0014](adr/0014-shell-providers-and-per-source-retention.md#decision-1--the-app-is-a-shell). **Its Holder names the repository and deliberately not `Vercel`**, which is the trap *What this check compares, and what it cannot* below describes: that filter is a case-sensitive substring test, so `Vercel (provider-tmdb)` would be compared against the `canoncore` project, fail against a project that correctly does not hold it, and leave the unchecked list at the same moment. Checked by [`provider-tmdb`'s own copy](https://github.com/jacobrees-canoncore/provider-tmdb/blob/main/scripts/check-docs.ts) against its own project, which read `2 variables agree` on 21 August 2026 |
| `CANONCORE_ACCESS_TOKEN` | provider-tmdb | Production, Preview | Sensitive | **What a caller presents to reach `provider-tmdb`, and not a *Source* credential** — it authenticates a consumer to our own Provider, in the same class as `DATABASE_URL` ([`CODING_STANDARDS.md`](../CODING_STANDARDS.md)). Set 21 August 2026 by **CAN-152 Implement the Provider contract in provider-tmdb, and close its endpoint**, which is what closes that endpoint. **The application does not hold it yet**: nothing here calls a Provider until [CAN-113 Add a Provider by pasting its URL](https://linear.app/jacobrees-canoncore/issue/CAN-113), and because a Sensitive value cannot be read back, giving the application its half means setting a fresh value on **both** projects rather than copying this one |
| `VERCEL_TOKEN` | GitHub Actions secret | — | — | **Account-scoped, and it has to be.** Two steps of `ci.yml` consume it: the `node scripts/check-docs.ts --verbose` run, and **Build and promote the production deployment**. A *project*-scoped token fails both, and fails them differently. Replaced 14 August 2026, **expires 14 August 2027** — *Why this one is account-scoped* below holds the identity, the expiry and the scope, and `scripts/check-docs.ts` compares that expiry against Vercel on every run, in CI as well as locally |

**Two `NEON_*` variables, and they are ours rather than the integration's.** All sixteen the
Marketplace integration had written were removed on 13 August 2026, and whether it re-writes them is
checked by **CAN-69 Record the credential purge**. The two rows above were set by hand on 17 August
2026 under CAN-79 Previews clone production rows, and the integration has no switch to stop it, and
they keep the `NEON_` prefix on purpose: it is the prefix the integration's own variables would use,
so a value that reappeared under a name already in this roster would be compared against it rather
than slipping in as an undocumented extra.

**They were in no row here until then, and the reason they now are is the change.** While the
integration created a branch per deployment it injected these two by webhook, so they were not
project-level variables, `vercel env ls` could not show them, and
[ADR-0016](adr/0016-provisioning-plain-api-keys-neon-excepted.md) argued that a project-level one
"would be the bug, because every other preview would read it too". **Every preview reading it is now
the design** — one shared schema-only branch, [ADR-0023](adr/0023-one-shared-schema-only-preview-branch.md) —
and the consequence for this table is that both values came under the roster check at the moment they
stopped being per-deployment. A variable nothing can read back is a variable nothing can gate.

**There is deliberately no `DATABASE_AUTH_URL`.** better-auth's connection string is composed from the
application's, by swapping in the two `DATABASE_AUTH_*` values above — so the host, the database, the SSL
mode, the preview-versus-production branch and both of its refusals are inherited rather than restated.
A whole second string would be a second thing to keep in step, and a Sensitive one nobody can read back
to compare: the failure would be better-auth writing to production from a preview, which is the one
direction that is worse than the read `database-url.ts` already refuses.
[`apps/web/src/db/database-url.ts`](../apps/web/src/db/database-url.ts) holds the composition and its
tests hold the four cases.

**A Sensitive variable cannot be read back, by anyone** — not by the CLI, not from the dashboard,
not by whoever set it ([incident](incidents.md#a-vercel-sensitive-variable-cannot-be-read-back-by-anyone)).
**If one is lost, reissue it at the source.** Each section below names where its source is.

**What the application actually requires is declared in
[`apps/web/src/env.ts`](../apps/web/src/env.ts), and `next build` refuses to run without it** —
**CAN-49 Refuse to build without the environment variables the app needs**. That schema answers a
different question from this table: the table is what is provisioned, the schema is what the code
reads.

> **Which rows are observed, and which are still only promised.** Since **CAN-23 One Story from
> Neon, behind row-level security** a deployment opens a connection, so `DATABASE_URL`,
> `DATABASE_APP_USER`, `DATABASE_APP_PASSWORD` and `DATABASE_PRODUCTION_HOST` are read at request
> time by [`apps/web/src/db/database-url.ts`](../apps/web/src/db/database-url.ts), and since
> **CAN-79 Previews clone production rows, and the integration has no switch to stop it** so are
> `NEON_PGHOST` and `NEON_PGDATABASE` — by the same module, on the preview branch of the same
> function. `VERCEL_TOKEN` is read on every CI run and `MIGRATION_DATABASE_URL` whenever a migration
> runs, so both are observed too — by Actions rather than by the application. **The Resend rows are
> read at request time as of CAN-31 Email verification and password reset**, by
> [`apps/web/src/mail/send.ts`](../apps/web/src/mail/send.ts), which refuses to send without either
> of them. The Sentry rows still wait on the first thing that reports to it.
>
> **Read is not the same as accepted, and the Production `RESEND_API_KEY` proved the difference.**
> From 10 to 18 August 2026 that row was recorded here as provisioned while the value it held
> authenticated nothing: the first sends ever attempted, on 17 August, were refused, and the key the
> row named had *No activity* against it throughout. **A row in this table means a variable is set,
> never that its value works** — `scripts/check-docs.ts` compares names, environments and
> sensitivity, and no value. What closes that for Resend is the probe in *Rotating a Resend key*
> below, not anything in this table.
>
> **One of the two is only ever read in production, and that is the guard rather than a gap.** Outside
> production `send.ts` refuses any recipient at neither `resend.dev` nor `mail.canoncore.com` before it
> builds the request — *Transactional email* below has why that refusal is the only isolation Resend
> offers, and *Reading the inbox* has why the second domain is the guard's own reason rather than an
> exception to it. So a preview reaches Resend only for an address that cannot be a person, and a
> preview carrying a broken `RESEND_API_KEY` would look healthy until the first send that got past the
> guard. **The preview key was checked that way on 18 August 2026 and is sound**: a sign-up on a live
> preview addressed to
> `delivered@resend.dev` logged no refusal, on a deployment where the same form addressed to a real
> domain logged one, and Resend's own send log records that message as **delivered**.
>
> **This no longer waits on CAN-26 Import a series from TMDB, with the overlay behind it.** That
> ticket used to be named here as the consumer of `TMDB_API_READ_ACCESS_TOKEN`, and under
> [ADR-0014](adr/0014-shell-providers-and-per-source-retention.md#decision-1--the-app-is-a-shell)
> it consumes no external credential at all: it reads a provider, and the provider holds the key.
>
> **They are read at request time and not at build time, on purpose.** A schema demanding
> `DATABASE_URL` of every build would refuse a preview's, which correctly has none, and a refused
> preview build reports the required `Vercel` context red — so the gate CAN-49 Refuse to build without the
> environment variables the app needs put there would have blocked every merge. `apps/web/src/env.ts` says the same thing next to the code.

### Where a Source credential lives

**No *Source* credential is held by the `canoncore` project**, under
[ADR-0014](adr/0014-shell-providers-and-per-source-retention.md#decision-1--the-app-is-a-shell).
Each lives in its provider's own repository and its own Vercel project, and that repository
documents it.

| Source | Credential | Where it lives now |
| --- | --- | --- |
| TMDB | Bearer token, scope `api_read` | **The `provider-tmdb` Vercel project**, as `TMDB_READ_ACCESS_TOKEN`, Sensitive, on Preview and Production — read back with `vercel env ls --project provider-tmdb` on 21 August 2026. It was removed from the `canoncore` project on 15 August 2026 by **CAN-99 Move the TMDB credential out of the app, atomically with its roster row** and held nowhere in between. It is recoverable from [`themoviedb.org/settings/api`](https://www.themoviedb.org/settings/api) — see *External data source: TMDB* below |

**And that Provider now uses it.** Until 21 August 2026 the row above recorded a credential sitting
in a project that served nothing. **CAN-152 Implement the Provider contract in provider-tmdb, and
close its endpoint** is what reads it: the repository serves version 1 of the contract, closes its
endpoint against `CANONCORE_ACCESS_TOKEN`, and derives `liveness` from TMDB's daily ID exports.
**What still does not exist is the deployment** — [CAN-150 provider-tmdb is provisioned on GitHub and
unwired on Vercel, so nothing deploys](https://linear.app/jacobrees-canoncore/issue/CAN-150) owns
that, so the code is written and running nowhere.

**Held nowhere was a real state, and recording it rather than tidying it away is what made the
change above legible.** A credential whose home is unrecorded is the failure this roster exists to
prevent; a credential recorded as homeless is merely work outstanding — and the row could be
corrected the moment the home appeared, because it said where the token was not. **It keeps its
Holder outside this project**, and becomes a row in the roster above only if it ever returns here,
which under ADR-0014 it should not.

### The Neon API key

**One project-scoped Neon key, on the machine that runs the setup hook, and nowhere else.** It
exists so that `orca worktree create` can give a lane a database of its own —
[ADR-0025](adr/0025-a-preview-database-per-worktree.md) — and it is what
[ADR-0016](adr/0016-provisioning-plain-api-keys-neon-excepted.md) was amended for on 21 August 2026,
having said until then that this project holds no Neon API key.

| | |
| --- | --- |
| Name in Neon | `canoncore worktree databases (CAN-138)`, created 21 August 2026 |
| Scope | **Project-scoped to `canoncore`** (`steep-wave-52467839`), not organisation-wide. Created through the Console's *Create new API key* → *Project-scoped*, which offers the project as a field |
| Where it lives | `~/.config/canoncore/neon-api-key`, mode `600`. `NEON_API_KEY` in the environment overrides it |
| Where it must never live | This repository, a Vercel variable, a GitHub Actions secret, or any deployment. It can create and destroy databases |
| Who reads it | [`../scripts/provision-worktree-database.ts`](../scripts/provision-worktree-database.ts) and [`../scripts/sweep-worktree-databases.ts`](../scripts/sweep-worktree-databases.ts). Both report a SKIP and change nothing when it is absent |
| If it is lost | Reissue it in the Neon Console and rewrite the file. Nothing else holds a copy, and a lane with no key falls back to the shared `preview` branch rather than failing |

> **The scope was verified rather than assumed**, on the day it was issued and against the live API:
> it reads `canoncore`'s branches (`200`) and answers `404` on the sibling `waveger` project
> (`delicate-credit-61083163`) and on every `/organizations/…` path. Least privilege here is not
> cosmetic — the same Neon organisation carries `waveger`, which nothing in this repository has any
> business writing to.
>
> **A second, org-wide key existed on that organisation, and this project did not create it.** The
> Console listed `Canoncore`, org-wide, **created 16 February 2026, last used 19 March 2026** — both
> dates months before this project's Neon project existed (10 August 2026). It granted admin-level
> access to every project, member and billing detail on the organisation. Recorded here because a
> dormant admin credential nobody has accounted for is exactly what this roster exists to surface.
>
> **It was revoked on 21 August 2026**, and the Console was re-read afterwards from a cold
> navigation: the org-wide entry is gone, and the project-scoped key above is the only one left.
> The paragraph above is kept in the past tense rather than deleted, because a revoked credential
> that once existed is worth more here than a clean table. **CAN-138 Give every Orca worktree its
> own preview database, so parallel schema work stops colliding** found and recorded it and
> deliberately did not touch it, on the ground that deleting a key whose consumer is unknown is not
> a step to take from inside an unrelated ticket — a judgement this row does not overturn. Revoking
> it was decided separately under
> [CAN-144 Bound or detect the Neon bill, which the Vercel spend cap excludes](https://linear.app/jacobrees-canoncore/issue/CAN-144)
> on its own merits: five months dormant, organisation-wide, and predating everything it could
> reach. **Nothing is known to have broken**, which is not the same as nothing having broken; if
> some unattributed tool stops authenticating against Neon, this is the first thing to suspect.

### What this check compares, and what it cannot

**The roster has two halves and `scripts/check-docs.ts` compares both, each against its own
source.** Which source can speak for a row is read off its Holder column. The reach of each is worth
stating in a table, because it is exactly what a green tick does not tell you:

| Half | Source | Where it gates |
| --- | --- | --- |
| Holder says `Vercel` | `vercel env ls --project canoncore` | CI and locally. The runner installs `vercel` and holds a `VERCEL_TOKEN` |
| Holder says `GitHub Actions secret` | `gh secret list` | **Locally.** Every route to them from a runner costs a credential, and none is bought — below |
| Any other Holder | none | Nowhere. Named on every run instead |

**Only names are compared, because a secret has no other readable property.** An Actions secret
cannot be read back any more than a Vercel Sensitive one can, so this half catches a secret set but
undocumented, or documented but never set — which is how a roster goes stale — and cannot catch a
stale value.

**Why the Actions half stops at a laptop.** `gh secret list` reads the secrets API, whose permission
is not among the scopes `permissions:` accepts
([Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions)),
so the workflow's own token cannot be granted it — and says so on a runner rather than in theory,
`HTTP 403: Resource not accessible by integration`
([incident](incidents.md#a-workflow-reading-tojsonsecrets-is-held-before-any-job-starts)). The keyless route that would have worked,
`toJSON(secrets)`, was built, pushed and **refused by GitHub before any job started** — it is a named
indicator of malicious-workflow detection
([incident](incidents.md#a-workflow-reading-tojsonsecrets-is-held-before-any-job-starts)). That
leaves a fine-grained token with `secrets: read`, which is a credential added to check the credential
roster, and the same reasoning that refused a Linear credential for the label roster refuses this
one. So the comparison happens where a credential already exists: on the machine `gh` is already
signed in on.

**Which makes this the same answer twice, and that is the point.** Both rosters gate locally, both
skip in CI saying why, and neither buys a credential to do otherwise —
[`docs/agents/triage-labels.md`](agents/triage-labels.md) → *Where this check gates, and where it does
not* is the label half, with the argument for accepting rather than enforcing.

**What was decided, and what was turned down.** **CAN-109 Decide whether the label roster check needs
enforcing, or is honest as it stands** posed three options and the answer is a fourth, assembled from
two of them:

| | Option | Outcome |
| --- | --- | --- |
| 1 | Accept it, and make the skip visible rather than a log line | **Taken, for the label roster** and now for this half too. The job summary is the mechanism |
| 2 | Widen the comparison to reach the Actions secrets | **Taken, and it lands locally.** The two rows leave the unchecked list because they are genuinely compared, just not everywhere |
| 3 | A Linear API token in Actions, to enforce the label roster from CI | **Refused**, on the cost of holding a credential: a roster row and a rotation story of its own, to gate eight strings. **Not on its reach** — Linear documents both permission-restricted and team-restricted personal keys, so a read-only key confined to team `CAN` is available ([research](research/closing-the-ci-check-gaps.md)) |
| 4 | `toJSON(secrets)`, which would have made option 2 reach CI for nothing | **Blocked by GitHub**, and would have blocked every merge with it |

**`scripts/check-docs.ts` was deliberately not widened past one Vercel project.** It reads
`vercel env ls --project canoncore`, and `parseDocumentedVariables` keeps only rows whose Holder
column contains `Vercel` — so a row naming a Provider's project leaves the comparison silently.
Teaching it to walk several projects would be building for `provider-tmdb` before that repository
exists, which is the speculative generality `CLAUDE.md` rules out. **When `provider-tmdb` exists,
that repository runs its own check against its own project** — the same shape, one project each,
rather than one checker reaching across an estate.

**So the third row of the first table is the blind spot, and it is named rather than left silent.**
`parseUncheckedVariables` reports every documented row neither source reaches, in the check's detail
line. A bare local run prints only `PASS` and the check's name, for this check as for every other, so
**pass `--verbose` when you are asking what the roster actually covers**.

**It is no longer empty.** This section used to say the first entry would be the TMDB token once
`provider-tmdb` held it, and since **CAN-152 Implement the Provider contract in provider-tmdb, and
close its endpoint** that is what it holds — together with `CANONCORE_ACCESS_TOKEN`, the credential
that closes that endpoint. Both are unchecked *here* by design and checked *there*, by that
repository's own copy of this script against its own project, which read `2 variables agree` on
21 August 2026.

**Unchecked here is the honest word for it, and it is not the same as unchecked anywhere.** The
arrangement is one checker per project rather than one checker walking an estate — so what this run
reports is the boundary of its own reach, and following the row to the repository it names is how a
reader gets the rest.

**And a green CI run says which halves it compared, without anyone opening a log.** `check-docs`
writes its whole report to the job summary, so the run's own page carries every check, its result and
what it read. That is what a skip needs to be worth anything: `docs/agents/workflow.md` → *The gates*
holds the rule, and this is where it becomes visible. The same page answers the finding recorded on
**CAN-86 Record VERCEL_TOKEN in the credential roster, and revisit whether the release can use a
project-scoped one** — a wrongly-scoped token skips this roster rather than failing it — so the two
share one mechanism rather than getting an answer each.

**A future provider row must not put `Vercel` in its Holder**, and the same now goes for
`GitHub Actions`. Both filters are case-sensitive substring tests, so a Holder reading
`Vercel (provider-tmdb)` would be pulled *into* the comparison against `canoncore`, fail against a
project that correctly does not hold it, and disappear from the unchecked list at the same moment —
the one failure mode this arrangement still has. Name the holder as the repository, and let its own
project's check do the verifying.

### Why this one is account-scoped

`VERCEL_TOKEN` is scoped to the account rather than to this project, and a project-scoped token
breaks both consumers — differently, which is the part worth recording.

**What the live token is**, read back from `vercel tokens ls --json` on 16 August 2026:

| Token | Scope | Expires | State |
| --- | --- | --- | --- |
| `canoncore-github-actions-release` | **User** — the whole account: every team the user belongs to, and every project in each | `2027-08-14` | **Live.** Created 14 August 2026 at 10:43 UTC, runs out **16:43 UTC on 14 August 2027**. Identified as the one CI holds by last use, which moves with every run and so is quoted as a reading rather than a fact: at 17:43 UTC on 16 August 2026 it sat inside run `31962399354`'s window |
| `canoncore-github-actions-release` | Project — `canoncore` alone, inside `team_fM6JucuEULAiTuHY5TM5h3TP` | `2027-08-14` | **Replaced** 14 August 2026, thirty-six minutes after it was set, and **revoked 16 August 2026** — it had a year of life left and nothing had used it since |

**The expiry is compared rather than merely written down**, and the second row is why it cannot be
compared by name. Until this change no document here carried an expiry at all — the replacement date
was recorded and the date it runs out was not — so nothing had gone stale in these pages. What had
gone stale is the tracker's copy: from 14 to 16 August 2026 **CAN-86 Record VERCEL_TOKEN in the
credential roster, and revisit whether the release can use a project-scoped one** described the
replaced token's identity as the live one's. Nothing could have caught that by reading, because two
unexpired tokens carried the one name. So `scripts/check-docs.ts` reads the listing, takes the token
Vercel **last saw used**, and fails when its expiry is not the date above.

**What that catches, and the case it would have missed.** It catches the ordinary drift: a token
reissued weeks or months later, whose expiry moves with it and whose recorded date stops matching.
It would **not** have caught 14 August, because the replacement was minted thirty-six minutes after
the token it replaced and the two expire on the same day — the comparison is to the day, which is
the precision a roster can carry in a form a reader can check.

**It also does not count down to 14 August 2027, on purpose.** A check that began failing as the
date approached would turn a stopped release into a blocked merge, which is worse than what it warns
about — and this failure is loud already: the release step stops and production keeps serving the
previous deployment. So the expiry stays a year, and a shorter one would buy nothing, since it
cannot narrow the scope and every rotation is manual dashboard work.

**"Account" here is the user, not the team, and the distinction is real even where it makes no
difference today.** The live token's scope is `{ "type": "user" }` with no team attached, so it
reaches every team the user belongs to. The dashboard's middle rung — one team, all its projects —
is narrower, and the narrowest is the project rung that does not work at all. The account holds one
team, `jacobreesnew-7380's projects`, and nine projects in it, so user scope and team scope reach
the same nine today. They part company the moment a second team exists, or if the token should be
kept off account-level endpoints such as the token list itself. **The middle rung is untested**, and
what would settle it is a team-scoped token minted in the dashboard and run through the release
once.

| Token scope | `check-docs` result **in CI** | When |
| --- | --- | --- |
| Project | `5 passed, 2 skipped, 0 failed` | 14 August 2026, seven checks |
| Account | `6 passed, 1 skipped, 0 failed` | 14 August 2026, seven checks |
| Account | `6 passed, 2 skipped, 0 failed` | 16 August 2026, run `31960500155`, eight checks |
| Account | `7 passed, 2 skipped, 0 failed` | 16 August 2026, run `31964525778`, nine checks |

**The two dates are not comparable and the third row says why.** **CAN-109 Decide whether the label
roster check needs enforcing, or is honest as it stands** added the secret roster, which skips on a
runner, so the current baseline in CI is two skips rather than one. What the first two rows record
is the shape, and the shape is unchanged: a project-scoped token turns a pass into a skip rather
than into a failure, so it costs a gate without costing a build. A local run reports `9 passed,
0 skipped`, because the label roster, the secret roster and the token expiry all reach their source
here and none of them can be assumed to on a runner — so no local total is evidence about the
token's scope.

**Every total above is against the check count of its day, and the count has moved twice.** Seven
checks on 14 August, eight after CAN-109 Decide whether the label roster check needs enforcing, or
is honest as it stands added the secret roster, nine since the expiry check above. Read the row's
own date before comparing it with a run, and read the run's summary rather than its tally.

**The scope is now stated on the run rather than inferred from a skip.** Run `31964525778`
reported `PASS the release token's expiry matches Vercel — expires 2027-08-14, scope wider than one
project, read the newest 100`. That line is read from the token CI actually holds, by that token, so
it settles two things this section previously took on trust from a laptop: the expiry above, and
that the token in use is not project-scoped. It is a detail line and not a gate — what a
wrongly-scoped token *costs* is still **CAN-109 Decide whether the label roster check needs
enforcing, or is honest as it stands**'s answer, below, and does not get a second one here.

**The release step fails loudly and `check-docs` fails quietly.** **Build and promote the
production deployment** stops the job at its `vercel pull`, with
`Error: Could not retrieve Project Settings`, having `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` set in
its environment and unrescued by either. The `check-docs` step instead *skips* `the variable roster
matches Vercel` and carries on green, so a wrongly-scoped token costs a documentation gate on every
branch and only announces itself on a merge to `main`.

**Reproduced by hand and then on live CI**, which is worth separating because the first was in an
empty directory and proves less. Run `31792489379` on `f34b673`, landing **CAN-84 A preview's
composed sslmode=require silently stops verifying certificates under pg 9**, failed there —
**attempt 1**, and the citation needs that word: attempt 2 was the same job re-run on the
replacement token, every step green, so the run's own page reports success and a reader following
the number alone would find no failure at all.

**Anyone reading a green pull request would not have known, and now would.** Since **CAN-109 Decide
whether the label roster check needs enforcing, or is honest as it stands** the report reaches the
run's own page, where this skip sits with its reason next to the others — *What this check compares,
and what it cannot* above.

**Dropping `--prebuilt` would not have bought project scoping.** **CAN-86 Record VERCEL_TOKEN in
the credential roster, and revisit whether the release can use a project-scoped one** proposed that
`vercel pull` is needed only because the workflow builds locally, so a plain `vercel deploy --prod`
might read no project settings at all. It reads the same ones. Traced with `--debug` on 16 August
2026, in a clean checkout with `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` set:

| Command | What it calls |
| --- | --- |
| `vercel pull` | `/v2/user`, `/teams/:id`, **`/v9/projects/:id`**, `/v10/projects/:id/env`, `/v3/env/pull/:id/production` |
| `vercel deploy --prod`, no `--prebuilt` | `/v2/user`, `/teams/:id`, **`/v9/projects/:id`** |

A remote build's calls are a **strict subset** of `vercel pull`'s, behind the same
`Retrieving project…` spinner — and `Could not retrieve Project Settings`, which is where the
release run above stopped, is that project fetch failing. Every deploy path the CLI offers resolves the linked
project before it does anything else; the remote build then reads `rootDirectory` from the answer to
find `apps/web` at all. **So the question that ticket asked is closed: no.**

**That is a trace and not a run, and the difference is worth stating.** No project-scoped token was
put through `vercel deploy`: what was compared is which endpoints each command calls, against the
endpoint the failure names. It closes the question because the failing call is one a remote build
makes too, not because the narrower token was watched failing at it. Re-testing it would now need a
fresh token from the dashboard, the old one having been revoked.

**`--prebuilt` therefore stays**, and now for the reason it was chosen rather than for want of an
alternative. Vercel's build cache was the other half of that suggestion and it is real, but it is
now the only half, and it would be bought by promoting something other than what this job built and
put through the gates.

**Reissuing is a dashboard action; revoking is not.** `vercel tokens add <name>` returns
`Error: Cannot create tokens for this app. (403)` under the current *Sign in with Vercel (google)*
login, from an agent session and from Jacob's own terminal alike, and `POST /v3/user/tokens` returns
the same `forbidden` — so it is the login that refuses, not the CLI. `vercel tokens rm <id>` works,
and is how the replaced token above was revoked. The natural assumption when the release fails, that
whatever noticed can mint the replacement, is wrong in one direction only.

## Database

| | |
| --- | --- |
| Provider | Neon, via the Vercel-managed marketplace integration |
| Neon project | `steep-wave-52467839`, resource `store_ft1xdGxeaZQCEbN7` |
| Production branch | `main` (Neon's default branch). It shares a name with the repository's `main` and is a different thing |
| Preview branch | **One**, named `preview`, `br-calm-flower-zame56ly` — schema-only, shared by every preview deployment, and holding no production row. *The shared preview branch* below is what it is and how it is kept level |
| Region | `eu-west-2` (London) |
| Plan | Launch, billed through Vercel. **Five root branches**, of which `main` and `preview` are two ([Neon, schema-only branches](https://neon.com/docs/guides/branching-schema-only), whose *Schema-only branch allowances* section tables it per plan: Free 3, Launch 5, Scale 25) |
| Compute size | **Autoscaling 0.25–1 CU**, set 21 August 2026 on both computes *and* on the project's `default_endpoint_settings`, so branches created later inherit it. Was a **fixed 1 CU**, minimum and maximum both, which billed four times Neon's own floor for a 70 MB database. Scale-to-zero is 5 minutes, which is Launch's minimum — 1-minute timeouts are Scale-only ([plans](https://neon.com/docs/introduction/plans), read 21 August 2026) |
| What bounds this bill | **Nothing does, and that is now a finding rather than an open question.** Three controls exist and all three refuse: Vercel's $40 budget excludes Marketplace integrations; `vercel integration resource create-threshold` is auto-recharge for *prepaid* balances and `vercel integration balance neon` answers `No balance information found`; and Neon's own consumption quota is refused with `HTTP 404 — action restricted; reason:"organization is managed by Vercel"`. **The restriction is specific to quotas**, not to project writes — a no-op `PATCH` on the same endpoint in the same minute answered `200`. [ADR-0026](adr/0026-the-database-bill-is-watched-rather-than-capped.md) |
| Spending notifications | **On, $15**, organisation-wide across `canoncore` and `waveger`. E-mail at 80% and 100%, spending checked every 15 minutes, **alerts only — nothing pauses**. Set 21 August 2026 and read back from a cold reload. It fired immediately, because August's spend stood at $26.48 on Neon's own billing page, forty minutes after Vercel's installation page read $26.28. **The 20 cents between them is not reconciled**, and an earlier version of this row explained it as spend accrued between the reads — which does not survive arithmetic: it would be $0.30 an hour, more than four times the worst month this project has ever been on course for. Two vendors' pages, two figures, no explanation when it was set; that is the alert working, not a misconfiguration. The figure sits below the $24 Vercel platform fee on purpose, so the database cannot become the largest line without an e-mail first |
| Neon Auth | **Disabled**, recorded 10 August 2026 by CAN-18 Provision the Vercel project, the Neon database and the production domain and unchanged since. The reason is [ADR-0016](adr/0016-provisioning-plain-api-keys-neon-excepted.md) → *What will try to reopen it*, which also records why the reason this row used to give stopped being true |
| Create Database Branch For Deployment | **Neither box ticked.** `Production` never was; `Preview` was unticked on 17 August 2026 by **CAN-79 Previews clone production rows, and the integration has no switch to stop it**, which is what stops a preview branch being cloned from production — [ADR-0023](adr/0023-one-shared-schema-only-preview-branch.md) |
| Require Active Resource Before Deploy | **Required** — it was the prerequisite that ungreyed the checkbox above, and it outlives it |

*Set 12 August 2026 by CAN-45 Preview deployments do not appear to get their own Neon branch and changed 17 August 2026 by CAN-79 Previews clone production rows,
and the integration has no switch to stop it; read from the Neon dashboard and the Vercel
integration.*

**`Require Active Resource Before Deploy` stays on now that nothing needs it**, and that is a
decision rather than an oversight. It was bought to unlock the branching checkbox
([ADR-0016](adr/0016-provisioning-plain-api-keys-neon-excepted.md) → *What Neon's integration cost,
itemised*), and with the checkbox gone the honest reading is that the price is still worth paying:
every deployment reads a database, so a deploy that succeeds while Neon is unreachable is a
deployment that cannot serve a request. Turning it off would trade a loud pre-deploy failure for a
quiet post-deploy one.

The integration's variables are written under a `NEON_` prefix, which deliberately leaves
`DATABASE_URL` free for us. **Do not remove the prefix**: unprefixed, the integration owns
`DATABASE_URL` and fills it with the **owner** role, which ADR-0005 rule 1 forbids.

`Production` is unchecked because production must run against `main` itself, not a per-deployment
copy. **Turning `Required` on was not free and was accepted knowingly**: it gates *production*
deploys too, so a deploy now fails if the Neon resource is unavailable instead of building without
it. There is no way to pay only part of that price.

**Whether a preview reaches its own database is now answerable from outside a deployment**, and it
was not before. While the integration created the branch, the only witness was Neon's branch list:
`vercel env pull` read project-level values and the branch's were not among them, and the build log
was silent because the platform created the branch out of band
([incident](incidents.md#preview-branching-was-switched-off-so-no-preview-ever-got-a-branch)). Since
**CAN-79 Previews clone production rows, and the integration has no switch to stop it** the host is
an ordinary Preview variable, so `vercel env ls` shows it, `scripts/check-docs.ts`
gates it against the roster above, and the branch it names can be queried directly. **That is a
gain worth naming**: the mechanism this replaced could only be checked from inside a running
preview, which is why *How a preview reaches its own database* below spent a week describing a half
it had cited rather than observed.

> **The production branch `main` is not protected, and cannot be on this plan** (checked live 16
> August 2026: `protected: false`). Branch protection is a Neon **paid-plan** feature — Launch
> allows 2 protected branches, Free none — so this is plan-gated rather than forgotten. The
> upgrade question is a *Neon* plan question and is not what **CAN-59 Decide whether the Hobby plan
> can carry a public service** settled — that decided the *Vercel* plan, on 20 August 2026; the outstanding-work record is **CAN-69 Record the credential purge, regenerate the
> credentials table, and lint-ban NEON\_ reads**.

### Roles

Neon's `neondb_owner` has `rolbypassrls = true` and is therefore never the application role.

| Role | Purpose | `rolbypassrls` |
| --- | --- | --- |
| `canoncore_migrator` | Owns every table it creates. Runs migrations | `false` |
| `canoncore_app` | The application connects as this and nothing else | `false` |
| `canoncore_auth` | better-auth connects as this, and nothing else does. Added 17 August 2026 by **CAN-24 A signed-in and a signed-out path** | `false` |

*`canoncore_auth` was created on Neon's `main` on 17 August 2026 with `LOGIN NOBYPASSRLS` and `USAGE` on
`public` and no `CREATE`, and all three attributes were read back from `pg_roles` and
`has_schema_privilege` rather than assumed. Neon granted the new role to `neondb_owner` on creation with
`set_option = false`, the same shape it gives the other two — which is why the migration that follows a new
role has to be run by somebody holding that role's password, and is what
[`../scripts/apply-migrations-ahead-of-merge.sh`](../scripts/apply-migrations-ahead-of-merge.sh) exists for.*

> **What was proven against production rather than inferred, on 17 August 2026**, by connecting as the role
> itself with `sslmode=verify-full`: it signs in to `neondb` on PostgreSQL 17.10, and it is refused
> `story`, `source`, `snapshot` and `tombstone` with `permission denied for table …` and refused
> `CREATE TABLE` with `permission denied for schema public`. **The refusals are the half worth observing**:
> the role has no policy on those four tables, so a read returning nothing would look identical whether the
> grant was absent or merely narrow, and only the error distinguishes them. What is *not* yet observed is
> the other direction — that it can write its own five — because those tables do not exist on `main` until
> the migration runs, and `apply-migrations-ahead-of-merge.sh` checks it there.

#### Why there are three, and why the third is not a hole in ADR-0005 rule 1

**The decision is [ADR-0021](adr/0021-a-third-database-role-for-better-auth.md)**, and it holds the
argument, the three designs it rules out and what will try to reopen it. What follows here is the
summary and the state.

**The thing that authenticates cannot be constrained by the identity it is establishing.**
`auth.api.getSession` is handed a session *token* and has to find the row bearing it before it can know
whose it is; signing in is handed an *email* and has to find a `user` row with no session set at all. No
policy keyed on `canoncore.user_id` can permit either, so better-auth cannot run as `canoncore_app`.
[`apps/web/src/auth/auth.ts`](../apps/web/src/auth/auth.ts) holds the argument and the three designs it
rules out — including the one that looks cheapest, giving `canoncore_app` those tables with no policy over
them, which would hand the role every page runs as a table of email addresses and password hashes readable
in full. That is this section's own recorded failure, one table wider.

**Rule 1 is about the role the application connects as, and `canoncore_app` is untouched by this**: it
holds no privilege on any of better-auth's five tables, still has no `BYPASSRLS`, and still reads every
row through a policy. Its one write anywhere is the Anchor mint in the matrix above, which arrived with
**CAN-25 The catalogue: Version, part of, Anchor, canonical version** and reaches none of these five. `canoncore_auth` has no
`BYPASSRLS` either. What bounds it is written down rather than assumed: a policy naming it on five tables,
and no privilege at all on the other four.

#### What each role may do to a table, and the default privileges there are not

**`canoncore_app` holds `SELECT` and, on one table, `INSERT`** — and since 17 August 2026 there are
five it holds nothing on at all, which are better-auth's own. `canoncore_migrator` needs no grant at
all — it owns each table, and an owner bypasses row security, which is why ownership sits with it
rather than with the application's role.

**The full matrix, as migrations 0009 and 0011 leave it**, and `apps/web/src/db/rls.test.ts` asserts every
cell of it for both roles:

| Table | `canoncore_app` | `canoncore_auth` |
| --- | --- | --- |
| `story`, `version`, `part_of`, `source`, `snapshot`, `tombstone` | `SELECT` | **nothing** |
| `anchor` | `SELECT`, `INSERT` | **nothing** |
| `user`, `session`, `account`, `verification`, `rate_limit` | **nothing** | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |

**`anchor` is the one write privilege in this table, and it arrived with the row it is about.** An
Anchor is a shared identity carrying no metadata at all
([ADR-0003](adr/0003-no-shared-catalogue.md)), and **CAN-25 The catalogue: Version, part of, Anchor,
canonical version** states its access model: readable by anyone, insertable by any signed-in user,
never updatable. The `INSERT` policy is what makes the second clause mean *signed-in*; this grant is
what makes it possible at all, since a policy narrows a privilege and never confers one — and
without the grant that policy would be a rule nothing could ever run. **`UPDATE` and `DELETE` are
absent rather than refused by a policy**, so an attempt at either is `permission denied for table
anchor`, which is a sentence where a policy matching nothing is the silence ADR-0005 rule 2 is about.
Migration 0011 holds the whole argument, and names all four places that carried a blanket "writes
nothing" invariant and now carry one with `anchor` named in it.

**The two sets of blanks are controls, and they are controls of different kinds.**

**`canoncore_auth` has no policy on any of the product tables**, so a read returns nothing — but **a write
would succeed**, because no policy at all is not the same as a restrictive one, and only the absent grant
refuses it. That grant is the whole of what keeps better-auth's role out of the catalogue.

**`canoncore_app` is refused all five of better-auth's tables outright**, and that is a decision taken on
17 August 2026 rather than an accident of scope. An earlier draft of migration 0009 granted it `SELECT`
on `user` and `session` under a policy keyed on the session user; a review asked what read them, and the
answer was nothing — pages read Stories, and `apps/web/src/auth/viewer.ts` resolves the cookie through
the auth role. The grant existed only so a cross-tenant read test had something to exercise, which is a
production privilege bought to make a test runnable. **The refusal is both cheaper and stronger**:
`permission denied for table "user"` is a loud error, where a policy returning no rows is
indistinguishable from an empty table, and that silence is what ADR-0005 rule 2 is entirely about.
`account` is the sharpest case, holding the scrypt password hash.

**Row-level security is on for all five regardless**, because a policy is what turns it on and migration
0008 wrote one per table for the auth role. So the first real reader — CAN-57 Make a public Ordering
discoverable and shareable, which needs an author attribution — can add a grant knowing that without a
matching policy it reads zero rows rather than everything. A grant added to any blank cell above fails a
test rather than passing unnoticed.

**There are no default privileges, and the absence is the decision.** Until 16 August 2026 two
`ALTER DEFAULT PRIVILEGES` grants existed here and in no other place:

| Granted by | On | To `canoncore_app` |
| --- | --- | --- |
| `canoncore_migrator` | tables | `arwd` — INSERT, SELECT, UPDATE, DELETE |
| `canoncore_migrator` | sequences | `rU` — SELECT, USAGE |

A default privilege applies to every table the granting role **creates**, so each table arrived
holding all four however its own migration read — and both `0001` and `0004` say `SELECT` only.
**Row-level security was carrying it invisibly**: a `FOR SELECT` policy refuses the writes an ACL
allows, so `story` and `snapshot` were never reachable, and `source` — the first table with no
policy over it — is where the ACL became the only thing standing there. The application role could
set every retention window to `'infinity'`, which is what
[ADR-0014](adr/0014-shell-providers-and-per-source-retention.md#decision-6--retention-is-a-property-of-the-source)
chose the shared row to prevent.

**CAN-123 Revoke the application role's write privileges, and decide whether the blanket default
privilege should exist** removed both rather than narrowing them to `SELECT`. A narrowed default
would still hand a new table to the application role before anyone had written a policy for it, and
row-level security is off until a policy turns it on, so that table would be readable in full.
Since the change, a table arrives with **no ACL at all** and the application role is refused it
outright, which is a loud error rather than the silent empty result a broken policy gives.

Three things follow from that, and the third is why no reading of the repository could find it:

- **A migration is the only place a table privilege is granted.**
  [`apps/web/src/db/roles.sql`](../apps/web/src/db/roles.sql) carries what exists *before* any
  migration runs, and cannot carry this — it is applied by a superuser, so the statement would
  bind the wrong role. That file holds the argument, the citation and the check it rests on,
  because it is the file somebody would otherwise add the revoke to.
- **A test asserts it**, in [`apps/web/src/db/rls.test.ts`](../apps/web/src/db/rls.test.ts): every
  table's privileges for `canoncore_app` as an exact list, and `pg_default_acl` as empty of it. A
  new table fails that test rather than arriving armed.
- **The test cannot see production.** It runs against CI's container and a laptop, so it gates what
  the *migrations* produce. A privilege granted here by hand is invisible to it — which is exactly
  what happened — so the check on production is reading the catalogues back, and nothing else is.
  **Read both**: `relacl` for the three tables, and `pg_default_acl` with its `defaclnamespace`,
  which is the half no test can ever reach and the half this arrived through.

> **Read back from production on 16 August 2026, before the change**: `relacl` on all three tables
> was `canoncore_app=arwd/canoncore_migrator`, and the two `pg_default_acl` rows were as tabled
> above, both with `defaclnamespace = 2200` — the `public` schema, not a role-wide default. That
> last detail is what makes migration 0005's `IN SCHEMA "public"` the right scope, and a read-back
> that omits it cannot tell the two cases apart.
>
> **The reading that confirms the end state is due when the release runs migration 0005**, and
> until it has been taken this section describes what the migration establishes rather than what
> has been observed.
>
> **Read back from production on 17 August 2026, after migrations 0008 and 0009**, when there were
> nine tables rather than twelve: `has_table_privilege` reported `canoncore_app` holding `SELECT` on
> the four product tables of that date and nothing on better-auth's five, and `canoncore_auth`
> holding all four privileges on its five and nothing on the product tables. Also read: nine tables
> all owned by `canoncore_migrator`, neither application role holding `BYPASSRLS`, and
> `pg_default_acl` empty of both — so the two `ALTER DEFAULT PRIVILEGES` rows migration 0005 removed
> have not returned. Taken by
> [`../scripts/apply-migrations-ahead-of-merge.sh`](../scripts/apply-migrations-ahead-of-merge.sh),
> whose six checks are exactly these.
>
> **The three rows migrations 0010 to 0013 add have not been read back from production**, because
> those migrations have not run there: the release runs them on merge
> ([ADR-0019](adr/0019-ci-owns-the-production-release.md)). Until that reading is taken, the rows for
> `version`, `part_of` and `anchor` describe what the migrations establish rather than what has been
> observed — which is the same standing this section had for migration 0005 before its release ran.

### Schema

`public.story`, `public.visibility` and `drizzle.__drizzle_migrations`, every one of them owned by
`canoncore_migrator`, with row-level security on `story` and one public row in it. Applied to
Neon's `main` on **14 August 2026**, by hand and deliberately ahead of the merge, because a preview
branch was then a copy of `main` taken when its deployment started, so the schema had to be there
before the code that read it deployed anywhere.

**That reason expired on 17 August 2026** and the practice went with it. Previews read the shared
`preview` branch, nothing is copied from `main`, and CAN-79 Previews clone production rows, and the
integration has no switch to stop it moved the ahead-of-merge step onto `preview` alone — *The
shared preview branch* → *Migrations* above. Production is migrated by the release and by nothing
else, which is what [ADR-0019](adr/0019-ci-owns-the-production-release.md) always intended and what
the preview mechanism had been quietly making an exception to.

`canoncore_migrator` also holds **`CREATE` on the database `neondb`**, granted 14 August 2026 by
CAN-23 One Story from Neon, behind row-level security and read back with
`has_database_privilege`. That is the privilege to create a *schema*,
and Drizzle's migrator needs it before it will read its own journal
([incident](incidents.md#drizzles-migrator-needs-create-on-the-database-before-it-reads-anything)).
`canoncore_app` has neither that nor `CREATE` on `public`, which is unchanged.

Since then the schema has grown by every migration the release runs, and **twelve tables carry the two
tripwires** in `apps/web/src/db/rls.test.ts`: the seven product tables — `story`, `version`, `part_of`,
`anchor`, `source`, `snapshot` and `tombstone`, three of them — `version`, `part_of` and `anchor` —
added by migration 0010 under
**CAN-25 The catalogue: Version, part of, Anchor, canonical version** — and the five better-auth's own
models need: `user`, `session`, `account`, `verification` and `rate_limit`, created by migration 0008 with
a policy on each. `rate_limit` is not incidental: better-auth's default rate-limit storage is *memory*, and
Vercel Functions are per-invocation isolates, so a memory-backed counter is per-process and enforces
nothing. `docs/research/production-readiness-baseline.md` → *Security posture* holds the evidence.

Both verified against `pg_roles` rather than assumed, and proven end to end: the application role
sees zero rows through a table with RLS enabled and no policy, and cannot create tables
(`permission denied for schema public`). Table ownership sits with the migration role on purpose:
*"Table owners normally bypass row security as well"*
([PostgreSQL, Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)),
and the same page disqualifies `neondb_owner`: *"Superusers and roles with the `BYPASSRLS` attribute
always bypass the row security system."*

### The shared preview branch

**One Neon branch serves every preview deployment**: `preview`, `br-calm-flower-zame56ly`, created
`init_source: schema-only` from `main` on 17 August 2026 by **CAN-79 Previews clone production rows,
and the integration has no switch to stop it**. It holds `main`'s schema and **no row of `main`'s
data** — which is the whole of what the ticket bought, and
[ADR-0023](adr/0023-one-shared-schema-only-preview-branch.md) holds why one shared branch replaced
one branch per deployment, and what it cost.

| | |
| --- | --- |
| Created with | `init_source: schema-only`, in the Neon Console. **Not by the API from here**: this project holds no Neon API key ([ADR-0016](adr/0016-provisioning-plain-api-keys-neon-excepted.md)), and the `neon` MCP's `create_branch` has no `init_source` parameter — it silently makes a `parent-data` clone instead, which was observed and deleted on 17 August 2026 |
| Root branch | **Yes, necessarily.** A schema-only branch has no parent and is therefore a root branch ([Neon, schema-only branches](https://neon.com/docs/guides/branching-schema-only)). Launch allows five per project, so `main` and `preview` spend two |
| Roles on it | `canoncore_migrator`, `canoncore_app` and `canoncore_auth`, at the same passwords as on `main` — a Neon role is a property of the project, not of a branch |
| Expiry | **None, deliberately.** A branch that expires takes its host with it, and the host is a Vercel variable; `expires_at` here would break every preview on a timer nobody set a reminder for |
| Reset from parent | **Not available.** A schema-only branch has no parent, so *Migrations* below is the only way its schema moves |

> **What was read back on 17 August 2026, rather than taken from the dialog.** The API reports
> `parent_id` absent and `init_source: parent-schema`, which is its name for schema-only, and the
> Console labels the row **Schema-only**. `story`, `source` and `user` are all empty while
> production's `story` has a row — **the criterion is a row count, not a settings field**, because
> only a row count would notice a branch quietly replaced by a clone. All three roles exist on it
> with the exact matrix *Roles* below records — `canoncore_app` holds `SELECT` on `story` and
> nothing on `user`, `canoncore_auth` the reverse, neither with `BYPASSRLS` — so schema-only does
> carry grants and policies, and a Neon role does belong to the project rather than to a branch.
> Both were assumptions until they were read.
>
> **What that reading did not cover was ownership, and ownership was the thing schema-only did not
> carry.** Read on 21 August 2026: every one of `preview`'s nine tables was owned by `neondb_owner`,
> where production's are owned by `canoncore_migrator` — and so were the `drizzle` schema, its
> table and sequence, and both enums. Neon's
> [schema-only branching guide](https://neon.com/docs/guides/branching-schema-only) says the feature
> replicates the schema and does not mention ownership either way, so this is undocumented behaviour
> rather than something the dialog warned about. *Repaired the same day — the next subsection.*
>
> **The branch count went from 62 to 2 in the same change**, the other 61 being the integration's
> `parent-data` clones. Every one was checked as `creation_source: vercel`, `init_source:
> parent-data` and named `preview/*` before deletion, and none backed an open pull request: there
> were none, and `origin` held only `main`.
>
> **The order the four steps were done in, because the order is the safety property.** The
> integration was unticked **third**, not first: (1) the schema-only branch created and its journal
> seeded, (2) `NEON_PGHOST` and `NEON_PGDATABASE` set Preview-scoped and read back, (3) `Create
> Database Branch For Deployment → Preview` unticked and the setting re-read from a reopened dialog,
> (4) the 61 clones deleted. **Steps 3 and 4 are in that order for a reason that is not obvious**:
> while the checkbox is ticked the integration recreates a branch on the next deployment, so
> deleting first would have repopulated the list. And unticking before step 1 is the regression
> **CAN-45 Preview deployments do not appear to get their own Neon branch** fixed, because previews
> with no branch of their own fall back to whatever project-level
> host exists.

**Its Drizzle journal arrived empty, and that is the one trap in provisioning it.** Schema-only
copies every table and no row, so `drizzle.__drizzle_migrations` landed present and empty beside a
schema that was already complete — a branch claiming no migration had run while carrying the results
of ten. Left that way, the next `drizzle-kit migrate` tries to create tables that exist and fails on
`relation already exists`. The migrations are not idempotent and should not be made so: they say
`CREATE TABLE "story"`, which is what makes a re-run a loud error rather than a silent no-op. So the
journal was seeded from `main`'s ten rows as the last step of provisioning, and
[`../scripts/apply-migrations-ahead-of-merge.sh`](../scripts/apply-migrations-ahead-of-merge.sh)
checks the count on every run — a mis-seeded journal fails there rather than at the next migration.

**A seeded journal is not a run migration, and the difference bites the next data migration rather
than that one.** Those ten rows say 0000 to 0009 happened; on this branch their *statements* never
did, so nothing any of them inserted is there. `preview` holds **no `story` row at all** — read on
21 August 2026 as zero, against production's one — because migration 0002's founding Story was
seeded by an `INSERT` that only ever ran on `main`. So **a later migration referencing a row an
earlier one inserted fails here and succeeds on production**, which is the one direction the
rehearsal is meant to catch and the one that reads as a mystery when it does. It was caught this way
by **CAN-25 The catalogue: Version, part of, Anchor, canonical version**, whose migration 0012 seeds
a Version *of* that Story: written unconditionally it dies on a foreign key against `part_of` and
`version`, so every statement in it is conditional on the Story being present and the whole seed is
a no-op where it is not. **A data migration that assumes a previous data migration's rows is the
shape to look for**; a schema migration is unaffected, because the schema is what schema-only copied.

#### The ownership repair of 21 August 2026

**`preview` was provisioned with every object owned by `neondb_owner`, which made it unmigratable**,
and the failure is worth stating precisely because nothing had exercised it: `ALTER TABLE` requires
ownership, so `canoncore_migrator` could not alter a single table there. The first migration to try
was **CAN-25 The catalogue: Version, part of, Anchor, canonical version**, whose 0010 adds two
columns to `story`. Until then every migration on this branch had been a `CREATE`, and the journal
was seeded rather than run, so nothing had ever needed to own anything.

**The repair could not be done by the role that owned the objects.** `neondb_owner` holds
`admin_option` on all three application roles but `set_option = false`, and PostgreSQL requires the
current role to be able to `SET ROLE` to an incoming owner — so
`ALTER TABLE story OWNER TO canoncore_migrator` is refused with *must be able to SET ROLE
"canoncore_migrator"*. What that clause costs is exactly what
[`../scripts/apply-migrations-ahead-of-merge.sh`](../scripts/apply-migrations-ahead-of-merge.sh)
says it costs: the credential is not the only reason a person runs that script.

So the sequence was: grant `canoncore_migrator` to `neondb_owner` `WITH SET TRUE`, reassign the ten
tables, the `drizzle` schema and both enums, apply CAN-25's four migrations as
`canoncore_migrator`, then `REVOKE … GRANTED BY neondb_owner` to leave the membership exactly as
`cloud_admin` had granted it. **Two orderings in that are load-bearing.** The schema moves *before*
the table inside it, because an incoming owner needs `CREATE` on the table's schema and
`canoncore_migrator` had none on `drizzle` — reversed, it fails with *permission denied for schema
drizzle*, which names the schema rather than the rule. And the verification runs *before* the
revoke, because afterwards `neondb_owner` can neither read those tables nor become the role that
can, which is the same posture production has and the proof that the door shut behind the repair.

**Read back afterwards**: twelve tables, the sequence, both enums and the `drizzle` schema all owned
by `canoncore_migrator`; `public` still owned by `pg_database_owner`; the journal at fourteen rows;
all five invariants the script then carried passing, and the sixth that this repair prompted —
ownership of the `drizzle` schema, its objects and both enums — reading zero on `preview` **and** on
production; the privilege matrix identical to the one in *Roles*; and the three membership rows back
to `grantor=cloud_admin admin=true inherit=false set=false`. One object was
deliberately left alone — `public.show_db_tree`, a function the Neon Console creates for its own
table browser, which exists on `preview` and not on production and is not ours to reassign. That is
also why the repair names each object instead of using `REASSIGN OWNED BY`.

#### Migrations

**Nothing copies `main`'s schema onto it ever again**, so a migration reaches it only because
somebody applies it, and
[`../scripts/apply-migrations-ahead-of-merge.sh`](../scripts/apply-migrations-ahead-of-merge.sh) is
that somebody's tool. **That script no longer writes to production**, and the narrowing is **CAN-79 Previews clone production rows, and the integration has no switch to stop it**'s:
it used to migrate `main` ahead of the merge for one reason — a preview branch was a clone of `main`
— and with nothing branching from `main`, an unmerged branch has no remaining reason to write to
production. It applies to `preview`, reads production's invariants back, and refuses outright if the
host it was given is production's own compute.

**Previews are therefore the rehearsal for the release's production migration**, which is a stronger
arrangement than the one it replaces rather than a weaker one: the same files run against a faithful
copy of production's schema, with a person reading the result, before the release runs them against
production on a commit that passed the gates. `docs/agents/workflow.md` → *The gates* is the
procedure and [ADR-0019](adr/0019-ci-owns-the-production-release.md) is why the release owns the
production half.

**A forgotten run is loud.** A preview whose code reads a table `preview` has not got 500s, and the
required `Vercel` check goes red if the build prerenders that page — the same failure the old
mechanism gave when `main` had not been migrated, in the same place, for the same reason.

#### What every preview shares, and what it does not

**Two previews open at once share one database** — *when neither has one of its own*, which since
21 August 2026 is the fallback rather than the rule. *A preview database per worktree* below is what
changed and [ADR-0025](adr/0025-a-preview-database-per-worktree.md) is why. Where it does apply, the
cost is the one ADR-0023 accepts: one preview's writes are visible to another's, and a sign-in on one
is a `user` row the other can see. Nothing shared with **production** — no row, no history, and no
parent relationship through which a restore could reach one.

**Cleanup of the shared branch is not owned because there is nothing to own.** One branch, no
per-deployment lifecycle, and nothing created on a push. The fifty-odd `preview/<git-branch>` clones
the integration had accumulated by 17 August 2026 — one per git branch that ever had a preview, not
per open pull request ([incident](incidents.md#what-a-preview-branch-looks-like-and-how-long-it-outlives-its-pr))
— were deleted by **CAN-79 Previews clone production rows, and the integration has no switch to stop it** in the same change that stopped them being made. Worktree
databases *do* have a lifecycle, and the section below names what owns it.

### A preview database per worktree

**Every open Orca worktree has a Neon branch of its own**, `wt/<git-branch>`, a child of `preview`,
reached by a Vercel Preview `NEON_PGHOST` scoped to that one git branch.
[ADR-0025](adr/0025-a-preview-database-per-worktree.md) holds the design and the argument; this is
the state and the two commands.

| | |
| --- | --- |
| Created by | [`../scripts/provision-worktree-database.ts`](../scripts/provision-worktree-database.ts), run by [`../orca.yaml`](../orca.yaml)'s `scripts.setup` on `orca worktree create` |
| Removed by | [`../scripts/sweep-worktree-databases.ts`](../scripts/sweep-worktree-databases.ts), which `/review-pr` runs after a merge. **Dry by default**; `--apply` deletes |
| Named | `wt/` + the git branch. The prefix is what keeps the sweeper away from `main` and `preview` |
| Parent | `preview`, `br-calm-flower-zame56ly`. So it inherits the schema, the grants, the policies, the ownership and the seeded fourteen-row Drizzle journal, and none of production's rows |
| Compute | Whatever the project's `default_endpoint_settings` says. The hook passes no endpoint options, deliberately, so compute size stays one decision in one place — *Database* above |
| Expiry | **None.** `expires_at` works here and is refused for two other reasons — ADR-0025 → *Teardown* |
| Fallback | A branch with no worktree database reads the environment-wide Preview `NEON_PGHOST`, which is the shared `preview` branch. Nothing falls back to production |

> **What was read back on 21 August 2026, by experiment rather than from the documentation.** A
> child of the schema-only `preview` branch **is an ordinary child**: `parent_id` set, `parent_lsn`,
> `parent_timestamp`, `init_source: parent-data`, so it spends the ten-branch total allowance and
> not the five-root one. It carried **12 tables, 3 roles, 0 wrongly-owned tables** and a journal at
> **14 rows** — so it is migratable from its first run, unlike `preview` before *The ownership
> repair of 21 August 2026*. **`story` read 0 against production's 2.**
>
> **It inherits `preview`'s own rows as well as its schema**, and that is the part the research did
> not predict. `preview` held two `user` rows on 21 August 2026 and the child held exactly those
> two. Both are at `mail.canoncore.com`, the domain *Transactional email: Resend* below treats as an
> address that cannot be a person, so they are this project's own test mailboxes. **The general case
> is the one to watch**: whatever `preview` accumulates is copied into every worktree database, so a
> real address signing in on a preview would be multiplied by the number of open lanes. Emptying
> `user` on `preview` is the remedy, and it takes effect for children created afterwards.
>
> **Two lanes were shown not to collide**, which is the whole point of the arrangement: a migration
> applied to one worktree's database left the other's journal at 14 rows against 15, without the new
> table, and both held none of production's rows.
>
> **And a real deployment was shown to read it**, which is the assertion that matters because it is
> the only one made from outside the settings. The preview built from this branch's first push
> logged, at request time:
>
> ```
> [canoncore] database host ep-cool-salad-zafk7fgl-pooler.c-2.eu-west-2.aws.neon.tech (VERCEL_ENV=preview)
> ```
>
> That is `wt/jacobdrees/can-138`'s own compute — **not** the shared branch's
> `ep-floral-meadow-za2ibgdu` and **not** production's `ep-aged-moon-zaujrwy4`. **What is still
> outstanding is the same line from a second provisioned lane**, which needs `orca.yaml` to be on
> `main` before another lane can inherit the hook, so it belongs to the after-merge check rather
> than to this change.

**A branch-scoped variable is invisible to the roster check, and must therefore match the documented
row exactly.** `vercel env ls` prints no git-branch column and
[`../scripts/lib/doc-checks.ts`](../scripts/lib/doc-checks.ts) merges every row of one name, so
these rows neither appear as undocumented extras nor can be audited there — `vercel env pull
--environment=preview --git-branch <name>` is the only read-back. Two consequences: the hook passes
`--no-sensitive`, because one Sensitive row would flip the merged entry and redden `check-docs` for
every lane at once; and the **sweeper rather than the gate** is what stops these accumulating.

### How a preview reaches its own database

A preview composes its connection string at runtime from `NEON_PGHOST` and `NEON_PGDATABASE` — both
ordinary Preview-scoped Vercel variables addressing the shared branch above — plus
`DATABASE_APP_USER` and `DATABASE_APP_PASSWORD`.
[`apps/web/src/db/database-url.ts`](../apps/web/src/db/database-url.ts) composes it, and it reads
those two rather than any whole connection string because Neon's own carries the **owner** role,
which has `BYPASSRLS` and is the one role this application may never be (ADR-0005 rule 1).

**The half that used to be unobservable is now the ordinary kind of fact.** Until 17 August 2026 the
branch's host was injected per deployment by the integration's webhook, "overriding preview
environment variables for this deployment only"
([preview branching](https://neon.com/docs/guides/vercel-native-integration-previews)) — so it
appeared in no listing, and this section carried a two-row table separating what had been observed
from what had only been cited. Both rows are now readable from outside a deployment: `vercel env ls`
shows the variable, `scripts/check-docs.ts` compares it against the roster on every CI run, and the
branch it names can be queried directly.

> **A preview still reports the host it resolved, and still refuses to serve if it is the wrong
> one**, and the check is worth keeping for a reason that survived the change of mechanism.
> [`apps/web/src/db/database-url.ts`](../apps/web/src/db/database-url.ts) logs the host and throws
> if a preview reached production's Neon compute. It compares computes rather than hostnames,
> because one Neon compute answers to a pooled name and an unpooled one and a preview reaching
> production by the second is still production. `DATABASE_PRODUCTION_HOST` is what it compares
> against, and production asserts the same value from the other side so that a stale one cannot pass
> unnoticed.
>
> **What it now guards against is a typo rather than a webhook.** A variable somebody can edit is a
> variable somebody can edit wrongly, and the refusal is what makes that mistake an error instead of
> a preview quietly serving production's rows. The old failure mode — the webhook not firing, so a
> project-level value stood in — is gone, because the project-level value *is* the mechanism.
>
> **The evidence is a runtime log line**, `[canoncore] database host … (VERCEL_ENV=…)`, read with
> `vercel logs`.

**This departs from CAN-18 Provision the Vercel project, the Neon database and the production domain as written**, and less than it used to. That ticket asked for the
application role's connection string as a Vercel variable for production **and preview**, and under
the per-deployment mechanism that was unsatisfiable: no static string can address a branch on a host
that does not exist when the variable is set. A preview's database is now reached through static
Preview variables, so what remains of the departure is narrower — it is two variables naming a host
and a database rather than one naming a whole string, because the string would carry the wrong role.

### The SSL mode every connection asks for

**`sslmode=verify-full`** — encrypted, *and* the server certificate checked against the host it was
reached at. All three of this project's connection strings ask for it: a preview composes its own,
`DATABASE_URL` carries production's, `MIGRATION_DATABASE_URL` carries the migration role's.

The spelling is the point rather than the behaviour. `pg` 8 honours `require` the same way and `pg`
9 will not, so all three said `require` until 14 August 2026, when **CAN-84 A preview's composed
sslmode=require silently stops verifying certificates under pg 9** changed them
([incident](incidents.md#a-sensitive-variable-named-its-ssl-mode-in-a-deprecation-warning), which
holds what was observed and what it was checked against).

**Reissue either variable with `verify-full`, because Neon will not hand it to you that way.** Both
are write-only — one a Vercel Sensitive variable, one a GitHub Actions secret — so a `require`
pasted back is invisible from that moment on, and **nothing in the repository checks it**. That is
deliberate: a request-time refusal would put an outage behind a value no gate can read, over a
string `pg` 8 still honours. The one signal is negative and expires — `pg-connection-string` emits
a SECURITY WARNING into the runtime log for as long as a string says `require`, and nothing at all
once it says `verify-full`.

## External data source: TMDB

Provisioned by **CAN-19 Obtain a TMDB API key and the account behind it**. *Why* TMDB, and the licence conditions the import and the UI must honour, are
[ADR-0009](adr/0009-external-source-tmdb.md). **There is no retention exception**: TMDB is used on
its published terms only, and how long a copy may be kept is a property of the Source, in
[ADR-0014](adr/0014-shell-providers-and-per-source-retention.md#decision-6--retention-is-a-property-of-the-source).

> **This credential is no longer held by this project.** Under
> [ADR-0014](adr/0014-shell-providers-and-per-source-retention.md#decision-1--the-app-is-a-shell),
> which puts no *Source* credential in `apps/web`, `TMDB_API_READ_ACCESS_TOKEN` was removed from the
> `canoncore` Vercel project on 15 August 2026 by **CAN-99 Move the TMDB credential out of the app,
> atomically with its roster row**, together with its roster row, in one change. **Its destination
> now holds it**: the `provider-tmdb` Vercel project carries it as `TMDB_READ_ACCESS_TOKEN`,
> Sensitive, on Preview and Production — a different name from the one this project used, and
> *Where a Source credential lives* above is the row that records it.
>
> **What remains here is the account, not the secret.** The table below describes the TMDB account
> and the registered application, which stay this project's however the credential is held.

| | |
| --- | --- |
| TMDB user | `jacobrees` |
| Account object id | `687e1a9f0213a4f73538dbd3` |
| Registered application | `CanonCore`, `https://www.canoncore.com`, "Used for metadata for expanded universe content." |
| Token scope | `api_read`, and nothing else |
| Credential source | [`themoviedb.org/settings/api`](https://www.themoviedb.org/settings/api) |

*Verified against the live API on 10 August 2026, after the key regeneration
([incident](incidents.md#what-the-tmdb-credential-was-checked-against)).*

`api_read` is the entire scope, read from the token's own claims, so this credential is read-only
against TMDB — no ratings, no list edits, no contributions. The registered application URL was
corrected from `http://canoncore.com` to `https://www.canoncore.com` on 10 August 2026, since
ADR-0010 makes the apex a 301.

**Use the bearer token everywhere.** TMDB's guidance is that it "has the added benefit of being a
single authentication process that you can use across both the v3 and v4 methods", and that "both
authentication methods provide the same level of access" ([Application based
authentication](https://developer.themoviedb.org/docs/authentication-application)).

**The v3 `api_key` is deliberately not stored beside it**, because it is not a second secret: it is
the bearer token's `aud` claim, and storing it separately would be two things to rotate instead of
one. Both are recoverable only from the TMDB settings page.

> **This departs from CAN-19 as written**, which asked that both be recorded. Only the bearer is
> *stored*; both remain recorded, at their source. If a future reader expects a `TMDB_API_KEY`
> variable, this is why there is not one.

**Regenerating the key does not revoke the old one promptly** — assume a leaked TMDB key stays live
for a window of unknown length
([incident](incidents.md#regenerating-a-tmdb-key-does-not-revoke-the-old-one-promptly)).

## Transactional email: Resend

Provisioned by CAN-20 on 10 August 2026. *Why* Resend, what it was weighed against and the terms it
commits us to are [ADR-0011](adr/0011-transactional-email-resend.md); the evidence behind the choice
is [transactional-email-providers.md](research/transactional-email-providers.md).

| | |
| --- | --- |
| Provider | Resend, free tier (3,000/month, 100/day) |
| Sending domain | `mail.canoncore.com`, id `5e9ca08d-ddae-444f-9d7b-066979148a73` |
| Region | `eu-west-1` (Ireland). **Cannot be changed** without deleting and re-adding the domain |
| Sending address | `CanonCore <noreply@mail.canoncore.com>` |
| Receiving | **Enabled** on `mail.canoncore.com`, and a **catch-all**: DMARC reports, and the route by which a real send is verified — *Reading the inbox* below |
| Marketplace integration | **Not installed.** A plain API key, deliberately |
| Account | `jacobreesnew@gmail.com` |

The free tier allows **one domain**, which is why `mail.canoncore.com` replaced an earlier
`canoncore.com` entry rather than sitting beside it, and why previews cannot have a domain of their
own.

**Mail is sent from a subdomain, never the apex.** Resend's guidance is to "send emails from a
subdomain instead of your root domain to conform to deliverability best practices"
([Add a domain](https://resend.com/docs/add-a-domain)). The point is containment: a bad month for
mail reputation must not reach `www.canoncore.com`. `mail.` is a sibling of `www`, so ADR-0010 is
untouched and the session cookie stays host-only.

**The Vercel Marketplace integration was declined on purpose.** Resend is the only email provider on
it, but it takes ownership of the environment variable — the same failure mode the `NEON_` prefix
exists to avoid — and it provisions a billable resource that the **$40 Spend Management budget does
not bound**, Marketplace being one of that budget's exclusions (*Hosting* above).

### The keys

| Variable | Environment | Resend key | Id |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | Production | `canoncore-production` | `e39e8cf5-5989-4423-a6da-9f6231c9ac94` |
| `RESEND_API_KEY` | Preview | `canoncore-preview` | `49af56bc-d365-4f5c-9cb1-6b85a638a2df` |

**These two are the whole of what any deployment carries.** Both are `sending_access` restricted to
`mail.canoncore.com`, so neither can read logs, manage domains or create further keys; both stored
Sensitive. The preview row was read from its dashboard page on 10 August 2026, the production row on
**18 August 2026**, when it was replaced. Three older keys were revoked on 10 August 2026 by
**CAN-39 Account for the three Resend API keys that predate CAN-20, and revoke the unused ones**
([incident](incidents.md#three-unscoped-resend-api-keys-were-revoked)).

**A third key exists, and it is a variable nowhere**: `canoncore-inbox-reading`, created on
20 August 2026 by **CAN-140 Verify a real send against our own inbox, not a personal mailbox**. It is
`full_access`, because reading inbound mail admits no narrower scope, and it is held in Jacob's
password manager alone. *Reading the inbox* below is what it is for, and what it must never become.

**The production key was replaced by CAN-136 Production cannot send email: Resend refuses the API
key with 401.** The key it replaced, `fe0bb980-4998-4343-9a60-f03fd607bbfd`, was deleted the same
day and **had never once authenticated**: its dashboard row read *No activity* eight days after it
was issued, through the week production was attempting sends. So the value the Production variable
carried was never this key, and the row above recorded provisioning rather than function
([incident](incidents.md#a-resend-key-that-was-provisioned-and-never-worked)).

### Rotating a Resend key

"You cannot view or edit an API Key value after it has been created"
([API keys](https://resend.com/docs/dashboard/api-keys/introduction)), and a Vercel Sensitive
variable cannot be read back either — so **neither end of this can be inspected, only replaced**.

1. Create the replacement in the dashboard, `sending_access` restricted to `mail.canoncore.com`.
   The permission defaults to **Full access** and the domain to **All domains**; both have to be
   changed, and neither can be after the key exists.
2. **Probe it before wiring it in**, which is the step that makes this a rotation rather than a
   hope:
   ```
   curl -s -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
     -d '{"from":"CanonCore <noreply@mail.canoncore.com>","to":"delivered@resend.dev",
          "subject":"key validation","text":"."}'
   ```
   A `200` with an id is the only evidence that the value authenticates. `delivered@resend.dev` is
   one of the four Resend simulates, so this reaches no person and costs one of the 100 a day.
3. Overwrite the Vercel variable **without a trailing newline** — `printf '%s' "$KEY" | vercel env
   add RESEND_API_KEY production`. A here-string or `echo` appends one, and
   [`apps/web/src/mail/send.ts`](../apps/web/src/mail/send.ts) now refuses such a value rather than
   sending a broken `Authorization` header.
4. **Deploy.** A Vercel environment variable only reaches a deployment created after it was set, and
   production deployments come from CI on `main`
   ([ADR-0019](adr/0019-ci-owns-the-production-release.md)) — so the new value is live only once a
   release has run, never at the moment the variable is set.
5. Delete the old key by its id, and update the table above.

**Why the probe is the check, and nothing automated is.** A check in `scripts/check-docs.ts` that
sent mail would need `RESEND_API_KEY` as a GitHub Actions secret — a second store for a credential
that lives in Vercel — and it would still only prove that *CI's copy* authenticates, never the value
the production deployment reads. That is precisely the thing that failed here, so the automated
version would have gone green throughout. The gap that is accepted, deliberately, is that a key can
sit unexercised between rotations; what closes it is that rotation now ends with a live send.

> **This departs from CAN-20 as written**, which asked that "**an** API key" be a variable for
> production and preview. Two were issued instead, one per environment under the same name, so that
> a leaked or abused preview key can be revoked without interrupting production. Met by a stricter
> mechanism rather than to the letter.

**A second Resend account exists, `jacobrees@me.com`, and it now holds nothing.** It was the source
of the "orphaned key" three old Vercel projects carried. **CAN-80 Revoke the orphaned Resend key on
the jacobrees@me.com account** deleted its three keys and its stale `send.canoncore.com` domain
entry on 13 August 2026, and `RESEND_API_KEY` is gone from `waveger-archive` and `canoncore-rebuild`
— confirmed here against `vercel env ls` the same day. **CAN-41 is retired rather than merely
stale**; do not reopen its acceptance
([incident](incidents.md#the-orphaned-resend-key-and-how-it-stopped-being-anonymous)).

**Resend has no sandbox and no test credential**, so a mistyped real address in a preview deployment
will send for real, and test sends consume the 100/day quota. What follows for code that sends mail
is in ADR-0011.

### DNS for mail

Eight records at Namecheap, serving **two unrelated mail systems on one zone**. Resend sends and
receives on the `mail` and `send.mail` subdomains; Namecheap Private Email holds the reporting
mailbox on the apex. They are listed together because the failure mode is editing one set and
destroying the other — see *The Mail Settings dropdown is a trap* below.

| Type | Host | Value | Priority | Owner |
| --- | --- | --- | --- | --- |
| `TXT` | `resend._domainkey.mail` | `p=MIGfMA0GCSqGSIb3…ku66YzQIDAQAB` | | Resend |
| `TXT` | `send.mail` | `v=spf1 include:amazonses.com ~all` | | Resend |
| `MX` | `send.mail` | `feedback-smtp.eu-west-1.amazonses.com.` | 10 | Resend |
| `MX` | `mail` | `inbound-smtp.eu-west-1.amazonaws.com.` | 10 | Resend |
| `TXT` | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@mail.canoncore.com,mailto:re+wgfzjdbnxfr@dmarc.postmarkapp.com;` | | ours |
| `MX` | `@` | `mx1.privateemail.com.` | 10 | Private Email |
| `MX` | `@` | `mx2.privateemail.com.` | 10 | Private Email |
| `TXT` | `@` | `v=spf1 include:spf.privateemail.com ~all` | | Private Email |

The apex rows were added by **CAN-44 Make the Online Safety Act records live, and create the
reporting address** on 14 August 2026, by hand, with Mail Settings left on **Custom MX**.

> **The Mail Settings dropdown is a trap.** Namecheap's Advanced DNS page has a *Mail Settings*
> selector whose options are mutually exclusive — `Custom MX`, `Email Forwarding`, `Private Email`,
> `Gmail`, `MXE Record`, `No Email Service`. **Selecting anything other than `Custom MX` replaces the
> entire MX table**, so both Resend rows vanish. That was verified against the live zone on 14 August
> 2026 by selecting `Email Forwarding`, then `Private Email`, and watching the table empty each time —
> reverting without saving both times. Namecheap's own guidance is to stay on `Custom MX` and add the
> records by hand "if you want to use multiple email services or to add MX records to a subdomain"
> ([Private Email DNS records](https://www.namecheap.com/support/knowledgebase/article.aspx/1338/2176/how-to-set-up-namecheap-private-email-dns-records-for-domains-on-namecheap-basicpremium-nameservers/)),
> which is exactly this zone. **Never touch that dropdown.**
>
> The same article lists an optional `mail` **CNAME** to `privateemail.com` for webmail convenience.
> **Do not add it.** A CNAME cannot coexist with other records at the same name, and `mail` already
> carries Resend's inbound `MX`.

`send.mail` is the Return-Path: Resend defaults it to `send.<domain>`. **Do not make the Return-Path
a name you also send from** — AWS, whose MAIL FROM machinery this is, says it "shouldn't be a
subdomain that you also use to send email from" ([Custom MAIL
FROM](https://docs.aws.amazon.com/ses/latest/dg/mail-from.html)), and the zone previously violated
exactly that.

**The DMARC reporting address must stay inside `canoncore.com`, or be a destination that publishes
the authorising record.** RFC 7489 §7.1 makes an external `rua` conditional on the destination
domain publishing one, and a personal iCloud or Gmail address never will, so reports sent there are
discarded in silence. `dmarc@mail.canoncore.com` is within the same Organizational Domain and needs
none. That is why receiving is enabled at all.

**A human reads the reports.** `dmarc@mail.canoncore.com` is an inbox only the Resend API can read,
and an API-only inbox is not monitoring. Resolved 13 August 2026 by CAN-70 with a second `rua`
destination, `re+wgfzjdbnxfr@dmarc.postmarkapp.com` — Postmark's free DMARC digest service
([DMARC Digests](https://dmarc.postmarkapp.com/)), addressed to `jacobrees@icloud.com`. It is the
RFC-compliant kind of external destination:
`canoncore.com._report._dmarc.dmarc.postmarkapp.com` resolves to `v=DMARC1;`, verified that day. The
signup asked for an email address and a domain and nothing else, so no account or card sits behind
it. Resend stays as the raw archive; Postmark is the reader.

`p=none` is monitor-only and changes nothing about delivery.

### Reading the inbox, which is how a real send is verified

**Confirming that a send works no longer means reading a personal mailbox.** Until
**CAN-140 Verify a real send against our own inbox, not a personal mailbox** it did: a message was
addressed to `jacob.rees@vepple.com` and Mail.app was opened to see where it landed. The replacement
was already provisioned and unused — receiving on `mail.canoncore.com`, on since 10 August 2026.

**Every address at the domain is already a mailbox.** Resend receives "any email sent to your
receiving domain", so `e2e-8f21@mail.canoncore.com` needs no alias, no forward and no configuration
([Receiving Emails](https://resend.com/docs/dashboard/receiving/introduction)). No webhook is needed
either: "Resend stores emails as soon as they come in", and this account carries none.

**What an inbound copy proves, which is more than a send log does.** The round trip was measured at
**2.4 seconds**, and the received message carries `spf=pass`, `dkim=pass`, `dmarc=pass` and
`X-SES-Spam-Verdict: PASS` computed by the *receiver* rather than by us — a real check on the DNS in
*DNS for mail* above, which is the thing most likely to break silently. **It is not a placement
claim**: Resend inbound has no spam folder, so *How delivery is checked* below still owns Inbox
versus Junk. The evidence, the measurements and the vendors this made unnecessary are
[email-testing-inboxes.md](research/email-testing-inboxes.md).

**A round trip spends two of the hundred a day, not one.** "Both sent and received emails count
towards these quotas" ([Usage Limits](https://resend.com/docs/api-reference/rate-limit)), so the
ceiling is fifty round trips a day against the free tier — ample by hand, and one of the reasons this
is on no gate.

**The guard admits the domain, and that is the guard's own reason rather than a hole in it.** Outside
production [`apps/web/src/mail/send.ts`](../apps/web/src/mail/send.ts) refuses any recipient at
neither `resend.dev` nor `mail.canoncore.com`, anchored on the `@`: what it exists to prevent is a
stray recipient being a *person*, and a catch-all we own is nobody. The anchor is what keeps
`notmail.canoncore.com` out, a domain anybody may register. **The apex is out because it is a
different domain, and it must stay out** — `report@canoncore.com` is the reporting mailbox and a
person reads it in Mail.app, so widening that constant from `mail.canoncore.com` to `canoncore.com`
would undo the whole guard.

#### The key that can read it

| Key | Permission | Id | Where it lives |
| --- | --- | --- | --- |
| `canoncore-inbox-reading` | **`full_access`** | `2babd4ef-14db-4a63-8ffe-28c4ef202d09` | **Jacob's password manager only.** Created 20 August 2026 |

**Resend has exactly two permissions and reading inbound needs the larger one.** `full_access` "can
create, delete, get, and update any resource"; `sending_access` "can only send emails"
([Create API key](https://resend.com/docs/api-reference/api-keys/create-api-key), whose `domain_id`
is "only used when the permission is `sending_access`" — so this key cannot be restricted to the
domain the way the two sending keys are). There is no narrower scope to ask for, so **this one key can
delete the sending domain and mint further keys.**

**Which decides where it may live rather than whether inbound is used.** It is deliberately **not a
Vercel variable and not a GitHub Actions secret**: *What this check compares, and what it cannot*
above already refuses a Resend credential in Actions as "a second store for a credential that lives
in Vercel", and this key is strictly more powerful than the one that argument was about. It is passed
on the command line of the run that needs it, and this project stores it nowhere.

**The password manager rather than the Keychain, which departs from what the research asked for.**
[email-testing-inboxes.md](research/email-testing-inboxes.md) → *The one real change* says to hold it
"through `resend login`, which stores it in the macOS Keychain". A Keychain entry is the right home
for the *CLI* and the wrong one for the only caller that needs the key: the spec reads an environment
variable, not the Keychain, so a key that lived only there would have to be pulled back out on every
run. The password manager is therefore where the value is kept, and `resend login` is an optional
extra for anyone using the CLI. **Neither is a store this repository can check**, which is why the
row above records a name and an id and no value.

**Three routes read the inbox, and the cheapest needs no credential at all:**

| Route | Credential |
| --- | --- |
| The `resend` MCP — `list-received-emails`, `get-received-email` | **None.** OAuth against a browser login |
| `resend emails receiving list` and `get`, from the CLI | `--api-key`, then `RESEND_API_KEY`, then whatever `resend login` saved to the macOS Keychain — the CLI's own priority order |
| `GET /emails/receiving` and `GET /emails/receiving/:id` | The key above, as a `Bearer` |

**So an agent or a person should reach for the MCP**, which is how every measurement above was taken.
The key exists for the one caller that cannot use it.

#### The spec that reads it

[`apps/web/e2e/verification-by-inbox.spec.ts`](../apps/web/e2e/verification-by-inbox.spec.ts) signs up
on a preview, polls for the message, follows the verification link and signs in — the one claim no
stub can make. **Run by hand, on no gate**, and it skips with the reason on the run unless given both
variables:

```bash
CANONCORE_E2E_BASE_URL=<preview url> \
CANONCORE_E2E_RESEND_API_KEY=<the key above> \
  pnpm --filter @canoncore/web test:e2e verification-by-inbox
```

**A `next dev` server is the cheaper target, and it is a real send either way.** The guard admits our
own domain from every environment that is not production, so `CANONCORE_E2E_BASE_URL=http://localhost:3000`
against a local dev server exercises the whole path — the send leaves Resend, the message arrives, the
link works. **It was first run that way on 20 August 2026 and passed in 6.2 seconds**, leaving an
account whose `email_verified` column read `true` and one session row. What a local run cannot prove
is the environment: no Vercel routing, no CDN, no `*.vercel.app` host, and a database of your own
rather than the shared `preview` branch. **A preview run is still owed**, and it is what the two
`*.vercel.app` facts above are about.

**It must never be pointed at production**, because a sign-up there creates an account nothing can
erase until **CAN-30 GDPR export and erasure**. Two separate things stop it, and they stop different
mistakes. **An unset `CANONCORE_E2E_BASE_URL` skips the spec**, which covers the whole-suite run whose
target defaults to production. **A base URL naming any of the three hostnames that serve production
fails it**, which covers the deliberate one. The key's absence skips too, but it is not what defends
against production: it defends against a run that could not read the inbox anyway. The spec's own
header records what neither check can see — a production deployment's per-deployment `*.vercel.app`
URL is indistinguishable from a preview's by name.

### How delivery is checked

Resend reporting a send as `delivered` means it handed the message over, not that anyone saw it. A
message can be `delivered` and sitting in Junk, so **a deliverability claim needs both tools**:

| Step | Tool |
| --- | --- |
| Send, and read the provider's verdict | `resend` MCP |
| Read which mailbox it landed in | `macos-mail-mcp`, against Jacob's Mail.app |

**The reference recipient is the `jacobrees@me.com` account**, which carries
`jacobrees@icloud.com` — check that one, not a Gmail account, unless the point is to compare
receivers. CAN-20 was proven this way
([incident](incidents.md#the-delivered-test-message-passed-all-three-checks)).

**`report@canoncore.com` is readable the same way**, as the `Canoncore` account in Mail.app — the
Private Email mailbox added over IMAP on 14 August 2026. It is a second reference recipient, and the one to
use whenever the question is whether the *reporting* route works rather than whether product mail
lands.

Mail sent to `*@mail.canoncore.com` needs no such check, because receiving is enabled and the
`resend` MCP reads that mailbox directly.

**And the first row is where a personal mailbox stopped being the answer.** *Did it arrive, and is it
intact?* is answered by a round trip through our own inbox — *Reading the inbox* above — which needs
no mailbox of Jacob's and no key at all. What still needs a real receiver is the second question
alone, Inbox or Junk, and a purpose-made seed account at a consumer provider is what would answer it
without reading a personal mailbox either
([email-testing-inboxes.md](research/email-testing-inboxes.md) → *Deliverability is a second
question*).

## Reporting address

Decided by **CAN-21 Write the Online Safety Act documents and establish the reporting address**,
which wrote the documents; created on 14 August 2026 by **CAN-44 Make the Online Safety Act records
live, and create the reporting address**.

| | |
| --- | --- |
| Address | `report@canoncore.com` |
| Mechanism | A **Namecheap Private Email mailbox** on the apex, read in Jacob's Mail.app over IMAP |
| Status | **Live.** Created 14 August 2026 and proved by a test message, below |
| Subscription | Private Email **Launch**, one mailbox, 5 GB, 10 aliases. Order 211112248, subscription 4332833 |
| Cost | Free for the first month, then **£11.03/year**, auto-renew on. First charge 14 September 2026 |
| Mailbox password | Not recorded here. Jacob's password manager; set at creation, never displayed by Namecheap afterwards |
| Webmail | `https://privateemail.com`, if Mail.app is unavailable |

The Online Safety Act requires a reporting route that works for people who have no account and are
not users at all (`s.20(5)` affected persons), and the Codes require it to be easy to find and use.
What that needs is in
[`docs/compliance/code-measures-register.md`](compliance/code-measures-register.md).

**It is on the apex, not on `mail.canoncore.com`** — a change from CAN-21's wording, which assumed
the Resend inbound domain. Resend receives at `*@mail.canoncore.com`, but that mailbox is readable
only through the API, and **an inbox only an API can read is not "monitored by a human"**. The duty
is that reports reach a person. It does not disturb the Resend setup: `mail.canoncore.com` and
`send.mail.canoncore.com` keep their own records, and the apex had none until the three apex rows in
*DNS for mail* above were added.

**It is a real mailbox, not a forward** — a change from the original plan, which assumed Namecheap's
free email forwarding. That turned out to be unusable here: free forwarding is only available with Mail
Settings set to `Email Forwarding`, and that setting destroys the Resend MX records (*The Mail
Settings dropdown is a trap*, above). A paid Private Email mailbox needs no such setting, and it is
the better answer anyway — **there is no forwarding hop to fail silently**, which is the failure the
published document's promise could not survive. It is read in Mail.app alongside Jacob's other
accounts, which is what makes "monitored by a human" true rather than aspirational.

**One thing is still outstanding**, and
[CAN-32 Roles, takedown, and the Online Safety Act surfaces](https://linear.app/jacobrees-canoncore/issue/CAN-32)
owns it: making the address available to the application as configuration rather than hard-coded, so
that the two public documents and the reporting route cannot drift apart.

**The URL is still not shared**, because those surfaces have not shipped — see
[The URL-sharing gate](#the-url-sharing-gate). The half of *gate one* this address answers for is met:
it exists, and a test message was seen arriving in the mailbox, which is the specific failure the gate
exists to prevent.

**The test that proved it, 14 August 2026.** Both halves, because neither alone is evidence:

| | |
| --- | --- |
| Sent | `can44@mail.canoncore.com` → `report@canoncore.com`, via the `resend` MCP |
| Resend id | `7e60e852-0efd-476b-a8a0-2b3a02b4a350`, status `delivered` |
| Message id | `<010201a000258a09-72b2af67-3f32-4789-9e71-5035d66f3256-000000@eu-west-1.amazonses.com>` |
| Arrived | `INBOX` of the `Canoncore` account in Mail.app, read with `macos-mail-mcp`, 13:01 local |
| Not | Junk. That is the half a provider's `delivered` cannot tell you |

**The reporting route itself is not finished by this address.** ICU D2.2(a) recommends a report
control on each publicly visible record, which v1 does not ship; it is recorded as an alternative
measure in the code-measures register and built by CAN-43, deliberately outside v1.

> **CAN-21 closed with this unticked, and its wording was already out of date** — its criterion said
> the address exists "on `mail.canoncore.com`", and the criterion that replaced it then said Namecheap
> free forwarding on the apex "does not disturb Resend". Both were wrong, and each was corrected by the
> ticket that came after it. Nothing here is owned by a closed ticket.

## Error reporting: Sentry

Provisioned by **CAN-65 Create the Sentry account and issue its authentication token** on 13 August
2026. **Nothing reports to it yet** — no SDK is installed, and **CAN-51 Keep a record of server
errors past the hour Vercel keeps them** owns that. An empty Sentry is therefore not evidence of a
healthy deploy.

| | |
| --- | --- |
| Sentry user | `jacobreesnew@gmail.com`, id `4091868` |
| Sign-in | GitHub `jacobdrees` (external id `164458901`), linked 13 August 2026 |
| Organisation | `CanonCore`, slug `canoncore-cm`, id `4511903342592000` |
| Data storage location | **United States**, region `https://us.sentry.io`. **Not changeable** ([data storage location](https://docs.sentry.io/organization/data-storage-location/)) |
| Plan | Developer (`am3_f`), free. 5,000 errors/month, **30-day retention**, no payment source |
| Project | `canoncore-web`, id `4511903344623616`, platform `javascript-nextjs`, team `canoncore` |
| DSN | `https://0346bc8bccc47d3e58bd8b8a4b32771a@o4511903342592000.ingest.us.sentry.io/4511903344623616` |
| Token | Organisation auth token `Vercel source map upload (CAN-65)`, id `1067151`, scope `org:ci` |

*Verified 13 August 2026 ([incident](incidents.md#what-the-sentry-token-was-checked-against)), which
also records why the region is US, what that cost, and the EU organisation this replaced.*

**The project is named for the workspace package it serves**, `@canoncore/web`, rather than for the
organisation. `apps/mobile` and `apps/tv` are separate deployables when they arrive, so each gets
its own project and its own DSN.

**The DSN is recorded here because it is not a secret.** Sentry's position is that *"DSNs are safe to
keep public because they only allow submission of new events and related event data; they do not
allow read access to any information"*
([DSN explainer](https://docs.sentry.io/concepts/key-terms/dsn-explainer/)). It is nonetheless
stored Sensitive in Vercel, which CAN-65 asked for, and that has one consequence: **it cannot be
read back from Vercel by anyone**, so this table is where it is recovered from. The token's
plaintext was shown once at creation and is now held only by Vercel — **if it is lost, reissue it at
Sentry.**

### What the published terms commit to

**Settled 16 August 2026 by CAN-81 Disclose Sentry's US error storage in the terms of service.**
`content/legal/terms-of-service.md` → *Your privacy, and where your data is held* discloses this
transfer alongside Resend's, and **the wording is the constraint rather than the description**:
**CAN-51 Keep a record of server errors past the hour Vercel keeps them** configures the SDK to match
it, not the other way round. What has to stay true of that configuration:

| The terms say | What keeps it true |
| --- | --- |
| No IP address | **Not one setting.** `sendDefaultPii: false` keeps `user.ip_address` off the event, but not the request headers, which are sent by default and carry the address Vercel puts in `x-forwarded-for`. The IP-bearing headers have to go too — in `beforeSend` today, because `requestDataIntegration`'s `include.headers` is all-or-nothing, and through `dataCollection.httpHeaders`'s deny list from v11 |
| No name, email address or account | Nothing calls `Sentry.setUser`, and local variables are not captured in stack frames |
| Neither survives a version bump by itself | **From v11 `sendDefaultPii` is gone and every `dataCollection` category defaults to collecting**, `userInfo` and `stackFrameVariables` among them. Each has to be turned off explicitly or the promises break on upgrade alone |
| Only the address, the failure and technical detail of the request are sent | Cookies and request bodies stay withheld. The full URL and its query string are **always** sent, so nothing personal may be put in one — and **CAN-31 Email verification and password reset landed links that do**, which is *The two query strings the email flows put in a URL* below. Scrubbing them belongs to **CAN-51 Keep a record of server errors past the hour Vercel keeps them**, and is no longer optional |
| Text a user typed may appear inside an error message | Nothing configures that away, which is why the terms disclose it instead |

#### The two query strings the email flows put in a URL

**Recorded 17 August 2026 by CAN-31 Email verification and password reset, which is the ticket the row
above already named.** The row said nothing personal may go in a URL; these two are what that now
binds, and the first of them carries an email address today. **Neither is a leak yet** — nothing
reports to Sentry, so no event has ever been sent — and both become one the moment **CAN-51 Keep a
record of server errors past the hour Vercel keeps them** configures the SDK without scrubbing them.

| Address | What its query string carries |
| --- | --- |
| `/api/auth/verify-email?token=…&callbackURL=…` | **The account holder's email address, in plain sight.** The token is a JWT, so it is *signed and not encrypted*: its payload is `{"email":"…","iat":…,"exp":…}`, base64url, readable by anyone holding the string with no secret at all. Decoded from a real token on 17 August 2026 through better-auth's own `createEmailVerificationToken`, rather than read off its source |
| `/reset-password?token=…`, and `/api/auth/reset-password?token=…` | An opaque 24-character id, and no personal data. It is still a **live capability over one account for one hour** — `verification` holds it until it is used — so it is a credential in a URL rather than an identifier |

**The shape is better-auth's and is not ours to change.** It builds both URLs itself
(`sendVerificationEmailFn` and `requestPasswordReset` in 1.6.29) and offers no hook that moves a token
out of a query string, so this cannot be fixed at the point the link is made. **What that ticket has to do
is scrub the `token` parameter of every event's URL**, not only the request headers, and the terms are
what makes that a promise rather than a preference.

**One thing already in place limits the exposure**, and it is worth not mistaking for a fix: the
verification link is only ever *emailed*, so it reaches Vercel's logs and any error reporter only when
somebody follows it — and following it is exactly when a `GET /api/auth/verify-email` could throw.

**11 sub-processors is the whole of Sentry's list**, eight general and three of Sentry's own group
companies ([subprocessors](https://sentry.io/legal/subprocessors/), last updated 1 June 2026). Resend's
22 in the same paragraph is the count from its own list
([ADR-0011](adr/0011-transactional-email-resend.md)).

**The terms rather than a privacy notice, decided rather than defaulted.** No privacy notice exists,
and the disclosure had to be published before the first event. **CAN-30 GDPR export and erasure**
writes the notice; both disclosures move into it then, and the terms carry a `[ ]` saying so.

What was read before publishing, what the IP sentence rests on, and what could not be read back, is
[`docs/incidents.md`](incidents.md) → *No event had reached Sentry when the terms disclosed it*.

## Uptime monitoring: UptimeRobot

Provisioned by **CAN-66 Create the uptime monitoring account and its phone alert route** on 13 August
2026. **It still polls the holding page.** **CAN-56 Find out the site is down without waiting to be
told** built [`/api/health`](../apps/web/src/app/api/health/route.ts) and everything around it;
repointing this monitor at that route is the one step of it no agent can take, and is outstanding —
*The repoint, and why it is a human step* below.

| | |
| --- | --- |
| Account | `jacobreesnew@gmail.com`, display name `Jacob Rees` |
| Sign-in | Google. The same address as the Sentry account, which signs in through GitHub instead |
| Plan | **Free 50**. No payment method, no billing info, **0 SMS/voice credits** |
| Free-tier limits | **5-minute interval is a floor, not a fixed value** — the control offers 15s, 30s, 1m, 5m, 30m, 1h, 12h and 24h, and only the options *below* 5 minutes are paid-gated (read from the live edit form, 21 August 2026). 3-month log retention, 1 status page. **The monitor count is unresolved**: this row said 50, and the dashboard shows `0 / 1` beside the list. Not established either way, and it is settled the moment a second monitor is added |
| Monitor | id `803731762`, `https://www.canoncore.com`, HTTP/S, **checked every hour** since 21 August 2026 — read back as *"Checked every hour"* off a cold reload, uptime history unbroken. It was every 5 minutes, and that interval was what kept the database compute awake 63.8% of wall clock: the front page reads Postgres per request and Neon's scale-to-zero timeout is also 5 minutes, so each poll restarted the clock. [ADR-0026](adr/0026-the-database-bill-is-watched-rather-than-capped.md) |
| The request | `HEAD`, follows redirections, IPv4 first, 30-second timeout, up on 2xx and 3xx |
| Check location | One, auto-selected by UptimeRobot. Observed: North America |
| Alert route | E-mail `jacobreesnew@gmail.com` **and iOS app push**, both set for up and down events |
| Account timezone | GMT+1, so every timestamp in the dashboard, and in the incident below, reads as BST |

*Settings read back 13 August 2026. **Only push, and only on a down event, has been watched
firing** — no e-mail was observed at all, and the test ran on a throwaway monitor rather than this one
([incident](incidents.md#a-failing-check-reaches-the-phone-a-recovering-one-may-not)).*

**Why UptimeRobot.** Better Stack's free plan reaches Slack and e-mail but not a phone, so meeting
the phone criterion there would have cost a Responder seat
([Better Stack pricing](https://betterstack.com/pricing), read 13 August 2026). Both free tiers, with their sources, are
compared in
[`docs/research/production-readiness-baseline.md`](research/production-readiness-baseline.md) →
*Observability*, which also holds **Sentry Developer's single free uptime monitor**. That one stays
unspent.

**A blip cannot page you, unless it answers with an error.** When nothing answers, UptimeRobot
re-requests from the same location, then sends *"2 other requests in parallel from 2 random and
remote locations"*, and marks the monitor down only if those fail too
([FAQ](https://uptimerobot.com/faq/), read 13 August 2026). **Anything answering with an erroneous
HTTP status skips all of it** and is *"instantly marked as down without verification"*. So the
confirmation covers a host that has stopped answering, and not a deployment that answers with an
error — and a deployment that is broken rather than gone usually still answers. The branch that
recorded this watched a 404 page the phone on its first check.

**That leaves the repeated-failure requirement met for one failure mode and not the other.** The
per-channel *Notification Repeat and Delay* that would close the gap is **disabled on Free 50**, the
monitor's advanced settings carry no failure threshold, and account-level alert storm protection is
paid as well. Nothing free closes it here, so it is closed upstream instead, and **CAN-56 Find out
the site is down without waiting to be told** closed it: `/api/health` asks PostgreSQL three times,
a quarter of a second apart, before it answers anything but 200, so one dropped connection cannot
page a phone. [`health.ts`](../apps/web/src/db/health.ts) holds that and the argument for it.

**There is no credential, and that is not an omission.** UptimeRobot polls this site; nothing here
calls UptimeRobot. Both keys on *Integrations & API*, main and read-only, are **un-generated**, so
there is nothing to hold in Vercel and no row for one in the roster above.

**No status page exists, deliberately.** The free plan includes one, and publishing it would publish
the production URL, which *The URL-sharing gate* above forbids while either gate is closed. The
monitor reads *attached to no status page*, and stays that way until both open.

### The repoint, and why it is a human step

**The account signs in with Google and both API keys are un-generated**, so there is no credential
any agent here could use and no command to run: this is a dashboard edit, and it is the last thing
CAN-56 Find out the site is down without waiting to be told needs. Do it **after** the route is
live in production, because pointing a monitor at a 404 pages the phone — within an hour now,
and within five minutes again if the second monitor below is added.

1. UptimeRobot → monitor `803731762` → **Edit** → URL to `https://www.canoncore.com/api/health`.
   **Edit this monitor rather than adding a second one**, so its uptime history stays continuous.
   **This step is now half of a pair.** [ADR-0026](adr/0026-the-database-bill-is-watched-rather-than-capped.md)
   wants a *second* monitor on [`/api/alive`](../apps/web/src/app/api/alive/route.ts) at five
   minutes, so that site outages are still caught quickly while this one proves the database
   hourly. **Whether the free plan permits a second monitor at all is unresolved** — the row above
   says why — and that is settled here, at the moment one is added. If it does not, this monitor is
   the only one and the choice is between fast detection and a cheap database.
2. Change nothing else. `HEAD`, 2xx/3xx as up and both alert contacts are all still what this route
   was built for. **The interval is now an hour and is deliberate** — [ADR-0026](adr/0026-the-database-bill-is-watched-rather-than-capped.md)
   holds why, and what has to happen before it goes back down. An earlier version of this step said
   the interval "cannot be changed on Free 50", which is false and was load-bearing for the design
   that produced the database bill.
3. Confirm the alert route with the monitor page's **Test Notification** button rather than by
   inducing an incident, which is how it was done the first time and cost an incident write-up.
4. Update the *Monitor* row above, with the date it was read back.

Then the check is live, and what to do when it fires is [`runbook.md`](runbook.md).

### The two routes a monitor may point at

| Route | Reaches the database? | Polled by |
| --- | --- | --- |
| [`/api/health`](../apps/web/src/app/api/health/route.ts) | **Yes** — three asks before it answers anything but 200 | Nothing yet. Monitor `803731762` still polls `/`; *The repoint* above is the outstanding step |
| [`/api/alive`](../apps/web/src/app/api/alive/route.ts) | **No, and its test asserts so** against the file's own source | Nothing. Added 21 August 2026 for the second monitor [ADR-0026](adr/0026-the-database-bill-is-watched-rather-than-capped.md) wants, which is blocked on the monitor-count question above |

**Neither is polled by anything today**, which is worth stating plainly rather than leaving to be
inferred from two "outstanding" notes: the only monitor points at the front page, hourly. **And
`/api/alive` must never be pointed at *instead of* `/api/health`** — it reaches no database, so it
would report green straight through a total database failure.

## The estate

**Everything the Vercel team and the two Neon organisations hold, so that the next sweep is a
comparison rather than a discovery.** Four tickets found a live credential in an abandoned project
before this table existed, each enumerating the estate from scratch first
([incident](incidents.md#nine-dormant-neon-projects-and-the-ninth-was-the-dangerous-one)).

*Read back from `vercel project ls`, `vercel integration ls --all`, `vercel env ls` and the Neon API
on 21 August 2026.*

| Vercel project | Neon store | Values stored Non-sensitive, and so readable |
| --- | --- | --- |
| `canoncore` | `canoncore`, in *Database* above | **Five, none of them a credential** — two hostnames, a database name and two role names, each argued in place in the roster in *Environment variables* above |
| `provider-tmdb` | — | **None.** It holds one variable, `TMDB_READ_ACCESS_TOKEN`, Sensitive. The TMDB Provider, under [ADR-0014](adr/0014-shell-providers-and-per-source-retention.md) |
| `portfolio` | — | **None**, and no variables at all. Not CanonCore; serves `www.jacobrees.co.uk` |
| `waveger` | `waveger`, `store_xCNwLtRIQVOBig87` → Neon project `delicate-credit-61083163` | **Twenty-one, including `PGPASSWORD`, `POSTGRES_PASSWORD` and the six connection strings that embed them** — sixteen in all three environments, five more in Development only, the same five being Sensitive in Preview and Production. Not CanonCore — **CAN-149 waveger and waveger-archive store readable credentials, including a live Postgres password** |
| `waveger-archive` | — | **Nine, including `SENTRY_AUTH_TOKEN`** — five in all three environments, four in Production only. Not CanonCore, and deliberate rather than abandoned — same ticket |

**Two Neon projects exist and both are bound to a Vercel project**, which is the intended end state:
a store bound to nothing is the shape an abandoned database takes. Both sit in the Vercel-managed
organisation `org-silent-cell-49503934`. The console-managed organisation `Jacob`
(`org-square-star-37689785`) **holds nothing** — it held nine dormant projects until 21 August 2026
([incident](incidents.md#nine-dormant-neon-projects-and-the-ninth-was-the-dangerous-one)).

**Neither CanonCore project stores a credential Non-sensitive** — `canoncore`'s five readable values
are addresses rather than secrets, and the blockquote under *Environment variables* above is why that
distinction decides anything. **The last two rows are the counter-example, and are recorded rather
than fixed here** — they are outside CanonCore, in use rather than abandoned, and re-storing a value
that has already been readable conceals the exposure without ending it. Only names and sensitivity
were read; no value was fetched.

**Nothing sweeps this, and that is a decision rather than an omission** — an affordable check existed
and was refused on 21 August 2026, with the reasoning and the condition that would reopen it in the
[incident](incidents.md#nine-dormant-neon-projects-and-the-ninth-was-the-dangerous-one). **What
follows is that the sweep is manual and owed a list to start from.** Run the commands in the
read-back line, list the Neon projects in each organisation, compare, and account for anything not
above — a Vercel project nobody deploys, or a Neon project bound to no Vercel store.

## Domains

`canoncore.com` is registered at Namecheap on BasicDNS. **There is no wildcard record**, so a new
subdomain does not resolve until someone adds one — a preview alias, a sending subdomain or a future
service has to add its own
([incident](incidents.md#there-is-no-wildcard-record-and-one-was-wrongly-recorded)).

Hostnames reach Vercel through explicit per-host records. The full apex zone, beyond the mail
records above:

| Type | Host | Value | Note |
| --- | --- | --- | --- |
| A | `@` | `216.198.79.1` | |
| CNAME | `www` | `930a5c34adc350de.vercel-dns-017.com.` | |
| CAA | `@` | `0 issue "letsencrypt.org"` | Added 13 August 2026 |
| TXT | `@` | `google-site-verification=…` | Verifies Search Console `sc-domain:canoncore.com`. **Removing it unverifies the property** ([incident](incidents.md#the-apex-google-site-verification-txt-is-ours)) |

**CAA says Let's Encrypt only.** Vercel issues certificates through Let's Encrypt and its
documentation requires exactly this record where any CAA exists ([Troubleshooting
domains](https://vercel.com/docs/domains/troubleshooting#missing-caa-records)), so the record
constrains every other CA without touching the one doing the issuing. If Vercel ever changes CA,
renewal fails visibly and this record is the fix.

**The `demo` CNAME is gone** and `demo.canoncore.com` returns 404
([incident](incidents.md#the-demo-cname-dangled-at-a-deleted-project)).

**Four older Vercel projects were deleted on 13 August 2026** — `canoncore-legacy`,
`canoncore-demo`, `canoncore-storybook` and `canoncore-v3` — and **five more on 21 August 2026**,
which is what emptied the account of everything abandoned. What it holds now is *The estate* above.

## Agent tooling

The `vercel` MCP is authenticated to **`jacobreesnew-7380's projects`**, scoped to the `canoncore`
project alone. **A second Vercel account exists holding only `waveger`**, and anything pointed at it
returns no CanonCore projects and no `canoncore.com` — which reads as a missing resource rather than
a wrong account. If a Vercel tool reports nothing, check which account it is on before believing it:
`vercel whoami` should say `jacobreesvercel`. The bundled `vercel` plugin MCP is a separate server
from this one and is not necessarily on the same account.

**Why `neon`, `sentry` and `next-devtools-mcp` are user scope** rather than in a committed
`.mcp.json`: none of them is pinned to a CanonCore resource. `mcp.neon.tech` and `mcp.sentry.dev`
serve whichever account Jacob signs in as, and `next-devtools-mcp` discovers whatever dev server is
running. They are keyed to him rather than to this repo, the same test that puts `macos-mail-mcp` in
user scope. Move them only if one gains repo-specific configuration, or if a second person ever
needs this tooling reproducible.

A second reason to hold the line while this is a solo repo: project-scoped servers normally prompt
for approval, but `claude -p` runs, Agent SDK sessions and cloud sessions cannot show that prompt
and load project-scoped servers without asking ([MCP docs](https://code.claude.com/docs/en/mcp)).

**The `resend` MCP is the exception** and is scoped to this project in
[`.mcp.json`](../.mcp.json) at the repository root, because it is pinned to this product's own
Resend account and domain. It authenticates by OAuth against `https://mcp.resend.com/mcp` and
holds no key of its own, so it is outside *The keys* above rather than a third entry in it.

## Firewall

**One custom rule, of the forty this plan allows.** Pro permits **40 rate-limit rules per project**, fixed
window, keyed on IP or JA4 digest, window 10s to 10min, and its counters are *"tracked on a per-region
basis"* ([Vercel, WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting), read
21 August 2026) — so the effective limit is the figure below times the number of regions a caller reaches,
which is a ceiling rather than a guarantee. DDoS mitigation is on by default and is not this rule.

| | |
| --- | --- |
| Rule | `auth-endpoints-rate-limit`, id `rule_auth_endpoints_rate_limit_YPYVJQ` |
| Condition | path starts with `/api/auth/` |
| Limit | 60 requests per 60 seconds, fixed window, keyed on IP |
| When exceeded | `deny` for 1 minute |
| Published | 17 August 2026, by **CAN-24 A signed-in and a signed-out path** |

**Why these numbers.** A whole sign-up, sign-in and sign-out cycle is three requests, so 60 a minute is far
above any real use and still a real backstop. **`deny` rather than `challenge` is the load-bearing choice**:
a challenge needs JavaScript, and the auth forms are deliberately plain HTML that work without it
(`apps/web/src/app/api/auth/[...all]/route.ts`), so
challenging would break the path this rule protects. The 1-minute block is short enough that a shared NAT
recovers and long enough to stop a script.

**It is the outer of two limiters, not the only one.** better-auth's own runs in the function — 100 requests
per 60s globally and 3 per 10s on `/sign-in/email`, stored in the database rather than in memory for the
reason `apps/web/src/db/schema.ts` gives on `rate_limit`. This rule sits in front of the function, so it is
also what keeps a flood off the 1,000,000-invocation ceiling; the inner one is what actually bounds password
guessing, and it is the one `apps/web/src/db/rls.test.ts` asserts.

> **Observed firing on production, 17 August 2026.** 65 `GET`s to
> `https://www.canoncore.com/api/auth/does-not-exist` from one address: requests 1 to 60 answered **404**,
> having reached the application and found no such endpoint, and 61 onward answered **403** from the
> firewall. So the boundary is exactly the documented one, and the rule is in front of the function rather
> than behind it — a 404 proves the request arrived, a 403 proves the next one did not.
>
> **The path was chosen so the test created nothing**: it reaches no better-auth endpoint, so no account,
> session or rate-limit row was written, and no sign-in was attempted. **No test asserts this and none can**
> — the only way to see it is to exceed the limit against the live site, which is not something to put in a
> suite that runs on every push. This paragraph is the record instead.

**Changing it is a two-step, on purpose.** `vercel firewall rules edit` stages a draft and
`vercel firewall publish` makes it live, with `vercel firewall diff` in between; `vercel firewall discard`
throws a draft away. **There is room for 39 more rules and nothing here needs one**, so this rule keeps
`/api/auth/*` to itself.

## The served surface

`www.canoncore.com` serves `apps/web`, a Next.js application, and **every route it serves is
rendered per request**. CAN-22 A page on a public URL, deployed, with CI deleted `public/index.html`
and the root `vercel.json` that served it.

The front page still says the product is being rebuilt, because it is, and that copy is unchanged
since CAN-22. What CAN-23 One Story from Neon, behind row-level security added beneath it is **one
public Story, read from Neon**: the row migration
0002 inserts, fetched as the anonymous session user inside a transaction, filtered by the policy on
`story` rather than by the query. That is the walking skeleton finished — a push reaches a public
URL, and a row reaches a stranger — and it is why the route is no longer static.

**Four account pages joined it** with CAN-24 A signed-in and a signed-out path and CAN-31 Email
verification and password reset — `/sign-in`, `/sign-up`, `/forgot-password` and `/reset-password` —
so there is something to sign in to, and *Gate one: lawfulness* above is where what that does and
does not change is worked through.

**And one Story page**, `/story/<id>`, with **CAN-25 The catalogue: Version, part of, Anchor,
canonical version**: a public Story with its Versions, what it is part of, and a runtime taken from
its canonical Version. **Nothing links to it**, and that is deliberate rather than unfinished — an
`href` built from a row's id is the one change
[`compliance/illegal-content-risk-assessment.md`](compliance/illegal-content-risk-assessment.md) →
*Step 4* says must not ship before that assessment is redone, so the page is reached by its address.

**And one page that is about the site rather than about the catalogue**, `/privacy/analytics`, with
**CAN-60 Gate the front end on bytes, budgets and React lint**. It says what the two measurement
scripts collect and carries a working switch for turning them off, which are the two conditions
[ADR-0020](adr/0020-no-cookie-consent-banner.md) attaches to measuring anything without a consent
banner. **It is the first route linked from the front page since the account pages**, and it is
linked rather than merely addressable because "an easy way to object" is not satisfied by an address
somebody would have to be told. It is also the only route in the application that is prerendered
static, because nothing on it depends on the request; the switch it carries reads the *device*,
which is why that half is a client component.

**There is still no way for anyone but the operator to put a row here**, which is the sentence *Gate
one* rests on: nothing in the product creates a record, so an account holds nothing its holder
authored.

**One route is served that is not a page at all.** `/api/health` answers **200 with an empty body** while
PostgreSQL answers it, and **503** when three asks in a row do not; `HEAD` gets the same, from the
same handler. It is the uptime monitor's target rather than anything a visitor is meant to find,
and it is deliberately not a debugging surface — no version, no host, no error, nothing about the
database beyond whether it replied. Added by **CAN-56 Find out the site is down without waiting to
be told**; *Uptime monitoring: UptimeRobot* above is what will poll it once the repoint recorded
there is done, and [`runbook.md`](runbook.md) is what to do when it fails.

The **Hosting** settings above are what protects against how that page was first deployed
([incident](incidents.md#the-holding-page-was-first-deployed-straight-to-production)).
