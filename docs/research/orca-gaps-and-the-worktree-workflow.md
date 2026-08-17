# Where this repository and Orca do not meet, and how a lane should be run

**Researched 17 August 2026.** Between 16 and 17 August this repository moved from branches made by
hand to **thirteen tickets shipped through Orca worktree lanes**, up to four of them provably in
flight at once. This is an account of what Orca offers that the repository does not use, what the
repository documents that no longer matches how work happens, and what a lane should do.

**Recommendations, not decisions.** Three questions are answered here with a recommendation rather
than a survey, because the ticket asked for that, and the surfaces below carry verdicts for the same
reason. None of it is settled until it lands in `docs/agents/workflow.md` or an ADR. Where a claim
was checked by running something, the command and its output are given. Where a source is silent,
this document says **not established** rather than inferring.

**The commissioning ticket's premise was wrong in three ways, and the corrections are the substance
of the first half.** **CAN-131 Research where this repository and Orca do not meet, and settle the
worktree workflow** was filed on the belief that a working setup script exists in Orca's per-machine
settings and is missing from git. No setup exists anywhere. That is a different, smaller problem with
a different fix, and finding it out took an experiment rather than a reading.

## What was read

Orca desktop application and CLI **1.4.184** (`orca status --json` → `appVersion`), the CLI being a
symlink into the app bundle, so the two are version-matched. Within that: its bundled skill guides
(`orca skills get <topic> --full`), `orca agent-context --json` — which enumerates all **228**
commands and exposes several groups `orca --help` hides — its own `--help` for every command touched,
and its live runtime over the JSON CLI. For anything where behaviour had to be certain rather than
plausible, **Orca's own source**: the shipped JavaScript under
`/Applications/Orca.app/Contents/Resources/app.asar.unpacked`, and a clone of `stablyai/orca` at
`7ae6aed` (dated 17 August 2026, one release beside the installed build), which is where the schema,
the precedence rules and the hook environment were read rather than inferred. Its issue tracker for
three specific questions. For dependency behaviour, pnpm's own documentation. For this repository, the
working tree at `47261c8` and its git and GitHub history. No secondary write-up, blog post or summary
was used for any claim.

