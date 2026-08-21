# Choosing what to dispatch next

Why this repository dispatches the lanes it does, how many may run at once, and what to do when the
board is full. Commissioned by **CAN-159 Choose the next lanes by gate then order, and record what
actually bounds how many run**, which exists because
[CAN-131 Research where this repository and Orca do not meet, and settle the worktree workflow](https://linear.app/jacobrees-canoncore/issue/CAN-131)
named *"how a batch is chosen"* as one of four things the documents did not carry, and it is the one
that never landed.

**Findings, not decisions.** The procedure this evidence produced is the `/next-lanes` skill in
[`.claude/skills/next-lanes/`](../../.claude/skills/next-lanes/SKILL.md); the standing policy on
what a batch must be is [`../agents/workflow.md`](../agents/workflow.md) → *A batch is independent in
git, and coupled through the platform*. Where this file and either of those disagree, they win and
this is out of date.

## The short answer, and the one thing that surprised

**No published source gives a safe number of concurrent agents.** Not Anthropic, not Orca, not any
vendor, not the peer-reviewed literature. Every number in circulation is either a plan limit, an
illustration, or advice with nothing measured under it. So **the ceiling this repository uses is
policy rather than a derived truth**, and it is written down as such.

**What does predict trouble is coupling, and coupling is measurable.** The largest study of
predictive factors puts "the two changes touched a common application slice" at an odds ratio of
**6.13** and "how long the branch lived" at **1.04-1.09**. The count of branches is not the variable;
what they overlap in is.

**And the coupling that matters here is not in the code.** Measured over this repository's own
merges, two changes share a document far more often than they share a source file — 58.9% against
28.0%, with [`../infrastructure.md`](../infrastructure.md) alone in 62% of every merge. That is the
opposite of where a reviewer's attention goes, and it is the class the published literature has never
studied.

## 1. Nobody publishes a safe number

### Orca states none, and says so

Read against **Orca 1.4.186**, its shipped bundle rather than its marketing. Orca's own guide:

> "Agents still choose placement and concurrency; Orca does not schedule workers or infer conflicts."

Checked five ways. All 229 commands (`orca agent-context --json`) contain one match for `concurren`:
a `--max-concurrent` flag on `orchestration coordinator-start`, which is **retired and performs no
effects**. The shipped bundle has zero hits for `maxConcurrent`, `concurrencyLimit`, `worktreeLimit`
or `MAX_WORKTREES`. The only number Orca publishes is `--limit 200`, which is pagination.

**There is no version flag.** `orca --version` prints the help and exits 0; the version is readable
only from `orca status --json` → `result.runtime.appVersion`, which needs a running runtime.

### Anthropic's only number is for a different architecture

> "There's no hard limit on the number of teammates, but practical constraints apply… Start with 3-5
> teammates for most workflows. This balances parallel work with manageable coordination. If you have
> 15 independent tasks, 3 teammates is a good starting point."
> — [Claude Code docs, *Orchestrate teams of Claude Code sessions*](https://code.claude.com/docs/en/agent-teams)

**No measurement, study or benchmark is cited for it anywhere in Anthropic's documentation**, and it
describes agent teammates sharing one checkout and a message bus, which is not what a lane is. The
same page says so: *"Agent teams don't isolate teammates in worktrees, so partition the work so each
teammate owns a different set of files."*

The largest documented fan-out is the opposite shape and still not a recommendation to run N features
at once: *"`/batch` is a skill that has Claude split **one large change** into 5 to 30
worktree-isolated subagents that each open a pull request"*
([*Run agents in parallel*](https://code.claude.com/docs/en/agents), emphasis added).

### What bounded Anthropic's own largest run was not the count

> "Having 16 agents running didn't help because each was stuck solving the same task."

The fix was re-partitioning the work, not changing the agent count.

### Numbers in circulation whose source does not exist

- **"MultiDevin: 1 manager and up to 10 workers."** Cognition's own post does not state it. Unverified.
- **"Cursor supports 4 subagents in parallel."** Not in Cursor's documentation, which states no hard
  limit. The confirmed first-party Cursor number is **eight** agents on a single prompt, a different
  feature.
- **A maximum number of concurrent Claude Code worktree sessions.** No such number exists in any
  Anthropic documentation. Any figure quoted for it is not Anthropic's.

## 2. What actually predicts a conflict

### Coupling, strongly. Duration, barely. Size, not at all

**Dias, Borba, Barreto, *Understanding predictive factors for merge conflicts*, Information and
Software Technology 121 (2020).** 73,504 merge scenarios across 125 GitHub projects. Logistic
regression odds ratios:

| Factor | Odds ratio |
| --- | --- |
| Changes to a common slice (related model, view and controller files) | **6.13** |
| Number of commits | 3.55 |
| Number of changed files | 3.27 |
| **Duration of the contribution** | **1.04-1.09** |
| Number of changed lines | 0.99 (not significant) |

> "We find evidence that the likelihood of merge conflict occurrence significantly increases when
> contributions to be merged are not modular in the sense that they involve files from the same MVC
> slice (related model, view, and controller files)."

Their recommendation is almost the procedure this file exists to write:

> "managers of MVC projects should consider aligning the structure of development tasks with the
> structure of the associated application MVC slices, and **avoid the parallel execution of tasks
> that focus on common slices**."

**Leßenich, Siegmund, Apel, Kästner, Hunsen, *Indicators for merge conflicts in the wild*, Automated
Software Engineering 25(2), 2018.** 163 projects, 21,488 merge scenarios. They asked 41 developers
which indicators they believed in, then tested them:

> "A notable (negative) result is that none of the 7 indicators suggested by the participants of the
> developer survey has a predictive power concerning the frequency of merge conflicts."

> "the model is significant (p<0.05), but the adjusted R2 is 0.04, meaning that 4% of the variance in
> the merge conflicts can be explained by the model."

Their conclusion is the reason section 3 of this file exists at all:

> "These results suggest that indicators are not (or cannot be) project-independent, leading naturally
> to the question of how to come up with project-specific or, possibly, domain-specific indicators."

They give two outliers worth carrying: one scenario changed 927 files in both branches and produced
**zero** conflicts; another changed 5 files and produced **54**, because both branches renamed the
same parameters differently.

### A third of conflicts are invisible to git

**Brun, Holmes, Ernst, Notkin, *Proactive Detection of Collaboration Conflicts*, ESEC/FSE 2011.**
Nine systems, 3.4 million lines, 550,000 versions.

> "(2) that 16% of all merges required human effort to resolve textual conflicts, (3) that 33% of
> merges that were reported to contain no textual conflicts by the VCS in fact contained higher-order
> conflicts, and (4) that conflicts persist, on average, for 10 days."

The counterfactual is the number closest to a lane:

> "Figure 5 considers every commit at which developers who did eventually merge their changes could
> have done so earlier. On average, 19% of the potential merges would have resulted in a textual
> conflict."

**Base rate, across all of the above: roughly 10-20% of pairs of concurrent branches conflict
textually, with project-to-project variance from 0.9% to 54.5%.** And a third of what does break is
not textual at all, so a clean merge is not evidence of a clean result.

### Git isolation is file isolation only

Claude Code's own worktrees page, under *What worktrees share with the main checkout*:

> "A worktree gets its own files and branch, but it shares the repository's `.git` directory,
> project-scope plugins, and saved permission approvals with the main checkout… choosing 'Yes, and
> don't ask again' for a Bash command in a worktree session saves the rule to the main checkout's
> `.claude/settings.local.json`, so it applies in the main checkout and in every other worktree."

**A permission granted by one lane applies to every other lane**, which is a cross-lane channel
documented by the vendor. Git's own manual adds that `refs/`, the repository config and submodules
are shared, so branch names and tags are one namespace across every lane.

This repository already knows the platform half of that lesson and paid for it:
[`../incidents.md`](../incidents.md) → *A concurrent lane reddened `main`, and the merge that failed
had not caused it*.

## 3. This repository's own indicator

Leßenich et al. say the indicator has to be derived per project. This is that derivation, over the
**60 first-parent commits ending at `7a9c672`, read on 21 August 2026** — one per squash-merged pull
request — taking every pair of changes and asking whether they touched at least one file in common.

**The window is pinned to a commit on purpose.** "The last 60 merges" is a moving window, and this
repository merges fast enough that the figures below were already stale by five merges within an hour
of first being taken. Re-derive them rather than trusting them; the shape has held, the decimals have
not.

| Population | Changes | Pairs | Pairs sharing at least one file |
| --- | --- | --- | --- |
| All files | 60 | 1,770 | **1,044 (59.0%)** |
| Documents only (`.md`) | 59 | 1,711 | 1,008 (58.9%) |
| Code only (no `.md`) | 38 | 703 | 197 (28.0%) |

**File overlap is exposure, not a conflict.** Two changes can touch one file in different places and
merge cleanly. Dias et al. measure textual conflicts in 10.0-13.4% of scenarios, and Leßenich et al.
found "files changed by both branches" correlates only 0.40 with conflict count and rejected it as a
predictor. So 59.0% is the rate at which two changes here *have the opportunity* to collide, and is
deliberately not quoted as a conflict rate.

### The collision surface is documentation, and it is concentrated

Of those 1,044 colliding pairs, by the file that alone accounts for them:

| File | Colliding pairs | Touched in |
| --- | --- | --- |
| [`../infrastructure.md`](../infrastructure.md) | 666 | 37 of 60 merges (62%) |
| [`../agents/workflow.md`](../agents/workflow.md) | 465 | 31 of 60 (52%) |
| [`../incidents.md`](../incidents.md) | 120 | 16 of 60 (27%) |
| [`../../CLAUDE.md`](../../CLAUDE.md) | 91 | 14 of 60 (23%) |
| [`../../scripts/lib/doc-checks.ts`](../../scripts/lib/doc-checks.ts) | 78 | 13 of 60 (22%) |
| [`../../scripts/check-docs.ts`](../../scripts/check-docs.ts) | 78 | 13 of 60 (22%) |

**Two lanes here are far more likely to meet in a document than in code**, and no published study
covers that class — see *What could not be established*.

### The platform classes, which git cannot see at all

Several of `check-docs`'s checks read a live source rather than the working tree, so a lane changing
one is independent of nothing. **The count is deliberately not repeated here** — it was six when the
incident below was written and the table has grown since, so the table is the only honest answer.
[`../agents/workflow.md`](../agents/workflow.md) → *The gates* holds the table that decides the blast
radius; the short version is that provisioning a Vercel variable, editing `main`'s ruleset or
rotating the release token reddens **every other lane's gate and `main`'s own release**, while a
secret, a label or a security setting reddens a local run only.

A lane that changes shared platform state is sequenced alone. That is not new policy — it is
[`../agents/workflow.md`](../agents/workflow.md) → *A batch is independent in git, and coupled through
the platform*, and this file is only naming which candidates trip it.

## 4. The constraint is review, and everything else subordinates to it

Goldratt's third focusing step is *subordinate everything else to the constraint*: supplying a
non-constraint beyond what the constraint can consume does not raise output, because *"the overall
system's performance is sealed"*. **A free worktree is not capacity if the thing that is full is the
review.**

What one reviewer's capacity actually measures, from the largest published study of code review —
**Sadowski, Söderberg, Church, Sipko, Bacchelli, *Modern Code Review: A Case Study at Google*,
ICSE-SEIP 2018**, about nine million reviewed changes:

> "the median for changes reviewed by developers per week is 4, and 80 percent of reviewers review
> fewer than 10 changes a week."

> "developers spend an average of 3.2 (median 2.6 hours a week) reviewing changes."

> "At Google, over 35% of the changes under consideration modify only a single file and about 90%
> modify fewer than 10 files… the median number of lines modified is 24."

Merged pull requests here have a median of **7 files changed**, p90 of 19 — at or above the size at
which Google's measured review latency starts to climb, and against a review population of one.

**None of this section is implemented, and that is deliberate.** The ceiling is a count of lanes, not
a measure of review capacity, because nothing available measures the latter: this repository's own
pull request timings are confounded by merges held back by hand, and no published study measures a
solo reviewer against agent-authored pull requests at all. It is recorded as the thing to act on if a
measure ever exists. Findings are not decisions.

**Reinertsen's W21 says to put the constraint where the queue is most expensive:** *"Constrain WIP in
the section of the system where the queue is most expensive."* For a solo developer dispatching
agents, the expensive queue is the one in front of the human, not the one in front of the machine.

The denominator of any ratio should therefore be **constraint time, not wall-clock**: Reinertsen asks
for cost of delay "per unit of scarce resource consumed", and Theory of Constraints for "throughput
per constraint minute". A two-hour lane costing five minutes of review is cheap; a thirty-minute lane
needing an hour of review is expensive. Lanes run in parallel; the review does not.

## 5. What flow theory does and does not license

**Little's Law is an identity, not a mechanism.** Little's 1961 statement requires strict
stationarity; his 2011 finite-window theorem works only because it *redefines* the waiting term. Whitt
states flatly that "Little's law typically does not apply exactly" under finite measurement. It says
raising WIP raises cycle time **only if throughput is held fixed**, and it supplies no reason why.

**The utilisation curve has no knee.** The exact M/M/1 result is W/S = 1/(1−ρ) — a smooth hyperbola
with no special point on it. **"Keep utilisation at 60-80%" is folklore**: no target percentage
appears anywhere in Reinertsen's 175 principles. What is real is the marginal cost, which is one
extra point of load costing 0.25 service times at 80% and 4 at 95%.

Reinertsen's actual instruction is the opposite of a utilisation target:

> "Q13: The First Queue Size Control Principle: **Don't control capacity utilization, control queue
> size.** (p.75)"
> "Q14: The Second Queue Size Control Principle: Don't control cycle time, control queue size. (p.76)"
> "Q3: The Principle of Queueing Capacity Utilization: Capacity utilization increases queues
> exponentially. (p.59)"

**And no source gives a formula for a WIP limit.** The Kanban Guide (v2025.5) requires that a limit
exist and be explicit, gives no number, and became deliberately *less* prescriptive in 2025. The only
stated procedure found in a primary source is Anderson's:

> "**The WIP limit established for the first time should be set slightly higher than the average
> WIP.**… **You should adjust the WIP limit empirically**; it should be a topic of discussion at
> Service Delivery Reviews until a stable value has been realized."

### The DORA number, stated accurately

The sentence usually cited for "fewer than three branches" is real, and weaker than its reputation.
The 2016 State of DevOps report says **"less than three active branches in total"** (so two or fewer);
dora.dev today says **"three or fewer"** (so three) — **DORA has silently loosened its own finding by
one branch.** It is a snowball-sampled, self-reported, cross-sectional survey of roughly 4,600
practitioners in *organisations*, analysed by PLS-SEM. It is a correlation from a survey, not a
prescription, and **it was never measured on one person's parallel agent lanes.**

DORA's batch-size guidance is firmer and more useful: any batch taking "longer than a week" is too big.
Lanes here take about two hours, so this repository is nowhere near that wall.

## 6. Gate first, order second

Every source treats eligibility and priority as different questions, and answers them in that order.

**The gate.**

- **Capacity.** The Kanban Guide makes this the only trigger: *"start work on an item (pull or select)
  only when there is a clear signal that there is capacity to do so."*
- **Size.** Scrum's single readiness test is a size test; DORA's is sharper, as above.
- **Predecessors.** Precedence is a hard feasibility constraint, never a scoring input.

**Definition of Ready is not Scrum's.** The Scrum Guide contains the phrase zero times and the word
"ready" once. Whatever a readiness label means, it is the team's policy, which is what
[`../agents/triage-labels.md`](../agents/triage-labels.md) already makes `ready-for-agent` here.

**What to do at the ceiling has named policies**, and they are not "push anyway":

| Policy | Source |
| --- | --- |
| Block all new starts | Reinertsen W6, p. 151: "Block all demand when WIP reaches its upper limit." |
| Throttle as you approach it | Reinertsen W17, p. 161: "Increase throttling as you approach the queue limit." |
| Swarm the emerging queue | Reinertsen W9, p. 153: "Quickly apply extra resources to an emerging queue." |
| Watch age, not only count | Reinertsen W15, p. 159: "Watch the outliers." |
| Pre-plan escalation | Reinertsen W16, p. 160: "Create a preplanned escalation process for outliers." |
| Adapt the limit when capacity changes | Reinertsen W19, p. 162: "Adjust WIP constraints as capacity changes." |

**"Stop starting, start finishing" could not be sourced.** It appears in neither the Kanban Guide
v2025.5 nor Anderson's principles. Its substance is carried by the Guide's pull rule and by W6, and
it is cited here as those rather than as itself.

## 7. Ordering, and what is computable here

### The theorem under WSJF, and why it does not survive the trip

**Smith's ratio rule** (W. E. Smith, 1956), stated as Theorem 4.1 of *Elements of Scheduling*:

> "A sequence is optimal for 1‖∑w_j C_j if and only if it places the jobs in order of nonincreasing
> ratios w_j/p_j."

That is CD3 and WSJF, and the mapping is literal. Its assumptions are **one machine, no precedence
constraints, all jobs available at time zero, non-preemptive**. Break any one and optimality is gone
provably: `1|r_j|∑C_j` is strongly NP-hard with release dates alone, `1|prec|∑w_j C_j` is strongly
NP-hard with precedence, and parallel machines break it separately.

**Dispatching to several lanes over a `blocks` graph breaks three of the four.** The ratio rule is a
heuristic here, not a theorem. **SAFe's WSJF does not inherit the proof either** — its numerator adds
three non-commensurable Fibonacci ranks, which is not a rate.

### The right way to treat a blocked ticket is bundling

**Sidney decomposition** (J. B. Sidney, 1975), Theorem 4.18 of the same text:

> "A subset I ⊆ N that contains all its predecessors under the precedence constraints is said to be an
> **initial set**… Let I be a ratio-maximal initial set of N. There exists an optimal sequence of N
> that schedules the jobs in I before all remaining jobs."

Read operationally: **when a valuable ticket is blocked, do not score its blocker on its own merits
and do not score it by how many things it unblocks. Score the bundle** — blocker plus what it unblocks
— as one composite, and compare composites. Finding such a set is polynomial, and any sequence
consistent with a Sidney decomposition is a **2-approximation**, which is the best constant guarantee
known.

### "Unblocks the most" is a real rule, optimising the wrong thing

It is **MTS** (most total successors), Alvarez-Valdés & Tamarit 1989, selecting the activity that
maximises the count of transitive successors. Three qualifications:

1. **MTS optimises makespan, not value.** It is right for "finish the whole set soonest" and wrong for
   "realise value soonest".
2. **It is not the empirical winner even for makespan** — Kolisch & Hartmann's benchmarks put
   latest-finish-time rules ahead of it.
3. Single-pass priority rules are generally mediocre against metaheuristics.

**Makespan is nonetheless the honest objective for the `v1` band**, because that band ends at a single
event rather than accruing value per ticket: it is finished when the URL is shared
([`../agents/issue-tracker.md`](../agents/issue-tracker.md) → *The three bands*). So MTS is the right
family there, and its weakness is disclosed rather than hidden. LFT would be better and needs
durations, which do not exist — below.

### What the tracker can and cannot supply

Live read of all 153 issues on team `CAN`, 21 August 2026:

- **`priority` is `0` on every open issue.**
- **`estimate` is `null` on every open issue.**
- **`dueDate` is `null` on every open issue.**

**So the ratio rule cannot be computed here at all** — there is no cost of delay and no duration, and
inventing either would be worse than not having it. What exists is the band, the state role label, the
workflow state, and the `blocks` graph. The band is therefore doing the work a cost-of-delay figure
would do, as an ordinal, which is exactly the documented qualitative substitute when no currency
figure is available.

**Acceptance-criteria count was tested as a size proxy and rejected.** Ten of 41 open issues carry no
checkbox list, and at least one of them, **CAN-145 Give the Provider provisioning a report-only mode,
and something that runs it**, is fully specified in prose. The count measures ticket format, not size.

**And Lawler's exactly-solvable case does not apply.** If the `blocks` graph were series-parallel —
chains and independent groups, no diamonds — optimal ordering would be an O(n log n) sort. This graph
has **11 diamonds** over the open `v1` and `Readiness` tickets. **CAN-28 Author an Ordering by hand**,
**CAN-30 GDPR export and erasure** and **CAN-32 Roles, takedown, and the Online Safety Act surfaces**
all reach **CAN-57 Make a public Ordering discoverable and shareable**, while all three descend from
**CAN-27 Orderings and Placements, and the imported broadcast Ordering**.

**One traversal rule follows from the tracker's own shape.** `Later` is a single chain in which each
ticket is `blocked-by` the one before it, and
[`../agents/issue-tracker.md`](../agents/issue-tracker.md) → *`Later` is a work queue, not a dependency
graph* says most of those links are a chosen order rather than a real dependency. **Leverage must not
be counted through a `Later` ticket**: doing so makes the queue's own order masquerade as leverage and
scores **CAN-94 Re-derive ADR-0009's fallback from the completed source set** at 12 when it unblocks
nothing outside the queue.

## 8. What Orca can be asked, and what it cannot

One call answers the board: `orca worktree ps --json`. **`--json` is mandatory** — the human form omits
status entirely.

- **Agent state** is a closed four: `working`, `blocked`, `waiting`, `done`.
- **Worktree status** is five: `inactive`, `active`, `done`, `working`, `permission`.
- A lane **stalled on a permission prompt** reads `status: "permission"` with `unread: true` and
  `toolName: "AskUserQuestion"`.
- A lane whose agent has **finished** reads `status: "active"` with the agent's `state: "done"` — never
  `status: "done"`.
- A **closed-out** lane has an `agents` array of length zero. The key itself is always present, so a
  test written as `has("agents")` never fires; test the length.

**It cannot be asked** the question a blocked lane is asking (`interactivePrompt` is dropped from
`ps`), any git dirty or ahead-behind state, or any event at all: there is no watch or subscribe verb
anywhere in the CLI, so supervision is polling. Staleness must be computed by the caller, because
`state` never times out and worktree status decays only after 30 minutes.

## What could not be established

1. **A safe number of concurrent agents.** No vendor, no study, no first-party engineering source
   publishes one, nor any relationship between agent count and defect rate, rework or review quality.
   Every number in circulation is a plan limit, an illustration, or unmeasured advice. *This is why the
   ceiling is policy.*
2. **How conflict probability scales with N concurrent branches.** Every study found measures **pairs**.
   None measures the rate as a function of how many branches are open at once. The literature has not
   asked the question.
3. **Whether a given number of lanes degrades review quality.** DORA hypothesises the mechanism and
   labels it a hypothesis. The measured results are about *change size*, not reviewer queue depth.
   Nothing measures a solo reviewer facing agent-authored pull requests at all.
4. **Shared-documentation conflicts.** No study or vendor documentation found — which is notable, since
   section 3 shows that is where this repository's collisions actually live.
5. **Migration ordering, lockfile and snapshot conflicts under concurrency.** Nothing quantifies these.
   The studies classify conflicts by file type rather than by semantic class.
6. **Whether file overlap here ever became a conflict.** Measuring it needs the pre-merge branch tips,
   and squash-merge plus branch deletion has destroyed them.
7. **Lane cycle time as a distribution.** Orca keeps `createdAt` only for live worktrees, so removed
   lanes leave no start time and the thirteen lanes of 16-17 August are gone. The three readable on
   21 August took 125, 119 and 127 minutes dispatch-to-merge, which is one batch on one day.
8. **Anything about review latency under load in this repository.** Pull request open-to-merge times
   vary by day here, but merges have been held by hand — on 17 August because one lane had provisioned
   a Vercel variable that reddened the others' gates — so those timestamps measure decisions rather
   than a queue. Measured, then discarded as confounded.
9. **Weinberg's 20%-per-task-switch figure**, repeated everywhere. The page could not be read from any
   legitimate source, and Reinertsen's own writing rejects treating switching cost as fixed.
10. **Goldratt's drum-buffer-rope in his own words.** Every route to the primary text was blocked, so
    section 4 leans on peer-reviewed secondary statements and says so here.
