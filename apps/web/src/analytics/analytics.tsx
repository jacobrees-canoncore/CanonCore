"use client";

/**
 * Vercel Web Analytics and Speed Insights, on the two conditions
 * [ADR-0020](../../../../docs/adr/0020-no-cookie-consent-banner.md) attaches to measuring anything
 * here at all.
 *
 * **Speed Insights is not a duplicate of the Lighthouse budgets** that gate this in CI. Real INP
 * and full-session CLS exist only in the field — lab CLS is real but partial, counting only what
 * shifts above the fold during load — so the two measure different things on purpose.
 * [`lighthouserc.cjs`](../../lighthouserc.cjs) carries the Chrome team's own statement of that, at
 * the budgets it decides the shape of.
 *
 * ## Why the `/react` entrypoints rather than the `/next` ones
 *
 * **`beforeSend` is not the whole surface, and the `/next` components do not let you fix the rest
 * of it.** Both vendors send the route *beside* the URL rather than inside the event, and it never
 * reaches `beforeSend`. Read off the live script, `va.vercel-scripts.com/v1/script.js`:
 *
 * ```js
 * v = a({ type: t, url: f, payload: n });   // a is beforeSend — it is handed the url alone
 * if (v === false || v === null) return;    // an objection still stops everything, which is why
 * v && (f = v.url, n = v.payload ?? n);     // the opt-out is unaffected by any of this
 * y = { o: f, …, ...c && { dp: c }, … };    // c is the route, and it goes out unredacted
 * ```
 *
 * **And the route the `/next` components compute is not always a pattern.** `computeRoute` matches
 * decoded parameter values against an encoded pathname, so it returns the raw path whenever they
 * differ: `computeRoute("/ordering/the%20war%20doctor", { slug: "the war doctor" })` is
 * `"/ordering/the%20war%20doctor"`, not `"/ordering/[slug]"`. Any slug carrying a space, an accent
 * or an `&` fails the same way — which is exactly the Ordering slug and author name that
 * **CAN-60 Gate the front end on bytes, budgets and React lint** exists to keep out of an event.
 *
 * `@vercel/analytics/next` declares its props as `Omit<AnalyticsProps, 'route' | 'disableAutoTrack'>`,
 * so the route it computes cannot be overridden. The `/react` entrypoints take `route`, so the
 * route becomes ours and goes through the same allowlist the URL does. Found by the second review
 * round; before it, this shipped the `/next` pair and the leak with them.
 */

import { Analytics as WebAnalytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { usePathname } from "next/navigation";
import { beforeSend } from "./before-send";
import { redactPath } from "./redaction";

export function Measurement() {
  // The one value both vendors are given for the page, already reduced. `path` is passed as well
  // as `route` because the script builds the reported URL out of it — so what `beforeSend`
  // receives is already safe, and redacts to itself.
  const route = redactPath(usePathname());

  return (
    <>
      <WebAnalytics beforeSend={beforeSend} route={route} path={route} />
      <SpeedInsights beforeSend={beforeSend} route={route} />
    </>
  );
}
