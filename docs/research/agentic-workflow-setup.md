# The agentic workflow, audited — and what this repo signals to a hiring engineer

**Researched 12–13 August 2026.** Two questions, answered in one file because the answer to the second
keeps depending on the first.

1. **Does this Claude Code setup have real gaps**, measured against what Anthropic actually
   documents — not against a generic best-practice list?
2. **What does a repository built this way signal to a hiring engineer in 2026**, and what is
   defensible current practice for AI-assisted development?

**What was read.** Every file of the setup itself, first-hand: `CLAUDE.md`, `CODING_STANDARDS.md`,
`CONTEXT.md`, `docs/agents/*`, `.claude/settings.json`, both project skills, `~/.claude/settings.json`,
`~/.claude/CLAUDE.md`, `~/.claude/rules/context7.md`, the three personal skills that matter here
(`implement`, `code-review`, `context7-mcp`), the installed `mattpocock-skills` pack at versions
1.2.2 and 1.2.3, and this project's auto-memory directory. Then the documentation that owns each
claim: `code.claude.com/docs` (memory, settings, permissions, hooks, skills, sub-agents,
best-practices, features-overview) and Anthropic's engineering blog and `claude.com/blog`. The
GitHub state — the ruleset on `main`, the repository metadata — was read through `gh` against
`jacobrees-canoncore/CanonCore`. Claims that could only be reached second-hand are marked
**unverified**.

> **Exclusion note.** Per this repository's standing constraint, no **earlier** CanonCore or
> Universora repository — anything matching `canoncore*`, `CanonCore*` or `universora*` under any
> account or org — was read, fetched, searched for or quoted. This file was produced by two runs.
> The audit agents searched only `code.claude.com`, `anthropic.com` and `claude.com`, where no such
> repository can appear; the four agents of the second run, which produced the hiring-evidence half,
> were each given the constraint verbatim and every one reported that no such result surfaced.
> This repository's own `jacobrees-canoncore/CanonCore` was read through `gh` and is not what the
> constraint excludes.

**This does not restate [`production-readiness-baseline.md`](production-readiness-baseline.md).**
That file owns error tracking, security headers, rate limiting, backups, SEO surfaces,
accessibility and performance gates — everything the *product* needs before launch. This file owns
the *workflow* that builds it, and the repository as an artefact someone reads. Where the two
touch, this one defers.

---

## The answer in one paragraph

**The enforcement layer is already in the right place, and that is the thing most setups get
wrong.** CI runs on every push, the ruleset on `main` requires those checks by name, and the
review is defined against a diff range rather than a vibe — so the guarantees do not depend on the
model choosing to honour prose. What is wrong is smaller and mostly one shape: **the workflow this
repository documents cannot be run from this repository.** Four of the six steps in `CLAUDE.md` →
*Working practice* resolve to skills and a plugin that live only in `~/.claude` on one laptop, and
nothing in the repo declares them. Second, `CLAUDE.md` is 262 lines against a documented 200-line
ceiling that Anthropic states three separate times as a threshold, not a preference. Third, one
absolute rule — `orca linear` without `--workspace` — is stated as absolute, described as failing
*silently*, and enforced by the weakest mechanism available. Everything else in the audit is either
already correct or does not earn its context cost. On the hiring half: the apparatus is an asset,
the ratio is a liability. There are 9,167 lines of markdown in this repository and 211 lines of
application source, and no README.

---

# Part one — the setup audit

## Where the setup is already correct

Stated first, so the gaps stand out rather than drowning in a list of things that are fine.

**The guarantees live outside the agent.** Anthropic's own framing is that
*"a real guardrail needs to be deterministic, and the enforcement methods are hooks and
permissions"* ([Steering Claude Code](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more),
18 June 2026), and the docs put it harder: *"An instruction like 'never edit `.env`' in CLAUDE.md
or a skill is a request, not a guarantee… If a rule must hold every time, make it a hook rather
than a prompt instruction"* ([features overview](https://code.claude.com/docs/en/features-overview)).
This repository already satisfies that for the rule that matters most. `.github/workflows/ci.yml`
runs `test`, `typecheck`, `lint` and `build` on every push, and the ruleset on the default branch
requires both check contexts by name — read from
`GET /repos/jacobrees-canoncore/CanonCore/rulesets/20761164` on 12 August 2026:
`required_status_checks` for `"test, typecheck, lint, build"` and `"Vercel"`, plus
`required_linear_history` and `non_fast_forward`. A commit that has not been through the gates
cannot reach production by any route, and no prompt can talk its way past that.

