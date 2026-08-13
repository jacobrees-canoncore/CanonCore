# CanonCore

## Name every ticket you cite

Never write a bare ticket identifier. Every reference to a Linear issue carries its title as
well as its number, in conversation, in commit messages, in pull request bodies and in these
documents: **CAN-30 GDPR export and erasure**, never `CAN-30`.

A bare number tells the reader nothing and forces a lookup to follow the sentence. With this
repository at sixty-plus issues, several of which differ only in scope, the number alone is
also easy to misread as a neighbouring ticket.

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

**Working in the repo.** `pnpm install`, then `pnpm --filter @canoncore/web dev`. The three CI
gates and the Playwright suite are in `docs/agents/workflow.md`.

**Providers live in separate repositories**, never in `apps/`. See
[ADR-0007](docs/adr/0007-provider-contract.md) for why that separation has to be structural.

**Three rules that are not negotiable** — the application database role without `BYPASSRLS`, a
cross-tenant read test on every RLS-protected table, and session context via `SET LOCAL` inside an
explicit transaction. [ADR-0005](docs/adr/0005-stack.md) states them and says why each one's
failure is silent.

**Production is `https://www.canoncore.com`**, apex 301s to it. What is actually provisioned — the
Vercel project, the Neon database, the two Postgres roles and where each credential lives:
`docs/infrastructure.md`. Read it before touching deployment, environment variables or the database
connection, and note the items it flags as unverified.

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
merge carries. Since CAN-22 those gates actually run, in GitHub Actions on every push.

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

**Playwright drives the browser; chrome-devtools measures it.** `claude-in-chrome` is denied in
`.claude/settings.json` — both its tools and its skill — because its browser is Jacob's own and
carries all of his sessions. Deny is evaluated before allow and cannot be overridden by confirming
a prompt ([settings docs](https://code.claude.com/docs/en/settings)), so that is settled rather
than advisory. Playwright runs a separate profile, so when something needs a login, ask Jacob to
sign in to *that* browser; the session then persists.

**The two email tools are not interchangeable.** `resend` reports what the provider did with a
message; `macos-mail-mcp` reports what the recipient's mail client did with it. A send can be
`delivered` in Resend and sitting in Junk, so **a deliverability claim needs both**: send with
`resend`, then read the folder with `macos-mail-mcp`. Which account to check, and the evidence from
CAN-20, are in `docs/infrastructure.md`.

**`next-devtools-mcp` inspects this app; the `vercel:*` skills teach the framework.** Its
`nextjs_index` and `nextjs_call` tools talk to a *running* dev server, so they answer what this app
does right now — its route list, its compile errors, its cache — and answer nothing at all when the
server is down (`pnpm --filter @canoncore/web dev`). Its `nextjs_docs` tool is the one exception to
the `vercel:*` row above: it reads the markdown Next ships inside `node_modules/next`, so it is exact
to the 16.3.0 actually installed rather than to whatever version a skill was written against. Prefer
it for a signature or an option, the `vercel:*` skills for a pattern. **Ignore its `browser_eval`
tool**, which recommends the `agent-browser` CLI. *Playwright drives the browser* above already
settled that, and a new tool offering to do it differently does not reopen it.

**`neon` is signed in; `sentry` is not.** Both authenticate over OAuth, and an unauthenticated
server of this kind exposes only its `authenticate` and `complete_authentication` tools, so the first
call in a session is a sign-in rather than an answer (observed on CAN-47, 12 August 2026, for both).
Neon's control plane is the *only* thing that answers which branches exist, for the two reasons
`docs/infrastructure.md` → *Preview branching was off, and is now on* records; repeating the check it
names there is what settled CAN-45.

**Nothing reports to Sentry yet**, which is why its sign-in is deliberately undone rather than
forgotten. No SDK is installed in `apps/web`, so an empty Sentry is not evidence of a healthy deploy,
and authorising before an account and an SDK exist buys nothing to verify against. **CAN-51 owns that
sign-in**, along with the SDK and with correcting this paragraph once it lands.

`resend` is scoped to this project in `.claude/settings.json`. **`macos-mail-mcp` is user scope and
reads every account in Jacob's Mail.app**, work and personal, so it is his tool rather than this
project's — never use it for anything but checking mail this project sent.

**`neon`, `sentry` and `next-devtools-mcp` are user scope too, and belong there.** A committed
`.mcp.json` is tempting, since all three were installed for this project and the two remote entries
carry no credential. But none of them is pinned to a CanonCore resource: `mcp.neon.tech` and
`mcp.sentry.dev` serve whichever account Jacob signs in as, and `next-devtools-mcp` discovers whatever
dev server is running. They are keyed to him rather than to this repo, which is the test that puts
`macos-mail-mcp` in the same place. Move them only if one gains repo-specific configuration, or if a
second person ever needs this tooling reproducible.

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
- **`www.canoncore.com` as the canonical host, apex 301ing to it**
  ([ADR-0010](docs/adr/0010-canonical-host-www.md)) — `vercel:auth` and most better-auth examples
  will suggest a `Domain`-scoped cookie or serving from the apex. Either one reopens this.
- **Resend for transactional email, with the Marketplace integration declined**
  ([ADR-0011](docs/adr/0011-transactional-email-resend.md)) — Resend is the *only* email provider on
  the Vercel Marketplace, so installing it reads as the obvious path. That is the thing to refuse: it
  provisions a billable resource on a Hobby account and takes ownership of the environment variable,
  which is the failure CAN-18 already paid for with `DATABASE_URL`. Postmark is the recorded runner-up
  and the margin is genuinely narrow; ADR-0011 names the conditions that flip it, and is the only
  place they are stated.
- **Adult works catalogued, their artwork never displayed**
  ([ADR-0012](docs/adr/0012-adult-works-catalogued-artwork-never-displayed.md)) — Trakt filters adult
  titles out of its TMDB import, so "just exclude them" reads as the obvious path. It is not: recording
  that a work exists is not carrying pornographic content, and the exposure is the poster. A per-account
  "show adult content" toggle is the other tempting answer and is worse, because self-declaration is not
  highly effective age assurance.
- **TMDB as the general source** ([ADR-0009](docs/adr/0009-external-source-tmdb.md)) — its
  published terms forbid keeping data beyond six months, so a reader who checks them will think
  this is wrong. It rests on a project-specific exception TMDB confirmed in writing, held on CAN-34.
  TheTVDB is the recorded fallback, not a live alternative; ADR-0009 names the conditions that would
  return the decision to it, and is the only place they are stated.

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

**`/implement` runs `/code-review` itself, and that is the review — do not ask for a second one.**
It counts when the review **actually read the committed change**, which staging alone does not
achieve: `<fixed-point>...HEAD` compares two commits and ignores the index, so with nothing
committed that range is empty and a review of it reports no findings. Commit first and review
against the branch point, or hand the review `git diff --cached` by hand. The fresh eyes are in the
sub-agents `code-review` fans out to, not in whichever session invokes it.
`docs/agents/workflow.md` → *The review runs once, and `/implement` is normally where* has the
argument and the three cases where a review still has to run: `/implement` never ran, the diff it
read was empty or partial, or the branch moved after it.

Everything after `/implement` is this repo's own, and it is two more user-invoked skills:

```
/draft-pr                 push the branch, open the draft PR, link the ticket
   ↓                      (/code-review here only in those three cases)
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
