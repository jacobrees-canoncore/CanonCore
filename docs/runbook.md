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
most of this file is. The exception is *A Source's licence terminates*, which no monitor can see and
which starts by saying so.

## Contents

- [The alert, and what it cannot tell you](#the-alert-and-what-it-cannot-tell-you)
- [Triage: two requests](#triage-two-requests)
- [The database does not answer](#the-database-does-not-answer)
- [A Vercel Hobby usage limit tripped](#a-vercel-hobby-usage-limit-tripped)
- [A Source's licence terminates](#a-sources-licence-terminates)
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

## A Source's licence terminates

**Nothing pages you for this one, and that is why it is written down.** The alert route above
watches whether the site answers; a Source's licence ending does not stop it answering. What it
starts is a deadline.

**Symptom. Four ways it happens, and the last looks exactly like an outage.** *"Your license to use
the TMDB APIs terminates automatically if (i) TMDB determines, in its sole discretion, that You have
violated or are in violation of these terms and conditions, (ii) TMDB publicly posts a written
notice of termination on themoviedb.org, (iii) TMDB sends a written notice of termination to You
(via electronic or other means), or (iv) TMDB disables Your access to the TMDB APIs"*
([API Terms of Use](https://www.themoviedb.org/api-terms-of-use), read 17 August 2026). So a
Provider suddenly getting 401s is one of the two things: a credential problem, or the licence gone.
Establish which before anything else.

**The deadline is real and carries no figure.** On termination *"you must promptly delete or
otherwise purge all TMDB Content, including any cached content"* (same page). **No number of days
appears**, which is stricter rather than kinder: *prompt* is judged after the event against how
quickly you could have acted, and a purge that already exists as a tested command is the answer to
that question. Act the day you learn, and let the dispatched run below be the record of when.

**The operator is Jacob**, because there is nobody else and a runbook that says "an operator" says
nothing. No credential to fetch: the workflow below already holds one.

**Check, in this order.**

1. **The mail on the account that registered with the Source**, Junk included — a written notice is
   one of the four routes above. `macos-mail-mcp` reads it; note the standing rule that it may be
   used for nothing but mail this project sent or received.
2. **The Source's own site**, for a publicly posted notice.
3. **The credential, by hand.** Whether the key still answers is the difference between (iv) and an
   ordinary outage, and *"TMDB revocation is eventual"* — regenerating our own key left the old one
   answering sixteen minutes later
   ([incident](incidents.md#regenerating-a-tmdb-key-does-not-revoke-the-old-one-promptly)) — so a
   key that still works is weak evidence and a key that has stopped is not proof either.
4. **Nothing in this application can tell you.** Under
   [ADR-0014](adr/0014-shell-providers-and-per-source-retention.md#decision-1--the-app-is-a-shell)
   it does not know which Sources exist, and the credential lives in the Provider. There is no check
   to add here; that is what makes the three above the procedure rather than a fallback.

**Fix. One dispatched command, and read the id back first.**

Step 1 is a query, run wherever you can reach the database as something other than the application
role — the `neon` MCP's `run_sql`, the Neon console, or `psql` with `canoncore_migrator`'s string.
**Nothing in the `source` table names which Source a row is**: it carries an id and a retention and
deliberately nothing else, so the id has to be matched against the Provider that wrote it. When one
identifies itself, that is a capability declaration (**CAN-104 Read a Provider's capability
declaration, and refuse what it does not serve**).

```sql
select id, retention from source;
```

Then dispatch the purge. `--ref main` because a dispatch reads the workflow from the default branch,
and the run's own log is the report:

```bash
gh workflow run purge-source.yml --ref main -f source_id=<id>
gh run list --workflow purge-source.yml --limit 1        # its id, and whether it is still going
gh run view <run-id> --log                               # what it removed
```

The run prints what it removed: Snapshots deleted, Stories tombstoned, Stories left standing because
another Source still says something about them. **A Story it emptied is now a tombstone** — the
identity, what kind of thing it was, and when it went, and no value any Source supplied
([ADR-0014](adr/0014-shell-providers-and-per-source-retention.md) → *Decision 8*). Its own row is
gone, title included: today a title has no provenance to prove it was not the Source's, and a purge
that leaves one behind is not a purge.

**It is not undoable, and it is not meant to be.** Undo works on Operations, and `CONTEXT.md`'s
glossary says in terms that what the product does unbidden — a retention sweep, a purge — is never
one: an undo buffer holding purged Source content would be the breach again under a friendlier
name. It also reaches every user's rows at once, which is the obligation cost
[ADR-0003](adr/0003-no-shared-catalogue.md) records.

**Cross-check, and run it as `canoncore_migrator`.**

```sql
select (select count(*) from source   where id        = '<id>') as source_rows,
       (select count(*) from snapshot where source_id = '<id>') as snapshot_rows;
```

Both must be `0`. **To check the run's report rather than trust it**, take the ids it printed under
`Stories tombstoned` and ask for them in both tables — each must be absent from the first and present
in the second:

```sql
select (select count(*) from story     where id = any($1)) as should_be_zero,
       (select count(*) from tombstone where id = any($1)) as should_match_the_report;
```

Three things about these queries rather than the queries themselves:

- **The application role would answer `0` whether or not it is true.** `snapshot` is behind a policy
  keyed on the Story's owner, so a count run as `canoncore_app` with no session user returns only
  rows belonging to public Stories — a false negative that reads exactly like proof. Anything with
  `BYPASSRLS` or the table owner is fine; the application role is not.
- **A non-zero `snapshot_rows` was already impossible**, because the command deletes the `source`
  row last and `snapshot.source_id` references it `on delete no action` — so the delete could only
  have succeeded with no Snapshot of it left anywhere. What the query adds is a check on rows written
  by something other than that command.

**If the run says `PARTIAL PURGE`, it did part of the job and named the rest.** It prints
`NOT REACHED:` and one or more table names, keeps the Source's own row, and exits non-zero. That
means the schema has grown a table nothing has classified — `supersededValue` and the audit payloads
are the two expected ones, and both are Source content living outside `snapshot`
([ADR-0014](adr/0014-shell-providers-and-per-source-retention.md) → *Decision 6*, unresolved items 2
and 3). **The duty is not discharged until that is finished**, and finishing it is two steps:

1. Decide what the purge does with the named table and record it in
   `howThePurgeTreatsEachTable`, in [`purge-source.ts`](../apps/web/src/db/purge-source.ts). Not
   always a delete: a store held under a statutory retention duty is a genuine conflict, and that
   file says where the same conflict is already recorded against erasure.
2. **Dispatch the same command again.** It is re-runnable by design — that is why a partial run keeps
   the `source` row — and the second run finishes what the first withheld.

Do not read past a `NOT REACHED` line, and do not treat the first run as the record: the two runs
together are.

**And today there is nothing to purge.** No Provider exists yet (**CAN-101 Create the provider-tmdb
repository, and give it the TMDB credential**), nothing writes a `source` row, and no Snapshot has
ever been fetched. This entry is here so that the first time it is needed is not the first time it is
written.

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
