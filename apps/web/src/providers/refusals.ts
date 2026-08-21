import type { CapabilityDeclaration } from "./declaration.ts";

/**
 * What a Provider's declaration permits, and what its silence refuses.
 *
 * **One rule governs every question here: absence is refusal, never permission.**
 * [ADR-0022](../../../../docs/adr/0022-the-provider-contract.md) → *Decision 2* states it, and the
 * failure it exists to stop is silent — an image displayed because a flag was absent rather than
 * because a flag said no. So every answer below is computed from the declaration in force at the
 * moment the question is asked, and **no judgement is ever stored**: a decision written down under
 * one declaration is a decision that survives the declaration being narrowed, which is exactly the
 * re-interpretation CAN-104 Read a Provider's capability declaration, and refuse what it does not
 * serve forbids.
 *
 * **Nothing here matches a word.** A classification term is the Source's own vocabulary, so the rule
 * reads the flag beside it — which is what lets the rule run without the application knowing any
 * Source's field names.
 */

/**
 * An answer, and where it is no, a sentence saying why.
 *
 * The reason is not a log line: it is what the owner reads on `/sources`, so it names the Source and
 * says what will not happen rather than which member was missing.
 */
export type Decision =
  | { readonly permitted: true; readonly because?: undefined }
  | { readonly permitted: false; readonly because: string };

const permitted: Decision = { permitted: true };

const refused = (because: string): Decision => ({ permitted: false, because });

/**
 * Whether Artwork may be displayed for a record this Source supplied.
 *
 * **`terms` is what the record's whole containment chain says about it**, not what the record's own
 * row carries. A Source may flag a series and say nothing about its episodes, so the answer is
 * derived through the containers the contract requires a Provider to serve complete — and
 * `undefined` here means *nothing in that chain carried a classification at all*, which is silence
 * and therefore a refusal. An empty list is the other answer: the Source classified the record and
 * found nothing to say.
 *
 * **v1 imports no Artwork, so nothing calls this in production yet** — CAN-13 Artwork: uploads,
 * rights and takedown is what will. It is built now because a refusal added alongside the first
 * image it governs arrives one release too late, which is the argument the contract itself makes for
 * carrying `suppressesArtwork` before any image exists.
 */
export function displayArtwork(
  declaration: CapabilityDeclaration,
  terms: readonly string[] | undefined,
): Decision {
  const source = declaration.source.name;

  if (!declaration.classification) {
    return refused(
      `${source} declares no content classification, so no Artwork from it is displayed. The rule ` +
        "that decides whether an image may be shown runs on a Provider's own flag, and this " +
        "Provider has none to read.",
    );
  }

  if (!terms) {
    return refused(
      `Nothing this record is part of carries a classification from ${source}, so there is no ` +
        "answer to run the rule on and its Artwork is not displayed.",
    );
  }

  for (const term of terms) {
    const declared = declaration.classification.find((candidate) => candidate.term === term);

    // A term outside the declared vocabulary is the same silence as no vocabulary at all: the
    // application has nothing that says what this word obliges, and guessing from the word is the
    // one thing it must never do.
    if (!declared) {
      return refused(
        `This record carries a classification ${source} did not declare, so what it obliges is ` +
          "unknown and its Artwork is not displayed.",
      );
    }

    if (declared.suppressesArtwork) {
      return refused(
        `${source} classifies this record as ${declared.label ?? declared.term}, which it declares ` +
          "suppresses Artwork.",
      );
    }
  }

  return permitted;
}

/**
 * Whether an Ordering from this Provider may be imported as the Source's own sequence.
 *
 * A Provider that serves Orderings but declares them non-canonical is serving one community's
 * reading, and importing that as though the Source had published it would put a claim on the record
 * that nobody made.
 */
export function importOrderingAsCanonical(declaration: CapabilityDeclaration): Decision {
  const source = declaration.source.name;

  if (!declaration.orderings) {
    return refused(
      `${source} declares no Ordering, so none from it is imported as the Source's own sequence.`,
    );
  }

  if (!declaration.orderings.canonical) {
    return refused(
      `${source} declares that its Orderings are one reading rather than the Source's own ` +
        "sequence, so none of them is imported as one.",
    );
  }

  return permitted;
}

/**
 * Whether this Provider saying a record is gone may be acted on.
 *
 * An outage, a revoked credential and a genuine deletion all look alike from a failed fetch, and a
 * Provider without evidence beyond that fetch cannot tell them apart. Acting on it anyway is how a
 * catalogue deletes itself.
 */
export function treatAsGone(declaration: CapabilityDeclaration): Decision {
  const source = declaration.source.name;

  if (!declaration.liveness) {
    return refused(
      `${source} declares no way to tell a deletion from a failed fetch, so nothing it stops ` +
        "serving is treated as deleted.",
    );
  }

  if (!declaration.liveness.confirmsDeletion) {
    return refused(
      `${source} declares that it cannot confirm a deletion, so nothing it stops serving is ` +
        "treated as deleted.",
    );
  }

  return permitted;
}

/**
 * Whether a Snapshot stored under one declaration may still be read under the one now in force.
 *
 * **This is the acceptance criterion about a declaration that changes between reads.** What the
 * application stored under the old declaration is not re-interpreted under the new one: it is
 * withheld until the Snapshot has been fetched again, which is the sweep's job
 * (CAN-103 Refresh Snapshots before their Source's retention expires, and drop what cannot be
 * refreshed).
 *
 * **Withholding rather than deciding field by field is the decision here**, and it is the only one
 * that is safe for every field at once. Working out which of two declarations is narrower is a legal
 * judgement per member — a shorter retention binds, a dropped classification binds, a widened one
 * does not — and the application is in no position to make it. Degrading until the values are read
 * again is what [ADR-0022](../../../../docs/adr/0022-the-provider-contract.md) → *Decision 2* means
 * by a consumer degrading rather than carrying on with the old declaration.
 */
export function readSnapshot(declaration: CapabilityDeclaration, storedUnder: Date): Decision {
  if (storedUnder.getTime() === declaration.declaredAt.getTime()) return permitted;

  return refused(
    `${declaration.source.name} has changed what it declares since these values were read, so ` +
      "they are withheld until they have been read again under the declaration now in force.",
  );
}

/**
 * Every refusal this declaration puts in force, as sentences.
 *
 * **This is what "stored and surfaced to the owner" comes to.** A declaration is a set of
 * obligations and a set of silences, and the silences are the half nobody would otherwise see: a
 * Provider that declares no classification looks, on any page that lists what it *does* serve,
 * exactly like one that classifies everything as harmless. So the page lists what is withheld and
 * why.
 *
 * **Asked through the same three functions the rules use, not restated.** The Artwork question is
 * put with an empty term list, which is the Source-level form of it — *a record this Source
 * classified and found nothing to say about* — so a Provider with a vocabulary produces no entry
 * here and one without a vocabulary produces its own refusal. A second copy of the conditions would
 * be a second place for them to drift from the rules the application actually runs.
 */
export function refusalsInForce(declaration: CapabilityDeclaration): readonly string[] {
  return [
    displayArtwork(declaration, []),
    importOrderingAsCanonical(declaration),
    treatAsGone(declaration),
  ]
    .filter((decision) => decision.permitted === false)
    .map((decision) => decision.because);
}
