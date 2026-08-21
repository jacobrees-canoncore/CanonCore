import { type CapabilityDeclaration, parseDeclaration } from "./declaration.ts";

/**
 * Reading a Provider's capability declaration over the contract it publishes.
 *
 * **This is the only thing in the application that speaks to a Provider**, and it is deliberately
 * the smallest thing that can: one `GET`, no credential, no retry, no state. Everything it learns is
 * handed to [`declaration.ts`](declaration.ts) to be refused or read, and everything it cannot learn
 * is a sentence rather than an exception — the operator who pointed at this Provider is who reads it.
 */

/**
 * The major version, which is in the URI and always has been. There is no negotiation, no header and
 * no default ([ADR-0022](../../../../docs/adr/0022-the-provider-contract.md) → *Decision 6*), so this
 * is a constant rather than configuration, and a version 2 would be a change here rather than a
 * setting somewhere.
 */
export const contractVersion = "v1";

/**
 * How long to wait for a Provider that is not answering.
 *
 * A read with no deadline is a read that can hang the operator command that made it, and a Provider
 * that cannot answer a static declaration in ten seconds is unreachable for this purpose whatever it
 * is doing. It is not a retry: the operator runs the command again.
 */
const deadlineMilliseconds = 10_000;

export type ProviderRead =
  | {
      readonly ok: true;
      /**
       * The address this read used, normalised. Handed back rather than left to the caller to
       * work out again: it is what the declaration must be stored against, and a caller
       * normalising a second time is a second implementation of the rule that decides whether two
       * spellings are one Provider.
       */
      readonly providerBaseUrl: string;
      readonly declaration: CapabilityDeclaration;
    }
  | { readonly ok: false; readonly refused: string };

/**
 * A Provider's base URL as the contract defines one: an origin, optionally with a path prefix, and
 * no trailing slash — so `https://example.com/` and `https://example.com` address the same Provider.
 *
 * **A query or a fragment is refused rather than dropped.** Either means the address is not a base
 * URL, and silently discarding half of what somebody pasted is how a Provider gets read at an
 * address nobody chose.
 */
export function normaliseProviderUrl(pasted: string): { url: string } | { refused: string } {
  let parsed: URL;
  try {
    // No `trim` — the URL parser removes *"any leading and trailing C0 control or space"* itself
    // (https://url.spec.whatwg.org/#concept-basic-url-parser), so one here would be a second
    // implementation of a rule that is already applied. Checked against Node 24 on 21 August 2026,
    // and `normaliseProviderUrl` is asserted on a padded address for that reason.
    parsed = new URL(pasted);
  } catch {
    return { refused: `${pasted} is not a URL.` };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { refused: `A Provider is reached over http or https, and ${pasted} is neither.` };
  }
  if (parsed.search || parsed.hash) {
    return {
      refused: `A Provider's address is an origin and an optional path, with no query or fragment. ${pasted} has one.`,
    };
  }

  return { url: `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}` };
}

/**
 * Read what a Provider declares, or say why it could not be read.
 *
 * **Every failure here fails the Source closed, and what that means depends on whether one is
 * already held.** For a Source nothing has declared yet, it is literal: nothing is stored, nothing
 * is assumed, and a Source with no declaration serves nothing at all. For one already recorded, the
 * declaration in force **stays in force** and this read changes nothing — not even `read_at`.
 *
 * **That is the conservative answer rather than the lazy one**, and the alternative is worse in both
 * directions. A Provider that cannot be read has said nothing new, and nothing new is not a
 * statement that the Source's terms have changed: the contract says in terms that a `503` *"is never
 * evidence that anything was deleted"*, and an outage, a bad deploy and a revoked credential all
 * look like this. Dropping to *serves nothing* on any of them would blank a catalogue on a network
 * blip. What a stored declaration does is **constrain**, so leaving it standing withholds at least
 * as much as replacing it with silence would — and values that can never be refreshed are dropped by
 * their retention rather than by a failed read (CAN-103 Refresh Snapshots before their Source's
 * retention expires, and drop what cannot be refreshed).
 *
 * `docs/runbook.md` → *A Provider's declaration is read or re-read* is where an operator reads this
 * back, and it says the same thing in one line: whatever was held is exactly as it was.
 */
