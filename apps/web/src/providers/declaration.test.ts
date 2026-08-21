// @vitest-environment node
//
// The parse, read against the published contract rather than against a fixture of its own.
//
// `docs/provider-contract/v1/openapi.yaml` is normative and this application's schema is not, so
// the three examples in it are the cases that matter: a declaration the contract publishes as
// conformant and this parser refuses is a divergence, and it would otherwise be found by a Provider
// rather than by a run. `scripts/provider-contract.test.ts` is the other half — it holds the
// document itself to its own schema — and neither test can do the other's job.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { describe, expect, test } from "vitest";
import {
  indefinitely,
  parseDeclaration,
  retentionAsInterval,
  retentionFromInterval,
} from "./declaration";

const contract = parseYaml(
  readFileSync(
    fileURLToPath(new URL("../../../../docs/provider-contract/v1/openapi.yaml", import.meta.url)),
    "utf8",
  ),
) as {
  paths: {
    "/capabilities": {
      get: {
        responses: {
          "200": {
            content: {
              "application/json": { examples: Record<string, { value: Record<string, unknown> }> };
            };
          };
        };
      };
    };
  };
};

const published = contract.paths["/capabilities"].get.responses["200"].content["application/json"]
  .examples;

/** Every declaration the contract publishes as conformant, by the name it publishes it under. */
const publishedDeclarations = Object.entries(published).map(
  ([name, example]) => [name, example.value] as const,
);

/**
 * The smallest conformant declaration, and the base every case below varies from.
 *
 * Deliberately the same shape `scripts/provider-contract.test.ts` uses: what is required is what the
 * Source's terms say, so this carries a retention, a licence, an attribution of *none* and an empty
 * restriction list, and none of the three optional blocks.
 */
const minimal = {
  declaredAt: "2026-08-17T08:00:00Z",
  source: { id: "example", name: "An example Source", url: "https://example.invalid" },
  retention: "indefinite",
  licence: {
    spdx: "CC0-1.0",
    name: "CC0 1.0 Universal",
    url: "https://example.invalid/licence",
    shareAlike: false,
  },
  attribution: { required: false },
  restrictions: [],
};

/**
 * The minimal declaration with one member taken out, which is how every absence case is made.
 *
 * A filter rather than destructuring a rest, because the discarded half of a rest destructure is a
 * variable nothing reads and the linter is right about it.
 */
function omitting(member: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(minimal).filter(([key]) => key !== member));
}

/** The parsed declaration, or a failure carrying the refusal so a broken case reads legibly. */
function read(body: unknown) {
  const parsed = parseDeclaration(body);
  if (!parsed.ok) throw new Error(`refused: ${parsed.refused}`);
  return parsed.declaration;
}

test.each(publishedDeclarations)("the contract's %s example is read", (_name, value) => {
  expect(parseDeclaration(value).ok).toBe(true);
});

test("the three published examples are all of them, so none is quietly dropped", () => {
  // A `test.each` over an empty list passes by running nothing, which is how this file would go on
  // reporting green if the examples were ever moved or renamed out from under it.
  expect(publishedDeclarations.map(([name]) => name)).toEqual([
    "proprietaryTermsWithAPrescribedNotice",
    "shareAlikeProseAndAChronology",
    "publicDomainWithNoObligationAtAll",
  ]);
});

test("a member this application does not know about is ignored rather than refused", () => {
  // The contract is additive-only, so a consumer that refused an unrecognised member would break on
  // its next revision. Ignored means dropped: it is not stored, and nothing is honoured on it.
  const declaration = read({ ...minimal, somethingAddedLater: { anything: true } });

  expect(declaration).not.toHaveProperty("somethingAddedLater");
});

describe("what the Source's terms say, which is never optional", () => {
  test.each([["retention"], ["licence"], ["attribution"], ["restrictions"], ["source"], ["declaredAt"]])(
    "a declaration with no %s is refused rather than read permissively",
    (member) => {
      expect(parseDeclaration(omitting(member)).ok).toBe(false);
    },
  );

  test("silence about retention is not a declaration of indefinite retention", () => {
    // The two are opposite answers and only one of them is safe, so the absence is a refusal of the
    // whole declaration rather than a value chosen on the Provider's behalf.
    expect(parseDeclaration(omitting("retention")).ok).toBe(false);
    expect(read({ ...minimal, retention: indefinitely }).retention).toBe(indefinitely);
    expect(read({ ...minimal, retention: "P6M" }).retention).toBe("P6M");
  });

  test.each([["6 months"], ["P"], [""], ["P0D"], ["PT0.0S"], ["-P6M"], [null], [6]])(
    "%s is not a retention any terms can express",
    (retention) => {
      expect(parseDeclaration({ ...minimal, retention }).ok).toBe(false);
    },
  );

  test("an empty restriction list is an answer, and a missing one is not", () => {
    expect(read({ ...minimal, restrictions: [] }).restrictions).toEqual([]);
    expect(read({ ...minimal, restrictions: ["non-commercial", "no-ai-training"] }).restrictions)
      .toEqual(["non-commercial", "no-ai-training"]);
  });

  test("a term this application has never heard of is carried verbatim", () => {
    // The vocabulary is open, and a consumer surfaces a term rather than interpreting it. So a
    // restriction nothing here knows about survives the read unchanged.
    expect(read({ ...minimal, restrictions: ["no-onward-syndication"] }).restrictions).toEqual([
      "no-onward-syndication",
    ]);
  });

  test("attribution that is required cannot be a claim with nothing behind it", () => {
    const owed = (attribution: Record<string, unknown>) =>
      parseDeclaration({ ...minimal, attribution: { required: true, ...attribution } }).ok;

    expect(owed({})).toBe(false);
    expect(owed({ link: "https://example.invalid" })).toBe(false);
    expect(owed({ notices: [{ text: "Data from Somewhere" }] })).toBe(false);
    expect(owed({ notices: [], link: "https://example.invalid" })).toBe(false);
    expect(owed({ notices: [{ text: "Data from Somewhere" }], link: "https://example.invalid" }))
      .toBe(true);
  });

  test("one Source may prescribe more than one notice, each with its own condition", () => {
    const attribution = read({
      ...minimal,
      attribution: {
        required: true,
        link: "https://example.invalid",
        notices: [
          { text: "First prescribed wording", conditions: "Displayed prominently." },
          { text: "A different prescribed wording", conditions: "In an About section." },
        ],
      },
    }).attribution;

    expect(attribution.required).toBe(true);
    expect(attribution.required && attribution.notices).toHaveLength(2);
  });

  test("attribution requiring nothing is complete on its own", () => {
    expect(read({ ...minimal, attribution: { required: false } }).attribution).toEqual({
      required: false,
    });
  });
});

