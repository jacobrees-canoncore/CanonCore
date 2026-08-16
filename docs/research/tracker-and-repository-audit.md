# The tracker and repository audit of 12–13 August 2026

**What this is.** A full pass over the Linear tracker and every merged pull request, run 12–13
August 2026. Sixteen background agents did the reading: ten verified ticket claims against primary
sources — legislation.gov.uk, Ofcom's published codes, TMDB's terms, Expo's documentation, Neon's
and Vercel's plan pages — and six reviewed the landed work of every Done ticket. A label audit
covered all 64 issues. This file records what was found, what was already corrected during the
audit, and what remains open.

**Findings are not decisions** (`CONTEXT.md` → *Using these documents*). Where a finding
contradicts an ADR, the ADR wins until amended — but several findings below are precisely that
an ADR's stated reasoning does not survive contact with its primary source, which is grounds to
amend, not to ignore.

The pattern across all sixteen reports, stated once here rather than per section: **premises
survive; specifics do not.** No ticket or ADR was found to be building the wrong thing. Many were
found resting on a wrong citation, a stale fact, or an unwritten permission.

---

## 1. Corrections already applied during the audit

These happened on 12–13 August and are recorded as done, not proposed.

**Labels, all 64 issues.** Every issue now carries exactly one category role (`Bug`/`Feature`) and
exactly one state role unless landed (`docs/agents/triage-labels.md`). Applied: `ready-for-agent`
to CAN-43, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 60, 61; `ready-for-human` to CAN-59 Decide
whether the Hobby plan can carry a public service; `Feature` to CAN-5, 8, 13, 16, 36, 44;
`needs-triage` + `Feature` to the ten deferred roadmap tickets CAN-6–15 (none has acceptance
criteria — design notes only, so not agent-ready); `ready-for-agent` *removed* from CAN-17 v1: the
walking skeleton in production (an epic is a container, not work — its children carry the routing).
The category line that held across all 64: `Bug` where something already shipped says or does
something false, `Feature` where something new is created.

