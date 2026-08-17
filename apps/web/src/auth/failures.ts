/**
 * What a reader is told when signing up, signing in, asking for a reset link or choosing a new
 * password did not work.
 *
 * **The sentences are ours and the set is closed.** A failed POST comes back to the form as
 * `?error=<code>`, where the code is better-auth's own; this module is the only thing that turns
 * one into prose. Reflecting better-auth's `message` instead would have been shorter and is the
 * thing not to do: `/sign-in?error=<anything>` would then write arbitrary prose onto our own
 * sign-in page, which is a phishing text however carefully it is escaped. An unrecognised code gets
 * `otherwise`.
 *
 * The codes are `BASE_ERROR_CODES` in `@better-auth/core`, plus `TOO_MANY_REQUESTS` for a `429`,
 * which carries a message and no code. Only the ones these four forms can actually provoke are
 * listed — a longer list would be guesswork about paths that do not exist yet.
 *
 * **One of the four is reached by a `GET` rather than a form**, and that is worth knowing before
 * reading `signInFailure`: `/verify-email` is followed from a link in an email and, when the token has
 * expired or does not verify, redirects to `/sign-in?error=<code>` rather than answering with an
 * error. So three of that page's codes belong to a request nothing on it submitted.
 */
import { passwordMinimum } from "./password";

export type Failure = {
  /** The page the form is on, and where a failed POST is sent back to. */
  readonly page: string;
  readonly reasons: Readonly<Record<string, string>>;
  /** For a code this file does not know, including a body-validation failure. */
  readonly otherwise: string;
};

/**
 * The two codes this file mints rather than reads off better-auth.
 *
 * `TOO_MANY_REQUESTS` because a `429` carries a message and no code, and `UNKNOWN` because a refusal
 * whose code cannot be read is still a refusal. Both are declared here, beside `reasons`, so the
 * spelling is shared with the sentences they select rather than agreed by convention across the
 * query-string boundary that separates `route.ts` from these pages.
 */
export const refusedForRate = "TOO_MANY_REQUESTS";
export const refusedWithoutSayingWhy = "UNKNOWN";

/** Said the same way in both places, because it is the same refusal. */
const tooManyRequests = "Too many attempts. Wait a moment and try again.";

/**
 * The two length refusals, said once for the two forms that can provoke them: sign-up and the reset
 * page, which are the only two places a password is chosen.
 *
 * **The minimum is read from `password.ts` rather than typed here**, because that module is where the
 * number is chosen and `auth.ts` is where it is enforced — a sentence naming a different number would
 * be a page telling a reader a rule the server does not apply. The maximum is better-auth's own 128,
 * which `password.ts` records as deliberately not ours to set.
 */
const passwordTooShort = `Choose a password of at least ${passwordMinimum} characters.`;
const passwordTooLong = "That password is too long. 128 characters is the most.";

/**
 * Said the same way wherever a link has stopped working, because the reader's next move is the same
 * one and the difference between the two codes is not theirs to care about.
 *
 * better-auth mints both: `TOKEN_EXPIRED` when the JWT in a verification link is past `expiresIn`, and
 * `INVALID_TOKEN` when it does not verify at all — which is also what a reset link that has been used
 * or has expired comes back as, since `consumeVerificationValue` cannot tell a spent row from a stale
 * one.
 */
const linkNoLongerWorks =
  "That link has expired or has already been used. Sign in below and we will send you another.";

export const signInFailure: Failure = {
  page: "/sign-in",
  reasons: {
    // One sentence for a wrong password and for an email nobody holds, deliberately: better-auth
    // returns one code for both, and distinguishing them here would answer "does this person have
    // an account" to anyone who asks.
    INVALID_EMAIL_OR_PASSWORD: "That email address and password do not match an account.",
    INVALID_EMAIL: "That is not an email address.",
    [refusedForRate]: tooManyRequests,
    CROSS_SITE_NAVIGATION_LOGIN_BLOCKED: "That sign-in came from another site, so it was refused.",
    /**
     * **The password was right and the address is not confirmed yet**, which is
     * `auth/auth.ts` → `requireEmailVerification`. better-auth reaches this only after verifying the
     * password, so the sentence can promise a fresh link without promising it to a stranger:
     * `sendOnSignIn` has already sent one by the time this page renders.
     */
    EMAIL_NOT_VERIFIED:
      "Your email address is not confirmed yet, so signing in is not possible. We have just sent " +
      "the link again — open it and then sign in.",
    // The three a verification link can come back with. `verify-email` redirects to this page with
    // one of them on the query string rather than answering with an error, so they arrive here and
    // not on a page of their own.
    TOKEN_EXPIRED: linkNoLongerWorks,
    INVALID_TOKEN: linkNoLongerWorks,
    // Only reachable for a link whose account has since gone. Nothing deletes an account yet — that
    // is CAN-30 GDPR export and erasure — so this is listed for when something does.
    USER_NOT_FOUND: "That link was for an account that no longer exists.",
  },
  otherwise: "Signing in did not work. Check the email address and password, and try again.",
};

