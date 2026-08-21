/**
 * The security headers every response carries, and the one policy both Content-Security-Policy
 * headers are derived from — **CAN-53 Set the security headers, with the CSP report-only first**.
 *
 * `next.config.ts` is the only caller. `headers()` is applied by the routing layer rather than by
 * anything this application renders, which is why the test that proves these arrive is an HTTP one
 * ([`../../e2e/security-headers.spec.ts`](../../e2e/security-headers.spec.ts)) and not a unit test:
 * nothing in process ever sees them.
 *
 * **HSTS is deliberately not here.** Vercel already sends it — "The `.vercel.app` domain and all
 * subdomains support HSTS by default and are preloaded in browser HSTS lists. Custom domains also
 * use HSTS" ([CDN security](https://vercel.com/docs/cdn-security)) — so a second `max-age` of our
 * own would be a number nobody maintains sitting in front of one that is already right.
 *
 * **`X-Frame-Options` is not here for the opposite reason.** CSP3 makes `frame-ancestors 'none'`
 * "roughly equivalent to that header's `DENY`", and says that where a policy names `frame-ancestors`
 * "and whose disposition is `enforce`, then the `X-Frame-Options` header will be ignored"
 * ([§ 6.4.2.2](https://www.w3.org/TR/CSP3/#frame-ancestors-and-frame-options)). Both halves of that
 * sentence matter here: the enforced policy below makes the older header dead weight, and the word
 * *enforce* in it is why {@link enforcedToday} exists.
 *
 * ## Why the policy carries `'unsafe-inline'` instead of a nonce
 *
 * Next's nonce recipe requires that "**all pages must be dynamically rendered**… Static
 * optimization and Incremental Static Regeneration (ISR) are disabled… Pages cannot be cached by
 * CDNs without additional configuration… **Partial Prerendering (PPR) is incompatible** with
 * nonce-based CSP" ([Content Security
 * Policy](https://nextjs.org/docs/app/guides/content-security-policy), which is also the source of
 * the `next.config` shape used here — its own *Without Nonces* recipe).
 *
 * This is a public-read catalogue, so a nonce would convert every cached anonymous page read into
 * a function invocation, against Hobby's 1,000,000-invocation and 4-CPU-hour ceiling
 * (docs/research/production-readiness-baseline.md). The weaker static policy is the right trade at
 * this size, and the absence of nonces here is a decision rather than an oversight.
 *
 * **`experimental.sri` is the thing to revisit, and it is not the escape hatch it reads as.** It
 * "allows you to maintain static generation while still having a strict CSP" and exists in the
 * 16.3.0 installed here (`next/dist/server/config-shared.d.ts`, `experimental.sri.algorithm`). But
 * SRI covers *externally fetched* resources, and App Router serialises the RSC payload into inline
 * `<script>` elements that cannot carry an `integrity` attribute — so turning it on would not on
 * its own remove `'unsafe-inline'` from `script-src`. Revisit it when it leaves experimental,
 * knowing that.
 */

