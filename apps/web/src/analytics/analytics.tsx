"use client";

/**
 * Vercel Web Analytics and Speed Insights, on the two conditions
 * [ADR-0020](../../../../docs/adr/0020-no-cookie-consent-banner.md) attaches to measuring
 * anything here at all.
 *
 * **Speed Insights is not a duplicate of the Lighthouse budgets** that gate this in CI. Two of the
 * three Core Web Vitals cannot be measured in a lab at all, so they exist only here and the two
 * measure different things on purpose. [`lighthouserc.cjs`](../../lighthouserc.cjs) carries the
 * Chrome team's own statement of that, at the budgets it decides the shape of.
 *
 * `beforeSend` below is the whole of what makes either lawful under the statistical purposes
 * exception; `redaction.ts` and `opt-out.ts` carry a half each.
 */

import { Analytics as WebAnalytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { beforeSend } from "./before-send";

/**
 * Rendered unconditionally rather than only for a visitor who has not objected, which is
 * deliberate and is Vercel's own documented shape
 * (https://vercel.com/docs/analytics/redacting-sensitive-data). Both components render nothing
 * and load a script that sends what `beforeSend` returns, so an objection is honoured by no
 * event leaving rather than by no script arriving — one code path, and no client state deciding
 * whether to mount.
 */
export function Measurement() {
  return (
    <>
      <WebAnalytics beforeSend={beforeSend} />
      <SpeedInsights beforeSend={beforeSend} />
    </>
  );
}
