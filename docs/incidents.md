# Incident record

Each observation this project's rules rest on, written **once**, with the date, the identifiers and
what it proved. Every rule that depends on one of these points here rather than retelling it.

This file is an archive and is **meant to grow**. The registers it serves are not: `CLAUDE.md`,
`docs/agents/workflow.md` and `docs/infrastructure.md` record current state and standing rules, and
stay bounded because the evidence is here instead. That separation is the whole point — before
13 August 2026 the two lived in the same files, so the bounded ones inherited the archive's growth
(`docs/research/document-length-for-agents.md` has the measurements).

**Adding an entry.** Give it a heading whose slug will not change, a bold date line, and the
identifiers a reader would need to re-run the observation: commit SHAs, run ids, PR numbers, times
with zones. Then make the rule that cites it a pointer. **Never correct an entry into agreement with
a later state** — append a follow-up entry and cross-link the two, because the reasoning of the day
is what the rule was built on.

## Contents

**Landing a change**
- [A review of a staged-but-uncommitted change reads an empty range](#a-review-of-a-staged-but-uncommitted-change-reads-an-empty-range)
- [Sub-agent reviews find defects for the session that invoked them](#sub-agent-reviews-find-defects-for-the-session-that-invoked-them)
- [A round of fixes failed the standard its own findings had named](#a-round-of-fixes-failed-the-standard-its-own-findings-had-named)
- [#87 reversed a Done ticket's deliverable five hours later](#87-reversed-a-done-tickets-deliverable-five-hours-later)
- [A worktree branch reads *behind* while being in perfect shape](#a-worktree-branch-reads-behind-while-being-in-perfect-shape)
- [`--delete-branch` fails after the merge has already succeeded](#--delete-branch-fails-after-the-merge-has-already-succeeded)
- [A check-run finished and its record never closed](#a-check-run-finished-and-its-record-never-closed)
- [A workflow reading `toJSON(secrets)` is held before any job starts](#a-workflow-reading-tojsonsecrets-is-held-before-any-job-starts)
- [A test fixture that spawns the CLI writes to the real job summary](#a-test-fixture-that-spawns-the-cli-writes-to-the-real-job-summary)
- [The same fixture inherited its working directory, and two checks went untested for three days](#the-same-fixture-inherited-its-working-directory-and-two-checks-went-untested-for-three-days)
- [A concurrent lane reddened `main`, and the merge that failed had not caused it](#a-concurrent-lane-reddened-main-and-the-merge-that-failed-had-not-caused-it)
- [Waveger: the build ran no migrations, and nobody knew](#waveger-the-build-ran-no-migrations-and-nobody-knew)

**Tools and the harness**
- [`gh` fails with a 403 when the wrong account is active](#gh-fails-with-a-403-when-the-wrong-account-is-active)
- [The harness classifier refused `gh pr create`](#the-harness-classifier-refused-gh-pr-create)
- [A slash command sent mid-message never loaded](#a-slash-command-sent-mid-message-never-loaded)
- [An unauthenticated OAuth MCP server exposes only its sign-in tools](#an-unauthenticated-oauth-mcp-server-exposes-only-its-sign-in-tools)
- [Five merged lanes were closed out by hand](#five-merged-lanes-were-closed-out-by-hand)
- [A terminal that stops its own worktree prints the result and then dies](#a-terminal-that-stops-its-own-worktree-prints-the-result-and-then-dies)
- [An unknown board status id is accepted and becomes the card's status](#an-unknown-board-status-id-is-accepted-and-becomes-the-cards-status)

**The tracker**
- [The Linear→GitHub sync reverted a description write](#the-lineargithub-sync-reverted-a-description-write)
- [Nine forms of a ticket reference, and the two that survive a Linear body](#nine-forms-of-a-ticket-reference-and-the-two-that-survive-a-linear-body)
- [An omitted `--workspace` resolved to a different workspace each half-day](#an-omitted---workspace-resolved-to-a-different-workspace-each-half-day)
- [One GitHub owner binds to one Linear workspace](#one-github-owner-binds-to-one-linear-workspace)

**Hosting and the repository**
- [Vercel Hobby refuses a private organisation-owned repo](#vercel-hobby-refuses-a-private-organisation-owned-repo)
- [The Hobby private-repo refusal stopped binding on the Pro upgrade](#the-hobby-private-repo-refusal-stopped-binding-on-the-pro-upgrade)
- [Spend Management saves in two steps, and abandoning the second discards it](#spend-management-saves-in-two-steps-and-abandoning-the-second-discards-it)
- [The API name for a project setting is not the dashboard name](#the-api-name-for-a-project-setting-is-not-the-dashboard-name)
- [Installing the Vercel GitHub App on a second org displaced nothing](#installing-the-vercel-github-app-on-a-second-org-displaced-nothing)
- [The holding page was first deployed straight to production](#the-holding-page-was-first-deployed-straight-to-production)
- [Both required contexts report on documentation-only pull requests](#both-required-contexts-report-on-documentation-only-pull-requests)
- [A failing check reaches the phone, a recovering one may not](#a-failing-check-reaches-the-phone-a-recovering-one-may-not)
- [Dependabot alerts were enabled, and blind](#dependabot-alerts-were-enabled-and-blind)
- [The audit gate was proved by a critical advisory, then reverted](#the-audit-gate-was-proved-by-a-critical-advisory-then-reverted)

**Database**
- [Preview branching was switched off, so no preview ever got a branch](#preview-branching-was-switched-off-so-no-preview-ever-got-a-branch)
- [A preview branch inherits its parent's role passwords](#a-preview-branch-inherits-its-parents-role-passwords)
- [What a preview branch looks like, and how long it outlives its PR](#what-a-preview-branch-looks-like-and-how-long-it-outlives-its-pr)
- [`parent-data` cloning cannot be switched off in the integration](#parent-data-cloning-cannot-be-switched-off-in-the-integration)
- [Drizzle's migrator needs `CREATE` on the database before it reads anything](#drizzles-migrator-needs-create-on-the-database-before-it-reads-anything)
- [A `SET LOCAL` custom setting reverts to the empty string, not to NULL](#a-set-local-custom-setting-reverts-to-the-empty-string-not-to-null)
- [The Neon owner cannot `SET ROLE` to either application role without granting itself the option](#the-neon-owner-cannot-set-role-to-either-application-role-without-granting-itself-the-option)

**Credentials**
- [Regenerating a TMDB key does not revoke the old one promptly](#regenerating-a-tmdb-key-does-not-revoke-the-old-one-promptly)
- [The TMDB regeneration entry's licence reasoning no longer holds](#the-tmdb-regeneration-entrys-licence-reasoning-no-longer-holds)
- [What the TMDB credential was checked against](#what-the-tmdb-credential-was-checked-against)
- [A Vercel sensitive variable cannot be read back, by anyone](#a-vercel-sensitive-variable-cannot-be-read-back-by-anyone)
- [A sensitive variable named its SSL mode in a deprecation warning](#a-sensitive-variable-named-its-ssl-mode-in-a-deprecation-warning)
- [Seven Resend DNS records published two unaccounted DKIM keys](#seven-resend-dns-records-published-two-unaccounted-dkim-keys)
- [Three unscoped Resend API keys were revoked](#three-unscoped-resend-api-keys-were-revoked)
- [The orphaned Resend key, and how it stopped being anonymous](#the-orphaned-resend-key-and-how-it-stopped-being-anonymous)
- [A Resend key that was provisioned and never worked](#a-resend-key-that-was-provisioned-and-never-worked)
- [Resend's published error table disagrees with its own API on 401](#resends-published-error-table-disagrees-with-its-own-api-on-401)
- [What the Sentry token was checked against](#what-the-sentry-token-was-checked-against)
- [No event had reached Sentry when the terms disclosed it](#no-event-had-reached-sentry-when-the-terms-disclosed-it)
- [Nine dormant Neon projects, and the ninth was the dangerous one](#nine-dormant-neon-projects-and-the-ninth-was-the-dangerous-one)

**DNS**
- [There is no wildcard record, and one was wrongly recorded](#there-is-no-wildcard-record-and-one-was-wrongly-recorded)
- [The `demo` CNAME dangled at a deleted project](#the-demo-cname-dangled-at-a-deleted-project)
- [The apex `google-site-verification` TXT is ours](#the-apex-google-site-verification-txt-is-ours)
- [The delivered test message passed all three checks](#the-delivered-test-message-passed-all-three-checks)

---

# Landing a change

## A review of a staged-but-uncommitted change reads an empty range

**12 August 2026, on CAN-40 Give main a ruleset that refuses an unchecked merge.** Run against a
scratch repository.

`mattpocock-skills:code-review` reads `<fixed-point>...HEAD`, which compares two *commits*, so the
index is not in it. With the work staged and nothing committed:

```
git diff $BASE...HEAD      # printed nothing
git diff --cached $BASE    # printed the change
```

**What it proves.** Staging alone does not put a change in the review's range, and a review of an
empty range reports no findings — which reads exactly like a clean review. So the question to ask of
any review is *which diff command did it run*, never *did a review happen*.

Two ways out, and the pack's own answer is the first: commit before reviewing and review against the
branch point (*"Commit first, then review against the point you branched from"*, `implement.md`), or
hand the review `git diff --cached <branch-point>` explicitly.

## Sub-agent reviews find defects for the session that invoked them

**11–12 August 2026. Two observations, in both directions.**

**CAN-48**, from a fresh session: parallel sub-agents found a defect the implementing session had
missed, which became **CAN-63 The code review after /draft-pr reads as a repeat of the one
/implement ran**. That is evidence about sub-agents, not about a second invocation — they would have
found it from either caller.

**12 August 2026, on CAN-40**, the other way round: sub-agents invoked *by the implementing session*
caught two uncited claims, an exit-code trap, and the `git` error corrected in the entry above,
which was that session's own.

**What it proves.** `mattpocock-skills:code-review` fans work out to sub-agents that never saw the
implementing session's reasoning, so the fresh eyes sit in the sub-agents rather than in the calling
session. The residual risk is the *range* the caller hands them, which is checkable rather than a
matter of trust.

**This departs from the pack, and the departure should stay visible.** `implement.md` offers a
fresh-session review as "a legitimate alternative", and `code-review.md` gives a different reason
for the sub-agents (keeping the two axes out of each other's context). The claim here is that the
isolation buys the fresh eyes as a side effect, whoever calls it.

## A round of fixes failed the standard its own findings had named

**17 August 2026, CAN-54 Fail a push that adds a known-vulnerable dependency,
[#191](https://github.com/jacobrees-canoncore/CanonCore/pull/191).** Both axes, twice, against
`main`. All times BST.

| Round | Findings taken | Produced |
| --- | --- | --- |
| 1 | 5 | [`86cce08`](https://github.com/jacobrees-canoncore/CanonCore/commit/86cce087c9bb3ca86da51fcdcc8ce62dbf3453fb), 08:56:38 |
| 2 | 4 | [`fae4544`](https://github.com/jacobrees-canoncore/CanonCore/commit/fae4544236e188b90af7c9c0dffbf574f9dbfe72), 09:02:09 |
| 3 | never ran | — |

**Both counts are the bolded findings each commit's own message enumerates**, which is the only
basis on which the two rows compare. [#191](https://github.com/jacobrees-canoncore/CanonCore/pull/191)'s
body says *"round one found two factual defects, round two found four more"* — a narrower count of
round one, taking the two wrong counts and leaving the remit breach, the uncited claims and the
three-way duplication out.

**Two of round two's four were in text round one had just written, and each failed the very standard
the round-one fix had been applied to satisfy.** Both are readable from the two commits:

| Round one wrote | Round two found |
| --- | --- |
| *"The field is not among the five that payload documents"* in `docs/incidents.md`, replacing an absence that had been inferred from a single call | `PATCH /repos/{owner}/{repo}` documents **nine** `security_and_analysis` sub-properties. Round one's own message names *"Two counts were wrong"* among its fixes; this was a third |
| *"Use exit code 0 if the registry responds with an error. Useful when audit checks are used in CI"* in `docs/agents/workflow.md`, attributed to [pnpm audit](https://pnpm.io/cli/audit) | That wording is `pnpm audit --help` at 11.20.0. The page says something milder. Round one had added the citation under *"Three checkable claims cited nothing"* |

The branch merged at **10:07**, sixty-five minutes after `fae4544`, which no review had read.
[#191](https://github.com/jacobrees-canoncore/CanonCore/pull/191)'s body said so in a `## Review`
section written for the occasion, and named the primary source each of the four fixes had been
checked against instead. `docs/agents/workflow.md` → *What the pull request must disclose* makes
that section standing, and fixes what it has to say.

**What it proves.** A round of fixes is fresh unreviewed writing and fails in the same ways the
original did, here in the exact way the round was fixing: CODING_STANDARDS.md → *Documents are the
artefact here* counts *"citing a document that does not say it"* as the same defect as citing
nothing, and round one's citation-adding commit committed it. So round two reads a range where
defects demonstrably are, and what says so is round one *having produced a commit* — not anything
about how round one's own findings looked.

**What it does not prove.** Nothing here is evidence about a third round, which never ran. That the
loop stops at two is a decision argued in `docs/agents/workflow.md` → *Two rounds, and the second is
the last* from the need for an end that is not a judgement call, and not from this observation.

## #87 reversed a Done ticket's deliverable five hours later

**Both on 12 August 2026.** **CAN-63 The code review after /draft-pr reads as a repeat of the one
/implement ran** shipped [#85](https://github.com/jacobrees-canoncore/CanonCore/pull/85), which had
`/draft-pr` end by saying the review coming next was *not* the one `/implement` ran. Five and a half
hours later [#87](https://github.com/jacobrees-canoncore/CanonCore/pull/87) — **CAN-40 Give main a
ruleset that refuses an unchecked merge** — deleted that line, on the two findings above.

Neither ticket records the reversal, which is why it is recorded here.

## A worktree branch reads *behind* while being in perfect shape

**12 August 2026, on CAN-46 PR skills say the skeleton is missing.**
`git rev-list --left-right --count origin/main...main` returned `1	0` while the branch was cut from
the remote base and needed nothing.

**Why.** `main` stays checked out at the project checkout for as long as the project exists, and
every ticket is worked from a worktree. Nothing a worktree does moves the local `main` ref: `git
fetch` advances `origin/main` and leaves `main` alone, `git pull` pulls the ticket branch, and both
`git branch -f main` and `git fetch origin main:main` are refused outright. So the local ref falls a
commit further behind with every merge that lands.

**What it proves.** A count taken against the local `main` answers a question nobody asked. Ask
where `HEAD` sits instead: `git merge-base --is-ancestor origin/main HEAD` exits 0 when `HEAD`
already contains `origin/main`, which makes a rebase onto it a no-op
([git merge-base](https://git-scm.com/docs/git-merge-base)).

## `--delete-branch` fails after the merge has already succeeded

**10 August 2026, landing CAN-20 Set up a transactional email provider.**
[PR #43](https://github.com/jacobrees-canoncore/CanonCore/pull/43) read `MERGED` and `origin/main`
advanced to the squash commit; only the local cleanup failed and `gh` exited non-zero.

**Why.** `--delete-branch` deletes "the local and remote branch after merge"
([gh pr merge](https://cli.github.com/manual/gh_pr_merge)), and deleting the local branch means `gh`
must check out the base first. It cannot: `main` is permanently checked out elsewhere, so git
refuses with `fatal: 'main' is already used by worktree at …`. Making `-d` work under worktrees is an
open request filed in 2021 ([cli/cli#3442](https://github.com/cli/cli/issues/3442)).

**What it proves.** A false negative on the one step that cannot be undone. An agent reading the
error can report a failed landing when production has already changed, or merge again — and nothing
downstream re-checks, so the wrong conclusion is the one that survives. The merge command's exit
code decides nothing; `gh pr view <n> --json state,mergedAt` does.

## A check-run finished and its record never closed

**12 August 2026, on CAN-47 CLAUDE.md still defers three MCP installs that have happened**, commit
`715515b`.

`gh run view 31618294656` read `completed`/`success`, and every step of its only job read `success`
including `pnpm -r test`, `typecheck`, `lint`, `build` and `Complete job`. The check-run on that SHA
still read `in_progress` with `completed_at: null` **six minutes later**, which `gh pr checks` was
reporting as `bucket: pending`. A watch would have polled a check that had already passed and would
never say so.

**A third state, then**, distinct both from *CI has not registered yet* and from *CI failed*:
registered, finished, never reported. The two live states want opposite remedies — a slow check
wants more waiting, a stuck record never resolves by waiting at all.

**What cleared it.** The rebase on that branch produced run `31619057832`, which finalised normally
at 16:44:46Z. That worked because `main` genuinely had moved, which is a property of that moment
rather than of the remedy: a rebase in a worktree whose `HEAD` already contains `origin/main`
rewrites nothing and triggers no new run.

**It is GitHub's record, not the pipeline.** One run of six was affected, on the same workflow, the
same single job and the same `concurrency` block as the five that finalised normally — including
`62ddfba`, eight minutes earlier on the same branch. Permanent configuration added to work around a
one-off data inconsistency is what `CLAUDE.md`'s engineering principles rule out.

**And the record back-fills itself.** `715515b`'s check-run now reads `completed/success` with
`completed_at: 2026-08-12T16:35:44Z` — the moment the work finished, not the moment the record
closed. Re-running the diagnosis afterwards returns a healthy record and makes a correct call look
like a mistaken one, so the call has to be made during the wait and written down.

## A workflow reading `toJSON(secrets)` is held before any job starts

**16 August 2026, on CAN-109 Decide whether the label roster check needs enforcing, or is honest as
it stands**, commit `92ffd63`, run `31960046917`.

`ci.yml` gained one step whose only purpose was to name the Actions secrets for the roster check,
reducing `${{ toJSON(secrets) }}` to key names before anything else saw it. No value was printed and
nothing left the runner. **The run never started.** It finished `action_required` with **zero jobs**,
no check-runs on the suite, and `gh run rerun` refused it: *"This workflow run cannot be retried
through the API"*. The run's own page carried the reason:

> GitHub detected that this workflow file may be malicious. It will not run until someone with write
> access approves it.

**`toJSON(secrets)` is a named indicator of GitHub's malicious-workflow detection**, which holds a
flagged workflow on a public repository until a collaborator with write access approves it
([GitHub adds approval checks for suspicious Actions workflows](https://www.developer-tech.com/news/github-actions-approval-checks-malicious-workflows/)).
The pattern is the classic exfiltration shape — the runner is the one place that legitimately holds
every secret at once — and the detector cannot tell a check from a theft.

**What makes it worse than friction here is the shape of the failure.** A held run reports no
status context at all, so `main`'s ruleset sees the required check as never reported, which
`docs/infrastructure.md` → *The ruleset* records as blocking every merge for ever rather than until
CI finishes. A reader sees "pending", not "blocked", which is the same silent class the check being
built was meant to close.

**Three other routes were checked at the same moment and none reaches a runner keylessly.**
`gh secret list` needs the secrets API, whose permission is not among the scopes `permissions:`
accepts ([Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions))
— run `31960500155` has it saying so on a runner, `HTTP 403: Resource not accessible by
integration`; `secrets.<NAME>` reads one name at a time and so cannot enumerate; and a fine-grained
token with `secrets: read` is a credential, which was the cost being avoided. So the secret roster
gates locally, and the decision is `docs/infrastructure.md` → *What this check compares, and what
it cannot*.

## A test fixture that spawns the CLI writes to the real job summary

**16 August 2026, on CAN-109 Decide whether the label roster check needs enforcing, or is honest as
it stands**, run `31960500155`.

`scripts/check-docs.ts` had just learnt to write its report to `$GITHUB_STEP_SUMMARY`. The run's own
page then carried **four** copies of the report table. Three came from `scripts/check-docs.test.ts`,
whose fixtures spawn the CLI against a temporary repository: a runner sets `GITHUB_STEP_SUMMARY` for
every step, the child inherits it, and each fixture appended its own verdicts to the page. The first
table on a green job read `3 passed, 4 skipped, 1 failed`.

**A misleading summary is worse than none**, which is the whole reason it was added: a reader cannot
tell the fixture's failures from the real ones, so the page stops being evidence about the run. The
fix is one line of the harness — redirect `GITHUB_STEP_SUMMARY` to a temporary file per fixture run
— and it buys a test as well, since the redirected file is then something to assert against.

**It generalises to anything else this repository ever spawns.** A child process inherits the whole
environment, so any test that runs a CLI which writes a summary, an annotation or an output has to
redirect that path rather than assume the child is sandboxed by being a child.

> The second instance, in the same fixture and found three days later, is
> [The same fixture inherited its working directory, and two checks went untested for three days](#the-same-fixture-inherited-its-working-directory-and-two-checks-went-untested-for-three-days):
> the environment is not the only thing a child takes from its parent.

## The same fixture inherited its working directory, and two checks went untested for three days

**16 August 2026, on CAN-122 The check-docs test fixture runs in the wrong directory, so the link
and pointer checks are never exercised.** Present since commit `9da1803`, 13 August 2026, which
created `scripts/check-docs.ts` with both document checks in it. **Neither had ever been exercised.**

`scripts/check-docs.test.ts` spawned the CLI with no `cwd`, so the child took whichever directory
the runner started in. `scripts/check-docs.ts` reads every file against a `ROOT` derived from its
own location — the fixture — but runs `git ls-files` in the working directory, and **the two
disagreed in a way that depended entirely on where the suite was invoked from**:

| Invoked from | `git ls-files "*.md"` returned | The link and pointer checks |
| --- | --- | --- |
| `scripts/`, which is what `pnpm -r test` and CI use | nothing, no markdown lives there | `PASS`, over `0 documents` and `0 pointers` |
| the repository root | every document in the *real* repository | `FAIL`, `ENOENT` reading each one against the fixture |

**Two of the eight checks had no test at all, and the suite reported that they did.** It is the
shape CAN-109 Decide whether the label roster check needs enforcing, or is honest as it stands was
opened to settle, one level down: there a *check* reached no source and the report was rebuilt to
say so, here a *test* read no repository and said nothing at all.
The `0 documents` count that would have given it away prints only under `--verbose`, and the suite
never read the child's output at all.

**It is the working-directory half of the entry above**, whose lesson was that a child inherits the
whole environment. It inherits the working directory too, and a fixture that builds its own
repository has to say which one every spawn runs in. Both fields, once, in the same helper.

**A green test over an empty set is the failure, not the symptom.** So the fix was not only the
`cwd`: the three checks that walk a listing now fail when the listing came back empty, because
*searched nowhere* and *searched and found nothing* are indistinguishable in a report and only one
of them is a pass.

## A concurrent lane reddened `main`, and the merge that failed had not caused it

**17 August 2026, landing CAN-131 Research where this repository and Orca do not meet, and settle
the worktree workflow.** [PR #202](https://github.com/jacobrees-canoncore/CanonCore/pull/202)
touched two files under `docs/research/` and nothing else. Its branch run
([32026182181](https://github.com/jacobrees-canoncore/CanonCore/actions/runs/32026182181), `bdbfcc2`,
11:43 UTC) reported `PASS the variable roster matches Vercel — 8 variables agree`. The release run on
`main` ([32028009220](https://github.com/jacobrees-canoncore/CanonCore/actions/runs/32028009220),
squash `b684943`, 12:05 UTC) failed 22 minutes later at `node scripts/check-docs.ts`:

```
FAIL  the variable roster matches Vercel   the roster in docs/infrastructure.md disagrees with `vercel env ls`:
    - BETTER_AUTH_SECRET is set on Vercel but missing from the roster in docs/infrastructure.md
    - DATABASE_AUTH_PASSWORD is set on Vercel but missing from the roster in docs/infrastructure.md
    - DATABASE_AUTH_USER is set on Vercel but missing from the roster in docs/infrastructure.md
7 passed, 3 skipped, 1 failed  (a skipped check reached no source; it is not a pass)
```

**Why.** None of the three came from the merge. They had been provisioned on Vercel by a concurrent
lane working **CAN-24 A signed-in and a signed-out path**, which landed its own roster rows 67
minutes later as `542187b`. Six of `check-docs`'s checks read live shared state rather than the
working tree — the branch ruleset, the Linear label roster, the Vercel variable roster, the Actions
secret roster, the release token's expiry and the repository's security settings — so their answer
depends on when the run happens rather than on what the commit contains. Three of the six reach a
runner and three gate locally only, which is what decides whose gate a given change can redden;
[`agents/workflow.md`](agents/workflow.md) → *The gates* has the table. There was no git
relationship between the two lanes at all: neither shared a base, and neither touched a file the
other did.

**What it proves.** Two things, and the second is the one that costs time. **Lane independence in
git is necessary and not sufficient** — a lane that provisions a variable or edits the ruleset is
independent of nothing, so it has to be sequenced, or land its roster update in the same change that
provisions the thing. And **a red `main` from a live-source check is not necessarily the
merge that turned it red**: read which check failed and against which source before assuming the last
merge caused it. Here the failure stopped the job at `check-docs`, so the migration and promotion
steps never ran and production was simply not promoted, which is a different situation from a broken
deployment.

Whether a check reading live shared state can be a per-branch gate at all is a larger question, and
is open.

## Waveger: the build ran no migrations, and nobody knew

**A prior project, no date recorded.** Nothing in Waveger's build ran its migration command. That
was true for months and was written down nowhere, until a migration landed whose safety turned out
to depend on the day of the week.

**What it proves.** A build applies some artefacts automatically and leaves others exactly as they
were, and merging one of those deploys the code that depends on it while the thing itself stays
behind. Answer *what does a merge carry* for each new **kind** of artefact before the first change
that needs it.

Its second half generalises: a change that only works in one deploy order is a change to rewrite,
not a window to reason about.

---

# Tools and the harness

## `gh` fails with a 403 when the wrong account is active

**7 August 2026.** Three GitHub accounts are authenticated on this machine — `jacobdrees`,
`jacobreesdev` and `vepple-jr` — and only `jacobdrees` holds `admin`, `maintain` and `push` on
`jacobrees-canoncore/CanonCore`.

**Which one is active moves on its own.** It was `jacobreesdev` at the start of the session that set
this repository up and `jacobdrees` by the end of it, with nothing deliberately switched.

`git push` works whatever is active, because it goes over SSH and the key decides. `gh` uses its own
token, and fails with a 403 that reads like a problem with the repository. The remote is
`git@github.com:jacobrees-canoncore/CanonCore.git` on purpose: the HTTPS URL fails with `Repository
not found`, which reads like the repository is missing rather than like the credential lacking
access to a private one.

## The harness classifier refused `gh pr create`

**10 August 2026.** `gh pr create` was blocked by Claude Code's auto mode classifier with the right
account active and its token fine. `mcp__github__create_pull_request` opened
[PR #43](https://github.com/jacobrees-canoncore/CanonCore/pull/43) for CAN-20 immediately
afterwards, over the same credentials by a route the classifier does not block.

**Telling it from the account trap above.** A 403 mentioning the repository is the account. A
refusal naming the classifier, permissions or auto mode is the harness, and switching accounts fixes
nothing.

**The merge fallback is weaker than the command it replaces.** `mcp__github__merge_pull_request`
exposes no head-SHA parameter — read its schema — even though the REST endpoint underneath accepts
`sha` ([merge a pull request](https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request)). So
it cannot enforce `--match-head-commit`, and re-reading the head SHA immediately before calling it
narrows the window rather than closing it.

This is a property of the harness and its settings, not of this repository, so it can change without
warning in either direction. Recognise it; do not design around it.

## A slash command sent mid-message never loaded

**10 August 2026, on CAN-22.** `/implement` was sent as the tail of a message that opened with
Orca's ticket-link preamble:

```
Linked Linear issue: CAN-22
https://linear.app/jacobrees-canoncore/issue/CAN-22/... /implement
```

Nothing arrived — no `<command-name>` block, no skill body — and the session ran on the model's own
judgement instead. In the same session `/draft-pr`, sent on its own, expanded normally with its
whole body inlined.

**No mechanism is claimed.** A missing `mattpocock-skills:` prefix is ruled out: a plugin skill's
bare name works "unless another command already uses that name"
([Extend Claude with skills](https://code.claude.com/docs/en/skills)), and nothing else used
`implement`. Position is the remaining explanation, and it is inference from two observations.

**The rule holds under every explanation: send a slash command as its own message.** The tell that
it worked is that a loaded skill echoes its own instructions — without which a skill that did not
load is indistinguishable from one that loaded and had nothing to say.

## An unauthenticated OAuth MCP server exposes only its sign-in tools

**12 August 2026, on CAN-47 CLAUDE.md still defers three MCP installs that have happened**, when
neither `neon` nor `sentry` was signed in. A server of this kind answers nothing at all until the
sign-in completes: it exposes `authenticate` and `complete_authentication` and no other tool.

**What it proves.** An empty toolset is a sign-in state, not a broken server and not an absent
capability. Sign-in state is per session and belongs in no document as standing fact.

## Five merged lanes were closed out by hand

**16 and 17 August 2026**, recorded on CAN-128 Close out the worktree when /review-pr lands a merge.
Five worktrees were removed by hand after their pull requests had merged, each one after checking by
hand that the branch had genuinely landed: `can-102` ([#181](https://github.com/jacobrees-canoncore/CanonCore/pull/181),
merged 18:38:53Z), `can-86` ([#183](https://github.com/jacobrees-canoncore/CanonCore/pull/183), 18:35:52Z),
`can-123` ([#185](https://github.com/jacobrees-canoncore/CanonCore/pull/185), 20:38:43Z) and
`can-56` ([#186](https://github.com/jacobrees-canoncore/CanonCore/pull/186), 20:44:21Z) on the 16th,
`can-54` ([#191](https://github.com/jacobrees-canoncore/CanonCore/pull/191), 09:07:00Z) on the 17th.

**The removals themselves cannot be re-run**, and only the merges above anchor them: a lane exists
from `worktree create` to `worktree rm`, neither of which leaves a trace, and Orca keeps `createdAt`
for live worktrees only
([`research/orca-gaps-and-the-worktree-workflow.md`](research/orca-gaps-and-the-worktree-workflow.md)
→ *The lane era is datable, and "thirteen" is exactly right*).

**What it proves.** The check a person was repeating is one `/review-pr` had already made and
quoted: the pull request's `state` and `mergedAt`. A lane outlives the merge in three ways at once —
checkout, terminals, board card — and none of them is anybody's job until somebody notices.

## A terminal that stops its own worktree prints the result and then dies

**21 August 2026, on CAN-128 Close out the worktree when /review-pr lands a merge**, Orca 1.4.186.
`orca terminal stop` takes `--worktree <selector>` and no terminal selector — *"Stop terminals for a
worktree"* (`orca terminal stop --help`) — so it stops every live pty under the worktree, the
caller's included. On a throwaway worktree, its one shell was sent
`orca terminal stop --worktree current --json; echo SURVIVED_THE_STOP`. The shell's tail holds the
whole response — `ok: true`, `result.stopped` of `1` — and no `SURVIVED_THE_STOP`. `terminal list`
then returned no terminals and `worktree ps` read `status: "inactive"` with `liveTerminalCount: 0`,
while the worktree stayed listed and on disk until it was removed.

**Why.** The CLI passes the selector straight through: `terminal.stop` resolves to
`runtime.stopTerminalsForWorktree(worktree)` in the bundled runtime, with no exclusion for the
caller. The gentler teardown is a **different** method — `terminal.sleep`, onto
`runtime.sleepTerminalsForWorktree` — and `orca terminal` exposes no `sleep` subcommand, so `stop`
is the only teardown a skill can reach.

**What it proves.** The response comes back and the shell that asked for it does not survive to use
it. So a step that runs this can only be the last step there is: an agent inside the lane cannot act
on the output, and whatever it has not already said is never said. The ordering is forced rather
than preferred — stopping the terminals before reporting produces no report at all.

## An unknown board status id is accepted and becomes the card's status

**21 August 2026, on CAN-128 Close out the worktree when /review-pr lands a merge**, Orca 1.4.186.
`orca worktree set --worktree current --workspace-status not-a-real-status --json` returned
`ok: true` carrying `workspaceStatus: "not-a-real-status"`, and `orca worktree show` read the same
value back. The lane was set to `in-progress` again immediately.

**Why.** The flag is documented as *"Board status id (defaults: todo, in-progress, in-review,
completed)"* (`orca worktree set --help`), and the CLI forwards whatever string it is given rather
than checking it against the board.

**What it proves.** A misspelled status is not an error, it is a board column nobody looks at. So a
status a skill writes has to be recorded where a reader can check the spelling, and read back from
the call's own output rather than assumed from its exit code.

---

# The tracker

## The Linear→GitHub sync reverted a description write

**10 August 2026, on CAN-36 while landing
[#39](https://github.com/jacobrees-canoncore/CanonCore/pull/39).** GitHub issue #38 was updated at
`13:18:18`, the `save-issue` landed at `13:18:20`, and the sync reverted all four acceptance
criteria to unticked. It happened **twice on the same issue within four minutes**, each time seconds
after an automation-driven change. CAN-34, written at a quiet moment in the same session,
propagated fine.

**Why.** Updates to an already-synced issue flow both ways ([Linear's GitHub
docs](https://linear.app/docs/github)) and the last write wins; propagation takes a few seconds. A
description write landing inside that window loses to the in-flight GitHub→Linear push, which
carries GitHub's copy of the body. **The failure is silent** — nothing errors, nothing warns, and
the issue looks as though the write was never made.

**That is the GitHub→Linear direction; the reverse has not been caught losing a write here.**

**What it proves.** An immediate re-read cannot tell *written* from *written and about to be
overwritten*, because at that moment the two are the same read — which is how the single-attempt
rule reported success on CAN-36 while the ticks were being reverted. Retrying the write is a race
against a third party's scheduler; rewriting once, after a settled read has *shown* a revert, is
repair rather than retry.

## Nine forms of a ticket reference, and the two that survive a Linear body

**17 August 2026, on CAN-88 The GitHub sync rewrites bare CAN-n link text into GitHub numbers,
defeating the cite-by-title rule.** Nine forms of one reference — every one of them to CAN-17 v1: the
walking skeleton in production, then the founding case — written into this issue's own description in
a single save, so all nine met the same sync pass and the comparison is controlled. The body was then
saved a **second** time, unchanged but for one sentence, to see what a second pass does to what the
first one produced. The mirror is
[issue #127](https://github.com/jacobrees-canoncore/CanonCore/issues/127).

**The round trip takes minutes, not seconds.** Write at `13:38:41Z`, return push at `13:45:00Z` — six
minutes nineteen seconds. The outbound leg was immediate (GitHub's mirror carried the rewrite within
seconds), so all of the delay is the return. That is two orders of magnitude longer than the "few
seconds" the description-race rule above is scaled for, and it is why a settled read has to be minutes
later rather than seconds.

**Only the first of the two measurements is clean.** GitHub opened a critical incident at `13:40:03Z`
that hit Webhooks by `13:44:02Z` and ran at a 20% error rate across Issues and the API
([status history](https://www.githubstatus.com/history), 17 August 2026). The second round trip
— write `13:56:48Z`, return `14:07:21Z`, ten minutes thirty-three — sits inside that window, so its
extra four minutes are not evidence about the sync's normal pace. **The transformation table is
unaffected**: what each form turns into is not a timing claim, and both passes completed. Read the
six-minute figure as one healthy observation rather than a range.

**What each form came back as.** *Written* is what went in. *One pass* and *two passes* are Linear's
stored body after one and two complete round trips — both observed, not inferred.

| Written into Linear | One pass | Two passes |
| --- | --- | --- |
| `[CAN-17](url)` | `[CanonCore#16](url)` | as before, still `#16` |
| `[CAN-17 v1: the walking skeleton…](url)` | **unchanged** | **unchanged** |
| `CAN-17 [v1: the walking skeleton…](url)` | `[CAN-17](url) [v1: …](url)` | `[CanonCore#16](url) [v1: …](url)` |
| `CAN-17` in prose, no link | `[CAN-17](url)` | `[CanonCore#16](url)` |
| `` `CAN-17` `` in a code span | **unchanged** | **unchanged** |
| `#16` in prose | `[#16](url of CAN-17)` | as before |
| a naked Linear issue URL | `[CanonCore#16](url)` | as before |
| `### CAN-17` as a heading | `### [CAN-17](url)` | `### [CanonCore#16](url)` |
| `[CAN-17](url)` inside a fence | **unchanged** | **unchanged** |

Row one is the reported bug. Row two is the fix. Rows three, four and eight are the same decay reached
three ways, and rows five and nine are the only other things that came back as written.

**The trigger is a link whose text is nothing but the identifier.** Linear's push to GitHub replaces
such a link with a GitHub cross-repository reference — `owner/repo#N`, in GitHub's numbering — and the
return push turns that back into a link to the *Linear* issue while keeping the GitHub text. A link
text carrying anything besides the identifier is pushed and returned untouched, which is why row two
survives both passes.

**A bare identifier can decay into the trigger form, which is why one pass is not proof of safety.**
Rows three, four and eight went in bare — in prose, beside a link, and as a heading — and came back
from the first pass as `[CAN-17](url)` with the text intact, reading as untouched. That is the trigger
form, so the second pass mangled all three, on lines nobody had edited. The two-stage decay is the
reason a body has to be grepped *before* a save as well as after.

**What decides whether a bare identifier decays was not isolated, and the first attempt to bound it
was a measurement error worth recording.** The census counted a bare identifier by excluding matches
inside the *mangled* and *trigger* link forms, but not inside a **titled** one — so every
`[CAN-17 v1: the walking skeleton…](url)`, the prescribed form, was counted as a bare identifier in
prose. That put the population at 364 when it was **43**, and produced a reassurance with nothing
under it: "322 of them are followed by their own title and have survived repeated round trips" was
just the titled links being counted twice over. Excluding link text and hrefs as well as code, the
real figures on 17 August 2026 are **43 bare prose identifiers across 19 issues**.

**On the corrected denominator, and read after the sync had settled, it is not a hazard but the norm.**
Of the **31** bare prose identifiers in the 96 bodies the repair saved, **26 were linkified into the
trigger form — 84%**, leaving 5. An earlier read of the same bodies showed only 6, because it was taken
while GitHub's webhooks were still degraded and the return pushes had not drained; the figure moved
from 6 to 26 over about four hours with no further writes. **A bare identifier in a Linear body should
be assumed to become `[CAN-n](url)`, and therefore to be mangled on the save after that.**

**That includes the bold title-beside form, which is the important part.** These documents prescribe
**CAN-30 GDPR export and erasure**, and this issue's own body used it. In a Linear body it does not
hold: it came back as `[CAN-30](url) **GDPR export and erasure**` — the identifier pulled out into a
bare link and the title left bolded beside it, which is exactly the trigger form the rule exists to
avoid. So in a Linear body the **only** safe citation is the title *inside* the link text, and the only
safe bare mention is a code span. The bold form remains correct in this repository, which is not
synced — that is the whole of the difference.

**The substituted number names a different ticket, and the drift is not arithmetic anyone can undo.**
Across the 72 distinct targets currently mangled, the offset runs from `+3` at `CAN-6` to `-50` at
`CAN-117` — because **GitHub numbers issues and pull requests in one sequence**, so every merged pull
request widens the gap. Spot-checked: `#33` and `#35` are pull requests, `#16` mirrors `CAN-17`. The
gap therefore grows for as long as the project lands work, and a reader who learns today's offset has
learned nothing about next week's.

**`#N` written in prose is the worst of the nine**, because it is linkified to whatever the *other*
system numbers that way. Row six was written as the plain number `16` and came back as a link to
`CAN-17`.

**Two forms are immune and nothing else is**: the title inside the link text, and anything inside a
code span or a fence.

**The damage was recurring, not a one-off, which is what decided the repair.** This issue's own report
noted that some bare citations were still intact and wondered whether the rewrite depended on mirror
state. It does not: row one went in as `[CAN-17](url)` and came back rewritten, so **an intact
trigger-form citation is one save from being mangled, not exempt.** A census of all 134 issues on
17 August 2026 found **237 already-mangled links in 46 issues and 343 intact trigger-form links in 72**
— so more than half the damage had not happened yet. Repairing only the visible half would have been
worse than doing nothing, because the repair write is itself a save: it would have mangled the 343 it
left behind.

**So all of it was repaired in one pass, and the rule changed in the same change.** 813 citations
across 96 issues: the 237 mangled and 343 trigger-form links given their titles inside the brackets,
221 duplicate titles absorbed where the author had written the title *after* the link, 5 links to
Linear review pages relabelled as the pull requests they are, 4 bare `#N` pull-request links given
words, 1 bare `#N` link inside the probe itself, and 2 hand-repaired in
CAN-37 Stop /review-pr racing the GitHub sync when it writes checkboxes, where the prose is
deliberately *about* the GitHub-side numbers. The repair only ever rewrote link text, checked
mechanically: every href preserved, no prose word lost outside an absorbed title, and no `****` run
introduced. **A full re-read afterwards found 0 mangled links, against 237 before.**

**It did not leave the tracker clean, and the residue is the finding below.** Twenty-six trigger-form
links remain, across six issues — CAN-88 The GitHub sync rewrites bare CAN-n link text into GitHub
numbers (10), CAN-45 Record what CAN-18 provisioned, and the two things it could not prove (5),
CAN-43 Publish the reporting route the Online Safety Act requires (4), CAN-97 Record the amendment
rule, and what an ADR does when a decision changes (4), CAN-120 Five mirrored issue bodies are
contradicted only by a comment the mirror never received (2) and CAN-96 Record the architecture
decisions of 15 August, and make the repository agree (1). Linear created every one of them *during*
the repair write, by linkifying a bare prose identifier. They are not survivors of the old damage; they
are new, and each is the next save's mangling if left.

**The durability of that repair is not yet verified, and it is the one thing left open.** All 96 writes
went out between `14:14Z` and `14:24Z`, inside the GitHub incident above — so whether every outbound
push reached the mirror is unknown, and a late return push carrying a stale GitHub body is exactly the
silent-revert mode this file's first tracker entry describes. The Linear side is confirmed; the mirror
side is not. **Re-read the tracker for `CanonCore#` once GitHub reports green.**

**Bare prose identifiers were left alone, which the residue above shows was the wrong call.** They were
left because they are the form these documents prescribe and the repair was scoped to links; the six
that linkified during the write are the argument for treating them as in scope next time. Eighteen
duplicate titles also remain, each sitting inside an emphasis run that extends past the title or across
a hard break, where removing the copy would break the markup around it.

**Saving those 96 bodies proved a second mechanism, on the save itself rather than the round trip.**
Six of the 31 bare prose identifiers in those bodies came back linkified to `[CAN-n](url)` — the
trigger form — with `updatedAt` still the write's own timestamp, so no return push had run. **And each
one broke the emphasis run it sat in.** On CAN-97 Record the amendment rule, and what an ADR does when
a decision changes, this went in:

```markdown
**CAN-73 Settle the Snapshot layer, the CI database seam, and forked-Snapshot erasure before CAN-23**
```

and came back as this, with the identifiers pulled out of the bold run and the remains of the title
left bolded on their own:

```markdown
[CAN-73](url) **Settle the Snapshot layer, the CI database seam, and forked-Snapshot erasure before** [CAN-23](url)
```

On CAN-120 Five mirrored issue bodies are contradicted only by a comment the mirror never received,
`**Bound: CAN-1 to CAN-126, fetched one identifier at a time.**` lost its bold at `CAN-126` the same
way — and there the identifiers were a **range**, not citations, so linkifying them is wrong on its own
terms. `CAN-1` in that same run was left alone, which fits Linear only linkifying an identifier it can
resolve: `CAN-1` to `CAN-4` are archived onboarding templates.

**So a bare identifier in a Linear body is not merely a citation hazard, it is a markup hazard**, and
neither is fixed by the title-inside-brackets rule, which is about links. 26 of 31 fired on one save,
once the sync had settled. **The reliable defence for a mention that is not a citation —
a range, a count, an identifier being discussed rather than cited — is a code span**, which came back
untouched from both passes of the probe.

**No setting governs any of it.** The repo↔team link exposes exactly three controls — repository,
Linear team, and issue-creation direction — read in the Linear UI on 17 August 2026; the integration's
remaining options are branch format, linkbacks, commit magic words and an external review tool, and
two more are Business-plan upsells. Linear's [GitHub docs](https://linear.app/docs/github) enumerate
the properties that sync and describe no transformation of them. So the form is worked around, never
configured away.

## An omitted `--workspace` resolved to a different workspace each half-day

**6 August 2026.** With nothing touched in between, `orca linear` resolved to Sift in the morning and
Waveger the same afternoon. Orca is connected to three workspaces (CanonCore, Sift, Waveger) and
does **not** infer one from the current directory.

**The failure is silent and direction-dependent.** `list-issues` unscoped returns another
workspace's issues, which at least looks wrong; `search` unscoped returns an empty list, which reads
as "no matching issues" rather than "wrong workspace".

## One GitHub owner binds to one Linear workspace

**6 August 2026.** Waveger could not be connected to Linear at all, failing with *"Make sure you
haven't connected another Linear account with this GitHub installation"*. Waveger and Sift were both
under the personal `jacobdrees` account until that date; they were split into `jacobrees-waveger`
and `jacobrees-sift`, one org per workspace.

**What it proves.** A GitHub App installs once **per owner**, and one owner can bind to only one
Linear workspace. A second GitHub *account* is not required, contrary to the common advice — one
account administering several orgs is enough.

---

# Hosting and the repository

## Vercel Hobby refuses a private organisation-owned repo

> *Follow-up, 21 August 2026: this entry's **Vercel** half no longer binds — the account is on Pro, and
> only its GitHub half still requires this repository to be public. See
> [the follow-up entry](#the-hobby-private-repo-refusal-stopped-binding-on-the-pro-upgrade) below. The
> observation itself is left exactly as it was written.*

**10 August 2026, CAN-18.** Creating the Vercel project against the private repository failed with
`repo_owned_by_org`: *"The repository CanonCore is private and owned by an organisation, which is
not supported on the Hobby plan."*

That is an observed API response, not a documented policy; Vercel does not publish the restriction.
The repository already carried an MIT licence, so making it public was chosen over upgrading to Pro.

**It decides a second thing.** Rulesets and required status checks are free on **public**
repositories under GitHub Free, which is what pays for the ruleset `main` has carried since CAN-40
([about
rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)).
Going private would take the deployment *and* the ruleset.

## The Hobby private-repo refusal stopped binding on the Pro upgrade

**21 August 2026, CAN-59 Decide whether the Hobby plan can carry a public service.** A follow-up to
[Vercel Hobby refuses a private organisation-owned repo](#vercel-hobby-refuses-a-private-organisation-owned-repo)
above, which is left as written.

**What is now false.** That entry's first half was a Hobby restriction, and the account moved to Pro
on 21 August 2026 ([ADR-0024](adr/0024-vercel-pro-for-a-spend-cap-rather-than-an-outage.md)). Pro does
not refuse a private organisation-owned repository, so `repo_owned_by_org` is no longer a reason this
repository has to be public.

**Its second half is untouched, and is now the whole of the constraint.** Rulesets and required status
checks are free on **public** repositories under GitHub Free, and that is what pays for the ruleset
`main` has carried since **CAN-40 Give main a ruleset that refuses an unchecked merge**. Going private
would still take the ruleset and every merge gate with it, and that has nothing to do with Vercel's
plan.

**The observation itself stands.** `repo_owned_by_org` was a real API response on 10 August 2026 on a
Hobby account, and nothing here re-tested it — the entry stopped being load-bearing rather than
stopped being true.

## Spend Management saves in two steps, and abandoning the second discards it

**21 August 2026, CAN-59 Decide whether the Hobby plan can carry a public service.** Setting the
on-demand budget and the pause on the newly-upgraded Pro team,
observed in the dashboard because there is nowhere else to observe it.

**Three things, in order of how much they cost.**

**Saving takes two steps, and stopping after the first writes nothing.** Clicking **Save** opens a
confirmation dialog that asks for the team name verbatim before anything is written — which is
Vercel's own documented flow, *"Confirm the action by entering the team name and select Continue"*
([Spend Management](https://vercel.com/docs/spend-management), read 21 August 2026). **Two attempts
here reloaded the page while that dialog was still open, and both were silently discarded**: the page
came back reading `$0 / $200` with the pause off, and no error was shown anywhere. Only a read-back
after a full reload caught it.

**There is no API and no CLI, so a read-back is the only verification available.** Four candidate
endpoints — `/v1/teams/{id}/spend-management`, `/v1/spend-management`,
`/v1/teams/{id}/billing/spend-management` and `/v1/billing/spend-management` — all answer `404`, and
the team object's `billing.controls` carries only the Web Analytics sample rate and spend limit.
**So no check in `scripts/check-docs.ts` can ever gate that row of `docs/infrastructure.md`**, which
is why the register names the dashboard and the date instead.

**The collapsed control reads as unset when it is not.** It renders as `0 On-Demand Budget` in the
accessibility tree; its full label is `$0 / $200`. The `$200` is Vercel's documented default for new
customers, so the display is misleading rather than the setting being absent.

**One discrepancy left unresolved.** The toggle is labelled *Pause Production Deployments* and its
description says projects become *"unavailable to visitors"*, but its confirmation dialog says **"All
deployments are paused."** The documentation agrees with the toggle, not the dialog — it pauses *"the
production deployment for all projects"* (same page). Nothing here depends on which is right, but
anyone expecting previews to survive a pause should test it rather than read it.

## The API name for a project setting is not the dashboard name

**11 August 2026, CAN-22.** `PATCH /v9/projects/{id}` takes `sourceFilesOutsideRootDirectory`;
`includeSourceFilesOutsideRootDirectory` — the dashboard's wording — is rejected with `should NOT
have additional property`. Confirmed against the field name in the CLI's own cached OpenAPI spec.
Vercel's public reference documents neither spelling.

## Installing the Vercel GitHub App on a second org displaced nothing

**10 August 2026, CAN-18. Observed rather than looked up.** Installing on `jacobrees-canoncore` left the existing
`jacobrees-waveger` installation untouched, and Vercel's `/v1/integrations/git-namespaces` then
returned both namespaces at once. Whatever the `gitOrgLimit=1` parameter in Vercel's import URL
controls, it is not an account-level cap. Waveger was never at risk.

## The holding page was first deployed straight to production

**Before 10 August 2026, superseded by CAN-22 on 11 August 2026.** The static holding page was first deployed from a temporary directory with `vercel deploy --prod`.
That was a mistake: **any** push to `main` triggers a production build, and a build of a repository
with no application produces a 404, so a documentation-only merge would have taken the site down.

The old root `vercel.json` set `outputDirectory` to `public` to keep the served surface to that one
file. CAN-22 deleted both it and `public/index.html`; the Next.js preset now decides the output
directory, which is why nothing replaces that file. The **Hosting** rows in
`docs/infrastructure.md` are what now protect against the same shape.

## Both required contexts report on documentation-only pull requests

**12 August 2026, CAN-40.** Confirmed present and `SUCCESS` on the five most recent merged pull requests at the time —
[#80](https://github.com/jacobrees-canoncore/CanonCore/pull/80),
[#81](https://github.com/jacobrees-canoncore/CanonCore/pull/81),
[#82](https://github.com/jacobrees-canoncore/CanonCore/pull/82),
[#85](https://github.com/jacobrees-canoncore/CanonCore/pull/85) and
[#86](https://github.com/jacobrees-canoncore/CanonCore/pull/86) — all documentation-only.

That was the part actually in doubt. With **Include files outside the root directory** on, Vercel
builds a change touching nothing under `apps/web`, so it reports on those pull requests too. A
required context that skipped them would block every documentation merge for ever.

---

## A failing check reaches the phone, a recovering one may not

**13 August 2026, CAN-66 Create the uptime monitoring account and its phone alert route.** The alert
route was proved by inducing failures rather than by reading the configuration back. A throwaway
monitor `803731827` was pointed at `https://www.canoncore.com/uptime-alert-test-can-66`, which 404s,
with push and e-mail enabled. Monitor `803731762` was never touched, and the throwaway was deleted
at the end.

- **Incident `346322792378836481`** — `404 Not Found`, started **17:03:08 BST**. A push arrived on
  the iPhone. Recorded as resolved **17:06:03 BST**, duration 2m55s, *because the monitor's URL was
  edited to a working one* — not because anything recovered.
- **Incident `346324252843848850`** — `404 Not Found`, started **17:08:56 BST**, after the URL was
  put back. A push arrived again. It has no end: the monitor was deleted while still down.
- **No push was seen for the 17:06:03 recovery.**

**That is not evidence that recovery alerts are broken, because the test was invalid for them.** The
resolution came from editing the monitor rather than from the target recovering, and an edit-driven
resolution is a plausible reason for UptimeRobot to send nothing at all. **The up path is untested,
not failing.** What is ruled out is a configuration or permissions cause: the iOS app was signed into
the same account — it lists the canoncore monitors — notification permission was granted, and push
is set to *Up events, Down events* at both account and monitor level.

**What it supports, exactly.** A failing check reaches the phone, twice out of twice, **on a monitor
other than the production one**. Monitor `803731762`'s own route is inferred from identical settings,
never watched. **Do not read silence as recovery** until an up alert has actually been seen.

**A 404 exercises the fast path only.** An erroneous HTTP status is marked down with no verification,
so none of the four-request confirmation a non-responding host gets was tested
(`docs/infrastructure.md` → *Uptime monitoring: UptimeRobot*). It was chosen for that: it fires on
one check instead of four and needs no real outage. **The monitor page has a Test Notification button**, which was
only noticed after this test had run.

**`HEAD` is served by the `GET` handler, though the guide says otherwise.** The free plan can only
send `HEAD`, so this decides whether `/api/health` needs an export of its own. Next 16.3.0 lists
`AUTOMATIC_ROUTE_METHODS = ['HEAD', 'OPTIONS']` and, where a module exports `GET` and no `HEAD`, sets
`methods.HEAD = handlers.GET`
(`apps/web/node_modules/next/dist/server/route-modules/app-route/helpers/auto-implement-methods.js`).
The prose shipped in the same package never says so: it names only `OPTIONS` as automatically
implemented (`…/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`) and states that an
unsupported method returns 405 (`…/dist/docs/01-app/01-getting-started/15-route-handlers.md`), so a
reader checking the guide alone concludes the opposite. **Check the implementation before adding a
`HEAD` export to satisfy the monitor.**

---

## Dependabot alerts were enabled, and blind

**16 August 2026, CAN-54 Fail a push that adds a known-vulnerable dependency.** The ticket's first
criterion was that Dependabot alerts be enabled. They already read as enabled, and were seeing
nothing at all, because **the dependency graph they match against was off** — a second setting, in a
second place, that no reading of the first could reveal.

What each source said before anything was changed:

All against `jacobrees-canoncore/CanonCore`, as `jacobdrees`, between **22:54 and 22:58 BST**:

| Read | Answer |
| --- | --- |
| `gh api -i repos/jacobrees-canoncore/CanonCore/vulnerability-alerts` | `HTTP/2.0 204 No Content` — [the documented *enabled*](https://docs.github.com/en/rest/repos/repos#check-if-vulnerability-alerts-are-enabled-for-a-repository) |
| `gh api "repos/jacobrees-canoncore/CanonCore/dependabot/alerts?state=open"` | `[]` |
| `gh api repos/jacobrees-canoncore/CanonCore/dependency-graph/sbom` | `404 Not Found`, three times |
| `gh api repos/cli/cli/dependency-graph/sbom` | `500`, *"Failed to generate SBOM: Request timed out"* |
| `github.com/jacobrees-canoncore/CanonCore/network/dependencies` | **"Dependency graph is disabled"**, with an *Enable* button |

**The 404 is the reading that matters, and only the fifth row makes it legible.** A 404 from that
endpoint is indistinguishable from a token that cannot reach it; the `cli/cli` call is what
separates the two, because a 500 out of the generator proves the endpoint answers this credential.
So the repository genuinely had no graph, and `[]` meant *nothing was parsed* rather than *nothing
is vulnerable* — the two readings a green tick cannot tell apart.

**The obvious REST route does not work, and fails by staying quiet.** `PATCH
/repos/{owner}/{repo}` with `security_and_analysis[dependency_graph][status]=enabled` returned
**200** and a body in which the field simply does not appear — and the page still said disabled.
That payload documents nine sub-properties of `security_and_analysis`, all of them Advanced Security
or secret scanning, and `dependency_graph` is not one of them
([the OpenAPI description](https://github.com/github/rest-api-description/blob/main/descriptions/api.github.com/api.github.com.json),
`PATCH /repos/{owner}/{repo}`), so it is discarded without comment and the call reads exactly like a
successful one. **No other REST route was
looked for**; the UI button is what was used, and is what the register's read-back commands work
around.

**What flipping it changed, within a minute.** The SBOM went from `404` to **696 packages**. The
open alert list went from `[]` to `GHSA-67mh-4wv8-2f99` (esbuild, moderate) — the same advisory
`pnpm audit` had been reporting locally the whole time. The next `git push` printed *"GitHub found 1
vulnerability on jacobrees-canoncore/CanonCore's default branch (1 moderate)"*, which no earlier push
to this repository had ever printed.

**The general lesson is the one the ticket was already carrying about secret scanning: a criterion
that can be ticked from a setting's own name is not yet evidence.** Of the three settings this ticket
turned on, two live in `security_and_analysis` and the third lives nowhere a REST call was found to
reach. Alerts, the fourth, were never flipped at all — they had read as enabled throughout, which is
the whole point. `docs/infrastructure.md` → *Dependency and secret scanning* records all four with
the call that reads each one back.

---

## The audit gate was proved by a critical advisory, then reverted

**16 August 2026, CAN-54 Fail a push that adds a known-vulnerable dependency.** `minimist@0.0.8`
(GHSA-xvch-5gv4-984h, critical prototype pollution) was added to `apps/web` as a devDependency,
imported by nothing, and pushed as [`5b1b590`](https://github.com/jacobrees-canoncore/CanonCore/commit/5b1b590b30d698709ba9f0a3888346e738b3f1a7).

Run [`31975102269`](https://github.com/jacobrees-canoncore/CanonCore/actions/runs/31975102269)
failed, and **failed in the right place**: `pnpm -r test`, `pnpm -r typecheck`, `pnpm -r lint` and
`pnpm -r build` all reported `success`, `pnpm audit --audit-level=high` reported `failure` with
`Process completed with exit code 1`, and the four job steps after it all reported `skipped`, as did
`setup-node`'s post-action — only teardown ran. The log names the advisory: *"critical │ Prototype Pollution in minimist"*, `Paths: apps__web>minimist`.

The dependency was removed in the next commit, and `apps/web/package.json` and `pnpm-lock.yaml` are
byte-identical to `main` again.

**Two of those four skips are not evidence, and the entry would overclaim without saying so.** Both
release steps carry `if: github.ref == 'refs/heads/main'`, and this was pushed to a branch, so they
would have skipped whatever the audit did. **What the run proves is the two that would otherwise have
run** — the `vercel` install and the documents check — **stopped because the audit failed.** That the
release is also behind it is read off the step order and those two conditions, not off this run, and
observing it directly would mean pushing a critical advisory to `main`, which is not a thing to
arrange.

**A local exit code would not have shown even that much.** `pnpm audit --audit-level=high` exits 1 on
a laptop as readily, and proves only that the command works. What needed proving was that the step is
wired into the job GitHub runs, at a position where its failure stops what follows.
`docs/agents/workflow.md` → *The gates* is where that ordering is argued.

**The branch then stayed on that commit for ten hours, across the end of a session.** `5b1b590` was
the remote head from 21:59:59Z on 16 August 2026 until 08:02:38Z the next morning, when the rest of
the work arrived in one push — read on 21 August 2026 off the only two `push` runs that branch ever
had, `31975102269` and `32008487556`, since the branch itself is gone. `docs/agents/workflow.md` →
*When `/implement` may push* is the rule that came of it, and both what left the branch there and
what it cost are argued there.

**The commit outlived the branch, and only because it is named by its SHA.** The squash-merge put
one commit on `main` and `delete_branch_on_merge` took `jacobdrees/can-54` away — a request for that
branch now returns 404 — while `5b1b590` still resolves, through the refs GitHub keeps for
[PR #191](https://github.com/jacobrees-canoncore/CanonCore/pull/191). Both checked on 21 August 2026.
That is GitHub retaining a pull request's history rather than this repository holding a reference
anyone could find by looking, which is why the id and the SHA belong in an entry like this one
before the merge and not after it.

---

# Database

## Preview branching was switched off, so no preview ever got a branch

**12 August 2026, CAN-45.** **CAN-18 recorded that automated preview branching "is not exposed as a toggle on either dashboard".
That is wrong, and being wrong about it is why no branch was ever created.**

**Read from the Neon dashboard on 12 August 2026 by CAN-45, before any change:** the project's
branch list showed **`1 / 5000 Branch`** and `main` alone, no parent, created two days earlier. The
repository's first preview deployment
([PR #59](https://github.com/jacobrees-canoncore/CanonCore/pull/59), commit `3d9eea9`) created no
branch — so a preview composing its connection string from `NEON_PGHOST` would have reached
production's host.

**Where the control actually is:** Vercel → Integrations → Neon → the `canoncore` resource →
Projects → the row's menu → *Update Project Connection*. The dialog is *Configure canoncore* and
carries a **Create Database Branch For Deployment** control with `Preview` and `Production`
checkboxes.

**Half of the CAN-18 sentence holds: Neon's own dashboard genuinely has nothing.** Its Integrations
page lists Vercel under *Added* and offers a single "Manage Neon subscription" button, which hands
straight back to Vercel. Looking there and concluding the feature is absent is the easy mistake, and
it is the one that was made.

**The checkboxes are greyed out until `Require Active Resource Before Deploy` reads `Required`.** It
is not absent, it is disabled behind a second setting, and a greyed-out control reads like an
unavailable feature rather than an unmet prerequisite. Neon's [preview branching
guide](https://neon.com/docs/guides/vercel-native-integration-previews) gives the same order.

**Neither of CAN-22's two checks can detect this, before or after, and both must be retired.** They
are the obvious things to reach for and both return the same answer whether branching is on or off:

| CAN-22's check | Why it proves nothing |
| --- | --- |
| `NEON_PGHOST` in `vercel env pull`, preview against production | Branch variables are "injected via webhook at deployment time" and "cannot be accessed or viewed in your Vercel project's environment variable settings". `vercel env pull` reads project-level values, so it shows one static host for all three environments |
| The preview build log, searched for Neon activity | **Completely silent.** The branch is created by the platform out of band, not by the build. The only line matching "branch" is the git clone |

**Only Neon's branch list answers the question.** That is the check to repeat.

## A preview branch inherits its parent's role passwords

**12 August 2026, CAN-45.** Neon's `connection_uri` for `canoncore_app` was read on `main` and on
the first preview branch and compared:

| | `main` | the preview branch |
| --- | --- | --- |
| Role | `canoncore_app` | `canoncore_app` |
| Password | 28 characters, SHA-256 `8606a49d65d8…` | **identical on both counts** |
| Host | `ep-aged-moon-zaujrwy4-pooler.c-2.eu-west-2.aws.neon.tech` | `ep-misty-math-zamlwlio-pooler.c-2.eu-west-2.aws.neon.tech` |

Same credential, different host — the shape the composed preview URL assumes. **So the recorded
fallback (read the branch's own `NEON_DATABASE_URL` and swap only the credentials) buys nothing the
composed URL does not already have, and should not be built.**

The passwords were compared by digest on purpose: `DATABASE_APP_PASSWORD` is a Vercel *sensitive*
variable and cannot be read back, and a password belongs in no commit or transcript. Anyone
repeating this should do the same.

**CAN-22 could not run this check** — there was no branch to connect to, for the reason in the entry
above.

## What a preview branch looks like, and how long it outlives its PR

**12 August 2026, the first preview deployment after branching was switched on:**

| | |
| --- | --- |
| Branch | `preview/jacobreesnew/can-45-preview-deployments-do-not-appear-to-get-their-own-neon` |
| Id, parent | `br-restless-bread-za5ebaq1`, parent `main` |
| Created by | **Vercel**, at 12:51:21 +01:00, two seconds before the build started |
| Carries | `canoncore_app` and `canoncore_migrator`, both stamped created two days earlier, i.e. copied from `main` rather than issued fresh |

The name is `preview/` plus the **git branch**, so it is one branch per git branch and not one per
deployment: the second push to the same branch reused it.

**A branch is created even when the build fails.** That one was created by the deployment that
errored on `The specified Root Directory "apps/web" does not exist`, and survived to serve the
successful build a minute later. **That error was not the Root Directory setting being wrong** — the
branch being built simply predated CAN-22's merge and so did not contain that directory yet.
Rebasing onto `main` fixed it. A stale branch, not a broken project.

**Persistence, measured on CAN-47.** CAN-46's branch outlived everything that made it:

| | |
| --- | --- |
| Branch | `preview/CAN-46-pr-skills-say-skeleton-missing`, `br-rapid-boat-zav226ha` |
| Created by | Vercel, 12 August 2026 15:44:25Z |
| Its PR | [#63](https://github.com/jacobrees-canoncore/CanonCore/pull/63), **merged 15:48:18Z**, three minutes later |
| Its git branch | **deleted from `origin`** by that merge |
| The Neon branch, 24 minutes after the merge | `current_state: ready`. Still there |

Neon deletes a preview branch "when their corresponding Vercel deployments are removed", which
"depends on Vercel's deployment retention policy, which retains preview deployments for 6 months by
default", so branches "can persist long after a PR is closed" ([preview
branching](https://neon.com/docs/guides/vercel-native-integration-previews)). Budget for one live
branch per git branch that has ever had a preview, not per open PR.

**What survives is the storage, not the compute.** That branch's compute suspended itself at
15:49:30Z, five minutes after its last activity, and reads `current_state: idle` — an abandoned
preview branch is not a running instance quietly billing. Its `logical_size` is 30941184 bytes
against `main`'s 30892032, because that figure is the data it *can see*; `written_data_bytes: 0`,
because it is copy-on-write from `main` (`init_source: parent-data`). The marginal cost is its
divergence from the parent, until something writes to it.

## `parent-data` cloning cannot be switched off in the integration

**13 August 2026, CAN-70 Close out the domain and integration loose ends only a human can reach.**
Decided the same day that a preview must not hold a clone of production rows; the attempt to flip
the integration to schema-only branches established that no such switch exists anywhere.

Not in Vercel — the store's Settings page, the installation settings, and the *Update Project
Connection* dialog, whose whole surface is environments, the Preview/Production checkboxes and the
variable prefix. Not in the Neon console — project Settings, and Integrations → Vercel links
straight back to Vercel. Both dashboards read that day.

Neon offers schema-only branching **at branch-creation time only** — the Console's **Schema only**
option in the New branch dialog, `neon branch create --schema-only`, or the create-branch API with
`init_source` set to `schema-only` — and it is Beta ([Schema-only
branches](https://neon.com/docs/guides/branching-schema-only)). The preview branch examined above
reads `init_source: parent-data`.

Unticking Preview would send previews back to sharing `main`, the state CAN-45 fixed. So the
decision moved to **CAN-79 Previews clone production rows, and the integration has no switch to stop
it**, which owns creating schema-only branches in CI instead.

**Closed 17 August 2026, and not by the shape that sentence expected.** **CAN-79 Previews clone production rows, and the integration has no switch to stop it** found that creating
the branch in CI cannot work, because the property that made the integration worth having is the one
thing CI cannot reproduce: only the Marketplace webhook can put a value into one specific deployment,
and Vercel exposes no route by which we could hand a host to a build already running. Per-deployment
branches and schema-only branches are therefore mutually exclusive. **Every preview now reads one
shared schema-only branch**, addressed by a Preview-scoped `NEON_PGHOST`, and `Create Database Branch
For Deployment → Preview` is unticked — safely, because the shared branch is what stops unticking
meaning "share `main`" ([ADR-0023](adr/0023-one-shared-schema-only-preview-branch.md)). The fifty-odd
branches the paragraph above budgets for were deleted in the same change.

## Drizzle's migrator needs `CREATE` on the database before it reads anything

**14 August 2026, CAN-23 One Story from Neon, behind row-level security.** The first migration this
project ever ran failed against a PostgreSQL 17 where `canoncore_migrator` held `USAGE, CREATE` on
schema `public` and nothing on the database — which is exactly how Neon had it, read the same day:
`neondb`'s `datacl` gave the role `c` (CONNECT) alone.

`drizzle-kit migrate` **exited 1 and printed no reason**, stopping after `[⣷] applying
migrations...`. The same migration through `drizzle-orm/node-postgres/migrator` in-process gave the
message the CLI swallowed: `permission denied for database`. The cause is in
`drizzle-orm/pg-core/dialect.js`, whose `migrate` issues
`CREATE SCHEMA IF NOT EXISTS "drizzle"` **before** reading its journal, and PostgreSQL checks the
privilege before the `IF NOT EXISTS`.

**Two things this settles.** The privilege is not optional and pointing the journal at `public`
instead does not avoid it — `CREATE SCHEMA IF NOT EXISTS public` is refused for the same reason. And
the release step does fail the build rather than passing silently, which is the half that matters
given [Waveger](#waveger-the-build-ran-no-migrations-and-nobody-knew); what it does not do is say
why, so a migration step that exits 1 with no message is this, until proven otherwise.

Fixed by granting `CREATE ON DATABASE neondb TO canoncore_migrator` — recorded in
`docs/infrastructure.md` → *Roles*, and reproduced for throwaway databases by
`apps/web/src/db/roles.sql`. It widens the role that already owns every table; `canoncore_app` is
untouched, and `has_database_privilege('canoncore_app', 'neondb', 'CREATE')` still reads false.

## The Neon owner cannot `SET ROLE` to either application role without granting itself the option

**14 August 2026, CAN-23 One Story from Neon, behind row-level security.** Applying the first
migration to Neon's `main` needed the objects to end up owned by `canoncore_migrator`, and the
`neon` MCP connects as `neondb_owner`. `SET ROLE canoncore_migrator` was refused —
`permission denied to set role "canoncore_migrator"` — **after `pg_has_role(current_user,
'canoncore_migrator', 'MEMBER')` had returned true**. Those two disagree by design: PostgreSQL 16
split a membership into ADMIN, INHERIT and SET options, and *"a role can only `SET ROLE` to another
role if it has the `SET` option on the membership"*
([`GRANT`](https://www.postgresql.org/docs/current/sql-grant.html)). `pg_has_role` with `MEMBER`
does not answer that question, so **it is the wrong thing to check before assuming `SET ROLE` will
work.**

`pg_auth_members` is. Read that day, both memberships were granted by `cloud_admin` with
`admin_option: true`, `inherit_option: false`, `set_option: false` — so `neondb_owner` was already
entitled to give itself the option, which is what makes doing it a use of an existing entitlement
rather than an escalation:

```sql
GRANT canoncore_migrator TO neondb_owner WITH SET TRUE;
-- ... SET ROLE canoncore_migrator, then the work ...
REVOKE canoncore_migrator FROM neondb_owner GRANTED BY neondb_owner;
```

**Revoke `GRANTED BY` yourself, not plainly.** The `GRANT` adds a *second* `pg_auth_members` row
with `grantor: neondb_owner` and leaves Neon's `cloud_admin` row untouched, so the qualified revoke
removes exactly what was added. Both memberships were read back afterwards and matched their
original state.

The same restriction governs `ALTER TABLE … OWNER TO`, so there is no way round it by creating the
objects as `neondb_owner` and reassigning them: that also requires being able to `SET ROLE` to the
new owner.

## A `SET LOCAL` custom setting reverts to the empty string, not to NULL

**14 August 2026, CAN-23 One Story from Neon, behind row-level security.** A test asserting that
the session user does not outlive its transaction
read `current_setting('canoncore.user_id', true)` after the `COMMIT` and expected NULL. It got `''`.

`current_setting(..., true)` returns NULL only while the parameter has never been named in that
session. `set_config('canoncore.user_id', 'user-a', true)` defines it, and the end of the
transaction restores the value it had before — which for a custom parameter first defined inside
that transaction is the empty string.

**Why it does not matter, and why it was still worth finding.** The empty string is this project's
anonymous session user, so a connection handed back to the pool reverts to *anonymous* rather than
to *unset*, and both read no owned rows: the policy compares against `owner_id`, and `story`'s
`story_owner_id_not_blank` constraint means no owner is ever `''`. The lesson is about the
assertion, not the behaviour — asserting on the setting tests PostgreSQL's bookkeeping, and
asserting on the rows tests the thing the rule is about. `apps/web/src/db/rls.test.ts` does the
second.

---

# Credentials

## Regenerating a TMDB key does not revoke the old one promptly

> *Follow-up, 15 August 2026: this entry's **licence** reasoning no longer holds — see
> [the follow-up entry](#the-tmdb-regeneration-entrys-licence-reasoning-no-longer-holds) below. The
> observation and the rule it proves are unchanged.*

**10 August 2026.** The key was regenerated because the original had been pasted into a chat
transcript. The warning at
[`themoviedb.org/settings/api/regenerate`](https://www.themoviedb.org/settings/api/regenerate) reads
*"This will disable your old API key and regenerate a new one. This action cannot be undone."*

**It did not disable it.** The old key and the old bearer token both still returned 200 sixteen
minutes after the regeneration completed — checked repeatedly throughout, and still answering at the
last check, so sixteen minutes is a floor rather than a measurement.

**What it proves.** TMDB revocation is eventual, so regenerating is **not** a way to burn a leaked
credential quickly. A leaked TMDB key has to be assumed live for a window of unknown length.

Regeneration costs nothing under the licence, which is why it was safe to do at all:
[ADR-0009](adr/0009-external-source-tmdb.md) records the retention exception as surviving the key
being disabled, expiring or terminated. Nothing already fetched depends on which key fetched it.

**Do not read the token's `nbf` claim as an issue date.** It is `21 July 2025` on both the old token
and the one that replaced it, so it dates the account's API registration and survives regeneration.

## The TMDB regeneration entry's licence reasoning no longer holds

**15 August 2026.** A follow-up to
[Regenerating a TMDB key does not revoke the old one promptly](#regenerating-a-tmdb-key-does-not-revoke-the-old-one-promptly)
above, which is left as written.

**What is now false.** That entry says regeneration "costs nothing under the licence", because
ADR-0009 then recorded a retention exception surviving the key being disabled, expiring or
terminated. **There is no exception.** All previous TMDB correspondence is disregarded entirely —
decision 5 of **CAN-96 Record the architecture decisions of 15 August, and make the repository
agree**, recorded in [ADR-0009](adr/0009-external-source-tmdb.md) — and TMDB is used on its
published terms alone.

**The observation stands, and so does the conclusion, on a different ground.** Regenerating our own
key is not TMDB terminating our access, so `§1.D` — purge all TMDB Content "on termination" — is not
fired by it. What is gone is the second half, that nothing already fetched depends on the
credential's fate. Under the published terms every copy we hold carries a `§1.C` six-month clock, and
a revocation *by TMDB* fires `§1.D` across the lot.

**So the entry's practical advice binds harder than it did, not less.** A leaked TMDB key has to be
assumed live for a window of unknown length and regeneration does not close it. The exposure is no
longer only that a stranger reads TMDB on our quota: it is that the account can be terminated over
it, and a termination is a duty to empty the catalogue that **nothing currently detects**
([ADR-0014](adr/0014-shell-providers-and-per-source-retention.md#it-models-1c-and-cannot-represent-1d)
records that as unresolved).

## What the TMDB credential was checked against

**10 August 2026, against the live API, from this worktree.** Every row was run **after** the
regeneration above, against the credential now in Vercel — which matters because a `200` alone does
not distinguish it from the key it replaced.

| Request | Result |
| --- | --- |
| `GET /3/tv/121/episode_groups?api_key=…` | 200 |
| the same with `Authorization: Bearer` and no query parameter | 200, and a byte-identical body |
| the same with neither | 401 `{"status_code":7,"status_message":"Invalid API key…"}` |
| `GET /4/list/1` with `Authorization: Bearer` | 200 |
| `GET /4/list/1?api_key=…` | 200 |

`tv/121` is Doctor Who, and it returned five episode groups typed 3, 4, 5, 5, 5 — so ADR-0009's
"five groups, three of them story-arc" still described TMDB accurately on the day the key was
issued.

The last row is TMDB's "same level of access" showing through: the v3 query parameter is accepted by
a v4 endpoint. Prefer the bearer anyway, for the single-process reason TMDB gives, not because the
other fails.

## A Vercel sensitive variable cannot be read back, by anyone

**10 August 2026, CAN-19.** `vercel env pull --environment=production` returns `TMDB_API_READ_ACCESS_TOKEN="[SENSITIVE]"`. That
is documented behaviour rather than a CLI limitation: sensitive environment variables are ones
*"whose values are non-readable once created"*, stored *"in an unreadable format"* ([sensitive
environment
variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables)).

**If one is lost, reissue it at the source; never try to retrieve it.**

One consequence lands on **CAN-26 Import a series from TMDB**: sensitivity is *"only possible for
environment variables in the production and preview environments"* (same page), so local work cannot
`vercel env pull` this token and needs it written into `.env.local` by hand. `.gitignore` already
covers that file.

## A sensitive variable named its SSL mode in a deprecation warning

**14 August 2026, CAN-84 A preview's composed sslmode=require silently stops verifying certificates
under pg 9.** `DATABASE_URL` is Sensitive and so cannot be read back
([above](#a-vercel-sensitive-variable-cannot-be-read-back-by-anyone)) — and production's runtime log
said what it asked for anyway. `pg-connection-string` 2.14.0 interpolates the mode it parsed into
the remedy it suggests, so this line, on `dpl_2dc2DW7jggtpBbZPDTDFoxHMbwXr` at 09:22:07 and
09:23:14 UTC, is production quoting its own connection string back:

```
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=require'
```

**All three of the project's connection strings said `require`, and Neon is why.** Asked that day
for `canoncore_app` and for `canoncore_migrator` on branch `br-morning-pine-zaakux5b`, its API
returned the same tail for both:

```
…@ep-aged-moon-zaujrwy4-pooler.c-2.eu-west-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require
```

The preview's string is composed in the repository. `DATABASE_URL` and the
`MIGRATION_DATABASE_URL` Actions secret were reissued from those two, with `sslmode` changed and
nothing else.

**Changing it changed nothing, which is why no window was needed.** Each of these was checked
against `ep-aged-moon-zaujrwy4-pooler` before either variable was written:

- `new pg.Client({ connectionString }).connectionParameters.ssl` is `{}` for `require` and for
  `verify-full` alike, and only `require` emits the warning above.
- `verify-full` connects as both roles: as `canoncore_app`, with `rolbypassrls` false and one
  `story` row visible, and as `canoncore_migrator`. `require` was checked as `canoncore_app`
  only, being the spelling both variables already held.
- `drizzle-kit migrate` reports *"Using 'pg' driver for database querying"*, so the migration path
  is this workspace's own `pg` 8.23.0 rather than a second driver with its own reading of the mode.
  Run against production's branch with `verify-full`, it applied nothing: all three journal entries
  were already recorded in `drizzle.__drizzle_migrations`.

`pg` 9 is where the two spellings diverge, and by then nothing warns at all.

**The general point is not about SSL.** A value nobody can read back is not a value nobody can
learn. A library that quotes its own input into a diagnostic publishes part of that input to
whatever reads the log, and the next one to do it may be quoting a secret rather than a setting.

## Seven Resend DNS records published two unaccounted DKIM keys

**10 August 2026, CAN-20.** The zone carried **seven** Resend records: two complete domain entries,
one for `canoncore.com` and one for `send.canoncore.com`, with two distinct DKIM public keys. All
seven were deleted and the `canoncore.com` domain entry was deleted from Resend.

**This was not tidying.** A published DKIM public key is a standing authority to sign mail as that
domain, and the only way to revoke it is to remove the record. The `canoncore.com` entry was
confirmed to belong to this account; the `send.canoncore.com` entry **did not appear in the
account's domain list at all**, so its private key was unaccounted for. Both are now revoked.
Provenance was deliberately not investigated.

## Three unscoped Resend API keys were revoked

**10 August 2026, CAN-39.** They predated CAN-20 and their scope was written down nowhere.

| Key | Id | Permission | Domain | Created | Idle since |
| --- | --- | --- | --- | --- | --- |
| `CanonCore V3` | `64ab6293-3d02-424a-9a79-54b7fb769b5d` | **Full access** | All domains | 20 March 2026 | ~April 2026 |
| `Onboarding` | `16284ada-d2da-4258-83bf-13492a2412fb` | Sending access | All domains | 27 November 2025 | ~December 2025 |
| `Onboarding` | `8e5e17c1-05bf-4ca8-824d-c03f07c5df94` | Sending access | All domains | 27 November 2025 | never used |

Read from each key's dashboard page, which is the only place those facts exist:
[`list-api-keys`](https://resend.com/docs/api-reference/api-keys/list-api-keys) returns `id`, `name`,
`created_at` and `last_used_at`, and no field for permission, domain or token.

`CanonCore V3` was the widest credential on the account, wider than either key CAN-20 issued for
production. Resend defines `full_access` as "Can create, delete, get, and update any resource"
against `sending_access`, which "Can only send emails" ([Create API
key](https://resend.com/docs/api-reference/api-keys/create-api-key)). All three were **all
domains**: the `domain_id` that would restrict a key to one domain is "only used when the
`permission` is set to `sending_access`", and neither `Onboarding` key carried one. So none was
confined to the `canoncore.com` entry, and each would have kept working against whatever domain the
account verified next.

`CanonCore V3` was created on the same day as the `canoncore.com` domain entry CAN-20 deleted, which
suggests it belonged to that setup. Inference, not investigated further.

**Read *idle since* as the last recorded use, not a lifetime total.** Each key's page reported
"Total uses: 0 times" while the list carried a last-used date whose log entry returned `Log not
found`, and the account's entire retained log was 28 entries from a single day. The reading that
fits: the timestamp is kept on the key record and the log rows are aged out. That is inference, not
documented behaviour. Either way the dates are a floor on how long each key sat unused, not proof it
was never used.

## The orphaned Resend key, and how it stopped being anonymous

**10 August 2026 — the position CAN-41 accepted.** `canoncore-legacy`, `canoncore-demo` and
`canoncore-storybook` shared a single identical `RESEND_API_KEY` belonging to **a different Resend
account**. Two independent observations:

- **It leaves no trace in this account's log.** A `GET /domains` carrying it, timed at 15:20:34Z,
  produced no log entry, while the identical call one second later on this account's own key did.
  The account logs 4xx responses, so a rejected-but-authenticated request would have appeared.
- **Its token matches none of the three revoked keys.** Ordinarily impossible; available here only
  because those projects stored the variable **non-sensitive**, so `vercel env pull` returned the
  plaintext to compare against the masked prefix each key's dashboard page showed.

**CAN-41 Account for the Resend key three older Vercel projects still carry, on an account we do not
control** was closed without acting: the owning account was never identified, no owner was told, and
the variable stayed non-sensitive on all three. The acceptance rested on the key not reaching this
account's sending path (nothing publishes a DKIM key for `canoncore.com` since the entry above),
nothing on `canoncore.com` reaching those projects, and the exposure being bounded by who can sign
in to `jacobreesnew-7380's projects` — **a bound that was never enumerated, and was the whole of the
argument.**

**13 August 2026, CAN-70 — both halves of that acceptance failed.**

**The owning account is Jacob's own.** A Mail.app search found exactly two "Welcome to Resend!"
signup messages: 27 November 2025 to `jacobreesnew@gmail.com` and 28 December 2025 to
`jacobrees@me.com`. The first is *this* account — its date matches the two `Onboarding` keys created
27 November 2025 above, its team slug `jacobreesnew` matches the quota alerts in the mailbox, and
the dashboard session confirms the signed-in email. That leaves `jacobrees@me.com` as the other.
**"Someone else's credential on someone else's account" is wrong in the way that helps**: it can be
revoked. That revocation is owned by **CAN-80 Revoke the orphaned Resend key on the jacobrees@me.com
account** and has not been done.

**Four of the five holders were deleted the same day**, read from `vercel project ls` and
`vercel env ls`:

| Project | Then | Now |
| --- | --- | --- |
| `canoncore-legacy`, `canoncore-demo`, `canoncore-storybook`, `canoncore-v3` | held `RESEND_API_KEY` non-sensitive | **deleted** |
| `waveger-archive` | held it non-sensitive | **still does**, in Development, Preview and Production |
| `canoncore-rebuild` | held it **Sensitive**, value unreadable | unchanged |

The census run first found `canoncore-v3` held a **second, different key** — two distinct
unaccounted keys, not one shared key with a fourth holder — and both probed **live** (HTTP 403,
sending scope) minutes before deletion. Neither is readable from this account any longer; both
remain live on whichever accounts own them. *(Both were revoked hours later, the second only by
elimination — CAN-80 below.)*

`canoncore-rebuild` was treated as depending on nothing, on Jacob's instruction, and the deletions
went ahead on that basis rather than on evidence.

**As of that afternoon the exposure was narrowed, not ended:** the plaintext copy readable from this
dashboard sat on one project rather than five, and the route to closing it was the revocation rather
than more project deletion.

**13 August 2026, later the same day — CAN-80 ended it.** Signed in as `jacobrees@me.com`, Resend
team `jacobrees`. All three keys on that account were deleted along with its stale
`send.canoncore.com` domain entry, and `RESEND_API_KEY` was removed from `waveger-archive` and
`canoncore-rebuild`. Read from each key's dashboard page before deletion; the last column lists the
holders actually **matched**, not every project that may have carried the key:

| Key | Id | Permission | Domain | Created | Which project held it |
| --- | --- | --- | --- | --- | --- |
| `Waveger` | `fe38d058-525c-4cec-81e5-d2f0f2b1e129` | **Full access** | All domains | 23 January 2026 | `waveger-archive` |
| `Onboarding` | `68b36760-44c5-4564-9b6a-310337df31aa` | Sending access | All domains | 28 December 2025 | `canoncore-legacy`, `canoncore-demo`, `canoncore-storybook` |
| `canoncore-rebuild-control-plane` | `a0209865-95cb-44f8-82e2-a05e22ea1b50` | Sending access | `send.canoncore.com` | 29 July 2026 | `canoncore-rebuild` |

**Each was tied to its project by a different route**, which is what closes the census above.
`Waveger` by token, against the plaintext `vercel env pull` returned from `waveger-archive`.
`Onboarding` by timestamp: its last use read `2026-08-10 15:20:34Z`, the exact second of the
`GET /domains` probe in the first bullet of this entry, so the key those three projects shared was
this one. `canoncore-rebuild-control-plane` by name and creation date against when the variable was
added — the comparison CAN-41 said could not be made for that project, made without ever reading the
Sensitive value.

**`canoncore-v3`'s separate key is revoked too, but only by elimination.** Its token went with the
project and cannot be recovered, so it was never matched. Follow the constraints and one candidate
survives: it probed at sending scope, which rules out `Waveger`, and it was a *different* key from
the shared one, which rules out `Onboarding` — leaving `canoncore-rebuild-control-plane`, which
`canoncore-v3` would then have carried alongside `canoncore-rebuild`, exactly as `Onboarding` sat on
three projects at once. That is a deduction, not an observation, and it rests on two things this
entry cannot prove outright: that every sending-scope key on the `jacobrees@me.com` account is the
two in the table, and that only two Resend accounts exist at all, which is as far as the signup
sweep above reaches.

**Which account it is, is header-level.** The 28 December 2025 welcome carries `To:` and
`Original-Recipient:` of `jacobrees@me.com`, sent `2025-12-28 22:58:55Z` — 84 seconds after that
account's `Onboarding` key (`22:57:31Z`) and 102 after its default `General` audience (`22:57:13Z`).
One signup, one welcome, one account.

**Verified dead rather than reported dead.** `Waveger` was deleted last so its plaintext could be
turned against the live API afterwards: reads return `400 API key is invalid` and a real send
attempt returns `401`. After each deletion the account's own API agreed with the dashboard, which is
a check independent of the page doing the deleting, and it ended at zero keys and zero domains.

**The verification cost the evidence.** Those probes ran before the key was deleted, so they
overwrote `Waveger`'s `last_used_at` and drove its "Total uses" to 5 — which is exactly the number
of authenticated calls CAN-80 made to it (`/domains`, `/api-keys`, `/emails`, `/audiences`,
`/broadcasts`). Neither figure survives as evidence of anything the key did before 13 August 2026,
and the key record is now deleted, so neither can be recovered.

**Nothing in the send log shows use against us**, which is weaker than "it was never used". The most
recent entry is 3 August 2026, from `no-reply@send.canoncore.com` to `.invalid` addresses, and every
visible entry is that project's own test traffic. Read that against the retention finding in the
entry above: on the other account the whole retained log was 28 entries from a single day, so a
Resend log is a floor on what happened, not a record of it. Nothing was found; that is not the same
as nothing being there.

**Independently confirmed here on 13 August 2026**, which is the half this account can see:
`vercel env ls` on both projects returns no `RESEND_API_KEY`. `waveger-archive` now holds only
`SENTRY_*`, `VITE_*` and Supabase variables; `canoncore-rebuild` holds only `BETTER_AUTH_SECRET`,
`DATABASE_URL` and `DATABASE_URL_UNPOOLED`. The deletions themselves happened on an account this
project cannot read, so *that* half rests on CAN-80's report. The death of the key does not: the
plaintext came from `waveger-archive`, readable from this account, and it is that value CAN-80 put
back to the API after deletion. Removing the variable ended the repeatability — the check stands as
made on 13 August 2026 and cannot be run again.

**Two of CAN-41's claims were wrong**, per CAN-80: it was two distinct keys rather than one shared
key, and the `waveger-archive` one carried `full_access` against all domains rather than being a
sending credential — so it was wider than the acceptance assumed. The `send.canoncore.com` domain
entry that "did not appear in the account's domain list at all" in the entry above is also explained:
it was on the other account all along.

**The trap, if this is ever re-derived:** iCloud forwards `jacobrees@me.com` to
`jacobreesnew@gmail.com`, so `me.com` mail sits in Gmail mailboxes. Mailbox location identifies the
wrong account; only `To:` / `Original-Recipient:` headers separate them.

## A Resend key that was provisioned and never worked

**18 August 2026, CAN-136 Production cannot send email: Resend refuses the API key with 401.**
Production's `RESEND_API_KEY` was set on 10 August by **CAN-20 Set up a transactional email
provider** and first exercised on 17 August by **CAN-31 Email verification and password
reset**. Every send in between was impossible and every send after it was refused, so the
variable spent eight days recorded as provisioned while authenticating nothing.

| Key | Id | Created | Last used, read 18 August |
| --- | --- | --- | --- |
| `canoncore-production`, deleted | `fe0bb980-4998-4343-9a60-f03fd607bbfd` | 10 August 2026 | **No activity** |
| `canoncore-preview` | `49af56bc-d365-4f5c-9cb1-6b85a638a2df` | 10 August 2026 | minutes earlier, by the probe below |
| `canoncore-production`, replacement | `e39e8cf5-5989-4423-a6da-9f6231c9ac94` | 18 August 2026 | minutes earlier, by the probe below |

**What it proves.** *No activity* against a key that production had been sending with all week means
the value the Production variable carried was never that key. Whether it was a wrong value or a
well-formed one with whitespace around it cannot be recovered — a Vercel Sensitive variable cannot be
read back ([above](#a-vercel-sensitive-variable-cannot-be-read-back-by-anyone)) and a Resend key
cannot be read back either, so **both ends of the comparison are write-only** and rotation is the
only available repair.

**Read the *last used* column with the caution earned by
[CAN-39 Account for the three Resend API keys that predate CAN-20, and revoke the unused
ones](#three-unscoped-resend-api-keys-were-revoked)**, which found a key page reporting "Total uses: 0 times" while the list carried a last-used date. What makes the reading above
safe is that the field was watched moving on the same account the same day: two keys went from *No
activity* to a timestamp within two to four minutes of a send. So the column updates, promptly, and a
key showing nothing after eight days of attempted sends was not being used.

**The preview key was sound, and was proved rather than assumed.** A sign-up on preview deployment
`dpl_EntBwJAznZVjYGfH5aZtkE4vPe4W` addressed to `delivered@resend.dev` logged no refusal; the same
form on the same deployment addressed to a non-simulator domain logged the guard's refusal loudly. The
negative control is what makes the silence evidence — without it, a send that was never attempted
looks exactly like one that succeeded. Confirmed directly afterwards against Resend's own send log,
which records that send as **delivered** at 05:51:38Z, id `5aa9e3e3-4be1-4802-a206-a49815e29d4e`.

**Resend's send log is the other half of the proof, and it is empty where it matters.** The account's
entire history is eight messages, and **none of them is from 17 August** — the day production
attempted the sends that failed. A rejected credential never creates a message record, so the
absence is what an authentication failure looks like from the provider's side, as against a delivery
failure, which would appear as a `bounced` row. The replacement key's own probe is in the same log as
**delivered** at 05:58:43Z, id `2d98e71a-a851-4ac1-bd54-64b61c0cceb9`.

Both readings came from the `resend` MCP, which signs in by OAuth and so can read what the two
`sending_access` keys cannot — the second, independent route to facts the dashboard had already
shown, which is why they are stated here as observations rather than inferences.

**What was already right, and is worth not "fixing".** The application logged the refusal with the
status and Resend's own slug, quoted no email address, and made the diagnosis possible in minutes.
The defect was in a credential and in what the roster check can reach, never in this code.

## Resend's published error table disagrees with its own API on 401

**18 August 2026, on CAN-136 Production cannot send email: Resend refuses the API key with 401.**
Triage of that ticket argued from Resend's
[error table](https://resend.com/docs/api-reference/errors) that an invalid key is a **403**
`invalid_api_key`, that **no `401 validation_error` row exists**, and therefore that the observed
`401 validation_error` had to be a malformed `Authorization` header rather than a rejected key — so
the fix was to inspect the value rather than rotate it. Probed directly, one bogus key against three
endpoints:

| Request | `Authorization` sent | Status | `name` |
| --- | --- | --- | --- |
| `POST /emails` | `Bearer re_thiskeydoesnotexist_…` | **`401`** | `validation_error` |
| `POST /emails` | `Bearer ` (empty) | **`401`** | `validation_error` |
| `POST /emails` | `Bearer  re_thiskeydoesnotexist_…` (stray space) | **`401`** | `validation_error` |
| `POST /emails` | header absent | `401` | `missing_api_key` |
| `GET /domains` | `Bearer re_thiskeydoesnotexist_…` | **`400`** | `validation_error` |
| `GET /emails/{id}` | `Bearer re_thiskeydoesnotexist_…` | **`400`** | `validation_error` |

**What it proves.** `401 validation_error` is exactly what Resend returns for a key it will not
accept **on `POST /emails`**, the documented table notwithstanding — so the ticket's original
diagnosis was right and the correction was wrong. **The status is endpoint-dependent and the slug is
not**: the same rejected key is a `400` on both `GET`s and a `401` on the send, while `name` stays
`validation_error` throughout. So `403 invalid_api_key`, the only row the published table offers for
this, was returned by none of them. **Scope any claim here to the endpoint it was measured on.**

**An absent header is the one case that is distinguishable**, by its own `missing_api_key` slug; a
present-but-unacceptable value is not distinguishable from a present-but-malformed one, because both
give the identical reply. That is why
[`apps/web/src/mail/send.ts`](../apps/web/src/mail/send.ts) checks well-formedness on this side
rather than hoping to read it off a response.

**The general lesson.** A vendor's published error table is a claim about its API, not the API. Where
a wrong reading would change the fix, probe it — this one cost nothing and reversed the conclusion.

## What the Sentry token was checked against

**13 August 2026, CAN-65 Create the Sentry account and issue its authentication token.**

- **The token authenticates, and routes to the US.**
  `GET /api/0/organizations/canoncore-cm/chunk-upload/` carrying it returned `200`, an upload URL of
  `https://us.sentry.io`, and an `accept` list containing `release_files`, `artifact_bundles` and
  `artifact_bundles_v2`. That is the endpoint `sentry-cli` uploads source maps through, so the scope
  is confirmed by use rather than by its name.
- **No event has ever reached the `canoncore-web` project.** Its `firstEvent` is null, which is the
  state **CAN-51 Keep a record of server errors past the hour Vercel keeps them** exists to change.

**Why the region is US rather than EU, and what it cost.** EU was the better answer for personal
data and would have kept it in Germany. Two things counted against it, both bearing on this ticket's
own acceptance criteria:

- **Org auth tokens created in EU organisations embed `sentry.io` as their region**, and
  `sentry-cli` trusts the token's embedded region over `SENTRY_URL` or `--url`
  ([getsentry/sentry#116550](https://github.com/getsentry/sentry/issues/116550)). Source-map upload
  is exactly what this token is for. That issue is closed with no fix stated.
- **The hosted MCP at `mcp.sentry.dev` documents no EU endpoint and no region setting at all** — one
  base endpoint, `https://mcp.sentry.dev/mcp`, and scoping by organisation or project slug
  ([mcp.sentry.dev](https://mcp.sentry.dev/), read 13 August 2026). The sign-in was an acceptance
  criterion, so an undocumented region was a risk to the ticket itself.

**How much personal data an error event carries is not fixed**, and is a decision for CAN-51 rather
than one CAN-65 made. `sendDefaultPii` defaults to `false`, and only enabling it *"will enable
automatic IP address collection on events"* ([Next.js
options](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/), which
also records the option as deprecated in favour of `dataCollection` from v11).

**The organisation this replaced.** A `CanonCore` organisation already existed on this account: slug
`canoncore-6u`, created 29 November 2025, **in the EU region**, holding a `javascript-nextjs`
project with real events from 30 November 2025 and an empty `javascript-react` project. Deleted 13
August 2026. **Its contents were never a factor** — it could not have been reused whatever it held,
because its region was already fixed to the EU. Deletion is scheduled rather than immediate
(*"Restoration is available until the process begins"*, read on the settings page that day), and the
slug is not free meanwhile, which is why the new organisation is `canoncore-cm`.

**Two identities can sign in, not one.** The GitHub link was added on top of a Google identity
(`jacobreesnew@gmail.com`, external id `103535281297977628385`) that predates it, and both remain
active — the user was created through Google on 29 November 2025. Both resolve to the same email,
because that address is also the sole verified email on GitHub `jacobdrees`. Removing the Google
identity is a one-click change at `/settings/account/identities/`; it is left in place only because
it was never asked to be removed.

## No event had reached Sentry when the terms disclosed it

**16 August 2026, 18:50–19:10 UTC+1, on CAN-81 Disclose Sentry's US error storage in the terms of
service.** A disclosure is only worth anything if it precedes the transfer it describes, so the state
of `canoncore-web` was read before the wording landed.

- **The project holds no issue.** `search_issues` over the hosted MCP's longest window, 90 days,
  with an empty query, returned none. The project was created on 13 August 2026
  ([entry](#what-the-sentry-token-was-checked-against)), so that window covers its whole life, and
  an error event would have created one.
- **No `@sentry/*` package is installed.** Nothing in any `package.json` in the workspace matches,
  so there is no SDK here to have sent an event.

**`firstEvent` itself was not re-read, and cannot be from this session.** The 13 August reading of
it came from the API carrying the org auth token, and that token's plaintext now exists only as a
Sensitive variable in Vercel, which nobody can read back
([entry](#a-vercel-sensitive-variable-cannot-be-read-back-by-anyone)). The hosted MCP exposes no
project-details tool either: searching its catalogue for project settings returns `update_project`,
`create_project`, `find_projects` and the team-membership pair, and `find_projects` returns slugs
alone. The two readings above are the evidence for the claim; the field is not.

**What the "no IP address" sentence rests on, and why one setting is not enough.** `sendDefaultPii:
false` withholds cookies, request bodies and user identity, but **not request headers**. Sentry's own
page is explicit: *"by default, the Sentry SDK sends HTTP request and response headers"*, and *"even
when this is disabled, IP addresses can still reach Sentry through collected HTTP headers, cookies, or
query parameters (for example, the `X-Forwarded-For` header)"*. Vercel sets that header to *"the public
IP address of the client that made the request"*
([request headers](https://vercel.com/docs/headers/request-headers)), so on this host the flag alone
leaves the address in the event. Two further readings from the same pages:

- **Per-header denial does not exist on the SDK installed today.** `requestDataIntegration`'s
  `include.headers` is a boolean (`@sentry/nextjs` 10.70.0), so today the choice is all headers or
  none, and anything finer belongs in `beforeSend`. The `{ deny: [...] }` form the docs recommend is
  `dataCollection`, which arrives in v11.
- **The v11 defaults run the other way.** `sendDefaultPii` is removed, and `dataCollection` collects
  by default: `userInfo` `true` (which populates `user.id`, `user.email`, `user.username` and
  `user.ip_address`), `cookies` `true`, `stackFrameVariables` `true`. `includeLocalVariables` is
  `false` today, so a version bump alone would start sending whatever was in scope where an error was
  thrown, and would break the identity promise as well as the IP one.

Read 16 August 2026:
[data collected](https://docs.sentry.io/platforms/javascript/guides/nextjs/data-management/data-collected/),
[options](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/)
and [RequestData](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/integrations/requestdata/).

## Nine dormant Neon projects, and the ninth was the dangerous one

**21 August 2026, on CAN-142 Four abandoned Vercel projects still hold readable Postgres
credentials.** The fourth time a ticket found a live credential in a project nobody was using, after
[three unscoped Resend keys](#three-unscoped-resend-api-keys-were-revoked) and
[the orphaned one](#the-orphaned-resend-key-and-how-it-stopped-being-anonymous) above. **No project's contents, schema or connection string was read at any
point** — the names and the sensitivity flag characterise the exposure, and reading a value moves it
into a session transcript rather than closing it.

**Five Vercel projects were removed**: `canoncore-rebuild`, `canoncore-v5`, `canoncore-v4`,
`universora`, and `minecraft`, the last unrelated tidying in the same pass. What that closed was
`DATABASE_URL` and `DATABASE_URL_UNPOOLED` stored **Non-sensitive** on `canoncore-v5` and
`canoncore-v4`, and the same pair plus a `BETTER_AUTH_SECRET` on `canoncore-rebuild`. A Sensitive
value cannot be read back by anyone; a Non-sensitive one can, so these were credentials in the
clear rather than merely credentials that existed.

**The pre-delete check ran first, and covered one of the three things it should have**: only two
domains exist on the team, `canoncore.com` and `jacobrees.co.uk`, bound to `canoncore` and
`portfolio`. Neither belonged to a project being removed, so nothing was taken down with them. The
deletion is irreversible and a domain attached to a project goes with it, which is why that check
preceded rather than followed.

**Webhooks and GitHub integrations were not checked**, and the criterion named them alongside
domains. This is recorded as not checked rather than as clean: the projects are gone, so it can no
longer be established either way, and a gap in the evidence is not the same as an absence of
attachments. **The next irreversible deletion should check all
three before it runs**, which is the only form this finding can usefully take now.

**Then nine Neon projects, where the ticket had enumerated eight.** Eight sat in the console-managed
`Jacob` organisation (`org-square-star-37689785`), which is now empty:

| Project | Id | Last compute active |
| --- | --- | --- |
| `canoncore` | `misty-term-03756384` | 4 September 2025 |
| `canoncore2` | `odd-dawn-98689199` | 4 November 2025 |
| `canoncore3` | `muddy-violet-70227714` | 15 August 2026 |
| `canoncore-v3` | `holy-sea-81644570` | 28 July 2026 |
| `canoncore-v4` | `lingering-recipe-00023196` | 1 July 2026 |
| `CanonCore` | `blue-dew-39495782` | 29 July 2026 |
| `canoncore 2026` | `lingering-flower-51555686` | 1 August 2026 |
| `twitter-media-viewer` | `rapid-feather-86600049` | 2 February 2026 |

**The ninth was in the same organisation as production, under the same name.** `fancy-night-03447155`,
named `canoncore`, sat in the Vercel-managed organisation `org-silent-cell-49503934` alongside
production's `steep-wave-52467839` — created 28 December 2025, last active 10 August 2026, the day
production was created. **A ticket that enumerates one organisation does not enumerate the estate**,
and this is the row that says so.

**Two rows reading `canoncore` in one organisation is the hazard, because the confirmation string
does not distinguish them.** Vercel's delete dialog asks for the *database slug*, which is
`canoncore` for both. What separates them is the resource id, which appears only in the page URL and
its links. Navigate by id and verify `resource_id` on the page before typing anything.

**It was proved dead on three independent signals before it was touched**: no repository file
references it, while `steep-wave-52467839` is referenced six times; `vercel integration ls --all`
showed its store bound to **no Vercel project**, where production's store is bound to `canoncore`;
and its storage size was effectively empty.

### Three platform facts this cost, and the next person will hit them

**The Neon API refuses to delete anything in a Vercel-managed organisation.** `delete_project` on
`fancy-night-03447155` returned `action restricted; reason:"organization is managed by Vercel"` with
HTTP 404. The eight in the `Jacob` organisation deleted through the same call without complaint, so
the restriction is the organisation's ownership rather than the project's state. **A Vercel-managed
Neon project can only be deleted from the Vercel side**, through *Storage → the resource → Delete
Database*, which tears down the Vercel store and the Neon project together and leaves no orphaned
store behind.

**`vercel project rm` rejects `--yes` outright** on CLI 58.7.1 (*"unknown or unexpected option"*),
and `--non-interactive` — documented as *"when an agent is detected this is the default"* — still
prompted `Are you sure? (y/N)` and then **exited 0 having deleted nothing**. Only a re-listing tells
you. Piping the answer is what worked:

```bash
printf 'y\n' | vercel project rm <name>
```

**A control reported `[disabled]` by the accessibility tree was live and clickable.** A screenshot of
the same element settled it. The tree had been read before the page finished hydrating, so `disabled`
there meant *not yet ready* rather than *not permitted* — read the rendered page before believing a
disabled control, and never conclude from a single read taken straight after a navigation.

**Verification.** Production served `HTTP 200` on three consecutive requests after the last deletion,
and `steep-wave-52467839` reported compute activity within the same minute. What the team holds now is
[`infrastructure.md`](infrastructure.md) → *The estate*.

### What this did not buy is a check, and that was decided rather than skipped

**The affordable check was real and was costed before it was refused.** `vercel project ls` and
`vercel integration ls --all` both run on the `VERCEL_TOKEN` a runner already holds, so a check in
`scripts/check-docs.ts` comparing a documented roster against them would have gated in CI for no new
credential and no new secret store — unlike the label, secret and security-settings rosters, each of
which gates locally only because reaching it from a runner costs one.

**It was refused on 21 August 2026 because detection is not what failed.** All four occurrences were
found the first time somebody looked. What cost four tickets was that each rediscovered the estate
from scratch and none left a list behind, so a check would have automated the half that already
worked while the half that failed stayed manual. [`infrastructure.md`](infrastructure.md) → *The
estate* is that list.

**What would reopen it is the register going stale**, not a fifth occurrence. A fifth found by
looking is the decision working as intended; a fifth found after the table had silently stopped
describing the estate is the failure the check would have caught, and is the trigger to revisit
this. **CAN-149 waveger and waveger-archive store readable credentials, including a live Postgres
password does not reopen it, and is not a fifth instance of this pattern** — those two projects are
in use rather than abandoned, which is the whole of what this pattern is about. It is a readable
credential found *by the register*, on the first sweep that had one, so it is the mechanism working
rather than the gap the check would have filled.

---

# DNS

## Thirteen preview branches on the sibling project, three of them billing

**Found and cleared on 21 August 2026 under CAN-144 Bound or detect the Neon bill, which the Vercel
spend cap excludes.** The `waveger` Neon project — a different product of the same owner, in the
same Vercel-managed Neon organisation and therefore on the same bill — held **thirteen branches**.
Twelve were preview branches with `creation_source: "vercel"` and `init_source: "parent-data"`,
created between 6 and 8 August by the integration's per-deployment branching, most untouched since
10 or 11 August, three of them **archived**.

**Launch includes ten branches per project, so three were billing** at $1.50 per branch-month,
prorated hourly. That is most of the gap between what `canoncore`'s own compute explained and what
Vercel's installation page charged: compute across all four computes came to about $19.2 against a
`$26.28` installation total.

**This is what [ADR-0023](adr/0023-one-shared-schema-only-preview-branch.md) spared `canoncore`**,
and the comparison is the argument. Same organisation, same plan, same fortnight: the project with
per-deployment branching switched **on** and nothing sweeping it reached thirteen branches; the
project that switched it **off** on CAN-79 had two. Nothing in the integration deletes them on a
schedule — Vercel's default deployment retention is six months, so a branch outlives the pull
request that made it by about that long.

**What was done:** preview branching switched off on the `waveger` connection first, so nothing
could recreate them, then the twelve deleted. `main` and its 39.6 MB were untouched and the
deployment still served afterwards. **The order matters** — deleting first would have left the
integration free to recreate a branch before the switch landed.

## A mis-aimed click on the add-ons page offers to enable a paid product

**21 August 2026, under CAN-144 Bound or detect the Neon bill, which the Vercel spend cap
excludes.** Turning off the `Observability Plus` add-on took two attempts. The first click, aimed at
its row by an accessibility reference, landed on the row above and opened a dialog headed
**Speed Insights** — *"Add at least one project to enable Speed Insights on"*. That product is $10
per project per month and [`infrastructure.md`](infrastructure.md) → *Hosting* records it as
deliberately off. It was cancelled, and Speed Insights was confirmed still off afterwards.

**Why it happened, and why it will happen again.** On the team billing page the add-on rows sit one
click apart, each with an unlabelled control: the checkboxes carry no `aria-label`, so a reference
resolved from the page's accessibility tree does not distinguish `Speed Insights` from
`Observability Plus`. Nothing about the click was ambiguous to the page; it was ambiguous to the
caller.

**What to do instead.** Read the row's own text back before clicking, and read the resulting
dialog's heading before confirming it — the dialog is the only place either product names itself
unambiguously. The one that turns a product *off* is headed `Turn off …` and says
*"Your team is currently utilizing …"*; the one that turns a product *on* asks for projects.

**And a second lesson from the same page.** The Build Machines section has a `Save` button that stays
**disabled** while its own selection is staged through a dialog, and a *different*, always-enabled
`Save` belongs to `Deployment Retention Policy` further down. Pressing the enabled one to "save the
build machine change" would have applied an unrelated retention change and not the intended one. The
build machine default was in fact set through its dialog's **Set as Default**, and an earlier attempt
was lost by navigating away before confirming — the same two-step shape as
[Spend Management saving in two steps](#spend-management-saves-in-two-steps-and-abandoning-the-second-discards-it).

## There is no wildcard record, and one was wrongly recorded

**10 August 2026.** An earlier revision of `docs/infrastructure.md` recorded a wildcard `* ALIAS` to
`cname.vercel-dns-017.com` and credited it for the domain cutover needing no DNS change. The zone
contains no `*` record of any type. Read from the Namecheap dashboard and confirmed against the
authoritative nameserver:

```
$ dig +short @dns1.registrar-servers.com randomprobe123.canoncore.com A
$ dig +noall +comments @dns1.registrar-servers.com randomprobe123.canoncore.com A | grep status
;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: …
```

**The correction matters in one direction only. A new subdomain does not resolve until someone adds
a record for it**, so anything assuming a hostname is already live — a preview alias, a sending
subdomain, a future service — has to add its own. Why the cutover needed no change is not
established by this observation and is no longer claimed.

## The `demo` CNAME dangled at a deleted project

**13 August 2026, CAN-70.** `canoncore-demo` was deleted earlier the same day, which left
`demo.canoncore.com` pointing at `bc3b9806163bfed9.vercel-dns-017.com.` with no Vercel project
claiming the hostname — the classic setup for a subdomain takeover, since anyone who could claim
that name at Vercel would serve under `demo.canoncore.com`. The record was removed and verified gone
from the authoritative nameserver the same day.

**Releasing it mattered beyond tidiness**: while it was live a stranger could reach the old product
on the domain that serves v1, putting it in scope for the Online Safety Act obligations in **CAN-21
Write the Online Safety Act documents and establish the reporting address**. `demo.canoncore.com`
now returns 404.

**What happened to the CAA records CAN-18 recorded** (`pki.goog`, `sectigo.com`) was never
established — the zone inventory taken by CAN-20 already listed none — but they could not have been
right for this stack: had they existed, certificate issuance for `www.canoncore.com` would have
failed until `letsencrypt.org` was allowed.

## The apex `google-site-verification` TXT is ours

**13 August 2026, CAN-70.** The audit flagged it as a standing proof-of-control of unknown origin.
It verifies the Search Console domain property `sc-domain:canoncore.com` on Jacob's
`jacobreesnew@gmail.com` account, added 30 November 2025, method "Domain name provider".

That method is a DNS record, and it is the only one a domain property accepts: Google lists the DNS
record as "required only for Domain property (example.com) not URL-prefix properties", and confines
file upload, HTML tag, Analytics and Tag Manager to URL-prefix properties ([Verify your site
ownership](https://support.google.com/webmasters/answer/9008080)). The zone holds exactly one such
token while the property still reads "Successfully verified", so the token is that property's.
**Removing it would unverify the property.**

## The delivered test message passed all three checks

**10 August 2026, CAN-20.** The test send from `noreply@mail.canoncore.com` was found in `INBOX` on
the `jacobrees@me.com` account, which is the one carrying `jacobrees@icloud.com`. Headers as
delivered:

```
Authentication-Results: dmarc.icloud.com;        dmarc=pass header.from=mail.canoncore.com
Authentication-Results: dkim-verifier.icloud.com; dkim=pass header.d=mail.canoncore.com
Authentication-Results: spf.icloud.com;           spf=pass  smtp.mailfrom=…@send.mail.canoncore.com
Dkim-Signature: s=resend; d=mail.canoncore.com
Return-Path:    <…@send.mail.canoncore.com>
X-Dmarc-Info:   pass=pass; dmarc-policy=none; pdomain=canoncore.com
X-Apple-Movetofolder: INBOX
```

All three pass and the DKIM signature is `d=mail.canoncore.com`, so alignment is on the sending
domain rather than on Amazon's. `pdomain=canoncore.com` confirms the DMARC reporting address sits
inside the Organizational Domain the RFC's test uses.

The bounce and complaint paths **CAN-31 Send verification and reset emails** needs were proven the
same day: sends to `bounced@resend.dev` and `complained@resend.dev` returned Resend statuses
`bounced` and `complained`.

**One thing worth knowing before DMARC is tightened:** `bimi=skipped reason="insufficient dmarc"`.
BIMI needs a policy of `quarantine` or `reject`, so it is unavailable while the policy is `p=none`.
A consequence of the policy choice, not a fault.
