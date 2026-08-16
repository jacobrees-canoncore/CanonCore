# Why the `implement` skill is a copy

Read this before changing or re-syncing `.claude/skills/implement/`.

The body of `SKILL.md`, minus the two added lines — *read the ticket first* and
*check the docs* — is a verbatim fork of `mattpocock-skills:implement` at pack
version 1.2.3.

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

## Why the read-the-ticket-first line was added

Upstream assumes the human pasted the spec into the same conversation. Here
`CLAUDE.md` requires the grill and the implementation to run in **separate
sessions**, so `/implement` starts on a ticket it has never seen. `--full` is
what carries the comments, and comments are where a scope cut or a reversal
gets recorded: none of them mirrors to GitHub (CAN-112 Comments never reach the
GitHub mirror, and the tracker doc said they did), so the body alone is not the
ticket. `--workspace` is spelled out because Orca picks one of three silently
when it is omitted.

## Why the docs-lookup paragraph was added

Every other rule that would trigger a lookup is gated on something that is not
true mid-implementation: `CLAUDE.md`'s *"do not assume a library lacks a
capability"* fires on dependency choice, and the global context7 rule fires on
the user asking. Neither fires when the agent is writing a call from memory.
The tool table in `CLAUDE.md` answers *which* tool; the added paragraph answers
*when*.
