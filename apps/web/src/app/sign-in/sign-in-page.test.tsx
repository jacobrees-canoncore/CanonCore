import { passwordMinimum } from "@/auth/password";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { SignInPage } from "./sign-in-page";

/**
 * The form's own attributes, which are the part a reader depends on and a refactor drops silently.
 *
 * **The `action` and `method` are the load-bearing pair.** Everything else about this design follows
 * from the browser posting straight at better-auth's endpoint — the rate limiters, the WAF rule, the
 * absence of a client bundle — and all of it is undone by a form that posts somewhere else.
 * [`../api/auth/[...all]/route.ts`](../api/auth/%5B...all%5D/route.ts) has the argument.
 */
test("posts the form straight at better-auth's own endpoint", () => {
  render(<SignInPage />);

  const form = document.querySelector("form");
  expect(form?.getAttribute("method")).toBe("post");
  expect(form?.getAttribute("action")).toBe("/api/auth/sign-in/email");
});

test("labels both fields, and tells a password manager which is which", () => {
  render(<SignInPage />);

  const email = screen.getByLabelText("Email address");
  expect(email.getAttribute("type")).toBe("email");
  // `username`, not `email`: it is the token password managers pair with `current-password`.
  expect(email.getAttribute("autocomplete")).toBe("username");

  const password = screen.getByLabelText("Password");
  expect(password.getAttribute("type")).toBe("password");
  expect(password.getAttribute("autocomplete")).toBe("current-password");
});

/**
 * **No minimum on sign-in, deliberately.** An account created before the floor was raised must still
 * be able to sign in, and a length rejection here would be a hint about the password.
 * `credential-fields.tsx` says both halves; this is the one that a copy-paste from the sign-up form
 * would break.
 */
test("puts no length minimum on the sign-in password", () => {
  render(<SignInPage />);

  expect(screen.getByLabelText("Password").hasAttribute("minLength")).toBe(false);
  expect(screen.queryByText(`At least ${passwordMinimum} characters.`)).toBeNull();
});

// A refusal has to reach somebody who has just pressed a button and had the page reload under them.
// `role="alert"` is what does that; without it the only difference is a paragraph to notice.
test("announces a refusal rather than only printing it", () => {
  render(<SignInPage problem="That did not work." />);

  expect(screen.getByRole("alert").textContent).toBe("That did not work.");
});

test("says nothing at all when the form has not been submitted", () => {
  render(<SignInPage />);

  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.queryByRole("status")).toBeNull();
});

/**
 * The notice a completed sign-up comes back with, and its wording is the point.
 *
 * It must be true whether or not the address was free — `auth/auth.ts` → `autoSignIn` is what makes
 * signing up with an address already in use answer identically — so "your account was created" is
 * exactly what it may not say.
 */
test("the after-sign-up notice does not claim an account was created", () => {
  render(<SignInPage created />);

  const notice = screen.getByRole("status").textContent ?? "";
  expect(notice).toContain("If that email address was free");
  expect(notice).not.toMatch(/your account (was|has been) created/i);
});

// Resetting a password needs a mail provider, which is CAN-31 Email verification and password reset.
// Until it ships, an offer this service cannot keep is worse than its absence.
test("offers no password reset, because nothing is behind one yet", () => {
  render(<SignInPage />);

  expect(screen.queryByText(/forgot/i)).toBeNull();
  expect(screen.queryByText(/reset/i)).toBeNull();
});
