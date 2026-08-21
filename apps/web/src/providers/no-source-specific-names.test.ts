// @vitest-environment node
//
// The structural half of *the application contains no TMDB-specific field name anywhere in this
// path* — a criterion of CAN-104 Read a Provider's capability declaration, and refuse what it does
// not serve, which names one word in terms.
//
// **The behavioural half is `refusals.test.ts`, and it is the stronger of the two**: the rule there
// is run against a vocabulary whose words point the opposite way to its flags, so a rule that had
// learnt a Source's word would get both cases backwards. What this adds is that the word cannot
// appear at all — including in a comparison no behaviour test reaches, and including in code
// nothing calls yet.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

/** `apps/web`, from this file two directories up. */
const root = fileURLToPath(new URL("../..", import.meta.url));

/**
 * This file, which holds the word in its own fixtures and would otherwise report itself.
 *
 * **It is the one gap in the search and it is stated rather than worked around.** A pattern built
 * from fragments so the file did not contain the word would be gaming the check; excluding one named
 * file leaves the exception visible, and the case below is what keeps the pattern honest.
 */
const thisFile = "src/providers/no-source-specific-names.test.ts";

/**
 * Every TypeScript file in the application, tests included.
 *
 * **The whole of `src`, not this directory alone**, because the criterion is about the application
 * rather than about one module: a Source's field name written into a page, a column or a query would
 * be the same failure, and a search scoped to the files that were written with the rule in mind
 * would only ever pass.
 */
const application = readdirSync(join(root, "src"), { recursive: true, encoding: "utf8" })
  .map((entry) => join("src", entry))
  .filter((file) => /\.tsx?$/.test(file) && file !== thisFile);

/**
 * `adult` is TMDB's field name, and the criterion names it.
 *
 * **It deliberately does not match a hyphenated or slashed occurrence**, because those are file
 * paths rather than code: ADR-0012 is `0012-adult-works-catalogued-artwork-never-displayed.md`, and
 * a comment citing a decision by its own filename is a link, not a flag anything reads.
 */
const asAFieldName = /(?<![/\w-])adult(?![\w-])/i;

test("the search reaches the whole application, so a clean result means something", () => {
  // A glob that resolved to nothing would report exactly what a clean application reports. The
  // floor is far below the file count on the day this was written; what it catches is zero.
  expect(application.length).toBeGreaterThan(30);
  expect(application).toContain(join("src", "providers", "declaration.ts"));
  expect(application).toContain(join("src", "app", "sources", "sources-page.tsx"));
});

test("the pattern finds the word where it is a field name, and not where it is a path", () => {
  // The check's own check. Without it, a pattern that had stopped matching anything would pass the
  // test below for the wrong reason — which is how a tripwire quietly stops being one.
  expect(asAFieldName.test('if (record.adult) return "no";')).toBe(true);
  expect(asAFieldName.test('classification.find((t) => t.term === "adult")')).toBe(true);
  expect(asAFieldName.test("docs/adr/0012-adult-works-catalogued-artwork-never-displayed.md")).toBe(
    false,
  );
});

test("no Source's own field name appears anywhere in the application", () => {
  const offending = application.filter((file) =>
    asAFieldName.test(readFileSync(join(root, file), "utf8")),
  );

  expect(offending).toEqual([]);
});
