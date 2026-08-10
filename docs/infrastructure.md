# Infrastructure

Provisioned by CAN-18, CAN-19 and CAN-20, all on 10 August 2026. Everything here is fact, not intent.

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

`canoncore.com` is registered at Namecheap on BasicDNS. **No Namecheap change was needed for the
cutover**: reassignment happened entirely inside Vercel.

**There is no wildcard record.** An earlier revision of this file recorded a wildcard `* ALIAS` to
`cname.vercel-dns-017.com` and credited it for the cutover needing no DNS change. The zone contains
no `*` record of any type. Read from the Namecheap dashboard on 10 August 2026 and confirmed against
the authoritative nameserver:

```
$ dig +short @dns1.registrar-servers.com randomprobe123.canoncore.com A
$ dig +noall +comments @dns1.registrar-servers.com randomprobe123.canoncore.com A | grep status
;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: …
```

Hostnames reach Vercel through explicit per-host records instead, one per domain:

| Type | Host | Value |
| --- | --- | --- |
| A | `@` | `216.198.79.1` |
| CNAME | `www` | `930a5c34adc350de.vercel-dns-017.com.` |
| CNAME | `demo` | `bc3b9806163bfed9.vercel-dns-017.com.` |

The correction matters in one direction only. **A new subdomain does not resolve until someone adds
a record for it**, so anything assuming a hostname is already live — a preview alias, a sending
subdomain, a future service — has to add its own. Why the cutover needed no change is not
established by this observation and is no longer claimed here.

The two older projects were left in place, reachable on their own `.vercel.app` domains, rather than
deleted:

| Project | Was | Now |
| --- | --- | --- |
| `canoncore-legacy` | held `canoncore.com`, `www.canoncore.com`, and the name `canoncore` | `canoncore-v2.vercel.app` |
| `canoncore-demo` | held `demo.canoncore.com` | `canoncore-demo.vercel.app` |

`demo.canoncore.com` now returns 404. Releasing it mattered beyond tidiness: while it was live a
stranger could reach the old product on the domain that serves v1, putting it in scope for the
Online Safety Act obligations in CAN-21.

## Transactional email: Resend

Provisioned by CAN-20 on 10 August 2026. *Why* Resend, what it was weighed against, and the terms it
commits us to are [ADR-0011](adr/0011-transactional-email-resend.md); the evidence behind it is
[transactional-email-providers.md](research/transactional-email-providers.md). This section records
the account, the domain and the credentials.

### The account

| | |
| --- | --- |
| Provider | Resend, free tier (3,000/month, 100/day) |
| Sending domain | `mail.canoncore.com`, id `5e9ca08d-ddae-444f-9d7b-066979148a73` |
| Region | `eu-west-1` (Ireland). **Cannot be changed** without deleting and re-adding the domain |
| Sending address | `CanonCore <noreply@mail.canoncore.com>` |
| Receiving | **Enabled** on `mail.canoncore.com`, for DMARC reports |
| Marketplace integration | **Not installed.** A plain API key, deliberately |

The free tier allows **one domain**, which is why `mail.canoncore.com` replaced an earlier
`canoncore.com` entry rather than sitting beside it, and why previews cannot have a domain of their
own.

**The account holds exactly two API keys**, both issued by CAN-20 and recorded under *Where the
credentials live* below. Three older keys that predated it were revoked by CAN-39 on 10 August 2026;
what each one could do, and how far the evidence for revoking it went, is under *What was removed*
below. Every key on this account is now recorded there or here.