/**
 * Asking for a reset link.
 *
 * **There is no code here for "no account has that address", and there cannot be.** better-auth
 * answers `/request-password-reset` with the same `200` either way — it generates a token and reads a
 * dummy verification row for an address nobody holds, to keep the timing alike — so this page is
 * structurally unable to say. `route.ts` sends a success to `?sent`, whose notice says what *would*
 * happen rather than what did.
 */
export const forgotPasswordFailure: Failure = {
  page: "/forgot-password",
  reasons: {
    INVALID_EMAIL: "That is not an email address.",
    [refusedForRate]: tooManyRequests,
    // Reachable only if `sendResetPassword` is ever removed from `auth/auth.ts`, which would leave
    // this page offering something nothing is behind. Listed so that it says so rather than falling
    // to `otherwise`.
    RESET_PASSWORD_DISABLED: "Resetting a password by email is not available at the moment.",
  },
  otherwise: "That did not work. Check the email address and try again.",
};

/**
 * Choosing the new password, on the page a reset link lands on.
 *
 * The two length codes are the likely refusals and the reason `route.ts` carries the token back into
 * this page: a password that was merely too short must be retypeable without a second email.
 */
export const resetPasswordFailure: Failure = {
  page: "/reset-password",
  reasons: {
    PASSWORD_TOO_SHORT: passwordTooShort,
    PASSWORD_TOO_LONG: passwordTooLong,
    [refusedForRate]: tooManyRequests,
    // A reset link is single-use and hourly, so this is the ordinary way for this page to fail — and
    // unlike on `/sign-in`, the reader here cannot be offered "sign in and we will send another".
    INVALID_TOKEN:
      "That reset link has expired or has already been used. Ask for a new one below.",
  },
  otherwise: "Setting the new password did not work. Ask for a new link below and try again.",
};

export const signUpFailure: Failure = {
  page: "/sign-up",
  reasons: {
    PASSWORD_TOO_SHORT: passwordTooShort,
    PASSWORD_TOO_LONG: passwordTooLong,
    INVALID_EMAIL: "That is not an email address.",
    [refusedForRate]: tooManyRequests,
    // Reachable only if the enumeration protection in `auth.ts` is ever switched off, and listed so
    // that switching it off does not also produce an unexplained failure. `auth.ts` says why it is
    // on.
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "An account already uses that email address.",
  },
  otherwise:
    "Creating the account did not work. Check the email address and password, and try again.",
};

/** The sentence for a code, or nothing at all when the form has not been submitted. */
export function explain(failure: Failure, code: string | undefined): string | undefined {
  if (code === undefined) return undefined;
  return failure.reasons[code] ?? failure.otherwise;
}

/**
 * The code a refusal carries, as a string that can go in a query string.
 *
 * **A code, never better-auth's message.** The reason is the one this whole module exists for: a
 * message reflected into a URL would make `/sign-in?error=…` a way of writing arbitrary prose onto
 * our own sign-in page, which is a phishing text however carefully it is escaped.
 */
export async function codeOfRefusal(response: Response): Promise<string> {
  if (response.status === 429) return refusedForRate;
  const body: unknown = await response
    .clone()
    .json()
    .catch(() => undefined);
  const code =
    typeof body === "object" && body !== null ? (body as { code?: unknown }).code : undefined;
  return typeof code === "string" ? code : refusedWithoutSayingWhy;
}

/**
 * The `error` a page was loaded with, as a code.
 *
 * **Present-but-unusable is not the same as absent.** `?error=a&error=b` arrives as an array, which
 * is not a code — but it is still a submission that failed, so it takes the unrecognised path and
 * gets the `otherwise` sentence rather than silence.
 */
export function codeFrom(parameter: string | string[] | undefined): string | undefined {
  if (parameter === undefined) return undefined;
  return typeof parameter === "string" ? parameter : refusedWithoutSayingWhy;
}
