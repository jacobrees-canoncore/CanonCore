/*
 * The front-end budgets, and the argument for every number in them.
 *
 * **What is gated here is bytes and lab load metrics, because those are exact.** Two of the three
 * Core Web Vitals cannot be measured in a lab at all: the Chrome team's position is that lab tests
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
 * Measured on 21 August 2026 against this configuration exactly, with
 * `npx @lhci/cli@0.15.1 autorun` from `apps/web` — five runs a URL, a local production build,
 * `next start`, Lighthouse's default mobile emulation and simulated throttling —
 * on `1162684`'s tree plus this ticket's changes. Every run's first-party responses were 200; an
 * earlier attempt at this table was thrown away because a `next start` left listening on the port
 * served stale HTML against a rebuilt `.next`, and five chunks came back 500 while the numbers
 * still looked plausible.
 *
 * | URL | LCP, worst of 5 | TBT, worst of 5 | script bytes |
 * | --- | --- | --- | --- |
 * | `/` | 2013 ms | 9 ms | 139,219 |
 * | `/sign-in` | 2009 ms | 6 ms | 139,219 |
 * | `/privacy/analytics` | 2017 ms | 12 ms | 143,617 |
 *
 * **Byte counts are identical across all five runs of a URL; the two timings are not.** Across four
 * collections of the same tree on the same idle laptop, worst-run LCP ranged 2009-2175 ms and
 * worst-run TBT 6-12 ms. That spread is the argument both timing budgets below make for themselves,
 * and it is why the job writes what it measured to the run summary on a pass as well as a failure:
 * a budget nobody can see the distance to is one that is either silently loose for ever or about to
 * start flaking. `apps/web/scripts/lighthouse-summary.mts`.
 *
 * **The known risk, stated rather than discovered on a pull request: LCP has the least room.** The
 * worst run seen on any collection is 2175 ms against a 2500 ms budget, and the runner is slower
 * than the machine that produced it. If CI breaches it the answer is not a looser budget — the cap
 * is the Core Web Vitals threshold itself — but finding out why a page of text takes 2 s to paint
 * when it first paints at 0.75 s.
 *
 * **Two limits on what that table is worth, and both are deliberate rather than unnoticed.** It was
 * measured on a laptop and the gate runs on a shared GitHub runner, which is slower — Lighthouse's
 * own variability documentation specifies "Minimum 2 dedicated cores (4 recommended)" and advises
 * against shared-core instances
 * (https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md). And Vercel's two
 * measurement scripts 404 against a local server, so what the byte budget counts is **this
 * application's own JavaScript**, which is the thing a pull request actually changes.
 *
 * **The application being measured is a skeleton**, and CAN-89 Give the product a visual identity
 * and a reading surface will change what these pages are. The numbers are re-derivable rather than
 * mysterious for exactly that reason: re-run the table above and move the budgets deliberately.
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
      ],
    },
    assert: {
      // The worst run of the five rather than the median. A budget answers "could this have been
      // slow?", and a median hides one bad run in five — which is a regression that reaches one
      // reader in five.
      aggregationMethod: "pessimistic",
      assertions: {
        // 2017 ms measured, and the measurement plus any slack worth the name lands above 2500, so
        // the threshold is what sets this. That leaves 483 ms of headroom — about a fifth — which
        // is a real gate rather than a formality: this page is text, and nothing it could
        // legitimately grow into should cost it half a second.
        "largest-contentful-paint": ["error", { maxNumericValue: largestContentfulPaintThreshold }],

        // **The one budget the measurement does not really constrain**, and saying so is better
        // than dressing 9 ms up as a derivation. There is no JavaScript worth the name executing
        // on these pages, so any slack ratio applied to 9 ms is arbitrary, and a tight number would
        // measure the runner rather than the page: Lighthouse rates CPU noise a high-impact source
        // of variability, and this runs on a shared VM.
        //
        // So it is set from the other end — a quarter under the 200 ms threshold — and what the
        // measurement establishes is that the page sits twenty times inside it. What this catches
        // is a step change, a heavy client component arriving, rather than drift.
        "total-blocking-time": [
          "error",
          { maxNumericValue: totalBlockingTimeThreshold - totalBlockingTimeThreshold / 4 },
        ],

        // 143,617 bytes measured on the heaviest of the three, identical byte-for-byte across all
        // five runs — it is a build output, not a timing — so the slack is 10% rather than the
        // multiple a noisy metric would need. About 14 kB of headroom.
        //
        // **It has already earned its keep once, on the change that introduced it.** A `next/link`
        // on the front page, added to satisfy a react-doctor warning, cost 8,401 bytes on the page
        // a stranger loads, and nothing but this number would have said so. `src/app/front-page.tsx`
        // carries the trade.
        //
        // **A legitimate increase past this re-baselines the number on purpose.** That is the gate
        // working rather than the gate being wrong, and it is the whole reason a budget beats a
        // bundle analyser: `next experimental-analyze` and `@next/bundle-analyzer` explain why
        // bytes moved and can assert nothing.
        "resource-summary:script:size": ["error", { maxNumericValue: 158000 }],

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
