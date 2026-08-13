# CanonCore
<!--
Loaded on every request. Target: under 200 lines (code.claude.com/docs/en/memory).
To add a line, cut one, or put it in a pointer doc instead. The seam is change cadence:
  a standing rule           -> docs/agents/*.md          (policy: changes rarely)
  a step that executes one  -> .claude/skills/*/SKILL.md (procedure: changes with the command)
  what happened, and when   -> docs/incidents.md         (evidence: only ever accumulates)
  what is provisioned now   -> docs/infrastructure.md    (register: bounded by the estate)
  a settled decision        -> docs/adr/
Per-session state (sign-ins, which account is active) is asserted nowhere. Ask the tool.
Evidence: docs/research/document-length-for-agents.md
-->

## Name every ticket you cite

Never write a bare ticket identifier. Every reference to a Linear issue carries its title as well as
its number, in conversation, in commit messages, in pull request bodies and in these documents:
**CAN-30 GDPR export and erasure**, never `CAN-30`. A bare number forces a lookup to follow the
sentence, and with sixty-plus issues here, several differing only in scope, it is easy to misread as
a neighbouring ticket.

## Prior repositories are off limits

**Never look at any earlier CanonCore or Universora repository. Ever.** Not on GitHub, not in an
archive, not a local clone, not "just to check how it was done before". This includes anything
matching `canoncore*`, `Canoncore*`, `CanonCore*` or `universora*` under any account or org,
whatever it is named or however it is described.

This is absolute and does not need justifying case by case. Do not ask for an exception, do not
quote from one, and do not let a search result from one influence a recommendation. If a search
surfaces one, discard it and say that you did. Nothing here is derived from them.

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

**Three rules that are not negotiable** — the application database role without `BYPASSRLS`, a
cross-tenant read test on every RLS-protected table, and session context via `SET LOCAL` inside an
explicit transaction. [ADR-0005](docs/adr/0005-stack.md) states them and says why each one's
failure is silent.

**Layout.** One monorepo. `apps/` holds framework-specific applications, `packages/` holds shared
TypeScript. Day one is `apps/web` and `packages/config` only, and no boundary is drawn before a
second consumer exists. **Providers live in separate repositories**, never in `apps/` —
[ADR-0007](docs/adr/0007-provider-contract.md) says why that separation has to be structural.

**Working in the repo.** `pnpm install`, then `pnpm --filter @canoncore/web dev`. The four CI gates
and the Playwright suite are in `docs/agents/workflow.md`; `node scripts/check-docs.ts` checks these
documents against the live sources and runs in CI. Coding standards, and what overrides a reviewer's
default heuristics: `CODING_STANDARDS.md`.

**Production is `https://www.canoncore.com`**, apex 301s to it. What is provisioned, and where each
credential lives: `docs/infrastructure.md` — read it before touching deployment, environment
variables or the database connection, and note the items it flags as unverified.

**The URL is deployed and deliberately not shared.** `docs/infrastructure.md` → *The URL-sharing gate*
holds the rule and what opens it. **`docs/compliance/` holds the statutory records** — the two risk
assessments, the children's access assessment, the Code measures register, the `s.23(4)` alternative
measures record, the CSEA reporting procedure and the review policy. **Read them before changing anything
they describe**, because several are false the moment the product gains a capability: user upload,
messaging or comments, linkified free text, search across other users' content, a recommender, a
marketplace, or publicly displayable artwork on an adult-flagged record. Each of those requires the
assessment redone *before* it ships, and each is listed as such in the record it would break.

## Agent skills

- **Issue tracker.** Linear (team `CAN`), driven through `orca linear`, mirrored two-way to GitHub
  Issues. Pass `--workspace ad2669ec-93a5-4ce1-97fa-c7d9247a1452` on **every** call: Orca is
  connected to three workspaces and picks the wrong one silently. `docs/agents/issue-tracker.md`.
- **Triage labels.** The five canonical state roles verbatim, plus `bug`/`enhancement` mapping to
  Linear's `Bug`/`Feature`. `label add` / `label remove`, never `label set`.
  `docs/agents/triage-labels.md`.
- **Domain docs.** Single-context: one `CONTEXT.md` and one `docs/adr/`, both populated. How to
  consume them is `CONTEXT.md` → *Using these documents*.
- **Branches and landing.** Trunk-based and solo: one `main`, a branch per ticket carrying its
  `CAN-n`, squash-merge to land. `docs/agents/workflow.md` names the gates, the preview environment
  and which artefacts a merge carries; since CAN-22 those gates run in GitHub Actions on every push.
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

Five rules the table does not carry, and **`docs/agents/tooling.md` has the reasoning under each**:

