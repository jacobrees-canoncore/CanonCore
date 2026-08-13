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
| Root Directory | `apps/web` |
| Framework Preset | Next.js |
| Include files outside the root directory | On |
| Node.js version | 24.x |

**The last four rows exist nowhere but here.** They are project settings, so no file in this
repository can assert them, and `vercel.json` cannot set any of them either. Without the first two
the build runs at the repository root, finds no application and produces a 404 on the production
domain; without the third it cannot see `packages/config`, which sits outside `apps/web`. Set by
CAN-22 on 11 August 2026 and read back with `vercel project inspect canoncore`.

**The API name for the third one is not the name on the dashboard.** `PATCH /v9/projects/{id}`
takes `sourceFilesOutsideRootDirectory`; `includeSourceFilesOutsideRootDirectory` is rejected with
`should NOT have additional property`. Observed on 11 August 2026, and confirmed against the field
name in the CLI's own cached OpenAPI spec — Vercel's public reference documents neither spelling.

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

## The repository, and what `main` refuses

Provisioned by CAN-40 on 12 August 2026, and blocked until then: a required status check that never
reports blocks every merge for ever, so none of this could exist before CAN-22 gave the repository
checks to require.

`docs/agents/workflow.md` says squash-merge only, and that the gate is GitHub's copy of the checks
rather than a local run. Until now both were policy a skill could simply not follow. They are now
settings, which is the only form in which either survives an agent that skips a step.

### Merge methods

| Setting | Value |
| --- | --- |
| `allow_squash_merge` | `true` |
| `allow_merge_commit` | `false` |
| `allow_rebase_merge` | `false` |
| `delete_branch_on_merge` | `true` |

The middle two were `true` until CAN-40. **`delete_branch_on_merge` changes a step rather than
merely tidying up**: GitHub deletes the head branch itself the moment the PR merges, so
`/review-pr`'s remote-branch delete now runs against a branch that is already gone.
`docs/agents/workflow.md` → *The merge reports failure after it has succeeded* carries what that
changes about the step; this file records only that the setting is on.

### The ruleset

One ruleset, `main`, id `20761164`, `enforcement: active`, targeting `~DEFAULT_BRANCH` — which
resolves to `main` and keeps resolving to whatever the default branch is, so renaming the branch
cannot silently unprotect it.

| Rule | What it does |
| --- | --- |
| `required_status_checks` | `test, typecheck, lint, build` and `Vercel` must both be green on the commit |
| `required_linear_history` | No merge commits reach `main` |
| `non_fast_forward` | `main` cannot be force-pushed |

Read it back with:

```bash
gh api repos/jacobrees-canoncore/CanonCore/rules/branches/main
gh api repos/jacobrees-canoncore/CanonCore/rulesets/20761164 --jq '{bypass_actors,current_user_can_bypass}'
```

**Nobody bypasses it.** `bypass_actors` is empty, and the second command returns
`"current_user_can_bypass": "never"` when run as `jacobdrees`, which holds `admin` on this
repository. That is the reading that matters: an admin bypass would make the whole thing decorative,
because `gh pr merge --admin` would then land an unchecked commit and the guard would only ever stop
someone who was not trying. What that obliges the landing skill to do is
`docs/agents/workflow.md` → *What `main` refuses*.

**No approving-review requirement, and no `pull_request` rule at all.** Solo, a required review can
only block — there is nobody to give it. Requiring a pull request would be a separate decision from
the one CAN-40 made, and the status-check rule already refuses a `main` that carries no green
checks.

### Why those two contexts, and only those

The names are the ones GitHub actually reports, read off merged pull requests rather than guessed:

