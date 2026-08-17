---
status: accepted
---

# Errors go to Sentry, and uptime is watched from outside it

Two things have to be known about a deployment nobody is looking at: **that it broke**, and **that it
is gone**. They are different questions with different failure modes, and this project answers them
with two vendors on purpose.

- **Errors: Sentry**, free Developer plan, wired from inside the application.
  [CAN-51 Keep a record of server errors past the hour Vercel keeps them](https://linear.app/jacobrees-canoncore/issue/CAN-51)
  owns the SDK; the account, the project and the token were provisioned by
  [CAN-65 Create the Sentry account and issue its authentication token](https://linear.app/jacobrees-canoncore/issue/CAN-65).
- **Uptime: UptimeRobot**, free plan, polling from outside, alerting to a phone.
  [CAN-66 Create the uptime monitoring account and its phone alert route](https://linear.app/jacobrees-canoncore/issue/CAN-66)
  provisioned it and
  [CAN-56 Find out the site is down without waiting to be told](https://linear.app/jacobrees-canoncore/issue/CAN-56)
  built the route it will poll.
- **Sentry's own free uptime monitor stays unspent**, which is the part of this that reads as waste
  and is not.

The evidence under all three — free tiers, retention, alert reach, with sources — is
[`docs/research/production-readiness-baseline.md`](../research/production-readiness-baseline.md) →
*Observability*. What is provisioned is [`docs/infrastructure.md`](../infrastructure.md) →
*Error reporting: Sentry* and → *Uptime monitoring: UptimeRobot*. This ADR is why the shape is two
vendors rather than one. Settled 17 August 2026 under **CAN-75 Write the four missing ADRs and fix
the glossary's self-violations**.

## Contents

- [A monitor inside the thing it watches is not a monitor](#a-monitor-inside-the-thing-it-watches-is-not-a-monitor)
- [One free monitor is not one monitor's worth of need](#one-free-monitor-is-not-one-monitors-worth-of-need)
- [What Sentry costs, and it is not money](#what-sentry-costs-and-it-is-not-money)
- [The rejected alternatives](#the-rejected-alternatives)
- [What this deliberately does not buy](#what-this-deliberately-does-not-buy)
- [What will try to reopen it](#what-will-try-to-reopen-it)
- [Consequences](#consequences)

## A monitor inside the thing it watches is not a monitor

Sentry Developer includes one uptime monitor, at intervals from a minute to an hour, raising an issue
"only after three consecutive failures"
([`docs/research/production-readiness-baseline.md`](../research/production-readiness-baseline.md) →
*Observability*, citing Sentry's own documentation). Taking it would have been free and would have
put both answers in one account.

**The reason not to is that the two failures this project actually expects both look like nothing
happening.** The two most likely outages are a Neon compute becoming unavailable and a Vercel Hobby
usage limit tripping — a `503` from the platform, not an exception in our code. An error tracker sees
what the application reports; when the application is not running, it reports nothing, and **an empty
error tracker is indistinguishable from a healthy one**. The register says this in its own words
about Sentry today: nothing reports to it yet, so "an empty Sentry is therefore not evidence of a
healthy deploy". That property does not go away once the SDK is installed; it is what an
inside-the-process detector is.

So the detector for *gone* has to be outside the process, on a schedule of its own, alerting through
a path that does not depend on the thing being watched. That is a different vendor, not a different
feature of the same one.

**This is also why the answer is a route rather than the front page.** `/api/health` reaches
PostgreSQL, so the check covers the database as well as the deployment, and it retries before it
reports a failure, so one dropped connection cannot page a phone —
[`apps/web/src/db/health.ts`](../../apps/web/src/db/health.ts) holds how many times and how far apart,
and the argument for those numbers. Pointing the monitor at that route is a dashboard edit no agent
here can make: [`docs/infrastructure.md`](../infrastructure.md) → *The repoint, and why it is a human
step*.

## One free monitor is not one monitor's worth of need

The forward-looking half of the argument is cheaper to state and harder to reverse.
[ADR-0014](0014-shell-providers-and-per-source-retention.md) → *Decision 1 — the app is a shell*
makes **every Source reachable only through a Provider, and every Provider a deployment of its own**.
Each of those deployments is a thing that can be down while this one is up, and an import failing
because a Provider is gone is exactly the outage a user cannot distinguish from an empty catalogue.

**Sentry Developer offers one monitor. UptimeRobot Free offers fifty.** Spending the one on
production would leave the first Provider with nothing, and the account it would then need is the
account this decision already made. So the free monitor is not unspent out of thrift; it is unspent
because it was never enough for the shape ADR-0014 chose, and holding it in reserve costs nothing.

## What Sentry costs, and it is not money

The Developer plan is free and the costs are elsewhere, all three recorded rather than discovered:

- **The data is in the United States and cannot be moved.** Region `https://us.sentry.io`, not
  changeable ([`docs/infrastructure.md`](../infrastructure.md) → *Error reporting: Sentry*). That
  transfer is disclosed in the published terms of service, which is a **constraint on how CAN-51 Keep
  a record of server errors past the hour Vercel keeps them configures the SDK, not a description of
  it** — the register's own table of what has to stay true is the specification, and
  [`docs/infrastructure.md`](../infrastructure.md) → *What the published terms commit to* holds it.
- **Retention is 30 days and is stamped at ingest**, so upgrading later does not lengthen what has
  already been kept.
- **Eleven sub-processors**, which is the whole of Sentry's list.

**None of those is an argument for a different error tracker**, because a self-hosted one is
infrastructure this project has no appetite to run and every hosted alternative has the same three
questions with different answers. They are recorded because the first two bind other tickets, and the
second one binds silently.

## The rejected alternatives

**Better Stack for uptime.** It lost on the alert route rather than on features: reaching a phone is
not on its free plan and buying that reach costs a seat. **The criterion came first and the vendor
followed from it**, which is the part worth recording. The free-tier comparison itself is
[`docs/research/production-readiness-baseline.md`](../research/production-readiness-baseline.md) →
*Observability*, and what the choice became is
[`docs/infrastructure.md`](../infrastructure.md) → *Uptime monitoring: UptimeRobot*.

**Vercel's own observability as the answer.** It is the reason CAN-51 Keep a record of server errors
past the hour Vercel keeps them exists rather than an alternative to it: runtime logs are kept for an
hour, which is shorter than the gap between a failure and somebody noticing.

**A hosted status page instead of an alert.** One is included and is deliberately unused: publishing
it would publish the production URL, which [`docs/infrastructure.md`](../infrastructure.md) →
*The URL-sharing gate* forbids while either gate is closed. An alert reaches one person; a status page
tells the world where to look.

**Structured logging, metrics or tracing as part of this decision.** Sentry Developer includes spans
and logs, and taking them now would be a second decision smuggled inside this one. Errors and
liveness are what a service with no users needs; the rest waits for a question it cannot answer.

## What this deliberately does not buy

**Confirmation before alerting is met for one failure mode and not the other**, and the free plan
cannot close the gap. That is why the answer lives in `/api/health` rather than in monitor settings:
**the retry that protects against a blip had to be built on our side of the check.** What the vendor
does and does not confirm, with its sources, is [`docs/infrastructure.md`](../infrastructure.md) →
*Uptime monitoring: UptimeRobot*.

**Nothing here watches a Provider yet**, because no Provider exists. The reservation above is the
whole of the provision made for it.

**The alert route is partly unproven, and that is the weakest link in this decision.** Not every
channel and not every event has been watched firing; the register holds exactly what was observed and
on what. **Treat the route as unverified until it has been**, because an alerting path that has never
fired is a plan rather than a detector.

## What will try to reopen it

- **The unspent Sentry monitor.** It is free, it is in an account that already exists, and it will
  read as an oversight to anyone who has not read *One free monitor is not one monitor's worth of
  need* above. It is not.
- **The `sentry` MCP is installed and connected**, which makes Sentry the path of least resistance
  for any observability question, uptime included.
- **Any vendor offering "full-stack observability"**, whose pitch is exactly the consolidation this
  ADR refuses. The consolidation is not wrong in general; it is wrong for the specific failure of a
  detector that shares a fate with its subject.
- **What would actually reopen it**: an alert path from Sentry that does not run through the deployed
  application *and* enough monitors for every deployment ADR-0014 implies. Both, not either.

## Consequences

- **Two accounts, two free plans, and no credential for the uptime monitor.** Nothing here calls
  UptimeRobot, so there is no key to hold and no roster row to keep — an absence rather than a gap.
- **The health route is the monitored surface**, so anything that makes it answer `200` while the
  product is broken is a defect in the check, not a passing check.
- **A new deployment gets its own monitor**, and the plan has room for it. The first Provider is the
  first case.
- **Sentry's configuration is bounded by published terms** rather than by the wizard's defaults, and
  a Sentry major version can break those promises by changing a default alone.
- **Errors and liveness are the whole of the observability commitment for now.** Adding tracing,
  metrics or logging is a separate decision, and this ADR is not authority for it.
