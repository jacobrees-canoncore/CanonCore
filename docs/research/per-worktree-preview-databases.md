# A database per worktree, not a database per person

**What this is.** [ADR-0023](../adr/0023-one-shared-schema-only-preview-branch.md) gave every preview
deployment one shared Neon branch, and it accepted "two concurrent previews share one database" as a
cost on the stated grounds that work here is *"solo with one branch open at a time"*. That premise is
false. On 17 August 2026 six CanonCore Orca worktrees were open simultaneously and sixty-one Neon
preview branches had accumulated. This is the primary-source investigation into whether each worktree
can instead have its own database holding no production row — what Neon allows, what Vercel can
deliver, whether the race that killed the rejected design still exists, and what the shared branch
costs in the meantime. Read 17 August 2026 against Neon's own documentation and OpenAPI specification,
Vercel's own documentation, CLI and OpenAPI specification, the Drizzle source in `node_modules`, and
the `orca` CLI's own `--help`. No blog, no secondary write-up.

**The headline is that the race ADR-0023 rejected the per-branch design over does not exist here, and
the shared branch has a hazard ADR-0023 did not know about.** Orca creates a worktree *before* any
push, so a branch-scoped Vercel variable can exist before the first deployment is ever created. And
`drizzle-kit migrate` decides what to apply by comparing timestamps against a single high-water mark,
so two worktrees sharing one database can silently and permanently skip one of their migrations.

> **Corrected 21 August 2026, when this was built.** The first half of that headline is wrong, and
> the way it is wrong is worth keeping rather than editing away. **Vercel refuses a branch-scoped
> variable for a git branch that is not on the connected repository** — `POST
> /v10/projects/canoncore/env` answers `BAD_REQUEST` / `branch_not_found`, read against the API
> directly and not only through the CLI. So Orca's timing is necessary and **not sufficient**: the
> variable cannot exist before the branch does, and the push that creates the branch is the push that
> creates the first deployment. Every section below that reasons from "the race is dissolved because
> Orca is early" inherits this error.
>
> **What this document did not do is check that the write it was designing would be accepted**, and
> that is the general lesson in it: it established the *timing* requirement from Vercel's own
> documentation and then treated meeting the timing as meeting the requirement. The remedy is one
> API call, and it was available the whole time.
>
> **The design survives, by creating the branch on GitHub without pushing to it.** `gh api …
> git/refs` fires GitHub's `create` event rather than `push`, so Vercel starts no build; the branch
> exists, the variable is accepted, and the first real push already reads the worktree's own
> database. [ADR-0025](../adr/0025-a-preview-database-per-worktree.md) holds the design as built.
>
> **Three of the seven open questions at the end are now answered**, and two of the answers differ
> from what this document expected — see *What could not be established from a primary source*,
> where each is marked.
>
> The second half of the headline — the Drizzle hazard — was confirmed and is what carried the
> decision.

## Contents

