import { expect, test } from "@playwright/test";

/**
 * **The security headers, read off a real response** — **CAN-53 Set the security headers, with the
 * CSP report-only first**.
 *
 * `headers()` in [`../next.config.ts`](../next.config.ts) is applied by the routing layer, not by
 * anything this application renders, so no in-process test can observe it: a header that stopped
 * being sent would leave every unit test green. That is why this file exists at HTTP level, and
 * [`../src/security/headers.test.ts`](../src/security/headers.test.ts) is the other half — it holds
 * the relationships *between* the headers, and runs in the gate where this suite does not
 * ([ADR-0017](../../../docs/adr/0017-testing-stack.md)).
 *
 * **What the tests here can see that the unit test cannot**: that the headers survive the platform.
 * Vercel's edge sits between this application and a browser, and a policy Next composed correctly
 * is still worth nothing if it never arrives.
 *
 * **This suite writes, mildly, and does not skip for it.** The last two tests each put one line in
 * the target's runtime log — one by making a browser report a violation, one by posting a report by
 * hand — where [`measurement-on-the-wire.spec.ts`](measurement-on-the-wire.spec.ts) skips without
 * `CANONCORE_E2E_BASE_URL` because its writes land in a dataset that is kept. A log line that
 * expires within the hour is not that, and the fabricated one names this file in its sample so that
 * anybody reading it back knows what it is.
 */

/** Every header whose value is fixed. HSTS is Vercel's and has a test of its own below. */
const expected = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
};

test("every security header arrives on a page", async ({ request }) => {
  const headers = (await request.get("/")).headers();

  for (const [header, value] of Object.entries(expected)) {
    expect(headers[header], `${header} on the wire`).toBe(value);
  }
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["content-security-policy"]).toBeDefined();
  expect(headers["content-security-policy-report-only"]).toBeDefined();
  expect(headers["content-security-policy-report-only"]).toContain("report-uri /api/csp-report");
});

// `headers()` matches `/(.*)`, and an API response is where `nosniff` earns most of its keep.
test("and on a route handler, not only on a rendered page", async ({ request }) => {
  expect((await request.get("/api/alive")).headers()["x-content-type-options"]).toBe("nosniff");
});

/**
 * The finding this ticket was corrected for, checked where it actually has to hold.
 * `frame-ancestors` protects nothing from a *report-only* policy, so the assertion is not that the
 * directive is present somewhere but that it is present in the header a browser enforces.
 */
test("clickjacking is refused by the enforced policy, not only reported by the other one", async ({
  request,
}) => {
  const enforced = (await request.get("/")).headers()["content-security-policy"];

  expect(enforced).toContain("frame-ancestors 'none'");
});

// Vercel's, not ours. The ticket leaves HSTS to the platform on the strength of a documented
// promise, and this is the assertion that the platform is in fact keeping it.
test("HSTS is supplied by the platform, which is why nothing here sets it", async ({ request }) => {
  expect((await request.get("/")).headers()["strict-transport-security"]).toContain("max-age=");
});

/**
 * That the policy is live in a browser, and is *reporting* rather than blocking.
 *
 * A host under `.invalid` is used because [RFC 2606](https://www.rfc-editor.org/rfc/rfc2606)
 * reserves it and it can never resolve. The violation is decided before the load is attempted, so
 * nothing here depends on reaching anything.
 */
test("a browser evaluates the policy, and reports instead of blocking", async ({ page }) => {
  await page.goto("/");

  const violation = await page.evaluate(async () => {
    const reported = new Promise<{ directive: string; disposition: string }>((resolve) => {
      document.addEventListener(
        "securitypolicyviolation",
        (event) => resolve({ directive: event.effectiveDirective, disposition: event.disposition }),
        { once: true },
      );
    });
    document.body.append(
      Object.assign(document.createElement("img"), { src: "https://example.invalid/blocked.png" }),
    );
    return reported;
  });

  // An image falls back to `default-src`, which the policy sets to `'self'`; the directive the
  // browser names for it is the specific one.
  expect(violation.directive).toBe("img-src");
  // The half that says this phase is report-only: an enforced policy would say "enforce" here.
  expect(violation.disposition).toBe("report");
});

/**
 * That the endpoint the policy names exists on this deployment.
 *
 * **This is the assertion the acceptance criteria turn on.** A report-only policy pointing at a
 * `report-uri` that 404s collects nothing, and looks from the response headers exactly like one
 * that collects everything — which would leave "report-only ran against real traffic" a claim with
 * no evidence under it.
 */
test("the collector the policy names answers a report", async ({ request }) => {
  const response = await request.post("/api/csp-report", {
    headers: { "content-type": "application/csp-report" },
    data: {
      "csp-report": {
        "document-uri": "/",
        "effective-directive": "img-src",
        "blocked-uri": "https://example.invalid/blocked.png",
        disposition: "report",
        // Named so that this line reads back from a log as a test's rather than a user's.
        "script-sample": "e2e/security-headers.spec.ts, a fabricated report",
      },
    },
  });

  expect(response.status()).toBe(204);
});
