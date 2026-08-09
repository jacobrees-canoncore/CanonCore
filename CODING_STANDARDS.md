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

- **Structures built before the feature that uses them.** Anchors, Operations, and the
  snapshot/override split exist in the first release while almost nothing exercises them. Reads as
  Speculative Generality; is [ADR-0002](docs/adr/0002-orderings-are-separate-from-containment.md),
  [ADR-0003](docs/adr/0003-no-shared-catalogue.md) and
  [ADR-0004](docs/adr/0004-layered-overlay-for-sources-and-edits.md). Each is cheap now and a
  rewrite later, which is the whole reason they are early.
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

Names in code, tests and issues use the terms in [`CONTEXT.md`](CONTEXT.md), including its
`_Avoid_` lists. A synonym for a defined term is a finding.

## Enforced by tooling

`pnpm turbo test typecheck lint`. Skip anything those already catch — a review's attention is
better spent on what tooling cannot see.