- **Playwright drives the browser; chrome-devtools measures it.** `claude-in-chrome` is denied in
  `.claude/settings.json` two ways, because its browser is Jacob's own and carries all his sessions.
- **A deliverability claim needs both email tools.** `resend` reports what the provider did;
  `macos-mail-mcp` reports what the recipient's client did. A send can be `delivered` and in Junk.
- **Ignore `next-devtools-mcp`'s `browser_eval` tool.** *Playwright drives the browser* settled it.
- **`next-devtools-mcp` answers nothing when the dev server is down.**
- **Never use `macos-mail-mcp` for anything but mail this project sent** — it reads every account in
  Jacob's Mail.app, work and personal.

## Closed decisions, and what will try to reopen them

Installed skills, and general habit, default to options the ADRs deliberately rejected. Treat such a
suggestion as a proposal to reopen a closed decision, not as advice. Each bullet names the settled
answer first, then what will offer you something else.

- **better-auth** ([ADR-0005](docs/adr/0005-stack.md)) — `vercel:auth` offers Clerk, Descope, Auth0.
- **Drizzle** (ADR-0005) — habit will offer Prisma.
- **Plain pnpm workspaces, no orchestrator** (ADR-0005) — `vercel:next-forge` installs a `@repo/*`
  Turborepo layout. `vercel:turbopack` is unrelated and fine: Turbopack is Next's bundler.
- **Hand off playback to a media server**
  ([ADR-0006](docs/adr/0006-no-playback-hand-off-to-media-servers.md)) — anything offering storage,
  uploads, transcoding or a player is proposing that we hold bytes.
- **Anchors carrying no metadata** ([ADR-0003](docs/adr/0003-no-shared-catalogue.md)) — a canonical
  records table, a "master" catalogue or an edit-approval queue all reintroduce the shared
  catalogue this avoids.
- **`www.canoncore.com` as the canonical host, apex 301ing to it**
  ([ADR-0010](docs/adr/0010-canonical-host-www.md)) — `vercel:auth` and most better-auth examples
  will suggest a `Domain`-scoped cookie or serving from the apex. Either one reopens this.
- **Resend for transactional email, with the Marketplace integration declined**
  ([ADR-0011](docs/adr/0011-transactional-email-resend.md)) — Resend is the *only* email provider on
  the Vercel Marketplace, so installing it reads as the obvious path. That is the thing to refuse: it
  provisions a billable resource on a Hobby account and takes ownership of the environment variable,
  the failure CAN-18 already paid for with `DATABASE_URL`. Postmark is the recorded runner-up and the
  margin is narrow; ADR-0011 alone names the conditions that flip it.
- **Adult works catalogued, their artwork never displayed**
  ([ADR-0012](docs/adr/0012-adult-works-catalogued-artwork-never-displayed.md)) — Trakt filters adult
  titles out of its TMDB import, so "just exclude them" reads as obvious. It is not: recording that a
  work exists is not carrying pornographic content, and the exposure is the poster. A per-account
  toggle is worse, because self-declaration is not highly effective age assurance.
- **TMDB as the general source** ([ADR-0009](docs/adr/0009-external-source-tmdb.md)) — its published
  terms forbid keeping data beyond six months, so a reader who checks them will think this is wrong.
  It rests on a project-specific exception TMDB confirmed in writing, held on CAN-34. TheTVDB is the
  recorded fallback, not a live alternative; ADR-0009 alone names what would return us to it.

## Working practice

Features run through the engineering skills in a fixed order. All of them are
`disable-model-invocation` — **only the human can invoke them**, which is why they do not appear in
the model's skill list:

```
/grill-with-docs   interview to shared understanding; writes CONTEXT.md + ADRs
/to-spec           the conversation, synthesised into a spec on Linear
/to-tickets        spec sliced into vertical tracer-bullet tickets
/implement         one ticket, TDD at the agreed seams; stops at the commit
/draft-pr          push the branch, open the draft PR, link the ticket
/review-pr         gates, ready, squash-merge, close out Linear
```

**Branch off `main` before `/implement`** — nothing does it for you. `/implement` commits to
whatever branch is current, so on `main` it commits to `main`, and pushing `main` deploys to
production. `docs/agents/workflow.md` has the command and the recovery.

**`/implement` runs `/code-review` itself, and that is the review — do not ask for a second one.**
It counts only when the review read the *committed* change; staging alone does not achieve that.
`docs/agents/workflow.md` → *The review runs once* has the argument and the three exceptions.

`/draft-pr` and `/review-pr` live in `.claude/skills/`, each carrying its own procedure — run
either from its body alone. `docs/agents/workflow.md` holds the policy behind them.

**Run the grill and the implementation in separate sessions.** Why, the plugin token costs, how the
chain is declared, and when `/wayfinder` replaces `/to-spec`: `docs/agents/tooling.md`.
