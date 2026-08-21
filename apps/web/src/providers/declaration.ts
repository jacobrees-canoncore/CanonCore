import * as z from "zod";

/**
 * What a Provider declares about its Source, and the strict read of it.
 *
 * **The contract is [`docs/provider-contract/v1/openapi.yaml`](../../../../docs/provider-contract/v1/openapi.yaml),
 * and it is normative** — this file is that document's `Capabilities` schema expressed in the one
 * language the application can refuse things in. Where the two disagree the file wins and this is
 * wrong; `declaration.test.ts` reads the published examples so that a divergence fails a run rather
 * than a fetch.
 *
 * **Nothing here is specific to any Source**, which is the point of it rather than a property it
 * happens to have: the application holds no source-specific code
 * ([ADR-0014](../../../../docs/adr/0014-shell-providers-and-per-source-retention.md) → *Decision 1*),
 * so every obligation it honours arrives through this shape.
 */

/**
 * Absence is refusal, so a member the contract marks optional is `undefined` here and never filled
 * with a default. Three of them decide what the application may do —
 * [`refusals.ts`](refusals.ts) is where each one's absence becomes a refusal.
 */
export type CapabilityDeclaration = {
  /**
   * When this declaration last changed, on the Provider's own clock. It is what orders two reads:
   * comparing payloads says that something changed and cannot say which is later
   * ([ADR-0022](../../../../docs/adr/0022-the-provider-contract.md) → *Decision 2*).
   */
  readonly declaredAt: Date;
  readonly source: SourceIdentity;
  /**
   * How long a Snapshot of this Source may be kept, measured from when the Source was read: an
   * ISO 8601 duration, or the literal below where the terms cap nothing.
   *
   * **There is no third value and no absence.** A Provider that says nothing has not said
   * indefinite, and the parse refuses the declaration outright rather than choosing one for it.
   */
  readonly retention: string;
  readonly licence: Licence;
  readonly attribution: Attribution;
  /**
   * What the Source's terms forbid, verbatim and uninterpreted. An open vocabulary reserving
   * `non-commercial` and `no-ai-training`, so the application surfaces each term as it was written
   * rather than mapping it onto anything of its own.
   *
   * Empty is how a Provider says nothing is forbidden, and it is a different answer from silence:
   * the member is required, so silence fails the parse.
   */
  readonly restrictions: readonly string[];
  /** Undefined where this Provider does not classify content at all, which refuses its Artwork. */
  readonly classification?: readonly ClassificationTerm[];
  /** Undefined where this Provider serves no Ordering, which refuses importing one as canonical. */
  readonly orderings?: OrderingsDeclaration;
  /** Undefined where this Provider cannot tell a deletion from a failed fetch. */
  readonly liveness?: LivenessDeclaration;
};

/**
 * The retention a Source's terms cap nothing at. A value, never an absence.
 *
 * Named for the word the contract, `CONTEXT.md` and the column all use, so `retention === indefinite`
 * compares against the thing rather than against an adverb.
 */
export const indefinite = "indefinite";

type SourceIdentity = {
  /**
   * What this Provider calls its Source. **Scoped to the Provider that declared it**: anyone may
   * stand up a service claiming any identifier, so two Providers declaring the same one are not
   * thereby serving the same Source.
   */
  readonly id: string;
  readonly name: string;
  readonly url: string;
};

type Licence = {
  /** An SPDX identifier, or a `LicenseRef-` one the Provider coined for terms not on that list. */
  readonly spdx: string;
  readonly name: string;
  readonly url: string;
  /**
   * Declared rather than derived. Deriving it from a `LicenseRef-` identifier would mean shipping a
   * licence table into the application, which is source knowledge under another name.
   */
  readonly shareAlike: boolean;
};

/** One text that must be displayed wherever this Source's values are, and the condition on it. */
type Notice = {
  /** The exact words. Rendered verbatim: an approximation breaches the clause omission would. */
  readonly text: string;
  /** Where and how prominently, in prose, because that is how such conditions are written. */
  readonly conditions?: string;
};

type Logo = {
  readonly url: string;
  readonly alt: string;
  readonly conditions?: string;
};

/**
 * What is owed wherever this Source's values appear, **including nothing at all**. A public-domain
 * Source obliges no credit, and a shape that could not say so would make every Provider invent one.
 */
export type Attribution =
  | { readonly required: false }
  | {
      readonly required: true;
      /** At least one, because one Source can prescribe more than one text with different conditions. */
      readonly notices: readonly Notice[];
      readonly link: string;
      readonly logo?: Logo;
      /** Whether every record must carry its own credit rather than one covering the Source. */
      readonly perRecord: boolean;
    };

