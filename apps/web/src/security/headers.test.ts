// @vitest-environment node
//
// **The headers themselves cannot be tested here**, because `headers()` is applied by the routing
// layer and nothing in process ever sees the result — `e2e/security-headers.spec.ts` is where they
// are read off a real response. What this file holds is the set of relationships *between* the
// headers, each of which fails silently on the wire: a policy that reports where nothing collects,
// or a clickjacking defence that is only reported, both look exactly like a working one.
//
// It is in the gate and the e2e suite is not (ADR-0017), so this is the half that runs on a push.
import { describe, expect, test } from "vitest";
import { securityHeaders } from "./headers";

function header(key: string): string {
  const found = securityHeaders.find((entry) => entry.key === key);
  expect(found, `no ${key} header is set`).toBeDefined();
  return found!.value;
}

/** A policy read back as the map of directive to value that a browser reads it as. */
function directivesOf(policy: string): Map<string, string> {
  return new Map(
    policy
      .split(";")
      .map((directive) => directive.trim())
      .filter(Boolean)
      .map((directive) => {
        const [name, ...value] = directive.split(/\s+/);
        return [name!, value.join(" ")] as const;
      }),
  );
}

const enforced = directivesOf(header("Content-Security-Policy"));
const reported = directivesOf(header("Content-Security-Policy-Report-Only"));

describe("the two policies", () => {
  // The finding this ticket was corrected for. `frame-ancestors` exists only as a CSP directive,
  // so leaving it to the report-only phase ships no clickjacking protection at all while reading,
  // from a checklist, exactly like shipping some.
  test("enforce frame-ancestors from the first commit rather than reporting it", () => {
    expect(enforced.get("frame-ancestors")).toBe("'none'");
  });

  // The drift this would otherwise invite: loosening a directive in the policy that is enforced
  // and not in the one that will be promoted to enforcement, or the other way round.
  test("cannot disagree, because everything enforced is also in the policy being reported", () => {
    for (const [name, value] of enforced) expect(reported.get(name)).toBe(value);
  });

  test("send the reported policy somewhere, since one that reports nowhere collects nothing", () => {
    expect(reported.get("report-uri")).toBe("/api/csp-report");
  });

  /**
   * The measurement in `headers.ts` in assertion form, and the reason it is worth one: `report-to`
   * is what every recipe says to send alongside `report-uri`, and CSP3 makes the newer directive
   * *override* the older. Adding it back would leave every other test here green, the headers
   * looking more standards-current than before, and nothing arriving at the collector at all.
   */
  test("do not carry report-to, which would override the directive that works", () => {
    expect(reported.has("report-to")).toBe(false);
    expect(securityHeaders.map((entry) => entry.key)).not.toContain("Reporting-Endpoints");
  });
});

describe("the policy being reported", () => {
  // The one concession, and the whole reason this application ships a weaker policy than a
  // nonce-based one — `headers.ts` argues it. It is a concession in exactly one directive, and a
  // `default-src` that carried it would silently extend it to every fetch directive at once.
  test("spends 'unsafe-inline' on scripts and nowhere else", () => {
    for (const [name, value] of reported) {
      if (name === "script-src") continue;
      expect(value, `${name} carries 'unsafe-inline'`).not.toContain("'unsafe-inline'");
    }
  });

  test("never allows eval, which nothing here needs in production", () => {
    expect(header("Content-Security-Policy-Report-Only")).not.toContain("unsafe-eval");
  });

  // Without this a directive nobody thought to name falls back to nothing at all.
  test("has a default for every fetch directive it does not name", () => {
    expect(reported.get("default-src")).toContain("'self'");
  });

  /**
   * A report of an inline violation says only that *something* inline was refused unless the
   * directive it was checked against carries this, and what was refused is the whole question the
   * report-only phase asks. It allows nothing, so nothing else here would go red if it vanished.
   */
  test("asks for a sample on the two directives an inline violation is checked against", () => {
    for (const name of ["default-src", "script-src"]) {
      expect(reported.get(name), `${name}`).toContain("'report-sample'");
    }
  });
});

describe("the headers that are not a policy", () => {
  test("refuse content-type sniffing", () => {
    expect(header("X-Content-Type-Options")).toBe("nosniff");
  });

  // A referrer that left this origin whole would take a query string with it, and `headers.ts`
  // says what one of those can be.
  test("tell another site the origin and no more", () => {
    expect(header("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  test("deny every capability they name, rather than granting one to self", () => {
    for (const feature of header("Permissions-Policy").split(",")) {
      expect(feature.trim()).toMatch(/^[a-z-]+=\(\)$/);
    }
  });
});
