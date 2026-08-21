import { describe, expect, test } from "vitest";
import type { CapabilityDeclaration } from "./declaration";
import { displayArtwork, importOrderingAsCanonical, readSnapshot, treatAsGone } from "./refusals";

/**
 * The refusals, asserted in both directions on every question.
 *
 * **A refusal test that only asserts the refusal passes on a module that refuses everything**, which
 * is a rule nobody would notice was broken. So each case here pairs the silence with the declaration
 * that permits, and the two are the same call with one member added.
 */

/** A Provider that declares only what its Source's terms say, and none of the three optional blocks. */
const silent: CapabilityDeclaration = {
  declaredAt: new Date("2026-08-17T08:00:00Z"),
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
 * A vocabulary whose two terms are ordinary words, and whose flags run the other way from what the
 * words suggest.
 *
 * **That inversion is the assertion**, not decoration: it is what tells a rule reading the declared
 * flag apart from one that has learnt a Source's own word for something. A consumer matching words
 * would get both of these backwards.
 */
const invertedVocabulary = [
  { term: "harmless-sounding", label: "Withheld", suppressesArtwork: true },
  { term: "alarming-sounding", label: "Shown", suppressesArtwork: false },
];

const classifying: CapabilityDeclaration = { ...silent, classification: invertedVocabulary };

describe("Artwork, which a Provider's silence refuses", () => {
  test("a Provider that declares no classification has its Artwork refused", () => {
    const decision = displayArtwork(silent, []);

    expect(decision.permitted).toBe(false);
    expect(decision.because).toContain("An example Source");
    expect(decision.because).toContain("no content classification");
  });

  test("a record nothing in its containment chain classified is refused too", () => {
    // Absent is not empty. Empty is a Source that classified the record and found nothing to say;
    // absent is a Source that never said, and only the first is an answer.
    expect(displayArtwork(classifying, undefined).permitted).toBe(false);
    expect(displayArtwork(classifying, []).permitted).toBe(true);
  });

  test("the rule follows the declared flag and never the word", () => {
    // Both directions, on a vocabulary whose words point the opposite way to its flags.
    expect(displayArtwork(classifying, ["harmless-sounding"]).permitted).toBe(false);
    expect(displayArtwork(classifying, ["alarming-sounding"]).permitted).toBe(true);
  });

  test("one suppressing term in a list refuses the whole record", () => {
    expect(displayArtwork(classifying, ["alarming-sounding", "harmless-sounding"]).permitted).toBe(
      false,
    );
  });

  test("a term outside the declared vocabulary is refused rather than guessed at", () => {
    const decision = displayArtwork(classifying, ["a-term-that-was-never-declared"]);

    expect(decision.permitted).toBe(false);
    expect(decision.because).toContain("did not declare");
  });

  test("the refusal names the term as a person should read it", () => {
    expect(displayArtwork(classifying, ["harmless-sounding"]).because).toContain("Withheld");
  });

  test("a term with no label of its own is named by the Source's own word", () => {
    const unlabelled = {
      ...silent,
      classification: [{ term: "a-source-specific-word", suppressesArtwork: true }],
    };

    expect(displayArtwork(unlabelled, ["a-source-specific-word"]).because).toContain(
      "a-source-specific-word",
    );
  });
});

describe("an Ordering, which is canonical only where a Provider says so", () => {
  test("a Provider that serves no Ordering has none imported as canonical", () => {
    const decision = importOrderingAsCanonical(silent);

    expect(decision.permitted).toBe(false);
    expect(decision.because).toContain("declares no Ordering");
  });

  test("a Provider that serves Orderings but declares them one reading is refused too", () => {
    expect(importOrderingAsCanonical({ ...silent, orderings: { canonical: false } }).permitted).toBe(
      false,
    );
  });

  test("a Provider declaring the Source's own sequence is permitted", () => {
    expect(importOrderingAsCanonical({ ...silent, orderings: { canonical: true } }).permitted).toBe(
      true,
    );
  });
});

describe("a deletion, which only a Provider with evidence may claim", () => {
  test("a Provider that declares no liveness cannot have anything treated as deleted", () => {
    const decision = treatAsGone(silent);

    expect(decision.permitted).toBe(false);
    expect(decision.because).toContain("tell a deletion from a failed fetch");
  });

  test("a Provider that declares it cannot confirm a deletion is refused too", () => {
    expect(treatAsGone({ ...silent, liveness: { confirmsDeletion: false } }).permitted).toBe(false);
  });

  test("a Provider with evidence beyond the failed fetch is permitted", () => {
    expect(
      treatAsGone({
        ...silent,
        liveness: { confirmsDeletion: true, evidence: "The Source publishes its live identifiers." },
      }).permitted,
    ).toBe(true);
  });
});

describe("a declaration that changed between reads", () => {
  test("values stored under the declaration in force are read", () => {
    expect(readSnapshot(silent, new Date("2026-08-17T08:00:00Z")).permitted).toBe(true);
  });

  test("values stored under an earlier declaration are withheld rather than re-read under this one", () => {
    const decision = readSnapshot(silent, new Date("2026-08-01T00:00:00Z"));

    expect(decision.permitted).toBe(false);
    expect(decision.because).toContain("changed what it declares");
  });

  test("a Snapshot claiming a declaration this Source has never made is withheld too", () => {
    // Later rather than earlier, which is the case a comparison written as "older than" would let
    // through: a row can only carry a timestamp the application wrote, so one ahead of the Source's
    // own means the two have gone out of step and neither reading is safe.
    expect(readSnapshot(silent, new Date("2027-01-01T00:00:00Z")).permitted).toBe(false);
  });
});