/**
 * One term this Provider can put on a record, and what it obliges.
 *
 * **The application reads the flag and never the word.** A term is the Source's own vocabulary, so
 * matching on it would be the source-specific knowledge this whole shape exists to remove — and the
 * criterion on CAN-104 Read a Provider's capability declaration, and refuse what it does not serve
 * says so in terms.
 */
export type ClassificationTerm = {
  readonly term: string;
  readonly label?: string;
  readonly description?: string;
  /** Whether Artwork for a record carrying this term must not be displayed. */
  readonly suppressesArtwork: boolean;
};

type OrderingsDeclaration = {
  /** Whether an Ordering from this Provider can be the Source's own sequence rather than one reading. */
  readonly canonical: boolean;
};

type LivenessDeclaration = {
  /** True only where the Provider has evidence beyond the fetch that failed. */
  readonly confirmsDeletion: boolean;
  /** What that evidence is, so a person can judge the claim. */
  readonly evidence?: string;
};

/**
 * A read of a declaration, or the reason it was refused.
 *
 * **A declaration the application cannot parse fails the Source closed**, which is why this is a
 * result rather than a throw: the reason has to reach the operator who pointed at the Provider, and
 * an exception carrying a `ZodError` is not a sentence anybody can act on.
 */
export type ParsedDeclaration =
  | { readonly ok: true; readonly declaration: CapabilityDeclaration }
  | { readonly ok: false; readonly refused: string };

// **Where this schema narrows what the contract accepts, and where it must not.**
//
// The YAML file is normative and this is not, so a member it leaves as a bare `string` is one a
// conformant Provider may send empty — and refusing that would fail a whole Source over a blank
// credit line. An earlier version of this file put a minimum length on ten such members, which is
// the mistake worth naming rather than quietly reversing: a consumer's opinion about what is useful
// is not the contract.
//
// **Three narrowings survive, each named where it is written**: `url` and `retention` immediately
// below, and one on `declaredAt` that JavaScript imposes rather than this file choosing it. Nothing
// else here refuses anything `Capabilities` accepts.

/**
 * Every URL a declaration carries is `http` or `https` and nothing else.
 *
 * Not because any of them is followed — none is; the surface renders them as text and
 * [`no-linkification.test.tsx`](../app/no-linkification.test.tsx) holds the closed set of addresses
 * this application may render an anchor to. It is that `z.url()` alone accepts `javascript:` and
 * `data:`, and a declaration is a payload from a service nobody here has reviewed, so the narrower
 * of two readings is the one to take at the boundary.
 */
const url = z.url({ protocol: /^https?$/ });

const notice = z.object({
  text: z.string(),
  conditions: z.string().optional(),
});

const logo = z.object({
  url,
  alt: z.string(),
  conditions: z.string().optional(),
});

/**
 * The contract's `if`/`then` on `Attribution`, as a discriminated union.
 *
 * A union rather than optional members with a refinement, because the two branches are genuinely
 * different answers: `required: false` is complete on its own, and `required: true` cannot be a
 * claim with nothing behind it, so the notices and the link are demanded with it.
 */
const attribution = z.discriminatedUnion("required", [
  z.object({ required: z.literal(false) }),
  z.object({
    required: z.literal(true),
    notices: z.array(notice).min(1),
    link: url,
    logo: logo.optional(),
    // The contract's own default, applied here so that every branch of `refusals.ts` reads a
    // boolean rather than asking twice whether the member was there.
    perRecord: z.boolean().default(false),
  }),
]);

/**
 * An ISO 8601 duration, or the one word that means the terms cap nothing.
 *
 * **A duration of no time at all is refused here rather than left to the column's check
 * constraint.** `source_retention_is_positive` in [`schema.ts`](../db/schema.ts) is the backstop and
 * would catch it, but it would catch it as a constraint violation naming a column, where what the
 * operator needs is a sentence about the declaration they just pointed at. The test is for a digit
 * that is not zero anywhere in the duration, which is exactly what distinguishes `P0D` and `PT0.0S`
 * from every duration a term can express.
 */
const retention = z.union([
  z.literal(indefinite),
  z.iso.duration().refine((value) => /[1-9]/.test(value), {
    error: "a retention of no time at all is not a duration any terms express",
  }),
]);

/**
 * One term in a Provider's vocabulary. `suppressesArtwork` is required: a term declaring no
 * consequence would leave a consumer to guess one from the word, which is the guess this shape
 * removes.
 */
const classificationTerm = z.object({
  term: z.string(),
  label: z.string().optional(),
  description: z.string().optional(),
  suppressesArtwork: z.boolean(),
});

/**
 * The declaration, as the published contract defines it.
 *
 * **Unknown members are dropped rather than refused**, which is `z.object`'s own behaviour and is
 * also the contract's rule: *"Unknown response members are ignored. That is what makes this contract
 * additive"*. A consumer that rejected a member it did not recognise would break on the next
 * revision of a document that is deliberately additive-only.
 */
