import { afterEach, describe, expect, test, vi } from "vitest";
import { contractVersion, normaliseProviderUrl, readDeclaration } from "./read-declaration";

/**
 * The read, against a stubbed `fetch` rather than a server.
 *
 * What is under test is what this application does with each answer a Provider can give, and every
 * one of those is a refusal that has to say something an operator can act on. A live Provider would
 * exercise one of them.
 */

/** A conformant declaration, as the smallest body a read can succeed on. */
const declaration = {
  declaredAt: "2026-08-17T08:00:00Z",
  source: { id: "example", name: "An example Source", url: "https://example.invalid" },
  retention: "P6M",
  licence: {
    spdx: "CC0-1.0",
    name: "CC0 1.0 Universal",
    url: "https://example.invalid/licence",
    shareAlike: false,
  },
  attribution: { required: false },
  restrictions: [],
};

/** Stub `fetch` with one answer, and hand back the calls it received. */
function answering(response: Response | Error) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", (input: string) => {
    calls.push(input);
    return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
  });
  return calls;
}

const asJson = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the address a Provider is reached at", () => {
  test.each([
    ["https://example.invalid", "https://example.invalid"],
    ["https://example.invalid/", "https://example.invalid"],
    ["https://example.invalid///", "https://example.invalid"],
    ["  https://example.invalid  ", "https://example.invalid"],
    ["https://example.invalid/providers/tmdb", "https://example.invalid/providers/tmdb"],
    ["https://example.invalid/providers/tmdb/", "https://example.invalid/providers/tmdb"],
  ])("%s addresses %s", (pasted, expected) => {
    expect(normaliseProviderUrl(pasted)).toEqual({ url: expected });
  });

  test.each([
    ["not-a-url"],
    ["javascript:alert(1)"],
    ["file:///etc/passwd"],
    ["https://example.invalid?key=secret"],
    ["https://example.invalid#fragment"],
  ])("%s is refused rather than repaired", (pasted) => {
    expect(normaliseProviderUrl(pasted)).toHaveProperty("refused");
  });

  test("the major version is in the path, and the declaration is its first endpoint", async () => {
    const calls = answering(asJson(declaration));

    await readDeclaration("https://example.invalid/");

    expect(calls).toEqual([`https://example.invalid/${contractVersion}/capabilities`]);
  });
});

describe("what a Provider can answer with", () => {
  test("a conformant declaration is read", async () => {
    answering(asJson(declaration));

    const read = await readDeclaration("https://example.invalid");

    expect(read.ok).toBe(true);
    expect(read.ok === true && read.declaration.source.name).toBe("An example Source");
  });

  test("a declaration this contract does not describe fails the Source closed, and says so", async () => {
    // The acceptance criterion in terms: nothing is stored, and the reason reaches the operator.
    answering(
      asJson(Object.fromEntries(Object.entries(declaration).filter(([key]) => key !== "retention"))),
    );

    const read = await readDeclaration("https://example.invalid");

    expect(read.ok).toBe(false);
    expect(read.ok === false && read.refused).toContain("retention");
  });

  test("a Provider needing a credential is refused, rather than read as serving nothing", async () => {
    answering(
      new Response(JSON.stringify({ title: "Unauthorized", status: 401 }), {
        status: 401,
        headers: { "content-type": "application/problem+json" },
      }),
    );

    const read = await readDeclaration("https://example.invalid");

    expect(read.ok).toBe(false);
    expect(read.ok === false && read.refused).toContain("requires a credential");
    expect(read.ok === false && read.refused).toContain("Unauthorized");
  });

  test.each([[429], [500], [503]])("a %s is reported with what the Provider said about it", async (status) => {
    answering(
      new Response(JSON.stringify({ title: "Source unavailable", status }), {
        status,
        headers: { "content-type": "application/problem+json" },
      }),
    );

    const read = await readDeclaration("https://example.invalid");

    expect(read.ok).toBe(false);
    expect(read.ok === false && read.refused).toContain(String(status));
    expect(read.ok === false && read.refused).toContain("Source unavailable");
  });

  test("an error status carrying no problem details is reported by its status alone", async () => {
    answering(new Response("<html>Nope</html>", { status: 502, headers: { "content-type": "text/html" } }));

    const read = await readDeclaration("https://example.invalid");

    expect(read.ok === false && read.refused).toContain("502");
    expect(read.ok === false && read.refused).not.toContain("Nope");
  });

  test("a 200 that is not JSON at all is named as what it is", async () => {
    // A sign-in page, a captive portal and a wrong address all look like this, and each would
    // otherwise be reported as a declaration that failed to parse.
    answering(new Response("<html>Sign in</html>", { headers: { "content-type": "text/html" } }));

    const read = await readDeclaration("https://example.invalid");

    expect(read.ok).toBe(false);
    expect(read.ok === false && read.refused).toContain("text/html");
  });

  test("a 200 whose body is not JSON is refused with the reason", async () => {
    answering(new Response("{", { headers: { "content-type": "application/json" } }));

    const read = await readDeclaration("https://example.invalid");

    expect(read.ok).toBe(false);
    expect(read.ok === false && read.refused).toContain("not JSON");
  });

  test("a Provider that cannot be reached is a refusal rather than a thrown error", async () => {
    answering(new Error("getaddrinfo ENOTFOUND example.invalid"));

    const read = await readDeclaration("https://example.invalid");

    expect(read.ok).toBe(false);
    expect(read.ok === false && read.refused).toContain("ENOTFOUND");
  });

  test("the reason a fetch failed is carried out of its cause", async () => {
    // Every network failure comes out of `fetch` as the same three words, so without the cause a
    // refused connection, an unresolvable name and an expired certificate read identically — and
    // the operator has nothing to act on. This is the shape Node produces, message and cause both.
    answering(
      new Error("fetch failed", { cause: new Error("connect ECONNREFUSED 127.0.0.1:58099") }),
    );

    const read = await readDeclaration("https://example.invalid");

    expect(read.ok === false && read.refused).toContain("fetch failed");
    expect(read.ok === false && read.refused).toContain("ECONNREFUSED");
  });

  test("an address that is not a Provider's is refused before anything is fetched", async () => {
    const calls = answering(asJson(declaration));

    const read = await readDeclaration("https://example.invalid?key=secret");

    expect(read.ok).toBe(false);
    expect(calls).toEqual([]);
  });
});
