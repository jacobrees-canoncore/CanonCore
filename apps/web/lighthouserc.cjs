/*
 * The front-end budgets, and the argument for every number in them.
 *
 * **What is gated here is bytes and lab load metrics, because those are exact.** Two of the three
 * Core Web Vitals cannot be had from a lab as the field defines them: the Chrome team's position is that lab tests
 * "cannot accurately predict when users will choose to interact with a page", and that lab CLS
 * "only considers layout shifts that occur above the fold and during load"
 * (https://web.dev/articles/lab-and-field-data-differences). Those two are watched in Speed
 * Insights instead — `src/analytics/analytics.tsx` — so this file and that one measure different
 * things rather than the same thing twice. CAN-60 Gate the front end on bytes, budgets and React
 * lint, and `docs/research/production-readiness-baseline.md` -> *Front-end quality as a gate*.
 *
 * **`preset` is deliberately absent.** `lighthouse:recommended` asserts near-perfect scores on
 * every non-performance audit and fails on day one for reasons nobody will fix, which teaches a
 * reader to ignore red. With no preset every audit starts at `off` and only what is named below
 * is asserted.
 *
 * ## Where the numbers came from
 *
 * **Re-derived on 21 August 2026 by CAN-89 Give the product a visual identity and a reading
 * surface**, which is the change the previous note said would force it: that ticket gives every
 * page a shell and gives this list a fourth URL. Measured against this configuration exactly, with
 * `npx @lhci/cli@0.15.1 autorun` from `apps/web` — five runs a URL, a local production build,
 * `next start`, Lighthouse's default mobile emulation and simulated throttling. Every run's
 * first-party responses were 200; an earlier attempt at the previous table was thrown away because
 * a `next start` left listening on the port served stale HTML against a rebuilt `.next`, and five
 * chunks came back 500 while the numbers still looked plausible.
 *
 * | URL | LCP, worst of 5 | TBT, worst of 5 | script bytes |
 * | --- | --- | --- | --- |
 * | `/` | 2256 ms | 9 ms | 140,411 |
 * | `/sign-in` | 2022 ms | 11 ms | 140,411 |
 * | `/privacy/analytics` | 2068 ms | 9 ms | 141,385 |
 * | `/story/<the founding Story>` | 2254 ms | 8 ms | 140,411 |
 *
 * **What the shell did to the bytes is the opposite of what it looks like it should have.** The
 * front page and `/sign-in` gained 1,576 bytes, and `/privacy/analytics` **lost 1,848** — the
 * heaviest page in the table is lighter than the heaviest page in the one above it. The masthead
 * link replaced the per-page one, and it is a plain `<a>`, so `next/link` left the application
 * entirely and took its chunk off the two pages that carried it. `src/app/site-header.tsx` holds
 * that trade and the one suppression it costs.
 *
 * **Byte counts are identical across all five runs of a URL; the two timings are not.** Across five
 * collections of this tree on the same idle laptop, worst-run LCP ranged 2010-2256 ms and worst-run
 * TBT 7-12 ms. That spread is the argument both timing budgets below make for themselves,
 * and it is why the job writes what it measured to the run summary on a pass as well as a failure:
 * a budget nobody can see the distance to is one that is either silently loose for ever or about to
 * start flaking. `apps/web/scripts/lighthouse-summary.mts`.
 *
 * **Two of those five collections exited non-zero, and neither was a budget.** Both were
 * `CHROME_INTERSTITIAL_ERROR` on a single run — "Chrome prevented page load with an interstitial" —
 * on a laptop running a second `next start` beside the one `lhci` had started. It is recorded
 * because a reader re-deriving this table will meet it and should not read it as a failing
 * assertion: measure with nothing else serving.
 *
 * ## What the LCP number is, which is not what it looks like
 *
 * **These pages paint their largest element in 63-142 ms, and the 2 s figure is the simulator.**
 * Every report carries both: `observedLargestContentfulPaint` is 63-142 ms across all 15 runs and
 * is *identical to* `observedFirstContentfulPaint` on every one of them — the largest element is
 * server-rendered text, so it arrives with the first paint, exactly as it should. The asserted
 * `largest-contentful-paint` is Lighthouse's estimate under its default simulated throttling, and
 * it comes out equal to `interactive` to the millisecond on every run.
 *
 * **So this budget is a script-graph budget wearing a paint metric's name.** That is worth stating
 * because it changes what a breach means: it will be reached by JavaScript that takes longer to
 * load and run, never by something that delays a paint. It overlaps the script-bytes budget below
 * rather than being independent of it — bytes and dependency depth are not the same thing, which is
 * why both are kept, but a reader should not treat them as two witnesses.
 *
 * **It also bounds the flake risk.** The worst run seen on any collection is 2175 ms against a
 * 2500 ms budget. Simulation derives its timings from observed CPU task durations, so a slower
 * runner does move the number — but it is multiplying up under 150 ms of real work, not a paint
 * that was already slow. If CI breaches it, the answer is not a looser budget: the cap is the Core
 * Web Vitals threshold itself, and the thing to look at is what arrived in the script graph.
 *
 * **Two limits on what that table is worth, and both are deliberate rather than unnoticed.** It was
 * measured on a laptop and the gate runs on a shared GitHub runner, which is slower — Lighthouse's
 * own variability documentation specifies "Minimum 2 dedicated cores (4 recommended)" and advises
 * against shared-core instances
 * (https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md). And Vercel's two
 * measurement scripts 404 against a local server, so what the byte budget counts is **this
 * application's own JavaScript**, which is the thing a pull request actually changes.
 *
 * **The application being measured is still nearly empty**, and
 * CAN-90 Decide how an Ordering reads, and what the interface calls its parts, together with the
 * tickets that give it something to draw, will change what these pages are again. The numbers are
 * re-derivable rather than mysterious for exactly that reason: re-run the table above and move the
 * budgets deliberately.
 */

