"use client";

import { Analytics as WebAnalytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { objectedToMeasurement } from "./opt-out";
import { redactUrl } from "./redaction";

/**
 * Vercel Web Analytics and Speed Insights, on the two conditions
 * [ADR-0020](../../../../docs/adr/0020-no-cookie-consent-banner.md) attaches to measuring
 * anything here at all.
 *
 * **Speed Insights is not a duplicate of the Lighthouse budgets** that gate this in CI. INP
 * cannot be measured in a lab — the Chrome team's own position is that lab tests "cannot
 * accurately predict when users will choose to interact with a page" — and lab CLS "only
 * considers layout shifts that occur above the fold and during load"
 * (https://web.dev/articles/lab-and-field-data-differences). So two of the three Core Web Vitals
 * exist only here, and the lab gate and this measure different things on purpose.
 *
 * `beforeSend` below is the whole of what makes either lawful under the statistical purposes
 * exception; `redaction.ts` and `opt-out.ts` carry a half each.
 */

/** What both vendors are allowed to receive. `null` drops the event. */
export function beforeSend<Event extends { url: string }>(event: Event): Event | null {
  if (objectedToMeasurement()) return null;
  const url = redactUrl(event.url);
  return url === null ? null : { ...event, url };
}

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
