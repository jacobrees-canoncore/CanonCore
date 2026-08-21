# CanonCore
<!--
Loaded on every request. Target: under 200 lines (code.claude.com/docs/en/memory); the gate treats 200 as meeting it.
To add a line, cut one, or put it in a pointer doc instead. The seam is change cadence:
  a standing rule           -> docs/agents/*.md          (policy: changes rarely)
  a step that executes one  -> .claude/skills/*/SKILL.md (procedure: changes with the command)
  what happened, and when   -> docs/incidents.md         (evidence: only ever accumulates)
  what is provisioned now   -> docs/infrastructure.md    (register: bounded by the estate)
  a settled decision        -> docs/adr/
Per-session state (sign-ins, which account is active) is asserted nowhere; ask the tool.
Evidence for the target: docs/research/document-length-for-agents.md
-->

## Name every ticket you cite

Never write a bare ticket identifier. Every reference to a Linear issue carries its title as well as
its number — in conversation, commit messages, pull request bodies and these documents:
**CAN-30 GDPR export and erasure**, never `CAN-30`. With a hundred-plus issues here, several differing
only in scope, a bare number is easy to misread as a neighbouring ticket.
**In a Linear body the title goes *inside* the link text** — `[CAN-30 GDPR export and erasure](url)`, never `[CAN-30](url)`, whose text the GitHub sync rewrites into a GitHub number naming a *different* ticket while the link still points here: `docs/agents/issue-tracker.md`.

## Prior repositories are off limits

**Never look at any earlier CanonCore or Universora repository. Ever.** Not on GitHub, not in an
archive, not a local clone, not "just to check how it was done before". This includes anything
matching `canoncore*`, `Canoncore*`, `CanonCore*` or `universora*` under any account or org,
whatever it is named or however it is described.

This is absolute and needs no case-by-case justification: do not ask for an exception, do not quote
from one, do not let one shape a recommendation. If one surfaces, discard it and say you did.
Nothing here derives from them.

## Engineering principles

- Do not preserve backward compatibility. Remove obsolete paths instead of adding compatibility
  layers, fallbacks, or migrations. This is about what the codebase carries *permanently*. It does
  not forbid a widening that exists for one deploy interval and is narrowed in the next change —
  that is how a narrowing change is made safe while old and new code are briefly live together, and
  it is the opposite of a layer nobody removes.
- Choose the simplest implementation that fully meets the current requirements. Avoid speculative
  abstractions, configuration, and indirection.
- Grow the system in layers. Start from the smallest version that works end to end, and add each
  new capability on top of a product that already works. Never trade a working product for
  unfinished complexity.
- Keep components modular and concerns clearly separated.
- Prefer established, well-maintained libraries when they reduce overall complexity or improve
  reliability. Do not reimplement common functionality without a clear reason.
- Lean on the dependencies already in the project before writing your own implementation or adding
  packages. Do not assume a library lacks a capability without checking its documentation and types.
- Make architectural decisions for the long term. Do not accept a stopgap that only works for now
  and is meant to be replaced later.

## Stack

Settled 8 August 2026. Rationale and rejected alternatives: [ADR-0005](docs/adr/0005-stack.md). Do not relitigate them here.

| Concern | Choice |
| --- | --- |
| Language | TypeScript |
| Web framework | Next.js, App Router |
| Database | Postgres, with row-level security on every user-scoped table |
| Data access | Drizzle |
| Auth | better-auth, users in our own Postgres |
| Hosting | Vercel |
| Database host | Neon |
| Package manager | pnpm workspaces, no build orchestrator |
| Mobile *(later)* | Expo, on `react-native-tvos` from its first commit |
| TV *(later)* | Expo, Apple TV, separate app |

**Three rules that are not negotiable** — the application database role without `BYPASSRLS`, a
cross-tenant read test on every RLS-protected table, and session context via `SET LOCAL` inside an
explicit transaction. [ADR-0005](docs/adr/0005-stack.md) states them and says why each one's
failure is silent.

