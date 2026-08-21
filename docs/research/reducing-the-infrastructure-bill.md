# Reducing the infrastructure bill

**Researched 21 August 2026**, the day the Vercel plan moved to Pro
([ADR-0024](../adr/0024-vercel-pro-for-a-spend-cap-rather-than-an-outage.md)) and the day every Neon
compute moved from a fixed 1 CU to autoscaling 0.25–1 CU. The question: **what is left to cut, and
what does each cut cost in capability?**

Every price, limit and plan boundary below was read on that date from the page that owns it —
Vercel's docs, Neon's docs, UptimeRobot's pricing and API specification, Resend's and Sentry's own
pages, and the Verisign and Namecheap whois. Every figure about *this* estate was read from a live
API on the same date, and the read is named beside it. Nothing here comes from a blog, a comparison
article or a summary. Claims that could not be reached from a primary source say **not established**
rather than carrying an estimate.

**Out of scope by decision, not by omission.** Moving off Neon or off Vercel
([ADR-0005](../adr/0005-stack.md)), the Vercel Pro $24 a month
([ADR-0024](../adr/0024-vercel-pro-for-a-spend-cap-rather-than-an-outage.md)), and anything that
restores per-deployment preview branching ([ADR-0023](../adr/0023-one-shared-schema-only-preview-branch.md)).

> **Four things below were settled hours after this was written, and it has deliberately not been
> rewritten to hide that.** A research document is evidence of what was known at a moment; edited to
> match the outcome, it stops being able to show what the outcome was chosen *against*.
> [ADR-0026](../adr/0026-the-database-bill-is-watched-rather-than-capped.md) is the decision and
> supersedes this file wherever the two differ.
>
> - **"One dashboard edit settles it"** — it did. UptimeRobot Free *does* offer intervals longer
>   than five minutes (15s, 30s, 1m, 5m, 30m, 1h, 12h, 24h, with only the sub-five-minute options
>   paid), and the monitor now runs **hourly**. Anywhere this file marks that **not established**,
>   it now is.
> - **Rank 1's "requires confirming Free allows it"** — confirmed, and done.
> - **`Observability Plus`, ranked 5 as "probably keep it and document it"** — that recommendation
>   was **overruled** and the add-on was switched off. ADR-0026 → *What else changed* holds why.
> - **The Neon consumption quota is not available**, and this file is silent on it rather than
>   wrong about it — it was researched as a cost question, and the quota is a control question. The
>   correction is recorded here because this is where somebody looking for levers will land:
>   `PATCH /projects/{id}` with `settings.quota` is refused for a Vercel-managed organisation with
>   `HTTP 404 — action restricted`. Established by attempting it, after this file was written.

## Contents

