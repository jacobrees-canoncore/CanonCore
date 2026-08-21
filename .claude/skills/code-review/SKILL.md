---
name: code-review
description: Two-axis review of the changes since a fixed point — Standards (does the code follow this repo's documented coding standards?) and Spec (does it match what the originating issue asked for?). Use when reviewing a branch, a PR, or work in progress, or when asked to "review since X".
---

Invoke `mattpocock-skills:code-review`, passing through whatever arguments
this skill was given, and follow it exactly. This file owns the *name*, not the
procedure.

**In a Provider repository this skill arrived as a Claude Code plugin, and the standards are not in
the working directory.** Name CanonCore's own documents as the Standards axis's source —
`${CLAUDE_PLUGIN_ROOT}/CLAUDE.md`, `${CLAUDE_PLUGIN_ROOT}/CODING_STANDARDS.md`,
`${CLAUDE_PLUGIN_ROOT}/CONTEXT.md` and `${CLAUDE_PLUGIN_ROOT}/docs/adr` — together with whatever
that repository carries itself. Left to find them, the review reads whatever the working directory
happens to hold and reports a clean Standards axis against nothing.

Why this skill exists, why `skillOverrides` is not the fix, and what it costs:
[references/rationale.md](references/rationale.md) — read it before changing or
deleting this skill.