**Layout.** One monorepo: `apps/` for applications, `packages/` for shared TypeScript, today
`apps/web` and `packages/config` only, no boundary before a second consumer exists. **`apps/web` is
a shell** — no source-specific code, no *Source* credential — and every Source is reached through a
**Provider** in its own repository: [ADR-0014](docs/adr/0014-shell-providers-and-per-source-retention.md).

**Working in the repo.** `pnpm install`, then `pnpm --filter @canoncore/web dev`. The CI gates
and the Playwright suite are in `docs/agents/workflow.md`; `node scripts/check-docs.ts` checks these
documents against the live sources and runs in CI. Coding standards, and what overrides a reviewer's
default heuristics: `CODING_STANDARDS.md`.

**Production is `https://www.canoncore.com`**. What is provisioned and where each credential lives:
`docs/infrastructure.md` — read before touching deployment, environment variables or the database,
and note what it flags as unverified. When it is down, and the weekly Hobby usage check: `docs/runbook.md`.

**The URL is deployed and deliberately not shared.** `docs/infrastructure.md` → *The URL-sharing gate*
holds both gates, lawfulness and readiness, and what opens each. **`docs/compliance/` holds the statutory
records**, and several stop being true the moment the product gains a capability — each one that would
break an assessment is listed in `docs/compliance/illegal-content-risk-assessment.md` → *Step 4* and the
same section of the children's assessment. **Read them before changing or building anything they
describe** — editing the documents in `content/legal/` counts: the assessment has to be redone *before*
such a change ships, not after.

## Agent skills

- **Issue tracker.** Linear (team `CAN`), driven through `orca linear`. Pass `--workspace
  ad2669ec-93a5-4ce1-97fa-c7d9247a1452` on **every** call: Orca is connected to three workspaces and
  picks the wrong one silently. Open issues sit in three bands (`v1`, `Readiness`, `Later`); a `Later`
  `blocked-by` is usually a chosen order, not a real dependency. `docs/agents/issue-tracker.md`.
- **Triage labels.** The five canonical state roles verbatim, plus `bug`/`enhancement` mapping to
  Linear's `Bug`/`Feature`. `label add` / `label remove`, never `label set`.
  `docs/agents/triage-labels.md`.
- **Domain docs.** One `CONTEXT.md`, one `docs/adr/`. How to consume them: `CONTEXT.md` → *Using these documents*.
- **Branches and landing.** Trunk-based and solo: one `main`, a branch per ticket carrying its
  `CAN-n`, squash-merge to land. Gates, preview and merge artefacts: `docs/agents/workflow.md`.
- **Incidents.** Dates, SHAs and run ids live once in `docs/incidents.md`. Cite it, never retell it.

## Which tool owns what

| Job | Tool |
|---|---|
| Docs for a library, framework, SDK or CLI | **`context7` MCP**, per the global rule — except the next two rows |
| Next.js and React patterns, App Router, caching | **`vercel` plugin skills** (`vercel:*`), which are closer to the source than Context7 |
| A Next.js API's exact signature or options, at the version installed here | **`next-devtools-mcp`**'s `nextjs_docs`, which reads the docs shipped inside `node_modules/next` |
| Resend APIs, React Email, the `resend` CLI | **`resend` plugin skills** (`resend:*`), same reasoning |
| Anything else on the web — licences, terms, prior art, current practice | **`WebSearch`** |
| Issues, tickets, projects, triage | **`orca linear … --workspace <id>`** |
| Pull requests, merges, repo administration | **`gh`**, on the `jacobdrees` account |
| Navigating, clicking, filling, reading a page — including behind a login | **`playwright` MCP** |
| Profiling a page — Core Web Vitals, traces, heap | **`chrome-devtools` MCP** |
| Deployments, environment variables, build and runtime logs | **`vercel` MCP** |
| Neon branches, roles and connection strings — the database's own control plane | **`neon` MCP** |
| Production errors and their context — but nothing reports to it yet | **`sentry` MCP** |
| This app's own routes, compile errors and dev-server cache, as it is running now | **`next-devtools-mcp`**, against a live dev server |
| Transactional email — sending, domains, API keys, delivery logs, inbound mail | **`resend` MCP** |
| Whether a message actually arrived, and in which folder | **`macos-mail-mcp`**, Jacob's Mail.app |

