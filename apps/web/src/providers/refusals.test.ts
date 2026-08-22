import { describe, expect, test } from "vitest";
import type { CapabilityDeclaration } from "./declaration";
import type { SourceState } from "./refusals";
import {
  displayArtwork,
  importOrderingAsCanonical,
  readSnapshot,
  refusalsInForce,
  treatAsGone,
} from "./refusals";

/**
 * The refusals, asserted in both directions on every question.
 *
 * **A refusal test that only asserts the refusal passes on a module that refuses everything**, which
 * is a rule nobody would notice was broken. So each case here pairs the silence with the declaration
 * that permits, and the two are the same call with one member added.
 */

/** A Provider that declares only what its Source's terms say, and none of the three optional blocks. */
const silentDeclaration: CapabilityDeclaration = {
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

/**
 * What the application holds about a Source whose last read succeeded.
 *
 * Every case below varies this, which is what keeps the two halves apart: a case about a
 * declaration's silence changes `declaration`, and the case about a Provider answering with rubbish
 * changes `unreadable` and nothing else.
 */
const silent: SourceState = { declaration: silentDeclaration };

/** The same Source, declaring a vocabulary. */
const classifying: SourceState = {
  declaration: { ...silentDeclaration, classification: invertedVocabulary },
};

/** And the same Source again, whose Provider has since answered with something that is not one. */
const unreadable: SourceState = {
  ...classifying,
  unreadable: {
    since: new Date("2026-08-20T00:00:00Z"),
    because: "It answered 200 with text/html, which is not a capability declaration.",
  },
};

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
    const unlabelled: SourceState = {
      declaration: {
        ...silentDeclaration,
        classification: [{ term: "a-source-specific-word", suppressesArtwork: true }],
      },
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
    expect(importOrderingAsCanonical({ declaration: { ...silentDeclaration, orderings: { canonical: false } } }).permitted).toBe(
      false,
    );
  });

  test("a Provider declaring the Source's own sequence is permitted", () => {
    expect(importOrderingAsCanonical({ declaration: { ...silentDeclaration, orderings: { canonical: true } } }).permitted).toBe(
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
    expect(treatAsGone({ declaration: { ...silentDeclaration, liveness: { confirmsDeletion: false } } }).permitted).toBe(false);
  });

  test("a Provider with evidence beyond the failed fetch is permitted", () => {
    expect(
      treatAsGone({
        declaration: {
          ...silentDeclaration,
          liveness: { confirmsDeletion: true, evidence: "The Source publishes its live identifiers." },
        },
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

describe("a Provider that has stopped answering with a declaration at all", () => {
  test("what the held declaration permits is withdrawn, all three of them", () => {
    // The Provider answered, and what it answered is not a declaration — so it has stopped standing
    // behind the one being held, and every permission below rests on that declaration being current.
    expect(displayArtwork(unreadable, []).permitted).toBe(false);
    expect(displayArtwork(unreadable, ["alarming-sounding"]).permitted).toBe(false);
    expect(importOrderingAsCanonical(unreadable).permitted).toBe(false);
    expect(treatAsGone(unreadable).permitted).toBe(false);
  });

  test("the same Source with a readable declaration permits all three, so the withdrawal is the change", () => {
    // Without this the case above passes on a declaration that refuses everything anyway, which is
    // how a rule that had stopped running would go on reporting the right answers.
    const readable: SourceState = {
      declaration: {
        ...classifying.declaration,
        orderings: { canonical: true },
        liveness: { confirmsDeletion: true },
      },
    };

    expect(displayArtwork(readable, ["alarming-sounding"]).permitted).toBe(true);
    expect(importOrderingAsCanonical(readable).permitted).toBe(true);
    expect(treatAsGone(readable).permitted).toBe(true);
    expect(displayArtwork({ ...readable, unreadable: unreadable.unreadable }, ["alarming-sounding"]).permitted).toBe(false);
  });

  test("the refusal says since when, and what the Provider actually answered with", () => {
    const decision = displayArtwork(unreadable, []);

    expect(decision.because).toContain("2026-08-20T00:00:00.000Z");
    expect(decision.because).toContain("text/html");
  });

  test("what the Source obliges is untouched, and so is a Snapshot stored under the held declaration", () => {
    // The line the whole design turns on: an unreadable declaration withdraws what the held one
    // *permits* and nothing it *obliges*. A Provider with a bad deploy is not a Source whose terms
    // have relaxed, and the values already stored are displayed under the credit it last stated.
    expect(unreadable.declaration.retention).toBe(silentDeclaration.retention);
    expect(unreadable.declaration.attribution).toEqual(silentDeclaration.attribution);
    expect(unreadable.declaration.restrictions).toEqual(silentDeclaration.restrictions);
    expect(readSnapshot(unreadable, unreadable.declaration.declaredAt).permitted).toBe(true);
  });

  test("it is reported once rather than three times over", () => {
    // All three refuse with the same sentence, so a page listing them would say it three times.
    expect(refusalsInForce(unreadable)).toHaveLength(1);
    expect(refusalsInForce(unreadable)[0]).toContain("not a capability declaration");
  });

  test("a Source whose last read succeeded reports only what its declaration withholds", () => {
    expect(refusalsInForce(silent)).toHaveLength(3);
  });
});
