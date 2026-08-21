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
  | { readonly ok: true; readonly declaration: CapabilityDeclaration }
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
    parsed = new URL(pasted.trim());
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
 * **Every failure here fails the Source closed.** Nothing is stored, nothing is assumed and no
 * previous declaration is left standing as though this read had not happened: a Provider that cannot
 * be read has told the application nothing, and the safe reading of nothing is that it serves
 * nothing.
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

  return { ok: true, declaration: parsed.declaration };
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
