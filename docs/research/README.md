# Research

Investigation output from `/research` and from the grilling session of 8 August 2026. **This is
not domain documentation.** Vocabulary lives in `CONTEXT.md`; decisions live in `docs/adr/`. If a
file here contradicts an ADR, the ADR wins and the file is out of date.

Read the ADRs first. Come here only for the detail an ADR deliberately left out.

| File | Status | Read it when |
| --- | --- | --- |
| [tracker-and-repository-audit.md](tracker-and-repository-audit.md) | **Live reference** | Acting on any finding of the 12–13 August 2026 audit, or writing a ticket that cites one. Sixteen agents verified ticket claims against primary sources and reviewed every merged PR: the security-grade findings (the `NEON_*` owner credentials, the published password digest, the five-project Resend key), the statutory ones (the Schedule 3 clock, the live s.20A duty [CAN-43](https://linear.app/jacobrees-canoncore/issue/CAN-43) defers), the per-ticket corrections, and the architecture diagnosis of the agent-facing documents. Findings are not decisions; each names its primary source |
| [external-metadata-sources.md](external-metadata-sources.md) | **Live reference** | Touching TMDB, TheTVDB, MusicBrainz, Open Library, Wikidata, tardis.wiki or Big Finish. Endpoints, field names, coverage, rate limits, and the licence terms for each — including which data may be stored and for how long. Which source we use is decided in [ADR-0009](../adr/0009-external-source-tmdb.md) |
| [transactional-email-providers.md](transactional-email-providers.md) | **Live reference** | Touching email — [CAN-31](https://linear.app/jacobrees-canoncore/issue/CAN-31), or reconsidering the provider. Resend against Postmark, AWS SES, Mailgun, ZeptoMail, Brevo, MailerSend and SendGrid: free tiers, approval gates, the exact DNS records each demands, terms and sub-processors, and what Google and Yahoo actually require of a low-volume transactional sender. The decision is [ADR-0011](../adr/0011-transactional-email-resend.md) and what was provisioned is [`docs/infrastructure.md`](../infrastructure.md); this is the evidence under both |
| [online-safety-act-obligations.md](online-safety-act-obligations.md) | **Live reference** | Writing or reviewing the Online Safety Act documents — [CAN-21](https://linear.app/jacobrees-canoncore/issue/CAN-21) and [CAN-32](https://linear.app/jacobrees-canoncore/issue/CAN-32). Why the service is in scope and what would take it out; the nine artefacts the duties actually require; the 18 kinds of priority illegal content and what can and cannot be called negligible; the 14 Code measures that bind a smaller low-risk service; the terms-of-service drafting checklist; and which free tools are worth using. **Re-check before launch** — the Act was amended on 29 June 2026 and Ofcom's own toolkit is behind it |
| [production-readiness-baseline.md](production-readiness-baseline.md) | **Live reference** | Deciding what v1 carries beyond features, or planning anything after it. What a production-grade Next.js project holds that [CAN-17](https://linear.app/jacobrees-canoncore/issue/CAN-17) does not: error tracking, security headers and CSP, rate limiting, backups, SEO surfaces, accessibility and performance gates. Carries the Vercel Hobby and Neon free-plan limits that decide sequencing, the ICO position on why no cookie banner is needed, an assessment of `ixartz/Next-js-Boilerplate`, and a list of what was **rejected** and why |
| [agentic-workflow-setup.md](agentic-workflow-setup.md) | **Live reference** | Changing the Claude Code setup, or deciding how this repository is presented to anyone outside it. Audits `CLAUDE.md`, `.claude/`, the skills and the plugins against what Anthropic actually documents: seven ranked findings, whether wrapping another author's skill is sound, and the features that do not earn their place here. Then the repository as a portfolio piece — what a visitor finds and in what order, what the published evidence says about AI-assisted development and about AI in hiring, and whether the README should say this is agent-built. Defers to [production-readiness-baseline.md](production-readiness-baseline.md) on anything the *product* needs |
| [chronology-reference-shape.md](chronology-reference-shape.md) | **Live reference** | Building or importing Orderings. First-hand reading of a real fan chronology: entry counts by medium, the six facet axes, entry types, branching, and the two kinds of unplaced |
| [audiobookshelf-provider-contract.md](audiobookshelf-provider-contract.md) | **Live reference** | Designing or implementing the provider contract. The full prior-art contract, field by field, plus where its schema fails this domain |
| [versions-and-orderings-prior-art.md](versions-and-orderings-prior-art.md) | **Live reference** | Implementing orderings or versions. TMDB Episode Groups and TheTVDB season types are the two public schemas worth borrowing vocabulary from |
| [tardis-wiki-extraction.md](tardis-wiki-extraction.md) | **Belongs elsewhere** | Building the provider that reads that wiki. **Move this to the provider repository when it exists** — it is not this product's concern |
| [platform-reach.md](platform-reach.md) | Trimmed | Building the mobile or TV app. Kept: react-native-tvos versioning, focus management, the monorepo TV tax, and the Apple bill. Decision is in [ADR-0005](../adr/0005-stack.md) |
| [work-expression-models.md](work-expression-models.md) | Trimmed | Comparing our model against the standards, or hitting one of the three cases no standard handles. Decisions are in [ADR-0001](../adr/0001-two-levels-story-and-version.md) and [ADR-0002](../adr/0002-orderings-are-separate-from-containment.md) |
| [edits-refresh-and-progress.md](edits-refresh-and-progress.md) | Trimmed | Implementing Position. Kept the Readium `Locator` reference. The merge survey is spent — its decision is [ADR-0004](../adr/0004-layered-overlay-for-sources-and-edits.md) |

## What was cut, and why

Three files were surveys run to reach a decision. Once the decision became an ADR, the survey was
evidence rather than reference, so each was trimmed to the part still worth consulting: 4,551 lines
down to 504. The ADRs quote the load-bearing evidence directly, so nothing that decided anything
was lost.

Nothing here was written by reading any earlier attempt at this product. Every agent was given that
constraint explicitly and all reported no such source appeared.