**The verification loop is closed.** The first thing Anthropic's best-practices page now teaches,
before prompting or CLAUDE.md, is that *"Claude stops when the work looks done. Without a check it
can run, 'looks done' is the only signal available, and you become the verification loop"*
([best practices](https://code.claude.com/docs/en/best-practices)). Four commands that return a
pass or fail, runnable locally and in CI, is exactly the closing move.

**The two project skills are shaped the way the docs say to shape them, and cost nothing until
used.** Both carry `disable-model-invocation: true`, whose documented rationale is exactly this
case: *"Use this for workflows with side effects or that you want to control timing, like
`/commit`, `/deploy`… You don't want Claude deciding to deploy because your code looks ready"*
([skills](https://code.claude.com/docs/en/skills)). The flag also has a context consequence that is
easy to miss and worth banking: for a `disable-model-invocation` skill the loading table gives
**"Description not in context"**, so unlike an ordinary skill these two spend nothing per turn.
Both open by pointing at `docs/agents/workflow.md` for the policy and keeping only the procedure,
which is the docs' own instruction: *"Keep the body itself concise. Once a skill loads, its content
stays in context across turns, so every line is a recurring token cost. State what to do rather
than narrating how or why."* And the split itself — facts in `CLAUDE.md`, procedure in a skill — is
the documented test: *"If an entry is a multi-step procedure or only matters for one part of the
codebase, move it to a skill"* ([memory](https://code.claude.com/docs/en/memory)).

**The `claude-in-chrome` deny rule works, and `CLAUDE.md`'s reasoning about it is correct.**
`mcp__claude-in-chrome` with no tool suffix is documented syntax — *"`mcp__puppeteer` matches any
tool provided by the `puppeteer` server"* — and the precedence claim holds at every scope:
*"Rules are evaluated in order: deny, then ask, then allow"*, and *"a user-level deny blocks a
project-level allow, because deny rules from any scope are evaluated before allow rules"*
([permissions](https://code.claude.com/docs/en/permissions)). One caveat is in the ranked findings
below.

**Not committing a `.mcp.json` is right, and for the reason `CLAUDE.md` gives** — even though the
docs lean the other way in general (*"Check `.mcp.json` into version control so everyone on your
team gets the same MCP tools"*, [MCP](https://code.claude.com/docs/en/mcp)). The test `CLAUDE.md`
states — is the server keyed to this repository or to Jacob — is the correct one, and `neon`,
`sentry` and `next-devtools-mcp` genuinely fail it. The same page supplies a second reason to hold
the line on a solo repo: project-scoped servers normally prompt for approval, but *"`claude -p`
runs, Agent SDK sessions, and cloud sessions can't show that prompt: Claude Code loads
project-scoped servers there **without asking**."*

**Auto memory is on and is being used well.** Five entries, each one a failure that cost something
to learn. Three of the five duplicate committed documentation, which sounds like a finding and is
not: the memory index is 909 bytes, the docs cap what loads at *"the first 200 lines of `MEMORY.md`,
or the first 25KB"*, and duplication of a fact the repo already owns costs almost nothing. The two
that are **not** in the repo are the interesting ones, and they appear in the ranked findings.

**The ADRs, `CONTEXT.md` and `docs/research/` are the strongest artefacts here.** That is a
judgement rather than a citation, and it belongs in Part two.

## Ranked findings

Ordered by what they would actually change. Anything that amounted to "you could also add X" was
cut.

### 1. The workflow this repository documents cannot be run from this repository

`CLAUDE.md` → *Working practice* names a six-step chain:

```
/grill-with-docs → /to-spec → /to-tickets → /implement → /draft-pr → /review-pr
```

Two of those six are in the repo. `/draft-pr` and `/review-pr` are committed under
`.claude/skills/`. The other four resolve to `mattpocock-skills`, a plugin the repository never
declares, and `/implement` and `/code-review` resolve to **personal** skills in `~/.claude/skills/`
that exist on one machine and are in no version control at all. `CODING_STANDARDS.md` compounds it
by instructing a reviewer to check documents against `writing-for-agents` and `SKILL-MECHANICS.md`
*"(mattpocock-skills)"* — a pack the repo does not install.

Three consequences, in descending order of how much they cost:

- **The documented process is not the process, on any machine but one.** Clone this repo on a new
  laptop and `/implement` is Claude Code's bundled behaviour or nothing; `/code-review` is the
  bundled bug-hunting review rather than the two-axis one; `/grill-with-docs`, `/to-spec` and
  `/to-tickets` do not exist. Nothing errors. The failure is the same shape as the two the repo
  already documents at length — the wrong Vercel account, the wrong Linear workspace — a silent
  substitution that reads as working.
- **`.claude/settings.json` already has the mechanism and is one line short of using it.** It
  carries `enabledPlugins` for `resend@claude-plugins-official`. Adding
  `mattpocock-skills@claude-plugins-official` makes the workflow's dependency declared, checkable
  and reproducible. The pack comes from the built-in `claude-plugins-official` marketplace, so no
  `extraKnownMarketplaces` entry is needed and the change is self-contained.
- **A reader cannot audit what they cannot see.** This matters for Part two more than for Part one.

**What to do.** Declare `mattpocock-skills` in project `enabledPlugins`. Move `implement` and
`code-review` from `~/.claude/skills/` into `.claude/skills/` — and **delete the personal copies**,
because the docs are explicit that *"Across levels, enterprise overrides personal, and personal
overrides project"* ([skills](https://code.claude.com/docs/en/skills)). Leaving both in place means
the committed one is decoration: the personal copy wins on Jacob's machine and the two drift
without anything reporting it. `vercel`, `typescript-lsp`, `frontend-design` and
`chrome-devtools-mcp` are a judgement call by the same test `CLAUDE.md` applies to MCP servers —
they are about Next.js on Vercel and about front-end work, so they are arguably repo-keyed too, but
none of them is load-bearing in the documented chain and declaring them is optional.

Cost: about five lines of JSON and two `git mv`s.

### 2. `CLAUDE.md` is 262 lines against a documented ceiling of 200

Anthropic states the number three times, in three different first-party places, and each time as a
threshold rather than a style preference:

- *"**Size**: target under 200 lines per CLAUDE.md file. Longer files consume more context and
  reduce adherence."* ([memory](https://code.claude.com/docs/en/memory))
- *"**Rule of thumb:** Keep CLAUDE.md under 200 lines. If it's growing, move reference content to
  skills or split into `.claude/rules/` files."*
  ([features overview](https://code.claude.com/docs/en/features-overview))
- *"Bloated CLAUDE.md files cause Claude to ignore your actual instructions! … If Claude keeps
  doing something you don't want despite having a rule against it, the file is probably too long
  and the rule is getting lost."* ([best practices](https://code.claude.com/docs/en/best-practices))

262 lines and 16,003 bytes is a 31% overage. That page also names the mechanism:
*"CLAUDE.md content is delivered as a user message after the system prompt"* and is loaded in full
on **every request** ([features overview](https://code.claude.com/docs/en/features-overview) context-cost
table), so the cost is per turn, not per session.

**The obvious remedy does not fit here, and it is worth saying why.** The docs' first suggestion is
`.claude/rules/` with `paths:` frontmatter, which loads a rule *"only when Claude works with
matching files"*. Almost nothing in this `CLAUDE.md` is file-triggered — *Which tool owns what* and
*Closed decisions* fire on the shape of a **task**, not on which file is open, and path-scoping them
would make them miss. So a rules split would be motion rather than progress.

**Two things do earn a cut**, and both are the repo's own standard applied to itself.
`CODING_STANDARDS.md` already says *"`CLAUDE.md` is read every turn, so a line that changes no
behaviour is a real cost"*:

- The ~30 lines at the end of *Which tool owns what* arguing why `neon`, `sentry`,
  `next-devtools-mcp` and `macos-mail-mcp` are user scope rather than committed. That is the
  **record of a settled decision**, not an instruction — nothing in a normal session does anything
  differently because of it. It belongs in `docs/infrastructure.md` or an ADR, with one line left
  behind.
- The paragraph explaining that nothing reports to Sentry yet and that **CAN-51 Keep a record of
  server errors past the hour Vercel keeps them** owns the sign-in. That is ticket state, and it
  will be wrong the day that ticket lands.

That is roughly 35 lines, which lands the file just under the ceiling. Anthropic's own instruction
for the residual is blunt: *"Ruthlessly prune. If Claude already does something correctly without
the instruction, delete it or convert it to a hook."*

**Also free: run `/doctor`.** Its trim check *"cuts content Claude can derive from the codebase,
such as directory layouts, dependency lists, and architecture overviews, and keeps pitfalls,
rationale, and conventions that differ from tool defaults"*
([memory](https://code.claude.com/docs/en/memory), requires v2.1.206+). That heuristic is a good
match for this file: most of it is pitfalls and rationale, which is the half it keeps.

### 3. One absolute rule is enforced by the weakest available mechanism

`CLAUDE.md` states it as absolute and names the failure mode: pass
`--workspace ad2669ec-…` on **every** `orca linear` call, *"Orca is connected to three workspaces
and picks the wrong one silently."* That is precisely the case the docs reserve for a hook:
*"If the instruction is something that must run at a specific point… write it as a hook instead.
Hooks execute as shell commands at fixed lifecycle events and apply regardless of what Claude
decides"* ([memory](https://code.claude.com/docs/en/memory)).

It also has the two properties that make a hook cheap rather than fussy:

- **A mechanical test with no false positives.** Deny a `Bash` call matching `orca linear` that
  carries neither `--workspace` nor `--current`. `--current` is already the documented exception in
  `docs/agents/workflow.md`, so the allow-list is complete and stable.
- **Zero context cost.** The features-overview cost table gives hooks *"Zero, unless the hook
  returns output"* — and a hook that denies returns output only on the call it blocks.

A `PreToolUse` hook blocks by exiting 2 or by returning
`{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
"permissionDecisionReason": "…"}}`, and *"Exit 2 means a blocking error… even a JSON
`permissionDecision` of `"allow"` can't override it"* ([hooks](https://code.claude.com/docs/en/hooks)).
Roughly ten lines of shell in `.claude/settings.json`, committed, which also makes it the first
piece of enforcement in this repo that a reader can see.

Two things to get right when writing it. Do the test **inside** the hook body rather than in the
`if` field, which the docs describe as *"best-effort"* and as failing open when a Bash command
cannot be parsed, with the explicit steer to *"use the permission system rather than a hook to
enforce a hard allow or deny"* ([hooks](https://code.claude.com/docs/en/hooks)). And keep it
minimal, because the same page's security warning applies: *"Command hooks execute shell commands
with your full user permissions."*

The mechanism is already live at user scope — Orca registers hooks on eleven events in
`~/.claude/settings.json` — so this is additive rather than a new moving part. Hook entries
*"merge across levels rather than replacing"* each other, so a project hook does not disturb them.

### 4. The five installed plugins have never been measured, and the failure mode is silent

`CLAUDE.md` says *"the installed plugins already spend ~9k of that before anything is typed"*. That
is the one number in the file with no source behind it, and it now has a first-party way to be
checked. `claude plugin details` reports a plugin's projected token cost split into
**"Always-on: tokens added to every session by the plugin's listing text, such as skill
descriptions, agent descriptions, and command names, regardless of whether any component fires"**
and **"On-invoke: tokens a component costs when it fires"**, computed through the `count_tokens`
API for the active model ([plugins](https://code.claude.com/docs/en/plugins)).

Measuring matters because the listing has a hard budget with a quiet failure. The
`skillListingBudgetFraction` setting defaults to `0.01` — 1% of the model's context window — and
*"when the listing exceeds the budget, descriptions for the least-used skills are dropped and only
their names are listed, so Claude can still invoke them but can't see what they do"*
([settings](https://code.claude.com/docs/en/settings)). Five plugins are enabled, of which `vercel`
alone contributes more than twenty skills. A model-invocable skill whose description has been
dropped does not error; it simply stops being reached for. That is the same class of failure as the
wrong Vercel account and the wrong Linear workspace, which this repo already treats as the ones
worth documenting.

**What to do**, in ascending order of effort. Run `/context` and read the **Skills** row, which
reports the listing size after the budget is applied, and `/doctor`, which *"complements it with an
estimate of the skill listing's cost and its biggest contributors"*
([commands](https://code.claude.com/docs/en/commands)). If the budget is being hit, the Installed
tab already flags candidates: it groups plugins *"you installed yourself but haven't used in at
least two weeks, over a span of at least 10 sessions"* under **Not used recently**
([discover plugins](https://code.claude.com/docs/en/discover-plugins)). Then either cite the real
number in `CLAUDE.md` or drop the claim.

### 5. Two pieces of load-bearing reasoning exist only in machine-local auto memory

The docs are explicit that *"Auto memory is machine-local… Files are not shared across machines or
cloud environments"* ([memory](https://code.claude.com/docs/en/memory)). Three of the five entries
here duplicate committed docs and are harmless. Two do not:

- **`user-invoked-skills-unreachable`** — that `disable-model-invocation: true` blocks invocation
  *from another skill*, so a wrapper can only delegate to a model-invocable target, and any wrapper
  around `implement`, `grill-with-docs`, `to-spec` or `to-tickets` must inline the content instead.
  This is the entire reason the personal `implement` skill is a copy rather than a delegation, and
  nothing a reader can see says so.
- **`orca-linear-write-unconfirmed`** — that `orca linear` writes report unconfirmed while landing,
  and that `--label` replaces the whole set. `docs/agents/issue-tracker.md` is the file that should
  own that.

**What to do.** Fold the first into the `implement` skill as a two-line note when it moves into the
repo — which is exactly what the `code-review` shim already does for its own reasoning, so the
pattern is established. Check the second against `docs/agents/issue-tracker.md` and add whatever is
missing.

### 6. Half of the only deny rule in the repo is undocumented

`.claude/settings.json` denies `mcp__claude-in-chrome` **and** `Skill(claude-in-chrome)`. The first
is documented syntax and works. The second is not in the permissions reference: that page documents
`Bash(…)`, `Read(…)`, `Edit(…)`, `WebFetch(…)`, `mcp__…` and `Agent(…)` rule targets, and no
`Skill(…)` form appears. Whether it matches is **unverified**.

The documented mechanism for the skill half is `skillOverrides`, where `"off"` means
*"Hidden / Hidden"* in the listing and the `/` menu, and *"Invoking a hidden skill by its full name
still returns the `skillOverrides` error instead of running it"*
([skills](https://code.claude.com/docs/en/skills)). Erroring is precisely the wanted outcome here.

Note this **narrows a generalisation in the auto memory**, which says never to fix a name collision
with `skillOverrides`. That was true of `code-review`, where erroring was the wrong outcome because
the name had to keep resolving to something. It is not true of a rule whose entire purpose is to
make the skill unreachable.

Cost: one settings key. The rule protects Jacob's real browser sessions, so an unverified half is
worth closing.

### 7. The same instruction is written four times, one of them on every turn

Context7 routing exists in:

1. `~/.claude/rules/context7.md` — 1,679 bytes, loaded **every session, in every project**.
2. `~/.claude/skills/context7-mcp/SKILL.md` — 56 lines, near-identical content, plus a skill
   listing entry that costs context on every request.
3. The `context7` MCP server's own instructions, which the server supplies to every session.
4. The *Which tool owns what* row in this repo's `CLAUDE.md`.

Items 1 and 3 are word-for-word the same paragraph. This is the repo's own standard —
`CODING_STANDARDS.md`, *one meaning, one place* — failing on Jacob's personal configuration rather
than in the repo. Deleting 1 and 2 leaves the MCP server's own instructions doing the always-on
work and this repo's `CLAUDE.md` doing the project-specific routing, which is where it belongs. It
is small, it is free, and it applies to every project on the machine.

### One command covers three of these

Before doing any of findings 2, 4 or 7 by hand, run **`/doctor`**. Its documented remit is exactly
those three: it *"Finds unused skills, MCP servers, and plugins versus their context cost, flags
slow hooks… Deduplicates local `CLAUDE.md` files against checked-in ones, trims checked-in
`CLAUDE.md` files by cutting content Claude could derive from the codebase, and migrates the
always-loaded guidance that remains into skills and nested `CLAUDE.md` files that load on demand"*
([commands](https://code.claude.com/docs/en/commands)). It *"Reports findings first and asks for
confirmation before changing anything"*, so it is a diagnostic rather than a commitment. It also
offers to pre-approve frequently denied read-only commands, which is the allow-list question in the
table below answered without maintaining a file.

## The wrapper skills: is wrapping another author's skill sound?

This deserves its own answer because it is the least conventional thing in the setup and the
easiest to get wrong.

**The pattern is sound, and the reason it is sound is that the alternative is worse.** Editing the
plugin's own `SKILL.md` does not survive a plugin update — the pack is versioned under
`~/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/<version>/`, and 1.2.2 and 1.2.3
are both installed right now, so an edit to either is a file the next release replaces. A wrapper
at a scope that overrides is the only edit point that persists. Both wrappers are documented as
deliberate, which is what separates this from cruft.

**But the two wrappers are different in kind, and only one of them is a wrapper.**

| | `code-review` | `implement` |
| --- | --- | --- |
| What it does | Delegates: *"Invoke `mattpocock-skills:code-review`… this file owns the name, not the procedure"* | Copies upstream's `SKILL.md` verbatim and adds one line |
| Why | `mattpocock-skills:implement` ends with an unqualified *"use /code-review"*, and Claude Code's bundled skill wins that bare name — so `/implement` silently ran the wrong review | The upstream `implement` carries `disable-model-invocation: true`, which blocks invocation from another skill, so delegation is impossible |
| Drift risk | None. Upstream can change freely | Real. A `diff` against upstream 1.2.3 shows the file is identical apart from one inserted line |
| Verdict | Earns its place | Earns its place, with a caveat |

The `code-review` shim is the better piece of work and it should be the model. It is short, it
names the upstream bug (`mattpocock/skills#483`), it records what was tested and when, it states
the cost accepted (the bundled review is unreachable machine-wide), and it says how to undo it.
That is what a deliberate override should look like.

The `implement` copy is **forced rather than sloppy**, and the constraint is real:
`disable-model-invocation` *"prevents Claude from automatically loading this skill"* and, per the
tested note in auto memory, blocks a `Skill` call from inside another skill too. Given that, a copy
is the only option, and the mitigation is the right one — keep it short enough to re-sync by eye.
It currently is: five lines of body, one line added.

**Two things are wrong with it anyway.** First, the file records none of that. It carries no note
saying it is a fork of upstream, which version it forked, why delegation was impossible, or what
the added line is for — everything the `code-review` shim gets right. Second, the added line reads
*"using whichever tool `CLAUDE.md` puts in charge of that lookup"*, which only means anything in a
repository whose `CLAUDE.md` has such a table. That is a project-keyed instruction sitting in
user scope.

### Should the personal skills be committed?

**Yes, for `implement`. Yes, on balance, for `code-review`. No for `context7-mcp`, which should be
deleted instead.**

The argument is the one in finding 1: the repository documents a chain and ships a third of it.
Moving both into `.claude/skills/` makes the documented process reproducible, reviewable and
visible. Two things have to be true for the move to work rather than to create a second problem:

- **Delete the personal copies.** Personal overrides project. Keeping both means the committed file
  is never the one that runs, and nothing tells you. Note this is specific to *skills*: subagent
  precedence runs the other way, `.claude/agents/` above `~/.claude/agents/`
  ([sub-agents](https://code.claude.com/docs/en/sub-agents)), so the intuition transferred from
  anywhere else in the system is the wrong one here.
- **Accept what `code-review` loses.** Its whole point is taking a bare name from a *globally*
  enabled plugin. At project scope it fixes the collision here and nowhere else. That is the right
  trade: this repository is where Jacob reviews code, and the alternative is a fix that only exists
  on one laptop and that no reader can find.

`context7-mcp` is a straight duplicate of an always-loaded rules file and of the MCP server's own
instructions (finding 7). It should not be committed; it should go.

## The features he is not using, and whether each earns its place here

Every row was checked against the page that owns it. Three are worth doing, and the rest are not,
which is the useful half of this table.

| Feature | Status here | Verdict |
| --- | --- | --- |
| **Hooks** | None at project scope. Orca registers eleven events at user scope, all its own | **Yes, once.** The `orca linear --workspace` guard — finding 3. Beyond that, no: the docs' other worked examples (block edits to protected files, run a linter after edits) are already covered by the ruleset and by CI |
| **Sub-agents** (`.claude/agents/`) | None | **No.** `mattpocock-skills:code-review` already fans out to sub-agents with prompts it constructs inline, so a definition file would sit unused. Anthropic's own multi-agent post names *"most coding tasks with limited parallelizable components"* as a poor fit, and prices agents at ~4× the tokens of chat and multi-agent systems at ~15× ([multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), 13 June 2025). Research fan-out — how this document was produced — is the one place they pay, and `mattpocock-skills:research` already does it |
| **Output styles** | Not used | **No.** Behaviour here is set by `CLAUDE.md` and by skills, which is where the docs put it |
| **Statusline** | **Already configured** — `ccstatusline` in `~/.claude/settings.json` | Nothing to do. The premise that it is missing is wrong |
| **Settings / permissions layering** | Project: one `deny` pair. User: `defaultMode: "auto"` | **No allow-list needed.** `auto` *"auto-approves tool calls with background safety checks"* ([permissions](https://code.claude.com/docs/en/permissions)), and project `permissions.allow` is gated behind the workspace-trust dialog anyway. An allowlist would buy nothing. The `Skill(…)` half of the deny rule is finding 6 |
| **MCP scoping** | No `.mcp.json`; three servers at user scope, one plugin-scoped to the project | **Correct as is.** `CLAUDE.md`'s stated test — repo-keyed or Jacob-keyed — is the right one and it applies it correctly |
| **Context management** | `CLAUDE.md` at 262 lines; auto memory on and used | Findings 2, 4 and 5 |
| **Scheduled tasks** | Not used | **No, and structurally so.** Every skill in the documented chain carries `disable-model-invocation`, and as of v2.1.196 *"a scheduled fire only runs skills that Claude is allowed to invoke on its own"* — such skills *"reach Claude as plain text instead of executing"* ([scheduled tasks](https://code.claude.com/docs/en/scheduled-tasks)). A routine could name `/implement` and get prose. Independently, nothing here has a clock: the nearest candidate, re-checking TMDB's terms or Ofcom's toolkit before launch, is a launch gate that `docs/research/` already flags in prose |
| **Slash commands** (`.claude/commands/`) | Not used | **Correctly not used.** *"Custom commands have been merged into skills… A file at `.claude/commands/deploy.md` and a skill at `.claude/skills/deploy/SKILL.md` both create `/deploy` and work the same way"* ([skills](https://code.claude.com/docs/en/skills)), and skills are the documented successor. Nothing to migrate — there is nothing there |
| **Plugins** | Five at user scope, one at project scope | Findings 1 and 4. The mechanism is right; the declaration is missing and the cost is unmeasured |

## Where nothing needs doing, and why

Three things look like gaps and are not. Each is here so the next reader does not re-open it.

**A hook to enforce the prior-repository prohibition.** It is the most absolute rule in
`CLAUDE.md`, and a `PreToolUse` hook is the documented way to make a rule binding. It still should
not be built. The strings it would have to match — `canoncore`, `CanonCore` — appear in the
permitted repository name, in every Linear URL (`linear.app/jacobrees-canoncore/…`), in the
production host, and in the local path of the checkout itself. A pattern precise enough to avoid
blocking normal work is a pattern the allow-list has already swallowed, and it would need editing
every time a new legitimate URL shape appeared. Against that, the track record is clean: every
research agent has been given the constraint explicitly and every one has reported no such source
appeared ([`docs/research/README.md`](README.md)). Prose is the right mechanism for a rule whose
violations are not mechanically distinguishable from compliance.

**A hook to stop `/implement` committing on `main`.** `CLAUDE.md` warns that nothing does this for
you and that pushing `main` deploys to production. The second half is already false: the ruleset
requires two status-check contexts on the default branch, so the push is refused. What is left is a
local commit on the wrong branch, which is annoying and recoverable, and `docs/agents/workflow.md`
already documents the recovery. Enforcement exists at the layer where the consequence was.

**A `permissions.allow` list.** See the table. `auto` mode plus a sandbox-free Orca worktree means
prompts are already rare, and an allowlist adds a file to maintain for no change in behaviour.

---

# Part two — the repository as a portfolio piece

The audit above asks whether the setup works. This half asks a different question: what does a
person reading this repository conclude about the person who wrote it, and is that conclusion
helped or hurt by how visibly it was built with an agent?

Two things have to be separated before any of it makes sense, because they are constantly
conflated and they point in opposite directions. **What a hiring engineer reads off the artefact**
is one question. **What the industry's published evidence says about AI-assisted development** is
another. The first is where this repository's real problems are. The second is where its
reputation risk is, and the risk turns out to be smaller and differently shaped than it looks.

## What a reader actually finds, in the order they find it

This is not a hypothetical. It is the sequence a GitHub visitor goes through, checked against the
live repository on 12 August 2026.

**They land on the repository root and there is no README.** `git ls-files` returns eight files at
the root and none of them is one: `.gitignore`, `CLAUDE.md`, `CODING_STANDARDS.md`, `CONTEXT.md`,
`LICENSE`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`. GitHub renders the file list
and then nothing. The About box is empty too — `description` is `""` and there are no topics.

**The first prose they see is therefore `CLAUDE.md`**, alphabetically first among the readable
files and the largest. It opens with a section titled *Prior repositories are off limits*. A
stranger has no way to read that as anything but strange, because the context that makes it
reasonable is not in the repository.

**The live link goes to a holding page.** `homepageUrl` on the repository is
`https://canoncore.vercel.app`, not the canonical `https://www.canoncore.com` that
[ADR-0010](../adr/0010-canonical-host-www.md) settled — checked on 12 August 2026, the apex 301s to
`www` correctly and `www` returns 200, so the infrastructure is right and only the About box is
stale. Either URL serves: *"Being rebuilt. Nothing to see here yet."*

**If they open the code, there is 211 lines of it.** All TypeScript, TSX, CSS and config under
`apps/` and `packages/`, excluding lockfiles and `node_modules`. `page.tsx` is 15 lines. Against
that sit **9,167 lines of markdown** across the tracked `.md` files. The ratio is roughly 43:1.

**If they open the history, it is strong.** 33 commits, 26 merged pull requests, every one squash-
merged with an imperative subject that names a behaviour rather than a task
(*"Refuse a merge to main that its checks do not support"*, *"Stop draft-pr step 5 reading a local
main that Orca keeps permanently stale"*). PR bodies run to several thousand characters and cite
evidence. CI runs on every push and the default branch requires it.

**And if they open `docs/`, it is genuinely good.** Twelve ADRs that state a decision, name the
rejected alternatives and say what would reverse them. A `CONTEXT.md` that defines a domain
vocabulary with per-concept *Avoid* lists. Research files that cite the page that owns each claim
and mark second-hand claims unverified. A compliance folder that does the Online Safety Act work
properly. This is the strongest material in the repository by a wide margin, and it is four clicks
deep.

### The gap between those two paragraphs is the whole problem

Nothing in that list is an AI problem. A repository with no README, an empty description, a link to
a holding page, and forty times more prose than code reads as **a project that has not started
yet** — and it reads that way whether a human or an agent wrote every line. The engineering
judgement on display in `docs/adr/` is the best evidence this candidate has, and the current
packaging guarantees that most readers never reach it.

**The four cheapest changes in this entire document are here**, and none of them is about AI:

1. **Write a README.** What CanonCore is, what problem the two-level Story/Version model solves,
   the current honest state (walking skeleton, holding page live, v1 scoped), and links straight
   into `CONTEXT.md` and `docs/adr/`. This is the single highest-leverage file in the repository
   and it does not exist.
2. **Fill in the repository description and topics**, and point `homepageUrl` at
   `https://www.canoncore.com`, which is what ADR-0010 says is canonical and what actually serves.
3. **Ship something a stranger can use.** Not more scope: the ratio fixes itself the moment the
   first vertical slice lands, and [`production-readiness-baseline.md`](production-readiness-baseline.md)
   already argues that v1's feature scope is right and should not grow. The problem is that nothing
   has shipped *yet*, not that too little is planned.
4. **Say, in the README, that the repository is agent-built and how.** The argument for this is
   below, and it is stronger than it first sounds.

## What defensible current practice looks like, from the people publishing about it

Before the hiring evidence, the standard itself. Anthropic is the most useful source here not
because it is neutral — it obviously is not — but because it is the only organisation publishing
concrete numbers about running an engineering org at high agent share, and because its claims are
falsifiable rather than promotional.

**Human accountability is the load-bearing part, and it is stated as such.** From
[How Anthropic secures its AI-native SDLC](https://claude.com/blog/how-anthropic-secures-its-ai-native-software-development-lifecycle)
(claude.com blog; page shows 21 July 2026 — **date single-sourced, treat as probable**): Claude
authors roughly 80% of merged code and more than half of all code is merged by an agent, and
against that they state *"Human accountability is still central to our process."* The mechanisms
named are structural rather than exhortative — review agents are *"designed and scoped to a
specific, narrow focus"* and **cannot merge independently**, humans retain approval for regulated
and critical code, and the post describes an incident where an agent tried to reach another Claude
instance to deploy a fix and *"This was caught at a human review gate as designed."* The framing
they give for what changed is the sentence worth stealing: the shift is *"from monitoring bugs to
monitoring loops."*

**That is the same claim this repository already implements.** The ruleset that no admin can bypass
and the CI that runs on every push are the gate; the human is accountable for what passes it. Where
CanonCore departs — and it should be visible, because `docs/agents/workflow.md` already argues it
at length — is that the review sub-agents are invoked *by* the implementing session rather than
from a fresh one. That is a defensible position and the file defends it. It is also the one place a
sceptical reader will push, so the argument being written down is worth more than the position
being right.

**Four further practices with first-party backing**, each of which this setup either has or
deliberately does not need:

| Practice | Source | Status here |
| --- | --- | --- |
| Close the verification loop — *"Give Claude a check it can run: tests, a build, a screenshot"*, and *"If you can't verify it, don't ship it"* | [best practices](https://code.claude.com/docs/en/best-practices) | Has it: four gate commands plus a Playwright suite |
| Make guardrails deterministic — hooks and permissions, not prose | [features overview](https://code.claude.com/docs/en/features-overview), [Steering Claude Code](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more) | Mostly has it; finding 3 is the exception |
| Do not let the writer grade the work — *"a verification subagent… so the agent doing the work isn't the one grading it"*; and separately, agents *"respond by confidently praising the work — even when, to a human observer, the quality is obviously mediocre"* | [best practices](https://code.claude.com/docs/en/best-practices); [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps), 24 March 2026 | Has a version of it, and argues for its variant in `workflow.md` |
| Do not over-review — *"A reviewer prompted to find gaps will usually report some, even when the work is sound… Chasing every finding leads to over-engineering"* | [best practices](https://code.claude.com/docs/en/best-practices) | Relevant: this repo runs the review once, deliberately, and that is the same instinct |

**One caution about a source everyone quotes.** The much-cited *"Claude Code: Best practices for
agentic coding"* post (Anthropic engineering, 18 April 2025) now **308-redirects** to
`https://code.claude.com/docs/en/best-practices`. The original text — the numbered
explore/plan/code/commit list, the TDD section, the "be OK with a longer CLAUDE.md" line — is not
retrievable from a live first-party URL, and `web.archive.org` was unreachable from this
environment. Anything quoted from the April 2025 wording is **unverified**; the docs page carries
equivalent or stronger claims and is what this file cites. Note that the docs page has since added
a qualifier that cuts against the folk version: *"Plan mode is useful, but also adds overhead… If
you could describe the diff in one sentence, skip the plan."*

## What the published evidence says, and how old it is

The section above is the standard. This one is the evidence, and the first thing to establish is how
much of it there actually is, because that decides how confidently anything below can be stated.

**The three load-bearing datasets are all a year old.** The most recent published Stack Overflow
Developer Survey is the 2025 edition — `https://survey.stackoverflow.co/2026/` returns **404** as of
13 August 2026, and the 2026 survey only *opened* on 23 June
([Stack Overflow blog](https://stackoverflow.blog/2026/06/23/the-2026-developer-survey-is-now-open-for-human-developers-only/)).
DORA has published no 2026 *survey* edition — its 2026 output is a framework, *The ROI of
AI-assisted Software Development* (v. 2026.1), not new measurement. GitHub's most recent annual
Octoverse is October 2025. All three surveys were fielded before agentic
workflows of the kind this repository runs were common, which means **no published dataset measures
the thing this repository actually is.** Every figure below is about AI-*assisted* development, and
transferring it to agent-*driven* development is an inference, not a finding.

**One sourcing warning, the same shape as the redirect trap above.** Several aggregator posts
circulate 2025's headline figures — 84% adoption, 3% high trust — under a "2026 Developer Survey"
title. They are relabelled 2025 data. Nothing here cites them.

## Adoption and trust are moving in opposite directions, and both are real

This is the finding that most commentary gets wrong in one direction or the other, so the numbers
are worth putting side by side. All of the following is **data**.

| | 2023 | 2024 | 2025 |
| --- | --- | --- | --- |
| Using or planning to use AI tools | ~70% | 76% | **84%** |
| Currently using | 44% | 62% | **78.5%** |
| Favourable or very favourable | 70%+ | 72% | **59.7%** |
| "Highly trust" the accuracy of output | — | 2.7% | **3.1%** |
| "Somewhat trust" | — | 40.3% | **29.6%** |
| Combined distrust | — | 30.4% | **45.7%** |

Stack Overflow Developer Survey, [2024](https://survey.stackoverflow.co/2024/ai) and
[2025](https://survey.stackoverflow.co/2025/ai) AI sections, both read directly. The 2025 edition is
49,009 responses from 177 countries, fielded 29 May to 23 June 2025
([methodology](https://survey.stackoverflow.co/2025/methodology)) — and self-selected, recruited
"primarily through channels owned by Stack Overflow", which is a real limit on all of it. The 2023
column is weaker than the other two: "currently using" is read off the 2024 page's own comparison
(*"62% vs. 44%"*), favourability off the 2025 page's *"70%+ in 2023 and 2024"*, and the
using-or-planning figure only from Stack Overflow's February 2026 blog rather than the 2023 survey
itself — first-party, but second-hand within Stack Overflow.

**The survey's own summary of that table is blunter than the table:** *"More developers actively
distrust the accuracy of AI tools (46%) than trust it (33%), and only a fraction (3%) report
'highly trusting' the output."* Two derived figures circulate from the same rows and both are
correct: 3.1 + 29.6 = the "33% trust", while the widely-quoted *"Only 29% of 2025 respondents said
they trust AI, down 11 percentage points from 2024"*
([Stack Overflow blog](https://stackoverflow.blog/2026/02/18/closing-the-developer-ai-trust-gap/),
18 February 2026) tracks the "somewhat trust" row alone. Say which cut you mean.

**Every other first-party survey agrees on the adoption half.** DORA's 2025 report puts AI use at
work at **90%** of nearly 5,000 respondents, at a median of two hours a day
([Google blog](https://blog.google/innovation-and-ai/technology/developers-tools/dora-report-2025/),
23 September 2025). JetBrains puts regular use at **85%** across 24,534 developers in 194 countries
([State of Developer Ecosystem 2025](https://blog.jetbrains.com/research/2025/10/state-of-developer-ecosystem-2025/),
October 2025), rising to **90% using at least one AI tool at work** in a January 2026 pulse of
10,000+ professionals
([JetBrains](https://blog.jetbrains.com/research/2026/04/which-ai-coding-tools-do-developers-actually-use-at-work/),
April 2026).

**And the newest data says supervised agent use is now normal.** Stack Overflow's May 2026 pulse
(1,100 respondents, fielded late April 2026) has agent use at work going **31% → 59%** in a year and
daily agent use **14% → 37%**, while **63% "rarely or never let agents run entirely on autopilot"**
([Stack Overflow blog](https://stackoverflow.blog/2026/05/27/agents-on-a-leash-agentic-ai-remains-mostly-monitored-at-work/),
27 May 2026).

**What that adds up to matters for the hiring question and is easy to state backwards.** The trust
that fell is trust in *the accuracy of the output*, not trust in the *practice*. Nobody is
abandoning the tools; 84% are using or planning to, and 78.5% already are. The complaint is
specific and consistent: **66%** name *"AI solutions that are almost right, but not quite"* as their
single biggest frustration and **45.2%** say *"debugging AI-generated code is more time-consuming"*
([Stack Overflow 2025](https://survey.stackoverflow.co/2025/ai)).

So the reputational position of AI-assisted development in 2026 is not "disreputable". It is
**universal and openly distrusted at the same time**, which is a different thing, and it moves the
question a candidate has to answer. Not *did you use AI* — almost everyone did. **What did you do
about the part that is almost right.**

## On quality, the best single source contradicts itself

This is what a sceptical reviewer will assume is bad, and the honest answer is that the evidence is
mixed, contested, and in one important case self-contradicting within a single report.

| Source | Type | What it found | Cuts |
| --- | --- | --- | --- |
| [GitHub Octoverse 2025](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/) (28 Oct 2025) | Platform telemetry, first-party | *"Broken Access Control overtook Injection as the most common CodeQL alert, flagged in 151k+ repositories (+172% YoY)"*, and *"Much of this stems from misconfigured permissions in CI/CD pipelines and AI-generated scaffolds that skip critical auth checks"* | **Against** |
| Same report, same year | Same | *"26% fewer repositories received critical alerts"*, average fix time *"shrinking from 37 to 26 days"*, and Copilot Autofix accepted for Broken Access Control in *"6,000+ repositories per month"* | **For** |
| [DORA 2024](https://dora.dev/research/2024/dora-report/) | Survey, n≈3,000 | *"an estimated 1.5% reduction [in throughput] for every 25% increase in AI adoption"* and *"7.2% reduction"* in delivery stability — while the *same* survey found a **3.4% increase in code quality** and 7.5% in documentation quality | **Both** |
| [DORA 2025](https://blog.google/innovation-and-ai/technology/developers-tools/dora-report-2025/) (23 Sep 2025) | Survey, n≈5,000 | AI adoption now shows a **positive** relationship with delivery throughput, reversing 2024 — but *"AI adoption does continue to have a negative relationship with software delivery stability"*. 80%+ report a productivity gain; **59%** report a positive influence on code quality | **Both** |
| [Cui et al., *Management Science*](https://pubsonline.informs.org/doi/10.1287/mnsc.2025.00535) (27 Feb 2026) | **Peer-reviewed**, three RCTs, n=4,867 | *"a 26.08% increase (standard error: 10.3%) in completed tasks"* at Microsoft, Accenture and a Fortune 100 firm; *"less experienced developers had higher adoption rates and greater productivity gains"*. Measures completed tasks, not defect rate | **For** |
| [METR RCT](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) (10 Jul 2025) | Randomised controlled trial, n=16, 246 issues | Developers were **19% slower** with AI, while believing they were 20% faster and having predicted a 24% speedup. **Flagged out of date by its own authors** — below | **Against, withdrawn** |
| [Veracode](https://www.veracode.com/blog/spring-2026-genai-code-security/) (24 Mar 2026) | **Vendor** benchmark, 150+ models, method disclosed | *"only 55% of generation tasks result in secure code"*, and pass rates *"remain stubbornly stuck at approximately 55% – virtually identical to where they stood two years ago"* | **Against** |
| [GitClear](https://www.gitclear.com/the_ai_code_quality_maintainability_gap) (Jan 2026) | **Vendor**, 623M changes, **method undisclosed** | Code-block duplication **+81%**, refactoring line moves **−70%** since 2022. Does not disclose how AI-authored code is identified, so the causal claim is unsupported | **Against** |
| [Sonar](https://www.sonarsource.com/company/press-releases/sonar-data-reveals-critical-verification-gap-in-ai-coding/) (8 Jan 2026) | **Vendor** survey, n>1,100 | *"96% of developers report they do not fully trust that AI-generated code is functionally correct"*; only 48% always check before committing | **Against** |

**Take the Octoverse rows together, because that is the honest reading.** The single best security
datapoint available says AI scaffolding is measurably skipping auth checks at scale *and* that the
same year saw fewer critical alerts and faster fixes. A first-party telemetry source cutting both
ways inside one report is the most accurate summary of the field there is.

**METR is the number a sceptical reviewer is most likely to quote, and its own authors have
retired it.** A banner now sits at the top of the study page: *"⚠️ These results are out of date. We
have released results that are current as of early 2026, in a continuation of this study. We believe
these historical results no longer reflect the current impact of AI models on open-source developer
productivity."* The continuation then broke down in an instructive way. METR reports that *"the data
from our new experiment gives us an unreliable signal of the current productivity effect of AI
tools"*, because *"30% to 50% of developers told us that they were choosing not to submit some tasks
because they did not want to do them without AI"* — and concedes that *"the true speedup could be
much higher among the developers and tasks which are selected out of the experiment"*
([METR](https://metr.org/blog/2026-02-24-uplift-update/), 24 February 2026). **Citing the 19% figure
in 2026 without that update misrepresents it.**

**The original caveats were already strong, and they point the same way.** In July 2025 the authors
declined the general claim: the results do not show *"AI systems do not currently speed up many or
most software developers"*, do not generalise beyond software development, and do not show *"there
are not ways of using existing AI systems more effectively to achieve positive speedup"*; and
*"there are likely biases in which developers ended up participating"*. The setting was 16
experienced maintainers on repositories they knew deeply — *"22k+ stars, 1M+ lines of code"* — which
is the opposite of a greenfield project, using *"Cursor Pro with Claude 3.5/3.7 Sonnet"*, which
predates agentic workflows entirely.

**The two best-designed studies disagree, and the disagreement is the finding.** METR measured 19%
*slower* among 16 expert maintainers in million-line codebases. Cui et al. measured 26.08% *more
completed tasks* across 4,867 developers at three companies, with less experienced developers
gaining most. Those reconcile if the gain concentrates where the codebase is new or unfamiliar and
the developer is not already expert in it, and evaporates where deep familiarity is the thing being
substituted for. That is a real pattern with real support, and it is the most favourable honest
reading available for a greenfield project. It is also worth saying plainly: **neither study
measures a solo engineer directing agents on a greenfield codebase, because nobody has published
one.**

**One finding replicates across every study design here, and it is the one that matters most for a
reviewer.** People consistently misjudge AI-assisted work in the same direction. METR's developers
believed they were 20% faster while being 19% slower. In a peer-reviewed controlled study,
participants given an AI assistant wrote less secure code on four of five tasks **and were more
likely to believe they had written secure code** — though the same study found that *"participants
who trusted the AI less and engaged more with the language and format of their prompts… provided
code with fewer security vulnerabilities"*
([Perry, Srivastava, Kumar and Boneh, ACM CCS 2023](https://arxiv.org/abs/2211.03622), n=47, on a
now-obsolete model — the overconfidence result is what survives, not the absolute rate). DORA 2025
has 80%+ reporting a productivity gain from an instrument that cannot check them. **Self-assessment
of AI-assisted work is the least reliable evidence there is**, which is the empirical case for
Part one's rule that the writer must not grade the work.

**The mechanism underneath all of it is the useful part, and DORA states it directly.** From
[Balancing AI tensions](https://dora.dev/insights/balancing-ai-tensions/) (10 March 2026, Jessica
Baolin and Nathen Harvey): *"The time saved during initial code or content generation is often
re-allocated to verification overhead and prompting overhead."* The developer quotes it publishes
are sharper still: *"While I end up spending less time writing code, I spend more time babysitting
the AI"*, and *"Reviewing [another's] code is so much harder than writing it. AI tools are
increasing the rate at which people can churn out code that needs to be reviewed."* DORA's 2026
framework gives the cost a name — the **"verification tax"** — and attributes it to two things at
once: *"Developers invest time reviewing generated code due to concerns about the trustworthiness of
output and hallucinations. Furthermore, the tools increase the sheer volume of code produced, which
expands the overall review burden"* ([The ROI of AI-assisted Software
Development](https://dora.dev/ai/roi/report/), v. 2026.1).

**That is the whole hiring question in one sentence.** Generation stopped being scarce; review
capacity became the constraint. Which is why Part one's finding that the enforcement layer here sits
outside the agent is not a workflow detail — it is the only part of this repository that speaks to
the bottleneck the data actually names.

## What hiring processes actually do about it

**The headline finding is an absence.** Exactly two companies have a public, self-published,
candidate-facing policy on AI use in engineering hiring: Anthropic and Canva. Amazon's reported ban,
Google's reported Gemini pilot and Meta's reported AI-enabled coding round exist only as journalism
quoting internal documents; Amazon's own
[interviewing page](https://www.amazon.jobs/content/en/how-we-hire/interviewing-at-amazon) mentions
AI nowhere. Stripe, Vercel, GitHub, Netflix and Microsoft have published nothing locatable. All
reported-only policies below are **unverified**.

**[Anthropic's candidate guidance](https://www.anthropic.com/candidate-ai-guidance)** (published
policy, last updated 10 July 2025) is stage-by-stage rather than blanket, and this is the shape most
worth knowing:

- Applying: *"Please create your first draft yourself, then use Claude to refine it."*
- Take-homes: *"Complete these without Claude unless we indicate otherwise."*
- Preparing: *"Use Claude to research Anthropic, practice your answers, and prepare questions for us."*
- Live interviews: *"This is all you–no AI assistance unless we indicate otherwise."*

Its third stated expectation is *"Be transparent"*, and the page models it, disclosing that Anthropic
uses Claude to *"create job descriptions, develop interview questions, draft and refine candidate
communications, analyze hiring metrics, transcribe interviews, and identify candidates to source"*,
and closing with *"Yes, a human collaborated with Claude to help write this guidance about using
Claude!"* It also invites reuse: *"Feel free to adapt this framework for your organization."* Note
what this does to the folk claim that AI-fluent employers waive the rules — the most AI-native
employer there is **still runs an unassisted take-home and an unassisted live interview.** The
policy replaced an earlier one asking candidates not to use AI assistants at all, whose text
survives only in [news quotation](https://arstechnica.com/ai/2025/02/irony-alert-anthropic-says-applicants-shouldnt-use-llms/)
(4 February 2025) — **unverified**, and no first-party explanation of the change was published.

**[Canva](https://www.canva.dev/blog/engineering/yes-you-can-use-ai-in-our-interviews/)** (published
policy, Simon Newton, 11 June 2025) went the other way: *"we now expect Backend, Machine Learning
and Frontend engineering candidates to use AI tools like Copilot, Cursor, and Claude during our
technical interviews."* The reasoning is *"Transparency Over Detection"* — *"Rather than fighting
this reality and trying to police AI usage… we made the decision to embrace transparency and work
with this new reality."* Ownership is unchanged: *"we expect engineers to take full ownership of any
code they produce, whether they wrote it themselves or with AI assistance."* Internally it drew the
predictable objection, that this replaces fundamentals with what one engineer called *"vibe-coding
sessions"*.

**The line from that post that bears hardest on this repository** is what they observed about who
did badly: *"candidates with minimal AI experience often struggled, not because they couldn't code,
but because they lacked the judgment to guide AI effectively."* That is a published employer
statement that directing an agent well is an assessed, scarce skill.

**The platform data says most employers have not moved, though.** From
[Karat](https://karat.com/engineering-interview-trends-2026/) (7 January 2026, 400 engineering
leaders across the US, India and China — **vendor survey**, and Karat sells human-led AI-enabled
interviews, so every finding points at its product): *"over half (62%) of organizations still
prohibit AI use in technical interviews"*, *"71% of leaders say AI is making technical skills harder
to assess"*, and leaders *"estimate that over half of candidates use AI despite being instructed not
to"*. [CoderPad](https://coderpad.io/blog/hiring-developers/new-research-the-2026-state-of-tech-hiring-what-ai-means-for-developers-and-hiring-teams/)
(11 March 2026, 650+ respondents) publishes no equivalent percentage, only *"Some teams ban AI
during interviews. Others permit it with constraints… There's no universal approach"* — but it does
say what is valued when AI is allowed: candidates who *"Catch and fix AI mistakes; Explain
trade-offs and correctness; Improve AI output through iteration."*

**On whether AI-assisted asynchronous work is discounted, there is one published statement and it is
a yes.** Karat again: *"As the hiring signal from take-home projects and automated tests degrades
the fastest under AI, live interviews are now more valuable because they allow interviews to observe
how candidates work through a problem, make decisions, and use AI."* The stated reason is that
take-homes *"only look at the candidate's final output"* and *"interviewers also lack visibility
into the candidate's process."*

**That reasoning generalises to a portfolio repository, and it is the real risk.** A public repo is
an unsupervised artefact whose final output is all a reader can see. It is the same category Karat
says is losing signal fastest. Note the discount is applied for *unverifiability of authorship*,
not for AI use — it lands whether or not anything is disclosed.

**And there is resentment in the developer population, which is not the same as employer policy.**
HackerRank's [Developer Skills Report 2025](https://www.hackerrank.com/reports/developer-skills-report-2025)
has **73%** of developers saying *"it's unfair to lose out to candidates who use AI"* and **76%**
saying AI makes gaming the system easier. Interviewers are drawn from that population.

**One void worth stating plainly.** No employer has published a description of how it evaluates a
candidate's GitHub profile in light of AI-assisted code. Searches return only unsourced listicles.
Anyone claiming to know how a repository like this one is read in a hiring process — including this
file — is inferring.

## So: asset or liability?

**Start with what the artefact has stopped being able to prove, because it is the most important
thing anyone has published on this and it is not a hostile source.** Simon Willison, who builds this
way himself (**opinion**, but from a practitioner arguing against his own interest): *"It used to be
if you found a GitHub repository with a hundred commits and a good readme and automated tests and
stuff, you could be pretty sure that the person writing that had put a lot of care and attention
into that project. And now I can knock out a git repository with a hundred commits and a beautiful
readme and comprehensive tests of every line of code in half an hour! It looks identical to those
projects that have had a great deal of care and attention."* And the line that matters:
*"I can't tell from looking at it. Even for my own projects, I can't tell."*
([simonwillison.net](https://simonwillison.net/2026/May/6/vibe-coding-and-agentic-engineering/),
6 May 2026.) **The inference from artefact to effort is broken, and it is broken for everyone.**
That is not a penalty applied to agent-built repositories; it is the loss of a proxy that used to
work, and it applies to this repository whether or not anything is disclosed.

**Neither, and the framing is the mistake.** With adoption at 84–90% across every published survey,
"built with AI" is not a distinguishing claim in either direction. What the artefact can be is
evidence about *which kind* of AI-assisted engineer wrote it, and the published evidence is
unusually specific about what the market is short of.

**The case that it is an asset** rests on demand-side data. Of the growth in US software development
postings between May 2025 and May 2026, **71% is senior roles** and **37% is roles with AI in the
title**; postings are up almost 15% since Claude Code launched but remain about **27.5% below their
pre-pandemic level**, a pattern Indeed Hiring Lab calls *"seniority-biased technological change"*
([Indeed Hiring Lab](https://hiringlab.indeed.com/2026/07/08/ai-and-job-postings-from-destruction-to-creation/),
Guillermo Gallacher, 8 July 2026 — **data**). JetBrains has **68%** of developers expecting employers
to require AI-tool proficiency in the near future. Karat frames the shift as *"prompt engineering to
AI orchestration"* and calls *"identifying AI-ready engineers"* the new hiring challenge. Canva
observed candidates failing on exactly that judgement. A repository that demonstrably runs a
disciplined agent workflow is on-thesis for all of it.

**The case that it is a liability** rests on four things. Take-home and unsupervised artefacts are
the format losing signal fastest (Karat). 62% of organisations still prohibit AI in technical
interviews, so many interviewers are professionally invested in assessing unassisted skill. "AI
slop" is now a named reputational category with published consequences — curl ended its bug bounty
outright on 31 January 2026 after the confirmed-vulnerability rate fell from *"north of 15%"* to
*"below 5%. Not even one in twenty was real"*, and states that it will *"immediately ban and publicly
ridicule everyone who submits AI slop to the project"*
([daniel.haxx.se](https://daniel.haxx.se/blog/2026/01/26/the-end-of-the-curl-bug-bounty/),
26 January 2026 — **data**, from the maintainer's own submission statistics).

**And one code host has banned this exact artefact.** Codeberg amended its Terms of Use by member
vote on 23 July 2026: *"You must not share projects that mostly consist of code written by
'generative AI'-tools (including services such as Claude, OpenAI Codex)"*, with the stated
consequence that *"Failure to comply… leads to immediate removal of the content together with a
warning"*
([Terms of Use](https://codeberg.org/Codeberg/org/src/branch/main/TermsOfUse.md),
[announcement](https://blog.codeberg.org/protecting-our-floss-commons-from-llms.html) —
**published policy**, carried 358 to 144 with 14 abstentions on roughly 50% turnout). This is the
most directly on-point source in the whole file: a hosting platform, by democratic vote, deciding a
predominantly agent-built repository is not welcome. Two things bound it. It is Codeberg, not
GitHub — GitHub's Acceptable Use Policies mention AI nowhere at all, which was checked and is a
verified absence. And Codeberg's own carve-outs exempt projects with *"an active community"*, with
*"significant pre-LLM history"*, or where enforcement would be mechanical, which they explicitly
decline. But it establishes that "agent-built repository" is now a category some communities reject
on sight.

**The market context, honestly labelled.** The Stanford Digital Economy Lab's *Canaries in the Coal
Mine* (Brynjolfsson, Chandar and Chen, revised 12 August 2026, ADP payroll data through June 2026)
finds employment for workers aged 22–25 in highly AI-exposed occupations *"about 19% below where it
would be if it had kept pace"* with less-exposed peers, up from a 15% shortfall a year earlier, and
that this *"operates primarily through reduced hiring rather than increased separations"*
([paper page](https://digitaleconomy.stanford.edu/publication/canaries-in-the-coal-mine-six-facts-about-the-recent-employment-effects-of-artificial-intelligence/),
[August 2026 update](https://digitaleconomy.stanford.edu/news/canariesaug26/)). Two caveats before
this is used for anything: the authors' first stated fact is *"We do not see widespread,
economy-wide job displacement associated with AI"*, and **software developers are not separately
quantified on either page** — the occupation-level figure is **unverified**. What is directly
relevant is their fifth fact: declines concentrate where AI **substitutes** for human tasks, while
employment is flat or rising where AI **complements** them.

**The best-argued statement of where that leaves a portfolio comes from Carlos Becker**, creator of
GoReleaser (**opinion**): *"AI didn't kill portfolios. It killed the lazy interpretation of
portfolios. A repository used to imply effort; now it might just imply one prompt. The signal moved
upstream: why this problem, why this solution, what did you reject, who used it, what did you
learn."* He also makes the point that cuts against simply not publishing: *"Having no portfolio
feels worse now… The bar to make something was high enough that the absence of it was ambiguous.
You were given the benefit of the doubt. Now, making something is often just a couple of prompts
away, which, I think, means the absence got louder."* His prescription is four instructions, and
this repository already satisfies the middle two: *"Build something. One thing. Start to finish.
Explain it honestly. Make it obvious where your hands were."*
([carlosbecker.com](https://carlosbecker.com/posts/portfolio/), 26 May 2026.)

**Which is the only useful answer to the question.** The repository cannot prove Jacob can write
code — 211 lines is the file's own count, and no artefact of that size proves anything about
authorship. What it *can* carry is the material Becker says the signal moved upstream to — why this
problem, what was rejected, what would reverse it — which is precisely what `docs/adr/` already
contains, and the thing the data says is scarce: that the person operating the agent built the
verification apparatus, and that the apparatus is real rather than prose. Part one establishes it is
real — CI on every push, a ruleset with no bypass actors, a review defined against a diff range.

**The sharpest version of this is worth stating, because it connects to the ratio problem above.**
The reputational risk of this repository is **not** that an agent wrote it. It is that 9,167 lines of
markdown against 211 lines of code has the exact silhouette of AI slop — high-volume generated prose
with nothing shipped under it — and a reader applying the heuristic the industry has just adopted
will bounce before discovering that the prose is unusually good. DORA's 2026 framework states the
underlying principle in one line — *"code is often seen as a liability, not an asset"*, and
*"generating more code without proper oversight can increase verification overhead and lead to
long-term technical debt"* — and the same logic applies to generated prose, which carries the review
burden without carrying the product. The risk is real, it lands on the ratio rather than on the
agent, and recommendations 1 and 3 above are already its fix.

## Recommendation #4, tested against the evidence

The claim to test: **say, in the README, that the repository is agent-built and how.** The earlier
draft asserted this argument "is stronger than it first sounds" without making it. It survives, but
not for the reason it is usually given, and one premise turns out to be wrong.

**First, the wrong premise: this is not a decision about whether to reveal something.** Checked
first-hand on 13 August 2026, the 33 commits on `main` carry **no** disclosure of agent authorship —
zero `Co-authored-by: Claude` trailers, zero "Generated with Claude Code" footers, nothing matching
*generated with*, *written by Claude* or *agent-built* in any commit body. Every commit is attributed
to one of Jacob's two Git identities. Exactly one commit subject mentions Claude, and it is about
the file: *"Record the slash-command invocation trap, and correct what CLAUDE.md says the pack does
(#56)"*.

**But the repository is legible as agent-built on sight anyway.** `CLAUDE.md` is at the root, is the
largest readable file, and — as the section above establishes — is the first prose a visitor reads.
`.claude/skills/` and `docs/agents/` are one click away. So concealment was never on the table. The
current state is the worst of the three available: **visibly agent-built, and nowhere stated.** The
only live question is who frames it, the author or the reader.

**Second, the published disclosure norms all pair the same two things**, and this repository already
has the harder one. Every project that has published a policy requires disclosure *and* undiminished
human accountability:

| Project | Position | The accountability clause |
| --- | --- | --- |
| [Linux kernel](https://docs.kernel.org/process/coding-assistants.html) | Disclosure **mandatory**, via `Assisted-by: AGENT_NAME:MODEL_VERSION` | *"AI agents MUST NOT add Signed-off-by tags. Only humans can legally certify the Developer Certificate of Origin (DCO)."* The human must be *"Taking full responsibility for the contribution"* |
| [curl](https://curl.se/dev/contribute.html) | Disclosure **mandatory** for AI-found security reports; PRs judged on quality alone | *"the code must still follow coding standards, be written clearly, be documented, feature test cases and adhere to all the normal requirements we have"* |
| [Fedora](https://docs.fedoraproject.org/en-US/council/policy/ai-contribution-policy/) (v1.0, last review 24 Oct 2025) | Disclosure **mandatory** for significant AI content | *"You MAY use AI assistance for contributing to Fedora… You MUST disclose the use of AI tools when the significant part of the contribution is taken from a tool without changes."* |
| [attrs / pip](https://github.com/python-attrs/attrs/blob/main/.github/AI_POLICY.md) | Permitted, **no disclosure demanded**, no AI trailers | *"Every contribution has to be backed by a human who unequivocally owns the copyright… No LLM bots in `Co-authored-by:`s."* And: *"'An LLM wrote it' is **not** an acceptable response to questions or critique. If you cannot explain and defend the changes you submit, do not submit them."* |
| [QEMU](https://www.qemu.org/docs/master/devel/code-provenance.html) | **Declines** AI-generated contributions outright | Provenance under the DCO cannot be certified for content the contributor does not own |
| [Gentoo](https://wiki.gentoo.org/wiki/Project:Council/AI_policy) | **Bans** them (Council vote, 14 April 2024) | Copyright, quality and ethics |

**One thing this table must not be read as saying is that a convention has emerged.** It has not.
Projects that require an AI trailer (Linux, Fedora, LLVM, OpenSSL, GCC) sit alongside projects that
explicitly **forbid** one — Kubernetes and Homebrew both rule out `assisted-by` or `co-developed`
trailers, and attrs and pip rule out AI in `Co-authored-by:`. Both camps want the identical outcome
and reach opposite mechanical conclusions. The direction of travel has also reversed once already:
2024 to mid-2025 produced outright bans, late 2025 into 2026 produced disclosure regimes, and the
bans were never rescinded, so both regimes are live at once. Debian has no policy at all and is
**mid-vote on one as this is written** (General Resolution, voting 15–28 August 2026), so anything
said about Debian here is provisional.

**The pattern that does hold is the second column.** Where AI-assisted work is accepted at all, it
is accepted on the condition that a named human carries the whole liability and that the artefact
meets the unchanged bar.
That is exactly what a ruleset with no bypass actors and four required checks encodes. The README
sentence is not a confession; it is the claim that the second column of that table is satisfied
here, and it is the only place a reader can be told so.

**Third, the mechanism that makes silence actively costly is published, and it is curl's.** On
translation, curl advises disclosing AI assistance because *"Failing to do so risks that maintainers
wrongly dismiss translated texts as AI slop."* That is a maintainer of a major project stating that
**undisclosed AI assistance gets good work discarded**, and it is the closest thing to direct
evidence for recommendation #4 in existence. Its companion line sets the bar the disclosure has to
survive: *"A basic rule of thumb is that if someone can spot that the contribution was made with the
help of AI, you have more work to do."* Disclosure buys nothing if the work reads as unedited output.

**Fourth, the most AI-native employer publishing on this makes transparency an explicit expectation
of candidates** — Anthropic's *"Be transparent… We expect the same transparency from you"* — and
demonstrates it in the same document. Volunteering it is aligned with the one published candidate
standard that exists, not a deviation from it.

**The counter-argument, stated at its strongest.** Karat's 62% of organisations prohibiting AI in
interviews and HackerRank's 73% of developers calling AI-assisted competition unfair describe a
population that may well discount the work on sight. Disclosure could trigger that discount where
silence would not. **The answer is that silence does not avoid it here.** The discount Karat
describes is applied to unsupervised artefacts for unverifiable authorship, which lands on this
repository either way; and the artefact announces its own construction before any README does. What
disclosure changes is not whether the reader concludes "agent-built" but whether they also get the
accountability claim and the gates alongside it.

**Verdict: recommendation #4 survives, with its argument changed.** Not *honesty is good*, but:
the disclosure has already happened implicitly, every published norm that permits AI-assisted work
requires it explicitly and pairs it with accountability this repository can actually evidence, and
the one published account of the failure mode says the punishment falls on undisclosed work.

**What it has to say to work, and what it must not do.** Three sentences, not a manifesto: that the
work is agent-driven; that the gates are what the human is accountable for, naming the ruleset and
the four checks rather than describing a philosophy; and what is *not* claimed — the repo is a
walking skeleton, and the 211 lines are 211 lines. The failure modes are both visible in the sources
above. Treating agent authorship as the achievement is the *"vibe-coding"* reading Canva's engineers
objected to, and it invites the reader to grade prose that has no product under it. And per curl,
disclosure earns nothing if the writing still reads as unedited generation, which is a bar this
repository's `docs/` clears and a hastily-written README might not. **Do not reach for a commit
trailer as though one were settled.** The kernel's `Assisted-by:` is available and defensible, but
as the table above records, as many projects forbid such a trailer as require one. Prose in the
README is the part the evidence supports; the trailer is a live disagreement to stay out of.

**The one hiring manager who has published a rule on this states it as a threshold question.**
Andy Wegner, an engineering leader writing about rebuilding his own interview process: *"I don't ban
AI tools, but I do expect candidates to disclose if they're using them… If we've asked, and they
haven't disclosed, that's a failure of integrity that outweighs technical competence. When you're
hiring someone to join a team, trust matters as much as skill"*
([andrewwegner.com](https://andrewwegner.com/ai-broke-our-interview-process-i-had-to-fix-it.html),
25 March 2026 — **opinion**, one named practitioner, not data). His companion observation is the one
that should shape what the README links to rather than claims: *"The conversation is the evaluation,
not the code."*

**The strongest counterweight, and it runs the other way.** The ACM revised its authorship policy in
May 2026 to **stop** requiring blanket disclosure: *"ACM no longer requires the disclosure"* of AI
assistance in writing, substituting accountability — authors are *"responsible and accountable for
any problematic content contained in the submission regardless of the source"*. It still requires
that AI used *"to conduct research, including… coding"* be *"described in detail in the methods
section"*. So the most established scholarly body to revisit this concluded that disclosure of
*assistance* is the wrong lever and accountability is the right one, while keeping disclosure for
*method*. That is not an argument against recommendation #4 — a README describing how the repository
is built is much closer to a methods section than to a byline — but it is a real published body
moving away from disclosure-for-its-own-sake, and it belongs here rather than in a footnote.
`acm.org` returned a block page to this environment; the text was read through a search backend and
is therefore **second-hand, though first-party in origin**.

**Two limits on all of this, stated because the rest of the file states its limits.** First, there is
**no published evidence** on how disclosing AI assistance in a portfolio README affects hiring
outcomes. Nobody has run that experiment, or nobody has published it. Second, and more subtly, the
disclosure norms above are **contribution** norms: curl, Ghostty, Fedora and the kernel are
governing what arrives at *someone else's* project, and the punishments they publish are for
submitting unreviewed work to a maintainer. Publishing your own repository is not that act, and no
source here shows those norms transferring to it. The argument is built from adjacent published
norms, one candidate policy, one employer's interview findings and one hiring manager's rule, plus
the fact that the disclosure is already implicit here. It is a reasoned position, not a measured
one, and it should be held that way.
