# Why the `code-review` skill exists

Read this before changing or deleting `.claude/skills/code-review/`.

Two different skills answer to `code-review`:

- Claude Code's **bundled** one — bug-hunting on the current diff, effort
  levels, `--fix`, and `ultra` for a cloud review of a GitHub PR.
- **`mattpocock-skills:code-review`** — the two-axis Standards/Spec review.

The bundled one wins the bare name. That would be harmless, except
`mattpocock-skills:implement` ends with *"use /code-review to review the
work"* — unqualified — so `/implement` silently ran the wrong review.

Upstream bug: mattpocock/skills#483, open. #809 diagnosed it exactly and was
closed as a duplicate. Neither is fixed, and editing the plugin's own
`implement/SKILL.md` does not survive a plugin update.

A skill at any level overrides a bundled skill of the same name
([skills docs](https://code.claude.com/docs/en/skills)), which is what this
skill does. Delegating rather than copying means Matt's skill can change
upstream without this one going stale — unlike
[implement](../../implement/references/rationale.md), which has to be a copy.

## Why it is in the repo rather than `~/.claude/skills/`

So that the chain `CLAUDE.md` documents can be run by anyone who clones this
repository. That costs something and the trade is deliberate: personal scope
overrides project, so a personal copy would silently win and the two would
drift, and at project scope the name is only fixed *here* rather than on every
repo on the machine. This is where the reviewing happens, and a fix nobody can
see is worth less than a narrower one they can.

## `skillOverrides` is not the fix, though it looks like it

Setting `{"code-review": "off"}` makes the bare name *error* rather than
resolve to the plugin — tested 11 August 2026: `Skill code-review is disabled
for model invocation in skillOverrides settings`. It would also hide this
skill, since the key is the skill name. (It *is* the right mechanism for
`claude-in-chrome` in `.claude/settings.json`, where erroring is exactly the
wanted outcome.)

## What this costs

**The bundled review is unreachable in this repository while this skill
exists**, and nothing else serves it: the `code-review` plugin on the official
marketplace is a different tool that reviews a GitHub PR and posts a comment
on it. To get the bundled one back, delete this skill's directory.
