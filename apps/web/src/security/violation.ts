import { redactUrl } from "@/analytics/redaction";

/**
 * What a Content Security Policy violation is allowed to say, once it has been reduced to
 * something safe to keep — **CAN-53 Set the security headers, with the CSP report-only first**.
 *
 * **The browser is what posts a report, so this is the first place anything of ours can touch
 * one.** That is the whole reason the collector is a route on this deployment rather than a
 * vendor's endpoint, and [`headers.ts`](headers.ts) argues it: a report carries the page's URL
 * with its query string intact, and two of this application's addresses put a live credential — in
 * one case an account holder's email address — in that query string. Everything reduced here is
 * reduced *before* it reaches a log, and before it could reach an error reporter later.
 *
 * ## One body shape, because one directive is sent
 *
 * `report-uri` posts `{"csp-report": {…}}` with kebab-case keys, as
 * [CSP3 § 5.3](https://www.w3.org/TR/CSP3/#deprecated-serialize-violation) defines it, and that is
 * the whole of what arrives. `report-to` posts a different shape — an array of Reporting API
 * envelopes with camel-case bodies — and [`headers.ts`](headers.ts) holds the measurement that says
 * why that directive is not sent. A parser for a shape nothing posts is a path nobody would notice
 * had rotted, so it is not carried; the day that directive is sent is the day it is written.
 *
 * **The `Content-Type` is the documented discriminator and is deliberately not read**:
 * `application/csp-report` is what the specification says, and a browser that labelled its post
 * differently would be dropped silently — which is the exact failure a report-only phase exists to
 * rule out. The shape is unambiguous, so reading it cannot fail that way.
 *
 * ## What is deliberately not kept
 *
 * The referrer, because no CSP diagnosis needs it and it is one more URL to reduce. And the line
 * and column numbers: in a hashed production bundle they locate nothing a person can act on, where
 * the directive and the blocked URL locate everything.
 */
export type Violation = {
  /** The directive that was violated, which is the one field a report is useless without. */
  readonly directive: string;
  /** What the browser refused to load, or a keyword such as `inline` where there was no URL. */
  readonly blocked: string | null;
  /** The page it happened on, reduced to the shape of its route. */
  readonly page: string | null;
  /** The script the violation came from, reduced the same way. */
  readonly source: string | null;
  /** The browser's excerpt of the offending content. */
  readonly sample: string | null;
  /** `enforce` or `report`, which is how the two policies this application sends are told apart. */
  readonly disposition: string | null;
};

/**
 * How much of one field is kept.
 *
 * A real report is far smaller than this — the sample is 40 bytes and the rest are URLs — so the
 * cap binds only on a forged post, which anyone can make because a reporting endpoint cannot be
 * authenticated. It is what stops one turning into an unbounded line in a log.
 */
const fieldLimit = 200;

/** How much of one body is read at all, on the same reasoning and for the same reason. */
const bodyLimit = 16_000;

/** An object, or nothing. Written out because every field below arrives as `unknown`. */
function fields(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** A non-empty string, capped. */
function text(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value.slice(0, fieldLimit) : null;
}

/**
 * A URL reduced to what it may say about itself, reusing the redaction the measurement products
 * already go through so that both answer to one tested rule
 * ([`../analytics/redaction.ts`](../analytics/redaction.ts)).
 *
 * **A value that is not a URL is kept as it is, and that is safe rather than a gap.** CSP reports
 * a blocked resource as a keyword — `inline`, `eval` — or as a bare scheme name where the scheme
 * is not HTTP(S), because [CSP3 § 5.4](https://www.w3.org/TR/CSP3/#strip-url-for-use-in-reports)
 * returns the scheme alone in that case. None of those can carry a query string. Anything else
 * reaching here is a forged post, which {@link fieldLimit} bounds.
 *
 * The cost is that a blocked *third-party* URL keeps its origin and loses its path, since the
 * redaction recognises this application's routes and nothing else. The origin is what a person
 * acts on, so that is a price worth paying for one rule instead of two.
 */
function address(value: unknown): string | null {
  const raw = text(value);
  if (raw === null) return null;
  return redactUrl(raw) ?? raw;
}

/**
 * The violation a posted body describes, reduced — or nothing.
 *
 * **One report, not a list**, because `report-uri` "sends a single request per violation"
 * ([CSP3 § 5.5](https://www.w3.org/TR/CSP3/#report-violation)); the batched shape belongs to the
 * directive [`headers.ts`](headers.ts) does not send.
 *
 * Nothing is a body that will not parse, one too long to read, one that is not this shape, and one
 * that names no directive — a reporting endpoint answers the same way to all of them, because
 * nothing is listening for its answer.
 */
export function violationFrom(body: string): Violation | null {
  if (body.length > bodyLimit) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }

  const report = fields(fields(parsed)?.["csp-report"]);
  if (report === null) return null;

  const directive = text(report["effective-directive"] ?? report["violated-directive"]);
  if (directive === null) return null;

  return {
    directive,
    blocked: address(report["blocked-uri"]),
    page: address(report["document-uri"]),
    source: address(report["source-file"]),
    sample: text(report["script-sample"]),
    disposition: text(report["disposition"]),
  };
}