**Mail is sent from a subdomain, never the apex.** Resend's own guidance is to "send emails from a
subdomain instead of your root domain to conform to deliverability best practices"
([Add a domain](https://resend.com/docs/add-a-domain)). The point is
containment: a bad month for mail reputation must not reach `www.canoncore.com`. `mail.` is a sibling
of `www`, so [ADR-0010](adr/0010-canonical-host-www.md) is untouched and the session cookie stays
host-only.

**The Vercel Marketplace integration was declined on purpose.** Resend is the only email provider on
it, but it provisions a billable resource on a Hobby account and takes ownership of the environment
variable. That is the same failure mode the `NEON_` prefix exists to avoid, one section up.

### DNS

Five records at Namecheap. The first four are Resend's, taken from its Records tab; the fifth is ours.

| Type | Host | Value | Priority |
| --- | --- | --- | --- |
| `TXT` | `resend._domainkey.mail` | `p=MIGfMA0GCSqGSIb3…ku66YzQIDAQAB` | |
| `TXT` | `send.mail` | `v=spf1 include:amazonses.com ~all` | |
| `MX` | `send.mail` | `feedback-smtp.eu-west-1.amazonses.com.` | 10 |
| `MX` | `mail` | `inbound-smtp.eu-west-1.amazonaws.com.` | 10 |
| `TXT` | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@mail.canoncore.com;` | |

`send.mail` is the Return-Path: Resend defaults it to `send.<domain>`, which is why the sending
domain is `mail.canoncore.com` and the bounce path is `send.mail.canoncore.com`. Do not make the
Return-Path a name you also send from — AWS, whose MAIL FROM machinery this is, says it "shouldn't be
a subdomain that you also use to send email from"
([Custom MAIL FROM](https://docs.aws.amazon.com/ses/latest/dg/mail-from.html)), and the zone
previously violated exactly that.

**The DMARC reporting address must stay inside `canoncore.com`.** RFC 7489 §7.1 makes an external
`rua` conditional on the destination domain publishing an authorising record, and a personal iCloud
or Gmail address will never do so, so reports would be discarded in silence. `dmarc@mail.canoncore.com`
is within the same Organizational Domain and needs no such record. That is the reason receiving is
enabled at all.

`p=none` is monitor-only and changes nothing about delivery. iCloud read the record as published and
reported `pdomain=canoncore.com`, confirming the reporting address sits inside the Organizational
Domain that the RFC's test uses.

### What was removed, and why it mattered

The zone previously carried **seven** Resend records: two complete domain entries, one for
`canoncore.com` and one for `send.canoncore.com`, with two distinct DKIM public keys. All seven were
deleted on 10 August 2026 and the `canoncore.com` domain entry was deleted from Resend.

This was not tidying. A published DKIM public key is a standing authority to sign mail as that
domain, and the only way to revoke it is to remove the record. The `canoncore.com` entry was
confirmed to belong to this account; the `send.canoncore.com` entry **did not appear in the account's
domain list at all**, so its private key was unaccounted for. Both are now revoked. Provenance was
deliberately not investigated.

**Three API keys were revoked on 10 August 2026**, by CAN-39, for the same reason in a different
shape. They predated CAN-20 and their scope was written down nowhere.

| Key | Id | Permission | Domain | Created | Idle since |
| --- | --- | --- | --- | --- | --- |
| `CanonCore V3` | `64ab6293-3d02-424a-9a79-54b7fb769b5d` | **Full access** | All domains | 20 March 2026 | ~April 2026 |
| `Onboarding` | `16284ada-d2da-4258-83bf-13492a2412fb` | Sending access | All domains | 27 November 2025 | ~December 2025 |
| `Onboarding` | `8e5e17c1-05bf-4ca8-824d-c03f07c5df94` | Sending access | All domains | 27 November 2025 | never used |

Read from each key's dashboard page on 10 August 2026, which is the only place those facts exist:
[`list-api-keys`](https://resend.com/docs/api-reference/api-keys/list-api-keys) returns `id`, `name`,
`created_at` and `last_used_at`, and no field for permission, domain or token.

`CanonCore V3` was the widest credential on the account, wider than either key CAN-20 issued for
production. Resend defines `full_access` as "Can create, delete, get, and update any resource" against
`sending_access`, which "Can only send emails"
([Create API key](https://resend.com/docs/api-reference/api-keys/create-api-key)). All three were
**all domains**: the `domain_id` that would "restrict an API key to send emails only from a specific
domain" is, per the same page, "only used when the `permission` is set to `sending_access`", and
neither `Onboarding` key carried one. So none was confined to the `canoncore.com` entry, and each
would have kept working against whatever domain the account verified next.

`CanonCore V3` was created on the same day as the `canoncore.com` domain entry that CAN-20 deleted,
which suggests it belonged to that setup. That is inference and was not investigated further.

**CAN-20 left these alone on the theory that `canoncore-legacy` or `canoncore-demo` might be sending
with one. They are not.** Those two projects and `canoncore-storybook` share a single identical
`RESEND_API_KEY`, and it belongs to **a different Resend account**. Two independent observations, both
from 10 August 2026:

- **It leaves no trace in this account's log.** A `GET /domains` carrying it, timed at 15:20:34Z,
  produced no log entry, while the identical call made one second later on this account's own key
  did. The account logs 4xx responses, so a rejected-but-authenticated request would have appeared.
- **Its token matches none of the three.** Ordinarily this comparison is impossible, which is why the
  ticket ruled it out in advance. It was available here only because those three projects store the
  variable as **non-sensitive**, so `vercel env pull` returns the plaintext, and it could be compared
  against the masked token prefix each revoked key showed on its dashboard page. None matched.

It also cannot send from `mail.canoncore.com`, which this account has verified. All three projects
still name `noreply@canoncore.com` as `EMAIL_FROM`, an address no longer deliverable from here since
the `canoncore.com` domain entry was deleted.

> **That key is live, and it is not ours to revoke.** Three public Vercel projects hold a working
> credential for a Resend account this project does not control, so nothing here can revoke it.
> Outside CAN-39, which is scoped to this account's keys. Tracked as
> [CAN-41](https://linear.app/jacobrees-canoncore/issue/CAN-41/account-for-the-resend-key-three-older-vercel-projects-still-carry-on).

A fourth project, `canoncore-rebuild`, also carries a `RESEND_API_KEY`. It is stored **Sensitive**, so
Vercel returns `[SENSITIVE]` rather than the value and the comparison above cannot be repeated for it.
Nothing rules out its holding one of the three. It was treated as depending on nothing, on Jacob's
instruction, and the deletions went ahead on that basis rather than on evidence.

Read *idle since* as the last recorded use, not as a lifetime total. Each key's page reported
"Total uses: 0 times" while the list carried a last-used date whose log entry returned `Log not
found`, and this account's entire retained log was 28 entries from a single day. The reading that
fits all three: the timestamp is kept on the key record and the underlying log rows are aged out.
That is inference from the observations, not documented behaviour. Either way the dates are a floor
on how long each key sat unused, not proof it was never used.

### Where the credentials live

| Secret | Location | Resend key |
| --- | --- | --- |
| `RESEND_API_KEY` | Vercel env, **production**, Sensitive | `canoncore-production`, `fe0bb980-4998-4343-9a60-f03fd607bbfd` |
| `RESEND_API_KEY` | Vercel env, **preview**, Sensitive | `canoncore-preview`, `49af56bc-d365-4f5c-9cb1-6b85a638a2df` |
| `EMAIL_FROM` | Vercel env, production and preview | — |

Both keys are `sending_access` and restricted to the `mail.canoncore.com` domain, so neither can read
logs, manage domains or create further keys. Both were read from their dashboard pages on 10 August
2026. "You cannot view or edit an API Key value after it has been created"
([API keys](https://resend.com/docs/dashboard/api-keys/introduction)), so to rotate, create a
replacement in the dashboard and overwrite the Vercel variable, then delete the old key by the id
above.

**Both are stored Sensitive, and named for where they go.** Keep it that way: CAN-39 spent its whole
length on three keys that were neither. This repository is public, so no fragment of a live key is
written here.

**This departs from CAN-20 as written.** That ticket asked that "**an** API key is a Vercel
environment variable for production and preview". One key in both environments satisfies the letter.
Two were issued instead, one per environment under the same variable name, so that a leaked or abused
preview key can be revoked without interrupting production. The criterion was met by a stricter
mechanism rather than to the letter, in the same way CAN-18's connection string was.

**Resend has no sandbox and no test credential**, so a mistyped real address in a preview deployment
will send for real. What follows from that for code that sends mail is in
[ADR-0011](adr/0011-transactional-email-resend.md). Test sends consume the 100/day quota.

### How delivery is checked

Resend reporting a send as `delivered` means it handed the message over, not that anyone saw it. A
message can be `delivered` and sitting in Junk. Confirming placement needs a second tool reading the
recipient's side:

| Step | Tool |
| --- | --- |
| Send, and read the provider's verdict | `resend` MCP |
| Read which mailbox it landed in | `macos-mail-mcp`, against Jacob's Mail.app |

CAN-20 was proven this way. The test send from `noreply@mail.canoncore.com` was found in `INBOX` on
the `jacobrees@me.com` account, which is the one carrying `jacobrees@icloud.com`. That account is the
reference recipient: check it, not one of the Gmail accounts, unless the point is to compare
receivers.

The receiving side's own verdict, read from the delivered message's headers on 10 August 2026:

```
Authentication-Results: dmarc.icloud.com;        dmarc=pass header.from=mail.canoncore.com
Authentication-Results: dkim-verifier.icloud.com; dkim=pass header.d=mail.canoncore.com
Authentication-Results: spf.icloud.com;           spf=pass  smtp.mailfrom=…@send.mail.canoncore.com
Dkim-Signature: s=resend; d=mail.canoncore.com
Return-Path:    <…@send.mail.canoncore.com>
X-Dmarc-Info:   pass=pass; dmarc-policy=none; pdomain=canoncore.com
X-Apple-Movetofolder: INBOX
```

All three checks pass and the DKIM signature is `d=mail.canoncore.com`, so alignment is on the
sending domain rather than on Amazon's. The bounce and complaint paths CAN-31 needs were proven the
same day: sends to `bounced@resend.dev` and `complained@resend.dev` returned Resend statuses
`bounced` and `complained`.

One thing the headers show that is worth knowing before DMARC is tightened:
`bimi=skipped reason="insufficient dmarc"`. BIMI needs a policy of `quarantine` or `reject`, so it is
unavailable while the policy is `p=none`. That is a consequence of the policy choice, not a fault.

Mail sent to `*@mail.canoncore.com` needs no such check, because receiving is enabled and the
`resend` MCP can read that mailbox directly.

### What this commits us to

Recorded once, in [ADR-0011](adr/0011-transactional-email-resend.md): US log storage regardless of
sending region, 22 sub-processors, and no test credential. CAN-21 needs all three.

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