/**
 * The Core Web Vitals thresholds, unchanged since they were set: LCP <= 2.5s at the 75th
 * percentile (https://web.dev/articles/vitals). Lighthouse scores TBT against 200 ms.
 *
 * **They are a ceiling on the budgets rather than the budgets themselves.** The budget is the
 * measurement plus slack, and where that lands above the threshold the threshold wins — so a
 * budget can never quietly drift past the number the metric is judged by, and a page that measures
 * nearly nothing still gets a gate rather than a tripwire that fires on noise.
 */
const largestContentfulPaintThreshold = 2500;
const totalBlockingTimeThreshold = 200;

module.exports = {
  ci: {
    collect: {
      // Five, because "the median Lighthouse score of 5 runs is twice as stable as 1 run"
      // (Lighthouse variability, linked above). It is the single cheapest thing that makes a lab
      // gate worth having.
      numberOfRuns: 5,
      // A local production build rather than a deployment. Deterministic, needs no deploy to have
      // happened, and — the reason that matters — the table above was measured this way, so the
      // budgets transfer. A preview URL would add Vercel's own variance on top of Lighthouse's to
      // numbers derived without it.
      startServerCommand: "pnpm exec next start --port 3000",
      // Next 16 prints "✓ Ready in 289ms". Stated rather than left to the `listen|ready` default,
      // so a change to Next's startup banner is a red run with a clear reason rather than a
      // timeout.
      startServerReadyPattern: "Ready in",
      url: [
        // The front page, which is what a stranger loads, and the only one of the three that
        // reaches the database.
        "http://localhost:3000/",
        // The heaviest page an account holder meets before signing in.
        "http://localhost:3000/sign-in",
        // The objection route ADR-0020 requires, and the only page carrying a client component of
        // this application's own — so it is the one where a byte regression would show first.
        "http://localhost:3000/privacy/analytics",
        // **The page that draws the most and will grow the most.** Added by CAN-89 Give the product
        // a visual identity and a reading surface, which is the ticket the note that used to stand
        // here left the decision to. The id is migration 0002's founding Story, which is fixed, so
        // this needed a line of config rather than a mechanism.
        "http://localhost:3000/story/00000000-0000-4000-8000-000000000001",
      ],
      // **This measures mobile alone, which is Lighthouse's default, and that stays true.** Core
      // Web Vitals are judged "at the 75th percentile of page loads, segmented across mobile and
      // desktop" (https://web.dev/articles/vitals), so half of what the thresholds describe is
      // unmeasured here. A desktop preset is a second `collect` run rather than another URL, and
      // CAN-89 Give the product a visual identity and a reading surface decided against it rather
      // than leaving the note standing: it doubles the gate's
      // wall-clock for the looser half of the pair, on a runner Lighthouse's own variability
      // documentation already advises against, while the byte budget — the assertion that has
      // actually caught something — is identical on both.
    },
    assert: {
      // The worst run of the five rather than the median. A budget answers "could this have been
      // slow?", and a median hides one bad run in five — which is a regression that reaches one
      // reader in five.
      //
      // **`total-blocking-time` overrides this to `median`, and only it does.** The argument is at
      // that assertion: on a shared runner the worst of five TBT readings is the runner's cold
      // start rather than the page, which the first CI run of this gate demonstrated by failing on
      // it. A per-assertion `aggregationMethod` is the documented way to say that
      // (https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md).
      aggregationMethod: "pessimistic",
      assertions: {
        // 2256 ms measured, and the measurement plus any slack worth the name lands above 2500, so
        // the threshold is what sets this. Against the worst run seen on any collection, 2256 ms,
        // that leaves 244 ms of headroom — about 10%, quoted off the worst run because that is the
        // aggregation these assertions use.
        //
        // Read it as the script-graph budget it actually is — *What the LCP number is* above — not
        // as half a second of paint time. The pages paint in 63-142 ms.
        //
        // **Kept at the threshold rather than tightened to the measurement**, even knowing that,
        // because the threshold is the number the metric is judged by in the field and a budget
        // that drifts past it silently is the failure worth preventing.
        "largest-contentful-paint": ["error", { maxNumericValue: largestContentfulPaintThreshold }],

        // **The one budget the measurement does not really constrain**, and saying so is better
        // than dressing 12 ms up as a derivation. There is no JavaScript worth the name executing
        // on these pages, so any slack ratio applied to it is arbitrary. It is set from the other
        // end — a quarter under the 200 ms threshold — and what the laptop measurement establishes
        // is that the page sits about twelve times inside it. What it catches is a step change, a
        // heavy client component arriving, rather than drift.
        //
        // **`median` rather than the `pessimistic` every other assertion here uses, and the runner
        // forced it.** The first CI run of this gate failed on TBT with `278, 79, 88, 85, 93` — in
        // run order, so the outlier is run one and the other four sit inside 79-93. That is the
        // shape of a cold start rather than of a page: the same build measures 5-12 ms on a warm
        // laptop. **Pessimistic therefore always takes run one**, which makes it a measurement of
        // the runner's first-run cost rather than of this application, and no budget under the
        // 200 ms threshold could survive it.
        //
        // So the aggregation is narrowed for this metric alone. The median of that set is 88 ms,
        // which leaves the gate real — a doubling of main-thread work breaches it — while the other
        // two assertions keep the worst-run reading that a byte count and a load metric can both
        // support. **CAN-60 Gate the front end on bytes, budgets and React lint** asked for
        // `pessimistic`, and this is the one place the measurement said otherwise.
        "total-blocking-time": [
          "error",
          {
            maxNumericValue: totalBlockingTimeThreshold - totalBlockingTimeThreshold / 4,
            aggregationMethod: "median",
          },
        ],

        // 141,385 bytes measured on the heaviest of the four, identical byte-for-byte across all
        // five runs — it is a build output, not a timing — so the slack is 10% rather than the
        // multiple a noisy metric would need. About 14.6 kB of headroom.
        //
        // **This number went down**, from 158,000, because the heaviest page did: see *What the
        // shell did to the bytes* above. A budget left at the old figure after the pages beneath it
        // got lighter is a budget that has silently gained 16 kB of slack, which is the same
        // failure as one that drifts upwards.
        //
        // **The measurement found something on the change that introduced it; this assertion did
        // not.** A `next/link` on the front page cost 8,401 bytes, and at 147,620 it would still
        // have passed. What surfaced it was the run summary, which is the argument for reporting
        // what was measured rather than only the verdict. `src/app/front-page.tsx` carries the
        // trade itself.
        //
        // **A legitimate increase past this re-baselines the number on purpose.** That is the gate
        // working rather than the gate being wrong, and it is the whole reason a budget beats a
        // bundle analyser: `next experimental-analyze` and `@next/bundle-analyzer` explain why
        // bytes moved and can assert nothing.
        "resource-summary:script:size": ["error", { maxNumericValue: 156000 }],

        // **Warned, never gated**, and this is a decision the ticket names. The performance score
        // is a weighted composite over noisy metrics, run on the shared box Lighthouse's own
        // documentation advises against, so gating it buys flake where the numeric budgets above
        // buy signal. It is kept at all because a score that falls while every budget holds is
        // worth seeing in the log.
        "categories:performance": ["warn", { minScore: 0.9 }],
      },
    },
    // **No `upload` block, and its absence is what keeps the reports on the runner.** `autorun`
    // "will run upload only if they've configured the upload command"
    // (@lhci/cli/src/autorun/autorun.js), and the alternative it would otherwise reach for is
    // `temporary-public-storage`, which publishes every report to a public Google Cloud bucket.
  },
};
