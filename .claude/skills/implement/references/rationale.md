# Why the `implement` skill is a copy

Read this before changing or re-syncing `.claude/skills/implement/`.

The body of `SKILL.md`, minus the docs-lookup paragraph, is a verbatim fork of
`mattpocock-skills:implement` at pack version 1.2.3.

## Why it is a copy rather than a delegation

`mattpocock-skills:implement` carries `disable-model-invocation: true`, which
blocks a `Skill` call from *inside another skill* as well as autonomous
invocation. Tested 12 August 2026 against `mattpocock-skills:grill-with-docs`,
which returns:

> Skill mattpocock-skills:grill-with-docs cannot be used with Skill tool due to
> disable-model-invocation.

So the delegation that [code-review](../../code-review/references/rationale.md)
uses is not available here. That flag exists to keep a human in the loop, and
this skill keeps it: it carries `disable-model-invocation` too, so only Jacob
can fire it.

**Re-sync by eye when the pack updates.** Upstream is five lines, at
`~/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/<version>/skills/engineering/implement/SKILL.md`.

## Why the docs-lookup paragraph was added

Every other rule that would trigger a lookup is gated on something that is not
true mid-implementation: `CLAUDE.md`'s *"do not assume a library lacks a
capability"* fires on dependency choice, and the global context7 rule fires on
the user asking. Neither fires when the agent is writing a call from memory.
The tool table in `CLAUDE.md` answers *which* tool; the added paragraph answers
*when*.
