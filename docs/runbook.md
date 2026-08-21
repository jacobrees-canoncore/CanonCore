# Runbook

**What to do when the site is down, and the one failure nothing will page you about.** One entry
per failure this product is actually expected to have, each with its symptom, its check and its
fix, written to be followed by somebody who has just been woken up by a phone.

It is deliberately not the other three documents. What is provisioned lives in
[`infrastructure.md`](infrastructure.md), what was observed lives in
[`incidents.md`](incidents.md), and why anything is the way it is lives in [`adr/`](adr/). This
file is only what to *do*, so an entry that stops being actionable should be deleted rather than
qualified.

**Detection is one bit wide, and it arrives as a push notification.** UptimeRobot checks this site
**every hour** — it was every five minutes until 21 August 2026, and
[ADR-0026](adr/0026-the-database-bill-is-watched-rather-than-capped.md) is why it is not — and it
can tell you only that a check failed. Which URL it checks is a monitor
setting, so [`infrastructure.md`](infrastructure.md) → *Uptime monitoring: UptimeRobot* is the one
place that says; the URL everything below assumes is
[`/api/health`](../apps/web/src/app/api/health/route.ts). Turning that one bit into a cause is what
most of this file is. The exception is *A Source's licence terminates*, which no monitor can see and
which starts by saying so.

**What that one bit now means is stronger than it was.** Since **CAN-151 Watch the Story route,
where a broken policy serves 200 with nothing in it** the check does not ask whether the database
answers; it reads the founding Story the way the public page reads it, so it fails when the site is
up, the database is up, and a stranger would be served a page with nothing on it. That failure used
to be invisible to everything. **The push is still one bit** — the second bit is the status code,
and the first request below is what reads it.

## Contents

