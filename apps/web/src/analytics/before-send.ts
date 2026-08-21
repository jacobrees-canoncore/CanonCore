import { objectedToMeasurement } from "./opt-out";
import { redactUrl } from "./redaction";

/**
 * What either measurement product is allowed to receive, and the whole of what makes measuring
 * lawful here without a consent banner: [ADR-0020](../../../../docs/adr/0020-no-cookie-consent-banner.md)
 * attaches both of its conditions to this function. `null` drops the event.
 *
 * **Generic rather than written twice.** The two vendors declare different event types — Web
 * Analytics sends `pageview` and `event`, Speed Insights sends `vital` — and the only field this
 * touches is one they share.
 *
 * **The spread is for the caller's types, not for the vendors.** Neither script reads anything but
 * `url` back off the return, so returning the rest of the event changes nothing that is sent; what
 * it buys is that this stays a total function of its argument rather than one that quietly narrows
 * it. The field that *is* sent and does not pass through here is the route, and
 * [`analytics.tsx`](analytics.tsx) is where that is dealt with.
 *
 * A module of its own rather than a second export beside {@link ../analytics/analytics.Measurement}:
 * a non-component export in a component file costs Fast Refresh the ability to preserve state.
 */
export function beforeSend<Event extends { url: string }>(event: Event): Event | null {
  if (objectedToMeasurement()) return null;
  const url = redactUrl(event.url);
  return url === null ? null : { ...event, url };
}
