# Tooling and working practice

Why each tool owns the job it owns, why the skill chain is shaped the way it is, and the traps in
both that are not obvious from the tool list.

`CLAUDE.md` carries the tool table, the chain diagram and the operative rules; this file carries the
reasoning under them. Nothing here is new policy. It was moved out of `CLAUDE.md` on 13 August 2026
because that file is loaded on every request and none of this is needed until a tool or a step in the
chain is actually in question. Where `docs/agents/workflow.md` owns a topic, this file points at it
rather than restating it.

## Contents

- [Playwright drives the browser; chrome-devtools measures it](#playwright-drives-the-browser-chrome-devtools-measures-it)
- [The two email tools are not interchangeable](#the-two-email-tools-are-not-interchangeable)
- [`next-devtools-mcp` inspects this app; the `vercel:*` skills teach the framework](#next-devtools-mcp-inspects-this-app-the-vercel-skills-teach-the-framework)
- [Both OAuth servers are signed in, and what an unauthenticated one answers](#both-oauth-servers-are-signed-in-and-what-an-unauthenticated-one-answers)
- [Which servers are project scope and which are user scope](#which-servers-are-project-scope-and-which-are-user-scope)
- [The chain is declared, so a clone runs the same process](#the-chain-is-declared-so-a-clone-runs-the-same-process)
- [Run the grill and the implementation in separate sessions](#run-the-grill-and-the-implementation-in-separate-sessions)

## Playwright drives the browser; chrome-devtools measures it

`claude-in-chrome` is shut off in `.claude/settings.json` two ways, because its browser is Jacob's
own and carries all of his sessions: its MCP tools by a `deny` rule, which is evaluated before allow
and cannot be overridden by confirming a prompt, and its skill twice over — a
`Skill(claude-in-chrome)` deny entry, whose matching is undocumented and so unverified, and
`skillOverrides: "off"`, which is the documented mechanism and makes invoking it error
([settings docs](https://code.claude.com/docs/en/settings)).

Playwright runs a separate profile, so when something needs a login, ask Jacob to sign in to *that*
browser; the session then persists.

## The two email tools are not interchangeable

`resend` reports what the provider did with a message; `macos-mail-mcp` reports what the recipient's
mail client did with it. A send can be `delivered` in Resend and sitting in Junk, so **a
deliverability claim needs both**: send with `resend`, then read the folder with `macos-mail-mcp`.

Which account to check, and the evidence from **CAN-20 Send from mail.canoncore.com and revoke the
two DKIM keys**, are in `docs/infrastructure.md`.

## `next-devtools-mcp` inspects this app; the `vercel:*` skills teach the framework

Its `nextjs_index` and `nextjs_call` tools talk to a *running* dev server, so they answer what this
app does right now — its route list, its compile errors, its cache — and answer nothing at all when
the server is down (`pnpm --filter @canoncore/web dev`).

Its `nextjs_docs` tool is the one exception to the `vercel:*` row in the table: it reads the markdown
Next ships inside `node_modules/next`, so it is exact to the 16.3.0 actually installed rather than to
whatever version a skill was written against. Prefer it for a signature or an option, the `vercel:*`
skills for a pattern.

**Ignore its `browser_eval` tool**, which recommends the `agent-browser` CLI. *Playwright drives the
browser* above already settled that, and a new tool offering to do it differently does not reopen it.

## Both OAuth servers are signed in, and what an unauthenticated one answers

`neon` and `sentry` both authenticate over OAuth, and an unauthenticated server of this kind answers
nothing at all — it exposes only its `authenticate` and `complete_authentication` tools until the
sign-in is done. Observed on **CAN-47 CLAUDE.md still defers three MCP installs that have happened**,
12 August 2026, when neither was signed in.

Sentry's sign-in was completed by **CAN-65 Create the Sentry account and issue its authentication
token** on 13 August 2026; the account, the organisation and what still does not report to it are in
`docs/infrastructure.md` → *Error reporting: Sentry*.

Neon's control plane is the *only* thing that answers which branches exist, for the reasons
`docs/infrastructure.md` → *Preview branching was off, and is now on* records.

> This section states live authentication state, which changes. Treat `docs/infrastructure.md` as
> the register and this as the explanation of what an unauthenticated server looks like.

## Which servers are project scope and which are user scope

`resend` is scoped to this project in `.claude/settings.json`.

**`macos-mail-mcp` is user scope and reads every account in Jacob's Mail.app**, work and personal, so
it is his tool rather than this project's — never use it for anything but checking mail this project
sent.

Why `neon`, `sentry` and `next-devtools-mcp` are user scope rather than a committed `.mcp.json`:
`docs/infrastructure.md` → *Why three MCP servers are user scope*.

## The chain is declared, so a clone runs the same process

`/grill-with-docs`, `/to-spec` and `/to-tickets` come from `mattpocock-skills`, enabled for this
project in `.claude/settings.json`. `/implement` and `/code-review` are in `.claude/skills/` as well,
each keeping its rationale in a `references/rationale.md` beside it rather than in the loaded body.

**Keep no copy of either in `~/.claude/skills/`:** personal scope overrides project, so a personal
copy wins silently and the two drift.

Small work can skip from the grill straight to `/implement`. `/wayfinder` replaces `/to-spec` when
the shape is still foggy — it resolves unknown *decisions* one at a time, where `to-spec` assumes you
know what you are building and are slicing *how*.

`/implement` runs `/code-review` itself and that is the review. The argument, what makes a review
count, and the three cases where one still has to run are owned by `docs/agents/workflow.md` →
*The review runs once, and `/implement` is normally where*. It is not restated here.

## Run the grill and the implementation in separate sessions

The stated ceiling is roughly 140K tokens before the model degrades, and the enabled plugins spend
~5.3k of that before anything is typed — measured 13 August 2026 with `claude plugin details <name>`,
of which `vercel` (~2,950) and `mattpocock-skills` (~1,620) are 86%.

Re-measure rather than guessing; a plugin's skill listing also has a budget that silently drops
descriptions when exceeded, and `/context` reports what survived.

What a document's length actually costs, and the evidence behind the 200-line target on `CLAUDE.md`:
`docs/research/document-length-for-agents.md`.
