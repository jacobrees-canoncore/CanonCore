# CanonCore

## Prior repositories are off limits

**Never look at any earlier CanonCore or Universora repository. Ever.** Not on GitHub, not in
an archive, not a local clone, not "just to check how it was done before". This includes
anything matching `canoncore*`, `Canoncore*`, `CanonCore*` or `universora*` under any account
or org, whatever it is named or however it is described.

This is absolute and does not need justifying case by case. Do not ask for an exception, do
not quote from one, and do not let a search result from one influence a recommendation. If a
search surfaces one, discard it and say that you did.

Nothing in this repository is derived from them.

## Engineering principles

- Do not preserve backward compatibility. Remove obsolete paths instead of
  adding compatibility layers, fallbacks, or migrations. This is about what the
  codebase carries *permanently*. It does not forbid a widening that exists for
  one deploy interval and is narrowed in the next change — that is how a
  narrowing change is made safe while old and new code are briefly live
  together, and it is the opposite of a layer nobody removes.
- Choose the simplest implementation that fully meets the current
  requirements. Avoid speculative abstractions, configuration, and
  indirection.
- Grow the system in layers. Start from the smallest version that works end
  to end, and add each new capability on top of a product that already
  works. Never trade a working product for unfinished complexity.
- Keep components modular and concerns clearly separated.
- Prefer established, well-maintained libraries when they reduce overall
  complexity or improve reliability. Do not reimplement common
  functionality without a clear reason.
- Lean on the dependencies already in the project before writing your own
  implementation or adding packages. Do not assume a library lacks a
  capability without checking its documentation and types.
- Make architectural decisions for the long term. Do not accept a stopgap
  that only works for now and is meant to be replaced later.

## Stack

Settled by the grilling session of 8 August 2026. Rationale and rejected alternatives are in
[ADR-0005](docs/adr/0005-stack.md); do not relitigate them here.

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

**Layout.** One monorepo. `apps/` holds framework-specific applications, `packages/` holds shared
TypeScript. Day one is `apps/web` and `packages/config` only — the workspace is real from the
first commit, but no boundary is drawn before a second consumer exists.

**Providers live in separate repositories**, never in `apps/`. See
[ADR-0007](docs/adr/0007-provider-contract.md) for why that separation has to be structural.

**Three rules that are not negotiable** — the application database role without `BYPASSRLS`, a
cross-tenant read test on every RLS-protected table, and session context via `SET LOCAL` inside an
explicit transaction. [ADR-0005](docs/adr/0005-stack.md) states them and says why each one's
failure is silent.

Coding standards and what overrides a reviewer's default heuristics: `CODING_STANDARDS.md`.

## Agent skills

### Issue tracker

Issues live in Linear (team `CAN`), driven through the `orca linear` CLI, mirrored two-way to
GitHub Issues. Pass `--workspace ad2669ec-93a5-4ce1-97fa-c7d9247a1452` on **every** call: Orca is
connected to three workspaces and picks the wrong one silently. See
`docs/agents/issue-tracker.md`.

### Triage labels

