---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Check the docs before writing code against an API signature, config option or version behaviour you are unsure of, using whichever tool CLAUDE.md puts in charge of that lookup.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

Commit your work to the current branch.

Why this is a fork of `mattpocock-skills:implement` rather than a delegation,
and how to re-sync it: [references/rationale.md](references/rationale.md).
