# Infrastructure

Provisioned by CAN-18 on 10 August 2026. Everything here is fact, not intent.

## The production URL is `https://www.canoncore.com`

The apex `canoncore.com` serves a **301** to it. This is the URL that
[CAN-24](https://linear.app/jacobrees-canoncore/issue/CAN-24) (better-auth base URL and cookie
domain), [CAN-31](https://linear.app/jacobrees-canoncore/issue/CAN-31) (absolute links in
verification and reset emails) and [CAN-21](https://linear.app/jacobrees-canoncore/issue/CAN-21)
(terms of service) must bake in.

`www` is canonical rather than the apex so the session cookie stays host-only. The reasoning, what
was weighed against it, and what will try to reopen it are in
[ADR-0010](adr/0010-canonical-host-www.md). This file records only that it is provisioned that way.

## Hosting

| | |
| --- | --- |
| Vercel account | `jacobreesnew-7380's projects` (Hobby, user `jacobreesvercel`) |
| Project | `canoncore`, `prj_BMzP9Dq7Qx3Eev8WwsvVoH5khnaU` |
| Repository | `jacobrees-canoncore/CanonCore`, production branch `main` |
| Function region | `lhr1` (London) |
| Preview protection | Off. Preview URLs are public. |

**The repository is public.** Creating the project against the private repo failed with
`repo_owned_by_org`: *“The repository CanonCore is private and owned by an organisation, which is
not supported on the Hobby plan.”* That is an observed API response, not a documented policy; Vercel
does not publish this restriction. The repo already carried an MIT licence, so making it public was
chosen over upgrading to Pro.

Hobby "restricts users to non-commercial, personal use only"
([Vercel Hobby plan](https://vercel.com/docs/plans/hobby), citing the
[fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage)). v1 is a
public service carrying a terms of service, so the plan remains worth revisiting before launch — see
the note on CAN-18.

The Vercel GitHub App is installed on `jacobrees-canoncore` scoped to this one repository.

**There is no one-organisation limit.** Observed, rather than looked up: installing on
`jacobrees-canoncore` left the existing `jacobrees-waveger` installation untouched, and Vercel's
`/v1/integrations/git-namespaces` then returned both namespaces at once. Whatever the `gitOrgLimit=1`
parameter in Vercel's import URL controls, it is therefore not an account-level cap. Waveger was
never at risk.

## Database

| | |
| --- | --- |
| Provider | Neon, via the Vercel-managed marketplace integration |
| Neon project | `steep-wave-52467839`, resource `store_ft1xdGxeaZQCEbN7` |
| Production branch | `main` (Neon's default branch, and the only one so far). Note it shares a name with the repository's `main` and is a different thing. |
| Region | `eu-west-2` (London) |
| Plan | Launch, billed through Vercel |
| Neon Auth | **Disabled.** ADR-0005 settled on better-auth; the integration would otherwise provision a competing auth system. |

The integration's own variables are written under a `NEON_` prefix, which deliberately leaves
`DATABASE_URL` free for us. Do not remove the prefix: unprefixed, the integration owns
`DATABASE_URL` and fills it with the **owner** role, which ADR-0005 rule 1 forbids.

### Roles

Neon's `neondb_owner` has `rolbypassrls = true` and is therefore never the application role.

| Role | Purpose | `rolbypassrls` |
| --- | --- | --- |
| `canoncore_migrator` | Owns every table it creates. Runs migrations. | `false` |
| `canoncore_app` | The application connects as this and nothing else. | `false` |

Both were verified against `pg_roles` rather than assumed, and proven end to end: the application
role sees zero rows through a table with RLS enabled and no policy, and cannot create tables
(`permission denied for schema public`). Table ownership sits with the migration role on purpose:
*"Table owners normally bypass row security as well, though a table owner can choose to be subject to
row security with `ALTER TABLE ... FORCE ROW LEVEL SECURITY`"*
([PostgreSQL, Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)).
The same page is why `neondb_owner` is disqualified: *"Superusers and roles with the `BYPASSRLS`
attribute always bypass the row security system."*

### Where the credentials live

| Secret | Location |
| --- | --- |
| `DATABASE_URL` | Vercel env, **production only**, application role |
| `DATABASE_APP_USER` / `DATABASE_APP_PASSWORD` | Vercel env, production and preview |
| `MIGRATION_DATABASE_URL` | GitHub Actions secret on the repo, migration role |

`DATABASE_URL` is production-only on purpose. Each preview deployment gets its own Neon branch on a
**different host**, so a static connection string would silently point previews at production data.
Previews compose their URL at runtime from the injected `NEON_PGHOST` plus `DATABASE_APP_USER` and
`DATABASE_APP_PASSWORD`.

**This departs from CAN-18 as written.** That ticket asked for "the application role's connection
string is a Vercel environment variable for production **and preview**". Taken literally it is
unsatisfiable: a single static string cannot address a per-deployment branch on a host that does not
exist when the variable is set, and setting one would have pointed previews at production data —
which the very next criterion forbids. The criterion was met in substance, by a different mechanism,
rather than to the letter.

> **Unverified, and it gates that design.** This assumes a Neon branch inherits role passwords from
> its parent. It has not been tested, because testing it needs a real preview deployment. Confirm it
> in CAN-22 before relying on the composed URL. If it turns out false, the fallback is to read the
> branch's own injected `NEON_DATABASE_URL` and swap only the credentials.

Automated preview branching is a property of the Vercel-managed integration and is not exposed as a
toggle on either dashboard. **Confirm a Neon branch actually appears for a preview deployment in
CAN-22.** It is not proven yet.

## Agent tooling

The `vercel` MCP is authenticated to **`jacobreesnew-7380's projects`**, scoped to the `canoncore`
project alone. CAN-18 required this because CAN-22 cannot inspect its own deployments otherwise.

This matters more than it looks. A second Vercel account exists holding only `waveger`, and anything
pointed at it returns no CanonCore projects and no `canoncore.com` — which reads as a missing
resource rather than a wrong account. If a Vercel tool reports nothing, check which account it is on
before believing it: `vercel whoami` should say `jacobreesvercel`. The bundled `vercel` plugin MCP is
a separate server from this one and is not necessarily on the same account.

## Domains

`canoncore.com` is registered at Namecheap on BasicDNS, with a wildcard `* ALIAS` to
`cname.vercel-dns-017.com`. **No Namecheap change was needed for the cutover**, exactly as CAN-18
predicted: the wildcard already resolves every hostname to Vercel, so reassignment happened entirely
inside Vercel.

The two older projects were left in place, reachable on their own `.vercel.app` domains, rather than
deleted:

| Project | Was | Now |
| --- | --- | --- |
| `canoncore-legacy` | held `canoncore.com`, `www.canoncore.com`, and the name `canoncore` | `canoncore-v2.vercel.app` |
| `canoncore-demo` | held `demo.canoncore.com` | `canoncore-demo.vercel.app` |

`demo.canoncore.com` now returns 404. Releasing it mattered beyond tidiness: while it was live a
stranger could reach the old product on the domain that serves v1, putting it in scope for the
Online Safety Act obligations in CAN-21.

## Holding page

`www.canoncore.com` currently serves a static holding page deployed from a temporary directory, not
from the repository. It exists so the cutover caused no outage. **The first push to `main` in CAN-22
replaces it automatically**, and nothing needs cleaning up.
