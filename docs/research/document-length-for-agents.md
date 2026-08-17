# How long is too long for a document an agent reads

**Researched 2026-08-13.** The question: are this repository's documents too long, and what does
current first-party guidance and published research actually say about length in documents that an
AI agent consumes?

**What was read.** Every claim below was taken from the page or paper that owns it, on that date:
`code.claude.com/docs` (memory, best-practices, features-overview, skills),
`platform.claude.com/docs` (skill authoring best practices), Anthropic's engineering blog (*Effective
context engineering for AI agents*, *Equipping agents for the real world with Agent Skills*), the
`AGENTS.md` specification at `agents.md`, Chroma's *Context Rot* technical report, and four papers
on arXiv. No Medium post, Dev.to article or summary blog was used, and where a claim exists only
second-hand it is marked **unverified**. The repository side was measured directly with `wc`,
`grep` and `find` against the working tree at commit `8706527`. Citation density throughout is
occurrences of `https?://` per thousand words, and table density is lines beginning `|`; both are
reproducible with `grep -o 'https\?://' FILE | wc -l` and `grep -c '^|' FILE`.

> **Exclusion note.** Per this repository's standing constraint, no earlier CanonCore or Universora
> repository was read, fetched, searched for or quoted. Nothing in the research required one and no
> such result surfaced.

## Contents

