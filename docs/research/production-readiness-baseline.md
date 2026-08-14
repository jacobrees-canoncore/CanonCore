# The production-readiness baseline

**Researched 2026-08-12**, against [CAN-17](https://linear.app/jacobrees-canoncore/issue/CAN-17)
and its children. The question: what does a production-grade, industry-standard full-stack Next.js
project carry that v1's scope does not, and when should each part land?

Every plan limit, retention window, price and threshold below was read on that date from the page
that owns it: Vercel's, Neon's, Sentry's, GitHub's and the ICO's own documentation; the Chrome
team's web.dev articles and the Lighthouse repository; the npm registry and the published tarballs
for `eslint-config-next` and `eslint-plugin-jsx-a11y`; and `ixartz/Next-js-Boilerplate` itself.
Nothing here comes from a comparison article or a listicle. Claims that could only be reached
second-hand are marked **unverified**.

> **Exclusion note.** Per this repository's standing constraint, no **earlier** CanonCore or
> Universora repository — anything matching `canoncore*`, `CanonCore*` or `universora*` under any
> account or org — was read, fetched, searched for or quoted. All three research agents reported
> that no such result surfaced. This repository's own `jacobrees-canoncore/CanonCore` is cited
> throughout and is not what the constraint excludes.

## What this produced

Thirteen tickets and five amendments to existing ones. Each is listed here so the document that is
their shared evidence can actually reach them.

| Ticket | What it does | Section below |
| --- | --- | --- |
| [CAN-49](https://linear.app/jacobrees-canoncore/issue/CAN-49) | Fail the build on a missing environment variable | *What v1 does not carry* |
| [CAN-50](https://linear.app/jacobrees-canoncore/issue/CAN-50) | Record the styling decision as an ADR | *What CAN-22 already settled* |
| [CAN-51](https://linear.app/jacobrees-canoncore/issue/CAN-51) | Sentry, because Hobby keeps logs one hour | *Observability* |
| [CAN-52](https://linear.app/jacobrees-canoncore/issue/CAN-52) | `jsx-a11y` at `recommended`, as `error` | *Front-end quality as a gate* |
| [CAN-53](https://linear.app/jacobrees-canoncore/issue/CAN-53) | Security headers, CSP report-only first | *Security posture* |
| [CAN-54](https://linear.app/jacobrees-canoncore/issue/CAN-54) | Dependency and secret scanning | *Security posture* |
| [CAN-55](https://linear.app/jacobrees-canoncore/issue/CAN-55) | A backup past Neon's six-hour window | *Data durability* |
| [CAN-56](https://linear.app/jacobrees-canoncore/issue/CAN-56) | Uptime monitoring and alerting | *Observability* |
| [CAN-57](https://linear.app/jacobrees-canoncore/issue/CAN-57) | Discoverability: sitemap, robots, Open Graph | *The product hole* |
| [CAN-58](https://linear.app/jacobrees-canoncore/issue/CAN-58) | `axe-core` assertions in the E2E suite | *Front-end quality as a gate* |
| [CAN-59](https://linear.app/jacobrees-canoncore/issue/CAN-59) | Decide whether Hobby can carry a public service | *Two platform facts that constrain everything else* |
| [CAN-60](https://linear.app/jacobrees-canoncore/issue/CAN-60) | Lab budgets, react-doctor, field vitals | *Front-end quality as a gate* |
| [CAN-61](https://linear.app/jacobrees-canoncore/issue/CAN-61) | `knip` and Renovate | *Rejected, with reasons* |

The five amendments: CAN-17 (a third test seam), CAN-23 (assert the resolved host), CAN-24 (auth
hardening), CAN-30 (the privacy notice), CAN-32 (what makes its accessibility criteria checkable).

Each ticket cites this document rather than restating it, so **a claim that moves should move
here**. The *Rejected* section near the end is the load-bearing half: it is why several obvious
things are absent from those tickets, and without it each gap reads as an oversight.

## The answer in one paragraph

**v1's feature scope is right and should not grow.** What v1 is missing is not features but the
operational and front-end baseline underneath them. [CAN-22](https://linear.app/jacobrees-canoncore/issue/CAN-22)
landed the workspace on 12 August 2026 ([PR #59](https://github.com/jacobrees-canoncore/CanonCore/pull/59)),
and **nothing below requires undoing any of it** — every item is additive to what that ticket
built. Two platform facts drive the urgency: **Vercel Hobby keeps runtime logs for one hour**, so
without error tracking there is no durable record of any server-side failure; and **Neon's free
plan restores only six hours back**, which is shorter than one night's sleep. Neither is
discoverable from the code.

## Two platform facts that constrain everything else

**Vercel Hobby runtime logs are retained for 1 hour.** Pro is 1 day; 30 days requires the
Observability Plus add-on. Log Drains are Pro-only. Per-request caps are 256 log lines, 256 KB per
line, 1 MB total ([Vercel, runtime logs](https://vercel.com/docs/logs/runtime);
[Hobby plan](https://vercel.com/docs/plans/hobby)). Logs are genuinely queryable while they exist —
filters on route, status, level, requestId, cache and branch — but free-text search is restricted
to `message` and `requestPath`. Treat them as a live tail, never as a record.

**Exceeding a Hobby limit takes the feature offline, it does not bill.** "In most cases, if you
exceed your usage limits on the Hobby plan, you will have to wait until 30 days have passed before
you can use the feature again" ([Hobby plan](https://vercel.com/docs/plans/hobby)). Included usage:
1,000,000 function invocations, 4 CPU-hours Active CPU, 360 GB-hours provisioned memory, 5,000
image transformations, up to 100 GB Fast Data Transfer, 100 deployments/day. **Spend Management is
not available on Hobby**, and configurable usage-notification thresholds are for "Team owners on
the Pro plan" ([Vercel, notifications](https://vercel.com/docs/notifications)). So for a public
site the failure mode is a hard outage with limited warning rather than a surprise bill.

This compounds a risk `docs/infrastructure.md` already records: Hobby "restricts users to
non-commercial, personal use only", and the
[fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines) define commercial usage
as "any Deployment that is used for the purpose of financial gain of anyone involved in any part of
the production of the project" — explicitly including "Asking for Donations". v1 with no payments,
ads or donate button sits inside the line. Adding any of them makes Pro mandatory rather than
optional.

## What v1 does not carry

Checked by grepping every ADR, `CONTEXT.md`, `CODING_STANDARDS.md` and `docs/agents/`. The decision
record contains **no mention at all** of: styling or a design system, accessibility beyond two
OSA-driven lines on the terms page, SEO metadata, error monitoring, analytics, security headers,
rate limiting, performance, dependency scanning, or a unit-test layer.
[ADR-0005](../adr/0005-stack.md) settles the server side and stops there.

### The compliance hole

`content/legal/terms-of-service.md:128` carries `[ ] Link the privacy notice here once it exists
(CAN-30)`, and when this research was done **CAN-30's acceptance criteria did not include writing
one** — a merged document on `main` making a promise nothing in the plan kept.

**Closed on 12 August 2026.** CAN-30 now carries a *The privacy notice, added 12 August 2026* block
whose criteria include replacing that exact placeholder. The requirement itself is unchanged and is
recorded here because the ticket cites it rather than restating it: a privacy notice is required by
UK GDPR Article 13 independently of the Online Safety Act work, and it must name every processor —
Vercel, Neon, Resend, and Sentry once [CAN-51](https://linear.app/jacobrees-canoncore/issue/CAN-51)
adds it.

### The product hole

v1's definition of done is "a stranger opens a URL with no account and reads a chronology the way
they would read a wiki page". Nothing in v1 makes that page discoverable: no `generateMetadata`
beyond defaults, no `app/sitemap.ts`, no `app/robots.ts`, no Open Graph, no JSON-LD. For a product
whose entire thesis is publicly readable Orderings, this is a product gap rather than an ops one.

## Observability

**Error tracking: Sentry, wired through `instrumentation.ts`.** The free Developer plan is 5k
errors, 5M spans, 50 replays, 1 uptime monitor, 1 cron monitor, 5 GB logs, one user
([Sentry pricing](https://sentry.io/pricing/)). Retention on Developer is **30 days** for errors,
spans, replays and attachments, against 90 days for errors on Team
([data retention](https://docs.sentry.io/security-legal-pii/security/data-retention-periods/)).
Retention is stamped at ingest, so upgrading later does not extend data already ingested.

`npx @sentry/wizard@latest -i nextjs` generates `instrumentation.ts` (registering server and edge
configs and exporting `onRequestError` as `Sentry.captureRequestError`), `instrumentation-client.ts`,
`sentry.server.config.ts`, `sentry.edge.config.ts`, `app/global-error.tsx`, and wraps `next.config`
in `withSentryConfig` for source-map upload
([Sentry, Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)).

`onRequestError` is a first-class Next.js hook rather than a Sentry invention, stable since v15.0.0.
Its documented caveat matters for a Server Components app: "The `error` instance might not be the
original error instance thrown, as it may be processed by React if encountered during Server
Components rendering… use `digest` property on an error to identify the actual error type"
([Next.js, instrumentation](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation)).

Two Sentry defaults to change from the wizard's output: `tracesSampleRate: 1` is expensive at any
real traffic, and `sendDefaultPii: true` sends request data from a UGC app to a US processor, which
has to appear in the privacy notice.

**Uptime monitoring.** Sentry Developer includes 1 uptime monitor, intervals from 1 minute to 1
hour, raising an issue "only after three consecutive failures"
([Sentry, uptime](https://docs.sentry.io/product/uptime-monitoring/)). UptimeRobot free is 50
monitors at a 5-minute interval, 1 status page, 3 months of history, email alerts, SMS not included
([UptimeRobot pricing](https://uptimerobot.com/pricing/)). Better Stack free is 10 monitors and
heartbeats, 1 status page, Slack and email alerts
([Better Stack pricing](https://betterstack.com/uptime/pricing)).

One monitor against a `/api/health` route that touches Postgres is roughly fifteen minutes of work
and is the only detector for the two most likely outages: Neon compute suspension on quota
exhaustion, and a Hobby limit tripping. Prefer UptimeRobot or Better Stack over spending Sentry's
single free monitor.

## Security posture

**Vercel supplies HSTS free.** "The `.vercel.app` domain and all subdomains support HSTS by default
and are preloaded in browser HSTS lists. Custom domains also use HSTS." HTTP to HTTPS is a 308, with
TLS 1.2/1.3, OCSP stapling and post-quantum `X25519MLKEM768`
([Vercel, CDN security](https://vercel.com/docs/cdn-security)). Everything else — `nosniff`,
frame-ancestors, `Referrer-Policy`, `Permissions-Policy` — is `next.config` `headers()` and is four
lines of config.

**CSP is the fiddly one, and the standard answer has a real price here.** Next.js's documented
nonce approach generates a nonce in the proxy and sets it on both the request `x-nonce` header and
the response CSP header. The cost is stated in the same document: "**all pages must be dynamically
rendered**… Static optimization and Incremental Static Regeneration (ISR) are disabled… Pages cannot
be cached by CDNs without additional configuration… **Partial Prerendering (PPR) is incompatible**
with nonce-based CSP" ([Next.js, CSP](https://nextjs.org/docs/app/guides/content-security-policy)).

For a public-read site that is the wrong trade: it converts every cached anonymous page read into a
function invocation, against a 1,000,000-invocation and 4-CPU-hour ceiling. Two alternatives are
documented: a static CSP in `next.config` headers using `'unsafe-inline'` for `script-src`, which is
weaker but keeps caching; and **experimental** hash-based CSP via `experimental.sri: { algorithm:
'sha256' }`, which "allows you to maintain static generation while still having a strict CSP".

Ship it report-only first. Vercel's own guidance: "Before enforcing a CSP, start with the
`Content-Security-Policy-Report-Only` header"
([Vercel, security headers](https://vercel.com/docs/cdn-security/security-headers)).

**Rate limiting is available on Hobby, and tightly capped.** DDoS mitigation is on by default. Hobby
gets up to 3 WAF custom rules and up to 3 IP blocks ([Hobby plan](https://vercel.com/docs/plans/hobby)).
WAF rate limiting on Hobby is fixed-window, keyed on IP or JA4 digest, window 10s to 10min,
**1 rule per project**, 1,000,000 allowed requests included, with counters "tracked on a per-region
basis" ([Vercel, WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)).
BotID Basic is "provided free of charge for all plans"; Deep Analysis is Pro-only at $1 per 1000
`checkBotId()` calls ([Vercel, BotID](https://vercel.com/docs/botid)).

Spend the single free rule on `/api/auth/*`.

**better-auth: what it ships, and the one thing to change.** By default it gives scrypt hashing,
8–128 character passwords ([email and password](https://www.better-auth.com/docs/authentication/email-password)),
7-day session `expiresIn` with 1-day `updateAge` and `freshAge`
([session management](https://www.better-auth.com/docs/concepts/session-management)), `httpOnly` /
`sameSite=Lax` / `secure` cookies, CSRF via origin validation and Fetch Metadata, and sign-up email
enumeration protection ([security](https://www.better-auth.com/docs/reference/security)).

Rate limiting is enabled by default in production at 100 requests per 60s globally, with
`/sign-in/email` at 3 requests per 10 seconds. Storage is **memory by default**, with database or
secondary storage as options ([rate limit](https://www.better-auth.com/docs/concepts/rate-limit)).

Vercel Functions are per-invocation isolates, so a memory-backed limiter is per-process and
effectively unenforced in production: an attacker gets a fresh window per cold start. **Move
rate-limit storage to the database.** The mechanism is inference from those two documents rather
than a stated caveat, so treat it as **unverified** — but the fix is cheap and obviously correct
either way. Also raise the password minimum from 8 to 12.

**Secrets and dependencies.** Secret scanning "runs automatically for free" on public repositories,
and push protection for users "Is enabled by default"
([about secret scanning](https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning);
[about push protection](https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection)).
This repository is public, so both apply at no cost. GitHub Free for personal accounts includes
"Dependabot alerts" and 2,000 Actions minutes a month, and "GitHub Actions usage is free for
standard GitHub-hosted runners in public repositories, and for self-hosted runners"
([GitHub's plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)). Socket's free tier is "Unlimited
developers & repos", 1,000 scans/month ([Socket pricing](https://socket.dev/pricing)) and catches
install-script and malware supply-chain attacks that CVE-based scanners structurally cannot.

## Data durability

**Neon's free restore window is 6 hours.** The free plan is 0.5 GB storage per project, 100
CU-hours per project per month, 5 GB public network transfer, 10 branches per project, 1 manual
snapshot, autoscaling to 2 CU, and instant restore over "6 hours, up to 1 GB-month" of change
history. Launch extends this to 7 days and Scale to 30
([Neon plans](https://neon.com/docs/introduction/plans)).

A restore matches the timestamp to an LSN and **completely overwrites** the branch: "Everything on
your current branch, data and schema, is replaced with the contents from the historical source",
affecting all databases on it. The prior state is preserved as `{branch_name}_old_{head_timestamp}`,
and connection strings do not change ([Neon, branch restore](https://neon.com/docs/guides/branch-restore)).

Six hours does not reach the realistic failure, which is not "Neon lost data" but "a bad migration
or a bulk-delete bug ran at 23:00 and I noticed at 09:00". A nightly `pg_dump` to storage outside
Neon, encrypted and retained 30 days, is the honest version, and it also covers account-level loss,
which no in-provider PITR does. The free plan's single manual snapshot is not a substitute.

**Idle and over-limit behaviour.** Scale to zero after 5 minutes of inactivity, fixed and
un-disableable on Free, reactivating "within a few hundred milliseconds"
([Neon, scale to zero](https://neon.com/docs/introduction/scale-to-zero)). Branches older than 14
days and inactive for 24 hours are archived, unarchiving automatically on access
([Neon, branch archiving](https://neon.com/docs/guides/branch-archiving)) — which is how per-PR
preview branches will behave. On exceeding limits: storage exhaustion means "the project is
suspended rather than billed"; CU-hour exhaustion means "the project's compute is suspended until
the next billing period… Existing connections drop"
([Neon, free plan limits](https://neon.com/faqs/free-plan-limits-and-quotas)). Whether a dormant
free project is ever reclaimed is **unverified** — no such statement was found.

0.5 GB is small for user-generated content plus an audit trail, and the audit trail is precisely
the table that grows without anyone noticing. Crossing it makes writes fail with no email warning.

## Front-end quality as a gate

**Core Web Vitals thresholds are unchanged**: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1, at the 75th
percentile of page loads segmented across mobile and desktop
([web.dev, Web Vitals](https://web.dev/articles/vitals)). INP fully replaced FID as a stable Core
Web Vital in 2024 ([web.dev, INP](https://web.dev/articles/inp)). The web.dev page cited above
**enumerates** the Core Web Vitals, and that enumeration is still LCP, INP and CLS as of August
2026 — so "no fourth metric" is positive evidence from a primary source rather than an absence, and
is not marked unverified.

**Two of the three cannot be gated in CI, and the Chrome team says so.** On INP: lab tests "cannot
accurately predict when users will choose to interact with a page, and thus cannot accurately
measure" it — Lighthouse substitutes Total Blocking Time, but "if users wait to interact with the
page until after the JavaScript finishes executing, INP may be very low". On CLS: "CLS measured in
the lab only considers layout shifts that occur above the fold and during load, but this is only a
subset of what CLS actually measures"
([web.dev, lab and field differences](https://web.dev/articles/lab-and-field-data-differences)).

So any claim to "gate on Core Web Vitals in CI" is strictly false. **In CI you gate on bytes and
static analysis, because those are exact. In production you monitor INP and CLS, because that is
the only place they exist.**

**Lighthouse CI is the de-facto standard and is effectively frozen.** `@lhci/cli` v0.15.1 was
published 2025-06-25 ([npm registry](https://registry.npmjs.org/@lhci%2Fcli)) and the last commit to
`main` is `ebee453`, 2025-06-26 (`GET /repos/GoogleChrome/lighthouse-ci/commits/main`) — roughly
fourteen months of no activity — while Lighthouse itself shipped v13.4.1 on 2026-07-20
(`GET /repos/GoogleChrome/lighthouse/releases/latest`). No deprecation notice, and 1,455,527
downloads in the week to 2026-08-09
([npm downloads API](https://api.npmjs.org/downloads/point/last-week/@lhci/cli)). Its assertions support `minScore`, `maxLength` and
`maxNumericValue`, with `median`, `optimistic`, `pessimistic` and `median-run` aggregation
([LHCI configuration](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md)).

Lighthouse's own variability documentation rates four sources of noise as high impact and specifies
"Minimum 2 dedicated cores (4 recommended)", advising against shared-core instances, with "The
median Lighthouse score of 5 runs is twice as stable as 1 run"
([Lighthouse variability](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md)).
GitHub's `ubuntu-latest` runner is a 2-core shared VM: exactly the minimum, and exactly the shared
case they warn against. This is why score-threshold gates flake, and why numeric budgets are the
gate worth having.

**`eslint-config-next` barely lints accessibility.** Unpacking `eslint-config-next@16.3.0`, it does
depend on `eslint-plugin-jsx-a11y@^6.10.0` but enables **only five rules, all as `warn`, all about
ARIA attribute validity**: `aria-props`, `aria-proptypes`, `aria-unsupported-elements`,
`role-has-required-aria-props`, `role-supports-aria-props`. The plugin's own `recommended` config
enables **31 rules as `error`** — 34 are named and three (`anchor-ambiguous-text`,
`control-has-associated-label`, `label-has-for`) are set to `off`, out of 39 rules shipped —
including `alt-text`, `label-has-associated-control`, `click-events-have-key-events`,
`anchor-is-valid`, `html-has-lang` and `iframe-has-title`. Counted from
`eslint-plugin-jsx-a11y@6.10.2`; corrected from 29 by
[frontend-design-scope.md](frontend-design-scope.md) →
*Where both planned gates stop, and it is short of the design*. The
Next.js ESLint documentation omits jsx-a11y from its stated plugin list entirely
([Next.js, ESLint](https://nextjs.org/docs/app/api-reference/config/eslint)). Note also that `next lint` was
removed in Next 16 — the same page's version table records `v16.0.0`: "`next lint` and the `eslint`
next.config.js option were removed in favor of the ESLint CLI", with a codemod offered to migrate.

**Enable `jsx-a11y` at `recommended` and `error` explicitly.** The default catches essentially
nothing anyone cares about, and warns rather than fails.

**Automated accessibility coverage is 57.38% by issue volume, and 16 of 50 criteria.** Deque, across
13,000+ pages and ~300,000 issues, measured axe-core finding 57.38% of total issues. The same page
confirms the by-criteria number rather than refuting it — "we found automated issues for 16 out of
the 50 Success Criteria under WCAG 2.1 Level AA. This supports the 20 to 30% automated coverage
claims that many experts claim today" — and disputes only what that number is taken to measure:
"this definition does not accurately reflect the number of issues found in testing real web pages"
([Deque, coverage](https://www.deque.com/automated-accessibility-testing-coverage/)). So the ~30%
folklore is the by-criteria number, and it is Deque's own number; its argument is that issue volume
predicts remediation effort better, not that the count is wrong. Both tools disclaim themselves:
Playwright notes "many accessibility problems can only be discovered through manual testing"
([Playwright, accessibility testing](https://playwright.dev/docs/accessibility-testing)).

**Vercel field data on Hobby.** Speed Insights: 1 project, 10,000 events/month, 7-day window; past
the cap "recording pauses until next day"; Pro is $10/project/month plus $0.65 per 10k events for a
30-day window ([Speed Insights limits](https://vercel.com/docs/speed-insights/limits-and-pricing)).
Web Analytics: 50,000 events/month, 1-month window, no custom events
([Analytics limits](https://vercel.com/docs/analytics/limits-and-pricing)). Speed Insights is the
only place real INP and full-session CLS exist, so it complements a lab gate rather than competing
with it.

### react.doctor

Published by Million Software, Inc. (`million.dev`), repo `millionco/react-doctor`, 14,356 stars
(`GET /repos/millionco/react-doctor`). `react-doctor@0.9.11` is latest; the package was **created
2026-02-13** and has shipped **751 versions** since
([npm registry](https://registry.npmjs.org/react-doctor)), at 1,501,689 downloads in the week to
2026-08-09 ([npm downloads API](https://api.npmjs.org/downloads/point/last-week/react-doctor)).
Genuinely popular, still pre-1.0, churning fast.

Those last three figures are the most perishable thing in this document — the star count and version
count both moved between the research and the commit that landed it. Read them as "this order of
magnitude on 12 August 2026", not as current.

**It is static analysis only** — 825 active rules across "state and effects, performance,
architecture, security, and accessibility", plus dead-code and supply-chain checks
([what is react-doctor](https://www.react.doctor/docs/overview/what-is-react-doctor.md)). No
browser, no page load. Its "performance" category is lint rules about React render behaviour, so
**it does not measure Core Web Vitals and is not a Lighthouse substitute.**

Its runtime dependencies include `oxlint`, `eslint-plugin-react-hooks@^7.1.1` (the release carrying
the React Compiler lint rules), `oxlint-plugin-react-doctor`, `deslop-js` and `@sentry/node`, and
its accessibility rules are name-for-name the `jsx-a11y` set with additions. So it is a curated
aggregation over oxlint plus react-hooks v7 plus a jsx-a11y reimplementation, with genuinely new
rules on top and a much better PR surface. Not vapour; not original either.

Two things the marketing does not lead with. The GitHub Action's `blocking` input **defaults to
`none`** and `scope` to `changed`, so out of the box it comments rather than gates. And **the
0-100 score is computed remotely**: "The `score` output is empty in offline mode, or when the score
API is unreachable" ([Action reference](https://www.react.doctor/docs/reference/github-action-reference.md)).
Gate on `error-count`, never on `score`.

Licensing is "Modified MIT": free for most uses, but "AI training and large-scale commercial use
require a written license". The pricing page lists Open Source at $0 with "GitHub actions (personal
use)" and Team at $30/month for "Business & commercial use"
([licence](https://www.react.doctor/docs/legal/license.md), [pricing](https://www.react.doctor/pricing)).
This repository is public and MIT-licensed, and Vercel Hobby already requires non-commercial use,
so the $0 tier applies as things stand.

### What to gate on, and what not to

Gate, because each is deterministic and exact:

| Gate | Asserts | Cost |
| --- | --- | --- |
| `jsx-a11y` at `recommended`, as `error` | 31 static a11y rules | ~0, folds into the lint job |
| `@axe-core/playwright` with `wcag2a`/`wcag2aa`/`wcag21a`/`wcag21aa`/`wcag22aa` tags, asserting zero violations | the 57.38% automation can find, plus `target-size` — the one rule any WCAG 2.2 tag reaches | 1–2 CI minutes, Playwright already runs |
| A bundle-size budget as `error` | first-party JS bytes | seconds; the highest-signal performance gate |
| `react-doctor` Action with `blocking: error`, `scope: changed`, gating `error-count` | React correctness, hooks, security lint on the diff | ~1 minute; pin the version |
| LHCI with `numberOfRuns: 5`, `aggregationMethod: "pessimistic"`, `maxNumericValue` budgets on LCP and TBT | lab load metrics as absolute budgets | 4–8 CI minutes per PR |

Do not gate:

- **Lighthouse performance *score*** (`categories:performance: minScore`). A weighted composite over
  noisy metrics, run on the shared 2-core box Lighthouse's own docs advise against. Set it to `warn`
  and gate individual numeric budgets instead: same tool, a fraction of the flake.
- **`preset: "lighthouse:recommended"` as shipped.** It asserts near-perfect scores on every
  non-performance audit and fails on day one for reasons nobody will fix, which teaches you to
  ignore red. Start from `off` and opt in.
- **Lighthouse's accessibility category.** It is axe-core underneath, re-run through the noisy lab
  harness. Gate axe directly.
- **INP and real CLS "in CI".** Not possible; monitor in Speed Insights.
- **react-doctor's `score`.** Remote-computed and unreproducible offline.
- **Bundle *analyzers*.** `next experimental-analyze` and `@next/bundle-analyzer` have no assertion
  mechanism. They explain why a budget broke; they cannot be the budget.

## UK PECR, and why a cookie banner is probably not needed

The ICO's finalised guidance on storage and access technologies, updated for the Data (Use and
Access) Act, lists **five** exceptions rather than two. Alongside 'communication' and 'strictly
necessary' there is now a **'statistical purposes' exception**, applying where storage or access is
"for the sole purpose of collecting statistical information about visitors to your service, with a
view to improving it… (also known as the 'analytics' exception)"
([ICO, what are the exceptions](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/)).

Two conditions attach: "clear and comprehensive information about your use of the technology" and
"an easy way to object to this use" — and the guidance is explicit that "If you don't, you won't be
using those exceptions correctly." Auth session cookies sit in 'strictly necessary'; the ICO's own
example is "Identifying a user once they have logged in to an online service for the duration of
their visit."

Two further points that bind. PECR's "rules on storage and access apply to any 'information' —
they're not limited to personal data", and where PECR requires consent you cannot substitute
legitimate interests ([ICO, fact vs fiction](https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2025/09/fact-vs-fiction-ico-debunks-myths-on-storage-and-access-technologies/)).

Vercel's own analytics are cookieless but not consent-irrelevant. Web Analytics works "without using
any third-party cookies, instead end users are identified by a hash created from the incoming
request", discarded after 24 hours, collecting timestamp, URL, referrer, geolocation, OS, browser
and device type ([Analytics privacy](https://vercel.com/docs/analytics/privacy-policy)). Because
PECR governs *access to* information on the device and the ICO says the rules cover "device
fingerprinting, where they involve storage or access", the defensible position is the statistical
purposes exception — which is why the information-plus-objection duty is not optional.

**So: a privacy policy section plus an opt-out link, and no consent modal.** The exception is
narrow and dies the moment analytics data is used for anything beyond improving the service.

One operational note: Vercel warns that "automatic page view tracking may track personal
information" in URLs. For this product that means Ordering slugs and author names, so `beforeSend`
redaction is required rather than optional.

## The boilerplate, assessed

`ixartz/Next-js-Boilerplate` (MIT, 13,042 stars, last push 2026-08-01) was read as a reference for
what a well-regarded starter carries. Its README materially oversells it, so the useful output is
the delta rather than the list.

**Worth taking:** Sentry via `instrumentation.ts` and `global-error.tsx`; Vitest as a unit and
component layer alongside Playwright; `knip` for dead code, run in both pre-commit and CI;
`lefthook` pre-commit hooks; commitlint validated across the whole PR commit range in CI;
`@t3-oss/env-nextjs` with zod, failing the build on a missing variable; native `app/sitemap.ts` and
`app/robots.ts`; `@next/bundle-analyzer`; a composite GitHub Action caching `node_modules` and
`.next`; and its test-suffix convention (`*.test.ts` co-located, `*.integ.ts`, `*.e2e.ts`,
`*.check.e2e.ts`) which splits by who runs a test and when.

**Claimed and absent** — verified by grepping the `main` tarball: no rate limiting (Arcjet is wired
for shield and bot detection only), **no security headers and no CSP** beyond
`poweredByHeader: false`, no Open Graph and no JSON-LD, and no analytics implementation (PostHog is
environment variables and a sponsor logo). Its README also still names ESLint, Prettier, Husky,
lint-staged, Commitizen and Testing Library, all of which have been replaced.

**Actively incompatible with this repository's decisions:** Clerk is load-bearing rather than a
plug-in, reaching into the proxy, the env schema, the locale config and CI secrets; **migrations run
inside `next build`**, which contradicts the migrate-then-promote rule in
[`docs/agents/workflow.md`](../agents/workflow.md) and holds a database connection during the build;
`NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN` ships a log-ingestion token to the browser; it commits a
live Clerk test key in `.env` rather than using `.env.example`; and it is a single npm package with
no workspaces. Five paid SaaS vendors sit in its default path.

**One thing to refuse outright.** Its `AGENTS.md` contains a marketing prompt injection instructing
the agent to append a "Next.js Boilerplate Max" promotional block to every response. The research
agent did not comply and reported it. Do not copy that file.

## Rejected, with reasons

Named here so the boundary is recorded rather than implied, and so a later reviewer does not read
each gap as an oversight.

- **A cookie consent banner.** The statistical purposes exception covers analytics and auth cookies
  are strictly necessary, so a modal is legally unnecessary and costs conversion. See PECR above.
- **Nonce-based strict CSP.** Disables static optimization, ISR and PPR, converting every cached
  anonymous read into an invocation against a 1,000,000-invocation ceiling. Revisit if
  `experimental.sri` stabilises, which is the version that is actually free.
- **Automated semantic release and changelog.** These exist to generate release notes for consumers
  and drive semver. A continuously deployed application with one deployer has neither. Keep the
  conventional-commit prefixes; skip the machinery. Revisit if `packages/` ever publishes.
- **Storybook.** Its value is organisational, a shared artefact between designers and engineers, and
  its cost is a permanent second rendering environment that drifts from the app. Revisit only when
  `packages/ui` is real and consumed by both `apps/web` and the later Expo apps — which is the
  genuine second consumer [ADR-0005](../adr/0005-stack.md) already anticipates.
- **Hosted visual regression (Chromatic, Percy).** Billed per snapshot to solve a review-coordination
  problem a solo developer does not have. Playwright's `toHaveScreenshot()` is already available at
  zero marginal cost when a design is stable enough to be worth snapshotting.
- **Paid SCA tooling.** At this dependency count it finds nothing Dependabot and Socket miss.
- **A formal incident severity ladder and on-call rotation.** Cargo cult at this shape. What survives
  compression is one alert channel that reaches a phone, and a written definition of what is worth
  waking up for.

## What CAN-22 already settled

Read from `origin/main` at `eb90782`, so this is what exists rather than what was planned. The
research itself was done against `19223b0`; CAN-45 (Neon preview branching) and CAN-46 (stale
assertions in the PR skills) landed in between and change nothing below.

**A third test seam, which the spec did not call for.**
[CAN-17](https://linear.app/jacobrees-canoncore/issue/CAN-17) settled on exactly two seams —
Playwright over HTTP, and the database as the application role — and the cost it did not price is
feedback latency, since every assertion about a pure function would route through a browser and a
database. CAN-22 shipped `vitest` with `@testing-library/react` and `jsdom` alongside Playwright,
which is the industry-standard shape and resolves that concern.

**Closed on 12 August 2026.** CAN-17 now carries *Amended 12 August 2026: three seams, not two* and
a Seam C section describing what the unit seam is for and, importantly, what it cannot cover — a
unit test runs in process against no database, so the per-table cross-tenant obligation under Seam
B is untouched by it.

**A fourth CI command.** `.github/workflows/ci.yml` runs `pnpm -r build` after the three the ticket
named, on the reasoning that `next build` fails on things the other three cannot see. Correct, and
worth keeping.

**Metadata groundwork.** `apps/web/src/app/layout.tsx` already sets `metadataBase`, `title` and
`description` from `@canoncore/config`, and deliberately sets `robots: { index: false, follow: false }`
while the site is a holding page. The SEO work below is therefore *lifting* that flag and adding
`sitemap.ts`, `robots.ts` and Open Graph, not starting from nothing.

**Styling was decided by default rather than by decision.** `apps/web/src/app/globals.css` is
hand-written CSS with custom properties and a `prefers-color-scheme` dark variant — no framework,
no component library. That is very likely the right answer under this repository's principles, and
it is the one significant stack choice with no ADR behind it. Record it before something
relitigates it; the `vercel:shadcn` and `vercel:next-forge` skills both propose otherwise.
