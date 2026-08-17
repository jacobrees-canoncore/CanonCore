import { expect, test } from "vitest";
import {
  codeFrom,
  explain,
  forgotPasswordFailure,
  resetPasswordFailure,
  signInFailure,
  signUpFailure,
} from "./failures";
import { passwordMinimum } from "./password";

/** The four forms, so each assertion below is made of every one of them rather than of a sample. */
const everyForm = [signInFailure, signUpFailure, forgotPasswordFailure, resetPasswordFailure];

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
  for (const failure of everyForm) {
    expect(explain(failure, "SOMETHING_NOBODY_HAS_HEARD_OF")).toBe(failure.otherwise);
  }
});

// Nothing arbitrary can reach a reader through the query string, which is the property the whole
// design of `failures.ts` exists for. A sentence somebody put in a URL is not one of the sentences.
test("no sentence is ever the code it came from", () => {
  const injected = "Your account was suspended. Email attacker@example.invalid.";

  for (const failure of everyForm) {
    expect(explain(failure, injected)).toBe(failure.otherwise);
    expect(explain(failure, injected)).not.toContain("attacker@example.invalid");
  }
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
  expect(forgotPasswordFailure.page).toBe("/forgot-password");
  expect(resetPasswordFailure.page).toBe("/reset-password");
});

/**
 * **The three codes a verification link comes back with, on the page it lands on.**
 *
 * They belong to a `GET` nothing on `/sign-in` submitted: `verify-email` redirects to its `callbackURL`
 * with `?error=<code>` rather than answering with an error, so a code better-auth mints for a link in a
 * mailbox arrives on a form's page. Left out, an expired link would get the sign-in form's generic
 * "check the email address and password" — advice for a problem the reader does not have.
 */
test("an expired or unusable verification link is explained on the sign-in page", () => {
  for (const code of ["TOKEN_EXPIRED", "INVALID_TOKEN"]) {
    const sentence = explain(signInFailure, code);
    expect(sentence).not.toBe(signInFailure.otherwise);
    expect(sentence).toContain("expired");
    // The recovery route, which only this page can offer: signing in is what re-sends the link.
    expect(sentence).toContain("send you another");
  }
});

/**
 * The refusal `requireEmailVerification` produces, and the sentence has to be true of *when* it is
 * reached: better-auth checks verification only after the password verifies, and `sendOnSignIn` has
 * therefore already sent a fresh link by the time this page renders.
 */
test("an unverified sign-in is told a link has just been sent", () => {
  const sentence = explain(signInFailure, "EMAIL_NOT_VERIFIED") ?? "";

  expect(sentence).toContain("not confirmed");
  expect(sentence).toContain("just sent");
});

/**
 * **The reset page cannot offer "sign in and we will send another", and the sign-in page can.** The
 * same `INVALID_TOKEN` therefore gets two sentences, and the difference is the whole reason both pages
 * list it: a reader on `/reset-password` is not signed in and has no password to sign in with, so the
 * only move available to them is asking for a new link.
 */
test("the same unusable-token code says different things on the two pages", () => {
  const onSignIn = explain(signInFailure, "INVALID_TOKEN") ?? "";
  const onReset = explain(resetPasswordFailure, "INVALID_TOKEN") ?? "";

  expect(onSignIn).not.toBe(onReset);
  expect(onSignIn).toContain("Sign in");
  expect(onReset).toContain("Ask for a new one");
});

/**
 * **The length refusals are one sentence for the two forms that can provoke them**, and the minimum in
 * them is the number `auth.ts` actually enforces. A page naming a different one would be telling a
 * reader a rule the server does not apply, and typing it twice is how that happens.
 */
test("both places a password is chosen quote the same minimum", () => {
  const expected = `Choose a password of at least ${passwordMinimum} characters.`;

  expect(explain(signUpFailure, "PASSWORD_TOO_SHORT")).toBe(expected);
  expect(explain(resetPasswordFailure, "PASSWORD_TOO_SHORT")).toBe(expected);
  expect(explain(signUpFailure, "PASSWORD_TOO_LONG")).toBe(
    explain(resetPasswordFailure, "PASSWORD_TOO_LONG"),
  );
});

/**
 * **No page may say whether an address has an account**, and this is where that is checked as a
 * property of the set rather than argued page by page.
 *
 * `/sign-in` returns one code for a wrong password and an unknown address; `/sign-up` says nothing when
 * the address is taken; `/request-password-reset` answers identically either way. So no sentence
 * anywhere may claim an account exists or does not.
 */
test("no sentence anywhere says whether an account exists", () => {
  for (const failure of everyForm) {
    for (const sentence of [...Object.values(failure.reasons), failure.otherwise]) {
      expect(sentence).not.toMatch(/no account|not registered|unknown (email|address)/i);
      expect(sentence).not.toMatch(/that address (has|does not have) an account/i);
    }
  }
});

/**
 * Every rate-limit refusal is the same sentence, because it is the same refusal — and the limits behind
 * them are not the same: `auth.ts` gives the two mail-sending endpoints ten-minute windows and the
 * credential ones ten-second windows. The reader is told to wait either way, which is all they can act
 * on.
 */
test("a rate-limited request is refused the same way on every form", () => {
  const sentences = new Set(everyForm.map((failure) => explain(failure, "TOO_MANY_REQUESTS")));

  expect(sentences.size).toBe(1);
  expect([...sentences][0]).toContain("Too many attempts");
});
