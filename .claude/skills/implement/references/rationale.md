# Why the `implement` skill is a copy

Read this before changing or re-syncing `.claude/skills/implement/`.

The body of `SKILL.md` is a verbatim fork of `mattpocock-skills:implement` at
pack version 1.2.3, plus five local additions: the read-the-ticket line, the
docs-lookup line, the two-round line, the push clause on the commit line, and
the closing pointer to this file.

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
`CLAUDE.md` puts the grill and the implementation in **separate sessions**, so
`/implement` starts on a ticket it has never seen, and a default read returns
the description alone. The comments are where a scope cut or a reversal gets
recorded, so the body by itself is not the ticket. `--comments` is the flag
that carries them: `--full` is capped and may truncate, and `--current` is the
form a worktree created with `--linear-issue` makes work
([issue-tracker.md](../../../../docs/agents/issue-tracker.md) → *Conventions*).

## Why the two-round line was added

Upstream ends at a single review, and `docs/agents/workflow.md` → *The review
runs once* left the rest open until **CAN-125 Give the review loop a stated end,
and say what an unreviewed commit must disclose**: every round that finds
something produces a commit that round never saw, so *run it again* was always
the compliant answer and the last fix always landed unreviewed. The loop is
bounded at two rounds now, with the residual carried by a disclosure in the pull
request body. Both rounds happen inside this skill, so the bound has to be
stated where they run; the argument stays in
[workflow.md](../../../../docs/agents/workflow.md).

## Why the push clause was added

Upstream's line is *"Commit your work to the current branch"*, and `CLAUDE.md`
described this skill as stopping there. Both are right about the normal case and
neither covers the one that recurs here: an acceptance criterion that asks a gate
to *fail the job* can only be met by a run on GitHub, so the push happens inside
this skill: on **CAN-54 Fail a push that adds a known-vulnerable dependency** the
first such commit was the remote head for ten hours, across the end of a session.
The sharper half is what a push like that leaves behind, because a skill that
stops at the commit has nothing to say about moving it on
([workflow.md](../../../../docs/agents/workflow.md) → *When `/implement` may
push*, and `docs/incidents.md` → *The audit gate was proved by a critical
advisory, then reverted*, which is where that measurement lives). The push
happens where this skill runs, so the bound has to be stated here; the argument
stays in workflow.md.

## Why the docs-lookup line was added

Every other rule that would trigger a lookup is gated on something that is not
true mid-implementation: `CLAUDE.md`'s *"do not assume a library lacks a
capability"* fires on dependency choice, and the global context7 rule fires on
the user asking. Neither fires when the agent is writing a call from memory.
The tool table in `CLAUDE.md` answers *which* tool; the added line answers
*when*.