- [The answer](#the-answer)
- [Word count is the wrong unit, and the right one is not directly measurable here](#word-count-is-the-wrong-unit-and-the-right-one-is-not-directly-measurable-here)
- [Two cost profiles, and only one of them has a published limit](#two-cost-profiles-and-only-one-of-them-has-a-published-limit)
  - [Always loaded: the number is 200 lines, and it is stated three times](#always-loaded-the-number-is-200-lines-and-it-is-stated-three-times)
  - [Read on demand: there is no published length limit, and the guidance is the opposite](#read-on-demand-there-is-no-published-length-limit-and-the-guidance-is-the-opposite)
- [What the degradation research actually shows](#what-the-degradation-research-actually-shows)
  - [Where the evidence does not support the popular claim](#where-the-evidence-does-not-support-the-popular-claim)
- [The files, one at a time](#the-files-one-at-a-time)
  - [`CLAUDE.md` — over the only limit that applies to it](#claudemd--over-the-only-limit-that-applies-to-it)
  - [`docs/agents/workflow.md` — long because it repeats itself, and that is already ticketed](#docsagentsworkflowmd--long-because-it-repeats-itself-and-that-is-already-ticketed)
  - [`docs/infrastructure.md` — long and earning it, with one structural fault](#docsinfrastructuremd--long-and-earning-it-with-one-structural-fault)
  - [`docs/research/agentic-workflow-setup.md` and `docs/research/external-metadata-sources.md` — fine](#docsresearchagentic-workflow-setupmd-and-docsresearchexternal-metadata-sourcesmd--fine)
- [Length here is a ratchet, and that matters more than any single measurement](#length-here-is-a-ratchet-and-that-matters-more-than-any-single-measurement)
- [What was actually done, 13 August 2026](#what-was-actually-done-13-august-2026)
- [What to do](#what-to-do)
- [Unverified](#unverified)

## The answer

**Only one of the five files is too long by any published standard, and it is the smallest one.**

| File | Always loaded? | Verdict |
| --- | --- | --- |
| `CLAUDE.md` — 2,501 words, 275 lines | **Yes, every request** | **Over.** 275 lines against Anthropic's documented 200-line target, stated three times in three first-party places. This is the only file with a published number to fail against |
| `docs/agents/workflow.md` — 6,130 words | No, but on the critical path of every landing | **Long, and the length is a symptom.** Roughly a dozen named duplication families, already diagnosed. Deduplicating it is the fix; a word target is not |
| `docs/infrastructure.md` — 10,464 words | No | **Long and earning it.** 5.0 external citations and 15.1 table rows per thousand words. Dense register, near-zero padding. The problem is that it mixes a register with an evidence archive, not that it has too many facts |
| `docs/research/agentic-workflow-setup.md` — 12,245 words | No, read on demand | **Fine.** Anthropic's own guidance for on-demand reference is *"no context penalty until accessed"* and *"bundle comprehensive resources"*. There is no published length limit for this class of document |
| `docs/research/external-metadata-sources.md` — 9,981 words | No, read on demand | **Fine**, same reasoning. 9.1 citations per thousand words is the highest density in the repository |

**Three actions follow, in order of evidence strength.** Trim `CLAUDE.md` to the documented 200
lines. Deduplicate `workflow.md`, which
**[CAN-76](https://linear.app/jacobrees-canoncore/issue/CAN-76) Restructure the agent documents:
policy, procedure and incidents get their own homes** already specifies. Add a table of contents to
every reference file over 100 lines, which is the one piece of published guidance that applies to
long read-on-demand documents and which none of these four files follows.

**Leave the research files alone.** The worry that they are too long is not supported by any
first-party guidance or by any published finding, and cutting them would trade verified evidence
for a saving that is only paid when the file is read.

## Word count is the wrong unit, and the right one is not directly measurable here

What costs anything is tokens in the context window, not words on disk. Neither `tiktoken` nor an
Anthropic API key was available in this environment, so **every token figure below is an estimate**
by two independent methods, both stated so the error bars are visible:

- **characters ÷ 3.8**, the conventional ratio for English prose in a byte-pair tokeniser
- **words × 1.4**, the ratio given in this research's brief

Claude's tokeniser is not published, so neither can be verified here; treat these as bracketing
rather than as measurements. Markdown tables, code fences and URLs all tokenise worse than prose,
so for the table-heavy files the higher estimate is likelier to be right.

| File | Chars | Words | Lines | ~tokens (chars÷3.8) | ~tokens (words×1.4) |
| --- | --- | --- | --- | --- | --- |
| `CLAUDE.md` | 16,810 | 2,501 | 275 | 4,424 | 3,501 |
| `CODING_STANDARDS.md` | 3,484 | 498 | 59 | 916 | 697 |
| `CONTEXT.md` | 10,968 | 1,737 | 238 | 2,886 | 2,431 |
| `docs/agents/workflow.md` | 37,755 | 6,130 | 624 | 9,935 | 8,582 |
| `docs/agents/issue-tracker.md` | 15,706 | 2,434 | 251 | 4,133 | 3,407 |
| `docs/infrastructure.md` | 69,157 | 10,464 | 1,081 | 18,199 | 14,650 |
| `docs/research/agentic-workflow-setup.md` | 82,553 | 12,245 | 1,041 | 21,724 | 17,143 |
| `docs/research/external-metadata-sources.md` | 71,638 | 9,981 | 1,225 | 18,852 | 13,973 |

**What is actually loaded on every request is `CLAUDE.md` and nothing else in this table.** That was
checked rather than assumed: `CLAUDE.md` contains no `@path` imports (its three `@` occurrences are
`@canoncore/web` and `@repo/*` inside backticks, which the import parser skips —
[memory](https://code.claude.com/docs/en/memory)), there is no `.claude/rules/` directory, and
`CODING_STANDARDS.md`, `CONTEXT.md`, `docs/agents/*` and `docs/research/*` are reached only by
pointer. So the standing per-request tax from this repository is roughly **3,500–4,400 tokens**,
plus the four project skills' descriptions, three of which carry `disable-model-invocation: true`
and therefore cost **zero** until invoked
([features overview](https://code.claude.com/docs/en/features-overview)).

## Two cost profiles, and only one of them has a published limit

### Always loaded: the number is 200 lines, and it is stated three times

Anthropic gives a figure for `CLAUDE.md` in three separate first-party places, each time as a
threshold rather than a style note:

> **Size**: target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce
> adherence.
> — [memory](https://code.claude.com/docs/en/memory)

> **Rule of thumb:** Keep CLAUDE.md under 200 lines. If it's growing, move reference content to
> skills or split into `.claude/rules/` files.
> — [features overview](https://code.claude.com/docs/en/features-overview)

> Keep it concise. For each line, ask: *"Would removing this cause Claude to make mistakes?"* If not,
> cut it. Bloated CLAUDE.md files cause Claude to ignore your actual instructions!
> — [best practices](https://code.claude.com/docs/en/best-practices)

The failure mode is named explicitly, and it is not "the window fills up":

> **The over-specified CLAUDE.md.** If your CLAUDE.md is too long, Claude ignores half of it because
> important rules get lost in the noise.
> — [best practices](https://code.claude.com/docs/en/best-practices)

> If Claude keeps doing something you don't want despite having a rule against it, the file is
> probably too long and the rule is getting lost.
> — [best practices](https://code.claude.com/docs/en/best-practices)

Three mechanical facts sharpen this. The file is *"delivered as a user message after the system
prompt, not as part of the system prompt itself"*, its context cost is *"Every request"* rather than
once per session, and it *"survives compaction: after `/compact`, Claude re-reads it from disk and
re-injects it into the session"* ([memory](https://code.claude.com/docs/en/memory),
[features overview](https://code.claude.com/docs/en/features-overview)). It is the one document in
this repository whose length is paid on every turn, for the whole session, whatever the task.

**Two escapes do not work, and the docs say so.** `@path` imports *"help organization but don't
reduce context, since imported files load at launch"*. And `MEMORY.md`'s hard 200-line / 25KB read
limit does **not** generalise: *"This limit applies only to `MEMORY.md`. CLAUDE.md files are loaded
in full regardless of length, though shorter files produce better adherence"*
([memory](https://code.claude.com/docs/en/memory)). So nothing truncates an over-long `CLAUDE.md`;
it just costs and dilutes.

### Read on demand: there is no published length limit, and the guidance is the opposite

For material behind a pointer, Anthropic's guidance inverts. The skills documentation says it in as
many words:

> Unlike CLAUDE.md content, a skill's body loads only when it's used, so long reference material
> costs almost nothing until you need it.
> — [skills](https://code.claude.com/docs/en/skills)

> **No context penalty for large files:** Reference files, data, or documentation don't consume
> context tokens until actually read.
> — [skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

> **Bundle comprehensive resources:** Include complete API docs, extensive examples, large datasets;
> no context penalty until accessed.
> — [skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

> the amount of context that can be bundled into a skill is effectively unbounded
> — [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)

The published numbers in this area bound the *entry point*, not the material: **500 lines for a
`SKILL.md` body** (*"Keep SKILL.md under 500 lines. Move detailed reference material to separate
files"*), **1,024 characters for a `description`**, and **1,536 characters for the combined
`description` and `when_to_use` in the skill listing**. Every one of those is a cap on something
always in context.

The one piece of guidance that does apply to a long reference file is about navigation, not size:

> For reference files longer than 100 lines, include a table of contents at the top. This ensures
> Claude can see the full scope of available information even when previewing with partial reads.
> — [skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

**and the risk it guards against is real.** The same page warns that Claude *"may partially read
files when they're referenced from other referenced files"*, using *"commands like `head -100` to
preview content rather than reading entire files, resulting in incomplete information"*, and tells
authors to keep references *"one level deep"*. That is the actual hazard for a 1,000-line reference
document: not that reading it costs too much, but that it may be *sampled* rather than read, and a
document with no contents list gives the sampler nothing to steer by.

**The `AGENTS.md` specification prescribes no length at all.** It is *"just standard Markdown. Use
any headings you like"*, with no required fields, no size guidance, and nested files as the scaling
mechanism ([agents.md](https://agents.md/)). Anyone citing an `AGENTS.md` word limit is citing
something the spec does not contain. Claude Code reads `CLAUDE.md` rather than `AGENTS.md` in any
case ([memory](https://code.claude.com/docs/en/memory)), so this repository is unaffected.

## What the degradation research actually shows

Anthropic's own framing is the honest starting point, and it is a *budget* argument rather than a
cliff argument:

> Context, therefore, must be treated as a finite resource with diminishing marginal returns. […]
> Every new token introduced depletes this budget by some amount.
> — [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

The mechanism it names is attention dilution: *"This results in n² pairwise relationships for n
tokens. As its context length increases, a model's ability to capture these pairwise relationships
gets stretched thin, creating a natural tension between context size and attention focus."* Its
prescription is *"Find the smallest set of high-signal tokens that maximize the likelihood of your
desired outcome"* — a signal-density instruction, not a word count.

Four published findings sit under that.

**Liu et al., *Lost in the Middle: How Language Models Use Long Contexts*** (TACL 2023,
[arXiv:2307.03172](https://arxiv.org/abs/2307.03172)). The finding is positional, not volumetric:
*"performance is often highest when relevant information occurs at the beginning or end of the input
context, and significantly degrades when models must access relevant information in the middle of
long contexts, even for explicitly long-context models."* **Its limits matter as much as its
result.** The tasks are multi-document question answering and key-value retrieval, both explicitly
*"tasks that require identifying relevant information in their input contexts"* — retrieval, not
reasoning across the whole document. The distractors are *other documents*, structurally similar to
the target. A single coherent reference file read on purpose is not the configuration that produced
the U-curve, and the paper does not claim it is. The paper is also from 2023 and predates every
model this repository runs on.

**Chroma, *Context Rot: How Increasing Input Tokens Impacts LLM Performance***
([research.trychroma.com](https://www.trychroma.com/research/context-rot), redirecting to
`trychroma.com/research/context-rot`). Eighteen models across Anthropic, OpenAI, Google and Alibaba.
The core claim: *"Large Language Models (LLMs) are typically presumed to process context uniformly
— that is, the model should handle the 10,000th token just as reliably as the 100th. However, in
practice, this assumption does not hold"*, and *"model performance varies significantly as input
length changes, even on simple tasks."* Four sub-findings are load-bearing here:

- **Semantic distance costs more as length grows.** *"As needle-question similarity decreases, model
  performance degrades more significantly with increasing input length"*, while *"at short input
  lengths, the models perform well even on low-similarity pairs."*
- **Distractors compound.** *"Even a single distractor reduces performance relative to the baseline
  (needle only), and adding four distractors compounds this degradation further."* Of the families
  tested, *"Claude models consistently exhibit the lowest hallucination rates."*
- **Coherent prose is harder than shuffled prose.** *"Surprisingly, we find that structural coherence
  consistently hurts model performance"* — *"models perform worse when the haystack preserves a
  logical flow of ideas."* This is the single most awkward result for the popular version of the
  argument, and it held across all eighteen models.
- **Needle-in-a-haystack understates the problem.** *"NIAH is fundamentally a simple retrieval task"*
  measuring *"direct lexical matching"*, and it *"underestimates what most long context tasks require
  in practice"* because real applications *"demand significantly more processing and reasoning over
  broader, often more ambiguous information."*

Their conversational-QA comparison is at ~300 tokens against ~113k tokens, and the word-replication
experiment runs from 25 to 10,000 words with degradation visible well below the top of that range.

**Levy, Jacoby and Goldberg, *Same Task, More Tokens: the Impact of Input Length on the Reasoning
Performance of Large Language Models*** (ACL 2024,
[arXiv:2402.14848](https://arxiv.org/abs/2402.14848)). The finding is *"a notable degradation in
LLMs' reasoning performance at much shorter input lengths than their technical maximum"*, holding
across padding types and locations *"at different intensities"*. **The paper does not publish a
universal threshold**, so anyone quoting a specific "degrades past N tokens" number is not quoting
this paper.

**Modarressi et al., *NoLiMa: Long-Context Evaluation Beyond Literal Matching*** (2025,
[arXiv:2502.05167](https://arxiv.org/abs/2502.05167)). This is the sharpest evidence for the
benchmark gap: standard needle tests flatter models because *"models can exploit existing literal
matches between the needle and haystack to simplify the task."* Remove the lexical overlap and at
32K context *"11 models drop below 50% of their strong short-length baselines"*, with GPT-4o falling
*"from an almost-perfect baseline of 99.3% to 69.7%"*.

### Where the evidence does not support the popular claim

Being honest about this matters more than the verdict, because the strongest-sounding version of
"long docs degrade agents" is not what the research says.

- **No paper here measures a document's length in isolation.** All four vary *total input tokens*.
  A 16,000-token file read into a 1M-token window is not the condition any of them tested; Chroma's
  headline comparison is 300 tokens against 113,000, and NoLiMa's collapse is at 32K of *padding*.
  Reading `infrastructure.md` once does not put the session anywhere near those regimes.
- **The Lost-in-the-Middle U-curve is a retrieval result.** It measures finding a fact among competing
  documents. A document deliberately opened to answer a question, whose subject matches the query,
  is the *high*-similarity, low-distractor end of Chroma's axes — the end where models do well.
- **Coherence hurting performance cuts against "just write less".** If shuffling a haystack improves
  recall, then a well-organised long document is not straightforwardly worse than a short one for the
  mechanism being measured, and the intuition that prose flow helps the model is wrong in the
  direction people assume.
- **Anthropic's own numbers are heuristics, not thresholds derived from these papers.** The 200-line
  and 500-line figures are stated as targets with a named consequence (*reduce adherence*, *optimal
  performance*). Neither page cites an experiment, and neither is presented as a cliff. **Unverified:**
  no first-party publication of the evaluation behind either number was found.
- **The stated `CLAUDE.md` failure is dilution, not window exhaustion.** *"Claude ignores half of it
  because important rules get lost in the noise"* is a claim about instruction adherence among
  competing instructions. It applies at 275 lines in a 1M-token window exactly as it would at
  275 lines in a 200K one, and it is unaffected by how much room is left.

**Net: the belief is well-founded for always-loaded instruction files and weakly founded for
read-on-demand reference files.** For the first class there is a documented number, a named failure
mode, and a per-turn cost. For the second the same vendor explicitly says the opposite, and the
research that people cite against it measures something else.

## The files, one at a time

### `CLAUDE.md` — over the only limit that applies to it

275 lines against a 200-line target is **38% over**, and it has grown: the audit in
`agentic-workflow-setup.md` measured 262 lines on 12–13 August 2026. At roughly 3,500–4,400 tokens
it is also two to three times what 200 lines of the terse bullet style in Anthropic's own example
would cost, so the line count understates the overage rather than overstating it.

**The content is mostly right for the file.** Measured against the include/exclude table in
[best practices](https://code.claude.com/docs/en/best-practices), it is dominated by exactly what
belongs there: *"repository etiquette"*, *"architectural decisions specific to your project"*,
*"developer environment quirks"* and *"common gotchas or non-obvious behaviors"*. The *Closed
decisions* section is the strongest thing in it, because each entry changes behaviour on every turn
by pre-empting a default the installed skills would otherwise reach for.

**What fails the test is the reasoning attached to the rules, not the rules.** The excluded column
names *"long explanations or tutorials"*, and this repository's own standard already says the same
thing — `CODING_STANDARDS.md`: *"`CLAUDE.md` is read every turn, so a line that changes no behaviour
is a real cost."* Two blocks fail it:

- the six paragraphs after the tool-ownership table arguing *why* `neon`, `sentry`,
  `next-devtools-mcp` and `macos-mail-mcp` are user scope. Nothing in a session behaves differently
  for having read the argument; the table row is what routes the call.
- the paragraph asserting per-session OAuth state as standing fact, which is ticket state and will be
  wrong the day **[CAN-51](https://linear.app/jacobrees-canoncore/issue/CAN-51) Keep a record of
  server errors past the hour Vercel keeps them** lands. This is the excluded row *"information that
  changes frequently"*.

Both cuts are already acceptance criteria on
**[CAN-76](https://linear.app/jacobrees-canoncore/issue/CAN-76) Restructure the agent documents:
policy, procedure and incidents get their own homes**, which requires that *"`CLAUDE.md` keeps the
tool table and the one-line prohibitions"* and that
**[CAN-42](https://linear.app/jacobrees-canoncore/issue/CAN-42) Record the skill-invocation trap, and
correct what CLAUDE.md claims the pack does**'s "does not grow materially" constraint holds again.

**`.claude/rules/` is the documented remedy and it does not fit.** Path-scoped rules load *"only when
Claude works with matching files"*. *Which tool owns what* and *Closed decisions* fire on the shape of
a **task**, not on which file is open, so path-scoping them would make them miss. That was the
audit's conclusion and it still holds.

**`/doctor` is the cheap first move.** Its trim check *"cuts content Claude can derive from the
codebase, such as directory layouts, dependency lists, and architecture overviews, and keeps
pitfalls, rationale, and conventions that differ from tool defaults"*, and it *"Reports findings
first"* ([memory](https://code.claude.com/docs/en/memory), requires v2.1.206+). Most of this file is
pitfalls and rationale, which is the half it keeps.

### `docs/agents/workflow.md` — long because it repeats itself, and that is already ticketed

6,130 words, 624 lines, ~8,600–9,900 tokens. **It is not always loaded** — no import, no rule, no
skill frontmatter reference — but calling it on-demand flatters it. Both `/draft-pr` and `/review-pr`
point at it for policy, so it is on the critical path of every landing, and
**CAN-76 Restructure the agent documents** measures the landing path as a *"~1,600-line
five-document interface"*. For that workflow it behaves like a fixed tax.

**The prose is dense rather than padded.** The *Gates* section explains why `pnpm -r test typecheck
lint` silently skips two of three commands, and cites [pnpm run](https://pnpm.io/cli/run) for the
regex-selector alternative. That is a gotcha no config confesses, which is precisely what a document
should cache.

**But length here is a symptom with a named cause.** The audit found *"Four files absorbed ten PRs in
three days: `workflow.md` 341→588 lines"*, and **[CAN-76](https://linear.app/jacobrees-canoncore/issue/CAN-76) Restructure the agent documents: policy, procedure and incidents get their own homes**
enumerates roughly a dozen duplication
families in it by name — poll-then-watch, the third check state, `--delete-branch`,
never-`--admin`, refused-merge-is-a-stop, stale-local-main, review-runs-once, the `gh` account trap,
the classifier fallback, never-`label set`, landed-issue-carries-no-role, the description-write race,
the workspace mandate. Each should be *"one owning module and N one-line pointers"*.

This is the case where the repository's own standard is stronger than the vendor's. There is no
Anthropic number this file breaks. `CODING_STANDARDS.md`'s *one meaning, one place* is what it
breaks, and the `writing-for-agents` skill it defers to names both failure modes exactly:
**duplication** (*"the same meaning in more than one place — costs maintenance and tokens, and
inflates a meaning's prominence on the ladder past its real rank"*) and **sprawl** (*"a document
simply too long, even when every line is live and unique"*).

**Deduplicate first, and only then ask whether what remains is still too long.** Trimming by word
target instead would delete unique facts while leaving the thirteen restatements in place.

### `docs/infrastructure.md` — long and earning it, with one structural fault

10,464 words, 1,081 lines, ~14,650–18,200 tokens: the largest non-research document. It is reached by
pointer from `CLAUDE.md`, `README.md`, both PR skills and five other documents, and is loaded
automatically by nothing.

**The density is measurable and high.** 52 external citations (5.0 per thousand words) and 158 table
rows (15.1 per thousand words). Sampling the *Where the credentials live* section, the prose does
work per sentence that could not be compressed without losing a fact: it separates a half that was
**observed** (a Neon branch exists with `canoncore_app` on a non-production host, with both hosts
printed) from a half that is **cited, not observed** (the branch's `NEON_PGHOST` reaching the
preview runtime, quoted from Neon's own preview-branching page), then says which ticket closes the
gap and what to assume until it does. It also records *why* the password comparison was done by
digest. That is not padding; it is the difference between a register and a rumour.

**Its fault is mixed register, not length.** It is simultaneously a current-state register and an
archive of how each fact was established, and **[CAN-76](https://linear.app/jacobrees-canoncore/issue/CAN-76) Restructure the agent documents: policy, procedure and incidents get their own homes**
is explicit about the intended split:
`infrastructure.md` should become *"the register alone — current provisioned state, one complete
variable roster, verification dates — with evidence linked, not inlined."* That halves it without
losing a single verified fact.

**One published rule it does break: no table of contents.** At 37 headings and 1,081 lines it is well
past the *"longer than 100 lines"* threshold at which the skill-authoring guidance requires one,
*"even when previewing with partial reads."* An agent that `head`s this file currently sees a
production URL and a hosting section and has no idea the DNS records, the TMDB credential rotation
hazard and the Resend delivery evidence are also in it.

### `docs/research/agentic-workflow-setup.md` and `docs/research/external-metadata-sources.md` — fine

12,245 and 9,981 words; ~17,100–21,700 and ~14,000–18,900 tokens. **Neither is loaded automatically
by anything.** Inbound references were checked exhaustively: `agentic-workflow-setup.md` is named by
`docs/research/README.md` and by `README.md`; `external-metadata-sources.md` is named by
`docs/research/README.md`, [ADR-0009](../adr/0009-external-source-tmdb.md) and the tracker audit.
Every one of those is prose pointing a reader at a file, not a mechanism that loads it.

**They are the two densest documents in the repository**: 6.9 and 9.1 external citations per
thousand words, against 5.0 for `infrastructure.md` and 0.8 for `CLAUDE.md`. `external-metadata-sources.md`
carries 60 headings, 125 table rows and 38 code fences across seven external sources with their
endpoints, field names, rate limits and licence terms. There is no compression available that does
not delete a source or a term.

**This is exactly the class Anthropic says to leave long.** *"Bundle comprehensive resources: Include
complete API docs, extensive examples, large datasets; no context penalty until accessed."* The
`writing-for-agents` skill agrees from the other direction: material reached only through a pointer
*"escapes context load at the price of the pointer's own line."* The pointers here are the
`docs/research/README.md` table rows, and they are already written as trigger conditions — *"Read it
when"* — which is the shape that skill asks for.

**The one real risk is staleness, not size**, and the README already handles it with a per-file
status column and an explicit rule that an ADR wins over a research file. The tracker audit notes
`external-metadata-sources.md` is stale in at least one place, which is a content ticket rather than
a length one. Both files should acquire a table of contents for the same partial-read reason as
`infrastructure.md`.

## Length here is a ratchet, and that matters more than any single measurement

Everything above measures a *state*. The commit history measures a *rate*, and it reframes the
question. Line counts at each commit that touched the file, oldest first:

| File | First recorded | Now | Growth | Commits | Commits that reduced it |
| --- | --- | --- | --- | --- | --- |
| `docs/infrastructure.md` | 152 (10 Aug 2026) | 1,081 (13 Aug 2026) | **7.1x in three days** | 14 | **0** |
| `docs/agents/workflow.md` | 161 (7 Aug 2026) | 624 (13 Aug 2026) | 3.9x in six days | 17 | **0** |
| `CLAUDE.md` | 183 (9 Aug 2026) | 275 (13 Aug 2026) | 1.5x | 18 | **0** |

**Across every commit that has ever touched these three files, not one reduced any of them** — 49
file-touches spread over 31 distinct commits, since a single commit often edits more than one.
`infrastructure.md` is strictly increasing at every step; the other two are flat at worst. There is
no compaction step anywhere in this process, so length is a one-way ratchet and the current number
is simply wherever the ratchet has reached.

**The honest caveat:** 7 to 13 August 2026 is the initial provisioning burst — Vercel, Neon, TMDB,
Resend and Sentry are each set up once. That work is front-loaded, so the rate will decay on its own
and these figures must **not** be extrapolated forward. The ratchet property, however, is independent
of the rate: even at one section a month, nothing ever comes out.

**A worked example arrived mid-research.** Commit `8706527`, *Record the Sentry account, its US
organisation and the source-map token*, landed while this file was being written and added 116 lines
to `infrastructure.md` (+12% in one commit) for **CAN-65 Create the Sentry account and issue its
authentication token**. Nothing is wrong with that commit; the fact belongs somewhere. It is what a
routine ticket does to this document.

The same commit also rewrote CLAUDE.md's MCP paragraph from *"`neon` is signed in; `sentry` is not"*
to *"`neon` and `sentry` are both signed in"*. Those lines have now been rewritten **three times in
two days** (`4178b82`, `46d9b1b`, `8706527`), purely to track which OAuth sessions happen to be live.
That is mutable per-session state sitting in the one file loaded on every request: the cost is paid
every turn, and the claim is wrong in the window between the state changing and someone noticing.

**This does not overturn any recommendation below — it reprioritises them and changes why item 3 is
worth doing.** A register of current state is naturally bounded, because it is the size of the
infrastructure, which is finite. An evidence archive is unbounded by design, which is fine, because
archives are meant to grow. The fault is that they are the same file, so the bounded thing inherits
the unbounded thing's growth. Splitting them stops the register ratcheting *by construction*, rather
than by anyone remembering to be disciplined. On the same reasoning, a one-time trim of `CLAUDE.md`
has a shelf life of about a week unless the cap becomes a standing rule: to add a line, remove one or
move it to a pointer-reached document.

## What was actually done, 13 August 2026

`CLAUDE.md` went from 275 lines to **204 loaded lines** — 213 on disk, less a nine-line block HTML
comment. *"Block-level HTML comments (`<!-- maintainer notes -->`) in CLAUDE.md files are stripped
before the content is injected into Claude's context"*
([memory](https://code.claude.com/docs/en/memory)), and the whole 204 figure rests on that sentence.
The five sections of tool reasoning moved to `docs/agents/tooling.md`, which also took two sections
on working practice. That is four over the 200 target rather than under it: the
`Engineering principles` section was restored to its original wording after the trim had rewrapped
and shortened it, and those four lines are a deliberate trade against a heuristic that has no
published evaluation behind it (see *Where the evidence does not support the popular claim*).

**Re-measured 17 August 2026: 211 on disk, less an eleven-line block comment, is exactly 200 loaded
lines.** Two things moved and only one of them is this ticket. **The 204 figure above had already been
overtaken**: on the commit before this change `CLAUDE.md` was 201 on disk against the same eleven-line
comment, so **190 loaded** — the four-line trade described above had been paid back by later trims,
and nothing recorded that. Then CAN-75 Write the four missing ADRs and fix the glossary's
self-violations added ten lines to *Closed decisions, and what will try to reopen them* (three new
bullets, one rewritten, one extended), then three more bullets paid for by three rewraps — one of
which removed that file's own bare-ticket violation. It lands on 200 exactly.

**The number is now a gate rather than a measurement, which is the real change here.** Both drifts
above happened because nothing was counting, and a rule that lives only in prose is one nobody
re-reads at the moment it is broken. `scripts/check-docs.ts` now fails when `CLAUDE.md` exceeds the
target **stated in its own maintainer comment** — read from there rather than written into the
script, so the number keeps one home and the checker cannot disagree with the file it gates. The
count is of *loaded* lines, so a maintainer note stays free. `200` passes and `201` fails, because
200 is where the file was deliberately landed. **So the file is on the target with no headroom, and
the next addition needs a cut to pay for it** — and now it will say so on a runner rather than in a
research file nobody re-reads.

A table of contents was added to the five reference files over 100 lines. No content was removed from
any of them. The recommendation below to trim below 200 therefore stands as **partially met**, and
this note is the record of that rather than an amendment to it.

## What to do

1. **Trim `CLAUDE.md` below 200 lines.** Run `/doctor` first for its proposal, then cut the two
   blocks named above. This is the only recommendation here backed by a published threshold, and it
   is the only file whose length is paid on every turn of every session.
2. **Deduplicate `workflow.md` before shortening it**, per **[CAN-76](https://linear.app/jacobrees-canoncore/issue/CAN-76) Restructure the agent documents: policy, procedure and incidents get their own homes**'s
   owning-module-plus-pointers
   criterion. Do not set a word target for it; the target is one meaning in one place.
3. **Split `infrastructure.md` into register and evidence**, also per **[CAN-76](https://linear.app/jacobrees-canoncore/issue/CAN-76) Restructure the agent documents: policy, procedure and incidents get their own homes**.
   Keep every fact.
4. **Add a table of contents to each of the four long reference files** — `infrastructure.md`,
   `workflow.md` and the two research files. This is the cheapest change on the list, it is the only
   published guidance that applies to read-on-demand documents, and it guards against the partial
   read that a 1,000-line file invites.
5. **Do not shorten the research files.** No first-party guidance and no published finding supports
   it, and the vendor's stated position for this class is the opposite.

**And measure rather than count words.** If an instruction is being missed, the test Anthropic gives
is behavioural, not numeric: *"For each line, ask: 'Would removing this cause Claude to make
mistakes?' If not, cut it."* The `writing-for-agents` skill makes the same test explicit and adds the
part that matters for settling arguments — it is *"model-relative, not reader-relative: two people
disagreeing about a no-op disagree about the default, and settle it by running the document, not by
debate."*

## Unverified

- **The token figures.** No tokeniser was available; both estimates are conventional ratios, and
  Claude's tokeniser is not published. Run `/context` in a live session for the only authoritative
  number for the always-loaded set.
- **The evaluation behind Anthropic's 200-line and 500-line figures.** Both are stated as targets
  with a named consequence; no first-party publication of the underlying measurement was found.
- **Chroma's needle-in-a-haystack token range.** The report gives eight input lengths and eleven
  needle positions without publishing the token counts for that experiment. The 25–10,000-word range
  quoted above is from its repeated-words experiment, and the 300 / 113k figures from LongMemEval.
- **Levy et al.'s degradation threshold.** The paper reports degradation *"at much shorter input
  lengths than their technical maximum"* without a universal number.