| Context | Where it comes from |
| --- | --- |
| `test, typecheck, lint, build` | The `name:` of the single job in `.github/workflows/ci.yml`. For a workflow, *"the name format is `<job name>`"* ([Troubleshooting rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/troubleshooting-rules#troubleshooting-required-status-checks)), so the commas are part of the context. |
| `Vercel` | A commit **status**, not a check run — the same page's rule for *other checks* — posted by the Vercel GitHub App for the deployment. A ruleset accepts either kind. |

**A required context that never reports blocks the merge indefinitely.** Nothing turns it green,
so the requirement never clears and the wait has no end — which is a different failure from a red
check, and a worse one. A context therefore only belongs here if it reports on every pull request.

Both of these were confirmed present and `SUCCESS` on the five most recent merged pull requests
(#80, #81, #82, #85, #86), all of which were documentation-only. That last part is what was actually
in doubt: with **Include files outside the root directory** on (see **Hosting**), Vercel builds a
change that touches nothing under `apps/web`, so it reports on those PRs too.

**`Vercel Preview Comments` is deliberately not required.** Vercel posts it as a third check, but it
records that a comment was written, not that a deployment succeeded — requiring it would gate the
merge on something that is not evidence about the build.

**The check contexts are one, not three.** The ticket asked for the three gate commands as three
contexts. `ci.yml` runs all four commands in one job so the first failure stops the rest, which
means the pull request reports one check. Requiring three names that nothing emits is the trap in
the paragraph above, so the requirement is the job that exists.

**Branches are not required to be up to date** — `strict_required_status_checks_policy` is `false`,
which is GitHub's *loose* setting rather than its default. Strict *"is the default behavior for
required status checks"* and costs a rebase whenever the base moves: *"More builds may be required,
as you'll need to bring the head branch up to date after other collaborators update the target
branch."* Solo, with one branch open at a time, that is paid on every landing to guard a race that
needs two people.

**What loose gives up is named in the same table**, and is worth reading rather than assuming it is
free: *"Status checks may fail after you merge your branch if there are incompatible changes with
the base branch"* ([Available rules for
rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets#require-status-checks-to-pass-before-merging)).
Here that means a green pull request can still break `main`, and pushing `main` deploys to
production. The run on `main` itself is what catches it — CI is `on: push`, so the merge commit is
tested too, and `docs/agents/workflow.md` → *After the merge* is the step that looks. Turn strict on
if a second person starts landing work, or if two branches are ever routinely open at once. It is
only worth turning on in company with the contexts above: strict governs *when* required checks are
judged, so with none required there is nothing for it to act on.

## Database

| | |
| --- | --- |
| Provider | Neon, via the Vercel-managed marketplace integration |
| Neon project | `steep-wave-52467839`, resource `store_ft1xdGxeaZQCEbN7` |
| Production branch | `main` (Neon's default branch). Note it shares a name with the repository's `main` and is a different thing. |
| Other branches | One `preview/<git-branch>` per git branch with an open preview deployment, created automatically. See *Preview branching was off, and is now on* |
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

`DATABASE_URL` is production-only on purpose, and that part still holds: a static connection string
must not be the thing a preview uses, because a preview must not read production data.

**How a preview gets its own was in doubt, and the cause is now known.** CAN-18 designed it as
previews composing their URL at runtime from an injected `NEON_PGHOST` plus `DATABASE_APP_USER` and
`DATABASE_APP_PASSWORD`, on the assumption that each preview deployment gets its own Neon branch on
a different host. CAN-22 tested that assumption and found no evidence for it. CAN-45 then read
Neon's branch list and found the reason: **branching was switched off**, so for the whole of CAN-18
and CAN-22 the design described an intent rather than the platform's behaviour. It is on as of
12 August 2026, and a real preview branch has since been observed carrying the credentials the
design needs — see *Preview branching was off, and is now on* below.

**The composed URL rests on two things, and only one of them was observed.** Keep them apart, because
the untested half is the one that would silently point a preview at production:

| Half | Standing |
| --- | --- |
| A branch exists, with `canoncore_app` usable on it, at a host that is not production's | **Observed.** The table below compares both, measured |
| The branch's `NEON_PGHOST` actually reaches the preview's runtime, in place of the static project-level value | **Cited, not observed.** Neon states the branch variables are "injected via webhook at deployment time, overriding preview environment variables for this deployment only" ([preview branching](https://neon.com/docs/guides/vercel-native-integration-previews)) |

> **No preview runtime has yet reported the host it resolved**, so the second half is the provider's
> documented behaviour rather than something this repository has watched happen. It cannot be checked
> from outside a running deployment: the injected values never appear in `vercel env pull`, by design.
> [CAN-23](https://linear.app/jacobrees-canoncore/issue/CAN-23) is the first code to connect to
> Postgres and is where it gets confirmed. **Until it does, treat the composed URL as sound in design
> and unproven in execution**, and have CAN-23 assert the host it connected to rather than assume it.

**This departs from CAN-18 as written.** That ticket asked for "the application role's connection
string is a Vercel environment variable for production **and preview**". Taken literally it is
unsatisfiable: a single static string cannot address a per-deployment branch on a host that does not
exist when the variable is set, and setting one would have pointed previews at production data —
which the very next criterion forbids. The criterion was met in substance, by a different mechanism,
rather than to the letter.

**A Neon branch does inherit its parent's role passwords, and that is now measured rather than
assumed.** It was the assumption the composed URL rests on, and CAN-22 could not test it because
there was no branch to connect to. CAN-45 read Neon's `connection_uri` for `canoncore_app` on both
`main` and the first preview branch and compared them:

| | `main` | the preview branch |
| --- | --- | --- |
| Role | `canoncore_app` | `canoncore_app` |
| Password | 28 characters, SHA-256 `8606a49d65d8…` | **identical on both counts** |
| Host | `ep-aged-moon-zaujrwy4-pooler.c-2.eu-west-2.aws.neon.tech` | `ep-misty-math-zamlwlio-pooler.c-2.eu-west-2.aws.neon.tech` |

Same credential, different host, which is exactly the shape the design assumed. **So the recorded
fallback — read the branch's own `NEON_DATABASE_URL` and swap only the credentials — buys nothing the
composed URL does not already have, and should not be built** unless CAN-23 finds the injection half
above does not hold.

The passwords were compared by digest on purpose. `DATABASE_APP_PASSWORD` is a Vercel *sensitive*
variable and cannot be read back, and a password does not belong in a commit or a transcript, so the
check returned a hash and a length rather than the value. Anyone repeating it should do the same.

### Preview branching was off, and is now on

**CAN-18 recorded that automated preview branching "is not exposed as a toggle on either dashboard".
That is wrong, and being wrong about it is why no branch was ever created.** It is exposed, on the
Vercel side, at *Integrations -> Neon -> the `canoncore` resource -> Projects -> the row's menu ->
Update Project Connection*. The dialog is *Configure canoncore* and it carries a **Create Database
Branch For Deployment** control with `Preview` and `Production` checkboxes.

Half of the CAN-18 sentence holds: **Neon's own dashboard genuinely has nothing.** Its Integrations
page lists Vercel under *Added* and offers a single "Manage Neon subscription" button, which hands
straight back to Vercel. Looking there and concluding the feature is absent is the easy mistake, and
it is the one that was made.

**The checkboxes are greyed out until `Require Active Resource Before Deploy` reads `Required`.**
That is what makes the setting so easy to miss even on the right page: it is not absent, it is
disabled behind a second setting, and a greyed-out control reads like an unavailable feature rather
than an unmet prerequisite. Neon's
[preview branching guide](https://neon.com/docs/guides/vercel-native-integration-previews) gives the
same order, telling you to toggle `Required -> Preview` and to ensure "Resource must be active before
deployment is also on".

**Read from the Neon dashboard on 12 August 2026, before any change was made:** the project's branch
list showed **`1 / 5000 Branch`** and `main` alone, no parent, created two days earlier. That is the
direct look at Neon's branch list which
[CAN-45](https://linear.app/jacobrees-canoncore/issue/CAN-45) said would settle it. It settles it: the repository's
first preview deployment ([PR #59](https://github.com/jacobrees-canoncore/CanonCore/pull/59), commit
`3d9eea9`) created no branch, with the consequence recorded above:
a preview composing its connection string from `NEON_PGHOST` would have reached production's host.

Set on 12 August 2026 by CAN-45, on the `canoncore` project's connection:

| Setting | Value |
| --- | --- |
| Require Active Resource Before Deploy | **Required** |
| Create Database Branch For Deployment | **`Preview`** only. `Production` deliberately left unchecked |

`Production` is unchecked because production must run against `main` itself, not a per-deployment
copy of it. **Turning `Required` on is not free, and was accepted knowingly**: it gates *production*
deploys as well, so a deploy now fails if the Neon resource is unavailable instead of building
without it. That is the price of the `Preview` checkbox and there is no way to pay only part of it.

**Neither of CAN-22's two checks can detect this, before or after the change, and both must be
retired.** That matters more than it sounds: they are the obvious things to reach for, and both
return the same answer whether branching is on or off.

| CAN-22's check | Why it proves nothing |
| --- | --- |
| `NEON_PGHOST` in `vercel env pull`, preview against production | Per Neon's guide the branch variables are "injected via webhook at deployment time" and "cannot be accessed or viewed in your Vercel project's environment variable settings". `vercel env pull` reads project-level values, so it still shows one static host for all three environments |
| The preview build log, searched for Neon activity | **Still completely silent.** The branch is created by the platform out of band, not by the build. The only line matching "branch" is still the git clone |

**Only Neon's branch list answers the question.** That is the check to repeat.

### What a preview branch actually looks like

Observed on the first preview deployment after the change, 12 August 2026:

| | |
| --- | --- |
| Branch | `preview/jacobreesnew/can-45-preview-deployments-do-not-appear-to-get-their-own-neon` |
| Id, parent | `br-restless-bread-za5ebaq1`, parent `main` |
| Created by | **Vercel**, at 12:51:21 +01:00, two seconds before the build started |
| Carries | `canoncore_app` and `canoncore_migrator`, both stamped created two days earlier, i.e. copied from `main` rather than issued fresh |

The credentials on it were compared against `main`'s under *Where the credentials live* above, which
is where that table stays: it is the evidence for the composed URL and belongs next to the claim it
supports, not here with the branch's shape.

The branch name is `preview/` plus the **git branch**, so it is one branch per git branch and not one
per deployment: the second push to the same branch reused it rather than making another.

**A branch is created even when the build fails.** The one above was created by the deployment that
errored on `The specified Root Directory "apps/web" does not exist`, and survived to serve the
successful build a minute later. **That error was not the Root Directory setting being wrong** — it is
`apps/web` and has been since CAN-22, as recorded above. The branch being built simply predated
CAN-22's merge and so did not contain that directory yet; rebasing onto `main` fixed it. A stale
branch, not a broken project.

So a failed preview still costs a Neon branch. They are cleaned up rather than kept forever, but not
promptly: Neon deletes a preview branch "when their corresponding Vercel deployments are removed",
and that "depends on Vercel's deployment retention policy, which retains preview deployments for
6 months by default", so branches "can persist long after a PR is closed"
([preview branching](https://neon.com/docs/guides/vercel-native-integration-previews)). Budget for
one live branch per git branch that has ever had a preview, not per open PR.

**That persistence is now measured rather than quoted, on CAN-47.** CAN-46's branch outlived
everything that made it:

| | |
| --- | --- |
| Branch | `preview/CAN-46-pr-skills-say-skeleton-missing`, `br-rapid-boat-zav226ha` |
| Created by | Vercel, 12 August 2026 15:44:25Z |
| Its PR | [#63](https://github.com/jacobrees-canoncore/CanonCore/pull/63), **merged 15:48:18Z**, three minutes later |
| Its git branch | **deleted from `origin`** by that merge |
| The Neon branch, 24 minutes after the merge | `current_state: ready`. Still there |

**What survives is the storage, not the compute.** That branch's compute suspended itself at
15:49:30Z, five minutes after its last activity, and now reads `current_state: idle`, so an abandoned
preview branch is not a running instance quietly billing.

Its storage is not zero, and its two numbers say different things. It reports a `logical_size` of
30941184 bytes against `main`'s 30892032, because that figure is the data it *can see* rather than the
data it holds. What it has written of its own is `written_data_bytes: 0`, because it is copy-on-write
from `main` (`init_source: parent-data`). So the marginal cost of an idle preview branch is its
divergence from the parent rather than another 30 MB, and it stays that way until something writes
to it.

**`parent-data` is not a setting, and cannot be switched off.** Decided 13 August 2026: a preview
must not hold a clone of production rows. CAN-70 (*Close out the domain and integration loose ends
only a human can reach*) went to flip the integration to schema-only branches and established that
no such switch exists anywhere — not in Vercel (the store's Settings page, the installation
settings, or the Update Project Connection dialog, whose whole surface is environments, the
Preview/Production branch checkboxes and the variable prefix) and not in the Neon console (project
Settings; Integrations → Vercel links straight back to Vercel). Both dashboards read on 13 August
2026. Neon's schema-only branching is an `init_source: schema-only` option at branch-creation time
only (Console, CLI or API, and Beta); the integration's webhook always creates `parent-data`
branches. Unticking Preview would send previews back to sharing `main` — the state CAN-45 fixed —
so the decision moves to **CAN-79 Previews clone production rows, and the integration has no switch
to stop it**, which owns creating schema-only branches in CI instead.

Both readings above came from the `neon` MCP rather than the dashboard, which is what
*Which tool owns what* in `CLAUDE.md` now points at for exactly this.

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

> **No deployment has read this variable**, and CAN-22 did not change that. `apps/web` now exists
> and deploys, but nothing in it reads an environment variable, so the first read still has not
> happened. That a production and a preview build receive it remains a platform guarantee rather
> than an observation. It falls to the first ticket that consumes a credential — CAN-23 for the
> database, CAN-26 for TMDB.

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

### Why three MCP servers are user scope

`neon`, `sentry` and `next-devtools-mcp` are configured at user scope rather than in a committed
`.mcp.json`. A committed file is tempting, since all three were installed for this project and the
two remote entries carry no credential. But none of them is pinned to a CanonCore resource:
`mcp.neon.tech` and `mcp.sentry.dev` serve whichever account Jacob signs in as, and
`next-devtools-mcp` discovers whatever dev server is running. They are keyed to him rather than to
this repo, which is the same test that puts `macos-mail-mcp` in user scope. Move them only if one
gains repo-specific configuration, or if a second person ever needs this tooling reproducible.

A second reason to hold the line while this is a solo repo: project-scoped servers normally prompt
for approval, but `claude -p` runs, Agent SDK sessions and cloud sessions cannot show that prompt
and load project-scoped servers without asking
([MCP docs](https://code.claude.com/docs/en/mcp)).

The `resend` MCP is the exception and is scoped to this project in `.claude/settings.json`, because
it is pinned to this product's own Resend account and domain.

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

The correction matters in one direction only. **A new subdomain does not resolve until someone adds
a record for it**, so anything assuming a hostname is already live — a preview alias, a sending
subdomain, a future service — has to add its own. Why the cutover needed no change is not
established by this observation and is no longer claimed here.

**The `demo` CNAME was removed on 13 August 2026** by CAN-70 (*Close out the domain and integration
loose ends only a human can reach*). `canoncore-demo`, the project it pointed at, was deleted earlier
the same day, which left the record dangling at `bc3b9806163bfed9.vercel-dns-017.com.` with no Vercel
project claiming the hostname — the classic setup for a subdomain takeover, since anyone who could
claim that name at Vercel would serve under `demo.canoncore.com`. Verified gone from the
authoritative nameserver the same day.

**CAA is published, and says Let's Encrypt only.** Decided and added on 13 August 2026, CAN-70:

| Type | Host | Value |
| --- | --- | --- |
| CAA | `@` | `0 issue "letsencrypt.org"` |

Vercel issues certificates through Let's Encrypt and its documentation requires exactly this record
where any CAA exists ([Troubleshooting domains](https://vercel.com/docs/domains/troubleshooting#missing-caa-records)),
so the record constrains every other CA without touching the one doing the issuing. What happened to
the CAA records CAN-18 recorded (`pki.goog`, `sectigo.com`) was never established — CAN-20's zone
inventory already listed none — but they could not have been right for this stack: had they existed,
certificate issuance for `www.canoncore.com` would have failed until `letsencrypt.org` was allowed.
If Vercel ever changes CA, renewal fails visibly and this record is the fix.

**The `google-site-verification` TXT at the apex is ours, and it stays.** The audit flagged it as a
standing proof-of-control of unknown origin. Accounted for on 13 August 2026, CAN-70: it verifies
the Search Console domain property `sc-domain:canoncore.com` on Jacob's `jacobreesnew@gmail.com`
account, added 30 November 2025, method "Domain name provider" — which is DNS, the only method a
domain property accepts, and the zone holds exactly one such token while the property still reads
"Successfully verified", so the token is that property's. Removing it would unverify the property.

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
| `TXT` | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@mail.canoncore.com,mailto:re+wgfzjdbnxfr@dmarc.postmarkapp.com;` | |

`send.mail` is the Return-Path: Resend defaults it to `send.<domain>`, which is why the sending
domain is `mail.canoncore.com` and the bounce path is `send.mail.canoncore.com`. Do not make the
Return-Path a name you also send from — AWS, whose MAIL FROM machinery this is, says it "shouldn't be
a subdomain that you also use to send email from"
([Custom MAIL FROM](https://docs.aws.amazon.com/ses/latest/dg/mail-from.html)), and the zone
previously violated exactly that.

**The DMARC reporting address must stay inside `canoncore.com` — or be a destination that publishes
the authorising record.** RFC 7489 §7.1 makes an external `rua` conditional on the destination
domain publishing an authorising record, and a personal iCloud or Gmail address will never do so, so
reports sent there would be discarded in silence. `dmarc@mail.canoncore.com` is within the same
Organizational Domain and needs no such record. That is the reason receiving is enabled at all.

**A human now reads the reports.** The audit's finding 8 was that `dmarc@mail.canoncore.com` is an
inbox only the Resend API can read, and this file itself says an API-only inbox is not monitoring.
Resolved on 13 August 2026 by CAN-70 (*Close out the domain and integration loose ends only a human
can reach*): a second `rua` destination, `re+wgfzjdbnxfr@dmarc.postmarkapp.com`, is Postmark's free
DMARC digest service, which processes the aggregate reports and emails a weekly human-readable
summary to `jacobrees@icloud.com`. It is the RFC-compliant kind of external destination:
`canoncore.com._report._dmarc.dmarc.postmarkapp.com` resolves to `v=DMARC1;`, verified 13 August
2026. No account or card sits behind it — the signup is email plus domain. The Resend destination
stays as the raw archive; Postmark is the reader.

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

All three projects still name `noreply@canoncore.com` as `EMAIL_FROM`. What that is worth now is
below.

> **That key is live, it is not ours to revoke, and the risk was accepted on 10 August 2026.**
> [CAN-41](https://linear.app/jacobrees-canoncore/issue/CAN-41/account-for-the-resend-key-three-older-vercel-projects-still-carry-on)
> was closed without acting on it: the owning account was never identified, no owner was told, and the
> variable is still stored non-sensitive on all three projects.

What the acceptance rests on:

- **It cannot reach this account's sending path.** The key is not on this account, so it cannot send
  from `mail.canoncore.com`. Nothing publishes a DKIM key for `canoncore.com` any more, since CAN-20
  deleted both the domain entry and the zone's records, above. So mail claiming
  `noreply@canoncore.com` is unsigned and unaligned as of 10 August 2026. Read that as a reason such
  mail fails scrutiny, not as proof it fails delivery: `_dmarc.canoncore.com` is `p=none`, which
  reports rather than rejects.
- **Nothing on `canoncore.com` reaches those projects.** `canoncore-legacy` and `canoncore-demo`
  serve only their own `.vercel.app` domains since CAN-18, per the table above, and
  `canoncore-storybook` has no production URL at all. No code in this repository reads the variable.
- **Reading the value takes access to this Vercel account.** Non-sensitive storage is what makes it
  readable at all: Vercel hides a Sensitive variable in the dashboard and will not return its value
  ([Sensitive environment variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables)),
  which is why the comparison above was possible for these three and not for `canoncore-rebuild`. The
  exposure is therefore bounded by who can sign in to `jacobreesnew-7380's projects`, under *The
  account* above. **Who that is was not enumerated, and that bound is the whole of the argument.**
- **What remains is someone else's credential on someone else's account**, with no mechanism here to
  revoke it.

**What would reopen it.** Any of: the owning account becomes identifiable; anyone else gains access
to `jacobreesnew-7380's projects`; or `canoncore.com` is verified on a Resend account again, which
would give a key that names it somewhere to send from.

**The first condition fired on 13 August 2026: the owning account is identifiable, and it is
Jacob's own.** CAN-70 (*Close out the domain and integration loose ends only a human can reach*)
searched Mail.app and found exactly two "Welcome to Resend!" signup messages: 27 November 2025 to
`jacobreesnew@gmail.com` and 28 December 2025 to `jacobrees@me.com`. The first is this account — its
date matches the two `Onboarding` keys created 27 November 2025 in the revocation table above, its
team slug `jacobreesnew` matches the quota alerts the mailbox holds, and the dashboard session
confirms the signed-in email. That leaves the 28 December signup, `jacobrees@me.com`, as the other
account — the same date the stray `canoncore` Neon store and the old Vercel-era resources were
created. "Someone else's credential on someone else's account" is therefore wrong in the way that
helps: Jacob can sign in to the `jacobrees@me.com` Resend account and revoke the orphaned key
himself. That revocation has not been done yet and is the remaining step.

Deleting the three projects, or removing `RESEND_API_KEY` from each, would end the exposure at this
end. Neither was done, and nothing depends on those projects.

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

## Reporting address

Decided by CAN-21, which wrote the documents; **created by
[CAN-44](https://linear.app/jacobrees-canoncore/issue/CAN-44)**, which is where the remaining steps live
now that CAN-21 is closed. **Not yet provisioned.** The Online Safety Act requires a reporting route that works
for people who have no account and are not users at all (`s.20(5)` affected persons), and the Codes
require it to be easy to find and use. What that needs is in
[`docs/compliance/code-measures-register.md`](compliance/code-measures-register.md); this section records
the address itself.

| | |
| --- | --- |
| Address | `report@canoncore.com` |
| Mechanism | Namecheap free email forwarding on the apex, forwarding to Jacob's iCloud |
| Status | **Not created.** No MX record for the apex exists yet |

**It is on the apex, not on `mail.canoncore.com`.** That is a change from CAN-21's original wording,
which assumed the Resend inbound domain. Resend receives at `*@mail.canoncore.com`, but that mailbox is
readable only through the API, and **an inbox only an API can read is not "monitored by a human"**. The
duty is to have reports reach a person. Forwarding to a mailbox Jacob already reads is the simplest thing
that makes that true, and it needs no application code, so it does not wait on `apps/web`.

**This does not disturb the Resend setup.** `mail.canoncore.com` and `send.mail.canoncore.com` keep their
own MX records and are untouched; the apex currently has none. Adding one for forwarding affects
receiving only, so SPF, DKIM and the DMARC policy above are unaffected, and `www` is untouched, so
[ADR-0010](adr/0010-canonical-host-www.md) still holds.

**Outstanding, with the ticket that owns each.** The split matters: the first two are acts on someone
else's dashboard and in a mailbox, which is why they sit on the human-only ticket, while the third needs
application code and cannot land before `apps/web` exists.

| | Owner |
| --- | --- |
| Add the apex MX record and the forwarding rule at Namecheap | [CAN-44](https://linear.app/jacobrees-canoncore/issue/CAN-44) |
| Send a test message to `report@canoncore.com` and confirm it arrives, reading the destination mailbox with `macos-mail-mcp`. **A forward that silently fails is worse than no address**, because the published document promises a person that reports are read | [CAN-44](https://linear.app/jacobrees-canoncore/issue/CAN-44) |
| Make the address available to the application as configuration rather than hard-coded, so the two public documents and the reporting route cannot drift apart | [CAN-32](https://linear.app/jacobrees-canoncore/issue/CAN-32) |

**The reporting route itself is not finished by this address.** ICU D2.2(a) recommends a report control on
each publicly visible record, which v1 does not ship; it is recorded as an alternative measure in
[`docs/compliance/code-measures-register.md`](compliance/code-measures-register.md) and built by
[CAN-43](https://linear.app/jacobrees-canoncore/issue/CAN-43), deliberately outside v1.

> **CAN-21 closed with this unticked, and its wording was already out of date** — its criterion said the
> address exists "on `mail.canoncore.com`", when the decision moved it to the apex for the reason above.
> CAN-44 carries the corrected version. Nothing here is owned by a closed ticket.

## Holding page

`www.canoncore.com` serves `apps/web`, a Next.js application, and its one route renders the same
copy the static holding page carried. **CAN-22 deleted `public/index.html` and the root
`vercel.json`** that served it, as this section previously said it would.

The page still says the product is being rebuilt, because it is. What changed at CAN-22 is the
mechanism, not the message: the point of the walking skeleton is to prove the path from a push to a
public URL, and holding the copy still lets a stranger's view of production stay honest while that
path is replaced underneath it.

Two things about the deleted files are worth keeping, because they are what the setting rows in
**Hosting** above are protecting against. The static page was first deployed from a temporary
directory with `vercel deploy --prod`, which was a mistake: **any** push to `main` triggers a
production build, and a build of a repository with no application produces a 404, so a
documentation-only merge would have taken the site down. And the old `vercel.json` set
`outputDirectory` to `public` to keep the served surface to that one file; the Next.js preset now
decides the output directory, which is why nothing replaces that file.