Four rules the table does not carry, and **`docs/agents/tooling.md` has the reasoning under each**:

- **Playwright drives the browser; chrome-devtools measures it.** `claude-in-chrome` is denied in
  `.claude/settings.json` two ways, because its browser is Jacob's own and carries all his sessions.
- **A deliverability claim needs both email tools.** `resend` reports what the provider did;
  `macos-mail-mcp` reports what the recipient's client did. A send can be `delivered` and in Junk.
- **Ignore `next-devtools-mcp`'s `browser_eval` tool.** *Playwright drives the browser* settled it.
- **Never use `macos-mail-mcp` for anything but mail this project sent** — it reads every account in
  Jacob's Mail.app, work and personal.

## Closed decisions, and what will try to reopen them

Installed skills, and general habit, default to options the ADRs deliberately rejected. Treat such a
suggestion as a proposal to reopen a closed decision, not as advice. Each bullet names the settled
answer first, then what will offer you something else.

- **better-auth, users in our own Postgres, reached on its own third database role** ([ADR-0005](docs/adr/0005-stack.md), [ADR-0021](docs/adr/0021-a-third-database-role-for-better-auth.md)) — `vercel:auth` offers Clerk, Descope, Auth0; the `neon` MCP's `provision_neon_auth` is one call to a *hosted* better-auth, moving session issuance and a `neon_auth` schema off our deployment.
  **On the role**: every adapter example passes one connection, so nothing errors if you collapse the
  two — and "just let the app read `user`" is a grant *plus* a policy *plus* a cross-tenant test, never a grant alone.
- **Drizzle** (ADR-0005) — habit will offer Prisma.
- **Plain pnpm workspaces, no orchestrator** (ADR-0005) — `vercel:next-forge` installs a `@repo/*`
  Turborepo layout. `vercel:turbopack` is unrelated and fine: Turbopack is Next's bundler.
- **Hand off playback to a media server** ([ADR-0006](docs/adr/0006-no-playback-hand-off-to-media-servers.md))
  — anything offering storage, uploads, transcoding or a player is proposing that we hold bytes.
- **Anchors carrying no metadata** ([ADR-0003](docs/adr/0003-no-shared-catalogue.md)) — a canonical records
  table, a "master" catalogue or an edit-approval queue all reintroduce the shared catalogue this avoids.
- **`www.canoncore.com` canonical, apex 301ing to it** ([ADR-0010](docs/adr/0010-canonical-host-www.md))
  — `vercel:auth` and most better-auth examples suggest a `Domain`-scoped cookie, or the apex itself.
- **A plain API key for every vendor, the Marketplace for Neon alone** ([ADR-0016](docs/adr/0016-provisioning-plain-api-keys-neon-excepted.md), and Resend refused by
  [ADR-0011](docs/adr/0011-transactional-email-resend.md)) — `vercel:marketplace`, `vercel:vercel-storage` and `vercel:bootstrap` all route through the Marketplace. Nothing else buys anything, and an integration owns the variable. **Neon's exception now rests on billing alone**: what earned it was per-deployment preview branching, which ADR-0023 turned off.
- **One row per (record, Source), never an upsert onto the record** ([ADR-0004](docs/adr/0004-layered-overlay-for-sources-and-edits.md))
  — every tool's reflex is to write fetched values onto the row, which destroys the Override beside them.
- **Undo works on Operations; `deleted_at` is storage, not the undo model** ([ADR-0008](docs/adr/0008-operations-and-undo.md))
  — undo a row at a time reads as the simple answer, and makes a fifty-episode import fifty restores.
