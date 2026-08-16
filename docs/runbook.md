# Runbook

**What to do when the site is down, and the one check nobody will be reminded to run.** One entry
per failure this product is actually expected to have, each with its symptom, its check and its
fix, written to be followed by somebody who has just been woken up by a phone.

It is deliberately not the other three documents. What is provisioned lives in
[`infrastructure.md`](infrastructure.md), what was observed lives in
[`incidents.md`](incidents.md), and why anything is the way it is lives in [`adr/`](adr/). This
file is only what to *do*, so an entry that stops being actionable should be deleted rather than
qualified.

**Detection is one bit wide, and it arrives as a push notification.** UptimeRobot checks this site
every five minutes and can tell you only that a check failed. Which URL it checks is a monitor
setting, so [`infrastructure.md`](infrastructure.md) → *Uptime monitoring: UptimeRobot* is the one
place that says; the URL everything below assumes is
[`/api/health`](../apps/web/src/app/api/health/route.ts). Turning that one bit into a cause is what
the rest of this file is.

## Contents

- [The alert, and what it cannot tell you](#the-alert-and-what-it-cannot-tell-you)
- [Triage: two requests](#triage-two-requests)
- [The database does not answer](#the-database-does-not-answer)
- [A Vercel Hobby usage limit tripped](#a-vercel-hobby-usage-limit-tripped)
- [The weekly usage check](#the-weekly-usage-check)

## The alert, and what it cannot tell you

A failing check is set to push to the iPhone **and** e-mail `jacobreesnew@gmail.com`. Only the push
has ever been watched arriving, and only from a throwaway monitor
([incident](incidents.md#a-failing-check-reaches-the-phone-a-recovering-one-may-not)) — so expect
the push, and do not conclude anything from an inbox with nothing in it. The settings are
[`infrastructure.md`](infrastructure.md) → *Uptime monitoring: UptimeRobot*; two things about them
change what you do when an alert arrives.

- **Do not read silence as recovery.** A failing check has been watched reaching the phone; a
  *recovering* one never has
  ([incident](incidents.md#a-failing-check-reaches-the-phone-a-recovering-one-may-not)). Confirm a
  fix with the requests below, never by waiting for a second push.
- **An alert is worth believing, and is still not proof of an outage of ours.** A silent host is
  confirmed from two further locations before it pages while an erroneous status pages on the
  first check (the register, again), and `/api/health` asks three times before it answers one. So
  neither half of the alert is a hair trigger — but the last hop between a checker in North
  America and Vercel is not something this repository can see.

To prove the alert route itself, use the monitor page's **Test Notification** button. Inducing a
real failure was how it was done once, and it left an incident to write up.

## Triage: two requests

Both of these, in this order. They separate every case below from every other.

```bash
curl -s -o /dev/null -w '%{http_code} %{size_download} bytes\n' https://www.canoncore.com/api/health
curl -s -o /dev/null -w '%{http_code}\n' https://www.canoncore.com/
```

| `/api/health` says | What that means | Where to go |
| --- | --- | --- |
| `200`, 0 bytes | The application ran and PostgreSQL answered it. Whatever the monitor saw is not reproducing from here | Nothing to fix. Check the monitor is pointed at this URL |
| `503`, 0 bytes | **Our own answer.** The application is running and three consecutive asks to PostgreSQL failed | [The database does not answer](#the-database-does-not-answer) |
| `503` with a body | **Vercel's answer, not ours** — this route never sends one. A paused deployment serves `503 DEPLOYMENT_PAUSED` ([Vercel KB](https://vercel.com/kb/guide/why-is-my-account-deployment-blocked), read 16 August 2026) | [A Vercel Hobby usage limit tripped](#a-vercel-hobby-usage-limit-tripped) |
| `504`, or any other 5xx with a body | **Vercel's answer again.** `504 FUNCTION_INVOCATION_TIMEOUT` is *"a function invocation [that] takes longer than the allowed execution time"* ([Vercel](https://vercel.com/docs/errors/FUNCTION_INVOCATION_TIMEOUT), read 16 August 2026) — for this route, a connection attempt that neither failed nor succeeded. Treat it as the database entry below | [The database does not answer](#the-database-does-not-answer) |
| `404` | The deployment in production does not carry this route, so the release did not land | `git log origin/main`, then the Actions run for that commit |
| Nothing, or a DNS failure | Neither the application nor Vercel answered | [Vercel's status page](https://www.vercel-status.com/), then the DNS records in [`infrastructure.md`](infrastructure.md) → *Domains* |

The second request is the disambiguator when the first is ambiguous: `/` reads a Story through the
same connection pool, so a database outage takes it to a 500 as well. **`/` at 200 while
`/api/health` is at 503 means the page has stopped depending on the database** — which is fine for
the page and fatal for the check, because from then on only this route can see the outage.

## The database does not answer

**Symptom.** `/api/health` answers `503` with an empty body, and `/` answers `500`. A `504` from
either is the same failure seen from further away: the connection attempt is hanging rather than
being refused, so nothing answered before Vercel gave up on the function.

**Check, in this order, because the first one expires.**

1. **Vercel runtime logs**, which are kept for **one hour** on Hobby
   ([Hobby plan](https://vercel.com/docs/plans/hobby), read 16 August 2026) and are therefore the
   only evidence with a deadline. Two lines this application writes are worth finding: `[canoncore]
   database host …`, which says which host the deployment actually reached, and `[canoncore] an
   idle database connection was dropped: …`, which says the far side closed a pooled connection.
2. **The Neon branch's compute.** Project `steep-wave-52467839`, branch `main` — the `neon` MCP's
   `describe_branch`, or the console. `idle` is normal and means the compute scales to zero after
   inactivity and reactivates on the next query
   ([scale to zero](https://neon.com/docs/introduction/scale-to-zero)); anything reporting the
   project or branch as *suspended* is not.
3. **[Neon's status page](https://neonstatus.com/)**, for the case where nothing here is wrong.

**Fix, by what the check found.**

- **A provider incident** — nothing to do but wait. The route recovers on its own, because a
  connection that errored is discarded rather than handed out again
  ([`health.ts`](../apps/web/src/db/health.ts) has that mechanism and its source).
- **The deployment reached the wrong host** — `DATABASE_URL` or `DATABASE_PRODUCTION_HOST` is
  stale. [`infrastructure.md`](infrastructure.md) → *Environment variables* is the roster, and
  [`database-url.ts`](../apps/web/src/db/database-url.ts) is what refuses.
- **The project really is suspended** — this is a billing question rather than a usage one, see
  below.
- **Never reach for a branch restore to bring a database back.** *"Everything on your current
  branch, data and schema, is replaced with the contents from the historical source"*
  ([branch restore](https://neon.com/docs/guides/branch-restore), read 16 August 2026), which
  turns an outage into data loss. It is the fix for a bad migration, not for a compute that is not
  answering.

> **Exhausting a quota does not suspend this project, and the belief that it does is worth
> correcting once.** The suspension behaviour quoted around this failure mode — *"your compute is
> suspended until the next billing period"* — is the **Free** plan's. This project is on **Launch**
> ([`infrastructure.md`](infrastructure.md) → *Database*), where usage above what is included is
> *billed* rather than cut off ([Neon plans](https://neon.com/docs/introduction/plans), read 16
> August 2026). So a suspended compute here means a payment or subscription problem — the
> subscription is Vercel's, through the marketplace integration — and never a busy week.

## A Vercel Hobby usage limit tripped

**Symptom.** Every URL on the domain answers `503` with Vercel's own error page naming
`DEPLOYMENT_PAUSED`, including `/api/health`. **Or** the site is entirely fine and the release job
stops deploying, which is the same failure against the 100-deployments-a-day cap.

**Check.** The Vercel dashboard's **Usage** page for `jacobreesnew-7380's projects`. There is no
CLI for it and no API this repository can call, which is why the weekly check below exists. What is
included per month, and what a month costs you when it runs out
([Hobby plan](https://vercel.com/docs/plans/hobby), read 16 August 2026):

| Resource | Included |
| --- | --- |
| Active CPU | 4 CPU-hours |
| Provisioned memory | 360 GB-hours |
| Function invocations | 1,000,000 |
| Edge requests | 1,000,000 |
| Deployments | 100 per day |

**Fix. There is no lever, and that is the point of the entry.** *"In most cases, if you exceed your
usage limits on the Hobby plan, you will have to wait until 30 days have passed before you can use
the feature again"* — and Spend Management is unavailable on Hobby, so nothing can be capped ahead
of time either (same page). The two real options are to wait it out or to upgrade to Pro, which is
**CAN-59 Decide whether the Hobby plan can carry a public service** and is a decision to take
before an outage rather than during one.

The one thing to do *during* it: an upgrade takes effect immediately, so if the site has to be back
today, that is the only route back.

## The weekly usage check

**Every Monday, open the Vercel Usage page and read the five numbers above.** It takes a minute,
and it is the only warning that reaches *you* rather than an inbox.

Vercel does send something: *"Usage notifications are set up automatically. Pro teams can also
configure the threshold"*
([manage and optimize usage](https://vercel.com/docs/pricing/manage-and-optimize-usage), read 16
August 2026). Two things follow, and both are why this check exists anyway. **When it arrives is
not ours to choose**, because setting the threshold is a Pro feature, as is Spend Management — the
one thing that could act rather than notify ([Hobby plan](https://vercel.com/docs/plans/hobby)).
And **an e-mail is an inbox**, which is the distinction this whole ticket rests on: the phone gets
the outage, not the warning before it.

**Readings are deliberately not logged here.** A month of ordinary numbers would bury the four
entries above, which is the growth [`infrastructure.md`](infrastructure.md) was split to avoid. Act
on a reading instead: anything past half its allowance with a week of the month left is evidence
for **CAN-59 Decide whether the Hobby plan can carry a public service**, and belongs in that
ticket rather than in this file.