- [The alert, and what it cannot tell you](#the-alert-and-what-it-cannot-tell-you)
- [Triage: two requests](#triage-two-requests)
- [A release is bad](#a-release-is-bad)
- [The Story cannot be read](#the-story-cannot-be-read)
- [The database does not answer](#the-database-does-not-answer)
- [The database has to be restored from a backup](#the-database-has-to-be-restored-from-a-backup)
- [Spend Management paused the production deployment](#spend-management-paused-the-production-deployment)
- [A Source's licence terminates](#a-sources-licence-terminates)
- [What warns you before a pause](#what-warns-you-before-a-pause)

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
| `500`, 0 bytes | **Our own answer, and the newer one.** PostgreSQL answered, and the founding Story did not come back to a reader with no account. Nothing is unreachable; something has stopped the page being servable | [The Story cannot be read](#the-story-cannot-be-read) |
| `503` with a body | **Vercel's answer, not ours** — this route never sends one. A paused deployment serves `503 DEPLOYMENT_PAUSED` ([Vercel KB](https://vercel.com/kb/guide/why-is-my-account-deployment-blocked), read 16 August 2026) | [Spend Management paused the production deployment](#spend-management-paused-the-production-deployment) |
| `500` **with a body** | **Vercel's answer, not ours** — the row above is ours and sends none. `500 INTERNAL_FUNCTION_INVOCATION_FAILED` *"occurs when a function invocation fails … due to an error within the function itself, or an issue with the environment in which the function is running"* ([Vercel](https://vercel.com/docs/errors/INTERNAL_FUNCTION_INVOCATION_FAILED), read 21 August 2026) | [A release is bad](#a-release-is-bad) |
| `504`, or any other 5xx with a body | **Vercel's answer again.** `504 FUNCTION_INVOCATION_TIMEOUT` is *"a function invocation [that] takes longer than the allowed execution time"* ([Vercel](https://vercel.com/docs/errors/FUNCTION_INVOCATION_TIMEOUT), read 16 August 2026) — for this route, a connection attempt that neither failed nor succeeded. Treat it as the database entry below | [The database does not answer](#the-database-does-not-answer) |
| `404` | The deployment in production does not carry this route, so the release did not land | [A release is bad](#a-release-is-bad) |
| Nothing, or a DNS failure | Neither the application nor Vercel answered | [Vercel's status page](https://www.vercel-status.com/), then the DNS records in [`infrastructure.md`](infrastructure.md) → *Domains* |

The second request is the disambiguator when the first is ambiguous: `/` reads a Story through the
same connection pool, so a database outage takes it to a 500 as well. **`/` at 200 while
`/api/health` is at 503 means the page has stopped depending on the database** — which is fine for
the page and fatal for the check, because from then on only this route can see the outage.

## A release is bad

**Symptom. Three shapes, and only one of them reaches the phone.**

- **`/` answers a 5xx of our own.** This is the one that pages you, and quickly: the monitor polls
  `/`, and anything answering with an erroneous status is *"instantly marked as down without
  verification"* ([`infrastructure.md`](infrastructure.md) → *Uptime monitoring: UptimeRobot*). The
  interval is an hour, so that is the latency.
- **A route 404s that used to answer.** The release did not land, or landed without it.
- **The site answers `200` and is wrong.** **Mostly nothing pages you**, and this is reached by
  someone looking rather than by an alert. **One shape of it now has a check**: a release that
  leaves the founding Story unreadable answers `500` on `/api/health` —
  [The Story cannot be read](#the-story-cannot-be-read). Everything else that is wrong while
  answering `200` is still invisible.

**Check. Three questions, and the third decides whether the fix below is safe.**

1. **Did a release run, and how did it end?** `gh run list --branch main --limit 3`. The order is
   migrate, build, promote ([ADR-0019](adr/0019-ci-owns-the-production-release.md)), so *where* a red
   run stopped says what state production is in: a failed migration promoted nothing, and a failed
   promotion left the schema moved with the old code still serving.
2. **Which production deployments exist, and what commit is each?** Newest first. `vercel list --prod`
   shows neither the commit nor which one is current, whatever
   [Vercel's guide](https://vercel.com/docs/deployments/rollback-production-deployment) says, so ask
   for JSON:

   ```bash
   vercel list canoncore --prod --json --scope jacobreesnew-7380s-projects \
     | jq -r '.deployments[] | "\(.url)  \(.meta.githubCommitSha[0:8])  \(.meta.githubCommitMessage | split("\n")[0])"'
   ```

   To confirm which one is serving, `vercel inspect <url> --scope jacobreesnew-7380s-projects` lists
   its **Aliases**, and the current one carries `https://www.canoncore.com`. Both of these take the
   deployment or project by name, so neither needs the link the fix below does.
3. **Did anything between the two releases touch the schema?** This is the question that decides
   everything below.

   ```bash
   git diff --name-only <good-sha> <bad-sha> -- apps/web/drizzle
   ```

   **Empty output is the green light**, and the rollback is code-only. **Non-empty is not a red
   light** — read the migrations it names. The question is never "did it add or remove", it is
   **does the schema still accept everything the release you are going back to does**, writes
   included:

   | What the migration did | Rolling the code back |
   | --- | --- |
   | Added a table, a nullable column, an ordinary index — anything that accepts strictly more | **Safe.** Old code does not know the new shape exists, and nothing it does is refused |
   | **Added a constraint**: `NOT NULL` with no default, a `UNIQUE` or `CHECK`, a new foreign key | **Looks additive and is not.** It creates no problem for old code's *reads* and rejects some of its *writes*. Treat it as a narrowing and use the two rows below |
   | Narrowed, and conformed to the rule | **Safe by construction.** A narrowing is only permitted once the previous release's code has stopped needing the old shape, and that is exactly the code you are going back to ([ADR-0027](adr/0027-migrations-are-forward-only-and-a-rollback-moves-code-alone.md)) |
   | Narrowed too early, or the migration *is* the bug | **Not safe, and not what this entry fixes.** *What this cannot recover* below |

   The third row is the whole return on the rule, so **do not treat "it touched the schema" as a
   refusal.** **The second row is the trap**, because "purely additive" is how a new constraint reads
   in a diff and the rule it breaks is about writes rather than shape.

**Fix. It takes seconds, and it has to be run from a linked directory.**

`vercel rollback` and `vercel promote` take a deployment and **no project argument**, so `--scope`
alone does not tell them which project they mean: from an unlinked directory the CLI searches *that
directory* for a project and offers to set a new one up, which is the last thing you want at this
moment. Link first, in the repository checkout. It is idempotent and writes only `.vercel/` and
`.env.local`, both already ignored here:

```bash
vercel link --project canoncore --team jacobreesnew-7380s-projects --yes
vercel rollback <previous-deployment-url> --yes
```

Then confirm from outside, with the two requests at the top of this file. **Do not confirm from
`vercel rollback status`** — it reports a *pending* rollback, so it answers `No deployment rollback
in progress` once one has finished, and immediately after an undo it names the deployment you
promoted rather than the one you rolled back from. It is the one command here that takes a project,
so it needs no link:

```bash
vercel rollback status canoncore --scope jacobreesnew-7380s-projects
```

**This route has been run end to end**, deliberately and against production, rather than reasoned
about ([incident](incidents.md#a-rollback-turns-off-auto-assignment-of-production-domains)).

**The one thing to do afterwards that nothing warns you about.** A rollback turns off the project's
auto-assignment of production domains, so **the next release is not to be trusted to have taken the
domain** — check it moved rather than reading a green Actions run as proof. Read the flag back:

```bash
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/prj_BMzP9Dq7Qx3Eev8WwsvVoH5khnaU?teamId=team_fM6JucuEULAiTuHY5TM5h3TP" \
  | jq '.autoAssignCustomDomains'
```

`false` means a rollback is still in force. **`lastRollbackTarget` is not the field to read**, and
neither is `vercel rollback status`; the incident says why both mislead.

**Undo it when the fix has landed**, which is also what puts auto-assignment back. From the same
linked directory as the rollback, and for the same reason — `promote` takes no project either:

```bash
vercel promote <good-deployment-url> --yes
```

**What this cannot recover.** A procedure that overstates its reach is worse than none, so:

- **A migration that is itself the bug. This is the big one.** The rollback moves the code and never
  the schema, there are no down-migrations and there will not be
  ([ADR-0027](adr/0027-migrations-are-forward-only-and-a-rollback-moves-code-alone.md)), so a
  migration that dropped the wrong thing or mangled rows is still dropped and still mangled after the
  code has gone back. **Fix forward.** The only thing that puts a schema back is a Neon branch
  restore, which replaces the data too — *The database does not answer* below has the quotation and
  the refusal.
- **A narrowing that shipped too early**, meaning one whose release broke the rule that every
  migration leaves the schema able to serve the previous release's code. Then the rollback lands old
  code on a shape it cannot serve and you have swapped one outage for another. This is the case check
  3 exists to find, and the reason the rule is a rule.
- **Rows the bad release wrote.** Rolling the code back does not unwrite them, and a release that
  corrupted data is not recovered here at all.
- **Environment variables changed since the target was built.** *"The configuration used for the
  rolled-back deployment may become stale"* ([Instant Rollback](https://vercel.com/docs/instant-rollback),
  read 21 August 2026), so a credential rotated after that build
  does not travel back with it.
- **Anything outside the deployment** — Neon settings, the ruleset, DNS, the spend budget. None of it
  is in the build, so none of it moves.
- **More than one release back is a judgement, not a guarantee.** Pro allows rolling back to any
  deployment previously aliased to production (same page as above), and every production deployment
  here is eligible
  ([incident](incidents.md#a-rollback-turns-off-auto-assignment-of-production-domains)). What the
  repository *guarantees* is
  one release: every migration is required to leave the schema able to serve the previous release's
  code, and nothing promises that two releases back. **Check 3's table does not extend**, either —
  its "safe by construction" row is the invariant, and the invariant reaches exactly one release. Two
  or more back, there is no rule doing the work for you: read every migration across the span against
  the code you are going back to, or roll back one release at a time.

## The Story cannot be read

**Symptom.** `/api/health` answers `500` with an **empty body**, which is ours and not Vercel's —
*Triage* above is what tells the two apart. The site is up and PostgreSQL is answering it; what
failed is the read the public page makes. Nothing else here has this shape: every other entry has
something not answering.

**What the alert means.** The check asks for one public Story as a reader with no account, through
row-level security, exactly as the page does
([`infrastructure.md`](infrastructure.md) → *The Story the health check reads*). A `500` means that
read came back with nothing. **That is the failure this check was built for**: a policy that has
stopped letting a stranger through returns no rows rather than an error, so before **CAN-151 Watch
the Story route, where a broken policy serves 200 with nothing in it** the site answered every check
that existed while serving a stranger a page with nothing on it.

**What it cannot tell you, and one thing nobody should read into it.**

- **It says nothing about whether one reader can see another's rows.** A green check means a public
  Story is readable by a stranger. It would be just as green if every private Story were readable by
  everybody, which is the opposite failure and the worse one. **Nothing outside this deployment
  watches for that, and nothing is meant to**: it is asserted before the code lands, by the
  cross-tenant tests in [`rls.test.ts`](../apps/web/src/db/rls.test.ts), which ADR-0005 rule 2
  requires and [`agents/workflow.md`](agents/workflow.md) → *The gates* holds. A green monitor is
  never evidence that isolation holds.
- **It cannot say which of the three causes below it is**, which is what the requests do.
- **It is not a database outage.** That answers `503`, and the two are deliberately different codes
  so that this triage can happen from the alert.
- **It watches the read that page makes and not the page's own rendering.** The check calls the
  same function, so a component that threw would take `/story/…` to a `500` while this stayed
  green. That gap is covered before a merge rather than after one, by
  [`e2e/story-page.spec.ts`](../apps/web/e2e/story-page.spec.ts) — and nothing outside the
  deployment watches it, which is worth knowing rather than assuming.

**Check. Two requests, and the first one settles most of it.**

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://www.canoncore.com/story/00000000-0000-4000-8000-000000000001
curl -s https://www.canoncore.com/ | grep -c 'No Story is public yet'
```

The second prints `1` when the front page is empty and `0` when it has something on it — that
sentence is the empty state, in [`front-page.tsx`](../apps/web/src/app/front-page.tsx).

| What they say | What has happened |
| --- | --- |
| `404`, and the front page has something on it | **That one row is gone, or is no longer public.** A purge, a hand-edited row, or a migration that touched it |
| `404`, and the front page is empty | **The policy is refusing everybody.** A migration changed the policy on `story`, or the grant under it |
| `200` | The read this check makes and the read that page makes have come apart, which should not be possible: they are the same function. Treat it as a defect in the check itself |

Then, whichever it was: **did a release run just before it started?** `gh run list --branch main
--limit 3`, and `git diff --name-only <good-sha> <bad-sha> -- apps/web/drizzle` for what it moved.
A policy or a grant is only ever changed by a migration.

**Fix, by what the check found.**

- **A migration broke the policy or the grant.** **A rollback will not undo it**, because a
  rollback moves code alone and the schema stays where it is
  ([ADR-0027](adr/0027-migrations-are-forward-only-and-a-rollback-moves-code-alone.md)). The fix is
  forward: a migration that restores what the last one changed, landed through the ordinary gates.
- **The row was removed by accident.** Same answer, for the same reason: a new migration that puts
  it back. Migration 0002 will not do it again — it is in the journal, so the release does not run
  it a second time.
- **The row was removed on purpose**, because a Source's licence ended or because real rows have
  replaced the founding fixture. **Then the alert is right and the check is what is out of date.**
  Choose the row it should read and change it in all four places
  ([`infrastructure.md`](infrastructure.md) → *The Story the health check reads* says which) —
  **and the fourth is the request above on this page**, which is why the count is four rather than
  three. Then run `node scripts/check-docs.ts`: it fails until all four agree, which is what stops
  this entry sending the next reader after a Story somebody retired on purpose.

**What not to do.** Do not answer this by making the check ask less. Pointing the monitor at
[`/api/alive`](../apps/web/src/app/api/alive/route.ts), or putting a connection test back where the
read is, silences the alert and restores the gap it exists to close —
[`infrastructure.md`](infrastructure.md) → *The two routes a monitor may point at* says why that
route can never stand in for this one.

## The database does not answer

**Symptom.** `/api/health` answers `503` with an empty body, and `/` answers `500`. A `504` from
either is the same failure seen from further away: the connection attempt is hanging rather than
being refused, so nothing answered before Vercel gave up on the function.

**Check, in this order, because the first one expires.**

1. **Vercel runtime logs**, which are kept for **one day** on Pro
   ([runtime logs](https://vercel.com/docs/logs/runtime), read 21 August 2026) and are therefore the
   only evidence with a deadline. Two lines this application writes are worth finding: `[canoncore]
   database host …`, which says which host the deployment actually reached, and `[canoncore] an idle
   database connection was dropped: …`, which says the far side closed a pooled connection.
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

## The database has to be restored from a backup

**This is the last entry to reach for, and the first question is which of two mechanisms you want.**
They are both destructive and they answer different failures.

- **The damage is inside 7 days and Neon is fine** → Neon's own instant restore, which is faster and
  loses nothing else. It is *"a **complete** overwrite, not a merge or refresh. Everything on your
  current branch, data and schema, is replaced with the contents from the historical source"*
  ([branch restore](https://neon.com/docs/guides/branch-restore), read 21 August 2026) — so it
  undoes good writes made since the moment you restore to, as well as bad ones. **The state it
  replaced is kept only if something asks for it.** From the console that is automatic, as a branch
  named `{branch_name}_old_{head_timestamp}`; **from the API it is the `preserve_under_name`
  parameter, and omitting it preserves nothing** — required when a branch has children or is being
  restored to its own history, and optional, so silently absent, when it is not. A reset of a
  worktree branch from its parent on 21 August 2026 passed no such name and produced no such branch,
  which is the parameter working rather than the guarantee failing. Neon's documentation does not
  say how long a preserved branch is kept.
- **The damage is older than 7 days, or the Neon account is gone** → the nightly backup, below. It
  is the only thing that survives losing the provider, and it is 24 hours stale at worst.

**Neither is the answer to a bad release**, which is *A release is bad* above: that moves code and
never the schema ([ADR-0027](adr/0027-migrations-are-forward-only-and-a-rollback-moves-code-alone.md)).
And neither is the answer to a database that is not answering — *The database does not answer*.

**What you need before you start.** Both live on Jacob's machine and in no workflow, deliberately:
`~/.config/canoncore/backup-age-key` (the only thing that can decrypt a backup) and
`~/.config/canoncore/blob-read-write-token`. [`infrastructure.md`](infrastructure.md) → *Backups*
says where they come from. **Without the age identity there is no restore at all**, and nothing else
in this file changes that.

### Restoring into a scratch branch, which is where you always start

**Never restore straight onto production, even when production is what you mean to fix.** A
`--clean` restore drops each object before recreating it, and one that stops half way has already
dropped what it did not put back — so a failure leaves the target worse than it found it. The
script refuses production for that reason and needs `--onto-production` to be told otherwise.

1. **Make a branch to restore into**, as a child of `preview` rather than of `main` — a child of
   `main` starts as a copy of production, so every row you are trying to prove arrived would already
   be there.

   ```bash
   curl -s -X POST -H "Authorization: Bearer $(cat ~/.config/canoncore/neon-api-key)" \
     -H "Content-Type: application/json" \
     -d '{"branch":{"parent_id":"br-calm-flower-zame56ly","name":"restore-drill"},"endpoints":[{"type":"read_write"}]}' \
     "https://console.neon.tech/api/v2/projects/steep-wave-52467839/branches"
   ```

2. **Check the migration role has `CREATE` on the database, and grant it if not.** The restore needs
   it to recreate the `drizzle` schema, and without it stops at `permission denied for database
   neondb` — which is how this was found on 21 August 2026, when `preview` and every worktree branch
   lacked it
   ([incident](incidents.md#canoncore_migrator-has-create-on-the-database-on-main-alone)). **Every
   branch that exists now has it**, and a `parent-data` child inherits it from `preview`, so this
   step should read `t` and pass straight through. A branch made `schema-only` would not inherit it.
   Connected as `neondb_owner`:

   ```sql
   SELECT has_database_privilege('canoncore_migrator', 'neondb', 'CREATE');
   GRANT CREATE ON DATABASE neondb TO canoncore_migrator;  -- only if that answered f
   ```

3. **Restore, as `canoncore_migrator` and not as `neondb_owner`.** The migration role owns every
   table, and only an owner may drop a policy: as `neondb_owner` the restore stops at `must be owner
   of relation version`, having already dropped part of the schema. Neon will hand you either role's
   connection string — `role_name=canoncore_migrator` on the `connection_uri` endpoint.

   ```bash
   export RESTORE_DATABASE_URL='postgresql://canoncore_migrator:…'
   node scripts/restore-database.ts                       # the newest backup
   node scripts/restore-database.ts --pathname postgres/2026-08-21T02-17-00Z.dump.age
   ```

4. **Compare what it printed with the source.** It prints every table's row count and then the
   guards — row security, policy count, what each application role may do, and the owner. The row
   counts belong against the ones the backup's own workflow run logged; the guards belong against
   [`infrastructure.md`](infrastructure.md) → *Roles*. **A restore nobody compared has only proved
   that `pg_restore` exits zero.**

5. **Delete the branch when you are done with it.** It holds a full copy of production.

### What this was proved against, and the three things that bit

**Performed on 21 August 2026 under CAN-55 Keep a backup that reaches past Neon's 24-hour history
window**, restoring a real production backup into a branch of `preview` whose own contents differed
on seven tables. All thirteen tables came back with production's exact row counts, and the twelve
`public` tables came back with row security, policy counts, both roles' privileges and ownership
**identical to production's**.

**The warning at the top of this section is observed rather than predicted.** Later the same day a
`--clean` restore was pointed at a *live* worktree preview database to demonstrate the refusal
above, and stopped at the missing `CREATE` — leaving that database with **no tables and no `drizzle`
schema**, because `--clean` had already dropped what it then could not put back. It was repaired by
resetting the branch from its parent, which is the fix for any worktree database:
`POST /projects/steep-wave-52467839/branches/{id}/restore` with the parent's id as
`source_branch_id` — and `preserve_under_name` too if the state being replaced is worth keeping,
which on a database this had just emptied it was not. **That is the whole argument for the scratch branch**, and it happened to
somebody who had just written this page.

Three failures happened before the drill worked, and each one is a step above: the wrong role, the
missing database privilege — **since fixed on every branch**, so step 2 is now a check rather than a
grant — and Neon's own catalogue entries. **That third one is why the restore filters the
archive**: a whole-database dump carries `DEFAULT PRIVILEGES FOR ROLE cloud_admin` and the `public`
schema's ACL, which belong to Neon rather than to this project and which nothing here may recreate —
`permission denied to change default privileges`. The restore skips those three entries by owner and
prints each one it skipped.

### Restoring production itself

Only after a scratch restore has succeeded, and only with the flag:

```bash
RESTORE_DATABASE_URL='…production…' node scripts/restore-database.ts --onto-production
```

**Read *A release is bad* first.** If the code that will meet this schema is not the code the backup
was taken under, restoring the data is half a recovery: migrations are forward-only, so a schema
from the past meets today's release with no way back
([ADR-0027](adr/0027-migrations-are-forward-only-and-a-rollback-moves-code-alone.md)). Decide which
release is running before you replace the schema underneath it.

## Spend Management paused the production deployment

**Symptom.** Every URL on the domain answers `503` with Vercel's own error page naming
`DEPLOYMENT_PAUSED`, including `/api/health`.

**Since the Pro upgrade of 21 August 2026 this has one expected cause, and it is a figure we chose.**
On Hobby the entry here was an included-usage limit tripping, with no lever and up to thirty days of
waiting. **On Pro there is no included-usage cliff** — Active CPU, provisioned memory and invocations
are all usage-based, and the deployment cap is 6,000 a day rather than 100
([limits](https://vercel.com/docs/limits), read 21 August 2026) — so what pauses this project is
**Spend Management reaching the $40 on-demand budget** and executing the pause we configured
([`infrastructure.md`](infrastructure.md) → *Hosting*).
[ADR-0024](adr/0024-vercel-pro-for-a-spend-cap-rather-than-an-outage.md) is why that trade was made.

**Check: the team's Activity log, not the Usage page.** Vercel *"displays all spend management
activity in the Activity section in your team dashboard sidebar… including spend amount creation and
updates, and project pausing and unpausing"*
([Spend Management](https://vercel.com/docs/spend-management), read 21 August 2026), so that is the one
place that says whether this is what happened; **Usage** says only how much was spent. Neither has a
CLI or an API this repository can call. **If Activity shows no pause, this is not the entry** — a
`503 DEPLOYMENT_PAUSED` also covers a failed payment or a policy action
([Vercel KB](https://vercel.com/kb/guide/why-is-my-account-deployment-blocked), read 16 August 2026),
which the billing page will say instead.

**Fix, two actions and the order matters.**

1. **Resume the project by hand.** *"Projects need to be resumed on an individual basis"*, and
   *"Projects won't automatically unpause if you increase the spend amount, you must resume each
   project manually"* ([Spend Management](https://vercel.com/docs/spend-management), read 21 August
   2026). One project here, `canoncore`, from the dashboard or the REST API's
   [unpause route](https://vercel.com/docs/rest-api/projects/unpause-a-project). **Raising the budget
   alone brings nothing back.**
2. **Then decide the budget.** The pause fired because on-demand spend reached $40 in this billing
   cycle, which is a spending decision rather than a runbook one. Resuming without changing it means
   the next check pauses again — and the checks run *"every few minutes"* (same page).

**What not to conclude from the timing.** The pause is not instantaneous: *"projects can keep serving
traffic and accruing usage for several minutes after you cross the spend amount"* (same page). A site
still up shortly after a 100% notification is not evidence the pause failed, and usage accrued in
those minutes is still billed.

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
3. **The credential, by hand.** [`infrastructure.md`](infrastructure.md) → *Where a Source
   credential lives* records the TMDB token as held on the `provider-tmdb` Vercel project since
   21 August 2026, so there is a key to try — but **nothing here consumes it yet**, because
   **CAN-101 Create the provider-tmdb repository, and give it the TMDB credential** has still to
   build the Provider that reads it. Whether the key still answers is the difference between (iv) and an
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

**Three ways the purge can end, plus the case where it never ran, and only one of the four is green.**
Read the log, never the exit code: three of these are red and one of the three means the duty is
already discharged. **Grep for the line** rather than reading from the top — the job's log opens with
`pnpm` and `node` output, so the purge's own first line is some way down it.

| Grep for | Exit | What it touched | Duty discharged? |
| --- | --- | --- | --- |
| `Purged Source` | 0 | Snapshots gone, the Stories it emptied are tombstones, the Source's own row taken with them | **Yes** |
| `PARTIAL PURGE of Source` | 1 | Snapshots gone and tombstones written, the Source's row **kept** | **No** — below |
| `Refusing to purge` | 1 | **Nothing whatsoever** | Below — it may already have been |
| None of those three | non-zero | Nothing committed — one transaction, so a failure part-way through rolls back | **No.** Treat it as owed |

Under whichever of those lines it printed, the run itemises what it removed. **A Story it emptied is
now a tombstone** — the identity, what kind of thing it was, and when it went, and no value any Source
supplied
([ADR-0014](adr/0014-shell-providers-and-per-source-retention.md) → *Decision 8*). Its own row is
gone, title included: today a title has no provenance to prove it was not the Source's, and a purge
that leaves one behind is not a purge.

**Its Versions and its containment go with it, and its Anchor stays.** The first two go by the
cascade on the `story` row rather than by any statement the purge makes, so the run does not itemise
them. What each of those tables is owed, and why the Anchor is the exception, is
`apps/web/src/db/purge-source.ts` → `howThePurgeTreatsEachTable`; `rls.test.ts` reads all three back
after a purge.

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

Two things about these queries rather than the queries themselves:

- **The application role would answer `0` whether or not it is true.** `snapshot` is behind a policy
  keyed on the Story's owner, so a count run as `canoncore_app` with no session user returns only
  rows belonging to public Stories — a false negative that reads exactly like proof. Anything with
  `BYPASSRLS` or the table owner is fine; the application role is not.
- **A non-zero `snapshot_rows` was already impossible**, because the command deletes the `source`
  row last and `snapshot.source_id` references it `on delete no action` — so the delete could only
  have succeeded with no Snapshot of it left anywhere. What the query adds is a check on rows written
  by something other than that command.

**If the run says `PARTIAL PURGE`, it did part of the job and named the rest.** It prints
`NOT REACHED:` and one or more table names, which means the schema has grown a table nothing has
classified — `supersededValue` and the audit payloads
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

**A refusal is not a failure, and it cannot tell you which of two things it is.** `Refusing to purge:
there is no Source with id …` means nothing was touched — and **not** that the purge did not happen. A
complete purge takes the `source` row with it, so re-dispatching one that already succeeded lands on
this exact error. The message says as much itself, because from inside the transaction the two are the
same fact. Before concluding you still owe the duty, look for an earlier run:

```bash
gh run list --workflow purge-source.yml --limit 5    # a green run here is a completed purge
gh run view <id> --log                               # which Source it was: the list cannot say
```

**A green run of this workflow is a completed purge, and nothing else can be green** — a partial purge
and a refusal both exit non-zero, so `success` in that list has exactly one meaning and you do not have
to open the log to know it happened. You do have to open it to know *which Source*: the workflow sets
no `run-name`, so every run is titled `Purge a Source` and the id appears only in the log.

If a green run purged this id, **that run is the record** and there is nothing left to do. If there is
none, the id was wrong — read it back from the `source` table and dispatch again. A typo and a
completed purge are indistinguishable from the error alone, and only the run history separates them.

**A red run in this workflow's history is not by itself evidence of a problem.** Its first one is a
refusal, dispatched deliberately on 17 August 2026 against an id that does not exist
([run 32019861146](https://github.com/jacobrees-canoncore/CanonCore/actions/runs/32019861146)), to
prove that the workflow, the secret, the runner and a live database connection work together. With no
`source` row in production there is nothing to purge, so a refusal is the only end-to-end check this
route has, and a red run was the only way to get it.

**Anything else red is owed, and the log says which.** None of these reach the purge, so nothing was
deleted and the clock is still running. Every line below was produced on purpose and read back rather
than reasoned about; a wrong *password* is deliberately absent, because the only PostgreSQL available
to try it on trusts local connections and answered anyway, so nothing here can say what production
would print:

| Grep for | What happened |
| --- | --- |
| `MIGRATION_DATABASE_URL is not set` | The Actions secret is missing or empty. It is write-only, so it cannot be read back — reissue it from Neon, with `sslmode=verify-full` ([`infrastructure.md`](infrastructure.md) → *The SSL mode every connection asks for*) |
| `Name the Source to purge` | Dispatched with an empty `source_id` |
| `Error: connect` | The database did not answer — `ECONNREFUSED` against a closed port, checked 17 August 2026. It is the same database as [The database does not answer](#the-database-does-not-answer), so **its second and third checks apply**: the Neon branch's compute, then Neon's status page. Its first does not — Vercel's runtime logs are a deployment's, and this runs on an Actions runner that never touches the application's connection code |
| None of the above | Read the run's own error line: it may have failed before the purge (the runner, the install) or inside it (a statement timeout, a dropped connection). **Either way nothing was committed** — the purge is one transaction, so a failure part-way through rolls back rather than leaving half a purge |

**And today there is nothing to purge.** No Provider serves anything yet — `provider-tmdb`'s
repository has existed since 21 August 2026 but carries only its CI baseline, with no deployment and
no contract behind it (**CAN-101 Create the provider-tmdb repository, and give it the TMDB
credential**) — nothing writes a `source` row, and no Snapshot has ever been fetched. This entry is
here so that the first time it is needed is not the first time it is written.

## What warns you before a pause

**Nothing here is a scheduled reading any more, and that is the change.** Until 21 August 2026 this
section asked for a weekly look at the Vercel Usage page, because on Hobby it was the only warning
that reached *you* rather than an inbox. Spend Management now does that job:

| Threshold | Reaches | Of what |
| --- | --- | --- |
| 50%, 75%, 100% | Web, e-mail and push | The **$40 on-demand budget** |
| 100% | **SMS, to the phone** | The same $40 budget |
| 100% | Pauses the production deployment | The same $40 budget |
| 75% | Web, e-mail and push | The **$20 monthly usage credit**, spent before on-demand billing starts |
| Past the credit | Daily and weekly summary e-mails | On-demand usage, once the credit is gone |

**Where each of those comes from.** The settings and figures are
[`infrastructure.md`](infrastructure.md) → *Hosting*; the thresholds and the behaviour are
[Spend Management](https://vercel.com/docs/spend-management) and
[Pro plan](https://vercel.com/docs/plans/pro-plan), both read 21 August 2026. **The channel columns are
not from either** — they are the per-type toggles, read off *My Notifications* on 21 August 2026.

**Do not reinstate the weekly reading.** It was deleted rather than shrunk, and why a habit is the
wrong answer once the instrumentation exists is
[ADR-0018](adr/0018-observability-sentry-and-an-uptime-monitor-outside-it.md) and
[ADR-0024](adr/0024-vercel-pro-for-a-spend-cap-rather-than-an-outage.md).

**SMS is the row that answers "does this reach me", and it is on.** Enabled 21 August 2026 against a
verified number. It fires at **100% only**, so it is the last warning rather than the first — but it
is the one that reaches a phone without depending on anything being installed, and **enabling it
proved the channel**, because the verification code arrived by SMS to that number.

**Push is on for every threshold above, and unproven.** It is **browser push, not an app**, and
*"opt-in per device"* ([notifications](https://vercel.com/docs/notifications), read 21 August 2026) —
so the ticked box only says you want the type, and no record exists of any device having accepted the
prompt. Until one has, read the 50% and 75% rows as e-mail and web only.

**The one thing a threshold cannot tell you.** It fires on *spend*, so it says nothing until money is
moving. The first sign of a bad deployment loop or a crawler is the 50% notification, which on a $40
budget is $20 — small enough that arriving late costs little, which is the whole point of setting the
budget below what would be tolerable.

**The database is covered by a different threshold, on the other vendor, and nothing pauses.** The
$40 bounds Vercel's metered resources and explicitly not Marketplace integrations, and Neon is one.
Since 21 August 2026 Neon's own **spending notification at $15** covers it instead:

| Threshold | Reaches | Of what |
| --- | --- | --- |
| 80%, 100% | E-mail, to the organisation's admins | The **$15 Neon spending threshold**, across `canoncore` *and* `waveger` |

**Read that row differently from the five above it.** Every Vercel row ends in something that
happens — a pause, an SMS. This one ends in an e-mail and nothing else. **There is no cap to reach
for**: Vercel's budget excludes Marketplace spend, its resource threshold is auto-recharge for
prepaid balances, and Neon's own consumption quota is refused outright for a Vercel-managed
organisation. [ADR-0026](adr/0026-the-database-bill-is-watched-rather-than-capped.md) has all three
refusals with the response each gives.

**So if this one fires, nothing is protecting you and the spend continues.** What to do is a
spending decision rather than a runbook one, but the two levers that actually move the figure are
the compute floor and how often anything asks the database a question —
[`infrastructure.md`](infrastructure.md) → *Database* holds both, and the second is the one that
caused the bill this threshold was bought to watch.
