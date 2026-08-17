import { auth } from "@/auth/auth";
import {
  codeOfRefusal,
  forgotPasswordFailure,
  resetPasswordFailure,
  signInFailure,
  signUpFailure,
} from "@/auth/failures";

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
 * **There is a `GET` now, and CAN-31 Email verification and password reset is what needed one.** This
 * file used to export `POST` alone, because every endpoint a form reached was a POST and the session
 * is read server-side through `auth.api.getSession` — so `GET /get-session` had no caller and a `GET`
 * export would have been a route surface with nothing behind it. **A link in an email is a `GET`**:
 * both addresses better-auth puts in a message resolve here, `/verify-email` and
 * `/reset-password/:token`, and without the export below each would have been a `405` on the one
 * request the whole flow depends on.
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
 * Where a verification link lands once it has been followed.
 *
 * **`/sign-in` rather than the front page**, because verifying does not sign anybody in —
 * `auth/auth.ts` → `autoSignInAfterVerification` is why not — so the next act is signing in and the
 * page a reader arrives at should be the one that offers it.
 */
const verified = `${signInFailure.page}?verified`;

/**
 * A refusal on the reset form, carrying the token back so the form still works.
 *
 * **Without this a password that was merely too short costs a second email.** The token is the only
 * thing that makes `/reset-password` a usable page, and it arrives in the query string rather than in
 * the body precisely so that a refusal can carry it onward: nothing here has to parse what was
 * submitted. better-auth reads either (`ctx.body.token || ctx.query?.token`, in
 * `better-auth/dist/api/routes/password.mjs`, 1.6.29).
 */
function backToTheResetForm(requested: URL): string {
  const token = requested.searchParams.get("token");
  if (!token) return resetPasswordFailure.page;
  return `${resetPasswordFailure.page}?token=${encodeURIComponent(token)}`;
}

/**
 * Where each flow sends a browser, either way, and the fields this application adds to what it
 * submitted.
 *
 * **Held here rather than as a `callbackURL` in the form**, so the destination is this
 * application's decision and not a value a submitted body carries. Keyed by the endpoint, not by
 * the `Referer` header: that header is one the browser may trim and an attacker chooses.
 *
 * **`adds` is that same rule extended to the two values better-auth turns into an emailed URL.**
 * `callbackURL` on the two sign-in-shaped endpoints and `redirectTo` on the reset request are what
 * decide where a link in somebody's mailbox goes, so a form carrying either would let a submitted
 * body choose where this service sends people. `originCheck` would refuse an off-site value, but the
 * whole design here is that the browser's body does not get a say — see the paragraph above.
 */
const flows = [
  {
    endpoint: "/sign-up/email",
    // Not home: signing up no longer signs you in, because that is what switches better-auth's
    // enumeration protection on — `auth/auth.ts` → `autoSignIn`.
    onSuccess: `${signInFailure.page}?created`,
    onFailure: () => signUpFailure.page,
    adds: { callbackURL: verified },
  },
  {
    endpoint: "/sign-in/email",
    onSuccess: home,
    onFailure: () => signInFailure.page,
    // The same landing page, because this endpoint sends a verification email too: an unverified
    // sign-in is refused and re-sends the link — `auth/auth.ts` → `sendOnSignIn`.
    adds: { callbackURL: verified },
  },
  // Nothing to add: signing out sends no email, so there is no URL for this application to choose.
  { endpoint: "/sign-out", onSuccess: home, onFailure: () => home, adds: undefined },
  {
    endpoint: "/request-password-reset",
    // The same page it was submitted from, with a notice. It must not say whether the address has an
    // account, and better-auth answers identically either way, so the page can only ever say what
    // would happen if it did.
    onSuccess: `${forgotPasswordFailure.page}?sent`,
    onFailure: () => forgotPasswordFailure.page,
    adds: { redirectTo: resetPasswordFailure.page },
  },
  {
    endpoint: "/reset-password",
    // To sign-in, not home: resetting a password does not sign anybody in either, and better-auth
    // leaves whatever session was there alone unless `revokeSessionsOnPasswordReset` is set.
    onSuccess: `${signInFailure.page}?reset`,
    onFailure: backToTheResetForm,
    // The token is already on the `action`, which is what lets a refusal carry it back. Nothing here
    // is emailed, so there is no URL to choose.
    adds: undefined,
  },
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
  return (
    flows.find((flow) => flow.endpoint === endpoint) ?? {
      onSuccess: home,
      onFailure: () => home,
      adds: undefined,
    }
  );
}