- [The answer in one paragraph](#the-answer-in-one-paragraph)
- [What the estate actually costs, measured](#what-the-estate-actually-costs-measured)
- [Question 1: cutting the duty cycle](#question-1-cutting-the-duty-cycle)
- [Question 2: the Neon Free plan through the Vercel Marketplace](#question-2-the-neon-free-plan-through-the-vercel-marketplace)
- [Question 3: the other billable line items](#question-3-the-other-billable-line-items)
- [Question 4: the history window, quantified](#question-4-the-history-window-quantified)
- [Ranked, with what each one costs](#ranked-with-what-each-one-costs)
- [What could not be established](#what-could-not-be-established)

## The answer in one paragraph

**The bill is a duty cycle, and the duty cycle is one number in a dashboard nobody has changed
yet.** The database compute is awake **63.8% of wall clock** (measured), because a monitor asks a
question every 5 minutes and Neon's idle timer is also 5 minutes. **Lengthening that one interval to
an hour takes the Neon compute bill from about $12.58 a month to about $1.64** — and it is the only
option here that costs no money, no code and no new machinery. Everything else is worse: **Neon's
own documentation puts the configurable idle timeout on the Scale plan only**, and buying Scale to
get a 1-minute timeout would double the CU-hour rate for a net saving of about $2 a month while also
doubling `waveger`'s rate; **caching `/` saves nothing at all** once the monitor is repointed at
`/api/health`, which is the outstanding step it is waiting on; and **the Neon Free plan is genuinely
on offer through the Marketplace and would take the database bill to $0**, but only after the duty
cycle is already cut, and it reintroduces exactly the failure mode ADR-0024 spent $24 a month to
remove. Separately, three Vercel line items nobody chose are live on this team, and one of them —
**Observability Plus, switched on by default at the moment of the Pro upgrade** — is a usage-based
add-on that Spend Management explicitly does not bound.

## What the estate actually costs, measured

All read live on 21 August 2026 through the `neon` MCP (`describe_project`, `list_branch_computes`)
and the Vercel REST API with the CLI's own token.

| Neon compute | Size | Active time in the period | CU-hours | At $0.106/CU-h |
| --- | --- | --- | --- | --- |
| `canoncore` / `main` | was fixed 1 CU, now 0.25–1 | 612,900 s = 170.25 h | 170.2 | **$18.04** |
| `canoncore` / `preview` | was fixed 1 CU, now 0.25–1 | 8,096 s = 2.25 h | 2.25 | $0.24 |
| `canoncore` / two `wt-probe-can-138*` branches | 0.25 fixed | 624 s | 0.04 | $0.005 |
| `waveger` / `main` | 1 CU fixed | 32,144 s = 8.93 h | 8.93 | $0.95 |

**The duty cycle is measured, not inferred.** `canoncore`'s `main` branch was created
`2026-08-10T11:16:19Z` and read back at `2026-08-21T14:05:52Z`: 960,573 seconds of wall clock
against 612,900 seconds of `active_time_seconds`. **63.8%.** `waveger`'s equivalent, over
`2026-08-06T19:53:53Z` to `2026-08-21T14:15:08Z`, is **2.52%** — and the difference between the two
projects is that nothing polls `waveger` every five minutes.

**The compute really was running at 1 CU, and Neon's own formula proves it.** *"Divide
`compute_time_seconds` by this value to get your average compute size in CUs"*
([Neon, usage and cost calculations](https://neon.com/docs/introduction/usage-calculations), read
21 August 2026). For `canoncore`/`main` that is 612,838 ÷ 612,900 = **0.9999 CU**. The same division
tomorrow is how you check that today's change to autoscaling 0.25–1 actually parked the average at
the 0.25 floor rather than somewhere above it.

**Arithmetic conventions used throughout.** Neon *"defines a billing month as exactly 744 hours
(31 x 24) … regardless of how many days the calendar month has"* (same page), so every monthly
projection below is `744 h × duty × CU size × $0.106`. The Launch compute rate, storage rate and
instant-restore rate were confirmed twice: on
[Neon's plans page](https://neon.com/docs/introduction/plans) and from the **live Vercel Marketplace
plan record** for this installation, which returns `launch_v3` with
`"Compute time": "$0.106 per CU-hour"` and `"Storage": "$0.35 per GB-month"`
(`GET /v1/integrations/integration/neon/products/neon/plans`, read 21 August 2026).

> **One figure does not reconcile, and it is named rather than smoothed over.** The Vercel dashboard
> reports Compute 175 hours and Total Spent **$26.28** for 1 August – 1 September. 175 CU-hours at
> $0.106 is **$18.55**, and the four computes above sum to $19.23 of compute plus about $0.02 of
> storage. The remaining ~$7 is **not established** from any read available here. Settling it needs
> Neon's consumption API, which *"requires a paid plan"* and a `NEON_API_KEY` — and
> [`docs/infrastructure.md`](../infrastructure.md) records that this project deliberately holds no
> Neon API key. Treat $26.28 as the number to reconcile, not as a number this document explains.

## Question 1: cutting the duty cycle

### The mechanism, stated plainly

`/` is `export const dynamic = "force-dynamic"` and reads Stories through the pool on every request
([`apps/web/src/app/page.tsx`](../../apps/web/src/app/page.tsx)). UptimeRobot sends a `HEAD` to
`https://www.canoncore.com` every 5 minutes ([`docs/infrastructure.md`](../infrastructure.md) →
*Uptime monitoring: UptimeRobot*). Neon suspends *"after an inactive period of 5 minutes"*
([Neon, scale to zero](https://neon.com/docs/introduction/scale-to-zero), read 21 August 2026).
**The poll interval and the idle timeout are the same number**, so each poll restarts the clock and
the compute mostly never sleeps. Measured 63.8% rather than 100% because the two clocks drift
against each other and one sometimes wins.

**Repointing the monitor at `/api/health` does not change this, and that is the point of the
route.** `/api/health` opens a transaction and runs `select 1` deliberately — *"Here the dependency
is the thing being checked rather than a side effect of it"*
([`route.ts`](../../apps/web/src/app/api/health/route.ts)). So the outstanding repoint is
cost-neutral: it moves the wake-up from one route to another. **The interval is the lever, not the
route.**

### Priced, at 0.25 CU and 744 hours

| # | Change | Duty | CU-hours/mo | Neon compute/mo | Saving vs today |
| --- | --- | --- | --- | --- | --- |
| S0 | **Today**: 5-min poll, 5-min timeout | 63.8% | 118.7 | **$12.58** | — |
| S1 | 30-minute poll | 16.7% | 31.0 | **$3.29** | **$9.29** |
| S2 | 60-minute poll on the DB check | 8.3% | 15.5 | **$1.64** | **$10.94** |
| S3 | Neon **Scale**, 1-min timeout, 5-min poll | 20.0% | 37.2 | $8.26 at $0.222 | $4.32 gross, **$2.15 net** |
| S4 | Neon **Free** (whole installation) | any | ≤100 or suspended | **$0.00** | **$14.57** including `waveger` |
| S5 | Disable scale to zero *(the trap)* | 100% | 186.0 | $19.72 | **−$7.14** |

Worked example for S2, which is the recommendation: one poll an hour wakes the compute, the compute
stays up for the 300-second idle timer and then suspends, so 300 s of every 3,600 s is active =
8.33%. `744 × 0.0833 = 62.0` active hours; `62.0 × 0.25 CU = 15.5` CU-hours; `15.5 × $0.106 =
$1.64`. S1 is the same sum with 300 s of every 1,800 s.

S3's net figure is why it loses: the Scale rate applies to the whole installation, so `waveger`'s
18.75 CU-hours a month go from $1.99 to $4.16, and `$12.58 − $8.26 − $2.17 = $2.15`.

**S5 is named because it will be suggested.** Neon's plans page lists Launch as *"After 5 min, can
be disabled"*, and disabling scale to zero is the one idle-behaviour control Launch actually has. It
makes the bill worse, and it also creates a maintenance obligation: *"If you disable scale to zero
entirely, your compute will remain active, and you will have to manually restart your compute to
pick up the latest updates to Neon's compute images"*
([Neon, scale to zero guide](https://neon.com/docs/guides/scale-to-zero-guide), read 21 August 2026).

### Can UptimeRobot Free poll less often than every 5 minutes?

**The register's claim that Free is "fixed at a 5-minute interval" is not what UptimeRobot's own
sources say.** Everything published in prose gates the interval as a *floor*, and the API contract
says so explicitly.

- The pricing page's comparison row *Monitoring interval* reads **"5 minutes"** for Free, **"60
  seconds"** for Solo, **"30 seconds"** for Team, **"15 seconds"** for Scale
  ([UptimeRobot pricing](https://uptimerobot.com/pricing/), read 21 August 2026). The plan card
  carries `"label":"5 min. monitoring interval"`.
- The help centre: *"The monitoring interval refers to the frequency at which UptimeRobot sends
  requests to your monitors … The interval varies depending on the plan you've subscribed to"*,
  then *"Free Plan: Monitoring occurs every 5 minutes"*
  ([What is a monitoring interval](https://help.uptimerobot.com/en/articles/11360876-what-is-a-monitoring-interval-in-uptimerobot),
  read 21 August 2026).
- **The v2 API calls the plan value a minimum in so many words**: `account>monitor_interval` is
  *"the min monitoring interval (in seconds) supported by the account"*
  ([UptimeRobot API v2](https://uptimerobot.com/api/v2/), read 21 August 2026). The same page
  documents `monitor>interval` as *"the interval for the monitoring check (300 seconds by default)"*
  and its own sample `getMonitors` response contains `"interval": 900` — a 15-minute monitor.
- **The v3 OpenAPI specification carries a minimum and no maximum.** Every create-monitor schema
  declares `interval: { type: number, example: 60, minimum: 30 }`, and the update schema declares
  `minimum: 15` with the only ceiling being a prose note that *"Heartbeat monitors support at most
  2678400 seconds (31 days)"*
  ([cdn.uptimerobot.com/api/openapi.yaml](https://cdn.uptimerobot.com/api/openapi.yaml), read
  21 August 2026, the spec `https://uptimerobot.com/api/v3/` renders).

**Verdict: a longer interval is almost certainly selectable on Free, and no page states it in
prose, so it is recorded as strongly evidenced rather than established.** The gated capability is
named `high-speed-monitoring` in UptimeRobot's own dashboard bundle, and its upsell fires only for
intervals *faster* than the plan allows — the behaviour of a floor. **It is settled by a
thirty-second experiment**: open monitor `803731762`, change the interval, save. If the selector
refuses, fall back to the split check below. Nothing here can run that experiment — the account
signs in with Google and *"Both keys on Integrations & API, main and read-only, are
un-generated"* ([`docs/infrastructure.md`](../infrastructure.md) → *Uptime monitoring*).

Two further Free-plan facts that bear on the design, both from primary sources:

- **Threshold and recurrence stay unavailable.** *"As the threshold and recurrence is only
  available in the paid plans, they are always 0 in the Free Plan"* (API v2, and the same sentence
  appears against `assignedAlertContacts` in the v3 OpenAPI). This is why `databaseAnswers` asks
  three times, and lengthening the interval does not disturb that.
- **A long outage is re-checked more slowly than the configured interval.** *"If a monitor stays
  down for an extended period, UptimeRobot gradually spaces out the re-checks"*
  ([help centre](https://help.uptimerobot.com/en/articles/11360876-what-is-a-monitoring-interval-in-uptimerobot),
  read 21 August 2026) — which is a small point in favour of a longer interval costing less
  detection than it looks like it does.

### Vercel Cron Jobs as the hourly database check

**Included on every plan, billed as an ordinary function, and Pro can go to once a minute.**

> *"Cron jobs are included in all plans."* … *"Cron jobs invoke Vercel Functions. This means the
> same usage and pricing limits will apply."*
> ([Vercel, cron jobs usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing), read
> 21 August 2026)

The same page's table: Pro is **100 cron jobs per project**, minimum interval **once per minute**,
scheduling precision **per-minute** (Hobby is once per day and ±59 minutes). *"For all other teams,
cron jobs will be invoked within the minute specified"*
([manage cron jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs), read 21 August 2026).
*"The timezone is always UTC"* ([cron jobs](https://vercel.com/docs/cron-jobs)), and a cron *"makes
an HTTP GET request to your project's production deployment URL"* — production only.

**Cost of an hourly cron, computed at lhr1 rates.** 744 invocations a month at *"$0.60 per
1,000,000 Invocations"* is **$0.00045**. Active CPU in London is **$0.177/hour** and Provisioned
Memory **$0.0146/GB-hour**
([functions usage and pricing](https://vercel.com/docs/functions/usage-and-pricing);
[lhr1 regional pricing](https://vercel.com/docs/pricing/regional-pricing/lhr1), both read
21 August 2026) — and Vercel *"bills Active CPU only while your code is actually running. If the
request is waiting on I/O, CPU billing pauses"*, which is nearly all of what a `select 1` does. Even
budgeting a full CPU-second per run, that is `744 s = 0.207 h × $0.177 = $0.037`. **Under $0.05 a
month, and it draws on the $20 usage credit rather than adding to the bill.**

**But a cron is not an alert.** *"Vercel will not retry an invocation if a cron job fails"*, and
delivery is best-effort: *"Cron job delivery is best effort. Most invocations run as scheduled, but
occasional transient network errors can prevent a request from reaching your function … Cron
delivery can also occasionally invoke the same scheduled run more than once"* (manage cron jobs).
Nothing in that reaches a phone. So a cron-based design needs a receiver that notices *absence* —
Sentry Developer includes **1 cron monitor** and **1 uptime monitor** free
([Sentry pricing](https://sentry.io/pricing/), read 21 August 2026), and ADR-0018 deliberately left
the uptime one unspent. **A cron plus a dead-man's-switch check-in is more moving parts than a
changed number in a dropdown, for the same saving.** It is the fallback, not the recommendation.

### Next.js: can `/` stop hitting Postgres while `/api/health` still does?

Read from the documentation shipped inside the installed package, `next@16.3.0`, at
`apps/web/node_modules/next/dist/docs/` — which is the copy that matches this project.

**Honest answer: yes for signed-out visitors only, at a real cost, and it saves nothing on this
bill.**

- **Row-level security makes the page's content a function of the session, and the code says so.**
  *"Row-level security decides what this page contains from the session user set inside the
  transaction, so a build-time render would be a render for nobody"*
  ([`page.tsx`](../../apps/web/src/app/page.tsx)). The page has no `where` clause; the policy is the
  filter. A cached render is therefore a render for exactly one identity.
- **`force-static` would make it correct only by making everyone anonymous.** The option *"forces
  [`cookies`](/docs/app/api-reference/functions/cookies), `headers()` and `useSearchParams()` to
  return empty values"* (`02-guides/caching-without-cache-components.md`). Applied here that means
  `readViewer()` always resolves to nobody, so a signed-in reader would be served the signed-out
  page. That is not a caching trade-off; it is deleting the signed-in path.
- **`export const revalidate = n` (ISR) does not rescue it.** It sets *"the default revalidation
  time for a layout or page"*, but a page that reads cookies is dynamic regardless, so the ISR
  entry would never be produced.
- **Cache Components cannot hold the session read either.** *"Cached functions and components
  **cannot** access runtime APIs like `cookies()`, `headers()`, or `searchParams`, and the
  restriction follows the call stack"* (`03-api-reference/01-directives/use-cache.md`). The
  documented pattern is to read the cookie outside and pass the value in — which gives a
  **per-user** cache entry holding RLS-filtered rows in a shared server cache, a security decision
  rather than a performance one.
- **`use cache: private` is the obvious-looking answer and is the wrong one.** *"results are
  **never stored on the server**, they're cached only in the browser's memory and do not persist
  across page reloads"*, and *"Because this directive accesses runtime data, the function executes
  on every server render"* (`03-api-reference/01-directives/use-cache-private.md`). A monitor's
  `HEAD` gets no browser memory, so the database is hit every time regardless.
- **And enabling Cache Components would delete the guard that is there now.** Next's own version
  table: `v16.0.0` — *"`dynamic`, `dynamicParams`, `revalidate`, and `fetchCache` removed when Cache
  Components is enabled"* (`03-api-reference/03-file-conventions/02-route-segment-config/index.md`).
  `cacheComponents` is not set in [`next.config.ts`](../../apps/web/next.config.ts) today, so
  `export const dynamic = "force-dynamic"` is doing real work and would have to be replaced.

**The decisive point is commercial, not technical.** Web Analytics reports **2 visitors and 6
pageviews** for 21 August 2026 (`get_web_analytics`, read that day). Organic traffic is not what is
waking the database — a monitor is — and after the repoint the monitor will be asking a route whose
entire purpose is to touch Postgres. **Caching `/` is worth doing for latency when the front page
grows; it is worth $0.00 against this bill.**

### The Neon lever: can the idle timeout go below 5 minutes on Launch?

**No. Neon's own guide puts threshold configuration on the Scale plan, and says so in a table.**

> | Plan | Scale to zero after | Can be disabled? |
> | Free plan | 5 minutes | |
> | Launch | 5 minutes | ✓ |
> | Scale | Configurable (1 minute to always on) | ✓ |
>
> *"Paid plans permit disabling scale to zero. On the Scale plan, you can configure the scale to
> zero threshold."*
> ([Neon, configuring scale to zero](https://neon.com/docs/guides/scale-to-zero-guide), read
> 21 August 2026)

The same statement appears three more times in Neon's own documentation, which is why this is
treated as settled rather than as one page's wording: the
[plans overview table](https://neon.com/docs/introduction/plans) row *Scale to zero* reads
`After 5 min` / `After 5 min, can be disabled` / `Configurable (1 minute to always on)`; the same
page's *Scale to zero* section repeats it; and its FAQ answers *"Can I disable scale-to-zero?"* with
*"Launch: Yes, you can disable it. Scale: Yes, fully configurable (1 minute to always-on)."*

**The API's own bounds are wider than the plan's, and that is the trap.** The guide documents
`suspend_timeout_seconds` as *"The minimum setting is 60 seconds"* and *"The maximum setting is
604800 seconds (1 week)"*, with the default 300. So a `PATCH` looks available. **Whether the API
enforces the plan gate was not tested, because testing it is a write to a live Neon project and this
research is read-only** — recorded as not established rather than assumed either way. The live read
confirms the current state: both real computes report `suspend_timeout_seconds: 300`, and the
transient probe branches report `0`, meaning they inherit the project default
(`list_branch_computes`, read 21 August 2026).

**So the single best-looking answer in the brief is closed off**, and the arithmetic says it would
not have been worth it anyway: S3 above nets about $2.15 a month while doubling the compute rate on
both databases.

## Question 2: the Neon Free plan through the Vercel Marketplace

### It is offered, and the live API says so

`GET /v1/integrations/integration/neon/products/neon/plans` on this team, read 21 August 2026,
returns exactly three plans:

| `id` | `name` | `scope` | `paymentMethodRequired` | Compute detail as Vercel states it |
| --- | --- | --- | --- | --- |
| `free_v3` | Free | `installation` | `false` | `100 CU-hours per project` |
| `launch_v3` | Launch *(current)* | `installation` | `true` | `$0.106 per CU-hour` |
| `scale_v3` | Scale | `installation` | `true` | `$0.222 per CU-hour` |

Free's description in Vercel's own record is *"Neon's generous free tier, no credit card
required."*, with `Storage: 0.5 GB per project`, `Maximum projects: 100`, `Sizes up to: 2 CU, 8 GB
RAM`.

### A plan change hits `waveger` too, and this is established twice over

**From Neon's documentation**, on the Vercel-managed integration:

> **"Storage → Settings → Change Configuration** lets you resize compute, adjust scale-to-zero, or
> switch Neon plan tiers. Changes apply to *all* databases in the installation."
>
> **"Important:** Changing your plan affects **all databases** in this integration, not just the
> current one."
> ([Neon, Vercel-Managed Integration](https://neon.com/docs/guides/vercel-managed-integration), read
> 21 August 2026)

**From the live estate**, two independent reads: every plan the Marketplace offers for Neon carries
`"scope": "installation"` (above), and `vercel integration list --all` shows **both** `canoncore`
(`store_ft1xdGxeaZQCEbN7`) and `waveger` (`store_xCNwLtRIQVOBig87`) under the **same** installation
`icfg_uS6ihc6bomnSsFBBYmzmucu9` (read 21 August 2026). There is no per-database plan to change.

### Would today's usage fit inside Free? No. Would tomorrow's? Comfortably.

Free is *"100 CU-hours/project/month (enough to run a 0.25 CU compute in a project for 400
hours/month)"* ([Neon plans](https://neon.com/docs/introduction/plans), read 21 August 2026). At
0.25 CU:

| Scenario | `canoncore` CU-hours/month | Against the 100 CU-hour cap |
| --- | --- | --- |
| Today, 63.8% duty | **118.7** | **Exhausted at about day 26 of 31** |
| 30-minute poll, 16.7% | 31.0 | Fits, 3.2× headroom |
| 60-minute poll, 8.3% | **15.5** | Fits, **6.4× headroom** |

`waveger` at 2.52% duty and 1 CU is 18.75 CU-hours a month and fits either way.

**What happens the month it does not fit is the whole objection.** *"On the Free plan, when you run
out of CU-hours or public network transfer, your compute is suspended until the next billing period
or until you upgrade"* (Neon plans FAQ, read 21 August 2026). That is a multi-day outage of a public
URL, arriving with no warning, because **Free is the one plan with no spending notifications**: the
plans table's *Spending notifications* row is `—` for Free and `✅` for Launch and Scale.

### What Free forfeits, itemised

| Forfeited | Today's state | Does it bite? |
| --- | --- | --- |
| Metered compute, replaced by a hard 100 CU-h/project cap | 118.7 CU-h projected | **Yes, until the duty cycle is cut** |
| Storage 0.5 GB/project | `main` 31.7 MB + `preview` 31.6 MB + two probe branches ≈ **126 MB** summed | No, 4× headroom — but it is a *cap*, not a rate |
| Autoscaling ceiling drops 16 CU → 2 CU | max is 1 CU | No |
| Branches 10/project; **extra branches unavailable on Free** | 4 branches on `canoncore` | No, with 6 spare |
| Root branches 5 → 3 | `main` and `preview` spend 2 | No, with 1 spare |
| Protected branches | `protected: false` on `main` already | Loses the *option* ADR-0023's neighbours assume |
| History window 7 days max → **6 hours, capped at 1 GB** | currently 1 day | Yes in kind: 6 hours *"is shorter than one night's sleep"* ([production-readiness-baseline.md](production-readiness-baseline.md)) |
| Spending notifications | on, unused | **Yes — this is the one that matters** |
| Monitoring retention 3 days → 1 day | — | Marginal |
| Support: billing support → community | — | Marginal |

**The recommendation is: not yet, and probably not at all.** It saves $14.57 a month *relative to
today*, but only **$1.64 + $1.99 = $3.63** relative to a fixed duty cycle — and it buys that $3.63
by taking a public service off a plan that bills and putting it on one that goes dark, four months
after ADR-0024 spent $288 a year to remove precisely that failure mode from the layer above.
[ADR-0024](../adr/0024-vercel-pro-for-a-spend-cap-rather-than-an-outage.md) → *What will try to
reopen it* already records the Neon half of that argument as spent: *"Neon is on Launch, which
bills rather than suspending"*. Moving to Free un-spends it.

## Question 3: the other billable line items

### How the $20 credit works, and what sits outside it

> *"The monthly credit applies to all [managed infrastructure billable resources] after their
> respective included allocations are exceeded."* … *"Monthly credit: Every Pro plan has $20 in
> monthly credit."* … *"The credit and allocations expire at the end of the month if they are not
> used, and are reset at the beginning of the following month."*
> ([Vercel Pro plan](https://vercel.com/docs/plans/pro-plan), read 21 August 2026)

> *"The spend amount that you set covers **metered resources** that go beyond your Pro plan credits
> and usage allocation for all projects on your team. It **does not** include seats, integrations
> (such as Marketplace), or separate add-ons, which Vercel charges on a monthly basis."*
> ([Spend Management](https://vercel.com/docs/spend-management), read 21 August 2026)

So there are three tiers, not two: **inside the credit** (managed infrastructure), **on top of it
but inside the $40 spend cap** (metered resources past the credit), and **outside both** (seats,
add-ons, Marketplace). Neon is Marketplace. **No Vercel page says in those words that Marketplace
usage does not draw on the $20 credit** — the inference is from the credit applying to "managed
infrastructure billable resources" and Spend Management naming integrations separately. Marked as
inference, not established verbatim.

### Live on this team, read 21 August 2026

| Item | What the API says | Bills how | Verdict |
| --- | --- | --- | --- |
| **Observability Plus** | `entitlements.observability` created `2026-08-21T11:34:57Z`; `enabledInvoiceItems.observabilityBase.enabled: true`; `observabilityEvent` unit price $0.0000012 | **$1.20 per 1M events, no included allowance, listed under *Paid add-ons*** so **outside Spend Management** | **ON, nobody chose it. Flag.** |
| **Web Analytics** | `webAnalytics.enabledAt 2026-08-21T12:33:39Z`, `features.webAnalytics: true`, `hasData: true`; `webAnalyticsEvent` unit price $0.00003 | $0.03/1K, **zero included on Pro**, *"subject to the Pro monthly usage credit"* | On deliberately. Costs pennies at this traffic |
| **Speed Insights** | `invoiceItems.analytics: {price: $10.00, quantity: 0, highestQuantity: 0}`; `analyticsUsage` $0.65/10K | $10/project/month base fee, **outside Spend Management** | **Off, and the API can prove it** — see below |
| **Elastic build machines** | `resourceConfig.buildMachineSelection: "elastic"`, `elasticConcurrencyEnabled: true`, set `2026-08-21T11:34:56Z` | `buildCpuMinutes` $0.0035/CPU-minute, draws on the credit | **Billing, by default. Flag.** |
| **Cron jobs** | `crons.definitions: []` | included, billed as functions | None defined |
| **Resend, as a Vercel Marketplace installation** | `icfg_8RIDLsErTG9kM2OgbF8Redn1`, slug `resend`, `source: "cli"`, created `2026-07-29T09:43:52Z`, plan `Free` ($0.00, 3,000 emails/month, 100/day), `projects: []` | Marketplace, **outside Spend Management** | **$0.00 today. Flag — see below** |
| Blob, Edge Config, Queues, Workflow, Sandbox, AI Gateway, Drains, Firewall rate limiting, BotID Deep Analysis, Image Optimization | no stores, no rules, no calls | usage-based, nothing accrues unused | Nothing to do |

**Observability Plus is the finding.** Vercel's own page: *"For teams created or upgraded to Paid
Pro on or after April 3, 2026, Observability Plus is enabled by default."*
([Observability Plus](https://vercel.com/docs/observability/observability-plus), read 21 August
2026). This team upgraded at `planChangedAt 2026-08-21T11:34:56Z`, and the observability entitlement
is stamped `11:34:57Z` — **one second later**. An event is not a request: *"Vercel creates one or
more of these events each time a request is made to your site"*, and a single request *"might be …
1 Edge Request, 1 Middleware, 1 Function Invocation, 2 External API calls, and 1 AI Gateway request,
for a total of 6 events"* ([Observability](https://vercel.com/docs/observability), read 21 August
2026). **At today's traffic the cost is trivial** — 8,928 monitor polls in a 744-hour month × 2 events ≈
17,856 events × $0.0000012 = **$0.02 a month**. **It is flagged for what it is rather than what it costs**:
an add-on, switched on without a decision, priced per request, with **no included allowance and no
Spend Management ceiling**. What it buys is real (30-day runtime logs against Pro's 1 day, latency
p75, per-path breakdowns, Query), so this is a decision to take rather than a leak to plug — and
[`docs/infrastructure.md`](../infrastructure.md) → *Hosting* had no row for it when this was
written. CAN-144 added one, and switched the add-on off — see the preamble at the top of this file.

**Speed Insights: the API can answer the enablement question after all, and infrastructure.md says
it cannot.** That document records *"`GET /v9/projects/{id}` returns … **nothing that says whether
either is enabled** — no `enabledAt`, no `disabledAt`, no status"*. As of today it does: the project
record carries `webAnalytics.enabledAt` and `features: {webAnalytics: true}`, and the **team**
record carries `invoiceItems.analytics` with `quantity: 0`, which is the $10 Speed Insights base fee
at quantity zero across the whole team. **Both products are now assertable from the API**, which
matters because `scripts/check-docs.ts` could gate them. Worth a correction to that document.

> **One thing the reads did surface, and it is not a contradiction of the above.** The project
> record also carries `speedInsights.hasData: true` and
> `speedInsights.dataReceivedAt: 2026-08-21T13:28:27Z`. That is consistent with the product being
> off: [`analytics.tsx`](../../apps/web/src/analytics/analytics.tsx) renders `<SpeedInsights />`
> unconditionally, so the client script ships and posts whether or not the product is bought. Two
> consequences. The script itself is not free — *"Speed Insights and Web Analytics require scripts
> to do collection of data points … therefore may incur additional usage and costs for Data
> Transfer and Edge Requests"*
> ([Speed Insights limits](https://vercel.com/docs/speed-insights/limits-and-pricing), read
> 21 August 2026). And the day anyone clicks *Purchase*, the $10 base fee starts *"immediately …
> when enabling Speed Insights for each project"*, prorated — which is a decision, not an accident,
> and is the right way round.

**The Resend Marketplace installation is worth a look by a human.** It is real, it is on this team,
it was created from the CLI on 29 July 2026, it holds no resources and no connected projects, and
its plan record is Free at $0.00. **It costs nothing today.** It is flagged for two reasons:
[ADR-0016](../adr/0016-provisioning-plain-api-keys-neon-excepted.md) settles that this project buys
through **plain API keys, with the Marketplace an exception for Neon alone**, and
[ADR-0011](../adr/0011-transactional-email-resend.md) refused Resend through the Marketplace
specifically; and a Marketplace installation's plan is `scope: installation`, so a plan change on it
would sit outside the $40 spend cap the same way Neon's does. Somebody should decide whether it is
wanted, then keep it or uninstall it deliberately.

### Resend, Sentry, UptimeRobot: can any of them bill by surprise?

**Resend: no.** Free is *"3,000 emails / mo"*, *"100 emails a day"*, *"30-day data retention"*
([Resend pricing](https://resend.com/pricing), read 21 August 2026), and the quota counts inbound
too: *"Both **sent emails** and **received emails** (inbound) count towards your account's email
quota"*
([account quotas and limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits), read
21 August 2026). Breaching it **fails rather than bills**: *"`daily_quota_exceeded` — You have
reached your daily email quota"*, returned as a `429`
([rate limit](https://resend.com/docs/api-reference/rate-limit), read 21 August 2026). And
pay-as-you-go, the only mechanism that could turn a breach into money, is *"**Available to paid
subscriptions**"* (pricing page). Rate limit is *"10 requests per second per team"*.
**One inconsistency on Resend's own page, recorded rather than resolved**: the Free plan card says
*"3 domains"* and the comparison table on the same page says Custom domains → Free → `1`. The
free-plan domain count is **not established**.

**Sentry Developer: no, with one documented ambiguity.** *"If you're on a Developer plan and want to
increase your quota, you'll need to upgrade to a Team or Business plan"*
([manage your event stream](https://docs.sentry.io/pricing/quotas/manage-event-stream-guide/), read
21 August 2026), and over-quota data *"will be dropped and you won't be charged for it"*
([Sentry pricing docs](https://docs.sentry.io/pricing/), read 21 August 2026). The comparison table
gives Developer no spend-threshold control and no `+$0.50/GB additional` annotation. **The
ambiguity**: the logs quota page says *"Logs is currently available on Team, Business, and Developer
plans … Once you exceed your included quota, you'll be charged based on your pay-as-you-go (PAYG)
budget"*, which read literally sweeps Developer into PAYG. It contradicts the page above. Nothing is
wired to Sentry yet, so nothing is at risk today; re-read before `instrumentation.ts` lands.

**UptimeRobot Free: no.** No payment method, no billing information, **0 SMS/voice credits**
([`docs/infrastructure.md`](../infrastructure.md) → *Uptime monitoring*), and the pricing page's
Free column reads *"Not included, can be added"* against free SMS/voice credits.

### The domain

`whois canoncore.com`, run 21 August 2026, verbatim from the Verisign registry:

```
   Registrar: NameCheap, Inc.
   Creation Date: 2025-11-30T10:55:37Z
   Registry Expiry Date: 2026-11-30T10:55:37Z
```

**101 days from today.** Namecheap's published .com renewal, read from its own pricing page on
21 August 2026 (via a browser — `curl` and WebFetch both got a Cloudflare 403, and no secondary
source was substituted), is **£13.56 for one year**, cross-checked against the `.com` row of
[namecheap.com/domains](https://www.namecheap.com/domains/) which reads `Renew £13.56`. The ICANN fee
is added rather than included: *"ICANN … charges a mandatory annual fee of $0.20 for each domain
registration, renewal or transfer. This will be added to the listed price"*
([Namecheap, ICANN fee](https://www.namecheap.com/legal/domains/icann-fee/), read 21 August 2026),
and `.com` is on that page's affected list.

**That is a list price in GBP, geolocated, and it is not necessarily what will be charged.** The
actual renewal amount, and **whether auto-renew is even on**, are **not established** — both need
the Namecheap account, and whois does not expose auto-renew. **The one thing worth doing before the
next research cycle is confirming auto-renew is on**, because a domain that lapses is a
higher-consequence event than anything else in this document.

## Question 4: the history window, quantified

**Reducing `history_retention_seconds` from 86,400 saves at most about 1.3 cents a month, and
plausibly less than a tenth of that. It is not worth doing.**

The metered quantity is retained write-ahead log, not data size: *"Neon stores a change history to
support point-in-time restore … The charge is based on the amount of change history retained on
those branches"*, on **root branches only**, at **$0.20/GB-month**
([Neon plans](https://neon.com/docs/introduction/plans), read 21 August 2026). *"WAL records that
fall outside the configured history window are automatically removed and stop contributing to your
project's storage costs"*
([Neon, history window](https://neon.com/docs/introduction/history-window), read 21 August 2026).

The upper bound: **`written_data_bytes` is `0` on every branch of both projects**
(`describe_project`, read 21 August 2026). If the entire logical size of both root branches were
somehow retained as change history — 31,694,848 + 31,621,120 bytes = **0.0633 GB** — the instant
restore line would be `0.0633 × $0.20 = $0.0127 a month`. **Reducing 1 day to 6 hours could not save
more than 1.3 cents, and with no writes it is saving a fraction of a fraction of that.**

Two further reasons not to touch it. **It is already the plan default** — *"The history window
defaults are 6 hours for Free plan projects and 1 day for paid plan projects"* (plans page) — so
there is nothing to reclaim from an over-generous setting somebody chose. And the setting is
project-wide: *"Changing the history window affects **all branches** in your project"*, and *"You
set a single history window … for the entire project"*. **Neon's own production advice runs the
other way**: *"For production workloads, consider extending the history window to 7 days"*. At these
volumes an extension to 7 days would also cost cents, and would buy a recovery window that actually
survives a night's sleep — which is the same argument
[production-readiness-baseline.md](production-readiness-baseline.md) → *Data durability* makes about
the free plan's six hours. **If this setting is touched at all, the case for lengthening it is
stronger than the case for shortening it.**

## Ranked, with what each one costs

Ordered by dollars saved per unit of risk and complexity. Every figure is a Neon compute figure at
0.25 CU over a 744-hour month, unless stated.

| Rank | Change | Saves/month | Risk and complexity | What it costs in capability |
| --- | --- | --- | --- | --- |
| **1** | **Lengthen the DB check's interval to 60 minutes**, after repointing the monitor at `/api/health` | **$10.94** ($12.58 → $1.64) | One dropdown in one dashboard. Reversible in seconds. Requires confirming Free allows it, which the same edit tests | **A database-only failure is found in up to 60 minutes rather than 5.** The site being *gone* is unaffected only if a second 5-minute monitor covers a non-DB route |
| **2** | The same at **30 minutes**, if 60 feels too slack | $9.29 ($12.58 → $3.29) | Identical | Detection latency up to 30 minutes |
| **3** | **Split the check**: 5-minute monitor on a route with no database, hourly Vercel cron on `/api/health`, absence detected by Sentry's free cron monitor | $10.94, minus **under $0.05** of cron | A new route, a `vercel.json` cron entry, a Sentry check-in, and best-effort delivery to design around | Spends Sentry Developer's free cron monitor, which ADR-0018 left unspent. More parts to go quietly wrong |
| **4** | **Delete the two `wt-probe-can-138*` branches** when CAN-138 is done | ~$0.005, effectively nothing | Trivial | Nothing. Listed because branch hygiene is free and the 10-branch allowance is finite |
| **5** | **Decide Observability Plus deliberately** — keep it or turn it off | **$0.02 today**; unbounded later | A billing toggle | Turning it off drops runtime log retention from 30 days to **1 day** on Pro and removes Query and per-path breakdowns. **Probably keep it and document it** |
| **6** | **Neon Free plan** | $3.63 *after* rank 1; $14.57 before it | **High.** Installation-wide, hits `waveger`, and the failure mode is a multi-day silent outage with no spending notification | Metered billing replaced by a hard cap; 6-hour history window; protected branches gone; 0.5 GB storage cap |
| **7** | **Neon Scale for a 1-minute idle timeout** | **$2.15 net** | Doubles the CU-hour rate on both databases to buy back a timeout | Dominated by rank 1 at a fraction of the saving. **Reject** |
| **8** | Shorten `history_retention_seconds` | **≤ $0.013** | Trivial but pointless | Halves the recovery window to buy nothing. **Reject** |
| **9** | Cache `/` for signed-out visitors | **$0.00** against this bill | Cache Components migration, or a per-user server cache holding RLS-filtered rows | Either the signed-in path or a security decision. **Reject on cost grounds** |
| — | Disable scale to zero | **−$7.14** | — | Named only so it is not proposed |

**The banked saving nobody should forget.** Today's move from fixed 1 CU to 0.25–1 autoscaling cuts
the *same* duty cycle from **$50.32** a month to **$12.58** — a 4× reduction that dwarfs everything
in the table above, and it is already done. **It is conditional on the average compute size actually
sitting at the 0.25 floor**, which is measurable tomorrow by the division Neon documents:
`compute_time_seconds ÷ active_time_seconds`. Do that read before treating $12.58 as the baseline.

## What could not be established

Recorded so a later reader does not mistake a gap for a finding.

1. **Whether UptimeRobot's Free dashboard exposes intervals longer than 5 minutes.** The API
   contract says minimum-not-maximum, the v2 example shows a 900-second monitor, and no prose page
   states either way. One dashboard edit settles it.
2. **Whether Neon's API enforces the Scale-only gate on `suspend_timeout_seconds`.** Not tested,
   because testing is a write.
3. **Why the Vercel dashboard reads $26.28 when the metered computes sum to about $19.25.**
   Needs Neon's consumption API, which needs an API key this project deliberately does not hold.
4. **Whether Marketplace usage draws on the $20 Pro credit.** Inferred from two pages that each
   address a neighbouring question; no page says it outright.
5. **Whether `Require Active Resource Before Deploy` wakes the Neon compute on every deployment.**
   Neon documents it as letting *"Vercel wait for the branch to be ready"*; whether that starts a
   suspended compute is not stated. If it does, each deployment costs a 5-minute wake — about
   $0.002. Small either way, and worth knowing once the interval is long.
6. **Resend's free-plan domain count**, 1 or 3, which Resend's own pricing page states both ways.
7. **Whether Sentry Developer can be charged for logs overage**, where two Sentry pages disagree.
8. **The actual Namecheap renewal charge and whether auto-renew is on** — both need the account.
9. **The Global Config write price**, quoted as $5.00 per 1M on the product page and "$10 per 1K"
   on `/docs/limits`. Irrelevant here — no Edge Config store exists — but recorded because the two
   figures differ by four orders of magnitude.