**Assignment.** All 60 non-archived issues assigned to Jacob. (Linear offers auto-self-assign only
as a personal preference, not a team default: [Assign and delegate
issues](https://linear.app/docs/assigning-issues), [Preferences](https://linear.app/docs/account-preferences).)

**Splits.** CAN-51 Keep a record of server errors and CAN-56 Find out the site is down each bundled
a human account-signup under a "Human prerequisite" heading while labelled `ready-for-agent` — a
first step no agent can take. Created CAN-65 Create the Sentry account and issue its authentication
token and CAN-66 Create the uptime monitoring account and its phone alert route, both
`ready-for-human`, wired as blockers; the two parent bodies now say "Blocked by" instead. Same
pattern as CAN-19 and CAN-20.

**Rewrites.** CAN-49 Refuse to build without the environment variables the app needs gained: the
import-mechanic question (plain `import` → `next.config.mts` → `jiti`, in that order — Next's
config file "is not parsed by Webpack or Babel", and the package is CommonJS with no
`"type": "module"`), and a warning that t3-env's own suggested `skipValidation` includes
`CI === "true"`, which would defeat the ticket's third acceptance criterion. CAN-52 Lint the
accessibility rules eslint-config-next leaves off gained: the fact that no lint inheritance exists
between `packages/config` and `apps/web` today (adding rules to `packages/config` alone would lint
no JSX and change nothing), the ordering constraint (the shared config must be spread *after* the
`eslint-config-next` entries or five `warn` ARIA rules override the `error` ones), and making
`eslint-plugin-jsx-a11y` a direct dependency rather than transitive.

**New tickets.** CAN-67 Cite every Linear issue by title as well as number (rule committed to
`CLAUDE.md` on its branch); CAN-68 Land the tracker and repository audit (this file).

---

## 2. Tooling findings

- **`orca linear list-issues` silently caps at 50 rows.** No truncation signal in the default
  output; `.result.meta.hasMore` exists but nothing surfaces it. The tracker's real total was 64:
  ten real tickets (CAN-5–16) were invisible to every audit that had ever run the bare command, and
  CAN-1–4 are archived Linear onboarding templates visible only with `--include-archived`.
  `--limit` accepts 100 and 250 but errors on 300. Same failure shape as the `--workspace` trap
  already in `docs/agents/issue-tracker.md`, and belongs beside it.
- **`save-issue` reports unconfirmed but lands.** "Linear may have applied the issue save, but Orca
  could not confirm it" — every occurrence this audit (four) had in fact landed, verified by
  re-read. Consistent with the existing guidance: re-read, never retry blind.
- **`assignee set` takes `--me`, not `--assignee me`.** The first form silently reached nothing; a
  batch of 35 assignments appeared to run and none had applied. The error surfaced only on
  inspecting a single raw response.

---

## 3. Security-grade findings

Consolidated from the infrastructure and credentials reviews. All measured on 13 August 2026,
read-only.

1. **The BYPASSRLS credential ADR-0005 forbids is on the Vercel project sixteen times, in
   plaintext.** The Neon Marketplace integration writes sixteen `NEON_*` variables — including
   `NEON_DATABASE_URL`, `NEON_PGPASSWORD` and `NEON_POSTGRES_PASSWORD` as bare passwords — all
   **Non-sensitive**, all scoped Production, Preview *and* Development, every one carrying
   `neondb_owner` (`rolbypassrls = true`). `docs/infrastructure.md:175-177` frames the `NEON_`
   prefix as the mitigation; a prefix is a rename. The rule is enforced today by nobody typing the
   variable name. The credentials table at `:199-203` lists three variables; the project holds
   twenty-three.
2. **A live password's digest and length are published in this public repository.**
   `docs/infrastructure.md:247` records the `canoncore_app` password as "28 characters, SHA-256
   `8606a49d65d8…`", beside the production host and role name — while `:717` states "no fragment of
   a live key is written here." An unsalted digest of a live password is a confirmation oracle.
   Rotate first, then replace the row with the finding ("identical") and no digest.
3. **`RESEND_API_KEY` is stored Non-sensitive on five projects, not the three CAN-41 recorded** —
   `canoncore-legacy`, `canoncore-demo`, `canoncore-storybook`, **`canoncore-v3`** (live, HTTP 200,
   never examined by any ticket) and `waveger-archive`. The Vercel project `canoncore-v3` was
   created one day apart from the full-access Resend key named `CanonCore V3` that CAN-39 revoked;
   whether a live project lost its sender on 10 August is unestablished. `infrastructure.md:686`
   ("removing it from the three would end the exposure at this end") is falsified by the fourth.
4. **Nine further credentials sit in plaintext on the same old projects** under the identical
   acceptance argument: `GOOGLE_CLIENT_SECRET`, two Google refresh tokens, `AUTH_SECRET`,
   `ENCRYPTION_KEY`, and four Postgres URLs. No ticket accounts for them. Deleting the dead
   projects resolves all of it at once; CAN-41's own notes already sanction that answer.
5. **Nobody owns what a public preview deployment may hold, and three tickets worsened it
   separately.** Preview protection is off (CAN-18); the preview environment carries a live Resend
   sending key — "Resend has no sandbox and no test credential" (`infrastructure.md:726`) — and a
   live TMDB token (CAN-19/20); and since CAN-45 turned preview branching on with
   `init_source: parent-data`, previews run against a copy-on-write clone of production's rows.
   "A preview must not read production data" is satisfied literally and defeated in substance.
6. **The CAA records CAN-18 recorded do not exist.** `dig` returns NODATA for `canoncore.com` CAA,
   and CAN-20's own zone inventory listed none. Either CAN-18 misread the zone twice or the records
   were removed unrecorded. Absent CAA, any CA may issue for the domain. Nothing records which.
7. **A `google-site-verification` TXT of unknown origin is live** — a standing control-proof over
   the domain, the same shape CAN-20 treated as urgent for DKIM, dismissed as "Unrelated" in
   `docs/research/transactional-email-providers.md:120` and absent from `infrastructure.md`.
8. **The DMARC `rua` points at an inbox only the Resend API can read**
   (`dmarc@mail.canoncore.com`), which `infrastructure.md:793` itself rejects as insufficient for
   `report@`. No ticket owns reading the reports.
9. **Neon preview branches accumulate with no owner.** Eight branches from documentation-only PRs
   in twelve hours, all still `ready` after their git branches were deleted, ~300 `cpu_used_sec`
   each; `main` is `protected: false`.

---

## 4. Findings with statutory weight

From the two Online Safety Act verification agents and the GDPR agent. The load-bearing claims in
CAN-21 all verified against primary sources — the Crime and Policing Act 2026 amendments of
29 June 2026 (s.10(3A)/(3B), s.20A, s.21(2A); S.I. 2026/689), the s.66 NCA duty in force
7 April 2026 (S.I. 2026/262, with S.I. 2026/268 as the reporting regulations), s.3(2)(a), the
failed limited-functionality exemption, and the 14 ICU measures. The problems:

1. **The Schedule 3 clock may already be running.** CAN-44's rule — "date the assessments
   immediately before sharing the URL" — assumes the compliance clock starts at sharing. s.9(2) and
   s.36(1) fix the first assessments by reference to
   [Schedule 3](https://www.legislation.gov.uk/ukpga/2023/50/schedule/3): three months from the day
   the service becomes a Part 3 service. `www.canoncore.com` is already deployed and publicly
   reachable. s.37(5)(a) then deems the service likely to be accessed by children from the
   Schedule 3 deadline. The trigger date needs establishing, not deferring.
2. **CAN-43's "deliberately outside v1" defers a live statutory duty.** The intimate image content
   report is part of the s.20(2) duty via
   [s.20A(1)](https://www.legislation.gov.uk/ukpga/2023/50/section/20A), in force since
   29 June 2026, with no code measure behind it and therefore no s.49(1) deemed compliance to
   shelter in. The D2.2(a) half of the deferral is sound; the s.20A half is not. Split the
   intimate-image path into v1.
3. **CAN-32 predates the 2026 amendments** and ships a ToS and reporting route that omit
   s.10(5)(b) and s.20A. Also missing from both tickets: the s.21(2A) expedited complaints
   procedure, and the s.10(3A) "substantially the same" limb with its s.10(3B) exception fields.
4. **The s.23(4)–(5) alternative-measures record exists in no ticket.** ICU D2 applies and is
   deliberately not implemented in full — that is an *alternative measure*, requiring a written
   record of the measures not taken, the alternatives, how they amount to compliance, and how
   s.49(5) (freedom of expression, privacy) was considered. The Step 3 record in
   `illegal-content-risk-assessment.md` cites s.23(3) — the wrong subsection — and has no s.49(5)
   element ([s.23](https://www.legislation.gov.uk/ukpga/2023/50/section/23),
   [s.49](https://www.legislation.gov.uk/ukpga/2023/50/section/49)).
5. **The code measures register is ICU-only on a branch where the PCU codes bind.** The children's
   access assessment found the child user condition met, which brings the Protection of Children
   Codes into scope; a register of 14 ICU measures alone is incomplete. Three PCU rows it does
   carry are misdescribed (B4, B5, B1 — see the CAN-32/43 verification report).
6. **The 12-month review cycles are Ofcom guidance, not statute.** s.9(3) contains no period;
   s.23(6) says "regularly"; s.36(3)'s cycle applies only while a service is *not* treated as
   likely to be accessed by children — the opposite branch from the one taken. Both tickets cite
   the sections as if they carried the number.
7. **Nothing timestamps report receipt.** The 48-hour s.10(3A) clock (a backstop, not a standard:
   "as soon as reasonably practicable, and no later than 48 hours"), the s.21(2A) expedited
   procedure and the s.23 records all key off *when a report was received*. With an email-only
   route, that timestamp lives in a mailbox outside the system. The roles model (`user`/`admin`,
   anonymous as absence of session) is sufficient; the missing thing is state, not roles.
8. **GDPR, CAN-30:** the one-month erasure criterion ignores
   [Art 12A](https://www.legislation.gov.uk/eur/2016/679/chapter/III/section/1) (inserted
   5 Feb 2026 by DUAA 2025): +2 months by notice for complexity or volume, and a defined
   clock-start. Art 12(3)'s month is for reporting action taken; Art 17(1) requires erasure
   "without undue delay" — a job that parks rows until day 29 passes the ticket and fails the Act.
   The export criterion welds [Art 20](https://www.legislation.gov.uk/eur/2016/679/article/20)'s
   machine-readable format (provided data, consent/contract basis only) onto
   [Art 15](https://www.legislation.gov.uk/eur/2016/679/article/15)'s scope; no single right
   obliges the combination, and neither ticket mentions Art 15. The CSEA retention criterion drops
   one of reg. 8(1)(b)'s four limbs and misstates "associated user data", which
   [S.I. 2026/268](https://www.legislation.gov.uk/uksi/2026/268/made) reg. 8(2) bounds to a
   two-week window; the deletion job cannot be built from the ticket's wording.
9. **CAN-36's premise does not survive.** "The terms are silent on the account holder, therefore
   the export is permitted" answers a clause that does not exist. The
   [published terms](https://www.themoviedb.org/api-terms-of-use) contain no
   redistribution-to-third-parties restriction; what they say is the licence is non-transferable
   and **non-sublicensable** (§1.A), bars selling/leasing/sublicensing TMDB Content and making
   derivatives (§1.C), and requires purging all TMDB Content on termination (§1.D) — impossible for
   copies already exported. The export therefore needs affirmative permission, which exists only as
   the attached reply the ticket's own criterion marks "not verifiable — attested, not checked."
   CAN-36 is also textually corrupted: its entire body appears twice (the sync race CAN-37
   documented), and it still says "the export carries Snapshots whole", contradicting CAN-30.

---

## 5. Per-ticket verification findings

Problems only; a claim not listed here verified clean. Full agent reports are in the session; this
is the durable summary.

### CAN-26 Import a series from TMDB / CAN-27 Orderings and Placements

- **TV id 121 is the 1963 classic series** (26 seasons, ~700 episodes), not the 2005 revival
  (57243). "Fixtures recorded once and committed" means committing 26 season payloads unless the
  ticket names the id it means.
- **"TMDB reserves episode groups for alternative orders" is false.** Episode group type 1 *is*
  "Original air date", and TMDB's own
  [reference example](https://developer.themoviedb.org/reference/tv-series-episode-groups) is an
  aired-order group. Doctor Who's five groups are genuinely all non-air-date (Blu-ray/DVD, Digital,
  three Story arc), so "do not read an episode group" is safe for *this series* as an empirical
  fact — not as policy. An importer inheriting the stated reasoning breaks on the next series.
- The rate-limit note is stale: TMDB
  [publishes a replacement figure](https://developer.themoviedb.org/docs/rate-limiting) (~40
  req/s, handle 429). The "2% of movie ids a year" figure is a project estimate, not
  TMDB-published.
- Verified sound: `adult` on the series object and absent from season/episode details (so deriving
  through `part of` is genuinely necessary); the attribution wording; 0-based `order`; no default
  group field.

### CAN-13 Artwork / ADR-0012 Adult works catalogued, artwork never displayed

The conclusion (never display adult artwork) survives; almost none of the stated reasoning does.

- **ADR-0012 relies on the wrong Part of the Act.** A TMDB-fetched poster is *provider* content
  (s.79(2), including content displayed "by means of software or an automated tool or algorithm
  applied by the provider"), routed to **Part 5** (ss.80–81): highly effective age assurance with
  **no terms-of-service exception** and no children's-access threshold; the only gate is UK links.
  s.12(5) disapplies only s.12(4), and the s.12(3)(a) duty survives it. The ToS-prohibition route
  works for user-uploaded artwork only. Part 5 duties bind from 17 January 2025, not the
  25 July 2025 Part 3 date the ADR cites. Blurring does not help (s.79(6)).
- **The load-bearing claim — a poster for a pornographic film is itself pornographic content — has
  no source either way.** s.236(1)'s test is "produced solely or principally for the purpose of
  sexual arousal"; a poster is produced principally to market a film; Ofcom's Part 5 guidance
  contains no occurrence of "poster", "promotional", "thumbnail" or "trailer". Needs resolving,
  not asserting — it cuts both ways.
- **TMDB grants no express display right for anything.** "Display" appears nowhere in the operative
  grant; the site terms (incorporated by §1.B) grant "use and copy… solely for Your personal,
  non-commercial purposes" and expressly prohibit display outside that; §2.A bars use "on or in
  connection with a 'destination' website" and use to "recommend content, such as movies,
  television shows". This reaches ADR-0009's foundation, not just artwork. No ticket owns it.
- The `adult` flag is on movie and person objects too, absent from `discover/tv` *results*
  (filterable, not readable back), and by TMDB's contribution bible means hardcore pornography
  specifically — 18+ erotic titles are deliberately excluded, and TV's "softcore" flag is not in
  the API at all. Narrower control than the ticket assumes.
- **Three of the four "hosting defence conditions" are misattributed.** Only expeditious removal is
  a condition of ECR 2002 reg 19; the contactable address is a standing reg 6 duty; notice-and-
  action is EU law (DSA Art 16), not UK; neutral listing ordering appears in neither instrument.
  The OSA contains no hosting defence, and reg 20(2) preserves Ofcom's powers regardless — the
  defence shields damages and criminal sanctions only. The stronger basis for "cataloguing is not
  carrying" is s.61(6) and s.79(4) (text-only carve-outs), which the ADR does not cite.

### CAN-8 tardis.wiki provider / CAN-29 Author the chronology

- **CAN-29's robots.txt claim is false today.** `tardis.wiki/robots.txt` (fetched 12 Aug 2026) is
  62 lines, Cloudflare-managed: `User-agent: *` / `Allow: /`, with nine named bots disallowed —
  **including `ClaudeBot`** — and a `Content-Signal: search=yes, ai-train=no, use=reference`
  declared as an express Article 4 (EU 2019/790) reservation. The 1,109-line MediaWiki file the
  research doc records is gone, and it was never `Disallow: /` for every agent. CAN-29's
  *conclusion* (human-only) stands on its real reason: an Argument must cite evidence actually in
  the stories. Five passages across `docs/research/tardis-wiki-extraction.md` and
  `docs/research/external-metadata-sources.md` are stale on this, including one labelled "the
  decisive finding".
- **The owner's permission is held nowhere.** Confirmed verbally by the project owner during this
  audit; no correspondence, date, person or channel exists in the repo or any ticket. This is
  exactly the state ADR-0009 was in before CAN-34 Attach TMDB's written retention approval closed
  it — worse, because the only written trace (the research doc) is marked "move to the provider
  repository when it exists", and because the recorded scope ("to extract") does not obviously
  cover what CAN-8 plans (public display of prose). A CAN-34-shaped ticket is the fix.
- Licence: CC BY-SA 3.0 **Unported**; §4(c) attribution (author, title, source URI, licence link,
  adaptation credit) and §4(b) share-alike attach to copied or adapted **prose**, not to extracted
  facts; **images are licensed separately and are out entirely** (overwhelmingly BBC-copyright
  fair-dealing uploads). "492 timeline pages" re-verified exact.

### CAN-11 Mobile app / CAN-12 TV app

- CAN-11 survives with two corrections: **the EAS-assumes-Yarn trap is stale** — EAS detects the
  package manager from the lockfile, ships pnpm on current images, and has a first-class `pnpm`
  field ([custom-builds schema](https://docs.expo.dev/custom-builds/schema/),
  [infrastructure](https://docs.expo.dev/build-reference/infrastructure/)); and the duplicate-React
  hazard's mechanism is **pnpm's isolated linker, not hoisting**, with Expo's documented remedy a
  root `resolutions` pin ([monorepos](https://docs.expo.dev/guides/monorepos/)). Expo's TV rule is
  "should", not "requires".
- **CAN-12's premise does not survive as written.** react-native-tvos is designed so existing
  components "just work" (`Pressable`/`Touchable*` via focus events; lists auto-wrapped in
  `TVFocusGuideView`; TV additions are extra props, not different components), and Expo documents
  a *single* project building both targets via `EXPO_TV=1`
  ([building for TV](https://docs.expo.dev/guides/building-for-tv/)). Focus/D-pad is the real
  constraint; "every interactive component differs at the root" and "shared UI is largely a
  mirage" overstate it, and a separate Expo app is a preference, not a requirement. "The web app is
  unaffected" needs a caveat: the root-level `resolutions` pin and any `nodeLinker: hoisted`
  fallback both reach `apps/web`.

### CAN-6 Playback hand-off

- **The Google Drive exclusion cites the wrong mechanism.** `drive.file` is non-sensitive (not
  restricted) and serves bytes via `files.get` `alt=media`
  ([drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)), so
  a picker-based per-file flow needs no restricted scope and no CASA. The restricted scope is
  forced only by whole-Drive enumeration — a product choice. (CASA's trigger is restricted data
  plus third-party-server access; the annual cadence is right.)
- Plex: two auth methods, JWT recommended, legacy `X-Plex-Token` still accepted; "short-lived"
  means 7 days. Jellyfin remote control verified exactly as claimed.

### CAN-53 Security headers

- **`frame-ancestors` cannot be delivered by a report-only CSP** — it exists only as a CSP
  directive, and report-only "without enforcing" means the clickjacking criterion is met on paper
  with zero protection. Ship an *enforced* `frame-ancestors` alongside the report-only full policy
  (both headers are legal simultaneously), or `X-Frame-Options`.
- **Report-only collects nothing without `report-to`** — and nothing here collects reports yet
  (CAN-51 owns Sentry). As written, "run against real traffic before enforcing" is unfalsifiable.
- `experimental.sri` exists in 16.3.0 and is real, but SRI covers only external resources; App
  Router's inline RSC payload scripts cannot carry `integrity`, so it is not the known escape hatch
  from `'unsafe-inline'` the ticket implies. `headers()` in `next.config` remains the current
  approach; the headers test must be HTTP-level (Playwright or fetch), not in-process.
- Verified verbatim: Vercel's HSTS coverage, the report-only-first guidance, all four nonce
  caveats, and Hobby's invocation/CPU numbers.

### CAN-15 Completeness rollups / CAN-7 Provider contract

- **Sonarr can answer whether a show is complete** — `totalEpisodeCount` is on the same statistics
  object and in the UI; what Sonarr does is decline to make total-based progress its headline
  number ([#4105](https://github.com/Sonarr/Sonarr/issues/4105)). Rewrite the cautionary tale (or
  use the better one: `COUNT(*)` folds in season-0 specials —
  [#7046](https://github.com/Sonarr/Sonarr/issues/7046)).
- **Audiobookshelf does publish an OpenAPI spec** for the provider contract
  (`custom-metadata-provider-specification.yaml`), and its schema does express one ordering
  (`series[].sequence`). What survives: no version in the URI, a two-parameter surface, no
  capability endpoint, no store and no review. "Inherit its community providers" means ~13
  self-hosted audiobook-shaped providers, two with public addresses — restate the upside before
  building on it.

---

## 6. Landed-work review findings

### PR #59 (CAN-22, the walking skeleton)

Nothing ticked-but-unmet; the two unticked criteria were honest and became CAN-45. Forward-looking
problems, all of which land on CAN-23 One Story from Neon:

- **The cross-tenant RLS test has nowhere to run.** CI has no Postgres, no `DATABASE_URL`, no
  secrets; vitest is jsdom-only (driver tests need node); `pnpm -r build` runs with no env vars,
  which collides with CAN-49 the moment build-time validation lands; and
  `@testing-library/react` cannot render an async Server Component, so `page.test.tsx`'s seam dies
  on the first data-driven page. The container-vs-Neon-branch decision for CI wants making before
  CAN-23 opens.
- **The Playwright criterion is satisfied once and never again**: default `baseURL` is production,
  no `webServer`, asserts copy the deleted static page carried verbatim, and it is in no CI step.
- Silent-skip surface: vitest `include` is `src/**/*.test.{ts,tsx}` only; `pnpm -r test` errors
  only when *no* package has the script, so a future package's tests can be skipped in silence.
- Hygiene: `@types/node ^20` against `engines >=24` (typecheck validates the wrong Node API);
  the Node version stated in three unlinked places; no `permissions:` block in CI;
  `/favicon.ico` 404s in production; dead config (a no-op ignore override with a comment claiming
  otherwise, `globals: true` unused, `trace: "on-first-retry"` with retries 0).

### The nine-PR skills cluster (CAN-35, 37, 38, 42, 46, 47, 48, 63, 64 — plus #87)

Four files absorbed ten PRs in three days: `workflow.md` 341→588 lines, `CLAUDE.md` 222→~285
(against CAN-42's explicit "does not grow materially" criterion). Accumulated defects:

- **CAN-63's central finding was deleted and inverted by #87 five and a half hours after it
  landed**, with no record anywhere that a Done ticket's deliverable was reversed.
- **Two rebase instructions target the permanently-stale local `main`** (`workflow.md:308`,
  `review-pr:194`) that `workflow.md:155-197` itself documents as never moving in a worktree; the
  conflict path rebases onto a stale base and then fails inexplicably. "The loop" at
  `workflow.md:283` opens with `git checkout main && git pull`, which git refuses in this layout.
- **`review-pr` contradicts itself post-#87**: step 2 requires every ruleset context green
  (including Vercel) before step 3, whose "nothing deployed yet" branches now describe a state
  step 2 forbids; `:185`'s `--match-head-commit` carve-out is unreachable; CAN-38's "first `gh`
  write" claim was falsified by CAN-64 adding `gh run rerun` two steps earlier.
- **CAN-64's stuck-check diagnostic cannot see the context most likely to hang**: it reads
  `/check-runs`, and Vercel reports as a commit *status* (`infrastructure.md:125`).
- **Seven policy passages are duplicated** between `workflow.md` and the skills (the review-runs-
  once argument exists in four places), against the house rule; most restate the reasoning and
  then cite `workflow.md` anyway.
- Stale, uncaught by any of the nine: `CLAUDE.md`'s "three CI gates" (four run; the required
  context is literally named `test, typecheck, lint, build`); `workflow.md:16` "no database
  exists"; `draft-pr` steps 10–11 fall out of their numbered list (3-space continuation under a
  two-digit marker); `workflow.md:189` reintroduces the hard-coded cross-file step number CAN-46
  removed.

### PR #54 (CAN-21, the OSA documents)

The drafting is real; the record-keeping is not, and one gate got lost:

- **None of the four statutory records is valid today** — every completion date, reviewer, approver
  and the register's entire `Effective` column are unfilled placeholders. Deliberate (the review
  clocks run from completion), but untracked.
- **The URL-sharing gate exists nowhere in the repository** — only as an unticked box on a closed
  ticket and one prose line on CAN-44 (not an acceptance criterion). `CLAUDE.md` never mentions
  `docs/compliance/`.
- **The CSEA-IRP third limb is owned by nobody**: the registration deferral's own revisit trigger
  ("the moment the service carries content from any account other than the operator's") fires when
  CAN-24 ships, and the emergency procedure's step 3 instructs a registration the same document
  argues a sole operator cannot complete.
- **Delivered documents assert behaviour `main` does not have** — the controls table lists two
  unbuilt controls under a preamble disclaiming intention; both public legal documents claim to be
  rendered from every page's footer (no footer, no `/legal` route exists); one promises the public
  a screen-reader-usable reporting page that does not exist; the register's ICU D2 row asserts "a
  field for supporting information", which is the CAN-43 form deferred past v1.
- CAN-44 carries a criterion it cannot satisfy (every `content/legal/` placeholder resolved, one of
  which waits on CAN-30, which does not block it). Verified clean: the dates→CAN-44,
  address→CAN-44, config→CAN-32 and retention→CAN-30 inheritances.

### PRs #35/#42/#43/#65 (infrastructure) and #48/#53 (credentials)

The security-grade items are in §3. Additional to them:

- CAN-18's ticked composed-connection criterion asserted preview branching as fact while the next
  box, unticked, said it was not wired; the recorded cause ("no toggle exists") was wrong (a
  greyed-out checkbox behind `Require Active Resource Before Deploy`), which kept it unfixed for
  two days. CAN-45 later satisfied the unticked box; nothing records that on either ticket.
- The credentials table's three rows are wrong in detail: `DATABASE_APP_USER` is also in
  Development and Non-sensitive while `DATABASE_APP_PASSWORD` is Sensitive (one merged row hides
  both facts); `EMAIL_FROM` is stored Sensitive, unmarked.
- CAN-41's closure was a risk acceptance recorded honestly in prose but closed as `Done` with 3 of
  4 criteria open, where `Canceled`/`wontfix` exist for exactly this. The cheapest criterion
  (re-store as Sensitive — two CLI calls) was skipped with no stated reason, and the identify-the-
  account fallback ("recorded as unidentifiable with what was tried") was unmet because nothing was
  tried. The bound the argument rests on ("who can sign in was not enumerated") is answered 630
  lines up in the same file: Hobby plan, single user, no members.
- `infrastructure.md`'s opening line ("Provisioned by CAN-18, CAN-19 and CAN-20… Everything here is
  fact, not intent") is falsified by six later tickets' content and a section marked "Not created."
- Six CanonCore/Universora-named Vercel projects exist beyond the two the docs name.

### PRs #13/#15/#33/#39/#80 (the founding documents)

- **Glossary**: `Placement` is defined over Stories only while ADR-0002 and the `Ordering` entry
  both include Versions; `CONTEXT.md` violates its own `_Avoid_` lists (`hierarchy` at `:4`,
  `consumed` at `:230`, `Ordering`'s own examples use the banned `order`); ADR-0012 is titled in
  the banned word `works`; ADR-0003 leans on the banned `alias`; "canonical" is used in three
  senses while `Validity` bans it — worst at ADR-0009's "broadcast order is the canonical episode
  set". `docs/research/README.md:21` names a glossary term (`Position`) that does not exist
  (it is `Progress`).
- **ADR seams**: ADR-0003 ("the shared layer is source data only") and ADR-0004 ("one row per
  (record, source)") cannot both be right while records are per-user — **CAN-23 is the first
  ticket that has to know**, because the answer decides which tables get RLS and how many
  cross-tenant tests exist. ADR-0009's "retention per source" has no mechanism in ADR-0004's
  permanent Snapshots (the de facto rule — such a source cannot be added — is stated nowhere).
  Nothing says what GDPR erasure does to another user's forked Snapshot whose Source is the erased
  person — the one place the permanence and erasure rules point in opposite directions; CAN-30
  would have to invent the answer. ADR-0008's "row-level soft delete… useless" followed by
  `deleted_at` adoption reads as self-contradiction (it means row-level *undo*).
- **`CLAUDE.md` closed-decisions gaps**: the Marketplace posture (Neon via Marketplace, Resend
  refused) is stated only inside ADR-0011, while `vercel:marketplace`, `vercel:vercel-storage` and
  `vercel:bootstrap` all point at the route; the `neon` MCP's `provision_neon_auth` is a one-call
  path to reopening better-auth that the table does not name; ADR-0004 and ADR-0008 — the two most
  expensive-to-reverse decisions — have no entry at all.
- **Settled decisions with no ADR** (each a proposed follow-up): the provisioning route
  (Marketplace for Neon only, and why); the testing stack (Vitest, Testing Library, Playwright
  against deployed URLs); observability (Sentry + a non-Sentry uptime monitor); the no-cookie-
  banner PECR position (a legal conclusion currently living in a research file the repo's own rules
  say is not a decision record).
- `docs/research/README.md` advertises `external-metadata-sources.md` as the live reference for
  "which data may be stored and for how long" while that file states the six-month cap ADR-0009's
  exception overrides. ADR-0012's argument is restated nearly verbatim in
  `childrens-risk-assessment.md`; the ToS prohibits pornographic content without the carve-out
  ADR-0012 rests on, so the public document appears to forbid what the ADR permits.

---

## 7. Architecture exploration

Run under the `/improve-codebase-architecture` and `/codebase-design` skills, with a document
treated as a module: its *interface* is what an agent must read before acting correctly, its
*implementation* what it actually instructs. Change frequency put all the heat in the agent-facing
documents (`workflow.md` ×16 edits, `CLAUDE.md` ×15, the two PR skills ×12 each,
`infrastructure.md` ×11) against 192 lines of application code changed almost never.

**Structural diagnosis — two forces, both structural rather than accidental:**

1. **The declared seam does not hold.** `workflow.md` line 5 places it: "a rule belongs here, a
   step belongs in the skill." But every rule in this system is only actionable *as* a step, and a
   skill must be self-sufficient at execution time because its body is what loads. So safety-
   critical rules migrate into the skills while the policy file keeps its copy plus the evidence.
   Rule-vs-step is a hypothetical seam — nothing varies across it — so both sides accrete the same
   content. `review-pr` states the contradiction itself: "read the commands from there rather than
   from memory" (line 39), followed by the commands inlined (lines 53–56).
2. **The citation house style, applied inward, makes every module shallow.** `CODING_STANDARDS.md`
   requires checkable claims to cite sources — written for claims about the outside world. Applied
   to the repo's own rules it means every rule carries its discovering incident inline: dates,
   SHAs, run IDs. That is why `workflow.md` went 341→588 in three days. The interface of every
   rule now includes its provenance narrative — read a lot, extract a little.

**Candidates, ranked by friction (deletion-test verdict in brackets):**

1. **`workflow.md` is three modules interleaved** — standing policy, procedure fragments belonging
   to the skills, and an incident log ("The gates" alone runs 176 lines; extracting "what commands,
   what wait" traverses forensics on one stuck run and a deploy-order policy for migrations that do
   not exist yet). [Split concentrates on both sides; only connective essay tissue scatters.]
2. **Rules carry their forensics inline.** The same incident is narrated wherever its rule is
   restated (the stuck check-run in two files; the sync revert in two; the empty-diff experiment in
   two). One incident record cited by N rules is leverage; currently each rule *is* its evidence,
   so corrections must be applied everywhere the story is told. [Concentrates.]
3. **`infrastructure.md` is a register, an evidence log and a deviation record in one file.** The
   register (platform state no file can assert) is genuinely deep; wrapped around it are ~95 lines
   of closed-incident Resend forensics and ~107 of preview-branching narrative whose standing
   content is a two-row table and one sentence. "Where each credential lives" — the file's stated
   purpose — is answered by four separate tables covering 3 of 23 variables, and one register fact
   (the public-repo constraint) lives in `issue-tracker.md`. [Register concentrates hard; evidence
   concentrates elsewhere; split.]
4. **Landing one PR costs ~1,600 lines across five documents** — the most common act in the repo.
   `review-pr` forwards to `workflow.md` at ten points and to the tracker docs at four more; the
   reader follows every pointer or trusts restatements, and the restatements are what drift (CAN-46,
   CAN-63, and this audit's stale findings are that drift). [The measurement to judge any
   restructure against.]
5. **`CLAUDE.md` holds a missing tools module and asserts per-session state as standing fact.**
   The tool-ownership table earns its always-on place; the six paragraphs after it are the
   implementation of a tools module that does not exist, including OAuth sign-in state observed on
   one day ("`neon` is signed in; `sentry` is not") and a paragraph that schedules its own
   staleness. Every turn pays ~65 lines needed only at tool-selection moments, in the one file
   nothing prompts a re-read of. [Concentrates into a `docs/agents/` tools module; the one-line
   prohibitions with stakes stay.]
6. **The duplication families number about a dozen, not seven** — the gh account trap ×4, the
   classifier fallback ×5, never-`label set` ×4 (twice in one file), landed-issue-carries-no-role
   ×3, the description-write race ×3, the workspace mandate ×3. The mechanism is generative, which
   rules out fixing passages one at a time. [Each family: one owner, N pointers.]
7. **No document has a test, and the repo states the principle itself** — `workflow.md:490`: "a
   rule that lives only in prose is one nobody re-reads at the moment it is broken." The one
   machine-checkable class (quoted command names, label rosters, required contexts, the variable
   roster) is exactly the class that went stale within three days.
8. **Template residue in the small modules** — `domain.md`'s example tree names fictional ADRs and
   instructs a multi-context layout the repo does not have (~10 live lines; deletion test says
   *scatter*, i.e. absorb it); `triage-labels.md` ends with the template's instruction addressed to
   nobody.

**Application code:** too small to have architectural friction of its own. The one load-bearing
item is a string: the CI job name `test, typecheck, lint, build` is quoted verbatim by the ruleset,
`workflow.md` and `review-pr` — four homes, no check tying them together, and renaming the job
would block every merge forever ("Expected — Waiting for status to be reported").

---

## 8. Consolidated follow-ups

Every proposed follow-up from all sixteen reports, deduplicated. Ordered by what they cost to
ignore, not by effort. Ticket creation is the decision walkthrough's job; this list is the record.

**Security / integrity**
1. Neutralise or remove the sixteen `NEON_*` owner-role variables; consider a lint ban on
   `process.env.NEON_` in `apps/web` before CAN-23 writes the first connection.
2. Rotate `canoncore_app`; drop the digest and length from `infrastructure.md:247`.
3. Re-store or remove `RESEND_API_KEY` on all five holders; run the census across every project on
   the account (settles the `canoncore-v3` question); account for the nine other plaintext
   credentials — or delete the dead projects, which resolves all of it.
4. Decide what a public preview may hold (protection, key scoping, `parent-data` cloning) before
   CAN-23 and CAN-26 put code in front of previews.
5. Settle the CAA question; account for the `google-site-verification` TXT and the dangling `demo`
   CNAME; give the DMARC reports a reader; own the Neon branch lifecycle and protect `main`.
6. Regenerate `infrastructure.md`'s credentials table from `vercel env ls`, complete and per-row.

**Statutory**
7. Establish the Schedule 3 trigger date — the one item with a statutory deadline possibly running.
8. Split the s.20A intimate-image report path out of CAN-43 into v1; add the receipt timestamp,
   the s.10(3B) exception fields and the s.21(2A) expedited path to CAN-32/CAN-43.
9. Create the s.23(4)–(5) alternative-measures record; extend the register to the PCU codes; fix
   its three misdescribed rows and the two ToS items not required by the cited measures.
10. Put the URL-sharing gate in the repository (infrastructure.md + a CAN-44 criterion +
    a CLAUDE.md pointer to `docs/compliance/`); own the CSEA-IRP revisit trigger; fix the
    emergency-procedure contradiction; make the compliance documents describe `main` or gate them
    on CAN-32.
11. Correct CAN-30's three defective criteria (Art 12A/17(1); Art 15 vs 20; attribution
    logo + no "terms disclosure") and its reg. 8 wording; obtain authenticatable TMDB export
    permission or narrow the export — and resolve the display-rights question (§2.A destination /
    recommendation bars) that reaches ADR-0009 itself.
12. Rewrite ADR-0012 on Part 5 grounds (provider content, s.79–81, no ToS exception), resolve the
    poster-as-pornographic-content question, cite s.61(6)/s.79(4), fix the date; fix CAN-13's
    hosting-defence attributions and adult-flag assumptions.
13. Obtain the tardis.wiki permission in writing, scope read and recorded, attached to a ticket
    (the CAN-34 shape); reword CAN-29's justification; refresh the five stale robots.txt passages;
    note the ClaudeBot exclusion and the Content-Signal reservation.

**Decisions wanting ADRs**
14. Provisioning route (Marketplace for Neon only); testing stack; observability; the no-cookie-
    banner position. Settle ADR-0003×0004 (shared vs per-user Snapshot layer) **before CAN-23**;
    give retention-per-source a mechanism or state the refusal; answer erasure-vs-forked-Snapshot
    for CAN-30; close the three closed-decisions gaps (ADR-0004, ADR-0008, `provision_neon_auth`).

**Delivery hygiene**
15. Decide the CI database seam (service container vs Neon branch) before CAN-23; split the vitest
    environments; inject build-time env in CI ahead of CAN-49; run Playwright against the
    deployment it gates; close the silent-skip gaps; align `@types/node` with Node 24 and single-
    source the version.
16. Deduplicate the seven policy passages; fix the two stale-local-`main` rebase instructions and
    "The loop"; make the stuck-check cross-check cover commit statuses; delete the two unreachable
    "nothing deployed" branches; record that #87 reversed CAN-63 (or restore the finding); re-shrink
    `CLAUDE.md` per CAN-42; correct "three CI gates" and `workflow.md:16`; fix the `draft-pr`
    list indentation.
17. Fix the glossary (`Placement`, self-violations, proper-name exemption) and the research README
    row; tick or reopen the six Done tickets with unticked criteria (CAN-18, 21, 22, 36, 40, 41 —
    CAN-36 also needs its duplicated body repaired); correct CAN-42's two dead file references.
18. Correct CAN-26/27's episode-group reasoning and series id; CAN-53's two acceptance criteria;
    CAN-15's and CAN-7's specifics; CAN-6's Google Drive mechanism; CAN-11's two stale traps;
    rewrite CAN-12's premise. Update CAN-55/56's provider numbers only if acted on (verified
    current: Neon 6h/1GB, UptimeRobot 50×5min, Better Stack 10×3min).

---

## 9. Decisions taken on the findings — 13 August 2026

The owner walked every finding in a four-round decision session the same day. Outcomes, so this
file reads as a record rather than a to-do list:

**Executed immediately, platform side.**
- The four dead Vercel projects (`canoncore-legacy`, `canoncore-demo`, `canoncore-storybook`,
  `canoncore-v3`) were **deleted**. The census run first found `canoncore-v3` held a **second,
  different key** — two distinct unaccounted keys, not one shared key with a fourth holder — and
  both probed **live** (HTTP 403, sending scope) minutes before deletion. Neither is readable from
  this account any longer; both remain live on whichever accounts own them.
- All sixteen `NEON_*` variables were **removed** from the `canoncore` project. Whether the
  Marketplace integration re-writes them, and whether per-branch `NEON_PGHOST` injection still
  reaches preview runtimes, is checked on the next preview (CAN-69 Record the credential purge).
- **Vercel Authentication now covers preview deployments** (`ssoProtection: preview`, set via the
  API after the MCP endpoint 500'd).

**Decided, owned by new tickets.** CAN-69 (credential record + `NEON_` lint ban), CAN-70 (the
human-only loose ends: schema-only preview branches, CAA, the `google-site-verification` TXT, the
now-dangling `demo` CNAME, the DMARC reader, the Ofcom subscription), CAN-71 (compliance records:
dates now rather than at launch, the s.23(4) record, the PCU register, the URL gate into the
repo), CAN-72 (the s.20A intimate-image path, split into v1 from CAN-43), CAN-73 (the pre-CAN-23
decision session: Snapshot layer, CI database seam, forked-Snapshot erasure — blocks CAN-23 and
CAN-30), CAN-74 (ADR-0012 rewritten on Part 5 grounds), CAN-75 (the four missing ADRs and the
glossary), CAN-76 (the document restructure, chosen over deferral), CAN-77 (the skills footguns,
landing before CAN-76).

**Settled by the owner — do not re-raise.**

> **Superseded twice, 16 August 2026 — the first two bullets now instruct the reverse of the
> governing position.** The TMDB correspondence is **disregarded entirely** (decision 5 of CAN-96
> Record the architecture decisions of 15 August, and make the repository agree), so §4's
> published-terms reading is the operative one, not "a finding only", and the export scope is owned
> by CAN-106 Decide what the GDPR export may contain under TMDB's published terms. And tardis.wiki
> is **licence-only** since the 16 August walkthrough (CAN-115 Land the 16 August verification
> sweep: the decisions, the corrections, and what they touch): no permission is load-bearing, so
> nothing "travels" and §8.11's obtain-export-permission remedy is unavailable. The third and
> fourth bullets stand.

- **TMDB.** The correspondence held on CAN-34 and CAN-36 covers the export and the display,
  discussed with TMDB at length; no further request goes out. §4's contrary reading of the
  published terms stands as a finding only. *(Superseded — see the note above.)*
- **tardis.wiki.** The provider lives in a separate repository that is deliberately not this
  project's; the permission travels with whoever builds it, and this repo carries no obligation to
  hold it. *(Superseded — see the note above.)*
- **The `canoncore_app` password.** Scrub the digest from the doc without rotating (CAN-69),
  accepting that git history retains it. Recorded as an accepted risk, not an oversight.
- **The Schedule 3 clock.** Treated as running: the assessments are dated now (CAN-71), not
  immediately before sharing the URL. CAN-44's instruction was inverted accordingly.

Ticket-body corrections from §5 were applied directly the same day: CAN-6, 7, 11, 12, 15 gained
dated correction sections; CAN-26, 27, 29, 30, 53 had criteria corrected in place; CAN-24 gained
the CSEA revisit criterion; CAN-44 gained the URL-gate criterion and the CAN-30 carve-out. The
closed tickets were reconciled: CAN-36's duplicated body repaired, CAN-18's satisfied box ticked
against CAN-45, CAN-63 records its reversal by #87, CAN-21 maps where its unticked half went,
CAN-41 records the deletion outcome and the census.

---

*Method note. Verification agents were instructed to report problems only and to name the primary
source for every defect; review agents had read-only access and changed nothing. Where an agent's
finding contradicted the project owner's knowledge (tardis.wiki permission), the owner's statement
was passed back mid-run and the report reflects it. The session also holds the full per-agent
reports; this file is the compression that survives.*
