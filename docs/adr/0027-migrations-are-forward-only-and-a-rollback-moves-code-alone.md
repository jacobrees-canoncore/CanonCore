---
status: accepted
---

# Migrations are forward-only, and a rollback moves code alone

**Code and schema come back by different routes, and only one of them comes back at all.** A bad
release is recovered by pointing the production domain at the previous deployment — Vercel's
*Instant Rollback*, which this repository has now run against production and measured. **The schema
is never rolled back.** There are no down-migrations, there will be none, and the rule that makes
that safe is the one this repository already applies for a different reason: **every migration must
leave the schema able to serve the previous release's code.**

Decided and measured on 21 August 2026 by
[CAN-148 Say how a bad release is rolled back, and decide whether the schema can be](https://linear.app/jacobrees-canoncore/issue/CAN-148).
The procedure is [`docs/runbook.md`](../runbook.md) → *A release is bad*; this file holds why. The
release order it recovers from is [ADR-0019](0019-ci-owns-the-production-release.md).

**One of the ticket's premises was already stale, and it is the one that matters here.** It records
`apps/web/drizzle` as holding *"`0000`, `0001`, `0002` and no down-migrations"*. The absence of
down-migrations is right; the count is not. There are fourteen, `0000` to `0013`, and `0013` is a
`SET NOT NULL` — so the repository had already shipped a narrowing to production before anybody asked
whether a narrowing could be rolled back. That makes this decision a description of what is already
being done as much as a constraint on what comes next.

## Contents

- [Two problems that look like one](#two-problems-that-look-like-one)
- [Instant Rollback reaches a deployment Actions promoted, and this was measured rather than assumed](#instant-rollback-reaches-a-deployment-actions-promoted-and-this-was-measured-rather-than-assumed)
- [Why the schema is not rolled back](#why-the-schema-is-not-rolled-back)
- [The invariant, which is the rule this repository already has](#the-invariant-which-is-the-rule-this-repository-already-has)
- [What this costs](#what-this-costs)
- [What will try to reopen it](#what-will-try-to-reopen-it)
- [Consequences](#consequences)

## Two problems that look like one

"Get back to the last good release" is two questions with different answers, and treating them as
one is how a rollback turns an outage into data loss.

**Code is a pointer.** A Vercel deployment is an immutable build, and production is whichever one the
domain is aliased to. Moving that alias back is cheap, instant and lossless, because the old build
was never destroyed.

**Schema is not a pointer.** A migration mutates one database in place. Going back means either a
statement that undoes it — which cannot restore what the forward statement destroyed — or replacing
the database wholesale from a point in time, which discards every row written since.

So the recovery that exists is the first one, and the whole design problem is making sure the first
one is *enough*: that rolling the code back never lands old code on a schema it cannot serve.

## Instant Rollback reaches a deployment Actions promoted, and this was measured rather than assumed

[ADR-0019](0019-ci-owns-the-production-release.md) turns Vercel's Git integration off for `main` and
promotes from Actions instead, so the first question was whether the dashboard's ordinary rollback
affordance applies to a deployment that no Git push produced. **It does, and eligibility has nothing
to do with Git.**

> "Deployments previously aliased to a production domain are eligible for Instant Rollback.
> Deployments that have never been aliased to production a domain, e.g., most preview deployments,
> are not eligible."
> — [Instant Rollback](https://vercel.com/docs/instant-rollback), read 21 August 2026

The criterion is *having served production*, which is exactly what `vercel deploy --prebuilt --prod`
makes a deployment do — and Vercel's own API agrees on this project's own deployments
([incident](../incidents.md#a-rollback-turns-off-auto-assignment-of-production-domains)). The plan
matters too — *"For teams on a Pro or Enterprise plan, all deployments previously aliased to a
production domain are eligible to roll back. Hobby users can roll back to the immediately previous
deployment"* (same page) — and this project is on Pro
([ADR-0024](0024-vercel-pro-for-a-spend-cap-rather-than-an-outage.md)).

**Then it was run, because nothing here had ever run it**, and reading the documentation would not
have been enough: the run found that a rollback turns the project's auto-assignment of production
domains off, which Vercel documents only in terms of *"new pushes to your production branch"* — a
path this project does not have. The evidence, the identifiers and the two CLI traps it also settled
are [`docs/incidents.md`](../incidents.md) →
*A rollback turns off auto-assignment of production domains*, and the check it produced is the
runbook's.

## Why the schema is not rolled back

**Drizzle does not offer it.** `drizzle-kit@0.31.10`, the version installed here, exposes `generate`,
`migrate`, `introspect`, `push`, `studio`, `up`, `check`, `drop` and `export`, and none of them
reverses an applied migration — read off `drizzle-kit --help` on 21 August 2026. `migrate` is
forward by construction — it *"pick[s] previously unapplied migrations"* and applies them — and that
page does not mention reversing one anywhere
([Drizzle, migrations](https://orm.drizzle.team/docs/migrations), read 21 August 2026). **`drop` is
not the exception its name suggests**, and Drizzle says so by where it files it: v1 removes the
command alongside *"removing journal.json, grouping SQL files and snapshots into separate migration
folders"*, changes whose stated benefit is to *"eliminate potential Git conflicts with the journal
file and simplify the process of dropping or fixing conflicted migrations"*
([v1beta2](https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v1beta2), read 21 August 2026).
That is migration-folder housekeeping. Whatever else it does, **it is not a statement that reverses
an applied migration**, and no command in this version is.

**Writing them by hand was the real alternative, and it loses on the case that matters.** A down
migration is only ever needed for a narrowing, and a narrowing is exactly where the reverse statement
cannot be honest: the `down` for `DROP COLUMN` recreates the column empty, and the `down` for
`SET NOT NULL` cannot know which rows were null. It restores the *shape* and calls it a restore. That
is worse than having nothing, because it reports success.

**What actually puts a schema back is Neon's branch restore, and its price is the rest of the
database.** *"Everything on your current branch, data and schema, is replaced with the contents from
the historical source"* ([branch restore](https://neon.com/docs/guides/branch-restore), read 16
August 2026). [`docs/runbook.md`](../runbook.md) → *The database does not answer* already names it as
the fix for a bad migration and refuses it for anything else, and this decision does not soften
that: it is the last resort, it loses every row written since the restore point, and it is not a
rollback.

## The invariant, which is the rule this repository already has

**Every migration must leave the schema able to serve the previous release's code.**

This is not a new tax. [`docs/agents/workflow.md`](../agents/workflow.md) → *What a merge carries*
already requires it, for a different reason: the release migrates before it promotes, so between
those two steps the *previous* release's code is serving requests against the *new* schema. A
migration that breaks old code breaks production during that window whether anybody rolls back or
not.

What this ADR adds is the second consequence of the same rule. The deploy window is minutes long and
closes by itself; a rollback re-opens it deliberately and leaves it open. **So the rule that was
already there for the window is what makes a code rollback safe, and it now has two reasons instead
of one.**

The shape it produces is expand, backfill, contract, and this repository has already done it once.
`story.anchor_id` arrives nullable in migration `0010`, is backfilled in `0012`, and is made
`NOT NULL` in `0013` — three migrations for one column, and
[`0012`](../../apps/web/drizzle/0012_anchors_and_the_founding_storys_catalogue.sql) says in its own
header why the middle one has to exist.

**One honest caveat about that example.** All three landed in a single release, `d68ad10`, which the
invariant permits only because the application role cannot write to `story`: migration `0005` revoked
its `INSERT`, `UPDATE` and `DELETE`, and `0011` granted back nothing but the Anchor mint. The
previous release's code could not have violated a `NOT NULL` it never inserted into. That is where
the product happens to be rather than a property of the design, and **the first narrowing on a table
the application writes will cost the extra release that one did not.**

## What this costs

- **A narrowing takes two releases once the application writes to the table.** The widening ships,
  then the narrowing ships after it, and *What a merge carries* already says to file the second as
  its own ticket before the first lands.
- **The rollback guarantee is one release deep, not arbitrary.** Pro offers any previously-aliased
  deployment, and the invariant only promises the immediately previous one. Going further back is a
  judgement, and the runbook says how to make it.
- **A bad migration has no fast recovery, and this decision does not give it one.** Forward fix, or
  a branch restore that loses rows. Stating that plainly is the point; the alternative is a
  procedure that pretends otherwise.
- **This is a prose rule with no gate behind it.** A static check of the SQL cannot tell a legitimate
  narrowing from a premature one, because the difference is whether the previous release's *code*
  still needs the shape — which is not in the migration file. So the enforcement is review, and
  [`CODING_STANDARDS.md`](../../CODING_STANDARDS.md) carries it so a reviewer's default heuristics do
  not miss it.

## What will try to reopen it

- **Every migration tool's own documentation**, most of which treats `up`/`down` pairs as the normal
  shape and their absence as a gap. Drizzle's does not offer down migrations at all, so the
  suggestion arrives from habit and from every other tool rather than from the one installed here —
  which makes it easier to act on unchallenged, not harder.
- **The first bad migration.** At that moment a down-migration looks exactly like the thing that
  would have helped, and it would not have been: see the two examples above.
- **The Vercel dashboard's Instant Rollback button**, which is one click and says nothing about
  databases beyond *"a reminder about the changing behavior of external APIs, databases, and CMSes"*
  in its own confirmation dialog. It is the right button; it is not the whole recovery.
- **What would actually reopen it**: a schema change large enough that the two-release shape is
  genuinely impractical, at which point the answer is still not a down migration — it is a planned
  maintenance window with a backup taken deliberately in front of it.

## Consequences

- **`apps/web/drizzle` is append-only.** An applied migration is never edited and never deleted, and
  a mistake in one is corrected by the next.
- **A rollback restores the code and nothing else.** Rows written by the bad release stay written,
  and environment variables changed since the target was built do not come back with it — Vercel is
  explicit that *"the configuration used for the rolled-back deployment may become stale"*
  ([Instant Rollback](https://vercel.com/docs/instant-rollback), read 21 August 2026).
- **A pull request whose diff adds a narrowing says so in its body**, and says which release stopped
  needing the old shape. It joins the list of things *What a merge carries* requires to be disclosed
  rather than inferred.
- **The runbook owns the procedure and its limits**, including what a rollback cannot recover. A
  procedure that overstates its reach is worse than none, which is why that section exists rather
  than being left implied.
