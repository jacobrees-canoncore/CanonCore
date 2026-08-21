# Coding standards

The standards themselves live in **`CLAUDE.md` → Engineering principles**. This file exists so
that a review knows where to look, and knows what overrides the default smell baseline. It
deliberately restates none of them — one meaning, one place.

## ADRs override the baseline

**Read `docs/adr/` for the area under review before flagging anything.** A recorded decision is a
documented repo standard, so where an ADR endorses something a generic heuristic would flag, the
ADR wins and the smell is suppressed.

Three decisions will otherwise be flagged as smells, because they were each taken deliberately
against the obvious default:

- **Structures built before the feature that uses them.** Three exist in the first release while
  almost nothing exercises them, and each reads as Speculative Generality: Anchors
  ([ADR-0003](docs/adr/0003-no-shared-catalogue.md)), the snapshot/override split
  ([ADR-0004](docs/adr/0004-layered-overlay-for-sources-and-edits.md)), and Operations
  ([ADR-0008](docs/adr/0008-operations-and-undo.md)). Each is cheap now and a rewrite later, which
  is the whole reason they are early.
- **A value repeated across sibling rows.** Two Versions of one Story may carry the same location
  string. Reads as Duplicated Code; is
  [ADR-0001](docs/adr/0001-two-levels-story-and-version.md), which accepted one short duplicated
  field in exchange for not adding a third level to the model.
- **Backward compatibility in the provider contract.** The codebase rule is to remove obsolete
  paths rather than carry compatibility layers. The published provider contract is the single
  bounded exception — **not** because third parties implement it, which is false for every Provider
  that will exist in v1, but because the code is self-hostable: someone else may be running our
  Provider on their own schedule, and a self-hosted copy is a fork we cannot upgrade even though we
  wrote it — [ADR-0014](docs/adr/0014-shell-providers-and-per-source-retention.md#what-survives-of-adr-0007),
  which supersedes [ADR-0007](docs/adr/0007-provider-contract.md). It evolves additive-only and
  carries a deprecation policy. The exception stops at the contract; everywhere else the rule holds.

## What the baseline will wave through, and must not

**Source-specific code in `apps/web` is a finding, however clean it is.**
[ADR-0014](docs/adr/0014-shell-providers-and-per-source-retention.md#decision-1--the-app-is-a-shell)
makes the application a shell, and that is precisely what the baseline cannot see: an
`apps/web/src/lib/tmdb.ts` reads as good structure to every default heuristic — small, cohesive, one
job — so nothing else catches it.

The remedy the finding asks for is **relocation to that Source's Provider, never a neater wrapper**.
An abstraction over TMDB inside `apps/web` still leaves this project a licensee of TMDB's terms,
which is the exposure the shape exists to remove.

**The same applies to a *Source* credential reaching the application**, and the bound is *Source*:
`DATABASE_URL`, better-auth's secrets and `RESEND_API_KEY` are not Source credentials, and neither
is `provider-tmdb`'s own — that one authenticates us to our own Provider.

**A migration that narrows the schema is a finding unless the change says why it is safe now.**
Dropping a column, dropping a table or constraint, and `SET NOT NULL` on a populated table are all
well-formed SQL that every heuristic reads as tidying up, and drizzle-kit generates them without
comment. The rule they can break is *every migration must leave the schema able to serve the previous
release's code*, which is what keeps the migrate-then-promote window safe **and** what makes a
rollback possible at all, since the schema is never rolled back
([ADR-0027](docs/adr/0027-migrations-are-forward-only-and-a-rollback-moves-code-alone.md)).

Nothing in the diff can settle it, which is why it lands here rather than in a gate: the question is
whether the *previous release's* code still needs the old shape, and that code is not in the
migration file. So the remedy is **widen now, narrow in a later change**, and a narrowing that is
genuinely due says so in the pull request body
([`docs/agents/workflow.md`](docs/agents/workflow.md) → *What a merge carries*).

## Domain language

Names in code, tests and issue titles use the terms in [`CONTEXT.md`](CONTEXT.md). Using an
`_Avoid_` word **for the concept it is listed against** is a finding; the same word used for a
different concept is not, since the lists are per-concept rather than a banned-word list.

## Documents are the artefact here

Most of this repo is prose an agent consumes, so review it against the standards written for that,
not only against prose taste:

- **`writing-for-agents`** (mattpocock-skills) — duplication, no-ops, steering by negation, and
  context load on always-loaded files. `CLAUDE.md` is read every turn, so a line that changes no
  behaviour is a real cost.
- **`SKILL-MECHANICS.md`**, same pack — frontmatter for anything under `.claude/skills/`. A
  user-invoked skill carries `disable-model-invocation: true` and a one-line human-facing
  description with no trigger list.
- **A checkable factual claim must cite its source.** This covers assertions about things outside
  the repo that could be looked up and got wrong: an API's behaviour, a licence term, a version, a
  command's semantics. It does not cover reasoning or judgement, which are argued rather than
  cited. Tool use leaves no trace in a diff and cannot be reviewed; a claim citing nothing, or
  citing a document that does not say it, can be.

## Enforced by tooling

The checks live in [`docs/agents/workflow.md`](docs/agents/workflow.md) and run in GitHub Actions on
every push. Skip anything tooling catches; a review's attention is better spent on what it cannot
see.