- **CI releases `main`, and Vercel's Git deploys are off for it** ([ADR-0019](docs/adr/0019-ci-owns-the-production-release.md))
  — `vercel:deploy` and every dashboard nudge assume Git deploys, which is a promotion no migration
  preceded. Previews stay on Git: turning them off would block every merge.
- **One shared schema-only Neon branch serves every preview** ([ADR-0023](docs/adr/0023-one-shared-schema-only-preview-branch.md)) — per-deployment branches and schema-only
  branching are mutually exclusive, so **re-ticking Vercel's `Create Database Branch For Deployment → Preview` silently restores clones of production**: its webhook overrides our variable, everything appears to work, and no check catches it. The `neon` MCP's `create_branch` takes no `init_source` and quietly makes a `parent-data` clone instead.
- **Adult works catalogued, their artwork never displayed**
  ([ADR-0012](docs/adr/0012-adult-works-catalogued-artwork-never-displayed.md)) — Trakt filters adult
  titles out of its TMDB import, so "just exclude them" reads as obvious. It is not: recording that a
  work exists is not carrying pornographic content, and the exposure is the poster.
- **TMDB as the general source, on published terms with no exception** ([ADR-0009](docs/adr/0009-external-source-tmdb.md))
  — every earlier approval is disregarded and none will be sought, so the six-month cache limit binds
  and reads as fatal. The reflex is a second Source as a floor, which ADR-0014 refuses outright.
- **`apps/web` holds no source-specific code and no *Source* credential** (ADR-0014) — ask any tool
  for a TMDB client and it lands in `apps/web`. Bound to *Source*: `RESEND_API_KEY` is not one.
- **Reachability splits by credential: authenticated closed, keyless open** (ADR-0014) — habit offers
  one class for all Providers. The old third class is spent: no permission is load-bearing since 16 August.
- **Hand-written CSS, no framework and no component library** ([ADR-0013](docs/adr/0013-hand-written-css-no-framework.md))
  — `vercel:shadcn` and `vercel:next-forge` both propose one, and Next's own CSS page recommends Tailwind twice.
- **Two test runners, and Playwright off the gate** (ADR-0017) — habit offers Jest and a `webServer`.
- **Uptime watched from outside Sentry** (ADR-0018) — its own free monitor reads as the easy answer.
- **No cookie consent banner** (ADR-0020) — the UK analytics exception is newer than most advice.

## Working practice

Features run through the engineering skills in a fixed order. All are `disable-model-invocation` —
**only the human can invoke them**, so they do not appear in the model's skill list:

```
/grill-with-docs   interview to shared understanding; writes CONTEXT.md + ADRs
/to-spec           the conversation, synthesised into a spec on Linear
/to-tickets        spec sliced into vertical tracer-bullet tickets
/implement         one ticket, TDD at the agreed seams; commits, pushes only for evidence
/draft-pr          push the branch, open the draft PR, link the ticket
/review-pr         gates, ready, squash-merge, close out Linear
```

**Branch off `main` before `/implement`** — nothing does it for you. `/implement` commits to whatever
branch is current, so on `main` it commits to `main`, and pushing `main` migrates the production
database and releases. That, the recovery, and the one push it may make: `docs/agents/workflow.md`.

**`/implement` runs `/code-review` itself, and that is the review — never a repeat over one range.**
It counts only when the review read the *committed* change, not the staged one. A second round follows
any commit the first produced, then the PR discloses. `docs/agents/workflow.md` → *The review runs once*.

`/draft-pr` and `/review-pr` are in `.claude/skills/`; run either from its own body. Policy: `docs/agents/workflow.md`.

**Run the grill and the implementation in separate sessions.** Why, the plugin token costs, how the chain is declared, and when `/wayfinder` replaces `/to-spec`: `docs/agents/tooling.md`.
