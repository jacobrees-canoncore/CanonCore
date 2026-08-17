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
- [The URL-sharing gate](#the-url-sharing-gate)
- [Hosting](#hosting)
- [The repository, and what `main` refuses](#the-repository-and-what-main-refuses)
- [Environment variables](#environment-variables)
- [Database](#database)
- [External data source: TMDB](#external-data-source-tmdb)
- [Transactional email: Resend](#transactional-email-resend)
- [Reporting address](#reporting-address)
- [Error reporting: Sentry](#error-reporting-sentry)
- [Uptime monitoring: UptimeRobot](#uptime-monitoring-uptimerobot)
- [Domains](#domains)
- [Agent tooling](#agent-tooling)
- [The served surface](#the-served-surface)

## The production URL

`https://www.canoncore.com`. The apex `canoncore.com` serves a **301** to it.

This is the URL that **CAN-24 Sign in and sign out** (better-auth base URL and cookie domain),
**CAN-31 Email verification and password reset** (absolute links) and **CAN-21 Write the Online Safety
Act documents** must bake in. `www` is canonical rather than the apex so the session cookie stays
host-only; the reasoning and what will try to reopen it are
[ADR-0010](adr/0010-canonical-host-www.md).

## The URL-sharing gate

**The public URL is not shared with anyone until both gates below are open.** Deployed is not shared:
`www.canoncore.com` resolves today and serves a holding page, and that is deliberately as far as it goes.

**What the gates hold shut, concretely: CAN-57 Make a public Ordering discoverable and shareable.** Its first criterion lifts `noindex` and publishes a sitemap — the strongest form of inviting a stranger — so it is `blocked-by` every condition of both gates (drawn 16 August 2026), and must never be worked while either gate is closed.

**There are two of them, and they test different things.** *Lawfulness* asks whether sharing the address
would be legal. *Readiness* asks whether what a stranger finds on the other end is worth the visit, and
whether it will still be there next week. Only the first was ever written down, so it was being read as
though it did both jobs. They open on different conditions and neither one implies the other.

**What sharing covers.** Telling anyone the address, linking it anywhere public, and anything that invites a
stranger to visit. It does not cover the deployment itself, which has to exist for the records to be
completable and for the address to be testable.

**Every compliance record that cites *The URL-sharing gate* means gate one.** Nothing in `docs/compliance/`
turns on readiness; readiness has no statutory content.

### Gate one: lawfulness

**The Online Safety Act records must be live and the reporting address must work.**

| | |
| --- | --- |
| Status | **Closed.** Not shared |
| Condition met | [CAN-44 Make the Online Safety Act records live, and create the reporting address](https://linear.app/jacobrees-canoncore/issue/CAN-44), on **14 August 2026**: the records are dated, the address exists and a test message was seen arriving in it |
| Condition outstanding | [CAN-32 Roles, takedown, and the Online Safety Act surfaces](https://linear.app/jacobrees-canoncore/issue/CAN-32) — the terms of service and the reporting route have to render before they can be relied on |
| Condition outstanding | [CAN-30 GDPR export and erasure](https://linear.app/jacobrees-canoncore/issue/CAN-30) — the terms of service still carry an unresolved privacy-notice placeholder, and they should not be published with it standing |
| Recorded here since | 13 August 2026, by **CAN-71 Make the compliance records valid: dates, the alternative-measures record, and the PCU register** |

**Why it is a gate and not a preference.** The two things that make this a user-to-user service are
accounts and public Visibility. **Since CAN-23 One Story from Neon, behind row-level security one of them exists** — `story` carries a Visibility
and one row is public — and accounts do not, so nobody but the operator can put content here. That
is what most of the Code measures are recorded as not in effect for
(`docs/compliance/code-measures-register.md` → *What the `Effective` column means*). The failure
this prevents is content arriving before the measures do: a person posting to
a service with no takedown, no published terms and no reporting address.

**When accounts land this gate tightens, it does not move.** They arrive with
**CAN-24 A signed-in and a signed-out path**, and that is the change after which the sentence above
stops holding.

**Where this gate lived before, and why it moved here.** It was an unticked box on
[CAN-21 Write the Online Safety Act documents and establish the reporting address](https://linear.app/jacobrees-canoncore/issue/CAN-21),
which is closed, and then one line of prose on CAN-44. The audit of 12 to 13 August 2026 found it existed
nowhere in the repository, so an agent reading this repo had no way to know it applied
(`docs/research/tracker-and-repository-audit.md` §6). It is a criterion on that ticket and a row here now,
which are the two places someone about to share the URL would actually be looking.

**The compliance records themselves** are in [`docs/compliance/`](compliance/), and `CLAUDE.md` points at
them.

### Gate two: readiness

**Being allowed to share the URL is not the same as it being worth sharing.** A stranger who finds a service
that has gone quiet for a month, or that ships a megabyte of JavaScript to render a list, does not come
back, and the first visit is the only one most of them make.

| | |
| --- | --- |
| Status | **Closed.** Not shared |
| Condition outstanding | [CAN-59 Decide whether the Hobby plan can carry a public service](https://linear.app/jacobrees-canoncore/issue/CAN-59) — the plan is contractually non-commercial, and the decision is recorded as an ADR either way |
| Condition outstanding | [CAN-60 Gate the front end on bytes, budgets and React lint](https://linear.app/jacobrees-canoncore/issue/CAN-60) — the front-end quality gates, once there is a stable application to measure |
| Condition outstanding | [CAN-61 Keep the codebase and its dependencies from silting up](https://linear.app/jacobrees-canoncore/issue/CAN-61) — the two hygiene tools whose value scales with codebase age |
| Condition outstanding | **An explicit acceptance of Vercel Hobby's 30-day outage risk.** Exceeding an included limit takes the feature offline until 30 days have passed, and Hobby has neither a spend cap nor a configurable usage alert ([Hobby plan](https://vercel.com/docs/plans/hobby)). No ticket owns the acceptance: **CAN-59 Decide whether the Hobby plan can carry a public service** is where the reasoning lands, and deciding to stay on Hobby is not the same as having accepted this |
| Recorded here since | 14 August 2026, by **CAN-93 Record the three bands, the two gates and the Later queue convention** |

**Design is deliberately not a condition**, and that is a decision rather than an omission. A stranger reads
an undesigned site the way they read a wiki, which is exactly what **CAN-17 v1: the walking skeleton in
production, then the founding case** asks of them in its definition of done. **CAN-89 Give the product a
visual identity and a reading surface** lands before the URL is shared anyway, because it sits in `v1` —
that is v1's scope rather than a condition here, and this gate would open without it.
`docs/agents/issue-tracker.md` → *The three bands* holds why it is banded there.

## Hosting

| | |
| --- | --- |
| Vercel account | `jacobreesnew-7380's projects` (Hobby, user `jacobreesvercel`) |
| Project | `canoncore`, `prj_BMzP9Dq7Qx3Eev8WwsvVoH5khnaU` |
| Repository | `jacobrees-canoncore/CanonCore`, production branch `main` |
| Function region | `lhr1` (London) |
| Preview protection | **None — off, and accepted deliberately** (16 August 2026). The live API reads `ssoProtection: disabled`; an earlier row here claimed Vercel Authentication covered previews, which the 16 August verification sweep refuted. The exposure — previews run against copy-on-write clones of production rows — is accepted until **CAN-79 Previews clone production rows, and the integration has no switch to stop it** closes it; re-enabling is a dashboard toggle if that changes |
| Root Directory | `apps/web` |
| Framework Preset | Next.js |
| Include files outside the root directory | On |
| Node.js version | 24.x |

*Read back with `vercel project inspect canoncore`; the last four rows set by CAN-22 on 11 August
2026. Preview protection was set on 13 August 2026 and turned off since — the row above records
the 16 August acceptance.*

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

### `main` does not deploy from Git

Since CAN-23 One Story from Neon, behind row-level security,
[`apps/web/vercel.json`](../apps/web/vercel.json) sets
`git.deploymentEnabled: { "main": false }`, and GitHub Actions builds and promotes production
instead — migrations first, promotion after. Why the order has to be enforced rather than trusted
is `docs/agents/workflow.md` → *What a merge carries*.

**Unlike the settings above, this one is in the repository**, which is the reason it was done this
way rather than by unticking auto-assignment of the production domain in the project. The file is
read from the Root Directory, confirmed on 14 August 2026 by putting a header in it and finding
that header in `.vercel/output/config.json` after `vercel build`.

**Previews are untouched and still deploy from Git.** That is not incidental: the `Vercel` required
context comes from the GitHub App, so a change that stopped previews deploying would stop every
pull request reporting it and block every merge.

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
and `scripts/check-docs.ts` fails the build if it disagrees with `.github/workflows/ci.yml` or with
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

**The job's name is a summary of what it runs, not a manifest of it, and does not change when a step
joins.** The documents check, the dependency audit, the migration and both release steps have all
joined without it changing. A rename buys a longer string and costs a coordinated edit to this table
and to the live ruleset, with a window in which the required context is missing and nothing can
merge. Settled by **CAN-54 Fail a push that adds a known-vulnerable dependency** on 16 August 2026,
against a `ci.yml` comment that said the opposite and that four steps had already contradicted.

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
Here that means a green pull request can still break `main`, and a push to `main` releases if the
job that follows it is green. CI is `on: push`, so the merge commit is tested too, and `docs/agents/workflow.md` →
*After the merge* is the step that looks. Turn strict on if a second person starts landing work, or
if two branches are ever routinely open at once.

### Dependency and secret scanning

Turned on by **CAN-54 Fail a push that adds a known-vulnerable dependency** on 16 August 2026, and
read back the same day with the calls beneath the table. Four settings were flipped; the last three
rows were already as they stand and are recorded so that "off" is a decision rather than a gap.

| Setting | State | Read back by |
| --- | --- | --- |
| Dependency graph | **enabled** | `dependency-graph/sbom`, which answers `404` when off and **696 packages** when on |
| Dependabot alerts | **enabled** | `vulnerability-alerts`, `204` when on and `404` when off |
| Secret scanning | **enabled** | `security_and_analysis.secret_scanning.status` |
| Secret scanning push protection | **enabled** | `security_and_analysis.secret_scanning_push_protection.status` |
| Dependabot security updates | disabled | `security_and_analysis.dependabot_security_updates.status` |
| Secret scanning validity checks | disabled | `security_and_analysis.secret_scanning_validity_checks.status` |
| Secret scanning non-provider patterns | disabled | `security_and_analysis.secret_scanning_non_provider_patterns.status` |

```bash
gh api repos/jacobrees-canoncore/CanonCore --jq .security_and_analysis
gh api -i repos/jacobrees-canoncore/CanonCore/vulnerability-alerts | head -1
gh api repos/jacobrees-canoncore/CanonCore/dependency-graph/sbom --jq '.sbom.packages | length'
```

**Three settings, three different places, and the first command reaches only one of them.** Alerts
are not in `security_and_analysis`, and the dependency graph is in neither — it has no REST route at
all, and `PATCH`ing it into that payload returns 200 while changing nothing. All three calls, or the
answer is partial. Both halves of that were found rather than assumed
([incident](incidents.md#dependabot-alerts-were-enabled-and-blind)).

**The dependency graph is the row the other two rest on.** It was off until CAN-54, which made
Dependabot alerts *enabled and blind*: the alert list was empty because nothing had been parsed, not
because nothing was vulnerable. One open alert exists now, `GHSA-67mh-4wv8-2f99` — a moderate
`esbuild` development-server advisory reaching us through `drizzle-kit`, which nothing here can fix.

**The three disabled rows.** *Security updates* raise fix pull requests, which is dependency
updating rather than dependency alerting, and belongs to **CAN-61 Keep the codebase and its
dependencies from silting up** with Renovate. *Validity checks* send a candidate secret to its issuer
to ask whether it is live, which is a disclosure decision on its own and nothing here needs.
*Non-provider patterns* widen scanning to shapes no issuer vouches for, and their false-positive rate
is what push protection would then be enforcing.

**None of this is the gate.** Alerts arrive after a merge, on GitHub's schedule, in a tab nobody has
open; the gate is `pnpm audit --audit-level=high` in the CI job, and
[`docs/agents/workflow.md`](agents/workflow.md) → *The gates* owns it. These settings are the
after-the-fact half, and the reason the ticket wanted both.

## Environment variables

**The roster for this application.** Every variable the `canoncore` Vercel project holds, plus the
GitHub Actions secrets, in one table. `scripts/check-docs.ts` compares each half against its own
source and fails when either disagrees: the Vercel rows against `vercel env ls --project canoncore`,
the Actions rows against `gh secret list`. The two do not reach equally far, and *What this check
compares, and what it cannot* below is which reaches where.

**It is no longer every variable the estate holds**, and the claim was narrowed on purpose. Under
[ADR-0014](adr/0014-shell-providers-and-per-source-retention.md#decision-1--the-app-is-a-shell) a
*Source* credential lives in its provider's own repository and its own Vercel project, so the
estate has several projects and this table reaches one. **Each provider repository holds the roster
for its own credentials**; the pointer here is *Where a Source credential lives* below.

*Read back from `vercel env ls --project canoncore` on 15 August 2026, and `gh secret list` on
16 August 2026.*

| Variable | Holder | Environments | Sensitivity | What it is |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Vercel | Production | Sensitive | The application role's connection string, which has to ask for `sslmode=verify-full`. Production only, on purpose: a static string must not be what a preview uses |
| `DATABASE_APP_USER` | Vercel | Production, Preview, Development | Non-sensitive | The application role name, for a preview to compose its own URL |
| `DATABASE_APP_PASSWORD` | Vercel | Production, Preview | Sensitive | Its password. Inherited unchanged by every preview branch |
| `DATABASE_PRODUCTION_HOST` | Vercel | Production, Preview | Non-sensitive | Production's Neon host, so that a preview can assert the host it resolved is not that one. **Non-sensitive deliberately**: a value nobody can read back is a value nobody can catch going stale, and a stale one makes the preview's assertion vacuous |
| `RESEND_API_KEY` | Vercel | Production, Preview | Sensitive | Two distinct keys under one name, one per environment |
| `EMAIL_FROM` | Vercel | Production, Preview | Sensitive | `CanonCore <noreply@mail.canoncore.com>` |
| `SENTRY_DSN` | Vercel | Production, Preview | Sensitive | Also recorded under *Error reporting* below, since a DSN is not a secret |
| `SENTRY_AUTH_TOKEN` | Vercel | Production, Preview | Sensitive | Organisation auth token, scope `org:ci`, for source-map upload |
| `MIGRATION_DATABASE_URL` | GitHub Actions secret | — | — | The migration role's connection string, which has to ask for `sslmode=verify-full`. Not in Vercel: migrations run in Actions, not in the build |
| `VERCEL_TOKEN` | GitHub Actions secret | — | — | **Account-scoped, and it has to be.** Two steps of `ci.yml` consume it: the `node scripts/check-docs.ts --verbose` run, and **Build and promote the production deployment**. A *project*-scoped token fails both, and fails them differently. Replaced 14 August 2026, **expires 14 August 2027** — *Why this one is account-scoped* below holds the identity, the expiry and the scope, and `scripts/check-docs.ts` compares that expiry against Vercel on every run, in CI as well as locally |

**No `NEON_*` variables.** All sixteen the Marketplace integration had written were removed on 13
August 2026. Whether the integration re-writes them is checked by **CAN-69 Record the credential
purge**.

**The application does read two of them, and they still belong in no row here.** A preview
composes its connection string from `NEON_PGHOST` and `NEON_PGDATABASE`, which Neon injects into
that one deployment by webhook. They are not project-level variables, `vercel env ls` cannot show
them, and a project-level one would be the bug — see *How a preview reaches its own database*
below.

**A Sensitive variable cannot be read back, by anyone** — not by the CLI, not from the dashboard,
not by whoever set it ([incident](incidents.md#a-vercel-sensitive-variable-cannot-be-read-back-by-anyone)).
**If one is lost, reissue it at the source.** Each section below names where its source is.

**What the application actually requires is declared in
[`apps/web/src/env.ts`](../apps/web/src/env.ts), and `next build` refuses to run without it** —
**CAN-49 Refuse to build without the environment variables the app needs**. That schema answers a
different question from this table: the table is what is provisioned, the schema is what the code
reads.

> **Which rows are observed, and which are still only promised.** Since **CAN-23 One Story from
> Neon, behind row-level security** a deployment opens a connection, so `DATABASE_URL`,
> `DATABASE_APP_USER`, `DATABASE_APP_PASSWORD` and `DATABASE_PRODUCTION_HOST` are read at request
> time by [`apps/web/src/db/database-url.ts`](../apps/web/src/db/database-url.ts). `VERCEL_TOKEN`
> is read on every CI run and `MIGRATION_DATABASE_URL` whenever a migration runs, so both are
> observed too — by Actions rather than by the application. The Resend rows wait on **CAN-31 Email
> verification and password reset**, and the Sentry rows on the first thing that reports to it.
>
> **This no longer waits on CAN-26 Import a series from TMDB, with the overlay behind it.** That
> ticket used to be named here as the consumer of `TMDB_API_READ_ACCESS_TOKEN`, and under
> [ADR-0014](adr/0014-shell-providers-and-per-source-retention.md#decision-1--the-app-is-a-shell)
> it consumes no external credential at all: it reads a provider, and the provider holds the key.
>
> **They are read at request time and not at build time, on purpose.** A schema demanding
> `DATABASE_URL` of every build would refuse a preview's, which correctly has none, and a refused
> preview build reports the required `Vercel` context red — so the gate CAN-49 Refuse to build without the
> environment variables the app needs put there would have blocked every merge. `apps/web/src/env.ts` says the same thing next to the code.

### Where a Source credential lives

**No *Source* credential is held by the `canoncore` project**, under
[ADR-0014](adr/0014-shell-providers-and-per-source-retention.md#decision-1--the-app-is-a-shell).
Each lives in its provider's own repository and its own Vercel project, and that repository
documents it.

| Source | Credential | Where it lives now |
| --- | --- | --- |
| TMDB | Bearer token, scope `api_read` | **Pending `provider-tmdb`, which does not exist yet.** Removed from the `canoncore` project on 15 August 2026 by **CAN-99 Move the TMDB credential out of the app, atomically with its roster row**. Until that repository exists the token is held nowhere, and is recoverable from [`themoviedb.org/settings/api`](https://www.themoviedb.org/settings/api) — see *External data source: TMDB* below |

**Held nowhere is a real state, and it is recorded rather than tidied away.** A credential whose
home is unrecorded is the failure this roster exists to prevent; a credential recorded as homeless
is merely work outstanding. It becomes a row above only if it ever returns to this project, which
under ADR-0014 it should not.

### What this check compares, and what it cannot

**The roster has two halves and `scripts/check-docs.ts` compares both, each against its own
source.** Which source can speak for a row is read off its Holder column. The reach of each is worth
stating in a table, because it is exactly what a green tick does not tell you:

| Half | Source | Where it gates |
| --- | --- | --- |
| Holder says `Vercel` | `vercel env ls --project canoncore` | CI and locally. The runner installs `vercel` and holds a `VERCEL_TOKEN` |
| Holder says `GitHub Actions secret` | `gh secret list` | **Locally.** Every route to them from a runner costs a credential, and none is bought — below |
| Any other Holder | none | Nowhere. Named on every run instead |

**Only names are compared, because a secret has no other readable property.** An Actions secret
cannot be read back any more than a Vercel Sensitive one can, so this half catches a secret set but
undocumented, or documented but never set — which is how a roster goes stale — and cannot catch a
stale value.

**Why the Actions half stops at a laptop.** `gh secret list` reads the secrets API, whose permission
is not among the scopes `permissions:` accepts
([Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions)),
so the workflow's own token cannot be granted it — and says so on a runner rather than in theory,
`HTTP 403: Resource not accessible by integration`
([incident](incidents.md#a-workflow-reading-tojsonsecrets-is-held-before-any-job-starts)). The keyless route that would have worked,
`toJSON(secrets)`, was built, pushed and **refused by GitHub before any job started** — it is a named
indicator of malicious-workflow detection
([incident](incidents.md#a-workflow-reading-tojsonsecrets-is-held-before-any-job-starts)). That
leaves a fine-grained token with `secrets: read`, which is a credential added to check the credential
roster, and the same reasoning that refused a Linear credential for the label roster refuses this
one. So the comparison happens where a credential already exists: on the machine `gh` is already
signed in on.

**Which makes this the same answer twice, and that is the point.** Both rosters gate locally, both
skip in CI saying why, and neither buys a credential to do otherwise —
[`docs/agents/triage-labels.md`](agents/triage-labels.md) → *Where this check gates, and where it does
not* is the label half, with the argument for accepting rather than enforcing.

**What was decided, and what was turned down.** **CAN-109 Decide whether the label roster check needs
enforcing, or is honest as it stands** posed three options and the answer is a fourth, assembled from
two of them:

| | Option | Outcome |
| --- | --- | --- |
| 1 | Accept it, and make the skip visible rather than a log line | **Taken, for the label roster** and now for this half too. The job summary is the mechanism |
| 2 | Widen the comparison to reach the Actions secrets | **Taken, and it lands locally.** The two rows leave the unchecked list because they are genuinely compared, just not everywhere |
| 3 | A Linear API token in Actions, to enforce the label roster from CI | **Refused.** A user-scoped, workspace-wide credential with a roster row, an expiry and a rotation story, to gate eight strings |
| 4 | `toJSON(secrets)`, which would have made option 2 reach CI for nothing | **Blocked by GitHub**, and would have blocked every merge with it |

**`scripts/check-docs.ts` was deliberately not widened past one Vercel project.** It reads
`vercel env ls --project canoncore`, and `parseDocumentedVariables` keeps only rows whose Holder
column contains `Vercel` — so a row naming a Provider's project leaves the comparison silently.
Teaching it to walk several projects would be building for `provider-tmdb` before that repository
exists, which is the speculative generality `CLAUDE.md` rules out. **When `provider-tmdb` exists,
that repository runs its own check against its own project** — the same shape, one project each,
rather than one checker reaching across an estate.

**So the third row of the first table is the blind spot, and it is named rather than left silent.**
`parseUncheckedVariables` reports every documented row neither source reaches, in the check's detail
line. A bare local run prints only `PASS` and the check's name, for this check as for every other, so
**pass `--verbose` when you are asking what the roster actually covers**. Today nothing is in it, and
the first thing that will be is the TMDB token once `provider-tmdb` holds it:

```
PASS  the variable roster matches Vercel        8 variables agree
PASS  the secret roster matches GitHub Actions  2 secrets agree
```

**And a green CI run says which halves it compared, without anyone opening a log.** `check-docs`
writes its whole report to the job summary, so the run's own page carries every check, its result and
what it read. That is what a skip needs to be worth anything: `docs/agents/workflow.md` → *The gates*
holds the rule, and this is where it becomes visible. The same page answers the finding recorded on
**CAN-86 Record VERCEL_TOKEN in the credential roster, and revisit whether the release can use a
project-scoped one** — a wrongly-scoped token skips this roster rather than failing it — so the two
share one mechanism rather than getting an answer each.

**A future provider row must not put `Vercel` in its Holder**, and the same now goes for
`GitHub Actions`. Both filters are case-sensitive substring tests, so a Holder reading
`Vercel (provider-tmdb)` would be pulled *into* the comparison against `canoncore`, fail against a
project that correctly does not hold it, and disappear from the unchecked list at the same moment —
the one failure mode this arrangement still has. Name the holder as the repository, and let its own
project's check do the verifying.

### Why this one is account-scoped

`VERCEL_TOKEN` is scoped to the account rather than to this project, and a project-scoped token
breaks both consumers — differently, which is the part worth recording.

**What the live token is**, read back from `vercel tokens ls --json` on 16 August 2026:

| Token | Scope | Expires | State |
| --- | --- | --- | --- |
| `canoncore-github-actions-release` | **User** — the whole account: every team the user belongs to, and every project in each | `2027-08-14` | **Live.** Created 14 August 2026 at 10:43 UTC, runs out **16:43 UTC on 14 August 2027**. Identified as the one CI holds by last use, which moves with every run and so is quoted as a reading rather than a fact: at 17:43 UTC on 16 August 2026 it sat inside run `31962399354`'s window |
| `canoncore-github-actions-release` | Project — `canoncore` alone, inside `team_fM6JucuEULAiTuHY5TM5h3TP` | `2027-08-14` | **Replaced** 14 August 2026, thirty-six minutes after it was set, and **revoked 16 August 2026** — it had a year of life left and nothing had used it since |

**The expiry is compared rather than merely written down**, and the second row is why it cannot be
compared by name. Until this change no document here carried an expiry at all — the replacement date
was recorded and the date it runs out was not — so nothing had gone stale in these pages. What had
gone stale is the tracker's copy: from 14 to 16 August 2026 **CAN-86 Record VERCEL_TOKEN in the
credential roster, and revisit whether the release can use a project-scoped one** described the
replaced token's identity as the live one's. Nothing could have caught that by reading, because two
unexpired tokens carried the one name. So `scripts/check-docs.ts` reads the listing, takes the token
Vercel **last saw used**, and fails when its expiry is not the date above.

**What that catches, and the case it would have missed.** It catches the ordinary drift: a token
reissued weeks or months later, whose expiry moves with it and whose recorded date stops matching.
It would **not** have caught 14 August, because the replacement was minted thirty-six minutes after
the token it replaced and the two expire on the same day — the comparison is to the day, which is
the precision a roster can carry in a form a reader can check.

**It also does not count down to 14 August 2027, on purpose.** A check that began failing as the
date approached would turn a stopped release into a blocked merge, which is worse than what it warns
about — and this failure is loud already: the release step stops and production keeps serving the
previous deployment. So the expiry stays a year, and a shorter one would buy nothing, since it
cannot narrow the scope and every rotation is manual dashboard work.

**"Account" here is the user, not the team, and the distinction is real even where it makes no
difference today.** The live token's scope is `{ "type": "user" }` with no team attached, so it
reaches every team the user belongs to. The dashboard's middle rung — one team, all its projects —
is narrower, and the narrowest is the project rung that does not work at all. The account holds one
team, `jacobreesnew-7380's projects`, and nine projects in it, so user scope and team scope reach
the same nine today. They part company the moment a second team exists, or if the token should be
kept off account-level endpoints such as the token list itself. **The middle rung is untested**, and
what would settle it is a team-scoped token minted in the dashboard and run through the release
once.

| Token scope | `check-docs` result **in CI** | When |
| --- | --- | --- |
| Project | `5 passed, 2 skipped, 0 failed` | 14 August 2026, seven checks |
| Account | `6 passed, 1 skipped, 0 failed` | 14 August 2026, seven checks |
| Account | `6 passed, 2 skipped, 0 failed` | 16 August 2026, run `31960500155`, eight checks |
| Account | `7 passed, 2 skipped, 0 failed` | 16 August 2026, run `31964525778`, nine checks |

**The two dates are not comparable and the third row says why.** **CAN-109 Decide whether the label
roster check needs enforcing, or is honest as it stands** added the secret roster, which skips on a
runner, so the current baseline in CI is two skips rather than one. What the first two rows record
is the shape, and the shape is unchanged: a project-scoped token turns a pass into a skip rather
than into a failure, so it costs a gate without costing a build. A local run reports `9 passed,
0 skipped`, because the label roster, the secret roster and the token expiry all reach their source
here and none of them can be assumed to on a runner — so no local total is evidence about the
token's scope.

**Every total above is against the check count of its day, and the count has moved twice.** Seven
checks on 14 August, eight after CAN-109 Decide whether the label roster check needs enforcing, or
is honest as it stands added the secret roster, nine since the expiry check above. Read the row's
own date before comparing it with a run, and read the run's summary rather than its tally.

**The scope is now stated on the run rather than inferred from a skip.** Run `31964525778`
reported `PASS the release token's expiry matches Vercel — expires 2027-08-14, scope wider than one
project, read the newest 100`. That line is read from the token CI actually holds, by that token, so
it settles two things this section previously took on trust from a laptop: the expiry above, and
that the token in use is not project-scoped. It is a detail line and not a gate — what a
wrongly-scoped token *costs* is still **CAN-109 Decide whether the label roster check needs
enforcing, or is honest as it stands**'s answer, below, and does not get a second one here.

**The release step fails loudly and `check-docs` fails quietly.** **Build and promote the
production deployment** stops the job at its `vercel pull`, with
`Error: Could not retrieve Project Settings`, having `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` set in
its environment and unrescued by either. The `check-docs` step instead *skips* `the variable roster
matches Vercel` and carries on green, so a wrongly-scoped token costs a documentation gate on every
branch and only announces itself on a merge to `main`.

**Reproduced by hand and then on live CI**, which is worth separating because the first was in an
empty directory and proves less. Run `31792489379` on `f34b673`, landing **CAN-84 A preview's
composed sslmode=require silently stops verifying certificates under pg 9**, failed there —
**attempt 1**, and the citation needs that word: attempt 2 was the same job re-run on the
replacement token, every step green, so the run's own page reports success and a reader following
the number alone would find no failure at all.

**Anyone reading a green pull request would not have known, and now would.** Since **CAN-109 Decide
whether the label roster check needs enforcing, or is honest as it stands** the report reaches the
run's own page, where this skip sits with its reason next to the others — *What this check compares,
and what it cannot* above.

**Dropping `--prebuilt` would not have bought project scoping.** **CAN-86 Record VERCEL_TOKEN in
the credential roster, and revisit whether the release can use a project-scoped one** proposed that
`vercel pull` is needed only because the workflow builds locally, so a plain `vercel deploy --prod`
might read no project settings at all. It reads the same ones. Traced with `--debug` on 16 August
2026, in a clean checkout with `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` set:

| Command | What it calls |
| --- | --- |
| `vercel pull` | `/v2/user`, `/teams/:id`, **`/v9/projects/:id`**, `/v10/projects/:id/env`, `/v3/env/pull/:id/production` |
| `vercel deploy --prod`, no `--prebuilt` | `/v2/user`, `/teams/:id`, **`/v9/projects/:id`** |

A remote build's calls are a **strict subset** of `vercel pull`'s, behind the same
`Retrieving project…` spinner — and `Could not retrieve Project Settings`, which is where the
release run above stopped, is that project fetch failing. Every deploy path the CLI offers resolves the linked
project before it does anything else; the remote build then reads `rootDirectory` from the answer to
find `apps/web` at all. **So the question that ticket asked is closed: no.**

**That is a trace and not a run, and the difference is worth stating.** No project-scoped token was
put through `vercel deploy`: what was compared is which endpoints each command calls, against the
endpoint the failure names. It closes the question because the failing call is one a remote build
makes too, not because the narrower token was watched failing at it. Re-testing it would now need a
fresh token from the dashboard, the old one having been revoked.

**`--prebuilt` therefore stays**, and now for the reason it was chosen rather than for want of an
alternative. Vercel's build cache was the other half of that suggestion and it is real, but it is
now the only half, and it would be bought by promoting something other than what this job built and
put through the gates.

**Reissuing is a dashboard action; revoking is not.** `vercel tokens add <name>` returns
`Error: Cannot create tokens for this app. (403)` under the current *Sign in with Vercel (google)*
login, from an agent session and from Jacob's own terminal alike, and `POST /v3/user/tokens` returns
the same `forbidden` — so it is the login that refuses, not the CLI. `vercel tokens rm <id>` works,
and is how the replaced token above was revoked. The natural assumption when the release fails, that
whatever noticed can mint the replacement, is wrong in one direction only.

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

> **The production branch `main` is not protected, and cannot be on this plan** (checked live 16
> August 2026: `protected: false`). Branch protection is a Neon **paid-plan** feature — Launch
> allows 2 protected branches, Free none — so this is plan-gated rather than forgotten. The
> upgrade question is owned by **CAN-59 Decide whether the Hobby plan can carry a public
> service**; the outstanding-work record is **CAN-69 Record the credential purge, regenerate the
> credentials table, and lint-ban NEON\_ reads**.

### Roles

Neon's `neondb_owner` has `rolbypassrls = true` and is therefore never the application role.

| Role | Purpose | `rolbypassrls` |
| --- | --- | --- |
| `canoncore_migrator` | Owns every table it creates. Runs migrations | `false` |
| `canoncore_app` | The application connects as this and nothing else | `false` |

#### What each role may do to a table, and the default privileges there are not

**`canoncore_app` holds `SELECT` and nothing else, on every table.** `canoncore_migrator` needs no
grant at all — it owns each table, and an owner bypasses row security, which is why ownership sits
with it rather than with the application's role.

**There are no default privileges, and the absence is the decision.** Until 16 August 2026 two
`ALTER DEFAULT PRIVILEGES` grants existed here and in no other place:

| Granted by | On | To `canoncore_app` |
| --- | --- | --- |
| `canoncore_migrator` | tables | `arwd` — INSERT, SELECT, UPDATE, DELETE |
| `canoncore_migrator` | sequences | `rU` — SELECT, USAGE |

A default privilege applies to every table the granting role **creates**, so each table arrived
holding all four however its own migration read — and both `0001` and `0004` say `SELECT` only.
**Row-level security was carrying it invisibly**: a `FOR SELECT` policy refuses the writes an ACL
allows, so `story` and `snapshot` were never reachable, and `source` — the first table with no
policy over it — is where the ACL became the only thing standing there. The application role could
set every retention window to `'infinity'`, which is what
[ADR-0014](adr/0014-shell-providers-and-per-source-retention.md#decision-6--retention-is-a-property-of-the-source)
chose the shared row to prevent.

**CAN-123 Revoke the application role's write privileges, and decide whether the blanket default
privilege should exist** removed both rather than narrowing them to `SELECT`. A narrowed default
would still hand a new table to the application role before anyone had written a policy for it, and
row-level security is off until a policy turns it on, so that table would be readable in full.
Since the change, a table arrives with **no ACL at all** and the application role is refused it
outright, which is a loud error rather than the silent empty result a broken policy gives.

Three things follow from that, and the third is why no reading of the repository could find it:

- **A migration is the only place a table privilege is granted.**
  [`apps/web/src/db/roles.sql`](../apps/web/src/db/roles.sql) carries what exists *before* any
  migration runs, and cannot carry this — it is applied by a superuser, so the statement would
  bind the wrong role. That file holds the argument, the citation and the check it rests on,
  because it is the file somebody would otherwise add the revoke to.
- **A test asserts it**, in [`apps/web/src/db/rls.test.ts`](../apps/web/src/db/rls.test.ts): every
  table's privileges for `canoncore_app` as an exact list, and `pg_default_acl` as empty of it. A
  new table fails that test rather than arriving armed.
- **The test cannot see production.** It runs against CI's container and a laptop, so it gates what
  the *migrations* produce. A privilege granted here by hand is invisible to it — which is exactly
  what happened — so the check on production is reading the catalogues back, and nothing else is.
  **Read both**: `relacl` for the three tables, and `pg_default_acl` with its `defaclnamespace`,
  which is the half no test can ever reach and the half this arrived through.

> **Read back from production on 16 August 2026, before the change**: `relacl` on all three tables
> was `canoncore_app=arwd/canoncore_migrator`, and the two `pg_default_acl` rows were as tabled
> above, both with `defaclnamespace = 2200` — the `public` schema, not a role-wide default. That
> last detail is what makes migration 0005's `IN SCHEMA "public"` the right scope, and a read-back
> that omits it cannot tell the two cases apart.
>
> **The reading that confirms the end state is due when the release runs migration 0005**, and
> until it has been taken this section describes what the migration establishes rather than what
> has been observed.

### Schema

`public.story`, `public.visibility` and `drizzle.__drizzle_migrations`, every one of them owned by
`canoncore_migrator`, with row-level security on `story` and one public row in it. Applied to
Neon's `main` on **14 August 2026**, by hand and deliberately ahead of the merge: a preview branch
is a copy of `main` taken when its deployment starts, so the schema has to be there before the code
that reads it deploys anywhere. That is the widening in `docs/agents/workflow.md` → *What a merge
carries*, and the release step re-runs the same migrations at merge, where Drizzle's journal makes
them a no-op.

`canoncore_migrator` also holds **`CREATE` on the database `neondb`**, granted 14 August 2026 by
CAN-23 One Story from Neon, behind row-level security and read back with
`has_database_privilege`. That is the privilege to create a *schema*,
and Drizzle's migrator needs it before it will read its own journal
([incident](incidents.md#drizzles-migrator-needs-create-on-the-database-before-it-reads-anything)).
`canoncore_app` has neither that nor `CREATE` on `public`, which is unchanged.

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
| The branch's `NEON_PGHOST` reaches the preview's runtime, in place of the static project-level value | **Cited, and now asserted rather than assumed.** Neon states the branch variables are "injected via webhook at deployment time, overriding preview environment variables for this deployment only" ([preview branching](https://neon.com/docs/guides/vercel-native-integration-previews)) |

> **A preview now reports the host it resolved, and refuses to serve if it is the wrong one.** It
> cannot be checked from outside a running deployment — the injected values never appear in
> `vercel env pull`, by design — so **CAN-23 One Story from Neon, behind row-level security** put the
> check inside one:
> [`apps/web/src/db/database-url.ts`](../apps/web/src/db/database-url.ts) composes the string,
> logs the host, and throws if a preview has reached production's Neon compute. It compares
> computes rather than hostnames, because one Neon compute answers to a pooled name and an
> unpooled one and a preview reaching production by the second is still production.
> `DATABASE_PRODUCTION_HOST` is what it compares against, and production asserts the same value
> from the other side so that a stale one cannot pass unnoticed.
>
> **The evidence is a runtime log line**, `[canoncore] database host … (VERCEL_ENV=…)`, read with
> `vercel logs`. Until a preview has been read that way the mechanism is asserted rather than
> observed; the assertion failing is loud, which is the difference from before.

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

### The SSL mode every connection asks for

**`sslmode=verify-full`** — encrypted, *and* the server certificate checked against the host it was
reached at. All three of this project's connection strings ask for it: a preview composes its own,
`DATABASE_URL` carries production's, `MIGRATION_DATABASE_URL` carries the migration role's.

The spelling is the point rather than the behaviour. `pg` 8 honours `require` the same way and `pg`
9 will not, so all three said `require` until 14 August 2026, when **CAN-84 A preview's composed
sslmode=require silently stops verifying certificates under pg 9** changed them
([incident](incidents.md#a-sensitive-variable-named-its-ssl-mode-in-a-deprecation-warning), which
holds what was observed and what it was checked against).

**Reissue either variable with `verify-full`, because Neon will not hand it to you that way.** Both
are write-only — one a Vercel Sensitive variable, one a GitHub Actions secret — so a `require`
pasted back is invisible from that moment on, and **nothing in the repository checks it**. That is
deliberate: a request-time refusal would put an outage behind a value no gate can read, over a
string `pg` 8 still honours. The one signal is negative and expires — `pg-connection-string` emits
a SECURITY WARNING into the runtime log for as long as a string says `require`, and nothing at all
once it says `verify-full`.

## External data source: TMDB

Provisioned by **CAN-19 Obtain a TMDB API key and the account behind it**. *Why* TMDB, and the licence conditions the import and the UI must honour, are
[ADR-0009](adr/0009-external-source-tmdb.md). **There is no retention exception**: TMDB is used on
its published terms only, and how long a copy may be kept is a property of the Source, in
[ADR-0014](adr/0014-shell-providers-and-per-source-retention.md#decision-6--retention-is-a-property-of-the-source).

> **This credential is no longer held by this project.** Under
> [ADR-0014](adr/0014-shell-providers-and-per-source-retention.md#decision-1--the-app-is-a-shell),
> which puts no *Source* credential in `apps/web`, `TMDB_API_READ_ACCESS_TOKEN` was removed from the
> `canoncore` Vercel project on 15 August 2026 by **CAN-99 Move the TMDB credential out of the app,
> atomically with its roster row**, together with its roster row, in one change. **Its destination
> `provider-tmdb` does not exist yet**, so the token is held nowhere and is reissued from the source
> named below — *Where a Source credential lives* above records that state.
>
> **What remains here is the account, not the secret.** The table below describes the TMDB account
> and the registered application, which stay this project's however the credential is held.

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

Eight records at Namecheap, serving **two unrelated mail systems on one zone**. Resend sends and
receives on the `mail` and `send.mail` subdomains; Namecheap Private Email holds the reporting
mailbox on the apex. They are listed together because the failure mode is editing one set and
destroying the other — see *The Mail Settings dropdown is a trap* below.

| Type | Host | Value | Priority | Owner |
| --- | --- | --- | --- | --- |
| `TXT` | `resend._domainkey.mail` | `p=MIGfMA0GCSqGSIb3…ku66YzQIDAQAB` | | Resend |
| `TXT` | `send.mail` | `v=spf1 include:amazonses.com ~all` | | Resend |
| `MX` | `send.mail` | `feedback-smtp.eu-west-1.amazonses.com.` | 10 | Resend |
| `MX` | `mail` | `inbound-smtp.eu-west-1.amazonaws.com.` | 10 | Resend |
| `TXT` | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@mail.canoncore.com,mailto:re+wgfzjdbnxfr@dmarc.postmarkapp.com;` | | ours |
| `MX` | `@` | `mx1.privateemail.com.` | 10 | Private Email |
| `MX` | `@` | `mx2.privateemail.com.` | 10 | Private Email |
| `TXT` | `@` | `v=spf1 include:spf.privateemail.com ~all` | | Private Email |

The apex rows were added by **CAN-44 Make the Online Safety Act records live, and create the
reporting address** on 14 August 2026, by hand, with Mail Settings left on **Custom MX**.

> **The Mail Settings dropdown is a trap.** Namecheap's Advanced DNS page has a *Mail Settings*
> selector whose options are mutually exclusive — `Custom MX`, `Email Forwarding`, `Private Email`,
> `Gmail`, `MXE Record`, `No Email Service`. **Selecting anything other than `Custom MX` replaces the
> entire MX table**, so both Resend rows vanish. That was verified against the live zone on 14 August
> 2026 by selecting `Email Forwarding`, then `Private Email`, and watching the table empty each time —
> reverting without saving both times. Namecheap's own guidance is to stay on `Custom MX` and add the
> records by hand "if you want to use multiple email services or to add MX records to a subdomain"
> ([Private Email DNS records](https://www.namecheap.com/support/knowledgebase/article.aspx/1338/2176/how-to-set-up-namecheap-private-email-dns-records-for-domains-on-namecheap-basicpremium-nameservers/)),
> which is exactly this zone. **Never touch that dropdown.**
>
> The same article lists an optional `mail` **CNAME** to `privateemail.com` for webmail convenience.
> **Do not add it.** A CNAME cannot coexist with other records at the same name, and `mail` already
> carries Resend's inbound `MX`.

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

**`report@canoncore.com` is readable the same way**, as the `Canoncore` account in Mail.app — the
Private Email mailbox added over IMAP on 14 August 2026. It is a second reference recipient, and the one to
use whenever the question is whether the *reporting* route works rather than whether product mail
lands.

Mail sent to `*@mail.canoncore.com` needs no such check, because receiving is enabled and the
`resend` MCP reads that mailbox directly.

## Reporting address

Decided by **CAN-21 Write the Online Safety Act documents and establish the reporting address**,
which wrote the documents; created on 14 August 2026 by **CAN-44 Make the Online Safety Act records
live, and create the reporting address**.

| | |
| --- | --- |
| Address | `report@canoncore.com` |
| Mechanism | A **Namecheap Private Email mailbox** on the apex, read in Jacob's Mail.app over IMAP |
| Status | **Live.** Created 14 August 2026 and proved by a test message, below |
| Subscription | Private Email **Launch**, one mailbox, 5 GB, 10 aliases. Order 211112248, subscription 4332833 |
| Cost | Free for the first month, then **£11.03/year**, auto-renew on. First charge 14 September 2026 |
| Mailbox password | Not recorded here. Jacob's password manager; set at creation, never displayed by Namecheap afterwards |
| Webmail | `https://privateemail.com`, if Mail.app is unavailable |

The Online Safety Act requires a reporting route that works for people who have no account and are
not users at all (`s.20(5)` affected persons), and the Codes require it to be easy to find and use.
What that needs is in
[`docs/compliance/code-measures-register.md`](compliance/code-measures-register.md).

**It is on the apex, not on `mail.canoncore.com`** — a change from CAN-21's wording, which assumed
the Resend inbound domain. Resend receives at `*@mail.canoncore.com`, but that mailbox is readable
only through the API, and **an inbox only an API can read is not "monitored by a human"**. The duty
is that reports reach a person. It does not disturb the Resend setup: `mail.canoncore.com` and
`send.mail.canoncore.com` keep their own records, and the apex had none until the three apex rows in
*DNS for mail* above were added.

**It is a real mailbox, not a forward** — a change from the original plan, which assumed Namecheap's
free email forwarding. That turned out to be unusable here: free forwarding is only available with Mail
Settings set to `Email Forwarding`, and that setting destroys the Resend MX records (*The Mail
Settings dropdown is a trap*, above). A paid Private Email mailbox needs no such setting, and it is
the better answer anyway — **there is no forwarding hop to fail silently**, which is the failure the
published document's promise could not survive. It is read in Mail.app alongside Jacob's other
accounts, which is what makes "monitored by a human" true rather than aspirational.

**One thing is still outstanding**, and
[CAN-32 Roles, takedown, and the Online Safety Act surfaces](https://linear.app/jacobrees-canoncore/issue/CAN-32)
owns it: making the address available to the application as configuration rather than hard-coded, so
that the two public documents and the reporting route cannot drift apart.

**The URL is still not shared**, because those surfaces have not shipped — see
[The URL-sharing gate](#the-url-sharing-gate). The half of *gate one* this address answers for is met:
it exists, and a test message was seen arriving in the mailbox, which is the specific failure the gate
exists to prevent.

**The test that proved it, 14 August 2026.** Both halves, because neither alone is evidence:

| | |
| --- | --- |
| Sent | `can44@mail.canoncore.com` → `report@canoncore.com`, via the `resend` MCP |
| Resend id | `7e60e852-0efd-476b-a8a0-2b3a02b4a350`, status `delivered` |
| Message id | `<010201a000258a09-72b2af67-3f32-4789-9e71-5035d66f3256-000000@eu-west-1.amazonses.com>` |
| Arrived | `INBOX` of the `Canoncore` account in Mail.app, read with `macos-mail-mcp`, 13:01 local |
| Not | Junk. That is the half a provider's `delivered` cannot tell you |

**The reporting route itself is not finished by this address.** ICU D2.2(a) recommends a report
control on each publicly visible record, which v1 does not ship; it is recorded as an alternative
measure in the code-measures register and built by CAN-43, deliberately outside v1.

> **CAN-21 closed with this unticked, and its wording was already out of date** — its criterion said
> the address exists "on `mail.canoncore.com`", and the criterion that replaced it then said Namecheap
> free forwarding on the apex "does not disturb Resend". Both were wrong, and each was corrected by the
> ticket that came after it. Nothing here is owned by a closed ticket.

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

### What the published terms commit to

**Settled 16 August 2026 by CAN-81 Disclose Sentry's US error storage in the terms of service.**
`content/legal/terms-of-service.md` → *Your privacy, and where your data is held* discloses this
transfer alongside Resend's, and **the wording is the constraint rather than the description**:
**CAN-51 Keep a record of server errors past the hour Vercel keeps them** configures the SDK to match
it, not the other way round. What has to stay true of that configuration:

| The terms say | What keeps it true |
| --- | --- |
| No IP address | **Not one setting.** `sendDefaultPii: false` keeps `user.ip_address` off the event, but not the request headers, which are sent by default and carry the address Vercel puts in `x-forwarded-for`. The IP-bearing headers have to go too — in `beforeSend` today, because `requestDataIntegration`'s `include.headers` is all-or-nothing, and through `dataCollection.httpHeaders`'s deny list from v11 |
| No name, email address or account | Nothing calls `Sentry.setUser`, and local variables are not captured in stack frames |
| Neither survives a version bump by itself | **From v11 `sendDefaultPii` is gone and every `dataCollection` category defaults to collecting**, `userInfo` and `stackFrameVariables` among them. Each has to be turned off explicitly or the promises break on upgrade alone |
| Only the address, the failure and technical detail of the request are sent | Cookies and request bodies stay withheld. The full URL and its query string are **always** sent, so nothing personal may be put in one — which binds the links **CAN-31 Email verification and password reset** builds |
| Text a user typed may appear inside an error message | Nothing configures that away, which is why the terms disclose it instead |

**11 sub-processors is the whole of Sentry's list**, eight general and three of Sentry's own group
companies ([subprocessors](https://sentry.io/legal/subprocessors/), last updated 1 June 2026). Resend's
22 in the same paragraph is the count from its own list
([ADR-0011](adr/0011-transactional-email-resend.md)).

**The terms rather than a privacy notice, decided rather than defaulted.** No privacy notice exists,
and the disclosure had to be published before the first event. **CAN-30 GDPR export and erasure**
writes the notice; both disclosures move into it then, and the terms carry a `[ ]` saying so.

What was read before publishing, what the IP sentence rests on, and what could not be read back, is
[`docs/incidents.md`](incidents.md) → *No event had reached Sentry when the terms disclosed it*.

## Uptime monitoring: UptimeRobot

Provisioned by **CAN-66 Create the uptime monitoring account and its phone alert route** on 13 August
2026. **It still polls the holding page.** **CAN-56 Find out the site is down without waiting to be
told** built [`/api/health`](../apps/web/src/app/api/health/route.ts) and everything around it;
repointing this monitor at that route is the one step of it no agent can take, and is outstanding —
*The repoint, and why it is a human step* below.

| | |
| --- | --- |
| Account | `jacobreesnew@gmail.com`, display name `Jacob Rees` |
| Sign-in | Google. The same address as the Sentry account, which signs in through GitHub instead |
| Plan | **Free 50**. No payment method, no billing info, **0 SMS/voice credits** |
| Free-tier limits | 50 monitors, 5-minute interval, 3-month log retention, 1 status page |
| Monitor | id `803731762`, `https://www.canoncore.com`, HTTP/S, checked every 5 minutes |
| The request | `HEAD`, follows redirections, IPv4 first, 30-second timeout, up on 2xx and 3xx |
| Check location | One, auto-selected by UptimeRobot. Observed: North America |
| Alert route | E-mail `jacobreesnew@gmail.com` **and iOS app push**, both set for up and down events |
| Account timezone | GMT+1, so every timestamp in the dashboard, and in the incident below, reads as BST |

*Settings read back 13 August 2026. **Only push, and only on a down event, has been watched
firing** — no e-mail was observed at all, and the test ran on a throwaway monitor rather than this one
([incident](incidents.md#a-failing-check-reaches-the-phone-a-recovering-one-may-not)).*

**Why UptimeRobot.** Better Stack's free plan reaches Slack and e-mail but not a phone, so meeting
the phone criterion there would have cost a Responder seat
([Better Stack pricing](https://betterstack.com/pricing), read 13 August 2026). Both free tiers, with their sources, are
compared in
[`docs/research/production-readiness-baseline.md`](research/production-readiness-baseline.md) →
*Observability*, which also holds **Sentry Developer's single free uptime monitor**. That one stays
unspent.

**A blip cannot page you, unless it answers with an error.** When nothing answers, UptimeRobot
re-requests from the same location, then sends *"2 other requests in parallel from 2 random and
remote locations"*, and marks the monitor down only if those fail too
([FAQ](https://uptimerobot.com/faq/), read 13 August 2026). **Anything answering with an erroneous
HTTP status skips all of it** and is *"instantly marked as down without verification"*. So the
confirmation covers a host that has stopped answering, and not a deployment that answers with an
error — and a deployment that is broken rather than gone usually still answers. The branch that
recorded this watched a 404 page the phone on its first check.

**That leaves the repeated-failure requirement met for one failure mode and not the other.** The
per-channel *Notification Repeat and Delay* that would close the gap is **disabled on Free 50**, the
monitor's advanced settings carry no failure threshold, and account-level alert storm protection is
paid as well. Nothing free closes it here, so it is closed upstream instead, and **CAN-56 Find out
the site is down without waiting to be told** closed it: `/api/health` asks PostgreSQL three times,
a quarter of a second apart, before it answers anything but 200, so one dropped connection cannot
page a phone. [`health.ts`](../apps/web/src/db/health.ts) holds that and the argument for it.

**There is no credential, and that is not an omission.** UptimeRobot polls this site; nothing here
calls UptimeRobot. Both keys on *Integrations & API*, main and read-only, are **un-generated**, so
there is nothing to hold in Vercel and no row for one in the roster above.

**No status page exists, deliberately.** The free plan includes one, and publishing it would publish
the production URL, which *The URL-sharing gate* above forbids while either gate is closed. The
monitor reads *attached to no status page*, and stays that way until both open.

### The repoint, and why it is a human step

**The account signs in with Google and both API keys are un-generated**, so there is no credential
any agent here could use and no command to run: this is a dashboard edit, and it is the last thing
CAN-56 Find out the site is down without waiting to be told needs. Do it **after** the route is
live in production, because pointing a monitor at a 404 pages the phone within five minutes.

1. UptimeRobot → monitor `803731762` → **Edit** → URL to `https://www.canoncore.com/api/health`.
   **Edit this monitor rather than adding a second one**, so its uptime history stays continuous.
2. Change nothing else. `HEAD`, the 5-minute interval, 2xx/3xx as up and both alert contacts are
   all still what this route was built for, and the first two cannot be changed on Free 50 anyway.
3. Confirm the alert route with the monitor page's **Test Notification** button rather than by
   inducing an incident, which is how it was done the first time and cost an incident write-up.
4. Update the *Monitor* row above, with the date it was read back.

Then the check is live, and what to do when it fires is [`runbook.md`](runbook.md).

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

`www.canoncore.com` serves `apps/web`, a Next.js application, and its one route is rendered per
request. CAN-22 A page on a public URL, deployed, with CI deleted `public/index.html` and the root
`vercel.json` that served it.

The page still says the product is being rebuilt, because it is, and that copy is unchanged since
CAN-22. What CAN-23 One Story from Neon, behind row-level security added beneath it is **one public
Story, read from Neon**: the row migration
0002 inserts, fetched as the anonymous session user inside a transaction, filtered by the policy on
`story` rather than by the query. That is the walking skeleton finished — a push reaches a public
URL, and a row reaches a stranger — and it is why the route is no longer static.

Nothing else about a stranger's view changed. There is still nothing to sign in to and no way for
anyone but the operator to put a row here.

**One route is served that is not a page.** `/api/health` answers **200 with an empty body** while
PostgreSQL answers it, and **503** when three asks in a row do not; `HEAD` gets the same, from the
same handler. It is the uptime monitor's target rather than anything a visitor is meant to find,
and it is deliberately not a debugging surface — no version, no host, no error, nothing about the
database beyond whether it replied. Added by **CAN-56 Find out the site is down without waiting to
be told**; *Uptime monitoring: UptimeRobot* above is what will poll it once the repoint recorded
there is done, and [`runbook.md`](runbook.md) is what to do when it fails.

The **Hosting** settings above are what protects against how that page was first deployed
([incident](incidents.md#the-holding-page-was-first-deployed-straight-to-production)).
