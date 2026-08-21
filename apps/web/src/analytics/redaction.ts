/**
 * What a measurement event is allowed to say about the page it came from.
 *
 * Vercel warns that "automatic page view tracking may track personal information" in URLs
 * (https://vercel.com/docs/analytics/redacting-sensitive-data), and
 * [ADR-0020](../../../../docs/adr/0020-no-cookie-consent-banner.md) turns that warning into a
 * condition rather than a refinement: a URL here can carry an Ordering's name and an author's, so
 * `beforeSend` redaction is part of adopting analytics at all.
 *
 * **The rule is an allowlist, and it fails safe in the direction that matters.** A path this
 * module does not recognise is reduced rather than passed through, so a route added later leaks
 * nothing — the worst it costs is signal, because its visits arrive indistinguishable from every
 * other unrecognised page. `redaction.test.ts` derives both properties from the filesystem, so
 * the list going stale is a red test rather than a quiet leak.
 *
 * The query string is dropped unconditionally and that is the sharpest reason this exists:
 * `/reset-password` carries a working password-reset token in it.
 */

/**
 * Every route that is nothing but itself. Kept whole, because "which pages get visited" is the
 * only question analytics is here to answer and reducing these would answer none of it.
 *
 * Exported for the test that checks this against the routes `src/app` actually serves.
 */
export const staticPaths: ReadonlySet<string> = new Set([
  "/",
  "/forgot-password",
  "/privacy/analytics",
  "/reset-password",
  "/sign-in",
  "/sign-up",
]);

/**
 * First segments whose *shape* is worth keeping even though what follows them is not. `/story/*`
 * says a Story was read without saying which one.
 */
const shapedPrefixes: ReadonlySet<string> = new Set(["story"]);

/**
 * The URL to report for a page, or `null` when there is nothing safe to report and the event
 * should be dropped instead.
 */
export function redactUrl(url: string): string | null {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    // A URL that will not parse is one this module cannot reason about, so it does not get to
    // travel on the strength of not having been understood.
    return null;
  }

  // Everything after the path goes, always: no query, no fragment, no credentials.
  const { origin } = parsed;
  const path = parsed.pathname.length > 1 ? parsed.pathname.replace(/\/$/, "") : "/";

  if (staticPaths.has(path)) return origin + path;

  const [, first] = path.split("/");
  return shapedPrefixes.has(first) ? `${origin}/${first}/*` : `${origin}/*`;
}
