# Infrastructure

**This file is the register: what is provisioned right now.** Current state, one complete variable
roster, and the date each row was last read back. Nothing here is intent, and nothing here is
narrative — the observations behind these settings live once in [`docs/incidents.md`](incidents.md),
and the decisions behind them in [`docs/adr/`](adr/).

That split is the point. A register is bounded by the size of the infrastructure, which is finite;
an evidence archive is unbounded by design. While they were one file the bounded thing inherited the
archive's growth — 152 lines to 1,081 in three days, with no commit ever reducing it
(`docs/research/document-length-for-agents.md`). Split on 13 August 2026 by **CAN-76 Restructure the
agent documents: policy, procedure and incidents get their own homes**.

**Adding to it: record the setting and the date you read it back, then put the story in
`docs/incidents.md` and link it.** If a paragraph would still be worth reading once the setting
changes, it is evidence and does not belong here.

## Contents

- [The production URL](#the-production-url)
- [Hosting](#hosting)
- [The repository, and what `main` refuses](#the-repository-and-what-main-refuses)
- [Environment variables](#environment-variables)
- [Database](#database)
- [External data source: TMDB](#external-data-source-tmdb)
- [Transactional email: Resend](#transactional-email-resend)
- [Reporting address](#reporting-address)
- [Error reporting: Sentry](#error-reporting-sentry)
- [Domains](#domains)
- [Agent tooling](#agent-tooling)
- [The served surface](#the-served-surface)

## The production URL

`https://www.canoncore.com`. The apex `canoncore.com` serves a **301** to it.

This is the URL that **CAN-24 Sign in and sign out** (better-auth base URL and cookie domain),
**CAN-31 Send verification and reset emails** (absolute links) and **CAN-21 Write the Online Safety
Act documents** must bake in. `www` is canonical rather than the apex so the session cookie stays
host-only; the reasoning and what will try to reopen it are
[ADR-0010](adr/0010-canonical-host-www.md).

## Hosting

| | |
| --- | --- |
| Vercel account | `jacobreesnew-7380's projects` (Hobby, user `jacobreesvercel`) |
| Project | `canoncore`, `prj_BMzP9Dq7Qx3Eev8WwsvVoH5khnaU` |
| Repository | `jacobrees-canoncore/CanonCore`, production branch `main` |
| Function region | `lhr1` (London) |
| Preview protection | **Vercel Authentication, covering preview deployments** (`ssoProtection: preview`) |
| Root Directory | `apps/web` |
| Framework Preset | Next.js |
| Include files outside the root directory | On |
| Node.js version | 24.x |

*Read back with `vercel project inspect canoncore`; the last four rows set by CAN-22 on 11 August
2026, preview protection on 13 August 2026.*

**The last five rows exist nowhere but here.** They are project settings, so no file in this
repository can assert them, and `vercel.json` cannot set any of them either. Without the first two
the build runs at the repository root, finds no application and produces a 404 on the production
domain; without the third it cannot see `packages/config`, which sits outside `apps/web`. The API
name for the third is `sourceFilesOutsideRootDirectory`, which is not the dashboard's wording
([incident](incidents.md#the-api-name-for-a-project-setting-is-not-the-dashboard-name)).

**The repository is public, and that is a constraint rather than a default.** Vercel's Hobby plan
refuses a private organisation-owned repo, and public is also what pays for `main`'s ruleset under
GitHub Free ([incident](incidents.md#vercel-hobby-refuses-a-private-organisation-owned-repo)). Made
private again, both break.

Hobby "restricts users to non-commercial, personal use only"
([Vercel Hobby plan](https://vercel.com/docs/plans/hobby), citing the
[fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage)). v1 is a
public service carrying a terms of service, so the plan is worth revisiting before launch.

The Vercel GitHub App is installed on `jacobrees-canoncore`, scoped to this one repository, and
installing it displaced nothing
([incident](incidents.md#installing-the-vercel-github-app-on-a-second-org-displaced-nothing)).

## The repository, and what `main` refuses

Provisioned by CAN-40 on 12 August 2026, and blocked until then: a required status check that never
reports blocks every merge for ever, so none of this could exist before CAN-22 gave the repository
checks to require. What it means for the landing loop is `docs/agents/workflow.md` → *What `main`
refuses*.

### Merge methods

| Setting | Value |
| --- | --- |
| `allow_squash_merge` | `true` |
| `allow_merge_commit` | `false` |
| `allow_rebase_merge` | `false` |
| `delete_branch_on_merge` | `true` |

The middle two were `true` until CAN-40. `delete_branch_on_merge` changes a step rather than merely
tidying up: GitHub deletes the head branch as the PR merges, so a remote-branch delete is a
confirmation rather than an action.

### The ruleset

One ruleset, `main`, id `20761164`, `enforcement: active`, targeting `~DEFAULT_BRANCH` — which
resolves to `main` and keeps resolving to whatever the default branch is, so renaming the branch
cannot silently unprotect it.

| Rule | What it does |
| --- | --- |
| `required_status_checks` | Both contexts in the table below must be green on the commit |
| `required_linear_history` | No merge commits reach `main` |
| `non_fast_forward` | `main` cannot be force-pushed |

**The required contexts.** These names are the ones GitHub actually reports, read off merged pull
requests rather than guessed. **This table is the only place in the documentation that names them**,
and `scripts/check-docs.mjs` fails the build if it disagrees with `.github/workflows/ci.yml` or with
the live ruleset:

| Context | Source | Where it comes from |
| --- | --- | --- |
| `test, typecheck, lint, build` | `.github/workflows/ci.yml` | The `name:` of the single job. For a workflow, *"the name format is `<job name>`"* ([Troubleshooting rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/troubleshooting-rules#troubleshooting-required-status-checks)), so the commas are part of the context |
| `Vercel` | Vercel GitHub App | A commit **status**, not a check run — the same page's rule for *other checks*. A ruleset accepts either kind |

*Read back 13 August 2026 with:*

```bash
gh api repos/jacobrees-canoncore/CanonCore/rules/branches/main
gh api repos/jacobrees-canoncore/CanonCore/rulesets/20761164 --jq '{bypass_actors,current_user_can_bypass}'
```

**Nobody bypasses it.** `bypass_actors` is empty, and the second command returns
`"current_user_can_bypass": "never"` run as `jacobdrees`, which holds `admin` here. That is the
reading that matters: an admin bypass would make the whole thing decorative, because `gh pr merge
--admin` would then land an unchecked commit and the guard would only ever stop someone who was not
trying.

**A required context that never reports blocks the merge indefinitely** — a different failure from a
red check, and a worse one. So a context only belongs here if it reports on **every** pull request,
including documentation-only ones
([incident](incidents.md#both-required-contexts-report-on-documentation-only-pull-requests)).

**The check contexts are one, not three.** CAN-22 asked for the three gate commands as three
contexts; `ci.yml` runs all four in one job so the first failure stops the rest, which means the
pull request reports one check. Requiring three names that nothing emits is the trap above.

**`Vercel Preview Comments` is deliberately not required.** Vercel posts it as a third check, but it
records that a comment was written, not that a deployment succeeded.

**No approving-review requirement, and no `pull_request` rule at all.** Solo, a required review can
only block. Requiring a pull request would be a separate decision from the one CAN-40 made, and the
status-check rule already refuses a `main` carrying no green checks.

**Branches are not required to be up to date** — `strict_required_status_checks_policy` is `false`,
GitHub's *loose* setting rather than its default. Strict costs a rebase whenever the base moves,
which solo, with one branch open at a time, is paid on every landing to guard a race that needs two
people. What loose gives up is named in the same table: *"Status checks may fail after you merge
your branch if there are incompatible changes with the base branch"* ([Available rules for
rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets#require-status-checks-to-pass-before-merging)).
Here that means a green pull request can still break `main`, and pushing `main` deploys to
production. CI is `on: push`, so the merge commit is tested too, and `docs/agents/workflow.md` →
*After the merge* is the step that looks. Turn strict on if a second person starts landing work, or
if two branches are ever routinely open at once.

## Environment variables

**The complete roster.** Every variable this project holds anywhere, in one table.
`scripts/check-docs.mjs` compares the Vercel rows against `vercel env ls` and fails when they
disagree.

*Read back from `vercel env ls --project canoncore` and `gh secret list` on 13 August 2026.*

| Variable | Holder | Environments | Sensitivity | What it is |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Vercel | Production | Sensitive | The application role's connection string. Production only, on purpose: a static string must not be what a preview uses |
| `DATABASE_APP_USER` | Vercel | Production, Preview, Development | Non-sensitive | The application role name, for a preview to compose its own URL |
| `DATABASE_APP_PASSWORD` | Vercel | Production, Preview | Sensitive | Its password. Inherited unchanged by every preview branch |
| `TMDB_API_READ_ACCESS_TOKEN` | Vercel | Production, Preview | Sensitive | TMDB bearer token, scope `api_read` |
| `RESEND_API_KEY` | Vercel | Production, Preview | Sensitive | Two distinct keys under one name, one per environment |
| `EMAIL_FROM` | Vercel | Production, Preview | Sensitive | `CanonCore <noreply@mail.canoncore.com>` |
| `SENTRY_DSN` | Vercel | Production, Preview | Sensitive | Also recorded under *Error reporting* below, since a DSN is not a secret |
| `SENTRY_AUTH_TOKEN` | Vercel | Production, Preview | Sensitive | Organisation auth token, scope `org:ci`, for source-map upload |
| `MIGRATION_DATABASE_URL` | GitHub Actions secret | — | — | The migration role's connection string. Not in Vercel: migrations run in Actions, not in the build |

**No `NEON_*` variables.** All sixteen the Marketplace integration had written were removed on 13
August 2026. Whether the integration re-writes them is checked by **CAN-69 Record the credential
purge**.

**A Sensitive variable cannot be read back, by anyone** — not by the CLI, not from the dashboard,
not by whoever set it ([incident](incidents.md#a-vercel-sensitive-variable-cannot-be-read-back-by-anyone)).
**If one is lost, reissue it at the source.** Each section below names where its source is.

> **No deployment has read any of these.** `apps/web` deploys but reads no environment variable, so
> the first read still has not happened, and "production and preview builds receive it" remains a
> platform guarantee rather than an observation. It falls to the first ticket that consumes a
> credential — CAN-23 for the database, CAN-26 for TMDB.

## Database

| | |
| --- | --- |
| Provider | Neon, via the Vercel-managed marketplace integration |
| Neon project | `steep-wave-52467839`, resource `store_ft1xdGxeaZQCEbN7` |
| Production branch | `main` (Neon's default branch). It shares a name with the repository's `main` and is a different thing |
| Preview branches | One `preview/<git-branch>` per git branch with a preview deployment, created automatically |
| Region | `eu-west-2` (London) |
| Plan | Launch, billed through Vercel |
| Neon Auth | **Disabled.** ADR-0005 settled on better-auth; the integration would otherwise provision a competing auth system |
| Create Database Branch For Deployment | **`Preview` only.** `Production` deliberately unchecked |
| Require Active Resource Before Deploy | **Required** — the prerequisite that ungreys the checkbox above |

*Branching settings set 12 August 2026 by CAN-45; read from the Neon dashboard and the Vercel
integration.*

The integration's variables are written under a `NEON_` prefix, which deliberately leaves
`DATABASE_URL` free for us. **Do not remove the prefix**: unprefixed, the integration owns
`DATABASE_URL` and fills it with the **owner** role, which ADR-0005 rule 1 forbids.

`Production` is unchecked because production must run against `main` itself, not a per-deployment
copy. **Turning `Required` on was not free and was accepted knowingly**: it gates *production*
deploys too, so a deploy now fails if the Neon resource is unavailable instead of building without
it. There is no way to pay only part of that price.

**Only Neon's branch list answers whether branching works.** Neither of the two obvious checks can —
`vercel env pull` reads project-level values, and the build log is silent, because the branch is
created by the platform out of band
([incident](incidents.md#preview-branching-was-switched-off-so-no-preview-ever-got-a-branch)).

### Roles

Neon's `neondb_owner` has `rolbypassrls = true` and is therefore never the application role.

| Role | Purpose | `rolbypassrls` |
| --- | --- | --- |
| `canoncore_migrator` | Owns every table it creates. Runs migrations | `false` |
| `canoncore_app` | The application connects as this and nothing else | `false` |

Both verified against `pg_roles` rather than assumed, and proven end to end: the application role
sees zero rows through a table with RLS enabled and no policy, and cannot create tables
(`permission denied for schema public`). Table ownership sits with the migration role on purpose:
*"Table owners normally bypass row security as well"*
([PostgreSQL, Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)),
and the same page disqualifies `neondb_owner`: *"Superusers and roles with the `BYPASSRLS` attribute
always bypass the row security system."*

### How a preview reaches its own database

A preview composes its connection string at runtime from an injected `NEON_PGHOST` plus
`DATABASE_APP_USER` and `DATABASE_APP_PASSWORD`. **That rests on two things, and only one of them
has been observed.** Keep them apart, because the untested half is the one that would silently point
a preview at production:

| Half | Standing |
| --- | --- |
| A branch exists, with `canoncore_app` usable on it, at a host that is not production's | **Observed** ([incident](incidents.md#a-preview-branch-inherits-its-parents-role-passwords)) |
| The branch's `NEON_PGHOST` reaches the preview's runtime, in place of the static project-level value | **Cited, not observed.** Neon states the branch variables are "injected via webhook at deployment time, overriding preview environment variables for this deployment only" ([preview branching](https://neon.com/docs/guides/vercel-native-integration-previews)) |

> **No preview runtime has yet reported the host it resolved.** It cannot be checked from outside a
> running deployment: the injected values never appear in `vercel env pull`, by design. **CAN-23** is
> the first code to connect to Postgres and is where it gets confirmed — **treat the composed URL as
> sound in design and unproven in execution** until then, and have CAN-23 assert the host it
> connected to rather than assume it.

**This departs from CAN-18 as written.** That ticket asked for the application role's connection
string as a Vercel variable for production **and preview**. Taken literally it is unsatisfiable: a
single static string cannot address a per-deployment branch on a host that does not exist when the
variable is set, and setting one would have pointed previews at production data — which the very
next criterion forbids. Met in substance, by a different mechanism, rather than to the letter.

**A preview branch is a copy-on-write clone of production's rows** (`init_source: parent-data`), the
integration offers no switch to change that, and **CAN-79 Previews clone production rows, and the
integration has no switch to stop it** owns the fix
([incident](incidents.md#parent-data-cloning-cannot-be-switched-off-in-the-integration)). Budget one
live Neon branch per git branch that has ever had a preview, not per open PR
([incident](incidents.md#what-a-preview-branch-looks-like-and-how-long-it-outlives-its-pr)).

## External data source: TMDB

Provisioned by CAN-19. *Why* TMDB, the licence conditions the import and the UI must honour, and the
retention exception the whole choice rests on are [ADR-0009](adr/0009-external-source-tmdb.md).

| | |
| --- | --- |
| TMDB user | `jacobrees` |
| Account object id | `687e1a9f0213a4f73538dbd3` |
| Registered application | `CanonCore`, `https://www.canoncore.com`, "Used for metadata for expanded universe content." |
| Token scope | `api_read`, and nothing else |
| Credential source | [`themoviedb.org/settings/api`](https://www.themoviedb.org/settings/api) |

*Verified against the live API on 10 August 2026, after the key regeneration
([incident](incidents.md#what-the-tmdb-credential-was-checked-against)).*

`api_read` is the entire scope, read from the token's own claims, so this credential is read-only
against TMDB — no ratings, no list edits, no contributions. The registered application URL was
corrected from `http://canoncore.com` to `https://www.canoncore.com` on 10 August 2026, since
ADR-0010 makes the apex a 301.

**Use the bearer token everywhere.** TMDB's guidance is that it "has the added benefit of being a
single authentication process that you can use across both the v3 and v4 methods", and that "both
authentication methods provide the same level of access" ([Application based
authentication](https://developer.themoviedb.org/docs/authentication-application)).

**The v3 `api_key` is deliberately not stored beside it**, because it is not a second secret: it is
the bearer token's `aud` claim, and storing it separately would be two things to rotate instead of
one. Both are recoverable only from the TMDB settings page.

> **This departs from CAN-19 as written**, which asked that both be recorded. Only the bearer is
> *stored*; both remain recorded, at their source. If a future reader expects a `TMDB_API_KEY`
> variable, this is why there is not one.

**Regenerating the key does not revoke the old one promptly** — assume a leaked TMDB key stays live
for a window of unknown length
([incident](incidents.md#regenerating-a-tmdb-key-does-not-revoke-the-old-one-promptly)).

> **Nothing here ties the CAN-34 correspondence to this TMDB account.** The registered application
> name and the exception's project scope agree with each other, which is consistency rather than
> proof; ADR-0009 carries the provenance gap in full.

## Transactional email: Resend

Provisioned by CAN-20 on 10 August 2026. *Why* Resend, what it was weighed against and the terms it
commits us to are [ADR-0011](adr/0011-transactional-email-resend.md); the evidence behind the choice
is [transactional-email-providers.md](research/transactional-email-providers.md).

| | |
| --- | --- |
| Provider | Resend, free tier (3,000/month, 100/day) |
| Sending domain | `mail.canoncore.com`, id `5e9ca08d-ddae-444f-9d7b-066979148a73` |
| Region | `eu-west-1` (Ireland). **Cannot be changed** without deleting and re-adding the domain |
| Sending address | `CanonCore <noreply@mail.canoncore.com>` |
| Receiving | **Enabled** on `mail.canoncore.com`, for DMARC reports |
| Marketplace integration | **Not installed.** A plain API key, deliberately |
| Account | `jacobreesnew@gmail.com` |

The free tier allows **one domain**, which is why `mail.canoncore.com` replaced an earlier
`canoncore.com` entry rather than sitting beside it, and why previews cannot have a domain of their
own.

**Mail is sent from a subdomain, never the apex.** Resend's guidance is to "send emails from a
subdomain instead of your root domain to conform to deliverability best practices"
([Add a domain](https://resend.com/docs/add-a-domain)). The point is containment: a bad month for
mail reputation must not reach `www.canoncore.com`. `mail.` is a sibling of `www`, so ADR-0010 is
untouched and the session cookie stays host-only.

**The Vercel Marketplace integration was declined on purpose.** Resend is the only email provider on
it, but it provisions a billable resource on a Hobby account and takes ownership of the environment
variable — the same failure mode the `NEON_` prefix exists to avoid.

### The keys

| Variable | Environment | Resend key | Id |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | Production | `canoncore-production` | `fe0bb980-4998-4343-9a60-f03fd607bbfd` |
| `RESEND_API_KEY` | Preview | `canoncore-preview` | `49af56bc-d365-4f5c-9cb1-6b85a638a2df` |

**The account holds exactly these two.** Both are `sending_access` restricted to
`mail.canoncore.com`, so neither can read logs, manage domains or create further keys; both stored
Sensitive; read from their dashboard pages on 10 August 2026. Three older keys were revoked by
CAN-39 the same day ([incident](incidents.md#three-unscoped-resend-api-keys-were-revoked)).

To rotate: "You cannot view or edit an API Key value after it has been created"
([API keys](https://resend.com/docs/dashboard/api-keys/introduction)), so create a replacement in
the dashboard, overwrite the Vercel variable, then delete the old key by the id above.

> **This departs from CAN-20 as written**, which asked that "**an** API key" be a variable for
> production and preview. Two were issued instead, one per environment under the same name, so that
> a leaked or abused preview key can be revoked without interrupting production. Met by a stricter
> mechanism rather than to the letter.

**A second Resend account exists, `jacobrees@me.com`, and it now holds nothing.** It was the source
of the "orphaned key" three old Vercel projects carried. **CAN-80 Revoke the orphaned Resend key on
the jacobrees@me.com account** deleted its three keys and its stale `send.canoncore.com` domain
entry on 13 August 2026, and `RESEND_API_KEY` is gone from `waveger-archive` and `canoncore-rebuild`
— confirmed here against `vercel env ls` the same day. **CAN-41 is retired rather than merely
stale**; do not reopen its acceptance
([incident](incidents.md#the-orphaned-resend-key-and-how-it-stopped-being-anonymous)).

**Resend has no sandbox and no test credential**, so a mistyped real address in a preview deployment
will send for real, and test sends consume the 100/day quota. What follows for code that sends mail
is in ADR-0011.

### DNS for mail

Five records at Namecheap. The first four are Resend's, from its Records tab; the fifth is ours.

| Type | Host | Value | Priority |
| --- | --- | --- | --- |
| `TXT` | `resend._domainkey.mail` | `p=MIGfMA0GCSqGSIb3…ku66YzQIDAQAB` | |
| `TXT` | `send.mail` | `v=spf1 include:amazonses.com ~all` | |
| `MX` | `send.mail` | `feedback-smtp.eu-west-1.amazonses.com.` | 10 |
| `MX` | `mail` | `inbound-smtp.eu-west-1.amazonaws.com.` | 10 |
| `TXT` | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@mail.canoncore.com,mailto:re+wgfzjdbnxfr@dmarc.postmarkapp.com;` | |

`send.mail` is the Return-Path: Resend defaults it to `send.<domain>`. **Do not make the Return-Path
a name you also send from** — AWS, whose MAIL FROM machinery this is, says it "shouldn't be a
subdomain that you also use to send email from" ([Custom MAIL
FROM](https://docs.aws.amazon.com/ses/latest/dg/mail-from.html)), and the zone previously violated
exactly that.

**The DMARC reporting address must stay inside `canoncore.com`, or be a destination that publishes
the authorising record.** RFC 7489 §7.1 makes an external `rua` conditional on the destination
domain publishing one, and a personal iCloud or Gmail address never will, so reports sent there are
discarded in silence. `dmarc@mail.canoncore.com` is within the same Organizational Domain and needs
none. That is why receiving is enabled at all.

**A human reads the reports.** `dmarc@mail.canoncore.com` is an inbox only the Resend API can read,
and an API-only inbox is not monitoring. Resolved 13 August 2026 by CAN-70 with a second `rua`
destination, `re+wgfzjdbnxfr@dmarc.postmarkapp.com` — Postmark's free DMARC digest service
([DMARC Digests](https://dmarc.postmarkapp.com/)), addressed to `jacobrees@icloud.com`. It is the
RFC-compliant kind of external destination:
`canoncore.com._report._dmarc.dmarc.postmarkapp.com` resolves to `v=DMARC1;`, verified that day. The
signup asked for an email address and a domain and nothing else, so no account or card sits behind
it. Resend stays as the raw archive; Postmark is the reader.

`p=none` is monitor-only and changes nothing about delivery.

### How delivery is checked

Resend reporting a send as `delivered` means it handed the message over, not that anyone saw it. A
message can be `delivered` and sitting in Junk, so **a deliverability claim needs both tools**:

| Step | Tool |
| --- | --- |
| Send, and read the provider's verdict | `resend` MCP |
| Read which mailbox it landed in | `macos-mail-mcp`, against Jacob's Mail.app |

**The reference recipient is the `jacobrees@me.com` account**, which carries
`jacobrees@icloud.com` — check that one, not a Gmail account, unless the point is to compare
receivers. CAN-20 was proven this way
([incident](incidents.md#the-delivered-test-message-passed-all-three-checks)).

Mail sent to `*@mail.canoncore.com` needs no such check, because receiving is enabled and the
`resend` MCP reads that mailbox directly.

## Reporting address

Decided by CAN-21, which wrote the documents; **created by CAN-44**, which is where the remaining
steps live now that CAN-21 is closed.

| | |
| --- | --- |
| Address | `report@canoncore.com` |
| Mechanism | Namecheap free email forwarding on the apex, forwarding to Jacob's iCloud |
| Status | **Not created.** No MX record for the apex exists yet |

The Online Safety Act requires a reporting route that works for people who have no account and are
not users at all (`s.20(5)` affected persons), and the Codes require it to be easy to find and use.
What that needs is in
[`docs/compliance/code-measures-register.md`](compliance/code-measures-register.md).

**It is on the apex, not on `mail.canoncore.com`** — a change from CAN-21's wording, which assumed
the Resend inbound domain. Resend receives at `*@mail.canoncore.com`, but that mailbox is readable
only through the API, and **an inbox only an API can read is not "monitored by a human"**. The duty
is that reports reach a person. This does not disturb the Resend setup: `mail.canoncore.com` and
`send.mail.canoncore.com` keep their own MX records, the apex currently has none, and adding one for
forwarding affects receiving only.

**Outstanding, with the ticket that owns each.** The first two are acts on someone else's dashboard
and in a mailbox; the third needs application code.

| | Owner |
| --- | --- |
| Add the apex MX record and the forwarding rule at Namecheap | CAN-44 |
| Send a test message and confirm it arrives, reading the destination mailbox with `macos-mail-mcp`. **A forward that silently fails is worse than no address**, because the published document promises a person that reports are read | CAN-44 |
| Make the address available to the application as configuration rather than hard-coded, so the two public documents and the reporting route cannot drift apart | CAN-32 |

**The reporting route itself is not finished by this address.** ICU D2.2(a) recommends a report
control on each publicly visible record, which v1 does not ship; it is recorded as an alternative
measure in the code-measures register and built by CAN-43, deliberately outside v1.

> **CAN-21 closed with this unticked, and its wording was already out of date** — its criterion said
> the address exists "on `mail.canoncore.com`". CAN-44 carries the corrected version. Nothing here
> is owned by a closed ticket.

## Error reporting: Sentry

Provisioned by **CAN-65 Create the Sentry account and issue its authentication token** on 13 August
2026. **Nothing reports to it yet** — no SDK is installed, and **CAN-51 Keep a record of server
errors past the hour Vercel keeps them** owns that. An empty Sentry is therefore not evidence of a
healthy deploy.

| | |
| --- | --- |
| Sentry user | `jacobreesnew@gmail.com`, id `4091868` |
| Sign-in | GitHub `jacobdrees` (external id `164458901`), linked 13 August 2026 |
| Organisation | `CanonCore`, slug `canoncore-cm`, id `4511903342592000` |
| Data storage location | **United States**, region `https://us.sentry.io`. **Not changeable** ([data storage location](https://docs.sentry.io/organization/data-storage-location/)) |
| Plan | Developer (`am3_f`), free. 5,000 errors/month, **30-day retention**, no payment source |
| Project | `canoncore-web`, id `4511903344623616`, platform `javascript-nextjs`, team `canoncore` |
| DSN | `https://0346bc8bccc47d3e58bd8b8a4b32771a@o4511903342592000.ingest.us.sentry.io/4511903344623616` |
| Token | Organisation auth token `Vercel source map upload (CAN-65)`, id `1067151`, scope `org:ci` |

*Verified 13 August 2026 ([incident](incidents.md#what-the-sentry-token-was-checked-against)), which
also records why the region is US, what that cost, and the EU organisation this replaced.*

**The project is named for the workspace package it serves**, `@canoncore/web`, rather than for the
organisation. `apps/mobile` and `apps/tv` are separate deployables when they arrive, so each gets
its own project and its own DSN.

**The DSN is recorded here because it is not a secret.** Sentry's position is that *"DSNs are safe to
keep public because they only allow submission of new events and related event data; they do not
allow read access to any information"*
([DSN explainer](https://docs.sentry.io/concepts/key-terms/dsn-explainer/)). It is nonetheless
stored Sensitive in Vercel, which CAN-65 asked for, and that has one consequence: **it cannot be
read back from Vercel by anyone**, so this table is where it is recovered from. The token's
plaintext was shown once at creation and is now held only by Vercel — **if it is lost, reissue it at
Sentry.**

> **The published terms do not mention this US transfer, and something has to.**
> `content/legal/terms-of-service.md` → *Your privacy, and where your data is held* discloses
> Resend's US storage and gives its reason. **CAN-81 Disclose Sentry's US error storage in the terms
> of service** owns it. Not yet due: nothing reports to Sentry, so nothing has been transferred, and
> the wording depends on what the SDK is eventually configured to send.

## Domains

`canoncore.com` is registered at Namecheap on BasicDNS. **There is no wildcard record**, so a new
subdomain does not resolve until someone adds one — a preview alias, a sending subdomain or a future
service has to add its own
([incident](incidents.md#there-is-no-wildcard-record-and-one-was-wrongly-recorded)).

Hostnames reach Vercel through explicit per-host records. The full apex zone, beyond the mail
records above:

| Type | Host | Value | Note |
| --- | --- | --- | --- |
| A | `@` | `216.198.79.1` | |
| CNAME | `www` | `930a5c34adc350de.vercel-dns-017.com.` | |
| CAA | `@` | `0 issue "letsencrypt.org"` | Added 13 August 2026 |
| TXT | `@` | `google-site-verification=…` | Verifies Search Console `sc-domain:canoncore.com`. **Removing it unverifies the property** ([incident](incidents.md#the-apex-google-site-verification-txt-is-ours)) |

**CAA says Let's Encrypt only.** Vercel issues certificates through Let's Encrypt and its
documentation requires exactly this record where any CAA exists ([Troubleshooting
domains](https://vercel.com/docs/domains/troubleshooting#missing-caa-records)), so the record
constrains every other CA without touching the one doing the issuing. If Vercel ever changes CA,
renewal fails visibly and this record is the fix.

**The `demo` CNAME is gone** and `demo.canoncore.com` returns 404
([incident](incidents.md#the-demo-cname-dangled-at-a-deleted-project)).

**Four older Vercel projects were deleted on 13 August 2026** — `canoncore-legacy`,
`canoncore-demo`, `canoncore-storybook` and `canoncore-v3`. Verified against `vercel project ls` the
same day: the account holds `canoncore`, `canoncore-rebuild`, `canoncore-v4`, `canoncore-v5`,
`universora`, `waveger`, `waveger-archive`, `portfolio` and `minecraft`.

## Agent tooling

The `vercel` MCP is authenticated to **`jacobreesnew-7380's projects`**, scoped to the `canoncore`
project alone. **A second Vercel account exists holding only `waveger`**, and anything pointed at it
returns no CanonCore projects and no `canoncore.com` — which reads as a missing resource rather than
a wrong account. If a Vercel tool reports nothing, check which account it is on before believing it:
`vercel whoami` should say `jacobreesvercel`. The bundled `vercel` plugin MCP is a separate server
from this one and is not necessarily on the same account.

**Why `neon`, `sentry` and `next-devtools-mcp` are user scope** rather than in a committed
`.mcp.json`: none of them is pinned to a CanonCore resource. `mcp.neon.tech` and `mcp.sentry.dev`
serve whichever account Jacob signs in as, and `next-devtools-mcp` discovers whatever dev server is
running. They are keyed to him rather than to this repo, the same test that puts `macos-mail-mcp` in
user scope. Move them only if one gains repo-specific configuration, or if a second person ever
needs this tooling reproducible.

A second reason to hold the line while this is a solo repo: project-scoped servers normally prompt
for approval, but `claude -p` runs, Agent SDK sessions and cloud sessions cannot show that prompt
and load project-scoped servers without asking ([MCP docs](https://code.claude.com/docs/en/mcp)).

**The `resend` MCP is the exception** and is scoped to this project in `.claude/settings.json`,
because it is pinned to this product's own Resend account and domain.

## The served surface

`www.canoncore.com` serves `apps/web`, a Next.js application, and its one route renders the same
copy the static holding page carried. CAN-22 deleted `public/index.html` and the root `vercel.json`
that served it.

The page still says the product is being rebuilt, because it is. What changed at CAN-22 is the
mechanism, not the message: the point of the walking skeleton is to prove the path from a push to a
public URL, and holding the copy lets a stranger's view of production stay honest while that path is
replaced underneath it.

The **Hosting** settings above are what protects against how that page was first deployed
([incident](incidents.md#the-holding-page-was-first-deployed-straight-to-production)).