The five canonical state roles verbatim, plus `bug`/`enhancement` mapping to Linear's existing
`Bug`/`Feature`. All eight exist. Change them with `label add` and `label remove`. See
`docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and one `docs/adr/` at the repo root, both populated. See
`docs/agents/domain.md`.

### Branches and landing

Trunk-based and solo: one `main`, a branch per ticket carrying its `CAN-n`, squash-merge to
land. `docs/agents/workflow.md` names the gates, the preview environment and which artefacts a
merge carries. They are *named but unbuilt* until the walking skeleton exists — until then, report
plainly that there was nothing to run.

## Which tool owns what

| Job | Tool |
|---|---|
| Docs for a library, framework, SDK or CLI | **`context7` MCP**, per the global rule — except the next row |
| Next.js and React patterns, App Router, caching | **`vercel` plugin skills** (`vercel:*`), which are closer to the source than Context7 |
| Anything else on the web — licences, terms, prior art, current practice | **`WebSearch`** |
| Issues, tickets, projects, triage | **`orca linear … --workspace <id>`** |
| Pull requests, merges, repo administration | **`gh`**, on the `jacobdrees` account |
| Navigating, clicking, filling, reading a page — including behind a login | **`playwright` MCP** |
| Profiling a page — Core Web Vitals, traces, heap | **`chrome-devtools` MCP** |
| Deployments, environment variables, build and runtime logs | **`vercel` MCP** |

**Playwright drives the browser; chrome-devtools measures it.** `claude-in-chrome` is denied in
`.claude/settings.json` — both its tools and its skill — because its browser is Jacob's own and
carries all of his sessions. Deny is evaluated before allow and cannot be overridden by confirming
a prompt ([settings docs](https://code.claude.com/docs/en/settings)), so that is settled rather
than advisory. Playwright runs a separate profile, so when something needs a login, ask Jacob to
sign in to *that* browser; the session then persists.

Installed on a trigger, not before: `neon` at a real database, `next-devtools-mcp` once Next is
scaffolded, `sentry` at the first shipped build.

## Closed decisions, and what will try to reopen them

Installed skills, and general habit, default to options the ADRs deliberately rejected. Treat such
a suggestion as a proposal to reopen a closed decision, not as advice.

Each names the settled answer first, then what will offer you something else.

- **better-auth** ([ADR-0005](docs/adr/0005-stack.md)) — `vercel:auth` will offer Clerk, Descope
  or Auth0.
- **Drizzle** (ADR-0005) — habit will offer Prisma.
- **Plain pnpm workspaces, no orchestrator** (ADR-0005) — `vercel:next-forge` installs a
  `@repo/*` Turborepo layout. `vercel:turbopack` is unrelated and fine: Turbopack is Next's
  bundler, not Turborepo.
- **Hand off playback to a media server**
  ([ADR-0006](docs/adr/0006-no-playback-hand-off-to-media-servers.md)) — anything offering storage,
  uploads, transcoding or a player is proposing that we hold bytes.
- **Anchors carrying no metadata** ([ADR-0003](docs/adr/0003-no-shared-catalogue.md)) — a canonical
  records table, a "master" catalogue or an edit-approval queue all reintroduce the shared
  catalogue this avoids.
- **TMDB as the general source** ([ADR-0009](docs/adr/0009-external-source-tmdb.md)) — its
  published terms forbid keeping data beyond six months and we hold a project-specific exception,
  so a reader who checks the public terms will think this is wrong. TheTVDB is the recorded
  fallback if the exception lapses, not a live alternative.

## Working practice

Features run through the engineering skills in a fixed order. All of them are
`disable-model-invocation` — **only the human can invoke them**, which is why they do not
appear in the model's skill list:

```
/grill-with-docs          interview to shared understanding; writes CONTEXT.md + ADRs
   ↓
/to-spec                  the conversation, synthesised into a spec on Linear
   ↓
/to-tickets               spec sliced into vertical tracer-bullet tickets
   ↓
/implement                one ticket, TDD at the agreed seams; stops at the commit
```

**Branch off `main` before `/implement`** — nothing does it for you. `/implement` commits to
whatever branch is current, so on `main` it commits to `main`, and pushing `main` deploys to
production. `docs/agents/workflow.md` has the command and the recovery.

`/implement` stops at the commit; the skill says so and nothing in the pack goes further.
Everything after it is this repo's own, and it is two more user-invoked skills:

```
/draft-pr                 push the branch, open the draft PR, link the ticket
   ↓
/code-review              two-axis review — needs the pushed branch, so it runs here
   ↓
/review-pr                gates, ready, squash-merge, close out Linear
```

Both live in `.claude/skills/` and defer to `docs/agents/workflow.md` for the policy. They are
`disable-model-invocation` like the rest — `/review-pr` merges to production, which is not a
thing to reach for unprompted.

Small work can skip from the grill straight to `/implement`. `/wayfinder` replaces `/to-spec`
when the shape is still foggy — it resolves unknown *decisions* one at a time, where
`to-spec` assumes you know what you are building and are slicing *how*.

Run the grill and the implementation in separate sessions. The stated ceiling is roughly 140K
tokens before the model degrades, and the installed plugins already spend ~9k of that before
anything is typed.
