// @vitest-environment node
//
// Node rather than the default jsdom, because the second block below walks `src/app` to
// derive the route list rather than restating it. Under jsdom `import.meta.url` is not a
// `file:` URL and there is nothing to resolve the directory against.
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { redactPath, redactUrl, staticPaths } from "./redaction";

const origin = "https://www.canoncore.com";

describe("redactUrl", () => {
  test("leaves a known static path alone", () => {
    expect(redactUrl(`${origin}/`)).toBe(`${origin}/`);
    expect(redactUrl(`${origin}/sign-in`)).toBe(`${origin}/sign-in`);
  });

  test("drops the query string, which is where the reset token lives", () => {
    expect(redactUrl(`${origin}/reset-password?token=a-real-reset-token`)).toBe(
      `${origin}/reset-password`,
    );
  });

  test("drops the fragment", () => {
    expect(redactUrl(`${origin}/sign-in#anything`)).toBe(`${origin}/sign-in`);
  });

  test("reduces a known dynamic route to its shape", () => {
    expect(redactUrl(`${origin}/story/2f8b0e1a-0000-4000-8000-000000000000`)).toBe(
      `${origin}/story/*`,
    );
  });

  test("reduces a path it does not recognise to nothing but its origin", () => {
    // The case ADR-0020 names: a top-level segment that is somebody's name.
    expect(redactUrl(`${origin}/jacob-rees/the-war-doctor`)).toBe(`${origin}/*`);
  });

  test("normalises a trailing slash rather than treating it as a different path", () => {
    expect(redactUrl(`${origin}/sign-in/`)).toBe(`${origin}/sign-in`);
  });

  test("drops the event when the URL will not parse", () => {
    expect(redactUrl("not-a-url")).toBeNull();
  });
});

/**
 * The two properties that keep this module honest as routes are added, derived from the
 * filesystem rather than from a list somebody has to remember to update.
 *
 * The first is about *signal*: a static route missing from `staticPaths` still redacts safely,
 * it just arrives as `/*` and stops being distinguishable from every other unknown page. The
 * second is about *safety*, and is the one ADR-0020 rests on.
 */
describe("redactPath", () => {
  // The half `beforeSend` cannot do for us. `analytics.tsx` says why the vendors get this rather
  // than computing a route themselves; these are the cases that made it necessary.
  test("keeps a known static path", () => {
    expect(redactPath("/sign-in")).toBe("/sign-in");
    expect(redactPath("/")).toBe("/");
  });

  test("reduces a known dynamic route to its shape", () => {
    expect(redactPath("/story/2f8b0e1a-0000-4000-8000-000000000000")).toBe("/story/*");
  });

  test("reduces an encoded slug the vendor's own computeRoute would pass through whole", () => {
    // `computeRoute("/ordering/the%20war%20doctor", { slug: "the war doctor" })` returns the path
    // unchanged, because the decoded parameter does not appear in the encoded pathname.
    expect(redactPath("/ordering/the%20war%20doctor")).toBe("/*");
    expect(redactPath("/caf%C3%A9-author/a-list")).toBe("/*");
  });

  test("says nothing when there is no path to reduce", () => {
    expect(redactPath(null)).toBe("/*");
  });

  test("is idempotent, because what it returns is passed on as a path in its own right", () => {
    for (const path of ["/", "/sign-in", "/story/*", "/*"]) {
      expect(redactPath(redactPath(path))).toBe(redactPath(path));
    }
  });
});

describe("every route this application serves", () => {
  const appDirectory = fileURLToPath(new URL("../app", import.meta.url));

  /** Route paths derived from `page.tsx` files, in Next's own App Router spelling. */
  const routes = (function walk(directory: string, segments: string[]): string[] {
    const found: string[] = [];
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        // A route group `(name)` contributes no segment. Nothing here uses one yet.
        const segment = /^\(.*\)$/.test(entry.name) ? [] : [entry.name];
        found.push(...walk(`${directory}/${entry.name}`, [...segments, ...segment]));
      } else if (entry.name === "page.tsx") {
        found.push(`/${segments.join("/")}`);
      }
    }
    return found;
  })(appDirectory, []);

  test("is discovered, so an empty list can never pass these vacuously", () => {
    expect(routes.length).toBeGreaterThan(5);
    expect(routes).toContain("/");
    expect(routes).toContain("/story/[id]");
  });

  test.each(routes.filter((route) => !route.includes("[")))(
    "%s is a static route, so it survives redaction intact",
    (route) => {
      expect(redactUrl(origin + route)).toBe(origin + route);
      expect(staticPaths.has(route)).toBe(true);
    },
  );

  // The other direction, and the one a deleted page breaks: an entry nothing serves any more is a
  // path this module would wave through if a route of that name ever came back for another reason.
  test("is the whole of what `staticPaths` names, with nothing stale left in it", () => {
    expect([...staticPaths].sort()).toEqual(routes.filter((route) => !route.includes("[")).sort());
  });

  test.each(routes.filter((route) => route.includes("[")))(
    "%s carries a dynamic segment, so no value of it reaches the event",
    (route) => {
      const sentinel = "a-value-that-must-not-be-sent";
      const concrete = route.replaceAll(/\[+[^\]]+\]+/g, sentinel);
      expect(redactUrl(origin + concrete)).not.toContain(sentinel);
    },
  );
});