/**
 * The Provider's own clock, as RFC 3339 writes one.
 *
 * **Upper-cased before it is checked, which is a canonicalisation rather than an edit.** RFC 3339's
 * grammar is ABNF, whose string literals are case-insensitive
 * ([RFC 5234 §2.3](https://www.rfc-editor.org/rfc/rfc5234#section-2.3)), so `2026-08-17t08:00:00z`
 * is the same instant as `2026-08-17T08:00:00Z` and a conformant Provider may send either. Zod's
 * check accepts only the upper-case spelling — measured on the installed 4.4.3, 21 August 2026 —
 * so without this a Source would fail closed over a lower-case letter.
 *
 * **The one narrowing left is a leap second, and JavaScript is what imposes it.** RFC 3339 admits
 * `23:59:60`; `new Date("2026-12-31T23:59:60Z")` is `Invalid Date`, measured the same day. There is
 * no instant for this to carry, so it is refused and said rather than silently rounded to `:59` —
 * which would move a declaration's own clock, the one thing here that orders two reads.
 */
const declaredAt = z
  .string()
  .transform((value) => value.toUpperCase())
  .pipe(z.iso.datetime({ offset: true }))
  .transform((value) => new Date(value));

const declaration = z.object({
  declaredAt,
  source: z.object({
    // The contract's own pattern. It is what makes the identifier safe to compare, and it is
    // compared only within one Provider — see `SourceIdentity.id`.
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    name: z.string(),
    url,
  }),
  retention,
  licence: z.object({
    spdx: z.string(),
    name: z.string(),
    url,
    shareAlike: z.boolean(),
  }),
  attribution,
  restrictions: z.array(z.string()),
  // The three optional blocks. Each is absent where the Provider does not do that thing, and
  // `.optional()` is what keeps that distinguishable from a declaration that does it and found
  // nothing to say — `refusals.ts` turns each absence into its own refusal.
  classification: z
    .object({ vocabulary: z.array(classificationTerm).min(1) })
    .transform((value) => value.vocabulary)
    .optional(),
  orderings: z.object({ canonical: z.boolean() }).optional(),
  liveness: z
    .object({ confirmsDeletion: z.boolean(), evidence: z.string().optional() })
    .optional(),
});

/**
 * Read a capability declaration, or say why it cannot be read.
 *
 * **Every refusal is final for the Source**: nothing partial is stored and nothing is assumed, so a
 * Provider whose declaration does not parse serves the application nothing at all. That is the
 * acceptance criterion *a declaration the application cannot parse fails the Source closed, and
 * says so*, and it is the only safe reading — a half-read declaration is a set of obligations the
 * application would be honouring some of.
 */
export function parseDeclaration(body: unknown): ParsedDeclaration {
  const read = declaration.safeParse(body);
  if (read.success) return { ok: true, declaration: read.data };

  // `z.prettifyError` renders the whole issue list as lines a person can act on, rather than the
  // JSON shape `error.message` carries.
  return { ok: false, refused: z.prettifyError(read.error) };
}

/**
 * The declared retention as the `interval` column takes it.
 *
 * **Both forms are PostgreSQL's own input, so nothing is converted here.** An ISO 8601 duration is
 * one of the formats `interval` accepts (*"ISO 8601 time intervals"*,
 * https://www.postgresql.org/docs/17/datatype-datetime.html), and `infinity` is the infinite
 * interval PostgreSQL 17 added — which is what makes the expiry test branchless, since
 * `fetched_at + retention` is then infinite and no `now()` reaches it.
 */
export function retentionAsInterval(declared: string): string {
  return declared === indefinite ? infiniteInterval : declared;
}

/**
 * The inverse, for a row being read back into a declaration.
 *
 * **What survives the round trip is the length of time, not the spelling**, and the difference is
 * worth stating because the column is the only copy. Read in ISO 8601 style — which
 * [`../db/sources.ts`](../db/sources.ts) is what sets — an interval comes back in PostgreSQL's own
 * canonical form of that notation: `P6M` and `PT30M` unchanged, `P2W` as `P14D`, `P18M` as `P1Y6M`,
 * each the same duration written the one way. `rls.test.ts` reads a normalising case back, so the
 * claim is a measurement rather than an assumption.
 *
 * The two alternatives are reconstructing `6 months` from an interval's parts, which invents a
 * duration the Provider never wrote, and holding a verbatim copy of the declared string beside the
 * interval, which is two answers to one question.
 */
export function retentionFromInterval(stored: string): string {
  return stored === infiniteInterval ? indefinite : stored;
}

/** PostgreSQL's infinite interval, which is what `indefinite` is stored as. */
const infiniteInterval = "infinity";
