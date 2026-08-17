// @vitest-environment node
//
// `fetch` is stubbed here rather than a module mocked, which is the whole point: what these tests are
// about is the request that leaves this process. Node rather than the project's default `jsdom` for
// `env.test.ts`'s reason — t3-env skips the server schema when it takes itself to be in a browser, so
// under `jsdom` `env.VERCEL_ENV` would read as undefined whatever was stubbed, and the guard's
// production case would be untestable.
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { verifyYourAddress } from "./messages";

const email = verifyYourAddress("https://www.canoncore.com/api/auth/verify-email?token=a-token");

/** Every request this process handed to `fetch`, in order. */
let requests: Request[] = [];

/** A recipient the guard allows: one of the four Resend simulates rather than an invented name. */
const simulated = "delivered@resend.dev";

/**
 * Imported per test rather than at the top of the file, and it has to be.
 *
 * `src/env.ts` parses `process.env` when the module is first evaluated, so a `vi.stubEnv` after that
 * changes nothing a static import can see — the first draft of this file read `RESEND_API_KEY` as unset
 * in every test that had just set it. `db/rls.test.ts` does the same stub-then-`resetModules` dance for
 * the same reason.
 */
let mayBeSentTo: typeof import("./send").mayBeSentTo;
let send: typeof import("./send").send;

/** What a `fetch` stub returns when the send is meant to have worked. */
function accepted(): Promise<Response> {
  return Promise.resolve(Response.json({ id: "an-id-resend-would-have-issued" }));
}

/**
 * Replace `fetch`, and re-import `send` so that whatever the environment now says is what it reads.
 *
 * Called by `beforeEach` with the ordinary stub, and again by the tests that need a different one.
 */
async function withFetch(stub: (url: string, options: RequestInit) => Promise<Response>) {
  vi.stubGlobal("fetch", (url: string, options: RequestInit) => {
    requests.push(new Request(url, options));
    return stub(url, options);
  });
  vi.resetModules();
  ({ mayBeSentTo, send } = await import("./send"));
}

beforeEach(async () => {
  requests = [];
  vi.stubEnv("RESEND_API_KEY", "re_a-key-that-exists-only-for-this-test-run");
  vi.stubEnv("EMAIL_FROM", "CanonCore <noreply@mail.canoncore.com>");
  await withFetch(accepted);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/**
 * The guard, asked directly rather than inferred from a send that did not happen.
 *
 * **A send that was never attempted looks exactly like a send that was refused**, which is why this is
 * an exported function with its own test rather than an `if` inside `send`. The four addresses Resend
 * simulates are the ones a preview is allowed to reach; everything else is a real person.
 */
test("outside production only a resend.dev recipient may be sent to", () => {
  for (const environment of [undefined, "preview", "development"]) {
    expect(mayBeSentTo("delivered@resend.dev", environment)).toBe(true);
    expect(mayBeSentTo("bounced@resend.dev", environment)).toBe(true);
    expect(mayBeSentTo("somebody@example.com", environment)).toBe(false);
    // The case the whole guard exists for: a real address typed into a preview's sign-up form.
    expect(mayBeSentTo("jacob.rees@vepple.com", environment)).toBe(false);
  }
});

test("production may send to anybody, which is the only environment that may", () => {
  expect(mayBeSentTo("somebody@example.com", "production")).toBe(true);
  expect(mayBeSentTo("delivered@resend.dev", "production")).toBe(true);
});

/**
 * **The `@` is what anchors the match to the whole domain.** `endsWith("resend.dev")` would admit an
 * address at `notresend.dev`, which is a domain anybody may register — so the guard would be bypassable
 * by whoever wanted to receive a preview's mail.
 */
test("a domain merely ending in the simulator's name is not the simulator", () => {
  expect(mayBeSentTo("somebody@notresend.dev", "preview")).toBe(false);
  expect(mayBeSentTo("somebody@resend.dev.example.com", "preview")).toBe(false);
  // A subdomain of it is not it either, and is not one of the four Resend documents.
  expect(mayBeSentTo("somebody@mail.resend.dev", "preview")).toBe(false);
});

test("the case of the address does not decide whether the guard applies", () => {
  expect(mayBeSentTo("Delivered@Resend.Dev", "preview")).toBe(true);
});

// The guard in its real position: refused *before* the request is built, so nothing reaches Resend and
// nothing spends the daily quota. Asserted on `requests` rather than only on the throw, because a
// guard that threw after the send would pass a test that only read the exception.
test("a refused recipient means no request at all, not merely an error", async () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  await withFetch(accepted);

  await expect(send("somebody@example.com", email)).rejects.toThrow(/must be at resend\.dev/);

  expect(requests).toEqual([]);
});

/**
 * **The refusal must not quote the address**, and this is the one test that could not be inferred from
 * reading the code, because the obvious way to write that error message includes it.
 *
 * `content/legal/terms-of-service.md` → *Your privacy, and where your data is held* tells readers that
 * an error report "does not carry your IP address, your name, your email address or your account".
 * Nothing reports to Sentry yet, and when something does, this message is exactly what would arrive in
 * it — so an address here would make a published statement false.
 */
test("the refusal names no address, because an error report may not carry one", async () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  await withFetch(accepted);
  const address = "a.real.person@example.com";

  await expect(send(address, email)).rejects.toThrow();
  const refusal = await send(address, email).catch((error: unknown) =>
    error instanceof Error ? error.message : "",
  );

  expect(refusal).not.toContain(address);
  expect(refusal).not.toContain("a.real.person");
  expect(refusal).not.toContain("example.com");
});

