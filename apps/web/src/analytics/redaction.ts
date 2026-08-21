/**
 * What an event is allowed to say about the page it came from.
 *
 * **Two callers, and the second is not analytics.** The measurement products are what this was
 * written for, and a Content Security Policy violation report arrives with the same problem and is
 * reduced by the same rule — [`../security/violation.ts`](../security/violation.ts) says why a
 * browser-posted report cannot be scrubbed anywhere else. It lives here, beside the caller that
 * needed it first, rather than moving to a neutral home the moment a second one appeared.
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
  "/sources",
]);

/**
 * First segments whose *shape* is worth keeping even though what follows them is not. `/story/*`
 * says a Story was read without saying which one.
 */
const shapedPrefixes: ReadonlySet<string> = new Set(["story"]);

/**
 * What a path is allowed to say about itself.
 *
 * **Separate from {@link redactUrl} because the vendors send the path twice**, and only one of the
 * two goes through `beforeSend`. `analytics.tsx` carries the finding; this is the half of the
 * answer that both callers share.
 */
export function redactPath(pathname: string | null): string {
  // `usePathname` is typed `string` and returns `null` outside a router — which is not only a test
  // condition, it is any render that happens before one is in place. Not knowing the path is
  // answered the same way as not recognising it: say nothing about it.
  if (pathname === null) return "/*";
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : "/";
  if (staticPaths.has(path)) return path;
  const [, first] = path.split("/");
  return shapedPrefixes.has(first) ? `/${first}/*` : "/*";
}

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

  // **Nor does one whose scheme is not the web's.** `origin` is the literal string `"null"` for
  // every other scheme, so `javascript:alert(1)` would otherwise leave here as `"null/*"` — a
  // value that is neither an address nor the refusal this function documents itself as returning.
  // Nothing a browser reports as a page URL is anything but HTTP(S); an address that is comes from
  // somewhere that was never a page, and there is nothing safe to say about it.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  // Everything after the path goes, always: no query, no fragment, no credentials.
  return parsed.origin + redactPath(parsed.pathname);
}