export async function readDeclaration(providerBaseUrl: string): Promise<ProviderRead> {
  const base = normaliseProviderUrl(providerBaseUrl);
  if ("refused" in base) return { ok: false, refused: base.refused };

  const endpoint = `${base.url}/${contractVersion}/capabilities`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(deadlineMilliseconds),
    });
  } catch (error) {
    return { ok: false, refused: `${endpoint} could not be reached: ${reason(error)}` };
  }

  if (!response.ok) return { ok: false, refused: await refusalFor(endpoint, response) };

  // A `200` carrying HTML is what a captive portal, a redirect to a sign-in page and a plain wrong
  // address all look like, and each of those parses as neither JSON nor a declaration. Checking the
  // type first is what makes the refusal say which of those happened.
  const type = response.headers.get("content-type") ?? "";
  if (!type.split(";")[0].trim().endsWith("json")) {
    return {
      ok: false,
      refused: `${endpoint} answered 200 with ${type || "no content type"}, which is not a capability declaration.`,
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    return { ok: false, refused: `${endpoint} answered with a body that is not JSON: ${reason(error)}` };
  }

  const parsed = parseDeclaration(body);
  if (!parsed.ok) {
    return {
      ok: false,
      refused: `${endpoint} answered with something this contract does not describe:\n${parsed.refused}`,
    };
  }

  return { ok: true, providerBaseUrl: base.url, declaration: parsed.declaration };
}

/**
 * What an error status means, said in the Provider's own words where it gave any.
 *
 * Every error the contract defines is RFC 9457 problem details, whose `title` is the member a
 * consumer reads. A Provider that answered with something else gets its status reported alone rather
 * than having a reason invented for it.
 */
async function refusalFor(endpoint: string, response: Response): Promise<string> {
  const said = await problemTitle(response);
  const because = said ? `: ${said}` : "";

  if (response.status === 401) {
    return (
      `${endpoint} requires a credential${because}. This application holds no Source credential and ` +
      "passes none, so a Provider that needs one cannot be read from here " +
      "(ADR-0014, decision 1)."
    );
  }

  return `${endpoint} answered ${response.status}${because}.`;
}

/** The `title` of an RFC 9457 problem, or nothing where the body was not one. */
async function problemTitle(response: Response): Promise<string | undefined> {
  if (!(response.headers.get("content-type") ?? "").startsWith("application/problem+json")) {
    return undefined;
  }

  try {
    const problem: unknown = await response.json();
    if (problem && typeof problem === "object" && "title" in problem) {
      const { title } = problem as { title: unknown };
      if (typeof title === "string" && title.length > 0) return title;
    }
  } catch {
    // A problem body that is not JSON says nothing beyond the status, which the caller already has.
  }
  return undefined;
}

/**
 * An error's message, for a caller that has to print one and cannot rethrow.
 *
 * **The cause is unwrapped, and without it this says almost nothing.** Every network failure comes
 * out of `fetch` as the same three words — a refused connection, an unresolvable name, an expired
 * certificate and a timeout are indistinguishable from the message alone. Node puts the real error
 * on `cause` (*"the `cause` property ... set to the underlying error"*,
 * https://nodejs.org/api/globals.html#fetch), and it is the half an operator can act on: measured
 * against a closed port on 21 August 2026, the message was `fetch failed` and the cause
 * `connect ECONNREFUSED 127.0.0.1:58099`.
 */
function reason(error: unknown): string {
  if (!(error instanceof Error)) return String(error);

  const cause = error.cause instanceof Error ? ` (${error.cause.message})` : "";
  return `${error.message}${cause}`;
}