test("sends one POST to Resend, carrying the credential and the verified sender", async () => {
  await send(simulated, email);

  expect(requests).toHaveLength(1);
  const request = requests[0]!;
  expect(request.url).toBe("https://api.resend.com/emails");
  expect(request.method).toBe("POST");
  expect(request.headers.get("authorization")).toBe(
    "Bearer re_a-key-that-exists-only-for-this-test-run",
  );
  expect(request.headers.get("content-type")).toBe("application/json");

  expect(await request.json()).toEqual({
    from: "CanonCore <noreply@mail.canoncore.com>",
    to: simulated,
    subject: email.subject,
    text: email.text,
    // No `html`. `messages.ts` says why there is no second half of the message to keep in step, and
    // an `html` key arriving here is how that decision would be reversed without anybody saying so.
  });
});

/**
 * **The request is handed to `fetch` before this function suspends**, which is the property
 * `db/rls.test.ts` rests on: it reads the emailed link straight after the route call that provoked it,
 * with nothing to await in between, because `auth/auth.ts` defers every send and hands back no handle.
 *
 * Asserted with a `fetch` that never settles, so the only way `requests` can be populated is if the
 * call happened synchronously. An `await` creeping in above the `fetch` — resolving a credential
 * asynchronously, say — fails here rather than as an empty capture three files away.
 */
test("the request leaves before the first suspension, so a stub has it immediately", async () => {
  await withFetch(() => new Promise<Response>(() => {}));

  // Deliberately not awaited: awaiting it would never return, and would also test the wrong thing.
  void send(simulated, email);

  expect(requests).toHaveLength(1);
});

// A refusal from Resend has to be loud, because nothing is waiting on it: `auth/auth.ts` sends after
// the response, so a `4xx` that returned quietly would be an email nobody sent and nobody missed.
test("a refusal from Resend throws, carrying the status and its own reason slug", async () => {
  await withFetch(() =>
    Promise.resolve(
      Response.json({ statusCode: 422, name: "validation_error", message: "…" }, { status: 422 }),
    ),
  );

  await expect(send(simulated, email)).rejects.toThrow(/422: validation_error/);
});

/**
 * Resend's `message` is not repeated, for the reason the guard's own message is not: one of them
 * quotes an email address back at the caller — the 403 for sending to a stranger from the shared
 * testing domain, in Resend's own documentation.
 */
test("a refusal from Resend does not repeat its message", async () => {
  await withFetch(() =>
    Promise.resolve(
      Response.json(
        { statusCode: 403, name: "validation_error", message: "…a.real.person@example.com…" },
        { status: 403 },
      ),
    ),
  );

  const refusal = await send(simulated, email).catch((error: unknown) =>
    error instanceof Error ? error.message : "",
  );

  expect(refusal).not.toContain("a.real.person@example.com");
});

// Both refused where they are read rather than defaulted, for `auth/auth.ts` -> `secret`'s reason:
// every variable in `env.ts` is optional because which ones a deployment carries depends on which
// deployment it is, so an absence has to be caught at the point of use.
test("a missing credential refuses to send rather than sending badly", async () => {
  vi.stubEnv("RESEND_API_KEY", undefined);
  await withFetch(accepted);

  await expect(send(simulated, email)).rejects.toThrow(/RESEND_API_KEY is not set/);

  expect(requests).toEqual([]);
});

test("a missing sender refuses too, rather than letting Resend pick one", async () => {
  vi.stubEnv("EMAIL_FROM", undefined);
  await withFetch(accepted);

  await expect(send(simulated, email)).rejects.toThrow(/EMAIL_FROM is not set/);

  expect(requests).toEqual([]);
});
