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

**Undecided, deliberately.** There is no code, no package manager, no framework and no host
chosen. It will be a monorepo; nothing beyond that is settled.

Do not scaffold one speculatively, and do not infer a stack from another project on this
machine. The stack is an outcome of the domain work, not an input to it — see **Working
practice**. When it is settled, this table is where it goes, and `docs/agents/workflow.md`
has the places that are waiting on it.

## Agent skills

### Issue tracker

Issues live in Linear (workspace `CanonCore`, team `CAN`), driven through the `orca linear`
CLI. `--workspace ad2669ec-93a5-4ce1-97fa-c7d9247a1452` is **mandatory on every call** — Orca
is connected to three workspaces, does not infer one from the directory, and the wrong-
workspace failure is silent. The remote must live in the `jacobrees-canoncore` GitHub org
(one GitHub owner binds to one Linear workspace); GitHub Issues is then a two-way mirror, not
a second place to write. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical state roles verbatim, plus `bug`/`enhancement` mapping to Linear's
existing `Bug`/`Feature`. The five must be created in the Linear UI before use. Change them
with `label add`/`label remove`, never `label set`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and one `docs/adr/` at the repo root, both created lazily.
See `docs/agents/domain.md`.

### Branches and landing

Trunk-based and solo: one `main`, a branch per ticket carrying its `CAN-n` in upper case,
squash-merge to land. The gates and the deployment story are pending the stack decision and
are marked as such rather than guessed. See `docs/agents/workflow.md`.

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
