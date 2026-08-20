---
status: accepted
---

# A third database role, for better-auth

**better-auth connects to Postgres as `canoncore_auth`, a third role, and not as the role the
application connects as.** It holds all four DML privileges on the five tables better-auth owns the
behaviour of — `user`, `session`, `account`, `verification`, `rate_limit` — and **no privilege at all**
on `story`, `source`, `snapshot` or `tombstone`. `canoncore_app` is granted nothing on the five.

Settled 17 August 2026 under **CAN-24 A signed-in and a signed-out path**, which is the change that
first needed an identity at all.

**This is not a relaxation of [ADR-0005](0005-stack.md) rule 1.** That rule is about the role *the
application* connects as, and this leaves it exactly as it was: `canoncore_app` holds `SELECT` and
nothing else, has no `BYPASSRLS`, and reads every row through a policy. `canoncore_auth` has no
`BYPASSRLS` either. *(Corrected 20 August 2026 by CAN-25 The catalogue: Version, part of, Anchor,
canonical version: that role now also holds `INSERT` on `anchor` and on nothing else — a decision
that ticket took and migration 0011 argues, and one this ADR's claim does not rest on. It still has
no `BYPASSRLS`, still reads every row through a policy, and still reaches none of the five tables
below.)*

## Contents

- [Why the application's role cannot do it](#why-the-applications-role-cannot-do-it)
- [The three designs this rules out](#the-three-designs-this-rules-out)
- [What bounds the new role](#what-bounds-the-new-role)
- [Why `canoncore_app` is granted nothing, rather than read-only](#why-canoncore_app-is-granted-nothing-rather-than-read-only)
- [What will try to reopen this](#what-will-try-to-reopen-this)

## Why the application's role cannot do it

Rule 3 of ADR-0005 puts every application read inside a transaction that first sets
`canoncore.user_id`, and every policy in `apps/web/src/db/schema.ts` is keyed on that setting. **The
thing that authenticates cannot be constrained by the identity it is establishing**, and better-auth
needs three reads that no such policy can permit:

- **`getSession`** is handed a session *token* from a cookie and must find the row bearing it. Which
  user that is, is the answer — so it cannot also be the question.
- **Signing in** is handed an *email* and must find the `user` row carrying it, with no session set at
  all. Under a policy keyed on the session user that read returns nothing, which is indistinguishable
  from a wrong password.
- **Signing up** must ask whether *anybody* already holds that email. That is a cross-tenant read by
  construction, and it is also better-auth's enumeration protection.

## The three designs this rules out

Each was considered and each is worse. They are recorded because each will look like the cheap answer
to somebody who has not hit the reads above.

**1. Give `canoncore_app` the five tables with no policy over them.** The cheapest to write and the
worst outcome: row-level security is off until a policy turns it on, so the role every page runs as
would hold a table of email addresses and scrypt password hashes **readable in full**. That is the
failure [`docs/infrastructure.md`](../infrastructure.md) → *Roles* already records once, where a
default privilege gave the application role writes on every table and nothing in any file said so.

**2. Key the policies on the session token instead of the user.** Makes the policy satisfiable by
anyone holding a token, which is the thing a session token is. It also does not solve sign-in, which
has no token yet.

**3. Add a second session setting the application flips to mean "trust me".** A `BYPASSRLS` with extra
steps, in the one variable rule 3 rests on — and reachable from any code path that can call
`set_config`.

## What bounds the new role

**Written down, rather than a property of the server.** Two mechanisms, and both are needed because
each covers what the other cannot:

| | What it does | What it cannot do |
| --- | --- | --- |
| A policy naming `canoncore_auth`, on each of the five | Turns row-level security **on** for the table, which is what stops it being readable in full by whoever is granted it next | Nothing, on a table it does not name |
| No grant at all on any product table | Refuses every statement, loudly | — |

**The absent grant is the load-bearing half, and it is easy to get wrong.** `canoncore_auth` has no
policy on `story`, `version`, `part_of`, `anchor`, `source`, `snapshot` or `tombstone` — four of them
when this was written, seven since **CAN-25 The catalogue: Version, part of, Anchor, canonical
version** — so a *read* returns nothing on any of them, but a **write would succeed**, because no
policy at all is not the same as a restrictive one and there is no `FOR INSERT` policy to refuse it.
Only the missing privilege stops it. That is why migration 0009
grants one table at a time rather than `ON ALL TABLES IN SCHEMA public`.

`apps/web/src/db/rls.test.ts` asserts the whole matrix for both roles, over every table, in both
directions. A grant added to any blank cell fails a test rather than passing unnoticed.

## Why `canoncore_app` is granted nothing, rather than read-only

The first draft of migration 0009 gave `canoncore_app` `SELECT` on `user` and `session` under a policy
keyed on the session user, so that a cross-tenant read test had something to exercise. **A review asked
what read those tables, and the answer was nothing**: pages read Stories, and `apps/web/src/auth/viewer.ts`
resolves the cookie through the auth role. The grant existed to make a test runnable, which is a
production privilege bought for a test.

**The refusal is stronger as well as cheaper.** `permission denied for table "user"` is a loud error,
where a policy returning no rows is indistinguishable from an empty table — and that silence is the whole
of what ADR-0005 rule 2 is about. So the tenant question on these tables is answered by a refusal, and
`account` is the sharpest case of it, holding the password hash.

**Row-level security is on for all five regardless**, because a policy is what turns it on and migration
0008 wrote one per table. So the first real reader can add a grant knowing that without a matching policy
it reads zero rows rather than everything. That reader is
**CAN-57 Make a public Ordering discoverable and shareable**, which needs an author attribution, and it
brings its own grant, policy and cross-tenant test.

## What will try to reopen this

- **Every better-auth example, and every adapter tutorial**, passes one connection. Nothing in the
  library knows or cares that this project has two, so no error will ever point at it.
- **"Just let the app read `user`"**, the moment a page wants to show a name. It is a real need and the
  answer is a grant *plus* a policy *plus* a cross-tenant test, landed together, not a grant on its own.
- **A blanket grant in a migration.** `ON ALL TABLES IN SCHEMA public` reads as tidier and hands
  `canoncore_auth` the catalogue.
- **A default privilege**, which would arm every future table for the role whose whole bound is that it
  reaches five named ones. `apps/web/src/db/roles.sql` says why none exists and why it is not the file
  to add one to.
- **Collapsing the roles to save a Vercel variable.** The two `DATABASE_AUTH_*` values and the composed
  connection string are the price; `apps/web/src/db/database-url.ts` composes the second string from the
  first so the two roles cannot end up pointed at different databases.
