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
  bounded exception, because third parties implement it and deploy on their own schedule — see
  [ADR-0007](docs/adr/0007-provider-contract.md). It evolves additive-only and carries a
  deprecation policy. The exception stops at the contract; everywhere else the rule holds.

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
