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
  // The one value both vendors are given for the page, already reduced. `path` is passed as well as
  // `route` because the script builds the reported URL out of it.
  //
  // **It only clears the query string when it uses that path, which is the half a reading of this
  // got wrong.** From the same live script, the function that builds the reported URL:
  //
  //     function e(e){let t=location.href;if(e){let n=new URL(t);
  //       if(n.pathname!==e)return n.pathname=e,n.search="",n.href}   // substituted: query dropped
  //       return t}                                                   // unchanged: query kept
  //
  // So for `/story/<id>`, where the reduced path differs, the URL is rebuilt and arrives at
  // `beforeSend` already safe. For every member of `staticPaths` it does *not* differ, so what
  // `beforeSend` receives is `location.href` whole — query string included. **`beforeSend` is
  // therefore the only thing that removes a password-reset token from `/reset-password`**, which is
  // the case ADR-0020 calls the sharpest, and it is load-bearing rather than a second line.
  // Confirmed against a deployment on 21 August 2026: `docs/infrastructure.md` → *Hosting*.
  const route = redactPath(usePathname());

  return (
    <>
      <WebAnalytics beforeSend={beforeSend} route={route} path={route} />
      <SpeedInsights beforeSend={beforeSend} route={route} />
    </>
  );
}