/**
 * Where a violation report goes: a route on this deployment rather than a vendor's endpoint.
 *
 * **A first-party collector is not a placeholder for Sentry, it is the only shape that can be
 * one.** The browser posts a report *directly* to whatever this names, so no `beforeSend` of ours
 * ever runs on it — and a report carries the page's URL with its query string intact, because
 * CSP's own [strip URL for use in reports](https://www.w3.org/TR/CSP3/#strip-url-for-use-in-reports)
 * removes the fragment, username and password and nothing else. Two addresses this application
 * serves carry a credential in that query string, one of them an account holder's email address
 * ([`docs/infrastructure.md`](../../../../docs/infrastructure.md) → *The two query strings the
 * email flows put in a URL*), and `content/legal/terms-of-service.md` promises that what reaches
 * Sentry carries neither an IP address nor an email address. Pointing a browser straight at
 * Sentry would break that promise the first time somebody's reset link tripped a directive.
 * [`violation.ts`](violation.ts) is where the redaction that makes a report safe to keep happens,
 * and it is the thing **CAN-51 Keep a record of server errors past the hour Vercel keeps them**
 * would forward *through* rather than around.
 *
 * **Relative on purpose**, so that production, every preview and a local build each report to
 * themselves without being told which host they are. `report-uri` parses each token "with
 * violation's url as the base URL" ([CSP3](https://www.w3.org/TR/CSP3/#report-violation)).
 *
 * ## Why `report-to` is not sent alongside it, though every recipe says to send both
 *
 * `report-uri` is deprecated in favour of `report-to`, and the documented compatibility recipe is
 * to send both — Sentry's setup page, and MDN, which says "until `report-to` is broadly supported
 * you can specify both directives"
 * ([`report-to`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/report-to)).
 * It rests on CSP3 settling the overlap: "**report-uri only takes effect if report-to is not
 * present**… allowing for backwards compatibility with browsers that don't support the new
 * mechanism" ([§ 5.5](https://www.w3.org/TR/CSP3/#report-violation)).
 *
 * **That reasoning has expired, and the override is what is left of it.** There is no longer a
 * browser here that lacks `report-to`: Chrome 70, Firefox 149 and Safari 16.4
 * ([MDN browser-compat-data](https://github.com/mdn/browser-compat-data/blob/main/http/headers/Content-Security-Policy.json),
 * read 21 August 2026). So sending both no longer buys coverage from anything — it only switches
 * the working directive off.
 *
 * **Measured, on 21 August 2026.** Serve one page carrying the policy under test — and, in every
 * arm that names `report-to`, a `Reporting-Endpoints` header declaring that group, without which
 * the directive would name nothing and the result would be about the harness rather than about the
 * browser. Raise a violation in the page by appending an `<img>` from a host under `.invalid`, and
 * count what a collector receives over the next 8 seconds. Each engine is the one
 * `@playwright/test` installs:
 *
 * | Policy | Chromium 151 | Firefox 153 | WebKit 26.5 |
 * | --- | --- | --- | --- |
 * | `report-uri` alone | **1** | **1** | **1** |
 * | both directives | 0 | 0 | 1 |
 *
 * Longer waits do not rescue the empty cells: `report-to` alone delivered nothing in 120 seconds,
 * and both together nothing in 70 over HTTPS or 60 in a headed browser — where a `ReportingObserver`
 * in the page *did* receive the `csp-violation` report, so the policy was evaluated and the report
 * was generated, and what did not happen was delivery. WebKit is the one engine that reports either
 * way, which is a reprieve for a third of visitors rather than a reason.
 *
 * Sending both would therefore leave a report-only phase reporting nowhere in two engines out of
 * three — the exact failure this ticket was corrected to avoid, arrived at by following the recipe.
 *
 * **So `report-to` is the thing to revisit, and the trigger is a browser dropping `report-uri`.**
 * Re-run the measurement above then rather than reading a recipe.
 */
const collector = "/api/csp-report";

/**
 * The policy, once. Every directive here is one the enforced header and the report-only header
 * must agree about, which is why neither is written out by hand below.
 *
 * `default-src 'self'` covers every fetch directive not named here — this application loads no
 * font, image, stylesheet or script from anywhere but itself, and Vercel's two measurement
 * products are served from this origin as `/_vercel/…` rather than from a vendor's
 * ([`../analytics/analytics.tsx`](../analytics/analytics.tsx)). So the two fetch directives beside
 * it are the deviations, and the last three have no `default-src` fallback at all.
 *
 * `script-src` is where `'unsafe-inline'` is spent and the header above says why. **Nothing else
 * gets it, including `style-src`** — which is a departure from Next's own recipe, and is measured:
 * five pages of this application loaded under exactly this policy on 21 August 2026 raised no
 * violation of any directive, and the served HTML carried no inline `<style>` at all. The
 * report-only phase is what keeps that checked rather than assumed.
 *
 * **`'report-sample'` allows nothing and is not decoration.** A violation's sample "will be
 * populated with the first 40 characters of an inline script, event handler, or style that caused a
 * violation" — but only "if directive's value contains the expression `'report-sample'`"
 * ([CSP3 § 2.4](https://www.w3.org/TR/CSP3/#framework-violation), § 4.2.3). Without it every report
 * of an inline violation arrives saying that *something* inline was refused and nothing about what,
 * which is the one question this phase is asking. It goes on the two directives an inline violation
 * can be checked against: `script-src`, and `default-src` for everything that falls back to it —
 * a style among them, which is the violation actually expected here.
 */
