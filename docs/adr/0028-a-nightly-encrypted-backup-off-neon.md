---
status: accepted
---

# A nightly encrypted backup off Neon, which the job that takes it cannot read

**Neon's history window covers a mistake. It does not cover losing the account the window is inside.**
That sentence is the whole of what this decision rests on, and it is what is left of
[CAN-55 Keep a backup that reaches past Neon's 24-hour history window](https://linear.app/jacobrees-canoncore/issue/CAN-55)
after triage twice found its premise wrong.

So two things were done rather than one. **The window was widened from 24 hours to 7 days**, which
is a setting and covers the overnight case the ticket was written for completely. And **a nightly
`pg_dump` is encrypted and stored outside Neon**, which is the only thing that survives the account
itself going away.

Decided and applied on 21 August 2026. The settings, the store and the dates they were read live in
[`docs/infrastructure.md`](../infrastructure.md) → *Backups*; what to do when a restore is actually
needed is [`docs/runbook.md`](../runbook.md) → *The database has to be restored from a backup*. This
file holds why.

## Contents

- [The ticket's premise was wrong twice, and the correction is most of the design](#the-tickets-premise-was-wrong-twice-and-the-correction-is-most-of-the-design)
- [What 7 days of history costs, and what has not been measured](#what-7-days-of-history-costs-and-what-has-not-been-measured)
- [The backup is not a GitHub artifact, and that was proved rather than assumed](#the-backup-is-not-a-github-artifact-and-that-was-proved-rather-than-assumed)
- [Vercel Blob, private, and the vendor concentration it accepts](#vercel-blob-private-and-the-vendor-concentration-it-accepts)
- [The job cannot read what it writes](#the-job-cannot-read-what-it-writes)
- [How a backup that stops is noticed](#how-a-backup-that-stops-is-noticed)
- [What was rejected](#what-was-rejected)
- [What will try to reopen it](#what-will-try-to-reopen-it)
- [Consequences](#consequences)

## The ticket's premise was wrong twice, and the correction is most of the design

CAN-55 was written against the **Free** plan: a six-hour restore window, a 0.5 GB ceiling and a
project that is *"suspended rather than billed"* when it is exceeded. This project is on **Launch**,
and none of those three numbers applies to it. Triage caught it on 17 August 2026 and again on
21 August, and the corrected acceptance criteria are what was built.

**Read live from the Neon API on 21 August 2026** for project `steep-wave-52467839`:
`history_retention_seconds` was `86400`, and a `PATCH` set it to `604800`, which a fresh `GET` read
back. That is **24 hours becoming 7 days**, which is Launch's maximum — *"Up to 7 days"*
([Neon plans](https://neon.com/docs/introduction/plans), read 21 August 2026).

**What that leaves is one risk, and it is the one a longer window never reaches.** A bad migration
at 23:00 found at 09:00 is inside 7 days by a wide margin. An account suspended, a payment that
fails, a provider that goes away, a console session that deletes the wrong project: every one of
those takes the history window with it, because the window is a feature of the thing that is gone.
**CAN-29 Author the Doctor Who in-universe chronology in production** is what makes that matter now:
roughly thirty hand-authored Arguments that cannot be regenerated from TMDB or from anywhere else,
and this had to land before them.

## What 7 days of history costs, and what has not been measured

**The rate is $0.20/GB-month**, against $0.35/GB-month for the data itself, and *"only root branches
contribute to instant restore storage charges; child branches do not add to this cost"*
([Neon plans](https://neon.com/docs/introduction/plans), read 21 August 2026). This project has two
root branches, `main` and `preview`, whose logical sizes were **31,694,848** and **31,621,120 bytes**
on 21 August 2026 — 63 MB between them. Every worktree database is a child of `preview` and
contributes nothing to this line.

**What is billed is the write history retained inside the window, and this project barely writes.**
The API reported `written_data_bytes: 0` for the project across the current billing period. Seven
days of a write rate near zero is a small fraction of a gigabyte, so the change is worth pennies a
month against a database line that was $26.48 in August.

**The exact figure has not been read, and saying so is the point.** The consumption endpoint that
would give it is organisation-scoped, and the key this project holds is scoped to the project — it
answers *"not allowed to perform actions outside the project this key is scoped to"*, checked on
21 August 2026. So the first true reading is the next bill. What would catch this being wrong is
already in place and is not a projection: the **$15 spending notification**
([`docs/infrastructure.md`](../infrastructure.md) → *Database*), which sits below the $24 platform
fee on purpose.

## The backup is not a GitHub artifact, and that was proved rather than assumed

The cheapest possible answer is `actions/upload-artifact` with `retention-days: 30`. It needs no
vendor, no credential and no store. **It is also wrong here, and the reason is that this repository
is public.**

**Measured on 21 August 2026 rather than reasoned about.** An unauthenticated download of a live
artifact from a public repository answers `401`. But signed in as `jacobdrees`, an account with no
relationship to `denoland/deno` and no permission on it beyond being able to read a public
repository, `GET /repos/denoland/deno/actions/artifacts/9454962644/zip` answers **`200` and 27,313
bytes**. Read access to a public repository is read access to its artifacts, and everybody has read
access to a public repository.

A database dump holds every e-mail address, every scrypt password hash in `account`, and every row
anybody has authored. Encryption would make an artifact survivable rather than safe, and publishing
ciphertext to anyone with a GitHub account is not a thing to do when the alternative costs nothing.

## Vercel Blob, private, and the vendor concentration it accepts

The store is a **private Vercel Blob store** in `lhr1`. Three reasons, and one accepted cost.

- **It is not Neon**, which is the entire requirement. The risk being insured against is losing the
  Neon account; a store on Vercel is outside it.
- **It needs no new vendor, and no integration.** A read-write token is a plain credential, so
  [ADR-0016](0016-provisioning-plain-api-keys-neon-excepted.md)'s test is passed rather than
  argued: nothing here needs a platform to know about a deployment.
- **It is inside the only spend cap this project has.** Blob is Vercel's own usage, so it is covered
  by the $40 Spend Management budget that [ADR-0026](0026-the-database-bill-is-watched-rather-than-capped.md)
  records as excluding the Marketplace — and it is *free* in practice: Pro includes 5 GB of storage
  and 10,000 advanced operations, against 30 files of a few megabytes and a handful of operations a
  night ([Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing), read 21 August 2026).
  The register carries the figure and what bounds it rather than a count, because a multipart upload
  bills one operation per part.

**Private is a property of the store and cannot be changed afterwards** — *"you cannot change it
after the creation of a blob store"* ([Vercel Blob](https://vercel.com/docs/vercel-blob), read
21 August 2026) — so it was created that way rather than tightened later. **The refusal was checked
rather than trusted**: a `GET` of a stored blob's own URL with no credential answers `403 Forbidden`,
and the same object reads back with the token.

**The cost is vendor concentration, and it is stated rather than hidden.** Losing the Vercel account
loses the site and the backup together. That is a smaller risk than the one being closed — the data
here is irreplaceable and the deployment is not, and a Vercel account with a card on it is not the
account most likely to go — but a second copy somewhere else is the obvious upgrade, and *What will
try to reopen it* below says what would earn it.

## The job cannot read what it writes

Backups are encrypted with **age**, to a recipient committed in this repository at
[`scripts/backup-recipient.txt`](../../scripts/backup-recipient.txt). The identity that opens one is
on Jacob's machine and in no secret, no variable and no deployment.

**So the workflow can write a backup and delete an expired one, and cannot read a single row of
anybody's data.** A credential lifted out of the nightly job buys the ability to add files to a
store and to remove old ones. That is a strictly smaller thing to lose than a job that could decrypt
its own history, and it costs nothing: nothing in CI has any reason to read a backup.

**X25519 rather than the post-quantum hybrid the same library also offers**, deliberately. `age`'s
own reference binary reads an X25519 identity, and a backup has to be openable by whatever tool
exists on the day it is needed rather than only by the npm package that wrote it. The library's own
documentation warns that its default `generateIdentity` *"may return a post-quantum hybrid
identity"* in future, which is exactly why the generating call is named rather than left to a
default — in [`docs/infrastructure.md`](../infrastructure.md) → *Backups*, which carries the command
that made this keypair and would make its replacement. **No committed code generates one**: it has
happened once, and a script for it would be a file nothing runs between now and the day the key is
compromised.

**The other half of that decision is that losing the identity loses every backup**, and no amount of
storage redundancy helps. The mitigation is not technical: the identity has to exist somewhere other
than one laptop, and [`docs/infrastructure.md`](../infrastructure.md) → *Backups* carries that as a
step with a name against it rather than as advice.

## How a backup that stops is noticed

*"A backup job that fails silently is worse than none, because it is believed"* is CAN-55's own
criterion, and it needs more than a job that exits non-zero, because **the ways a nightly job stops
are mostly not failures**.

- **A run that fails** turns the job red and GitHub notifies somebody — but *which* somebody is a
  rule worth having right, because this repository already records the general form of it as
  reaching *"whoever triggered the run and nobody else"*
  ([`docs/infrastructure.md`](../infrastructure.md) → *Where a Provider's failure surfaces*), and a
  cron run has no human trigger. **Scheduled runs have their own rule**: notifications go to the
  person who set the schedule up, and *"if a different user updates the cron syntax, in the
  `schedule` event in the workflow file, subsequent notifications will be sent to that user
  instead"* — and re-enabling a disabled schedule moves them again, to whoever re-enabled it
  ([notifications for workflow runs](https://docs.github.com/en/actions/concepts/workflows-and-actions/notifications-for-workflow-runs),
  read 21 August 2026). Here that resolves to Jacob, who is the only committer.
  **It has not been watched arriving**, and this repository has been wrong about a notification
  route before — a failing check was watched reaching the phone and a recovering one never was
  ([`docs/incidents.md`](../incidents.md#a-failing-check-reaches-the-phone-a-recovering-one-may-not)).
  Two real failures on 21 August went red without anyone checking an inbox. **So the honest
  position is that the red run is certain and the mail is inferred**, which is the half of "fails
  loudly" this design does not rest on.
- **A run that never happens** sends nothing. GitHub disables a scheduled workflow *"when no
  repository activity has occurred in 60 days"* in a public repository, and *"this event will only
  trigger a workflow run if the workflow file exists on the default branch"*
  ([events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows),
  read 21 August 2026) — so an edit that has not merged changes nothing while reading as though it
  had.
- **A run that succeeds on an empty dump** is the worst of the three, and is refused twice: pg_dump
  *"will set row_security to off … If the user does not have sufficient privileges to bypass row
  security, then an error is thrown"*
  ([pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html), read 21 August 2026), and the job
  then compares every table `pg_class` reports against the dump's own table of contents.

**So the question "is there a recent backup?" is asked from outside the job**, by
`scripts/check-docs.ts` on every push, against the store itself. That is the same shape as every
other check in that file — a document's claim compared to the source that could contradict it — and
here the document is the specification: the register promises a schedule and a retention, and the
workflow, the code and the store are each compared to what it promises rather than to one another.

**The history window is checked too, and it was nearly not.** A backup is a system somebody would
notice breaking; a retention setting is one number in a console that nothing would ever read again.
This ticket's own triage said so while it was still being argued — *"If option one is taken,
something should assert the window is what it is supposed to be, for the same reason"* — and the
corrected criteria dropped it. `check-docs.ts` reads Neon's `history_retention_seconds` and compares
it with the register. **Locally only**, because the Neon key can create and destroy databases and is
deliberately on no runner.

**It gates on a push rather than on a clock, and that is a real limit.** Nothing checks freshness on
a week when nothing is pushed. Closing that properly needs a monitor with a heartbeat, and the
UptimeRobot account has an unresolved monitor count with two monitors already wanted
([`docs/infrastructure.md`](../infrastructure.md) → *Uptime monitoring: UptimeRobot*), so this is
deliberately not the ticket that spends that slot.

## What was rejected

- **Extending the history window and stopping there.** It is cheap and it covers the overnight case,
  and it is the same account. Both were done rather than one.
- **A GitHub Actions artifact.** Measured above: readable by anyone with a GitHub account.
- **Cloudflare R2 or Backblaze B2.** Either is a genuinely independent third vendor and would insure
  against losing Vercel as well as Neon. Each costs a new account with a card on it, a new pair of
  credentials in the roster, and a vendor nothing else on this estate uses. Refused for now on the
  ground that the risk the ticket names is Neon's, not Vercel's — see *What will try to reopen it*.
- **A fourth database role for backups.** A role with `SELECT` and no policy dumps the schema and
  none of the rows, and pg_dump errors rather than doing it — so the choice is between a role with
  `BYPASSRLS`, which ADR-0005 rule 1 exists to prevent, and the migration role, which owns every
  table and therefore bypasses row security by ownership. The migration role is the one that already
  exists ([`docs/infrastructure.md`](../infrastructure.md) → *Roles*).
- **A symmetric passphrase in an Actions secret.** One secret instead of a keypair, and it would let
  the job decrypt its own history. The keypair costs one committed public key.
- **Neon's own manual snapshot.** It is inside the account, which is the thing being insured against.

## What will try to reopen it

- **"Neon has backups."** It has an instant-restore window, now 7 days, and it is inside the
  account. Every suggestion that this is redundant is a suggestion to delete the only copy that
  survives losing the provider.
- **"Just use `actions/upload-artifact`."** Every tool will offer it, because it is one line and it
  is free. This repository is public — the measurement is above, and it is the reason.
- **A tool offering to connect the blob store to the `canoncore` project.** The dashboard offers it,
  and the CLI's `--yes` does it by default. The store is deliberately connected to nothing: a
  connection writes `BLOB_READ_WRITE_TOKEN` into the project's environments, which would hand the
  running application a credential that can delete every backup, for no reader.
- **A second copy at a third vendor.** This is the upgrade, not a reopening, and what would earn it
  is either the data becoming valuable enough that losing Vercel is intolerable, or an incident that
  makes the concentration concrete. It does not need a new decision, only a new store and one more
  step in the same script.
- **Restoring production with `pg_restore` because a table looks wrong.** The in-window answer is
  Neon's branch restore, and it *"completely overwrites"* the branch. Both are destructive and the
  runbook orders them.

## Consequences

- **Two credentials exist that did not**: a read-write token for the store, in an Actions secret and
  on the machine, and an age identity on the machine alone. Neither is in any deployment.
- **The nightly job holds the migration role's connection string**, which is the credential that can
  drop every table it is backing up. It was already in this repository's Actions secrets for the
  release, and this is a second consumer rather than a new exposure.
- **`scripts/check-docs.ts` now reads a store**, so it carries a thirteenth check that skips without
  the token — and CI holds a token that can delete backups. That is argued where it is granted: a
  compromised run of that job already holds the migration credential and an account-scoped Vercel
  token, so it adds nothing to the blast radius and buys the only detector of a schedule that stopped.
- **A restore is a human action on a machine**, because the identity is. Nothing automated can
  perform one, including anything that has taken over CI.
- **The backup holds personal data with a 30-day life**, which no document currently describes to a
  reader. There is no privacy notice yet — **CAN-30 GDPR export and erasure** owns writing one, and
  this window is a retention claim it will have to carry.
