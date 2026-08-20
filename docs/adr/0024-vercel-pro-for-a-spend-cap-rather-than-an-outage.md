---
status: accepted
---

# Vercel Pro, bought for the spend cap rather than for the capacity

This service **moves to the Vercel Pro plan, and configures Spend Management with a pause threshold in
the same action.** Not because Hobby's included usage is too small — at the time of deciding it was
untested and almost certainly ample — but because **Hobby's failure mode is an outage nobody can see
coming, and Pro's is a threshold we choose.**

**Decided, not yet applied.** The upgrade is a billing action and the threshold a dashboard one, and
neither had happened when this was written. [`docs/infrastructure.md`](../infrastructure.md) →
*Hosting* is the register and says which. This file is the reasoning, and it describes the decision in
the present tense the way every ADR here does; it is not a claim about today's plan.

Decided on 20 August 2026 by
[CAN-59 Decide whether the Hobby plan can carry a public service](https://linear.app/jacobrees-canoncore/issue/CAN-59).
The plan, the seat count, the budget figure and the pause threshold are
[`docs/infrastructure.md`](../infrastructure.md) → *Hosting*; this file holds why.

## Contents

- [The two plans fail differently, and that is the whole decision](#the-two-plans-fail-differently-and-that-is-the-whole-decision)
- [Why staying on Hobby lost](#why-staying-on-hobby-lost)
- [Why deferring lost, which is the answer that looks cleverest](#why-deferring-lost-which-is-the-answer-that-looks-cleverest)
- [What it costs](#what-it-costs)
- [What this does to the non-commercial constraint](#what-this-does-to-the-non-commercial-constraint)
- [What will try to reopen it](#what-will-try-to-reopen-it)
- [Consequences](#consequences)

## The two plans fail differently, and that is the whole decision

**Hobby stops serving.** Exceeding an included limit means, "in most cases", that "you will have to
wait until 30 days have passed before you can use the feature again", and the same page notes that
"some usage limits have shorter pause periods"
([Hobby plan](https://vercel.com/docs/plans/hobby)). **The hedge is kept because it does not help**:
an unknown pause of up to thirty days, on a limit with no threshold to watch, is the thing being
avoided. Included usage is 1,000,000 function invocations, 4 CPU-hours of Active CPU and 360 GB-hours
of provisioned memory.

**Pro bills, and then stops serving only if we tell it to.** Spend Management lets a team "set up a
spend amount for your team to trigger notifications or actions", with email, web and SMS
notification as the amount is approached, and an optional pause at 100%
([Spend Management](https://vercel.com/docs/spend-management)).

**It is a soft cap, and calling it hard would be the wrong reason to buy it.** The same page is
explicit: "Pausing is not instantaneous… projects can keep serving traffic and accruing usage for
several minutes", and it advises to "consider setting your spend amount below the absolute maximum
you are willing to spend". What it pauses is **production deployments**, not the account. So the
figure is a trigger with overshoot, not a ceiling.

That is still the better failure. **A soft cap at a figure we chose beats a hard stop at a figure we
cannot see**, and the overshoot is minutes of usage against a thirty-day outage.

So the choice is not free-versus-paid. It is **an outage at a limit we cannot observe** against **a
bill we are told about, at a figure we set, with a pause behind it.**

## Why staying on Hobby lost

Not on price, and not on capacity. On instrumentation.

**Spend Management is Pro-only, and configurable usage thresholds are for Pro team owners**
([notifications](https://vercel.com/docs/notifications)). Hobby does send notifications as limits
are approached and exceeded, but there is no threshold to set, no spend to cap and no action to
attach.

That matters more than it sounds, because it removes the obvious middle path. "Stay on Hobby, watch
consumption, upgrade if it approaches the caps" is a reasonable plan that **Hobby itself makes
unavailable**: the watching would be a human opening a usage page on a schedule, which is exactly
the mechanism this repository already refuses for uptime
([ADR-0018](0018-observability-sentry-and-an-uptime-monitor-outside-it.md) bought a monitor rather
than a habit, for the same reason).

**And the exposure is asymmetric in time.** A limit breach on Hobby is not a bad afternoon; it is up
to thirty days of a service being gone, discovered by whoever visits next. For a service whose whole
definition of done is a stranger opening a URL
([CAN-17 v1: the walking skeleton in production, then the founding case](https://linear.app/jacobrees-canoncore/issue/CAN-17)),
that is the worst available failure.

## Why deferring lost, which is the answer that looks cleverest

"Share the URL on Hobby, see what real usage looks like, upgrade if it gets close" is the option
that reads as prudent and is the one this decision most deliberately rejects.

It depends on being able to see "close", and the paragraph above is why that is not on offer. The
deferred plan reduces to *notice the outage after it starts*, which is not a plan, and the thirty-day
window means noticing late is expensive in a way that no amount of attention afterwards recovers.

**It also front-loads the wrong risk onto the wrong moment.** The first strangers arrive immediately
after the URL is shared, which is both the least predictable traffic this service will ever see and
the point at which a month of downtime costs the most.

## What it costs

**$20 a month for the Pro platform fee, which includes one deploying team seat and $20 of usage
credit.** The credit is **per plan, not per seat** — a second seat adds cost and no further credit —
and the included allocations, 1 TB Fast Data Transfer and 10M Edge Requests, do not consume it
([pricing](https://vercel.com/pricing)). One seat here, so $20 a month.

New Pro teams carry a **default on-demand budget of $200**, customisable
([Spend Management](https://vercel.com/docs/spend-management)). That default is a starting point
rather than the decision: the figure actually set is the one that matters, and given the overshoot
above it belongs **below** what we would tolerate paying.
[`docs/infrastructure.md`](../infrastructure.md) → *Hosting* records it once it is set.

**The upgrade and the threshold are one action, not two.** A Pro plan without Spend Management
configured has traded a bounded outage for an unbounded bill, which is worse than either plan chosen
deliberately. [CAN-59 Decide whether the Hobby plan can carry a public service](https://linear.app/jacobrees-canoncore/issue/CAN-59)'s criteria require them on the same day for that reason.

## What this does to the non-commercial constraint

Hobby is "restricted to non-commercial personal use only", and the same guidance is explicit that
"Asking for Donations fall under commercial usage"
([fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines)).

That constraint is live and load-bearing today: it makes a donate link a licence breach rather than a
product decision. **Once the upgrade lands it stops being a licence question at all** — and not
before, which is why the register rather than this file carries when. The note [CAN-59 Decide whether the Hobby plan can carry a public service](https://linear.app/jacobrees-canoncore/issue/CAN-59)
wanted placed "somewhere it will be seen before anyone adds a donate link" is therefore not needed, and this
paragraph replaces it.

This is a consequence rather than a reason. Nothing about the plan choice was decided to enable
donations, and no donation route exists or is planned.

## What will try to reopen it

**Cost, when the service has no users.** $240 a year for a service nobody has visited yet reads as
waste, and the argument for reverting will be strongest precisely when the outage risk is most
theoretical — before the URL is shared. The reasoning above does not depend on traffic levels, and
should be re-read rather than re-derived.

**A suggestion to drop Spend Management to save the configuration step.** It is the thing being
bought. Without it this decision is worse than staying on Hobby.

**The Neon symmetry argument, which is already spent.** [CAN-59 Decide whether the Hobby plan can carry a public service](https://linear.app/jacobrees-canoncore/issue/CAN-59)'s last criterion asked that "the
interaction with Neon's own free-plan suspension is considered together rather than separately —
both fail by going quiet". Half of that has dissolved: **Neon is on Launch, which bills rather than
suspending**, verified from the live API on 17 August 2026. Vercel Hobby's quiet failure was the real
half, and this decision removes it, so the pairing has no remaining content.

## Consequences

**A readiness-gate condition is met and a second one dissolves.**
[`docs/infrastructure.md`](../infrastructure.md) → *The URL-sharing gate* carried CAN-59 as an
outstanding condition **and, separately, "an explicit acceptance of Vercel Hobby's 30-day outage
risk"**. The first is met by this decision. The second has nothing left to accept, which is a
stronger outcome than accepting it.

**[CAN-60 Gate the front end on bytes, budgets and React lint](https://linear.app/jacobrees-canoncore/issue/CAN-60)
has a cost note that lapses.** It records react-doctor as free here because "Hobby already requires
non-commercial use, so the free tier applies as things stand". On Pro that reasoning no longer holds,
and react-doctor's Modified MIT licence prices "Business & commercial use" at $30 a month against $0
for open source — [`docs/research/production-readiness-baseline.md`](../research/production-readiness-baseline.md)
→ *react.doctor* holds the terms and the pricing page behind them. That ticket has to re-derive its
own answer rather than inherit this one.

**Nothing about the architecture changes.** The plan buys a spend cap and an alerting surface. It
does not license a change to where anything runs, and in particular it does not reopen
[ADR-0019](0019-ci-owns-the-production-release.md) — CI still owns the production release, and
Vercel's Git deploys stay off for `main`.

**What is not bought.** Pro's other features are not reasons here and should not be cited as
though this decision endorsed them. If one of them is later wanted, it is its own decision.
