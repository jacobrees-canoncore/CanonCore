// @vitest-environment node
//
// A violation report is posted by the browser, so this module is the first and only place
// anything of ours touches one. What it must never let through is a query string: `violation.ts`
// and `headers.ts` carry that argument, and the tests below are what hold it.
import { describe, expect, test } from "vitest";
import { violationFrom } from "./violation";

const origin = "https://www.canoncore.com";

/**
 * The sharpest case this module exists for. It is invented rather than minted, for the reason `e2e/measurement-on-the-wire.spec.ts` gives about the same address: the
 * redaction drops the whole query string and cannot tell a live token from an invented one, so a
 * working credential in a test file would buy nothing.
 */
const invented = "an-invented-token-that-must-never-be-reported";
const resetPassword = `${origin}/reset-password?token=${invented}`;

/** One report in the shape `report-uri` posts, as CSP3 § 5.3 serialises it. */
function deprecated(report: Record<string, unknown>): string {
  return JSON.stringify({ "csp-report": report });
}

describe("a report the browser posts", () => {
  test("is reduced to the fields worth keeping", () => {
    expect(
      violationFrom(
        deprecated({
          "document-uri": `${origin}/story/2f8b0e1a-0000-4000-8000-000000000000`,
          referrer: `${origin}/`,
          "blocked-uri": "https://vercel.live/_next-live/feedback/feedback.js",
          "effective-directive": "script-src",
          "violated-directive": "script-src",
          "original-policy": "default-src 'self'",
          disposition: "report",
          "status-code": 200,
          "script-sample": "",
        }),
      ),
    ).toEqual({
      directive: "script-src",
      // The origin survives, which is what a person acts on; the path does not, because the
      // redaction recognises this application's routes and nothing else.
      blocked: "https://vercel.live/*",
      page: `${origin}/story/*`,
      source: null,
      sample: null,
      disposition: "report",
    });
  });

  test("never carries the query string of the page it happened on", () => {
    const violation = violationFrom(
      deprecated({ "document-uri": resetPassword, "effective-directive": "style-src" }),
    );

    expect(violation?.page).toBe(`${origin}/reset-password`);
    expect(JSON.stringify(violation)).not.toContain(invented);
  });

  test("reduces the script it came from the same way", () => {
    expect(
      violationFrom(
        deprecated({ "effective-directive": "script-src", "source-file": resetPassword }),
      )?.source,
    ).toBe(`${origin}/reset-password`);
  });

  test("keeps a blocked keyword, which is not a URL and cannot carry one", () => {
    expect(
      violationFrom(deprecated({ "blocked-uri": "inline", "effective-directive": "script-src" }))
        ?.blocked,
    ).toBe("inline");
  });

  test("falls back to the directive Firefox's older spelling supplies", () => {
    expect(
      violationFrom(deprecated({ "violated-directive": "img-src https://example.com" }))?.directive,
    ).toBe("img-src https://example.com");
  });

  test("is dropped when it names no directive, because that is the field it is useless without", () => {
    expect(violationFrom(deprecated({ "document-uri": `${origin}/` }))).toBeNull();
  });
});

describe("anything else that is posted", () => {
  // Nobody reads this endpoint's answer, so every one of these is dropped rather than argued
  // with. The tests are here because "dropped" must mean dropped and not "throws".
  test.each([
    ["a body that is not JSON", "<html>not a report</html>"],
    ["an empty body", ""],
    ["JSON that is neither shape", JSON.stringify({ hello: "world" })],
    ["a null body", "null"],
    [
      "the Reporting API shape, which `headers.ts` does not ask any browser to send",
      JSON.stringify([{ type: "csp-violation", body: { effectiveDirective: "script-src" } }]),
    ],
    ["a csp-report that is not an object", JSON.stringify({ "csp-report": "sorry" })],
  ])("%s yields nothing", (_, body) => {
    expect(violationFrom(body)).toBeNull();
  });

  // The endpoint cannot be authenticated — the browser posts it, not the page — so anyone can
  // make one of these. The caps are what stop that becoming an unbounded line in a log.
  test("a body too long to be a report is not read at all", () => {
    const huge = deprecated({
      "effective-directive": "script-src",
      "script-sample": "x".repeat(20_000),
    });

    expect(violationFrom(huge)).toBeNull();
  });

  test("a field longer than a report's own field is truncated", () => {
    const sample = "y".repeat(500);
    const violation = violationFrom(
      deprecated({
        "effective-directive": "script-src",
        "script-sample": sample,
      }),
    );

    expect(violation?.sample).toHaveLength(200);
    expect(sample).toContain(violation?.sample);
  });
});
