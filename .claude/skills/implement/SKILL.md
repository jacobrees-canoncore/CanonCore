---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

When the work is a ticket, read it and its comments first — `orca linear issue --current --comments --json` — then the ADRs and docs for the area.

Use /tdd where possible, at pre-agreed seams.

Check the docs before writing code against an API signature, config option or version behaviour you are unsure of, using whichever tool CLAUDE.md puts in charge of that lookup.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work. **If taking its findings produces a commit, review once more, and stop there** — round two's own corrections are disclosed in the pull request rather than reviewed a third time (`docs/agents/workflow.md` → *Two rounds, and the second is the last*).

Commit your work to the current branch. **Push before `/draft-pr` only for a fact only a run on GitHub can produce, and never leave the branch on a commit broken to get it** — record the run, then push the undo (`docs/agents/workflow.md` → *When `/implement` may push*).

Why this is a fork of `mattpocock-skills:implement` rather than a delegation,
and how to re-sync it: [references/rationale.md](references/rationale.md).
