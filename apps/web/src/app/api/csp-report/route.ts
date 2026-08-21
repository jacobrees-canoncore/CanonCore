import { violationFrom } from "@/security/violation";

/**
 * Where the Content Security Policy sends its violation reports — **CAN-53 Set the security
 * headers, with the CSP report-only first**.
 *
 * **A report-only policy with nowhere to report is a box ticked and nothing collected**, and it
 * would make the enforcement that follows unfalsifiable: "we ran report-only against real traffic"
 * is a claim about evidence, and without an endpoint there is none. This route is that endpoint.
 * Why it is ours rather than a vendor's — and why it stays ours after **CAN-51 Keep a record of
 * server errors past the hour Vercel keeps them** lands — is
 * [`@/security/headers`](../../../security/headers.ts); what it is allowed to keep is
 * [`@/security/violation`](../../../security/violation.ts).
 *
 * **What this buys, stated honestly.** A violation reaches Vercel's runtime log, which Hobby keeps
 * for **one hour** (docs/research/production-readiness-baseline.md), so this makes violations
 * *observable* rather than *durable*. That is enough for what the
 * report-only phase is actually for here — loading this application's own pages and reading back
 * what the policy would have blocked — and it is not enough to watch a month of strangers. The
 * durable half is the ticket named above, which this route is shaped to forward through rather
 * than be replaced by.
 *
 * **204, always, and to any body.** A reporting endpoint's answer is never read: CSP3 says of the
 * `report-uri` request that "the result will be ignored"
 * ([§ 5.5](https://www.w3.org/TR/CSP3/#report-violation)). So a malformed or forged post is dropped
 * silently rather than argued with — there is nobody on the other end to tell.
 *
 * **It is unauthenticated because it cannot be otherwise**: the browser posts it, not the page, so
 * there is no credential to attach. Anyone who knows this address can therefore make a line
 * appear in a log, and both caps in `violation.ts` are there for that rather than for a browser.
 * The remaining cost is one function invocation per report, against the 1,000,000 a month Hobby
 * includes (docs/adr/0024-vercel-pro-for-a-spend-cap-rather-than-an-outage.md), which is worth
 * watching if an enforced policy is ever wrong on a busy page.
 */
export async function POST(request: Request): Promise<Response> {
  const violation = violationFrom(await request.text());
  // Prefixed like every other line this application writes, so that one search finds them —
  // `src/db/session.ts` and `src/auth/auth.ts` are the others.
  if (violation)
    console.warn(`[canoncore] content security policy violation: ${JSON.stringify(violation)}`);

  return new Response(null, { status: 204 });
}