**Much of what follows is source-derived because the vendor does not document it.** `orca.yaml`
appears nowhere in Orca's README or `AGENTS.md`, and in `docs/` only in a Windows-shell reference that
covers `scripts.setup`'s shebang. `scripts.archive`, `issueCommand`, `defaultTabs` and
`worktree.sharedDirectories` have **no prose documentation anywhere**, and there is no published JSON
Schema for the file — [stablyai/orca#12011](https://github.com/stablyai/orca/issues/12011) asks for
one and is open. Statements here about those keys come from the parser and the type, which is a
stronger source but a moving one.

**Three controlled experiments** were run, on two throwaway worktrees: one to see whether a forced
setup does anything and then, on the same worktree, whether removal destroys an unmerged branch; a
second to watch a committed `orca.yaml` actually run. Both worktrees were removed afterwards and
neither branch survives. All three are reported below with their exact output, because two of them
overturn a premise and the third validates the one recommendation that adds a file.

> **Exclusion note.** Per this repository's standing constraint, no earlier CanonCore or Universora
> repository was read, fetched, searched for or quoted. Nothing here required one and no such result
> surfaced. This repository's own `jacobrees-canoncore/CanonCore` is not what the constraint excludes.

## Contents

- [What was read](#what-was-read)
- [The headline: there is no setup, and there never was](#the-headline-there-is-no-setup-and-there-never-was)
- [Why nothing runs, from Orca's own source](#why-nothing-runs-from-orcas-own-source)
- [Why nobody noticed: pnpm covers for it](#why-nobody-noticed-pnpm-covers-for-it)
- [What a fresh clone would and would not get](#what-a-fresh-clone-would-and-would-not-get)
- [`orca.yaml`: the complete schema, and what it cannot carry](#orcayaml-the-complete-schema-and-what-it-cannot-carry)
- [Recommendation one: commit a four-line `orca.yaml`](#recommendation-one-commit-a-four-line-orcayaml)
- [Every Orca surface, with a verdict](#every-orca-surface-with-a-verdict)
- [Question two: should worktree-off-`main` be the documented default?](#question-two-should-worktree-off-main-be-the-documented-default)
- [Question three: should a lane ever branch off something other than `main`?](#question-three-should-a-lane-ever-branch-off-something-other-than-main)
- [The lane era is datable, and "thirteen" is exactly right](#the-lane-era-is-datable-and-thirteen-is-exactly-right)
- [Known negatives, recorded so they are not re-investigated](#known-negatives-recorded-so-they-are-not-re-investigated)
- [Candidate tickets, named and not filed](#candidate-tickets-named-and-not-filed)
- [What this means for the close-out ticket](#what-this-means-for-the-close-out-ticket)
- [Not covered](#not-covered)

## The headline: there is no setup, and there never was

The ticket states that `--setup run` "demonstrably works, because a lane comes up with `node_modules`
populated", and that the script making that true lives on one machine at
`~/Library/Application Support/orca/orca-data.json`. Three separate claims, and each fails.

**One: nothing is stored at that path, and the real store says the same thing more clearly.** There
is no file at `~/Library/Application Support/orca/orca-data.json`; the store is one directory deeper,
at `profiles/local-default/orca-data.json`. The path in the ticket is not invented — `orca agent hooks
status`, an **undocumented** command absent from `orca --help`, prints it with the profile segment
missing:

```
agentStatusHooksEnabled: true
appliedBy: offline
settingsPath: /Users/jacobrees/Library/Application Support/orca/orca-data.json
claude: installed
openclaude: not_installed
```

Reading the store that does exist settles the question rather than leaving it on a missing file. For
`/Users/jacobrees/orca/projects/CanonCore` it holds:

```json
{ "hookSettings": null, "symlinkPaths": null, "worktreeBaseRef": null }
```

and `trustedOrcaHooks` is `null` too. **Every Orca setting for this repository is unset.** So the
machine-local configuration the ticket expected to find is not merely un-checked-in; it was never
made.

**Two: what the CLI reports as settings are defaults being applied, not choices.** Against that stored
`null`, `orca repo show --repo CanonCore --json` returns a populated object:

```json
"hookSettings": {
  "mode": "auto",
  "setupRunPolicy": "run-by-default",
  "setupAgentStartupPolicy": "start-immediately",
  "scripts": { "setup": "", "archive": "" }
}
```

Both scripts are the empty string, and this is `getDefaultRepoHookSettings()` in full — the bundle
carries the literal
`mode:"auto",setupRunPolicy:"run-by-default",setupAgentStartupPolicy:vF,scripts:{setup:"",ar…`. So
there is no script to check in and no script that was lost. The repository is not under-configured
relative to a working machine; **no machine has ever had a setup step for it.**

`mode: "auto"` in particular means nothing. It is a **dead field**: its own declaration says *"persisted
data may still include the old mode field from the earlier hook UI. Keep it in the shape so existing
local state reads without a migration"*, and a search of Orca's source finds **no reader** — the only
write is the default. It does not make Orca infer or run an install. The inference does exist, as
`inspectPackageManagerSetupCandidate`, and it would offer this repository the right answer since it
maps `pnpm-lock.yaml` and a `packageManager: "pnpm@…"` field to `pnpm install` — but it returns a
*candidate* for the Settings pane's import-a-script button, and nothing executes it until a human
accepts it. Nobody has.

**Three: a lane does not come up with `node_modules`.** All three live lanes — `can-131`, `can-24`,
`can-7` — had no `node_modules` and no `apps/web/node_modules` when this research began, two of them
having existed for six minutes by then. To remove any doubt about timing or inheritance, a throwaway
lane was created with setup *forced*:

```
orca worktree create --repo name:CanonCore --name can-131-setup-probe --setup run --no-parent
```

Result: no `node_modules`, no `apps/web/node_modules`, and one terminal sitting at a bare prompt
(`jacobrees@Mac-3488 can-131-setup-probe %`). **`--setup run` ran nothing at all.**

This also explains how the belief arose, which matters more than the error. `node_modules` *is*
present in a lane by the time anyone looks, because by then the agent in it has run a `pnpm` command.
A directory timestamp a minute after the lane's creation reads exactly like a setup hook and is not
one — a mid-research measurement in this very worktree made that inference and it was wrong.

## Why nothing runs, from Orca's own source

`app.asar.unpacked/out/shared/hook-command-source-policy.js` is the whole mechanism, and it is short
enough to quote in substance. Three policies exist — `local-only`, `run-both` and `shared-only`,
where *local* means the per-machine script in Orca's own settings and *shared* means the committed
`orca.yaml` — and resolution is:

```js
function resolveHookCommandSourcePolicy(policy, { hasLocalScript }) {
    if (policy === 'local-only' || policy === 'run-both' || policy === 'shared-only') {
        return policy;
    }
    if (policy === undefined && hasLocalScript) {
        return 'local-only';
    }
    return 'shared-only';
}
```

Its sibling carries the comment *"Treat any unknown value as the authoritative committed config
policy."*

This repository's record has **no** `commandSourcePolicy` field, and `scripts.setup` is `""`, so
`hasLocalScript` is false. The policy therefore resolves to **`shared-only`**: Orca looks only at a
committed `orca.yaml`, finds none, and runs nothing. The experiment and the source agree exactly.

**The useful consequence is that the fix needs no settings change.** The resolved policy already
points at the committed file. Adding `orca.yaml` to the repository takes effect on its own, on every
machine, with nothing to remember.

Two further details matter for anyone acting on this, and both are counter-intuitive.

**`--setup run` is not what makes a setup script run.** The default `setupRunPolicy` is
`run-by-default`, so a committed script runs on a bare `orca worktree create`; `--setup run` only
forces it past a `skip-by-default` policy. If the policy were ever set to `ask`, a CLI create with the
default `inherit` **throws** `Setup decision required for this repository` — on the CLI you would have
to pass `--setup run` or `--setup skip` explicitly. And when a script exists but is not run, the CLI
says so: `orca.yaml setup hook skipped for <path>; pass --setup run to run it.` **The absence of that
warning in the experiment above is itself evidence there was no script to skip.**

**Which checkout `orca.yaml` is read from differs by key**, which decides how a change to it reaches a
lane. `scripts.setup` and `defaultTabs` are read from the **new worktree** — so the file must be
committed to the branch the lane is based on, and a lane created from `origin/main` sees only what
`main` carries. `scripts.archive` and `worktree.sharedDirectories` are read from the **primary
checkout**, and `environmentRecipes` from the project's primary branch. A setup script added on a
feature branch therefore takes effect for lanes based on that branch and nowhere else.

## Why nobody noticed: pnpm covers for it

A missing install step should be loud. It is silent here because **pnpm installs on demand by
default**, and the repository never set the option that would change that.

> ### verifyDepsBeforeRun
>
> - Default: **install**
> - `install` — Automatically runs install if `node_modules` is not up to date.
>
> This setting allows the checking of the state of dependencies before running scripts. The check runs
> on `pnpm run` and `pnpm exec` commands.
>
> — [pnpm settings](https://pnpm.io/settings/build)

There is no `.npmrc` in this repository and `pnpm config get verify-deps-before-run` returns
`undefined`, so the default binds. Observed in this lane, as the first command run in it:

```
$ pnpm --filter @canoncore/web typecheck
Packages: +506
Progress: resolved 506, reused 506, downloaded 0, added 506, done
Done in 2.6s using pnpm v11.20.0
$ next typegen && tsc --noEmit
✓ Types generated successfully
```

**`reused 506, downloaded 0` is the load-bearing part.** It cost 2.6 seconds only because this
machine's content-addressable store is warm — `~/Library/pnpm/store/v11`, 576 MB. A second machine or
a CI runner pays a full download for the same command. A warm re-run is `Already up to date. Done in
166ms`.

So the state of things is: every lane starts incomplete, self-heals the moment it runs a `pnpm`
script, and the repair is invisible and fast on the one machine that has ever run it.

## What a fresh clone would and would not get

**Would get:** everything that decides how the code builds and is checked. `pnpm-workspace.yaml` with
its `allowBuilds` entries, `pnpm-lock.yaml`, the CI workflow, `.claude/settings.json` with the
`mattpocock-skills` and `resend` plugins declared and the `require-linear-workspace.sh` hook, and the
four project skills — all of that was made portable by **CAN-78 Make the documented workflow runnable
from a clone, and give the repository a README**, which is the precedent the ticket rightly cites.

**Would not get:** any statement of what a worktree needs before it is usable. There is nothing to
inherit, so a clone is in the same position as this machine — which is to say it works, by accident,
through pnpm's default. It also would not get four repository-level Orca settings that
`orca.yaml` cannot express at all; those are listed next.

**The precedent is a real match but the shape differs.** That ticket's failure was silent *substitution* —
four of six documented steps resolved to something that did not exist and nothing errored. This one is
silent *sufficiency*: nothing is configured, nothing errors, and the thing that saves it is a default
in a different tool that the repository does not declare and could not rely on if it changed.

## `orca.yaml`: the complete schema, and what it cannot carry

Read from `parseOrcaYaml` in `app.asar.unpacked/out/shared/orca-yaml.js`, which is the parser Orca
actually uses. The filename is **`orca.yaml`** and nothing else: a search of the application bundle
for a `.orca.yaml` variant returns zero hits against 300-plus for `orca.yaml`.

| Key | Type | What it does |
| --- | --- | --- |
| `scripts.setup` | string | Run on worktree create, subject to the source policy above |
| `scripts.archive` | string | Run on `worktree rm`, **only** with `--run-hooks` |
| `issueCommand` | string | Run "when this workspace launches with a linked issue" |
| `defaultTabs[]` | `{title, command, color}` | Terminal tabs opened with a new worktree. `color` must match `#RGB` or `#RRGGBB` or it is dropped |
| `environmentRecipes[]` | `{id, name, create, description?, suspend?, resume?, destroy\|cleanup}` | Per-workspace disposable environments. `id` must match `^[a-z0-9][a-z0-9._-]{0,63}$`; `destroy: none` disables teardown |
| `worktree.sharedDirectories[]` | string[] | Directories **symlinked** into each new worktree, repo-root-relative, max 100 |

Entries in `sharedDirectories` that are absolute, drive-lettered, contain `..` or `.` segments, or
name `.git` are silently dropped, and so is anything needing path collapsing — the source explains
why, and the reason is worth keeping: *"Git reports the collapsed path, so every later comparison
against the stored entry would miss and the link would look like permanent untracked work."* File
limits are 256 KB overall, 64 KB per field, 256 entries per collection.

The schema was verified by feeding a candidate file to Orca's own parser directly, which returned
precisely the intended object — including the `sharedDirectories` normalisation and the tab colour.
That is the check to repeat before committing any change to it.

**A hook gets five environment variables**, and the naming is a trap worth stating: `ORCA_ROOT_PATH`
is the **primary checkout**, not the worktree. `ORCA_WORKTREE_PATH` is the new worktree,
`ORCA_WORKSPACE_NAME` its basename, and `CONDUCTOR_ROOT_PATH` and `GHOSTX_ROOT_PATH` repeat the primary
path for compatibility with two other tools. All five were confirmed by running a hook, below.

**Four things stay per-machine even after an `orca.yaml` lands**, because the schema has no key for
any of them: `mode`, `setupRunPolicy`, `setupAgentStartupPolicy` and `commandSourcePolicy`. The third
is the one that bites. From `app.asar.unpacked/out/shared/setup-agent-startup-policy.js`:

```js
// Why: existing repos should keep launching setup and agents side by side unless
// the user explicitly opts into waiting for setup completion.
exports.DEFAULT_SETUP_AGENT_STARTUP_POLICY = 'start-immediately';
```

So with a setup script in place and the default policy, **the agent starts concurrently with the
install**, and an agent whose first act is a gate races it. `wait-for-setup` fixes that and cannot be
committed. This is a genuine residual gap rather than an oversight, and the honest mitigation is that
pnpm's own `verifyDepsBeforeRun` makes the race harmless for `pnpm` commands — the second install
waits on the first rather than corrupting it.

## Recommendation one: commit a four-line `orca.yaml`

```yaml
scripts:
  setup: pnpm install --frozen-lockfile
```

**Adopt it**, for three reasons and against one real objection.

The objection first, because it nearly carries: pnpm already does this, so the file changes no
observable behaviour today. Under this repository's principle of choosing the simplest thing that
meets the current requirement, a file that changes nothing is hard to justify.

It earns its place anyway because **what it replaces is not "nothing", it is an undeclared dependency
on another tool's default.** `verifyDepsBeforeRun` is pnpm's choice, not ours; it is settable, it has
changed before, and nothing in this repository records that a lane's usability rests on it. Second,
the command is `pnpm install --frozen-lockfile`, which is **exactly what CI runs**
(`.github/workflows/ci.yml:59`), so the lane and the runner stop differing. Third, it costs four
lines and no settings change, because the resolved policy already reads the file.

**It was tested rather than assumed, because one open Orca bug could have killed it.**
[stablyai/orca#13688](https://github.com/stablyai/orca/issues/13688) is open, labelled P1, and reports
that a setup hook cannot see version-manager-installed tools: the runner is launched as `bash <path>`,
which is neither a login nor an interactive shell, so **bash reads no startup file at all** and nothing
sets `BASH_ENV`. That matters here because `pnpm` on this machine is a corepack shim inside an
nvm-managed Node — `~/.nvm/versions/node/v24.19.0/bin/pnpm` — and `env -i bash -c 'command -v pnpm'`
finds nothing. A recommendation of `pnpm install` could have been a recommendation of `command not
found`.

So the file was committed to this branch as a throwaway, a worktree was created from it, and the hook
reported on itself. **That commit was then dropped, which is why no `orca.yaml` appears in this
change** — recommending the file is not the same as landing it:

```
ORCA_ROOT_PATH=/Users/jacobrees/orca/projects/CanonCore
ORCA_WORKTREE_PATH=/Users/jacobrees/orca/workspaces/CanonCore/can-131-hook-probe
ORCA_WORKSPACE_NAME=can-131-hook-probe
SHELL_OPTS=ehB
pnpm: /Users/jacobrees/.nvm/versions/node/v24.19.0/bin/pnpm
--- attempting the real install ---
Done in 2.3s using pnpm v11.20.0
```

**It works.** `SHELL_OPTS=ehB` confirms the bug's mechanism exactly — `e` from `set -e`, no `i` and no
`l`, so no startup file was read — and the hook found `pnpm` anyway, because Orca's inherited `PATH`
carries the nvm bin directory first. The install ran and completed. The probe worktree and its branch
were then removed.

**The honest caveat is that it works for a reason nobody chose.** It depends on the `PATH` Orca itself
was launched with, which is what #13688 is about; this machine also carries mise, asdf, volta and fnm
shim directories further down the same `PATH`. If a lane ever comes up with an uninstalled tree and
`command not found` in its setup terminal, that issue is the first place to look, and the fix is an
absolute path or a `corepack` invocation rather than abandoning the file.

**Do not add anything else to it**, and `worktree.sharedDirectories: [node_modules]` is the entry to
refuse most deliberately, because it is what the feature was *built for*. Orca's own source says so —
*"large rebuildable dirs like node_modules should be one install serving every worktree"* — and the
issue that shipped it,
[stablyai/orca#10451](https://github.com/stablyai/orca/issues/10451), argues that copying is the wrong
semantic because *"one install should ideally serve every worktree; per-worktree copies drift."*

**Drift is the point, not the problem.** That reasoning holds for a fleet of lanes on one branch; it
inverts for a fleet of lanes each on its own branch, which is what this repository runs. The mechanism
is a symlink, never a copy — enforced, with the comment *"share mode must never clone — an independent
copy would give each worktree its own node_modules, defeating one-install-serves-all"* — so a single
`pnpm install` in any lane rewrites the dependency tree under **every** other lane. A branch that adds
or bumps a dependency would silently change what its siblings compile and test against, and the four
gates would be measuring the wrong tree. The saving it offers is disk, and pnpm already gives that
safely: the content-addressable store is global, outside the repository, and shared by clone-on-write.
**Reject.**

`defaultTabs` is **rejected** — five lanes each opening a dev server collide on ports, and tab
*commands* ride the same trust and setup policy as `scripts.setup`, so they are not the free
convenience they look like. `issueCommand` is **rejected**: reading the ticket is the job of
`/implement`, which PR #171 settled when it made the skill read the ticket and its comments before
writing code, and a command's output in a terminal is not the agent's context. `environmentRecipes` is
**rejected** as heavy for a single-machine solo setup.

**And there is a second checked-in file, which nothing in this repository has needed yet.**
`.worktreeinclude` at the repository root lists gitignored paths to **copy** — not symlink — into each
new worktree, a convention Orca adopted from Claude Code
([stablyai/orca#7549](https://github.com/stablyai/orca/issues/7549)) for exactly the case its body
describes: *"a worktree is a fresh checkout, so gitignored files never carry over — `.env`,
`.env.local`, local secrets, `.vscode/`"*. Literal files and directories only; globs and `!` negation
are skipped with a warning. **Reject today, for a reason with an expiry date.** The only gitignored
content in the primary checkout is `node_modules`, `.playwright-mcp/` and a lock file: there are **no
`.env` files at all**, so the file would carry nothing. `.gitignore` already lists `.env`, `.env.local`
and `.env.*.local`, so the moment local work needs one — a database URL, the TMDB credential — every
lane will silently lack it and fail in a way that looks like broken code. **That is the point to add
`.worktreeinclude`, and it is worth knowing in advance because the failure will not name its cause.**

## Every Orca surface, with a verdict

Recorded so the survey is not run again. "Closes a real failure" is the test, not availability. Orca
exposes **228 commands**, and `orca --help` hides whole groups that `orca agent-context --json` lists —
`agent hooks` and `artifacts` among them, while `linear` appears as a single line with none of its
subcommands — so
an inventory taken from `--help` alone is incomplete. This one was taken from the schema.

| Surface | Verdict |
| --- | --- |
| `orca.yaml` `scripts.setup` | **Adopt.** Declares what a lane needs; matches CI; tested working here |
| `orca.yaml` `scripts.archive` | **Reject.** It runs only with `--run-hooks`, and the data loss it would guard against is gone — see the branch-preservation finding below |
| `orca.yaml` `worktree.sharedDirectories` | **Reject.** One symlinked `node_modules` means a `pnpm install` in any lane rewrites every sibling's dependency tree. Divergence is what lanes are for |
| `.worktreeinclude` | **Reject today, revisit when a `.env` appears.** Nothing gitignored here is worth copying yet; the day one exists, every lane silently lacks it |
| `orca.yaml` `defaultTabs` | **Reject.** Port collisions across concurrent lanes |
| `orca.yaml` `issueCommand` | **Reject.** `/implement` already reads the ticket, into context rather than a terminal |
| `orca.yaml` `environmentRecipes` | **Reject.** Disposable VMs for a solo local setup buy nothing |
| `worktree create --agent --prompt` | **Adopt in the documents.** It is how all thirteen lanes were made and appears in none of them |
| `worktree create --base-branch` | **Adopt as an explicit `origin/main`.** See question three |
| `worktree create --parent-worktree` / `--no-parent` | **Adopt for grouping only.** It moves no git state; the distinction is the answer to question three |
| `worktree set --comment` | **Adopt.** All three live lanes carry `comment: ""`. With five lanes running, this is the only cheap way to see which is stuck |
| `worktree set --workspace-status` | **Adopt.** Board column; the close-out value **CAN-128 Close out the worktree when /review-pr lands a merge** needs |
| `worktree set --linear-issue` | **Already used.** `worktree ps` reports `linkedLinearIssue` for all three lanes |
| `worktree ps` | **Adopt.** One call, every lane, with per-agent `state`, `prompt`, `lastAssistantMessage` and `toolName`. Nothing uses it |
| `worktree rm` | **Already used, by hand.** Now safe — see the branch finding |
| `repo set-base-ref` | **Reject.** Never set, and the inferred default is already `refs/remotes/origin/main`. Per-machine, so it cannot be committed; an explicit `--base-branch` is the portable form |
| Sleep / Delete with Descendants | **Reject, and note the hazard.** App-UI only, so a skill cannot reach either. Every lane is a lineage child of the **main** worktree, so a cascade invoked there would reach all of them — see the close-out section |
| `orca automations` | **Reject.** The one recurring task is the weekly Vercel usage read, and `docs/runbook.md` already argues that check exists *because* a notification is not enough, and records that no API can serve it. An automation would rebuild the inbox it was written to avoid. None are configured (`automations list` → `[]`) |
| `orca orchestration` (runs, tasks, dispatch, gates, workers) | **Reject.** The lanes are independent by construction; there is no DAG to model, and the surface is large. Only `run_legacy_local` exists, marked "inspect only" |
| `orca agent hooks` | **Already installed and enabled.** Read-side is polling only — see known negatives |
| `orca terminal wait --for tui-idle` | **Adopt if a lane is ever waited on.** A blocking wait, so a watcher need not busy-poll. Always pass `--timeout-ms` |
| `orca terminal *` (rest) | **Adopt `terminal stop` for close-out only.** The rest is what the app is for |
| `orca artifacts` | **Reject.** Publishing is off by default, device-wide, and *only a human can enable it* — there is no CLI or RPC path. Documents and PRs are this repository's record |
| `orca claude-teams` | **Reject.** Renders Claude Agent Teams as Orca splits; nothing here uses Agent Teams |
| `orca project setup-clone` and `scripts.setup` on a clone | **Note, not adopt.** `scripts.setup` fires on *worktree* creation, never on clone, and `sharedDirectories` links nothing on a fresh clone because the primary's `node_modules` does not exist yet. Install in the primary once, then create lanes |
| `orca linear` | **Already used**, and already gated by `.claude/hooks/require-linear-workspace.sh` |
| Embedded browser (`tab`, `snapshot`, `click`, …) | **Reject.** `CLAUDE.md` → *Which tool owns what* gives browser work to Playwright and profiling to chrome-devtools. Settled, not reopened here |
| `computer`, `emulator` | **Reject.** No desktop or mobile surface exists yet |
| `environment add` / `orca serve` / remote runtimes | **Reject.** One machine, one developer |
| `project list` / `project setups` | **Reject.** One project on one host; the indirection buys nothing |

## Question two: should worktree-off-`main` be the documented default?

**Yes, and it already is — so the recommendation is not to write it down but to finish it.** This
corrects the ticket, which says `docs/agents/workflow.md` "says nothing about worktrees, lanes or how
a batch is chosen". It says a good deal about worktrees. `docs/agents/workflow.md` → *Branches* gives
the worktree command as *the* way to start a ticket, explains why `--linear-issue` matters, and is
followed by a whole subsection on the consequence, *The local `main` is permanently stale in a
worktree*, carrying two incidents that have already bitten.

What is genuinely absent is narrower and more useful to fix:

- **The dispatch form.** The documented command has neither `--agent` nor `--prompt`, so it describes
  a worktree you then go and work in. All thirteen lanes were created with both, which is a different
  act: you dispatch and leave.
- **That lanes run in parallel at all**, and how many. The words *parallel*, *concurrent*,
  *simultaneous* and *in-flight* appear nowhere in `docs/agents/`, `CLAUDE.md`, `CODING_STANDARDS.md`
  or `.claude/`.
- **How a batch is chosen.** Nothing records that lanes must be independent, which is what made the
  thirteen safe.
- **Lane hygiene** — that a lane starts without `node_modules`, and what pays for it.
- **Close-out**, which is **CAN-128 Close out the worktree when /review-pr lands a merge**'s subject.

**And one documented command is now broken.** `docs/agents/workflow.md` → *Branches* opens the
worktree recipe with `git switch main && git pull`. From inside a lane that fails:

```
$ git switch main
fatal: 'main' is already used by worktree at '/Users/jacobrees/orca/projects/CanonCore'
```

The `&&` joins the switch to the `git pull`, not to the `orca worktree create` a newline below, so
**the create does still run** (*corrected 17 August 2026: this first read as the `&&` taking the
create with it*). A newline-separated command runs regardless of what preceded it:

```
$ cat probe.sh
false && echo "pull ran"
echo "create ran"

$ bash probe.sh
create ran
$ echo $?
0
```

The block's own status is then the create's, because a script's is its last command's — so the
`fatal:` is invisible to anything reading the status rather than the output. What the reader gets is
a `fatal:` they did not cause, no pull, and a dead first line. That was harmless while lanes were
created from the main checkout and is not harmless now that an agent lives in a lane and may be asked
to open the next one. `git fetch origin` is the correct preamble and
works from anywhere: Orca bases a new worktree on `refs/remotes/origin/main` regardless of where the
local `main` ref sits, verified on this lane (`worktree show` → `baseRef: "refs/remotes/origin/main"`).
Orca also refreshes that ref itself on create — the bundle carries
`refreshLocalBaseRefForWorktreeCreate` behind a `refreshLocalBaseRefOnWorktreeCreate` setting, and the
create response returns a `localBaseRefRefresh` key — but it is a per-machine setting, so an explicit
fetch is what keeps the document portable.

**Recommendation.** Keep `docs/agents/workflow.md` as the home, and amend *Branches* rather than adding
a section: replace the preamble with `git fetch origin`, give the dispatch form with `--agent` and
`--prompt` and an explicit `--base-branch origin/main`, and state the batch rule in one sentence —
*lanes must be independent; a dependent ticket waits.* Length is not a constraint here:
`docs/research/document-length-for-agents.md` → *Two cost profiles, and only one of them has a
published limit* publishes a 200-line target for always-loaded documents only, and
`docs/agents/workflow.md` is reached by a pointer. `CLAUDE.md` is the file with no headroom, at
exactly 200 of 200, so this should not add a line there.

## Question three: should a lane ever branch off something other than `main`?

**No. Sequence rather than stack — and use Orca's lineage freely, because it is not the same thing.**

The distinction is the whole answer, and Orca states it plainly. `orca worktree create --help`:
*"`--no-parent` only affects Orca lineage; omit `--base-branch` to use the repo default base."* So
`--parent-worktree` records a relationship in Orca's own graph and touches no git state, while
`--base-branch` chooses the commit the branch starts from. They are independent, and only the second
is the risky one. Using `--parent-worktree` to group related lanes costs nothing and is worth doing;
this lane is already a lineage child of the main worktree, as are `can-24` and `can-7`.

**Stacking the git base is what should not happen, and squash-merge is why.** This repository
squash-merges only — *"One ticket, one branch, one commit on `main`"* — with no other merge method
offered since **CAN-40 Give main a ruleset that refuses an unchecked merge**. `git log --merges main`
is empty across all 80 commits, so that is the practice as well as the policy. A squash rewrites the
parent's work into a new commit whose
ancestry does not include the child's base. A child lane started from an unmerged parent therefore has
a base that never appears on `main`: after the parent lands, the child carries the parent's entire
diff until someone runs `git rebase --onto origin/main <old-parent-tip>`, and every review change on
the parent means doing it again against a base that has moved. The cost is not a merge conflict once,
it is a rebase per parent revision, paid by whoever is least expecting it.

**The tracker's real cases both survive this rule.** **CAN-107 Give every Provider repository a CI
baseline** blocks **CAN-101 Create the provider-tmdb repository, and give it the TMDB credential** —
and that ordering was deliberately reversed on 16 August so the baseline exists *first*, which is
precisely a sequencing decision rather than a stacking one. **CAN-7 Provider contract: define and
publish it** blocks six tickets, not the four the commissioning ticket says: **CAN-113 Add a Provider
by pasting its URL**, **CAN-110 Carry per-field provenance to every displayed value**, **CAN-105 Carry
each Source's attribution obligation through to every surface that displays it**, **CAN-104 Read a
Provider's capability declaration, and refuse what it does not serve**, **CAN-101 Create the
provider-tmdb repository, and give it the TMDB credential** and **CAN-8 Provider: tardis.wiki
chronologies (separate repo)**. Six lanes behind one unmerged design ticket is the worst possible case
for stacking and the best possible case for the rule: what those six need is a **published contract**,
not the parent's working tree, and that ticket's own body commits to evolving it additive-only. A contract
can be read from a merged commit; six rebases cannot be avoided any other way.

**So the rule is:** always `--base-branch origin/main`. If a ticket cannot start until another lands,
it waits, and the tracker's `blocks` relation is the record of that. The one admissible exception is a
child lane opened knowingly and short-lived to prototype against an unmerged parent, expecting to be
rebased or thrown away — and that is a choice a person makes, not a default worth documenting.

## The lane era is datable, and "thirteen" is exactly right

The branch names separate the two eras mechanically, which is worth recording because nothing else
does. Orca prefixes a worktree's branch with the repo's `gitUsername` — `jacobdrees` here — giving the
short form `jacobdrees/can-N`; this lane is `jacobdrees/can-131` from `--name can-131`, and the
throwaway probe became `jacobdrees/can-131-setup-probe`. Linear's *suggested* branch name is the long
slugified form, and the commissioning ticket's own record carries
`jacobreesnew/can-131-research-where-this-repository-and-orca-do-not-meet-and`.

Of 21 pull requests merged between 16 and 17 August 2026, **seven** carry the Linear form and all
landed by 17:45 on 16 August; **thirteen** carry the Orca form, from #180 at 19:27 on 16 August to
#200 at 11:50 on 17 August. A fourteenth Orca lane, #171, carries no `CAN-n` at all. So the
commissioning ticket's "thirteen tickets through Orca worktree lanes" is exactly right, the lane era
began at about **19:27 on 16 August 2026**. The thirteen are:

- **CAN-106 Decide what the GDPR export may contain under TMDB's published terms**
- **CAN-81 Disclose Sentry's US error storage in the terms of service**
- **CAN-86 Record VERCEL_TOKEN in the credential roster, and revisit whether the release can use a project-scoped one**
- **CAN-102 Give Source a retention policy, and Snapshot a fetched-at**
- **CAN-123 Revoke the application role's write privileges, and decide whether the blanket default privilege should exist**
- **CAN-56 Find out the site is down without waiting to be told**
- **CAN-54 Fail a push that adds a known-vulnerable dependency**
- **CAN-52 Lint the accessibility rules eslint-config-next leaves off**
- **CAN-124 Compare the security-settings roster to the live repository in check-docs**
- **CAN-108 Re-assess the illegal-content risk before a user can paste an arbitrary Provider URL**
- **CAN-118 Purge every Snapshot of a Source whose licence terminates, and tombstone what it touched**
- **CAN-75 Write the four missing ADRs and fix the glossary's self-violations**
- **CAN-130 Say what a red purge run means, and separate the three ways one can end**

**"Up to five at once" is not provable and not refuted; four is demonstrable.** Both available
measures top out at four: PRs open simultaneously (#180, #181, #182 and #183 were all open at
18:26 UTC on 16 August) and branch-lifetime overlap from first commit to merge (the same four, and
again `can-124`, `can-75`, `can-108`, `can-118` on 17 August). The tell for genuine concurrency rather
than fast serial work is that **#181 was opened 44 seconds before #183 and merged three minutes after
it** — a PR overtaking a later-opened sibling. The gap cannot be closed from git: a lane exists from
`worktree create` to `worktree rm`, neither of which leaves a trace, and Orca keeps `createdAt` only
for live worktrees. The thirteen are gone.

## Known negatives, recorded so they are not re-investigated

**The polling finding holds for agent status, and should be worded that way.** `orca agent hooks`
offers exactly three subcommands — `status`, `off`, `on` — and the full 228-command schema contains no
`read`, `tail`, `watch`, `subscribe` or `events`, so **agent state is poll-only, via `orca worktree
ps`.**

**But "polling is the only read" overstates it, and the difference is useful.** Two *blocking* waits
exist, so a watcher need not busy-poll: `orca terminal wait --for tui-idle --timeout-ms <ms>` blocks
until a TUI agent goes idle — the guides name Claude Code among the agents it is for — and
`orca orchestration check --wait` blocks on a Run mailbox, emitting keepalive lines while it does. The
accurate sentence is *agent status is poll-only; terminal idleness is blocking-waitable.*

Two further refinements. The command group is *hidden*: `orca agent` appears nowhere in `orca --help`.
And the hooks are a **write** path, not a read one — `~/.orca/agent-hooks/claude-hook.sh` POSTs each payload
to a localhost port with a token, wired from **`~/.claude/settings.json`** across eleven events
(`UserPromptSubmit`, `Stop`, `StopFailure`, `SubagentStart`, `SubagentStop`, `TeammateIdle`,
`PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `SessionStart`). Orca caches
the result to `agent-hooks/last-status.json`. That wiring is per-machine and in no repository, which is
the same class of gap as the missing `orca.yaml` — but it is user-scope agent instrumentation spanning
every project on the machine, so it does not belong in this repository and is **not** a candidate
ticket. What `worktree ps` returns is rich enough that nothing is lost: per-agent `state`,
`agentType`, `prompt`, `lastAssistantMessage`, `toolName` and `stateStartedAt`.

**The branch-deletion finding is out of date: `stablyai/orca#2927` is fixed in 1.4.184.** This is the
correction that matters most, because **CAN-128 Close out the worktree when /review-pr lands a merge**
currently rests on it as "a live data-loss path in the tool". Tested directly. A real commit was made
on the throwaway lane's branch, unmerged and with no upstream (`git rev-parse @{u}` → *"fatal: no
upstream configured"*), and then `orca worktree rm` was run:

```json
{ "removed": true,
  "preservedBranch": { "branchName": "jacobdrees/can-131-setup-probe",
                       "head": "d0768456fa4952483c4f0ddd83b687cbbbdbdfe5" } }
```

**The branch survived with its commit reachable.** The branch was then deleted by hand to clean up.
`worktree rm --help` offers no keep-branch flag because it no longer needs one, and `--force` maps to
`git worktree remove --force`, not to branch deletion.

The fix is in the record and is not subtle. The issue is titled *"[Bug]: Worktree removal force-deletes
unpublished branch commits"*, filed 27 May 2026 and closed `completed` on 29 May — and a commit landed
a minute before the close, *"fix: preserve unmerged branch when removing a worktree (#2927) (#2939)"*,
whose diff is exactly the one the reporter asked for:

```diff
-    await gitExecFileAsync(['branch', '-D', branchName], { cwd: repoPath })
+    // Use `-d` (not `-D`): Git refuses to delete a branch with commits not merged
+    // into its upstream or HEAD, so unpublished work is preserved instead of
+    // force-deleted.
```

**So the ticket's "closed but unfixed" was wrong rather than out of date** — the fix shipped with the
close, and only the maintainer's *"will be in next release"* comment was visible without reading the
timeline.

It has since been hardened in a way that matters specifically here. Current source carries
`deleteAlreadyMergedBranchAfterSafeDeleteFailure`, whose comment reads: *"squash merges rewrite commit
IDs, so 'branch -d' rejects already-merged branches; delete only when Git proves no unmerged tree
changes."* That is this repository's exact case — a squash-merged branch looks unmerged to `git branch
-d` — and it is why removal after a landed PR still tidies the branch instead of accumulating one per
ticket. Observed both ways: the unmerged probe was preserved and reported, while a second probe with no
commits of its own returned a bare `{"removed": true}` and its branch was deleted.

The consequence for **CAN-128 Close out the worktree when /review-pr lands a merge** is that its merge
check is ordinary hygiene rather than a guard over data loss, and the argument that a later reader "who
thinks it is belt-and-braces will relax it" no longer applies, because it now *is* belt-and-braces.

**Not re-investigated, and worth stating:** `worktree show`'s `linkedLinearIssueWorkspaceId` and
`linkedLinearIssueOrganizationUrlKey` are both `null` on this lane while `linkedLinearIssue` is
`"CAN-131"`, and `orca linear issue --current` resolves correctly anyway. Not a defect; do not file it.

## Candidate tickets, named and not filed

Filing is a separate call, per the commissioning ticket.

1. **Commit an `orca.yaml` declaring the lane's setup**, and record in `docs/agents/workflow.md` that
   a lane starts without `node_modules`. Small, and the only one of these that adds a file.
2. **Fix the broken preamble in `docs/agents/workflow.md` → *Branches***, replacing
   `git switch main && git pull` with `git fetch origin`, and give the dispatch form with `--agent`,
   `--prompt` and an explicit `--base-branch origin/main`. This is a **defect**: the documented
   command cannot run from where work now happens, so its first line is dead and its `git pull` never
   happens (*corrected 17 August 2026: this first read as `&&` taking the create with it; see
   question two above for the probe*).
3. **Record the lane workflow in `docs/agents/workflow.md`** — that lanes run in parallel, that a
   batch must be independent, and the `--base-branch origin/main` rule from question three. Could be
   one ticket with the item above.
4. **Amend CAN-128 Close out the worktree when /review-pr lands a merge** rather than file anything
   new. See below.

5. **Give the bare identifier in `docs/agents/workflow.md` its title** — the `CAN-40 Give main a
   ruleset that refuses an unchecked merge` reference in *The loop*. One line, and it is
   the rule in `CLAUDE.md` → *Name every ticket you cite* being broken by the document that most
   agents read. Found while quoting it; too small to be its own ticket, so fold it into item 2 or 3.
   (*Landed 17 August 2026 with item 2, and the file had three more bare citations than this one.*)

And one thing to **watch rather than file**: the day a `.env.local` is needed locally, add
`.worktreeinclude`. It is not a ticket yet because there is nothing to copy, and it will not announce
itself when it becomes one.

Deliberately **not** candidates: the settings path `orca agent hooks status` misreports (Orca's own
business, and the real store answers the question anyway), the per-machine agent-hook wiring (user
scope by nature, spanning every project on the machine), and
`setupAgentStartupPolicy: wait-for-setup` (uncommittable, and pnpm makes the race harmless).

## What this means for the close-out ticket

**CAN-128 Close out the worktree when /review-pr lands a merge** is held at `needs-info` pending this
research. It should be **amended and restored, not cancelled** — the gap it names is real:
`.claude/skills/review-pr/SKILL.md` runs to nine steps, the last three all Linear-side, and none of
them touches the worktree. Five worktrees were removed by hand on 16 and 17 August.

Three amendments follow from the findings above.

- **Drop the data-loss justification**, for the reason given under known negatives above. The merge
  check is still worth having, because removing a checkout whose work has not landed wastes it — but
  the ticket must not rest it on a path the tool closed in May.
- **The three-way choice narrows to two, and neither is Archive.** *Sleep* and *Delete with
  Descendants* are app-UI only, so a skill cannot reach them; what it can reach is
  `worktree set --workspace-status`, `terminal stop` and `worktree rm`. The `needs-info` comment is
  right that adopting an undocumented `archive` would be wrong, and the reason is stronger than it
  says: the CLI has no such verb to adopt.
- **Its recommendation now looks better, not worse.** *Stop the terminals, mark completed, leave
  removal to a person* was recommended when removal risked losing commits. It survives the correction
  on a different footing: removal is safe, so the reason to leave it to a person is that a checkout is
  cheap to keep and a decision to discard work is not a skill's to take.

The ticket's own survey of other surfaces agrees with this document on `worktree ps`, `automations` and
`orchestration`, and its note that `repo set-base-ref` "would remove the need to pass
`--base-branch origin/main` on every lane" should be **declined** rather than actioned: that setting is
per-machine, and question three's rule wants the base stated in the command where a reader can see it.

## Not covered

- **Whether the UI offers *Delete with Descendants* on the main worktree**, which is the one place it
  would be destructive here. The strings exist; the guard was not established, and it was not worth
  clicking to find out.
- **Whether the desktop app prompts for trust where the CLI did not.** A content-hash trust gate exists
  per repo per hook kind, and the runtime's own comment says the CLI bypasses it — *"trust is granted
  by the direct CLI invocation"* — which the experiment confirms, since the hook ran with no prompt and
  `trustedOrcaHooks` was `null`. Creating a worktree from the **app** with an `orca.yaml` present is
  therefore likely to raise a dialog once. Not tested, and it changes nothing in the recommendation.
- **Whether a setup hook is reliably safe on a machine where Orca was launched differently.** The
  mechanism behind [stablyai/orca#13688](https://github.com/stablyai/orca/issues/13688) is confirmed
  and its blast radius is not: the hook found `pnpm` here through an inherited `PATH`, and nothing
  guarantees that on another machine or another launch.
- **The SSH-relay branch-deletion path.** It implements the same `-d`/`-D` split separately from the
  local path, so parity is a requirement rather than a guarantee. Irrelevant while everything is local.
- **The five-concurrent-lanes claim**, which is unprovable from git for the reason given above.
- **`orca.yaml` in a Provider repository.** **CAN-107 Give every Provider repository a CI baseline**
  will need to decide whether the baseline it publishes includes one; that belongs to that ticket.

This document is a snapshot of 17 August 2026 against Orca 1.4.184 and does not update. The
branch-preservation finding in particular is version-bound, and it is the one to re-test rather than
re-read.