describe("what the Provider does, where absence means it does not", () => {
  test("no classification block is read as no classification, never as nothing to classify", () => {
    expect(read(minimal).classification).toBeUndefined();
    expect(read({ ...minimal, classification: { vocabulary: [{ term: "a-word", suppressesArtwork: true }] } })
      .classification).toEqual([{ term: "a-word", suppressesArtwork: true }]);
  });

  test("a classification block declaring no term at all is refused", () => {
    // An empty vocabulary is neither "does not classify" nor a vocabulary, so there is nothing a
    // consumer could do with it but guess.
    expect(parseDeclaration({ ...minimal, classification: { vocabulary: [] } }).ok).toBe(false);
  });

  test("a term that declares no consequence is refused", () => {
    // Without the flag a consumer would have to read the word, which is the source-specific
    // knowledge this shape exists to remove.
    expect(parseDeclaration({ ...minimal, classification: { vocabulary: [{ term: "a-word" }] } }).ok)
      .toBe(false);
  });

  test("no orderings block and no liveness block are each read as absent", () => {
    expect(read(minimal).orderings).toBeUndefined();
    expect(read(minimal).liveness).toBeUndefined();
    expect(read({ ...minimal, orderings: { canonical: false } }).orderings).toEqual({
      canonical: false,
    });
    expect(read({ ...minimal, liveness: { confirmsDeletion: false } }).liveness).toEqual({
      confirmsDeletion: false,
    });
  });
});

describe("a declaration the application cannot read at all", () => {
  test.each([[null], [undefined], ["a string"], [42], [[]]])(
    "%s is refused with a reason rather than thrown over",
    (body) => {
      const parsed = parseDeclaration(body);

      expect(parsed.ok).toBe(false);
      expect(parsed.ok === false && parsed.refused.length).toBeGreaterThan(0);
    },
  );

  test.each([
    ["source", "url"],
    ["licence", "url"],
  ] as const)("a %s.%s that is not http or https is refused", (block, member) => {
    const hostile = { ...minimal, [block]: { ...minimal[block], [member]: "javascript:alert(1)" } };

    expect(parseDeclaration(hostile).ok).toBe(false);
  });

  test("a Source identifier outside the contract's own pattern is refused", () => {
    expect(parseDeclaration({ ...minimal, source: { ...minimal.source, id: "Not Lower Case" } }).ok)
      .toBe(false);
    expect(parseDeclaration({ ...minimal, source: { ...minimal.source, id: "-leading-hyphen" } }).ok)
      .toBe(false);
  });

  test("a declaration timestamp with no zone is refused, and one with an offset is not", () => {
    // It is the Provider's own clock and it orders two reads, so a timestamp that cannot be placed
    // on a line is worth nothing.
    expect(parseDeclaration({ ...minimal, declaredAt: "2026-08-17T08:00:00" }).ok).toBe(false);
    expect(read({ ...minimal, declaredAt: "2026-08-17T09:00:00+01:00" }).declaredAt).toEqual(
      new Date("2026-08-17T08:00:00Z"),
    );
  });
});

describe("the retention a column takes", () => {
  test("indefinite is the infinite interval, and a duration is passed through", () => {
    // Both are PostgreSQL's own input formats, so nothing is converted — `retentionAsInterval` says
    // which page of the manual each comes from.
    expect(retentionAsInterval(indefinitely)).toBe("infinity");
    expect(retentionAsInterval("P6M")).toBe("P6M");
  });

  test("only the one word is translated, in both directions", () => {
    // These two carry the `indefinite`/`infinity` sentinel across and touch nothing else. What
    // PostgreSQL does to a duration on the way back out is a different claim, and `rls.test.ts` is
    // where it is measured rather than assumed.
    for (const declared of [indefinitely, "P6M", "P1Y2M3DT4H5M6S", "PT30M"]) {
      expect(retentionFromInterval(retentionAsInterval(declared))).toBe(declared);
    }
  });
});