const directives = {
  "default-src": "'self' 'report-sample'",
  "script-src": "'self' 'unsafe-inline' 'report-sample'",
  "object-src": "'none'",
  "base-uri": "'self'",
  "form-action": "'self'",
  "frame-ancestors": "'none'",
} as const;

type Directive = keyof typeof directives;

/**
 * The directives that are enforced today, while the rest are still only reported.
 *
 * **`frame-ancestors` cannot wait for the report-only phase to end**, and that is the whole reason
 * this list exists rather than a single header. Clickjacking is the one threat in this policy with
 * nothing else standing between it and a user — `X-Frame-Options` is the header it replaced and is
 * not sent here — so a policy that merely *reports* `frame-ancestors` ships no protection at all
 * while reading, from a ticket's checklist, exactly like one that does
 * (docs/research/tracker-and-repository-audit.md → §5). Sending an enforced
 * `frame-ancestors`-only policy alongside a report-only full one is legal and ordinary: a response
 * may carry both headers, and each is evaluated on its own.
 *
 * **It stays in {@link directives} as well**, so that the report-only policy is the exact policy
 * the enforcement commit will promote rather than a subset of it — and so that framing is reported
 * at all. The enforced header carries no `report-uri`, so a block *by it* is never reported; the
 * report-only policy is what puts the attempt in the log, once.
 */
const enforcedToday: readonly Directive[] = ["frame-ancestors"];

/** The named directives, in the serialisation a `Content-Security-Policy` header wants. */
function serialise(names: readonly Directive[]): string {
  return names.map((name) => `${name} ${directives[name]}`).join("; ");
}

/**
 * The capabilities a browser must refuse this application, whoever asks.
 *
 * **The list is what an injected script could otherwise reach**, which is a live question here
 * rather than a theoretical one: `script-src` carries `'unsafe-inline'`, so a successful injection
 * runs. Nothing this application does needs a camera, a microphone, a location, a screen capture,
 * a payment handler or a USB device, and nothing needs to be included in Topics
 * ([ADR-0020](../../../../docs/adr/0020-no-cookie-consent-banner.md) is the wider position on
 * being counted). An empty allowlist, `()`, denies the feature to this document and to anything it
 * frames.
 *
 * A feature *not* named here keeps its default, which for most is `self` — so this is a deny list
 * of the ones worth denying, not an attempt at the full register.
 */
const permissionsPolicy = [
  "browsing-topics=()",
  "camera=()",
  "display-capture=()",
  "geolocation=()",
  "microphone=()",
  "payment=()",
  "usb=()",
].join(", ");

/**
 * What every response carries. Consumed by `next.config.ts`'s `headers()`, which is why this is a
 * mutable array of `{ key, value }` — Next's own `Header` type.
 */
export const securityHeaders: { key: string; value: string }[] = [
  // A response whose `Content-Type` says one thing and whose bytes look like another is a script
  // waiting for a browser to guess. This says: never guess.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Same-origin navigations still carry the full address, which is ours already; anything leaving
  // this site is told the origin and no more. It matters more here than usual for the reason
  // `collector` gives above: a query string on this site can be a credential.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: permissionsPolicy },
  { key: "Content-Security-Policy", value: serialise(enforcedToday) },
  {
    key: "Content-Security-Policy-Report-Only",
    // `report-uri` alone, which is deliberate and measured rather than a version behind: the
    // header above this array says what happens when `report-to` is sent beside it.
    value: [serialise(Object.keys(directives) as Directive[]), `report-uri ${collector}`].join(
      "; ",
    ),
  },
];
