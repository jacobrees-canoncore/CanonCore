---
status: accepted
---

# The database bill is watched rather than capped, because nothing can cap it

**No control on either side of this arrangement can put a ceiling on the Neon bill.** Vercel's
Spend Management excludes Marketplace integrations by its own wording, and Neon's own enforcing
control — per-project consumption quotas — is refused outright for an organisation that Vercel
manages. So the answer is not a cap. It is **to make the bill small, and to be told when it is
not.**

Decided and applied on 21 August 2026 by
[CAN-144 Bound or detect the Neon bill, which the Vercel spend cap excludes](https://linear.app/jacobrees-canoncore/issue/CAN-144).
The settings, the figures and the dates they were read live in
[`docs/infrastructure.md`](../infrastructure.md) → *Database* and → *Uptime monitoring: UptimeRobot*;
this file holds why.

## Contents

- [The ticket's premise was false, and that is the finding](#the-tickets-premise-was-false-and-that-is-the-finding)
- [Three controls, and the enforcing one is the one the Marketplace removes](#three-controls-and-the-enforcing-one-is-the-one-the-marketplace-removes)
- [What the bill actually was, and what caused it](#what-the-bill-actually-was-and-what-caused-it)
- [So the decision is reduction plus detection](#so-the-decision-is-reduction-plus-detection)
- [Why an hourly check is cheap now, and what changes when the gate opens](#why-an-hourly-check-is-cheap-now-and-what-changes-when-the-gate-opens)
- [What was rejected](#what-was-rejected)
- [What else changed, and why it is here rather than in its own ticket](#what-else-changed-and-why-it-is-here-rather-than-in-its-own-ticket)
- [What will try to reopen it](#what-will-try-to-reopen-it)
- [Consequences](#consequences)

## The ticket's premise was false, and that is the finding

CAN-144 was written as a pre-emptive bound. Its own words: *"Today the database serves one Story
behind row-level security and no Provider has ever fetched a Snapshot, so this is a pre-emptive
bound rather than a live risk."*

**It was not pre-emptive, and the figures are not small.** Read from the live API on 21 August
2026: **175 compute-hours** in the 1–21 August period at `$0.106` per CU-hour — **$18.55** — and
Neon's Launch plan has **no included compute and no monthly minimum**, so it bills from the first
hour.

**The projection needs its bridge stated, or it reads as wrong.** Those 175 hours did not accrue
over the whole billing period: the project was created on **10 August**, so they accrued over
**266.5 hours** of compute life, which is `0.657` CU-hours per wall-clock hour. Over a 744-hour
month that is about **489 CU-hours, or $52** — against a **$24** platform fee, **more than twice the
hosting bill**, for a service no stranger has ever visited. Divide 175 by the 21 days of the period
instead and you get 258, which is the wrong answer to a different question.
[`docs/research/reducing-the-infrastructure-bill.md`](../research/reducing-the-infrastructure-bill.md)
derives `$50.32` for the same quantity from the installation's measured duty cycle rather than from
this project's compute life; the two agree to within 4% and neither is load-bearing.

**Be careful which multiplier is which.** Against the platform fee the *projected* month was about
2.2×, and the three weeks actually elapsed were **less** than the fee. The **four times** in this
change belongs somewhere else entirely — to the compute floor, where a fixed 1 CU billed four times
Neon's own 0.25 CU minimum. Conflating the two overstates the case, and an earlier draft of this
file did exactly that.

**One figure is not reconciled and is not presented as though it were.** Vercel's installation page
read `$26.28` for both databases on 21 August, against about `$19.2` of metered compute across all
four computes. [`docs/research/reducing-the-infrastructure-bill.md`](../research/reducing-the-infrastructure-bill.md)
declines to explain the remainder, and settling it needs Neon's consumption API.

This is recorded first because it is the transferable part. The register row this ticket inherited
said *"nothing bounds this bill"*, which was true, and it was read as a statement about risk rather
than about spend. **A row saying nothing bounds a thing is not evidence the thing is small.**

## Three controls, and the enforcing one is the one the Marketplace removes

The ticket asked whether Neon exposes a spend control, and whether it survives being billed through
the Marketplace. It does expose two. **The Marketplace path keeps the one that talks and removes the
one that acts.**

| Control | Enforces? | Available here? |
| --- | --- | --- |
| Vercel Spend Management | Pauses production deployments | **No.** Excludes Marketplace integrations by its own wording |
| Vercel resource threshold | Auto-recharges a prepaid balance | **No.** Prepayment plans only; Neon here is postpaid |
| Neon consumption quota | Suspends every compute in the project | **No.** Refused: the organisation is managed by Vercel |
| Neon spending notifications | Sends e-mail at 80% and 100% | **Yes** |

**The Vercel side was settled by probe, not by reading.** `vercel integration resource
create-threshold` looks like a spend cap and is not: it is auto-recharge for prepaid credit
("top up $100 when the balance drops below $50"). `vercel integration balance neon` answers
`No balance information found for this integration`, because Neon here bills in arrears. There is
nothing for it to bound.

**The Neon side was settled by attempting it.** `PATCH /projects/{id}` with `settings.quota`
answers:

```
HTTP 404 — action restricted; reason:"organization is managed by Vercel"
```

**And the restriction is specific to quotas rather than general to project writes**, which matters
because the two would call for different answers. A no-op `PATCH` on the same endpoint in the same
minute — writing `history_retention_seconds` back to the value it already held — answered **200**.
So the endpoint is reachable, the key is sufficient, and it is the quota in particular that
Vercel-managed organisations may not set. **The one control that could have enforced a ceiling is
precisely the one the Marketplace path takes away.**

That is the answer to the ticket's *"the Marketplace path is the part that is not obvious"*, and it
could not have been reached by reading: Neon's own documentation describes quotas without
qualification, and the Vercel-managed integration page lists what moves to the Vercel dashboard
without mentioning them.

## What the bill actually was, and what caused it

**Two settings collided, and neither was chosen.**

- **The computes were pinned at a fixed 1 CU**, minimum and maximum both, rather than Neon's own
  0.25 CU floor. Every active second billed at four times the minimum, for a 70 MB database.
- **Scale-to-zero is five minutes, and the uptime monitor polled every five minutes.** The front
  page is `force-dynamic` and reads Stories from Postgres on every request, so each poll woke the
  compute and restarted its five-minute clock.

The poll interval and the suspend timeout were the same number, so the compute essentially never
slept. Measured: **63.8%** of wall clock awake on `canoncore`, against **2.5%** on the sibling
`waveger` project, which nothing polls. Same plan, same region, same owner; the only difference is
that something was knocking every five minutes.

**Neon's own cost guidance names this exactly** — *"Applications that maintain long-lived
connections or scheduled jobs (like cron tasks) can prevent your compute from scaling to zero,
keeping it active 24/7"* — and it was still missed here, because the scheduled job was a monitor
rather than a cron, and monitoring reads as a thing you add rather than a thing that costs.

## So the decision is reduction plus detection

Three changes, in descending order of what they were worth.

1. **The compute floor drops from a fixed 1 CU to autoscaling 0.25–1 CU**, on both existing
   computes *and* on the project's `default_endpoint_settings`, so every branch created later
   inherits it. The ceiling is unchanged, so behaviour under load is identical.
2. **The database check moves from every five minutes to every hour.** The register claimed
   UptimeRobot's free plan could not change its interval; that is false. The control offers 15s,
   30s, 1m, 5m, 30m, 1h, 12h and 24h, and only the options *below* five minutes are paid. Five
   minutes was the floor, never a fixed value.
3. **Neon spending notifications are enabled at $15**, organisation-wide, e-mail at 80% and 100%,
   checked every fifteen minutes. It is the only control available and it only talks.

**The threshold is set below the Vercel platform fee on purpose.** At $15 against a $24 platform
fee, the database cannot become the largest line on the bill without an e-mail arriving first. That is the whole of the guarantee, and it is weaker than a cap: it is a smoke alarm, not a
sprinkler.

## Why an hourly check is cheap now, and what changes when the gate opens

**Moving the interval trades money for detection latency, and today the trade is nearly free.**
A database that stops answering is now found in up to an hour rather than in five minutes.

That costs almost nothing **while [`docs/infrastructure.md`](../infrastructure.md) → *The
URL-sharing gate* is closed**, because there is nobody on the other end to be failed. The cost of
slow detection is paid in visitors who find a broken site, and there are none. This is the same
shape of argument as
[ADR-0024](0024-vercel-pro-for-a-spend-cap-rather-than-an-outage.md)'s, run the other way: that one
refused a thirty-day outage risk because the first strangers arrive immediately after the URL is
shared. Here, nothing has been shared.

**So this is explicitly a decision with an expiry.** [`/api/alive`](../../apps/web/src/app/api/alive/route.ts)
was added in the same change: a liveness route that reaches no database, so a second monitor can
poll it every five minutes while `/api/health` keeps proving the database hourly. That restores
five-minute detection of the failures that take the whole site — a paused deployment, a failed
release, DNS, TLS — at no compute cost, because waking nothing is what the route is for. Its test
asserts that against the file's source rather than its behaviour, because a database read added
there would still answer 200 and the only symptom would be the bill.

**What is not yet established is whether the free plan permits a second monitor at all.** The
dashboard shows `0 / 1` beside the monitor list, and the register's *"Free 50"* may itself be
stale. That is settled at the moment the second monitor is added, which is after `/api/alive` is
live in production — pointing a monitor at a route that 404s pages the phone within five minutes.
Until then the single monitor checks hourly and the gate stays shut.

## What was rejected

- **Neon's Free plan**, which would zero the bill. It is genuinely offered on this installation.
  Three things sink it: every Marketplace plan is scoped to the *installation*, so it would drag
  `waveger` onto Free too; current usage exceeds its 100 CU-hour allowance and would suspend the
  database part-way through each month; and it is **the one plan with no spending notifications**,
  so it removes the only control that works here. It reinstates a silent outage at a limit we
  cannot watch, which is what ADR-0024 spent the platform fee to escape.
- **Neon's Scale plan**, for its 1-minute configurable scale-to-zero. Sub-five-minute timeouts are
  Scale-only on Launch, so this was the obvious lever. It loses on arithmetic: the higher CU-hour
  rate applies installation-wide and doubles `waveger` too, netting about $2 a month.
- **Caching the front page** so it stops reaching Postgres. Row-level security decides what that
  page contains from the session user, so a cached render is a render for one identity;
  `force-static` empties `cookies()` and deletes the signed-in path entirely. It saves nothing
  because it cannot be done.
- **Shortening the history window** from its one-day default. `written_data_bytes` is zero across
  every branch, so the ceiling on the saving is about **1.3 cents a month**. Recorded so nobody
  re-derives it.

## What else changed, and why it is here rather than in its own ticket

This ticket is scoped to the *Neon* bill. Four things were changed that are not the Neon bill, and
each is recorded here rather than left for someone to find in a dashboard.

- **Vercel's `Observability Plus` add-on was switched off.** It arrived with the Pro upgrade,
  nobody chose it, it bills per event with no allowance, and as an add-on it sits outside the $40
  cap — the same exclusion this whole ticket is about, on the other vendor.
  **[`docs/research/reducing-the-infrastructure-bill.md`](../research/reducing-the-infrastructure-bill.md)
  ranked it 5 and said "probably keep it and document it". That recommendation was overruled by
  Jacob, deliberately, and this sentence is the record of the reversal** — a research document that
  ships in the same commit as its own contradiction is worse than useless if nobody says which won.
- **The team's default build machine for new projects went from `Turbo` to `Elastic`.** Existing
  projects already ran `Elastic`; only the default for *new* ones was the most expensive tier. It
  costs nothing today and would have cost something on the next project created.
- **An organisation-wide Neon API key was revoked.** Named `Canoncore`, created 16 February 2026
  and last used 19 March 2026 — both dates preceding this Neon project's existence on 10 August.
  Organisation-wide means admin over every project, member and billing detail, `waveger` included.
  Found by
  [CAN-138 Give every Orca worktree its own preview database, so parallel schema work stops colliding](https://linear.app/jacobrees-canoncore/issue/CAN-138)
  while minting the project-scoped key this change used, and left for this ticket because it is a
  credential decision rather than a branching one. The register entry it recorded is updated in the
  same commit: [`docs/infrastructure.md`](../infrastructure.md) → *The Neon API key*.
- **The sibling `waveger` Neon project was cleaned up** — preview branching switched off and twelve
  abandoned preview branches deleted. It is not this product's infrastructure and earns no more than
  a line here; what makes it worth citing at all is that it is the concrete precedent behind the
  prohibition below, and [`docs/incidents.md`](../incidents.md) → *Thirteen preview branches on the
  sibling project* holds the figures. [ADR-0023](0023-one-shared-schema-only-preview-branch.md) is
  why `canoncore` had two branches where its sibling had thirteen.

**The honest reading is that three of these are scope creep**, admitted rather than argued away.
They were done because the estate was open on the screen and the bill was the subject; each is a
setting a separate ticket would have taken a day to reach.

## What will try to reopen it

**A suggestion to add a cap now that the ticket is closed.** There is no cap to add. Any proposal
to bound this bill has to say *which* control it uses, and all three candidates are refused above
with the response each gives. The next honest change is not a cap but a smaller bill.

**Restoring the five-minute database check, on the grounds that hourly detection is sloppy.** It
is sloppy, and it is deliberate, and the section above says what makes it affordable and when that
stops being true. Restoring it without adding `/api/alive`'s monitor first quadruples the bill and
buys back the same detection that the second monitor gives for nothing.

**Anything that polls the database on a timer.** A cron warming a connection, a readiness probe, a
keep-alive, a per-worktree health check. The compute is billed by the five-minute window each wake
opens, not by the query, so the cost is set by *how often* something knocks and not by how much it
asks for. [ADR-0025](0025-a-preview-database-per-worktree.md) carries the same prohibition for
per-worktree databases, where it would be multiplied by the number of open worktrees.

**Re-pinning the compute to a fixed size.** 1 CU reads as safer than autoscaling and costs four
times as much at idle. The ceiling is already 1 CU; the floor is what was changed.

## Consequences

**The `What bounds this bill` row in [`docs/infrastructure.md`](../infrastructure.md) → *Database*
changes meaning rather than being answered.** It said nothing bounds this bill. Nothing still does,
but that is now a finding with three refusals behind it rather than an open question, and a
notification threshold sits where the cap cannot.

**[`docs/runbook.md`](../runbook.md) → *What warns you before a pause* gains its missing row.** It
ended with *"What no threshold covers at all: the database. Nothing warns you about that bill."*
Something does now, and it is the only thing that can.

**A register claim was wrong and is corrected.** *Uptime monitoring: UptimeRobot* said the
five-minute interval "cannot be changed on Free 50". It can. The claim had stood since 13 August
2026 and was load-bearing for the design that produced the bill.

**Nothing about the architecture changes.** This buys a smaller bill and an e-mail. It does not
reopen [ADR-0005](0005-stack.md)'s choice of Neon, [ADR-0023](0023-one-shared-schema-only-preview-branch.md)'s
single shared preview branch, or [ADR-0024](0024-vercel-pro-for-a-spend-cap-rather-than-an-outage.md)'s
Vercel plan — and in particular the Vercel platform fee was never in scope.
