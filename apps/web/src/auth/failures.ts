/**
 * What a reader is told when signing up or signing in did not work.
 *
 * **The sentences are ours and the set is closed.** A failed POST comes back to the form as
 * `?error=<code>`, where the code is better-auth's own; this module is the only thing that turns
 * one into prose. Reflecting better-auth's `message` instead would have been shorter and is the
 * thing not to do: `/sign-in?error=<anything>` would then write arbitrary prose onto our own
 * sign-in page, which is a phishing text however carefully it is escaped. An unrecognised code gets
 * `otherwise`.
 *
 * The codes are `BASE_ERROR_CODES` in `@better-auth/core`, plus `TOO_MANY_REQUESTS` for a `429`,
 * which carries a message and no code. Only the ones these two forms can actually provoke are
 * listed — a longer list would be guesswork about paths that do not exist yet.
 */
export type Failure = {
  /** The page the form is on, and where a failed POST is sent back to. */
  readonly page: string;
  readonly reasons: Readonly<Record<string, string>>;
  /** For a code this file does not know, including a body-validation failure. */
  readonly otherwise: string;
};

/** Said the same way in both places, because it is the same refusal. */
const tooManyRequests = "Too many attempts. Wait a moment and try again.";

export const signInFailure: Failure = {
  page: "/sign-in",
  reasons: {
    // One sentence for a wrong password and for an email nobody holds, deliberately: better-auth
    // returns one code for both, and distinguishing them here would answer "does this person have
    // an account" to anyone who asks.
    INVALID_EMAIL_OR_PASSWORD: "That email address and password do not match an account.",
    INVALID_EMAIL: "That is not an email address.",
    TOO_MANY_REQUESTS: tooManyRequests,
    CROSS_SITE_NAVIGATION_LOGIN_BLOCKED: "That sign-in came from another site, so it was refused.",
  },
  otherwise: "Signing in did not work. Check the email address and password, and try again.",
};

export const signUpFailure: Failure = {
  page: "/sign-up",
  reasons: {
    PASSWORD_TOO_SHORT: "Choose a password of at least 12 characters.",
    PASSWORD_TOO_LONG: "That password is too long. 128 characters is the most.",
    INVALID_EMAIL: "That is not an email address.",
    TOO_MANY_REQUESTS: tooManyRequests,
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
 * The `error` a page was loaded with, as a code.
 *
 * **Present-but-unusable is not the same as absent.** `?error=a&error=b` arrives as an array, which
 * is not a code — but it is still a submission that failed, so it becomes `UNKNOWN` and gets the
 * `otherwise` sentence rather than silence.
 */
export function codeFrom(parameter: string | string[] | undefined): string | undefined {
  if (parameter === undefined) return undefined;
  return typeof parameter === "string" ? parameter : "UNKNOWN";
}