/**
 * A navigation, as opposed to a `fetch`. The same signal better-auth's own CSRF middleware reads,
 * so there is one notion of "this came from a form" rather than two.
 */
function isNavigating(request: Request): boolean {
  return request.headers.get("sec-fetch-mode") === "navigate";
}

/**
 * A form post, as the JSON body better-auth's router accepts, plus whatever the flow adds.
 *
 * **Every other header is carried across**, which is the part that matters: `Origin` and the
 * `Sec-Fetch-*` trio are what better-auth's CSRF check reads, `Cookie` is what identifies the
 * session to sign out, and `X-Forwarded-For` is what the rate limiter keys on. A request rebuilt
 * without them would pass the media-type check and fail every control behind it.
 *
 * `Content-Length` is dropped rather than copied: it describes the body being replaced, and a wrong
 * one is worse than none.
 *
 * **`adds` goes on last, so a form cannot supply its own.** That is the whole reason those two values
 * are added here rather than rendered into the markup — `flows` above says which and why. It applies
 * only to a browser's form post, which is the one thing this route rewrites; a `fetch` client's JSON
 * body passes through untouched, so an API caller's own `callbackURL` is still theirs.
 */
async function asJson(request: Request, adds?: Readonly<Record<string, string>>): Promise<Request> {
  const fields = Object.fromEntries(new URLSearchParams(await request.text()));
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  headers.delete("content-length");
  return new Request(request.url, {
    method: request.method,
    headers,
    body: JSON.stringify({ ...fields, ...adds }),
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

/**
 * A page to go back to, carrying the code for the refusal.
 *
 * `&` rather than `?` when the location already has a query, which `backToTheResetForm` produces: a
 * second `?` would make the whole of `token=…&error=…` the value of one parameter, and the token
 * would arrive unusable.
 */
function withError(location: string, code: string): string {
  return `${location}${location.includes("?") ? "&" : "?"}error=${encodeURIComponent(code)}`;
}

export async function POST(request: Request) {
  const navigating = isNavigating(request);
  const flow = flowFor(request);
  const response = await auth().handler(
    navigating && isFormEncoded(request) ? await asJson(request, flow.adds) : request,
  );
  if (!navigating) return response;

  if (response.ok) return redirectTo(flow.onSuccess, response);

  const code = await codeOfRefusal(response);
  return redirectTo(withError(flow.onFailure(new URL(request.url)), code), response);
}

/**
 * The `GET` two emailed links need — and, because this is a catch-all, **eight more that come with
 * them**.
 *
 * **Handed straight to better-auth, with none of `POST`'s rewriting.** The two this exists for answer
 * with a redirect of their own — `/verify-email` to the `callbackURL` it was given,
 * `/reset-password/:token` to that URL carrying the token — so there is no JSON body for a browser to
 * be shown and nothing for this file to convert. What `POST` adds exists because better-auth answers a
 * form post with `200` and a body; it answers these with `302` and a `Location`, which is already what
 * a browser needs.
 *
 * **The failure path redirects too**, which is why no error handling appears here: an expired or
 * unusable token sends the reader to the same `callbackURL` with `?error=<code>` on it, and
 * `auth/failures.ts` turns the code into a sentence of ours on the page they land on.
 *
 * ## What else this opens, enumerated rather than assumed
 *
 * `[...all]` matches every path, so adding this export mounted **all ten** of better-auth's `GET`
 * endpoints at once. They were read off `auth().api` rather than guessed at, and
 * [`../../../../auth/auth.test.ts`](../../../../auth/auth.test.ts) pins the list so that an upgrade
 * adding an eleventh has to be classified rather than arriving unnoticed. None of them is a
 * cross-tenant read:
 *
 * - **The two this export is for**: `/verify-email`, `/reset-password/:token`. Both take a token that
 *   only its holder has.
 * - **Four that answer about the caller and nobody else**: `/get-session`, `/list-sessions`,
 *   `/list-accounts`, `/account-info`. Each resolves the request's own cookie, so the most they can
 *   tell anybody is what they already hold. `/get-session` having no caller is why this export did not
 *   exist before, and a session read through it is the same read `auth.api.getSession` makes for a
 *   page.
 * - **Two that are inert here, because the feature behind each is off**: `/callback/:id` needs a
 *   social provider and `socialProviders` is unset; `/delete-user/callback` needs
 *   `user.deleteUser`, which nothing configures — account deletion is
 *   **CAN-30 GDPR export and erasure**, and when it lands this is the surface it lands on.
 * - **Two that carry nothing**: `/ok` and `/error`.
 */
export async function GET(request: Request) {
  return auth().handler(request);
}
