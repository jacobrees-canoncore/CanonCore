import { auth } from "@/auth/auth";
import { codeOfRefusal, signInFailure, signUpFailure } from "@/auth/failures";

/**
 * better-auth's own endpoints, mounted where the browser can reach them.
 *
 * ## Why the browser posts here rather than to a Server Action
 *
 * **Because a Server Action is not rate limited, by either limiter.** better-auth states it
 * plainly:
 * *"Server-side requests made using `auth.api` are not affected by rate limiting. Rate limits only
 * apply to client-initiated requests"*
 * ([rate limit](https://www.better-auth.com/docs/concepts/rate-limit)). A Server Action calling
 * `auth.api.signInEmail` therefore runs the sign-in with no limiter in front of it, and the single
 * free Vercel WAF rule spent on `/api/auth/*` would be guarding a path no browser ever requests.
 * Both of those are acceptance criteria on **CAN-24 A signed-in and a signed-out path**, and both
 * are satisfied only if the *browser's own* request lands here.
 *
 * Forwarding a Server Action's work here by `fetch` would be worse than either: the request would
 * carry the function's address rather than the caller's, so every visitor would share one bucket.
 *
 * ## Why no auth client reaches the browser
 *
 * **The forms are plain HTML.** They post form-encoded bodies at this route, `asJson` below turns
 * each into the JSON body better-auth's router accepts, and `redirectForBrowsers` turns the JSON
 * answer into a redirect a browser can follow. So sign-up, sign-in and sign-out all work with
 * JavaScript switched off, and no auth client is shipped.
 *
 * **`POST` and no `GET`.** Every endpoint used here is a POST, and the session is read server-side
 * through `auth.api.getSession`, so `GET /get-session` has no caller. A `GET` export would be a
 * route surface with nothing behind it.
 *
 * ## The two things this file adds, and why each is not optional
 *
 * **1. The body is re-encoded as JSON.** `/sign-in/email` and `/sign-up/email` do accept
 * `application/x-www-form-urlencoded`, but `/sign-out` does not: it declares no allowed media types
 * and so inherits the router's `application/json`, and a browser's form post is refused with `415`.
 *
 * That was found in a browser after a unit test said otherwise, and the wrong turn is worth
 * recording because it is easy to repeat. better-call reads a body only `if (!request.body)` is
 * false, so a fields-less form looked like it would slip past the media-type check — and a
 * `Request` built in a test with no `body` option does. **A browser sends `body: ""`, which is a
 * stream and not an absence**, so the check runs and refuses. Converting every form post removes
 * the inference rather than correcting it, and means no endpoint's media-type list has to be
 * consulted again.
 *
 * **2. The answer becomes a redirect.** better-auth replies `200` with a JSON body, so a browser
 * would render the JSON; it sets a `Location` header when given a `callbackURL` but leaves the
 * status at `200`, and a `200` does not redirect. A `fetch` client, and every non-browser caller,
 * gets better-auth's response untouched.
 */

/** Where a browser goes when there is nowhere more specific. There is one page. */
const home = "/";

/**
 * Where each flow sends a browser, either way.
 *
 * **Held here rather than as a `callbackURL` in the form**, so the destination is this
 * application's decision and not a value a submitted body carries. Keyed by the endpoint, not by
 * the `Referer` header: that header is one the browser may trim and an attacker chooses.
 */
const flows = [
  {
    endpoint: "/sign-up/email",
    // Not home: signing up no longer signs you in, because that is what switches better-auth's
    // enumeration protection on — `auth/auth.ts` → `autoSignIn`.
    onSuccess: `${signInFailure.page}?created`,
    onFailure: signUpFailure.page,
  },
  { endpoint: "/sign-in/email", onSuccess: home, onFailure: signInFailure.page },
  { endpoint: "/sign-out", onSuccess: home, onFailure: home },
] as const;

/**
 * Which flow a request belongs to, matched on the path *after* this route's own base.
 *
 * **An exact match rather than `endsWith`**, which is what an earlier version of this did: `endsWith`
 * would give any future path merely *ending* in `/sign-out` that flow's redirects, and this is a
 * catch-all route, so what arrives is not a closed set this file controls.
 *
 * **The fallback is reachable, and is not defensive padding.** `[...all]` receives every better-auth
 * endpoint and only three are listed, so anything else a browser navigates to — now, or after a
 * plugin adds one — goes home rather than to a page aimed at the wrong flow.
 */
const base = "/api/auth";

function flowFor(request: Request) {
  const endpoint = new URL(request.url).pathname.slice(base.length);
  return flows.find((flow) => flow.endpoint === endpoint) ?? { onSuccess: home, onFailure: home };
}

/**
 * A navigation, as opposed to a `fetch`. The same signal better-auth's own CSRF middleware reads,
 * so there is one notion of "this came from a form" rather than two.
 */
function isNavigating(request: Request): boolean {
  return request.headers.get("sec-fetch-mode") === "navigate";
}

/**
 * A form post, as the JSON body better-auth's router accepts.
 *
 * **Every other header is carried across**, which is the part that matters: `Origin` and the
 * `Sec-Fetch-*` trio are what better-auth's CSRF check reads, `Cookie` is what identifies the
 * session to sign out, and `X-Forwarded-For` is what the rate limiter keys on. A request rebuilt
 * without them would pass the media-type check and fail every control behind it.
 *
 * `Content-Length` is dropped rather than copied: it describes the body being replaced, and a wrong
 * one is worse than none.
 */
async function asJson(request: Request): Promise<Request> {
  const fields = Object.fromEntries(new URLSearchParams(await request.text()));
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  headers.delete("content-length");
  return new Request(request.url, {
    method: request.method,
    headers,
    body: JSON.stringify(fields),
  });
}

const formEncoded = "application/x-www-form-urlencoded";

function isFormEncoded(request: Request): boolean {
  return (request.headers.get("content-type") ?? "").startsWith(formEncoded);
}

/** The `Set-Cookie`s better-auth wrote, moved onto a response of a different status. */
function redirectTo(location: string, carrying: Response): Response {
  const headers = new Headers({ Location: location });
  for (const cookie of carrying.headers.getSetCookie()) headers.append("Set-Cookie", cookie);
  // 303 rather than 302, so the browser follows with a `GET`. That is what turns a submitted form
  // into a page, and what stops a refresh re-posting it.
  return new Response(null, { status: 303, headers });
}

export async function POST(request: Request) {
  const navigating = isNavigating(request);
  const response = await auth().handler(
    navigating && isFormEncoded(request) ? await asJson(request) : request,
  );
  if (!navigating) return response;

  const flow = flowFor(request);
  if (response.ok) return redirectTo(flow.onSuccess, response);

  const code = await codeOfRefusal(response);
  return redirectTo(`${flow.onFailure}?error=${encodeURIComponent(code)}`, response);
}