- [The answer, in one paragraph](#the-answer-in-one-paragraph)
- [What was read back from the live account](#what-was-read-back-from-the-live-account)
- [Neon: what a per-worktree branch would be](#neon-what-a-per-worktree-branch-would-be)
- [Vercel: delivering one host to one preview](#vercel-delivering-one-host-to-one-preview)
- [The race, and why Orca dissolves it](#the-race-and-why-orca-dissolves-it)
- [The Drizzle hazard on a shared database](#the-drizzle-hazard-on-a-shared-database)
- [Cleanup at scale](#cleanup-at-scale)
- [The recommended design](#the-recommended-design)
- [What it costs](#what-it-costs)
- [What could not be established from a primary source](#what-could-not-be-established-from-a-primary-source)

## The answer, in one paragraph

**Yes, and the mechanism is a child branch of `preview` plus one branch-scoped Vercel variable, created
by an `orca.yaml` setup hook at worktree-creation time.** A child branch is a copy-on-write clone of
its parent; `preview` holds no row, so its children hold no row. Children are ordinary branches, so
they spend the *total* branch allowance (10 included on Launch) rather than the *root* allowance (5),
and the root cap stops being the binding constraint. Vercel supports a Preview variable scoped to one
git branch, and such a variable *"will override other preview environment variables with the same
name"*. Only `NEON_PGHOST` needs to be per-branch, because
[`apps/web/src/db/database-url.ts`](../../apps/web/src/db/database-url.ts) composes the connection
string rather than reading one. And the design degrades safely: a branch with no variable of its own
falls back to the shared `preview` branch, which is today's behaviour, so the worst case is the
status quo rather than an outage.

## What was read back from the live account

Read 17 August 2026 through the `neon` MCP and the authenticated `vercel` CLI, so the numbers below
are observations rather than assumptions.

| | |
| --- | --- |
| Neon organisation | `org-silent-cell-49503934`, *"Vercel: jacobreesnew-7380's projects"*, `"plan": "launch"`, `"managed_by": "vercel"` |
| Neon project | `steep-wave-52467839`, name `canoncore`, `aws-eu-west-2` |
| Branches | **Two.** `main` = `br-morning-pine-zaakux5b`, `preview` = `br-calm-flower-zame56ly` |
| Computes | **Two**, one per branch: `ep-aged-moon-zaujrwy4` (main, `active`) and `ep-floral-meadow-za2ibgdu` (preview, `idle`) |
| Default endpoint settings | `autoscaling_limit_min_cu: 1`, `autoscaling_limit_max_cu: 1`, `suspend_timeout_seconds: 0` |
| Vercel project | `canoncore` under team `jacobreesnew-7380s-projects` |
| Preview variables | **Twelve, none branch-scoped.** `NEON_PGHOST` and `NEON_PGDATABASE` are Non-sensitive and one hour old at the time of reading |
| Local `vercel` CLI | **58.7.1, authenticated** as `jacobreesvercel`; `vercel env ls preview --project canoncore` works from an unlinked worktree |
| `neonctl` | **Not installed** (`which neonctl` finds nothing), and this repository holds no Neon API key |

`suspend_timeout_seconds: 0` is not "never suspend". Neon's OpenAPI specification says of that field:
*"`0` uses the plan default; `-1` disables scale-to-zero (never suspends). Minimum is plan-dependent
(Scale: 60); maximum 604800 (one week). Free cannot change it; **Launch can only enable or disable**;
Scale can set any value."* (<https://neon.com/api_spec/release/v2.json>,
`components.schemas.BranchCreateRequestEndpointOptions.suspend_timeout_seconds`). So every branch
created here inherits the Launch scale-to-zero interval and **the interval cannot be shortened on this
plan** — worth knowing before anyone proposes trimming idle preview computes to save money.

## Neon: what a per-worktree branch would be

### The two allowances are different numbers, and only one of them is scarce

They are documented on different pages and are easy to conflate.

**Root branches, per project:**

| Plan | Root branch allowance | Max storage per schema-only branch |
| --- | ---: | ---: |
| Free | 3 | 0.5 GB |
| Launch | **5** | 3 GB |
| Scale | 25 | 20 GB |

Source: <https://neon.com/docs/guides/branching-schema-only>, *Schema-only branch allowances*, and the
same table on <https://neon.com/docs/manage/branches>. Root branch allowances *"include the primary
branch and certain backup branches"*, and exceeding the limit requires removing an existing root
branch before another can be created.

**Total branches, per project:**

| Plan | Included branches | Extra branches | Hard cap |
| --- | ---: | --- | ---: |
| Free | 10/project | — | — |
| Launch | **10/project** | **$1.50/branch-month (prorated hourly)** | 5,000 |
| Scale | 25/project | $1.50/branch-month (prorated hourly) | 5,000 |

Source: <https://neon.com/docs/introduction/plans> (plan comparison table) and <https://neon.com/pricing>,
which states *"Branches are capped at 5,000 per project on paid plans (10/25 included)"*.

**This is the whole reason the design is possible.** ADR-0023's cost section named *"Two of five root
branches"* and its *What will try to reopen it* section anticipated *"the five-root-branch ceiling …
It is an argument for a plan or for child branches of `preview`, not for cloning production."* That
anticipation is correct and the numbers now say so: children of `preview` spend the ten-branch
allowance, not the five-root one, and sixty-one branches existed on this project a day ago without
Neon refusing a single one.

### A schema-only branch is a root; a child of one is not

Neon on schema-only branches, verbatim: *"Schema-only branches are independent root branches, just
like the `production` branch in your Neon project."* Its four key points are that there is **no parent
branch**, that **reset from parent is not supported** (*"With no parent branch, reset from parent
operations are not supported"*), that **restore is supported but copies data** (*"performing a restore
operation on a schema-only branch copies both schema and data from the source branch"*), and that
**branch protection is supported**. (<https://neon.com/docs/guides/branching-schema-only>.)

A child branch is defined on <https://neon.com/docs/manage/branches> as *"a copy-on-write clone of the
parent branch. You can modify the data in a branch without affecting the data in the parent branch"*,
and on <https://neon.com/docs/introduction/branching> as diverging at the moment of creation: *"A branch
and its parent can share the same data but diverge at the point of branch creation."*

**So a child of `preview` contains exactly what `preview` contains at that instant: the full schema, the
grants, the row-level security policies, the seeded `drizzle.__drizzle_migrations`, and no row of
production data.** That last item is a gain ADR-0023's provisioning notes make vivid: the schema-only
root *"arrived empty"* in its Drizzle journal, which
[`docs/infrastructure.md`](../infrastructure.md) → *The shared preview branch* calls *"the one trap in
provisioning it"*. A child inherits `preview`'s already-seeded journal and has no such trap.

**The one thing the documentation does not say in so many words is that a schema-only branch may have
children at all.** Neon's schema-only page has no limitations section that forbids it, and it says
these branches are root branches *"just like the `production` branch"* — which demonstrably does have
children. The List-branches description in the OpenAPI specification is a general statement in the same
direction: *"A project may contain child branches that were branched from `main` or from another
branch."* That is a strong inference, and it is still an inference. See
[what could not be established](#what-could-not-be-established-from-a-primary-source) for the single
API call that settles it.

### `init_source: parent-schema` is a second, possibly better shape

Neon's API documents four initialisation sources, verbatim from
<https://neon.com/docs/reference/api/branches/create-project-branch> and from the OpenAPI specification
at <https://neon.com/api_spec/release/v2.json>:

> Source of initialization for the branch. `parent-data` copies schema and data from the parent branch.
> `parent-schema` copies schema only from the parent branch. `schema-only` creates a new root branch
> containing schema only, using `parent_id` as the source; optionally, `parent_lsn` or
> `parent_timestamp` can narrow the source point. `import` initializes the branch from an external
> import.

Note what separates the middle two: **`schema-only` is documented as creating a *root* branch; `parent-schema`
is not.** If `parent-schema` creates an ordinary child carrying only the parent's schema, then a
per-worktree branch could be taken straight from `main` — current schema, no rows, no dependence on
`preview` being kept level. That would be strictly better.

**It is not established that it does.** `docs/infrastructure.md` records that the `preview` branch,
created through the Console's *Schema only* option, **reads back as `init_source: parent-schema` with
`parent_id` absent**. So the response value does not discriminate between the two, and the possibility
that a `parent-schema` request is normalised into a schema-only root — which would spend a root branch
per worktree and blow the allowance at five — cannot be ruled out from the documents. The safe design
below uses ordinary `parent-data` children of `preview`, which relies only on copy-on-write semantics
that are documented plainly.

### Neither the MCP nor a bare CLI is a complete tool

- **`mcp__neon__create_branch` has no `init_source` parameter.** Its schema exposes `projectId`,
  `branchName`, `parentId` and `expiresAt` and nothing else, which is what
  `docs/infrastructure.md` already records as producing a silent `parent-data` clone. **For this design
  that is not a defect**: `parent-data` from a data-free parent is exactly what is wanted, and
  `parentId` is present. The MCP can create the branch an agent needs.
- **`neonctl` is not installed here.** Its `branches create` command documents `--schema-only`
  (*"Create a schema-only branch. Requires exactly one read-write compute."*), `--parent`, `--cu`,
  `--suspend-timeout`, `--expires-at` and `--psql`
  (<https://neon.com/docs/reference/cli-branches>). A shell hook would need it installed and
  authenticated, or a plain `curl` against the API.
- **A credential would be needed for a hook**, and Neon offers the narrow one:
  a **project-scoped API key**, creatable by an organisation administrator, with *"Editor access"* on a
  single project — it *"can read and modify project resources but cannot delete the project or manage
  who can access it"* and *"Cannot perform organization-related actions or create new projects"*
  (<https://neon.com/docs/manage/api-keys>). Created with
  `POST /organizations/{org_id}/api_keys` carrying `{"key_name": …, "project_id": …}`.

### Two limits that will bite before the branch cap does

- **Concurrently active computes.** Neon caps them: the error is
  *"You have exceeded the limit of concurrently active endpoints"*, also seen as
  `active endpoints limit exceeded`, and *"additional compute instances beyond the cap stay suspended"*
  (<https://neon.com/docs/connect/connection-errors>). The remedy documented there is to suspend other
  computes or ask support to raise `max_active_endpoints`. **The numeric default was not established
  from any Neon page read for this document** — see the last section.
- **Branch archiving.** A branch is archived when it is *"Older than 14 days"* **and** has *"not been
  accessed for the past 24 hours"*, both conditions required; branches with computes running, with an
  unarchived child, in transition, or protected are exempt. Unarchiving is automatic on access, and
  *"When a branch is unarchived, its parent branches, all the way up to the root branch, are also
  unarchived."* Paid plans additionally enforce a **100 unarchived branch limit per project**, past
  which Neon archives *"without waiting"*. (<https://neon.com/docs/guides/branch-archiving>.) For
  worktree branches this is harmless and mildly useful: a fortnight-old abandoned preview costs less.

## Vercel: delivering one host to one preview

### A Preview variable can be scoped to one git branch, and it wins

Verbatim from <https://vercel.com/docs/environment-variables>, *Preview environment variables*:

> Preview environment variables are applied to deployments from any Git branch that does not match the
> Production Branch. When you add a preview environment variable, you can choose to apply to all
> non-production branches or you can select a specific branch.
>
> **Any branch-specific variables will override other preview environment variables with the same
> name.** This means you don't need to replicate all your existing preview environment variables for
> each branch – you only need to add the values you wish to override.

That is the override rule, stated by Vercel, in one sentence, and it is exactly the semantics the
design needs: set `NEON_PGHOST` for one branch, leave the other eleven Preview variables alone, and a
branch with no override keeps the shared value.

The REST API says the same with a constraint attached. `POST /v10/projects/{idOrName}/env` takes a
`gitBranch` field: *"If defined, the git branch of the environment variable (must have
target=preview)"*, `maxLength: 250`, nullable
(<https://vercel.com/docs/rest-api/reference/endpoints/projects/create-one-or-more-environment-variables>).
Passing `?upsert=true` updates rather than failing on an existing variable.

### The installed CLI's flags, which differ from the published page

The documentation page <https://vercel.com/docs/cli/env> gives the branch as a **positional**:
`vercel env add [name] [environment] [gitbranch]`. **The CLI installed here does not.** `vercel env add
--help` on 58.7.1 reports `vercel env add name [environment] [options]` with:

```
--git-branch <NAME>   Set the Git branch for a Preview Environment Variable
--value <VALUE>       Set the variable value for non-interactive use; otherwise use stdin or the prompt
--force               Overwrite an existing variable for the same target
--no-sensitive        Store the value as non-sensitive when policy allows
--project <NAME_OR_ID> Project name or ID (defaults to the linked project)
```

Three consequences, each of which would otherwise be found the hard way:

1. **`--no-sensitive` is required to match the existing variables.** The CLI *"defaults to `sensitive`
   for production, preview, and custom environments"* (<https://vercel.com/docs/cli/env>), while the
   live `NEON_PGHOST` is Non-sensitive — deliberately, because
   `docs/infrastructure.md` records that a value nothing can read back is a value nothing can gate, and
   `scripts/check-docs.ts` gates it.
2. **`--project canoncore` removes the need for `vercel link`**, which matters because `.vercel/` is
   gitignored and so a fresh Orca worktree is never linked. Confirmed working: `vercel env ls preview
   --project canoncore` listed twelve variables from this unlinked worktree.
3. **`vercel env rm` has no `--git-branch` flag at all** on 58.7.1 — its help shows only
   `vercel env remove name [environment]` with `--project` and `--yes`. And `vercel env ls --json`
   returns only `configurationId, createdAt, key, target, type, updatedAt, value` — **no `id` and no
   `gitBranch`**. So the CLI can create a branch-scoped variable but cannot reliably identify or delete
   one. Removal must go through the API: `GET /v10/projects/canoncore/env?gitBranch=<branch>` returns
   `id` and `gitBranch`, then `DELETE /v9/projects/canoncore/env/{id}`. Both endpoints were confirmed
   present in Vercel's own OpenAPI specification.

### There is no way to set a variable on a deployment, and this was established by enumeration

Vercel's OpenAPI specification (<https://openapi.vercel.sh/>, 279 paths, downloaded 17 August 2026)
contains **no path matching both "deployment" and "env"**. Every environment-variable endpoint is
project-scoped or team-shared: `/v1/env`, `/v1/env/{id}`, `/v1/env/{id}/unlink/{projectId}`,
`/v10/projects/{idOrName}/env`, `/v1/projects/{idOrName}/env`, `/v1/projects/{idOrName}/env/{id}`,
`/v9/projects/{idOrName}/env/{id}`. And the create-deployment endpoint `POST /v13/deployments` has the
request-body properties `customEnvironmentSlugOrId, deploymentId, files, gitMetadata, gitSource, meta,
monorepoManager, name, project, projectSettings, target, withLatestCommit` — **no `env`, no
`buildEnv`**.

That is an enumeration of the whole surface rather than a failed search, which is the difference
between "not established" and "established absent". **Absent.** It confirms ADR-0023's central claim
from a stronger source than the one it cited: *"there is no API by which we could hand a value to a
build that is already running."*

**One per-deployment mechanism does exist and it is the CLI's.** `vercel deploy` documents
`--env KEY=value` (*"provide environment variables at runtime"*) and `--build-env KEY=value`
(*"provide environment variables to the build step"*), both applying to the single deployment being
created (<https://vercel.com/docs/cli/deploy>). It is not usable here without abandoning Git-triggered
previews, which [ADR-0019](../adr/0019-ci-owns-the-production-release.md) keeps deliberately on. It is
recorded because it is the only true per-deployment path and someone will find it.

### A variable never reaches a deployment that already exists

Two Vercel pages, both flat:

> Any change you make to environment variables are not applied to previous deployments, they only apply
> to new deployments. — <https://vercel.com/docs/environment-variables>

> Changes to environment variables are not applied to previous deployments, they only apply to new
> deployments. You must redeploy your project to update the value of any variables you change in the
> deployment. — <https://vercel.com/docs/environment-variables/managing-environment-variables>

**So the variable must exist before the deployment is created, not before the build finishes.** That is
the entire timing requirement, and the next section is about meeting it.

### Vercel's limits, none of which this design approaches

From <https://vercel.com/docs/limits>: *"The maximum number of Environment Variables per environment
per Project is `1000`"*; the total size of all variables is 64 KB per deployment and is also the
per-variable maximum; Hobby is limited to 100 deployments per day, 100 per hour and 60 per five
minutes. One extra variable per open worktree is nothing against 1,000, and the design adds **no**
deployments — it changes what an existing deployment reads.

## The race, and why Orca dissolves it

ADR-0023 rejected the branch-scoped-variable design on one argument, quoted in full:

> It loses on a race it cannot win: the push that opens a pull request starts the Vercel build and the
> Action at the same moment, so the **first** deployment of every new branch boots before the variable
> exists.

**That argument is correct about a GitHub Action and does not apply to a worktree hook, because Orca
creates the worktree — and its git branch — before anything is ever pushed.** `orca worktree create`
on this machine reports `--setup run|skip|inherit`, described as *"Setup policy for repo-defined setup
hooks"*, with the note *"Repo-defined setup hooks follow the repository setup policy; pass `--setup
run` to force them."*

The repo-defined hook is `scripts.setup` in a committed `orca.yaml`, and
[`docs/research/orca-gaps-and-the-worktree-workflow.md`](orca-gaps-and-the-worktree-workflow.md) —
which read Orca's own bundle and ran a probe hook rather than inferring — establishes the four facts
that matter:

- **The default `setupRunPolicy` is `run-by-default`**, so a committed script runs on a bare
  `orca worktree create`; `--setup run` only forces it past a `skip-by-default` policy. No per-machine
  settings change is needed, because the resolved `commandSourcePolicy` is already `shared-only` and
  points at the committed file.
- **The hook receives five environment variables**: `ORCA_ROOT_PATH` (the *primary checkout*, not the
  worktree), `ORCA_WORKTREE_PATH` (the new worktree), `ORCA_WORKSPACE_NAME`, and `CONDUCTOR_ROOT_PATH`
  / `GHOSTX_ROOT_PATH` repeating the primary path. Confirmed by running one.
- **`scripts.setup` is read from the new worktree**, so the file must be committed to the branch the
  lane is based on — a lane from `origin/main` sees only what `main` carries.
- **The agent starts concurrently with the hook** by default, because
  `DEFAULT_SETUP_AGENT_STARTUP_POLICY = 'start-immediately'`, and that policy has no `orca.yaml` key.

**None of that concurrency touches the race**, because the thing being raced is the first `git push`,
which happens when `/draft-pr` runs — minutes or hours after creation, never in the same instant. The
window between the hook completing and the first push is the entire authoring session.

Two details make the hook concrete. **The workspace name is not the branch name**: this worktree is
`can-79` and its branch is `refs/heads/jacobdrees/can-79`, with `pushTarget.branchName` reported as
`jacobdrees/can-79`. A hook must read the branch rather than compose it from `ORCA_WORKSPACE_NAME`.
And **the teardown side is weaker than the setup side**: `scripts.archive` runs on `worktree rm`
**only** with `--run-hooks`, which is why [cleanup](#cleanup-at-scale) is a sweeper rather than a hook.

`orca automations create` is the other surface worth naming: it takes `--trigger` (preset, 5-field cron
or RRULE), `--precheck <command>` (*"exit code 0 continues, anything else records a skipped run"*),
`--provider`, and `--workspace-mode existing|new-per-run`. It is a scheduled-agent runner, not an event
hook, so it fits the sweeper and not the create step.

## The Drizzle hazard on a shared database

This is the argument *for* changing, independent of anything above, and it was not known to ADR-0023.

### The code path, in full

`apps/web/package.json` runs `"db:migrate": "drizzle-kit migrate"`. For `dialect: "postgresql"` with a
plain connection string, drizzle-kit 0.31.10 resolves `pg` and delegates outright
(`node_modules/.pnpm/drizzle-kit@0.31.10/node_modules/drizzle-kit/bin.cjs`, around line 78880):

```js
const { migrate: migrate2 } = await import("drizzle-orm/node-postgres/migrator");
…
const migrateFn = async (config) => { return migrate2(db, config); };
```

`drizzle-orm/node-postgres/migrator.js` is three lines of substance (the ESM build, which is what `drizzle-kit`'s `await import(…)` resolves; the `.cjs` beside it is identical and never loads):

```js
async function migrate(db, config) {
  const migrations = (0, import_migrator.readMigrationFiles)(config);
  await db.dialect.migrate(migrations, db.session, config);
}
```

`readMigrationFiles` in `drizzle-orm/migrator.js` walks `meta/_journal.json` and carries each entry's
`when` through as `folderMillis`, alongside a SHA-256 of the file:

```js
migrationQueries.push({
  sql: result,
  bps: journalEntry.breakpoints,
  folderMillis: journalEntry.when,
  hash: import_node_crypto.default.createHash("sha256").update(query).digest("hex")
});
```

And `PgDialect.migrate` in `drizzle-orm/pg-core/dialect.js` is the decision — the select at line 57, the predicate at line 62 in `drizzle-orm@0.45.2`:

```js
const dbMigrations = await session.all(
  sql`select id, hash, created_at from ${…}.${…} order by created_at desc limit 1`
);
const lastDbMigration = dbMigrations[0];
await session.transaction(async (tx) => {
  for await (const migration of migrations) {
    if (!lastDbMigration || Number(lastDbMigration.created_at) < migration.folderMillis) {
      for (const stmt of migration.sql) {
        await tx.execute(sql.raw(stmt));
      }
      await tx.execute(
        sql`insert into ${…}.${…} ("hash", "created_at") values(${migration.hash}, ${migration.folderMillis})`
      );
    }
  }
});
```

**Three properties, all load-bearing.** The `hash` column is written but **never read** — it is not
consulted in any comparison. `lastDbMigration` is read **once, before the loop**, and is not refreshed
as rows are inserted. And the whole loop runs inside **one** `session.transaction`, so a failure rolls
everything back. The predicate is therefore, for every journal entry:
`max(created_at in drizzle.__drizzle_migrations) < this entry's when`.

### What that does to two parallel worktrees

The live journal at `apps/web/drizzle/meta/_journal.json` ends at `0009_grant_the_auth_role_its_own_five_tables`,
`when: 1786969580676`. Call that `T9`. Both worktrees start from a database whose maximum `created_at`
is `T9`.

| Case | What happens | Loud or silent? |
| --- | --- | --- |
| A applies `0010_foo` at `T_A`, then B applies `0010_bar` at `T_B` where **`T_B > T_A`** | `T_A < T_B`, so `0010_bar` is applied **on top of `0010_foo`**. The shared database now carries a schema change B's `schema.ts` does not declare, and A's | **Loud only by luck.** If the two files collide (`CREATE TABLE` of the same name, a duplicate column) it fails with `relation already exists` and rolls back. If they are independent it succeeds, and if A's pull request is later abandoned the shared branch keeps a change no migration in `main` produces — permanent drift |
| A applies `0010_foo` at `T_A`, then B applies `0010_bar` at `T_B` where **`T_B < T_A`** | `T_A < T_B` is **false**, so `0010_bar` is **skipped**. `drizzle-kit` exits 0 and prints success | **Silent, and permanent.** No row is inserted for `bar`, so `max(created_at)` stays `T_A` and the predicate stays false **on every future run against that database**. B's table never appears. B's preview 500s at runtime with a green migration step behind it |
| Either order, then merge | Both journals claim index `10`; `_journal.json` conflicts in git | Loud, at merge time |

**The second row is the finding.** `when` is generated by `drizzle-kit generate` from the wall clock at
generation time, so `T_B < T_A` is simply "B generated its migration before A generated theirs, and A
reached the database first" — which with parallel worktrees is not an edge case but roughly half of all
orderings. The failure it produces is exactly the shape this repository is otherwise built to refuse: a
green check over a broken preview.

**And the repository stated the opposite until this research prompted the correction.**
[`scripts/apply-migrations-ahead-of-merge.sh`](../../scripts/apply-migrations-ahead-of-merge.sh) said,
in its header and again before it ran `db:migrate` against the shared branch:

> `drizzle-kit skips any migration its journal already records, so this is re-runnable.`

That was true for the single-lane case it was written for and false as a general statement: drizzle-kit
skips by **timestamp against a high-water mark**, not by looking up what the journal records. Both
instances were corrected under **CAN-139 The migration script misdescribes how drizzle decides what to
apply, and the error hides a silent skip**, which landed in the same commit as this file — so the quoted
sentence above is a record of what was fixed rather than a description of the tree it sits in. The
script now carries the mechanism, the ordering that is silent, and the reason the count check cannot
see it.

**A branch per worktree removes the hazard entirely rather than mitigating it.** Each worktree's branch
carries its own `drizzle.__drizzle_migrations`, inherited from `preview` at `T9`; its own new migration
has `when > T9`; it applies. No two worktrees share a high-water mark, so no ordering exists in which
one silently skips the other's file.

## Cleanup at scale

### `expires_at` is documented, capped at 30 days, and its availability is contradicted by Neon's own two sources

The guide <https://neon.com/docs/guides/branch-expiration> documents it plainly:

- **Maximum 30 days** from the current time.
- **Settable at creation** via `POST /projects/{project_id}/branches` with
  `{"branch": {"name": …, "parent_id": …, "expires_at": "2026-01-29T18:02:16Z"}}`, RFC 3339 with
  second precision.
- **Settable on a branch that has a parent** — the documented example passes `parent_id` alongside it.
- **Changed or removed** with `PATCH /projects/{project_id}/branches/{branch_id}`, `expires_at: null`
  to clear.
- **CLI:** `neon branches create --expires-at "…"`, `neon branches set-expiration <branch-id> --expires-at "…"`.
- **Restrictions:** cannot expire **protected** branches, cannot expire **default** branches, and
  *"Cannot expire branches that have children or create children from expiring branches"*.
- On expiry, *"all associated compute endpoints are also deleted"*, permanently.

The restrictions are all satisfiable by a leaf worktree branch: it is neither default nor protected and
has no children. **But Neon's OpenAPI specification carries a sentence the guide does not**, on
`expires_at` in both the request and the response schema, and on `ttl_interval_seconds`:

> Access to this feature is currently limited to participants in the Early Access Program.

Two Neon primary sources disagree, and nothing read for this document resolves which is current. The
`neon` MCP's `create_branch` does expose `expiresAt`, which proves the parameter is offered but not that
this organisation's requests are honoured. **Do not build cleanup on `expires_at` until one API call has
confirmed it** — and note that the failure could be silent rather than a 4xx, since the field could be
accepted and ignored.

### A sweeper is the design that does not depend on that

Branch names carry the git branch, so a scheduled job can list Neon branches, list `origin`'s branches,
and delete every Neon branch whose git branch no longer exists. That is one `GET /projects/{id}/branches`,
one `git ls-remote --heads origin`, and a `DELETE /projects/{id}/branches/{branch_id}` per orphan; it is
idempotent, it recovers from every missed teardown rather than only the next one, and it needs no
feature flag. `orca automations create --trigger daily --precheck …` is the scheduler already present.

`orca.yaml`'s `scripts.archive` is the tempting alternative and should not be relied on alone: it runs on
`worktree rm` **only** with `--run-hooks`, so the ordinary removal path skips it silently. It is worth
adding as the fast path *in addition to* a sweeper, never instead of one.

## The recommended design

**One Neon child branch of `preview` per Orca worktree, addressed by one branch-scoped Vercel
`NEON_PGHOST`, created by an `orca.yaml` setup hook, removed by a scheduled sweeper — with the shared
`preview` branch kept exactly as it is, as the fallback.**

The last clause is the part that makes it safe and is the direct answer to ADR-0023's objection.
**Nothing in this design has a failure mode that reaches production.** If the hook does not run, if the
credential is missing, if Neon is down, if someone pushes a branch created outside Orca — the
branch-scoped variable simply does not exist, the environment-wide Preview `NEON_PGHOST` applies, and
the preview reads the shared schema-only branch. That is today's behaviour. The design degrades to the
status quo, not to an outage and not to production's rows, and
[`apps/web/src/db/database-url.ts`](../../apps/web/src/db/database-url.ts) still refuses production's
compute in every case because it compares compute ids rather than whole hostnames.

**Only `NEON_PGHOST` is per-branch.** `database-url.ts` composes the preview connection string from
`NEON_PGHOST` + `NEON_PGDATABASE` + `DATABASE_APP_USER` + `DATABASE_APP_PASSWORD`. `NEON_PGDATABASE` is
`neondb` on every branch, and a Neon role belongs to the project rather than to a branch — read back and
recorded in `docs/infrastructure.md` on 17 August 2026, along with the confirmation that grants and
policies do travel with a branch. One variable per worktree, eleven left alone.

### The steps

1. **Verify the two structural unknowns with two API calls**, before anything else is built. Create one
   throwaway child of `br-calm-flower-zame56ly` and read back `parent_id`, `init_source`, `logical_size`
   and a `select count(*) from story`. Then create one branch with `expires_at` set and read back whether
   the field survives. Delete both. Until these run, the design is unproven at its base.
2. **Create a Neon project-scoped API key** for `steep-wave-52467839`
   (`POST /organizations/org-silent-cell-49503934/api_keys` with `{"key_name": …, "project_id":
   "steep-wave-52467839"}`), and store it per-machine — never in the repository, and reflected in
   `docs/infrastructure.md`'s credential roster as a machine-local credential. This is the one genuinely
   new decision in the design and it touches
   [ADR-0016](../adr/0016-provisioning-plain-api-keys-neon-excepted.md)'s territory, so it wants an ADR
   amendment rather than a quiet addition.
3. **Commit an `orca.yaml`** whose `scripts.setup` runs `pnpm install --frozen-lockfile` (already
   recommended by [the Orca research](orca-gaps-and-the-worktree-workflow.md)) followed by a
   `scripts/provision-worktree-database.sh`. That script: reads
   `BRANCH="$(git -C "$ORCA_WORKTREE_PATH" rev-parse --abbrev-ref HEAD)"`; exits 0 immediately if the
   branch is `main`; creates the Neon branch named `wt/$BRANCH` with `parent_id:
   br-calm-flower-zame56ly`; reads the new compute's host; and sets the variable:

   ```sh
   vercel env add NEON_PGHOST preview \
     --git-branch "$BRANCH" \
     --project canoncore \
     --no-sensitive --force \
     --value "$NEW_HOST"
   ```

   It must be **idempotent and non-fatal**: a second run finds the branch and upserts the variable, and
   any failure exits 0 with a loud message, because the fallback is a working preview and a hook that
   aborts a lane over a database it may not need is worse than one that does not.
4. **Add the migration step to the lane rather than to CI.** `scripts/apply-migrations-ahead-of-merge.sh`
   currently targets the shared branch by pasted host; it should target the worktree's own branch, which
   the hook already knows. Production stays migrated by the release and by nothing else
   ([ADR-0019](../adr/0019-ci-owns-the-production-release.md)).
5. **Add the sweeper**, as an `orca automations` daily job or a `/review-pr` step, deleting Neon branches
   named `wt/*` whose git branch is gone from `origin`, and the matching Vercel variable via
   `GET /v10/projects/canoncore/env?gitBranch=<branch>` then `DELETE /v9/projects/canoncore/env/{id}`.
   Optionally set `expires_at` as a belt-and-braces second line **if step 1 proved it works**.
6. **Amend ADR-0023 rather than replace it.** Its central finding — that per-deployment binding and
   schema-only branching are exclusive, and that the integration's branches are always `parent-data` —
   is unchanged and was re-confirmed here from Vercel's OpenAPI specification. What changes is the
   premise in its cost section: *"work here is solo with one branch open at a time"* is false, and its
   own *What will try to reopen it* section already names *"a second person landing work"* and *"child
   branches of `preview`"* as the trigger and the answer. Six parallel worktrees are that trigger.

## What it costs

| | |
| --- | --- |
| **Branches** | `main` + `preview` + one per open worktree. Ten are included on Launch, so **up to eight concurrent worktrees cost nothing**. Beyond that, $1.50/branch-month **prorated hourly** ≈ $0.002/hour, so a ninth worktree alive for three days is about **$0.15**. The 5,000 cap is unreachable |
| **Root branches** | **Unchanged at two of five.** Children spend the total allowance, not the root one. This is the whole point |
| **Compute** | Each branch gets its own compute at the project default of **1 CU fixed**, billed at **$0.106/CU-hour** while active, scaling to zero on the Launch default interval — which **cannot be shortened on this plan**. A preview compute that only wakes when someone opens the preview costs on the order of one cent per wake. This is an estimate from the published rate, not a figure read off a bill |
| **Storage** | Copy-on-write from a data-free parent, so each branch's logical size is the schema plus whatever that preview writes. **$0.35/GB-month.** Negligible |
| **Vercel** | One extra Preview variable per open worktree against a limit of **1,000 per environment per project**, and no additional deployments |
| **A new credential** | A Neon project-scoped API key on this machine. This is the real cost: one more secret, in a project whose stated position is that it holds no Neon API key |
| **A hook that can fail quietly** | It exits 0 on failure by design, so a lane can come up pointing at the shared branch without anyone noticing. The mitigation is that this is *correct* behaviour rather than a bug, but it means "my preview has someone else's data in it" stays possible |
| **One more file that must be committed to `main`** | `orca.yaml`'s `scripts.setup` is read from the new worktree, so a lane based on a branch that predates the file gets nothing |
| **What it does not cost** | Any change to production, to `database-url.ts`, to the eleven other Preview variables, or to the Neon integration's settings. And it **removes** the silent-skipped-migration hazard rather than trading it for another |

## What could not be established from a primary source

Recorded as findings, because a guess dressed as a fact is the failure this section exists to prevent.

1. **ANSWERED 21 August 2026: yes.** A child of `preview` read back with `parent_id` set,
   `parent_lsn`, `parent_timestamp` and `init_source: parent-data` — an ordinary child, not a root
   branch, so it spends the ten-branch total allowance and not the five-root one. *The question as
   it stood:* **That a schema-only branch may have child branches at all.** Neon's schema-only page has no
   limitations section forbidding it and calls such branches *"independent root branches, just like the
   `production` branch"*, and the API's List-branches text says a project may contain children branched
   *"from `main` or from another branch"*. Both point the same way; neither states it. **Not checked by
   experiment**, because this was research and creating a branch is a change. One
   `POST /projects/steep-wave-52467839/branches` with `parent_id: br-calm-flower-zame56ly` settles it.
2. **ANSWERED 21 August 2026, and not as expected.** It contains no *production* row — `story`
   read `0` against production's `2` — but it inherits `preview`'s own accumulated rows, which were
   two `user` rows, both at `mail.canoncore.com` and so this project's own test mailboxes rather
   than personal data. It also inherits ownership and the fourteen-row journal, so it is migratable
   from the first run. **"Contains no row" was the wrong expectation; "contains no production row"
   is the true one.** *The question as it stood:* **That a child of `preview` contains no row.** It follows directly from the documented copy-on-write
   definition applied to a parent with no rows, and it is the safest possible inference here, but it was
   not observed. The check is `select count(*) from story` on the new branch, which is the criterion
   `docs/infrastructure.md` already insists on: *"the criterion is a row count, not a settings field"*.
3. **What `init_source: parent-schema` actually creates.** The API describes it as copying schema only
   from the parent and, unlike `schema-only`, does **not** say it makes a root branch — but the live
   `preview` branch, created as schema-only, reads back as `parent-schema` with no `parent_id`, so the
   response cannot distinguish them. If `parent-schema` yields a true child, the design gets simpler and
   drops its dependence on `preview`. Unresolved.
4. **ANSWERED 21 August 2026: it works.** A branch created with `expiresAt` read back
   `expires_at` and `ttl_interval_seconds: 22412`, so the OpenAPI specification's Early Access
   caveat does not bind this organisation and the guide is the current source. It is still not used,
   for two reasons that are not availability — [ADR-0025](../adr/0025-a-preview-database-per-worktree.md)
   → *Teardown*. *The question as it stood:* **Whether `expires_at` works on this organisation.** Neon's guide documents it with no availability
   caveat; Neon's OpenAPI specification says *"Access to this feature is currently limited to
   participants in the Early Access Program"* on every field. Two primary sources, in direct conflict,
   both current as of 17 August 2026. The recommended design therefore does not depend on it.
5. **The numeric limit on concurrently active computes.** The limit exists and its error message was
   read (<https://neon.com/docs/connect/connection-errors>), and `max_active_endpoints` is named there as
   the raisable setting. **The figure of 20 appeared only in search-result summaries and on no Neon page
   fetched for this document.** With eight concurrent worktrees plus `main` and `preview` this could
   plausibly be reached; it should be confirmed with Neon before the design is relied on at that scale.
6. **How `vercel deploy --env` delivers a per-deployment variable.** The CLI documents the flag;
   `POST /v13/deployments` in Vercel's OpenAPI specification has no `env` property. The mechanism is
   undocumented in the sources read. It does not matter for the recommendation, which does not use it.
7. **Whether the Orca setup hook completes before any git operation the agent performs.** It starts at
   worktree creation and the agent starts concurrently (`DEFAULT_SETUP_AGENT_STARTUP_POLICY =
   'start-immediately'`), so ordering against the *first push* is safe by hours; ordering against an
   agent that runs `git push` in its first seconds is not guaranteed by anything read. No such workflow
   exists here: `/implement` may now push before `/draft-pr`, but only for evidence a run on GitHub
   alone can produce (`docs/agents/workflow.md` → *When `/implement` may push*), which is a push that
   comes after the work it is evidence about rather than in the agent's first seconds.
8. **Whether the Neon Vercel integration would interact with manually-created child branches.** `Create
   Database Branch For Deployment → Preview` is off, so nothing should. Re-ticking it remains, as
   ADR-0023 says, *"the one regression here with no automated guard"* — and under this design it would
   silently override the per-worktree variable too.
