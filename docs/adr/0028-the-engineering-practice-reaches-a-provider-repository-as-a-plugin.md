---
status: accepted
---

# The engineering practice reaches a Provider repository as a Claude Code plugin, and this repository is the payload

**Every Provider repository installs one Claude Code plugin, and that plugin's source is this
repository itself.** So the four engineering skills travel, and `CLAUDE.md`, `CODING_STANDARDS.md`,
`CONTEXT.md` and `docs/` travel with them, at the same relative paths they have here and with every
cross-reference between them still resolving. Nothing is copied into a Provider repository, which is
the drift **CAN-107 Give every Provider repository a CI baseline** was written to prevent, one
directory further out.

Decided and measured on 21 August 2026 by
[CAN-153 Give every Provider repository an agent baseline, as CAN-107 gave it a CI one](https://linear.app/jacobrees-canoncore/issue/CAN-153).
The register — what a Provider carries, what a person runs once, and what was read back — is
[`docs/infrastructure.md`](../infrastructure.md) → *The Provider repository agent baseline*, which
sits beside the CI baseline it mirrors. This file holds why, and the repository split it serves is
[ADR-0014](0014-shell-providers-and-per-source-retention.md).

## Contents

- [The premise was half wrong, and the wrong half is the load-bearing one](#the-premise-was-half-wrong-and-the-wrong-half-is-the-load-bearing-one)
- [Three parts, and only the third needs anything of the Provider](#three-parts-and-only-the-third-needs-anything-of-the-provider)
- [Why the payload is the whole repository](#why-the-payload-is-the-whole-repository)
- [What was rejected](#what-was-rejected)
- [What this costs](#what-this-costs)
- [What will try to reopen it](#what-will-try-to-reopen-it)
- [Consequences](#consequences)

## The premise was half wrong, and the wrong half is the load-bearing one

The ticket opened on *"a plugin does not carry documents"*. **It carries them.** A plugin whose
source is `"./"` is the marketplace root, and Claude Code copies that directory into its cache
whole: read back on 21 August 2026, the installed copy held `CLAUDE.md`, `CODING_STANDARDS.md`,
`CONTEXT.md` and all of `docs/` alongside `.claude/skills/`, in 3.8 MB.

What a plugin cannot do is **load** them. Only a `CLAUDE.md` inside the working directory tree is
read into every session, and no plugin component supplies one. And the skills' pointers are written
relative to a repository root that, in a Provider repository, is a different repository — so they
resolve to nothing.

**So the problem was addressing and loading, not transport**, and the two halves have different
answers. That distinction is why this decision costs a Provider eight lines rather than a vendored
copy of four documents.

## Three parts, and only the third needs anything of the Provider

- **Transport.** [`.claude-plugin/marketplace.json`](../../.claude-plugin/marketplace.json) and
  [`.claude-plugin/plugin.json`](../../.claude-plugin/plugin.json) at this repository's root. The
  plugin's `source` is `"./"` and its `skills` is `["./.claude/skills"]`, which points at the
  directory that already exists rather than a second copy of it.
- **Addressing.** `${CLAUDE_PLUGIN_ROOT}` is *"the absolute path to the plugin's installation
  directory"* and substitutes in skill content *"anywhere the placeholder appears"*
  ([Plugins reference](https://code.claude.com/docs/en/plugins-reference)). Measured both ways on
  21 August 2026: a skill loaded **as part of the plugin** printed the resolved absolute path and
  read `CODING_STANDARDS.md` through it; the same file loaded **from `.claude/skills/`** printed the
  placeholder unsubstituted. So one body cannot carry a path that works in both places, and the
  skills instead say once where their root is — the working directory here, `${CLAUDE_PLUGIN_ROOT}`
  there.
- **The always-on half.** Nothing the plugin contributes is loaded before a skill fires. So each
  Provider repository carries a short `CLAUDE.md` of its own. It is not a copy of this one: it says
  what is true of *that* repository — its Source, its credential, its single gate, that it must
  never carry the production release — and names the plugin as where the shared half lives. A
  Provider needs such a document anyway, which is why this is one paragraph added to a file rather
  than a mechanism.

## Why the payload is the whole repository

**Because the documents cite each other.** `CLAUDE.md` points into `docs/adr/`, an ADR points at
`../infrastructure.md` and `../../CODING_STANDARDS.md`, and `docs/agents/workflow.md` points at
both. A curated subset arrives with those links dangling, which is the failure this decision exists
to fix rather than a smaller version of it. A tree either travels whole or its cross-references
become the new dangling pointers.

**And the paths then match.** With the repository as the plugin root,
`${CLAUDE_PLUGIN_ROOT}/docs/agents/workflow.md` and the repo-root-relative `docs/agents/workflow.md`
are the same path with a different prefix. A curated directory would have made them differ in shape
as well as in prefix, and every pointer would have needed rewriting rather than a preamble.

## What was rejected

- **Copying the four documents into each Provider repository.** Six or more copies of a standard is
  six or more standards within a month, and it is the exact failure the CI baseline was built to
  avoid. Rejected on the same argument as that one rather than on a new one.
- **`--sparse`, to trim the payload.** `claude plugin marketplace add --sparse` limits the checkout,
  and it cannot be committed: an `extraKnownMarketplaces` entry takes `source`, `installLocation`,
  `autoUpdate` and `lastUpdated` and refuses anything else
  ([settings schema](https://json.schemastore.org/claude-code-settings.json), read 21 August 2026).
  So it is a choice one person makes on one machine, which is not what a baseline is. It would also
  drop the documents, which are the thing being transported.
- **A curated plugin directory of symlinks.** Supported — a symlink resolving elsewhere inside the
  same marketplace is dereferenced into the cache — and it would keep `.mcp.json` out of the
  payload. Rejected because it replaces a payload that cannot be wrong with a list that can: a
  document added at the repository root does not travel until somebody remembers to link it, and
  nothing would report that it had not.
- **Installing this plugin in this repository too**, for one code path instead of two. The cache
  holds a copy taken at install time, so an agent editing `CODING_STANDARDS.md` here would review
  its own change against a snapshot of the version before it. The skills live in `.claude/skills/`
  here for the same reason they always did.
- **A `SessionStart` hook injecting the always-on half.** It would work and it would remove nothing:
  a Provider repository has its own facts to state and so carries a `CLAUDE.md` regardless. Adding a
  hook beside it buys a second mechanism for one of the two jobs that file already does.

## What this costs

- **This repository's `.mcp.json` is part of the payload, and cannot be excluded.** `.mcp.json` at
  the plugin root is a default component path, and `plugin.json`'s own `mcpServers` field is
  *"in addition to"* it rather than instead of it, so there is no manifest field that suppresses it.
  `claude plugin details` reports `MCP servers (1) resend` against the installed plugin. It costs no
  always-on tokens and carries no credential — the Resend server is OAuth and signs in per session
  ([`docs/agents/tooling.md`](../agents/tooling.md) → *Which servers are project scope and which are
  user scope*) — so the price is a server a Provider has no use for being offered there. **The rule
  that falls out is the real cost**: nothing credentialled may ever be added to this repository's
  `.mcp.json` while this arrangement stands, because it would be published into every Provider
  repository's session.
- **A directory added at this repository's root can join the payload silently.** `agents/`,
  `commands/`, `hooks/hooks.json`, `output-styles/` and `.lsp.json` are default component paths at a
  plugin root. None exists here today; one created for an unrelated reason would start travelling
  without anything saying so.
- **A person still runs one command per machine.** The eight lines add the marketplace and enable
  the plugin, and that is all they do: *"adding the marketplace doesn't install plugins that come
  from an external source, on any path that loads plugins"*
  ([Discover and install plugins](https://code.claude.com/docs/en/discover-plugins), read
  21 August 2026), measured to be exactly so. Claude Code reports the `claude plugin install` line
  to run, so this is a prompt rather than a trap, but the baseline is not fully automatic and saying
  it were would be wrong.
- **`@main` on both ends, so a bad edit here reaches every Provider at once.** The same trade the CI
  baseline took, for the same reason: a fix reaches them all without six pull requests. The
  marketplace source accepts a `ref` and the plugin source accepts a `ref` and a `sha`, so pinning
  is available if this ever bites.
- **The skills carry a Provider-shaped paragraph each**, which every CanonCore session also loads.
  Measured at ~231 tokens always-on for all four together, unchanged by this decision, because the
  additions are in bodies rather than descriptions.

## What will try to reopen it

- **The dangling pointer, met for the first time in a Provider repository.** Vendoring the four
  documents is what it looks like it wants, and it is the drift this refuses. The answer is a
  `${CLAUDE_PLUGIN_ROOT}` path, which the skills already name.
- **The payload's size, read as waste.** 3.8 MB, of which `apps/` and `packages/` are inert. Trimming
  it is the `--sparse` or symlink route above, both already rejected, and neither buys anything a
  Provider notices.
- **Every plugin tutorial**, which builds a plugin as its own repository or its own directory. That
  is right for a plugin whose payload is only components. It is wrong here, where the documents are
  the payload and they live at the root of the repository they describe.
- **What would actually reopen it**: a component this repository grows for its own use that must not
  reach a Provider: a hook, a subagent definition, an MCP server carrying a key. At that point the payload has
  to be curated after all, and the symlink shape above is the design to reach for, with a check
  behind it.

## Consequences

- **`.claude-plugin/` is not editable in isolation.** Changing the manifests' `source`, their
  `skills` path or the marketplace's name changes what every Provider repository loads.
  `scripts/check-docs.ts` fails on a disagreement between those manifests, the skills directory and
  the register rather than leaving it to a reviewer.
- **A skill's pointers are part of its contract now.** A path added to a skill body must resolve
  from the repository root, because that is what `${CLAUDE_PLUGIN_ROOT}` makes it mean elsewhere.
- **Nothing credentialled goes in `.mcp.json`.** Stated above as a cost; it is a rule, and it is the
  one line of this decision that a future change is most likely to break without noticing.
- **A Provider repository's `CLAUDE.md` is short on purpose.** It states that repository's own facts
  and points at the plugin for the rest. A paragraph copied out of this one is a bug in it.
- **The engineering chain says what it does differently there**, in the four skill bodies rather
  than in a document they would have to reach for, since two of them declare themselves
  self-sufficient. What changes, and why each difference fails by passing, is
  [`docs/agents/workflow.md`](../agents/workflow.md) → *Work that spans two repositories*.
