# The full-repository verification sweep of 16 August 2026

Twenty-six agents verified roughly four hundred claims across every Linear issue and every document
in this repository against primary sources — statutes at legislation.gov.uk, licence texts at their
canonical homes, vendor documentation, live APIs, live DNS, and the live platform state. It ran the
day after the 15 August architecture change (ADR-0014) landed, on the owner's instruction that it be
a "massive check of everything", after spot-validation of the thirteen new tickets kept finding real
defects.

**This is a record of findings and of the decisions taken on them, not a decision document.** The
decisions live on **CAN-115 Land the 16 August verification sweep: the decisions, the corrections,
and what they touch**, and were made one at a time in a walkthrough with the owner on 16 August.
The corrections live in **CAN-116 Make the tracker agree with the 16 August verification sweep**
(tracker side) and **CAN-117 Make the documents agree with the 16 August verification sweep, and
land its synthesis** (this repository — the change this document lands in). Where a finding below is
marked *fixed*, that is where it was fixed.

## Contents

- [The scoreboard](#the-scoreboard)
- [What held](#what-held)
- [The serious findings](#the-serious-findings)
- [The decisions taken on them](#the-decisions-taken-on-them)
- [False records corrected](#false-records-corrected)
- [Graph repairs](#graph-repairs)
- [Method notes, for the next sweep](#method-notes-for-the-next-sweep)
- [Not covered](#not-covered)

## The scoreboard

| Swept | Verdict |
| --- | --- |
| 100 live Linear issues (56 open, 44 Done; the GitHub mirror carries 110, mirrors of since-removed issues persisting) | ~30 needed amendment or a correction note; the rest verified clean |
| 14 ADRs | 0001, 0002, 0005, 0006, 0011, 0012, 0013 essentially verbatim-clean; 0003/0004 sound with one caveat each; 0007's blockquote overclaimed; 0008 one misattributed quote; 0009 one phantom clause; 0010 two false sentences; 0014 three defects, two serious |
| 8 compliance records | Statutory scaffolding almost entirely verbatim-accurate; two dead citations; the forward-looking triggers user-scoped |
| 17 research documents | The legal spine (*Ryanair*, sui generis timeline, `s.29A`, CC BY-SA §3(b)/§4(b)) exact; one licence claim refuted (Open Library); one "discrepancy" already resolved |
| Operational docs + source tree | `docs/infrastructure.md` passed a full live audit; the three RLS non-negotiables real at file:line; `docs/incidents.md` append-only discipline held; two silent holes in `check-docs` |

The repository's core is sound. What broke concentrates in three places: **records written about
the 15 August change**, **tickets the restructure never reached**, and **premises nobody had
re-checked against the live web**.

## What held

Worth recording, because a sweep that only lists defects teaches the wrong lesson about this repo:

- **The three non-negotiables are real.** `NOBYPASSRLS` in `apps/web/src/db/roles.sql` *and* a
  runtime refusal in `session.ts` that also rejects table-owning roles; the cross-tenant read test
  on `story` with no `where` clause; `set_config(..., true)` inside an explicit transaction, with
  reversion tested on rows rather than on the setting.
- **`docs/infrastructure.md` told the truth under a live audit** — ruleset, merge methods, both
  GitHub secrets, all eight Vercel env rows with environments and sensitivity, all twelve DNS
  records via `dig`, the apex 301, Neon branch configuration. One row was false (preview
  protection, below), and it was the exception.
- **The statutory quotes are verbatim** across ADR-0012, the compliance set and the research docs —
  including the 29 June 2026 Crime and Policing Act insertions (`s.10(3A)` 48 hours, `s.20A`,
  `s.59(10A)`), the CSEA regulations S.I. 2026/268 limb for limb, and UK GDPR Articles 15, 17, 20
  and the DUAA Article 12A.
- **TMDB's terms are quoted exactly** everywhere they are quoted: `§1.A`, `§1.B`, `§1.C` (cache and
  AI clauses), `§1.D`, `§3`, and the FAQ's About-or-Credits requirement.
- **`docs/incidents.md` held its append-only rule** — the last three touches were pure insertions —
  and its spot-checked SHAs, run ids and durations all matched GitHub.

## The serious findings

Each with its verdict and where it was fixed. Ticket-level detail is in the per-ticket amendment
notes CAN-116 Make the tracker agree with the 16 August verification sweep left; the walkthrough decisions are the next section.

1. **The liveness oracle was broken twice.** TMDB's main daily ID exports contain zero
   `adult:true` rows — adult IDs live only in parallel `adult_*` files (verified across all
   1,233,086 rows of one day's movie export) — so ADR-0014's "absent from today's export →
   genuinely gone" would have silently deleted every adult work ADR-0012 deliberately catalogues.
   And **no episode or season export exists at all**, leaving episode liveness with no oracle while
   CAN-26 Import a series from TMDB, with the overlay behind it writes one Snapshot per episode. *Fixed in ADR-0014's amended Decision-6 rule and the
   criteria of CAN-101 Create the provider-tmdb repository, and give it the TMDB credential and CAN-103 Refresh Snapshots before their Source's retention expires, and drop what cannot be refreshed.*
2. **ADR-0009 asserted a clause that does not exist.** "The terms' restrictions on … redistribution
   all bind" — no clause of TMDB's terms uses "redistribute", "distribute" or any equivalent;
   `§1.C` bars *sell, lease, or sublicense* and `§1.A` makes the licence non-transferable. The true
   position is silence, and silence is not permission. *Fixed in ADR-0009; the export scope is
   settled as policy (below).*
3. **ADR-0014's Decision 3 rested on a dead fact.** The claim that tardis.wiki's `robots.txt`
   "disallows `/api.php` for every user agent" was refuted live three separate ways — the current
   file is `User-agent: *` → `Allow: /`, with only named AI crawlers disallowed and a Cloudflare
   `Content-Signal` block — and the passage it cited had been flagged stale by the 13 August audit
   *before* the ADR was written. The file also changed within about a day of being read, so it is
   volatile as well as permissive. *Fixed by the licence-only decision below.*
4. **Decision 9 misstated the roster's licences.** "The keyless Sources … are share-alike, and all
   of them require attribution" — of the five, two are CC BY-SA 4.0, one is CC BY 4.0, and **two
   are CC0, which requires no attribution at all**; tardis.wiki is CC BY-SA 3.0, whose share-alike
   lacks 4.0's §4(b) database deeming. Worse, **Open Library's CC0 is unverifiable on any live
   page** — the superseded research doc had it right ("treat as unverified") and the newer one
   overrode the caution. *Fixed in ADR-0014, CAN-105 Carry each Source's attribution obligation through to every surface that displays it, CAN-110 Carry per-field provenance to every displayed value, and the source-licence doc's §4.*
5. **The repository held both answers to a dispositive statutory question.** ADR-0012 and the
   source-licence doc concluded imported content is *provider* content, citing `s.55(4)(b)(ii)` —
   the limb governing when a *tool* is a user — while CAN-108 Re-assess the illegal-content risk before a user can paste an arbitrary Provider URL asserted *user-generated*; neither
   engaged `s.55(4)(a)` (content shared "by means of software or an automated tool **applied by the
   user**"), the live limb once a user pastes a URL, and `s.59(14)(a)` makes the answer decide
   whether the illegal-content regime reaches imported data at all. *Resolved as policy (below).*
6. **Preview deployment protection was off while the register said on.** Live API:
   `ssoProtection: disabled`; all 34 Neon preview branches are copy-on-write clones of production
   rows. *Accepted deliberately and recorded (below).* Relatedly, Neon `main` branch protection is
   a paid-plan feature — plan-gated, not forgotten.
7. **The scheduled-refresh capability had no reassessment owner.** Every change-trigger in both
   risk assessments, the review policy and the alternative-measures record is scoped to
   user-authored text and user-facing features, so CAN-103 Refresh Snapshots before their Source's retention expires, and drop what cannot be refreshed's rewriting of reviewed public content
   on a schedule would have shipped without anyone deciding whether `s.9(4)` applies. *Fixed as a
   criterion on CAN-103 Refresh Snapshots before their Source's retention expires, and drop what cannot be refreshed.*
8. **`check-docs` has two genuinely silent holes.** A bare `file → *Section*` pointer to an
   untracked file is validated by neither the pointer check nor the link check; and the
   ADR-link pointer form — a markdown link whose text is `ADR-NNNN` followed by `→ *Section*`, the
   shape of the entire ADR supersession chain — never
   matches the pointer regex, so renaming a heading in ADR-0014 leaves CI green while the amended
   ADRs point at nothing. *Ticketed as CAN-119 Close check-docs's two silent pointer holes, and
   closed there: both checks parse each document now rather than matching its raw text, which
   reaches the shapes a match could not see, the supersession chain among them.*
9. **Two v1 tickets owned one statutory deliverable.** CAN-32 Roles, takedown, and the Online Safety Act surfaces already carried the terms page, its
   footer link and per-heading anchors; CAN-89 Give the product a visual identity and a reading surface claimed no other ticket rendered `content/legal/`
   and would have built it again — a lawfulness-gate condition with no stated boundary. *Resolved:
   CAN-32 Roles, takedown, and the Online Safety Act surfaces builds, CAN-89 Give the product a visual identity and a reading surface restyles.*
10. **CAN-57 Make a public Ordering discoverable and shareable could open production to strangers while the gate was closed.** Lifting `noindex` and
    publishing a sitemap was blocked only by an authoring ticket; neither the ticket nor the gate
    tables mentioned each other. *Fixed with five `blocked-by` edges and the gate section naming
    it.*

## The decisions taken on them

Made one at a time in the 16 August walkthrough; recorded on CAN-115 Land the 16 August verification sweep: the decisions, the corrections, and what they touch and, where they change an
architecture decision, in the amended ADR itself.

1. **Preview protection stays off, accepted and recorded**, until **CAN-79 Previews clone production rows, and the integration has no switch to stop it Previews clone
   production rows, and the integration has no switch to stop it** closes the exposure.
2. **The liveness oracle reads the union of the main and `adult_*` export sets, and episode
   liveness derives from the parent series** — series gone means episodes gone; a live series with
   an episode 404 is settled against the season listing.
3. **tardis.wiki drops to licence-only.** CC BY-SA 3.0 plus an honest technical posture; the verbal
   permission — which was held nowhere and scoped "to extract" — is no longer load-bearing, and
   ADR-0014's third reachability class dissolves into a note.
4. **Conservative statutory readings adopted as policy, no solicitor**: provider-imported content
   is treated as in scope for the illegal-content regime, and the GDPR export narrows to external
   identifiers permanently. Policy, deliberately — not a legal conclusion. The export half is
   derived in [ADR-0015](../adr/0015-gdpr-export-owner-rows-and-source-identifiers.md), under
   CAN-106 Decide what the GDPR export may contain under TMDB's published terms, and generalised
   there from TMDB to any Source.
5. **CAN-32 Roles, takedown, and the Online Safety Act surfaces owns the legal pages; CAN-89 Give the product a visual identity and a reading surface restyles them.** The gate never waits on design.
6. **Baseline before repository**: CAN-107 Give every Provider repository a CI baseline now blocks CAN-101 Create the provider-tmdb repository, and give it the TMDB credential, so the first Provider repository is
   born gated rather than retrofitted.
7. **`§1.D` purge-on-termination gets its own v1 ticket** — **CAN-118 Purge every Snapshot of a
   Source whose licence terminates, and tombstone what it touched** — because the one licence duty
   with a deadline measured in days was owned by nothing. *Corrected 17 August 2026: `§1.D` states
   no number of days. The obligation is to "promptly delete or otherwise purge all TMDB Content,
   including any cached content" ([API Terms of Use](https://www.themoviedb.org/api-terms-of-use)).
   The finding survives on stronger ground — a period judged after the event against how quickly you
   could have acted is not a kinder one than a fixed window — and CAN-118 Purge every Snapshot of a
   Source whose licence terminates, and tombstone what it touched carries the full correction.*

## False records corrected

The pattern across all of them: a failed or partial read treated as evidence about the thing
unread, or a record describing an intention rather than the outcome.

- **CAN-96 Record the architecture decisions of 15 August, and make the repository agree's closeout asserted its own child's work was never done.** The `Later` project
  description *was* rewritten on 15 August and matches the live graph exactly; the closeout's
  author had mistaken a failed Playwright *read* for evidence of absence, then minted **CAN-114 Rewrite the Later project description, which CAN-100 left stale**
  on the false premise. That ticket is Cancelled; the closeout carries a dated correction.
- **The corrections on CAN-33 Record the external source decision as ADR-0009 and CAN-34 Attach TMDB's written retention approval misquoted `CLAUDE.md`** — the file is right, the
  correction wording came from PR #148's own commit message, and left standing it invited a future
  editor to delete a live warning. Corrected on both tickets; `CLAUDE.md` untouched.
- **CAN-49 Refuse to build without the environment variables the app needs's titled guarantee inverted silently**: every `env.ts` variable is now optional on
  purpose and the refusal fires at request time. Sound design, unannotated record — the one stale
  claim inviting false confidence in a safety property.
- **`docs/agents/issue-tracker.md` carried a wrong diagnosis and wrong counts** about the GitHub
  mirror: comments *do* sync, but only from the synced thread (Linear documents this as a feature);
  the census is 110 issues and 30 comments, all linkbacks. Corrected here; CAN-112 Comments never reach the GitHub mirror, and the tracker doc said they did re-scoped.
- Correction notes were also appended to **CAN-21 Write the Online Safety Act documents and establish the reporting address, CAN-41 Account for the Resend key three older Vercel projects still carry, on an account we do not control, CAN-42 Record the skill-invocation trap, and correct what CLAUDE.md claims the pack does, CAN-68 Land the tracker and repository audit of 12-13 August, CAN-83 The variable roster check has never gated in CI, though the docs say it does and CAN-93 Record the three bands, the two gates and the Later queue convention**, and
  amendments made to some twenty open tickets — each note dated, each naming this sweep.

## Graph repairs

Drawn live during the walkthrough:

- CAN-57 Make a public Ordering discoverable and shareable — `blocked-by` all five gate tickets.
- CAN-81 Disclose Sentry's US error storage in the terms of service now blocks CAN-51 Keep a record
  of server errors past the hour Vercel keeps them — flipped, disclosure before SDK.
- CAN-55 Keep a backup that reaches past Neon's six-hour window → CAN-29 Author the Doctor Who
  in-universe chronology in production — the prose ordering made a real edge.
- CAN-102 Give Source a retention policy, and Snapshot a fetched-at → CAN-26 Import a series from
  TMDB, with the overlay behind it — the Snapshot table lives there.
- CAN-26 Import a series from TMDB, with the overlay behind it `blocked-by` CAN-101 Create the
  provider-tmdb repository, and give it the TMDB credential — the import needs its Provider.
- CAN-107 Give every Provider repository a CI baseline now blocks CAN-101 Create the provider-tmdb
  repository, and give it the TMDB credential — flipped, baseline first.
- CAN-104 Read a Provider's capability declaration, and refuse what it does not serve `relatedTo`
  CAN-13 Artwork: uploads, rights and takedown.
- CAN-118 Purge every Snapshot of a Source whose licence terminates, and tombstone what it touched —
  wired under CAN-102 Give Source a retention policy, and Snapshot a fetched-at.

## Method notes, for the next sweep

- **A failed read is not evidence of absence.** The sweep's single most consequential false record
  (the closeout of CAN-96 Record the architecture decisions of 15 August, and make the repository agree, and the ticket it minted, CAN-114 Rewrite the Later project description, which CAN-100 left stale) came from treating `Browser is already in use` as "never rewritten".
- **Linear reformats what it stores** — trailing hard-breaks, escaped emphasis, rewrapped lines —
  so verification probes must be loose, and three of this sweep's seven "reverted" description
  writes were false negatives from exact-match needles. Only one write was genuinely reverted, and
  one repair-then-read fixed it.
- **The GitHub sync rewrites bare link text into wrong numbers** (CAN-88 The GitHub sync rewrites bare CAN-n link text into GitHub numbers, defeating the cite-by-title rule's finding, re-confirmed at
  160 occurrences and growing), which is why every citation here carries a title.
- **Verify the claim, not the vibe.** The agents that found the most were briefed to quote the
  claim, fetch the primary source, and return CONFIRMED/REFUTED with the URL — and forbidden from
  proposing alternatives to settled decisions. The brief's known-findings list stopped
  re-litigation; NEEDS-LAWYER as a permitted verdict stopped confident guessing.

## Not covered

- Dashboard-only platform rows (Vercel region/SSO detail, vendor consoles) — verified against the
  register's dated read-backs, not re-queried where no API reaches them.
- One agent's web batch never returned: live text of shadcn/MUI/Expo adapter pages, OPDS 1.2
  `atom:rights`, Wikimedia `extmetadata`, Calibre-Web `MetaSourceInfo`, and the GCD/ISFDB/Open
  Library licence pages beyond what the research docs record. All consistent locally; live
  confirmation missing.
- Ofcom V2.0 pinpoint paragraphs behind the toolkit flow, and the PCU code as finally issued
  (verified against the April 2025 submitted text).
- Whether any of this survives the next change is the point of the records it amended — this
  document is a snapshot of 16 August 2026 and does not update.
