import { expect, test } from "vitest";
import { codeFrom, explain, signInFailure, signUpFailure } from "./failures";

/**
 * The closed set, tested as a closed set.
 *
 * What matters here is not that a known code maps to a sentence — that is a lookup — but that an
 * *unknown* one still produces prose of ours rather than nothing and rather than the caller's own
 * string. `failures.ts` says why reflecting better-auth's message would be a way of writing
 * arbitrary text onto our sign-in page.
 */
test("a known code gets its own sentence", () => {
  expect(explain(signInFailure, "INVALID_EMAIL_OR_PASSWORD")).toBe(
    "That email address and password do not match an account.",
  );
  expect(explain(signUpFailure, "PASSWORD_TOO_SHORT")).toBe(
    "Choose a password of at least 12 characters.",
  );
});

test("an unrecognised code still gets a sentence, and it is ours", () => {
  expect(explain(signInFailure, "SOMETHING_NOBODY_HAS_HEARD_OF")).toBe(signInFailure.otherwise);
  expect(explain(signUpFailure, "SOMETHING_NOBODY_HAS_HEARD_OF")).toBe(signUpFailure.otherwise);
});

// Nothing arbitrary can reach a reader through the query string, which is the property the whole
// design of `failures.ts` exists for. A sentence somebody put in a URL is not one of the sentences.
test("no sentence is ever the code it came from", () => {
  const injected = "Your account was suspended. Email attacker@example.invalid.";

  expect(explain(signInFailure, injected)).toBe(signInFailure.otherwise);
  expect(explain(signUpFailure, injected)).not.toContain("attacker@example.invalid");
});

test("a form that has not been submitted says nothing", () => {
  expect(explain(signInFailure, undefined)).toBeUndefined();
  expect(codeFrom(undefined)).toBeUndefined();
});

/**
 * `?error=a&error=b` arrives as an array. That is still a submission that failed, so it must not be
 * silence — but an array is not a code either, so it takes the unrecognised path.
 */
test("a repeated error parameter is a failure rather than silence", () => {
  expect(codeFrom(["a", "b"])).toBe("UNKNOWN");
  expect(explain(signInFailure, codeFrom(["a", "b"]))).toBe(signInFailure.otherwise);
});

test("each failure knows which page its form is on", () => {
  expect(signInFailure.page).toBe("/sign-in");
  expect(signUpFailure.page).toBe("/sign-up");
});
