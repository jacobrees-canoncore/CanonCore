# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring
the codebase.

**Layout: single-context.** One `CONTEXT.md` and one `docs/adr/` at the repo root.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root if it exists — it points at one `CONTEXT.md` per
  context. Read each one relevant to the topic.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in. In multi-context
  repos, also check `src/<context>/docs/adr/` for context-scoped decisions.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't
suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs`
and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually
get resolved.

## File structure

Single-context repo — what this repo uses today:

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Multi-context repo (presence of `CONTEXT-MAP.md` at the root):

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← context-specific decisions
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## Switching to multi-context later

CanonCore is planned as a monorepo, but it has no packages yet, so a `CONTEXT-MAP.md`
would be an empty index. Switch when packages exist and at least two of them have genuinely
distinct vocabulary — the same word meaning different things in different packages is the
signal, not merely having more than one package.

To switch: create `CONTEXT-MAP.md` at the root listing each context and the path to its
`CONTEXT.md`, move context-specific glossary entries out of the root `CONTEXT.md` into
per-package files, leave system-wide ADRs in the root `docs/adr/`, and change the layout
line at the top of this file to **multi-context**. In a workspace monorepo, read
`packages/<name>/` wherever the tree above says `src/<context>/`.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a
hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms
the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing
language the project doesn't use (reconsider) or there's a real gap (note it for
`/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently
overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_

## Related

`docs/research/` holds investigation output from `/research`. It is **not** domain
documentation — don't treat its contents as decisions. Decisions belong in `docs/adr/`.
