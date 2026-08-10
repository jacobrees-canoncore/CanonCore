# Infrastructure

Provisioned by CAN-18 and CAN-19, both on 10 August 2026. Everything here is fact, not intent.

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

## External data source: TMDB

Provisioned by CAN-19. *Why* TMDB, the licence conditions the import and the UI have to honour, and
the retention exception the whole choice rests on are [ADR-0009](adr/0009-external-source-tmdb.md).
This section records the credential and the account behind it.

### The account

| | |
| --- | --- |
| TMDB user | `jacobrees` |
| Account object id | `687e1a9f0213a4f73538dbd3` |
| Registered application | `CanonCore`, `https://www.canoncore.com`, "Used for metadata for expanded universe content." |
| Token scope | `api_read`, and nothing else |

The registered application URL read `http://canoncore.com` and was corrected to
`https://www.canoncore.com` on 10 August 2026. [ADR-0010](adr/0010-canonical-host-www.md) makes `www`
canonical and the apex a 301, so the registration named the host that redirects.

**`api_read` is the entire scope**, read from the token's own claims, so this credential is
read-only against TMDB — no ratings, no list edits, no contributions.

### The credential

| Secret | Location |
| --- | --- |
| `TMDB_API_READ_ACCESS_TOKEN` | Vercel env, production and preview, **Sensitive** |

**Use the bearer token everywhere.** TMDB's own guidance is that "using the Bearer token has the
added benefit of being a single authentication process that you can use across both the v3 and v4
methods", and that "both authentication methods provide the same level of access"
([Application based authentication](https://developer.themoviedb.org/docs/authentication-application)).
One credential, both API versions.

**The v3 `api_key` is deliberately not stored beside it**, because it is not a second secret: it is
the bearer token's `aud` claim. Storing it separately would be two things to rotate instead of one.
Note what that does *not* buy you — the stored token cannot be read back (see below), so the `aud`
claim is an explanation of why one variable suffices, not a recovery route. **Both credentials are
recoverable only from
[`themoviedb.org/settings/api`](https://www.themoviedb.org/settings/api), which is where they are
recorded.**

> **This departs from CAN-19 as written.** That ticket asked that "both the v3 `api_key` and the API
> Read Access Token are recorded". Only the bearer is *stored*, on the reasoning above. Both remain
> recorded, on the TMDB settings page that issues them; neither is in this repository, and only one
> is in Vercel. If a future reader expects a `TMDB_API_KEY` variable, this is why there is not one.

**Do not read the token's `nbf` claim as an issue date.** It is `21 July 2025` on both the old token
and the one that replaced it, so it dates the account's API registration and survives regeneration.
It says nothing about the age of the credential in front of you.

### What was verified, and how

Run on 10 August 2026 against the live API, from this worktree. **Every row was run after the
regeneration below, against the credential that is now in Vercel**, which matters because the
section after it establishes that a `200` alone does not distinguish this key from the one it
replaced:

| Request | Result |
| --- | --- |
| `GET /3/tv/121/episode_groups?api_key=…` | 200 |
| the same with `Authorization: Bearer` and no query parameter | 200, and a byte-identical body |
| the same with neither | 401 `{"status_code":7,"status_message":"Invalid API key…"}` |
| `GET /4/list/1` with `Authorization: Bearer` | 200 |
| `GET /4/list/1?api_key=…` | 200 |

`tv/121` is Doctor Who, and it returned five episode groups typed 3, 4, 5, 5, 5 — so ADR-0009's
"five groups, three of them story-arc" still described TMDB accurately on the day the key was
issued.

That last row is the "same level of access" above showing through: the v3 query parameter is
accepted by a v4 endpoint too. Prefer the bearer anyway, for the single-process reason TMDB gives,
not because the other one fails.

### Regenerating the key does not revoke the old one promptly

The key was regenerated on 10 August 2026, because the original had been pasted into a chat
transcript. The warning on
[`themoviedb.org/settings/api/regenerate`](https://www.themoviedb.org/settings/api/regenerate) reads
*"This will disable your old API key and regenerate a new one. This action cannot be undone."*

**It did not disable it.** The old key and the old bearer token both still returned 200 sixteen
minutes after the regeneration completed — checked repeatedly throughout, and still answering at the
last check, so sixteen minutes is a floor rather than a measurement. So TMDB revocation is
eventual rather than immediate, and regenerating is **not** a way to burn a leaked credential
quickly. A leaked TMDB key has to be assumed live for some window whose length is unknown.

Regeneration costs nothing under the licence, which is why it was safe to do at all: ADR-0009
records the retention exception as surviving the key being disabled, expiring or being terminated.
Nothing already fetched depends on which key fetched it.

### A sensitive variable cannot be read back, by anyone

`vercel env pull --environment=production` returns `TMDB_API_READ_ACCESS_TOKEN="[SENSITIVE]"`. That
is the documented behaviour rather than a CLI limitation: sensitive environment variables are ones
*"whose values are non-readable once created"*, stored *"in an unreadable format"*
([sensitive environment
variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables)). The same
is already true of `DATABASE_URL` and `DATABASE_APP_PASSWORD` above. **If one is lost, the answer is
to reissue it at the source, never to retrieve it.**

One consequence lands on CAN-26 rather than here. Sensitivity is *"only possible for environment
variables in the production and preview environments"* (same page), so local work cannot
`vercel env pull` this token and will need it written into a local `.env.local` by hand.
`.gitignore` already covers that file.

> **No deployment has read this variable.** There is no application to read it — `apps/web` does not
> exist. That a production and a preview build receive it is a platform guarantee rather than
> something CAN-19 observed. Confirm it in CAN-22, with the Neon preview-branch question above.

> **Nothing here ties the CAN-34 correspondence to this TMDB account.** The registered application
> name and the exception's project scope agree with each other, which is consistency rather than
> proof; ADR-0009 carries the provenance gap in full. Confirm it in CAN-34 if an original with
> headers is ever recovered.

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

`www.canoncore.com` serves `public/index.html` from this repository, so the cutover caused no outage.
`vercel.json` sets `outputDirectory` to `public`, which keeps the served surface to that one file
rather than publishing the whole tree as static assets.

It lives in the repository on purpose. It was first deployed from a temporary directory with
`vercel deploy --prod`, which was a mistake: **any** push to `main` triggers a production build, and
a build of a repository with no application produces a 404 — so a documentation-only merge would
have taken the site down. Committing it means every production deploy from here reproduces it.

**CAN-22 deletes `public/` and this `vercel.json` when `apps/web` exists**, and Next.js takes over
serving. Until then, do not remove either: they are the only thing standing between a push to `main`
and a 404 on the production domain.
