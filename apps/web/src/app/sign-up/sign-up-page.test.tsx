import { passwordMinimum } from "@/auth/password";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { SignUpPage } from "./sign-up-page";

test("posts the form straight at better-auth's own endpoint", () => {
  render(<SignUpPage />);

  const form = document.querySelector("form");
  expect(form?.getAttribute("method")).toBe("post");
  expect(form?.getAttribute("action")).toBe("/api/auth/sign-up/email");
});

// `name` is required by better-auth's own `user` model rather than by anything this product renders,
// so it is here because the endpoint refuses a body without it.
test("asks for the three fields better-auth's sign-up requires", () => {
  render(<SignUpPage />);

  expect(screen.getByLabelText("Name").getAttribute("name")).toBe("name");
  expect(screen.getByLabelText("Email address").getAttribute("name")).toBe("email");
  expect(screen.getByLabelText("Password").getAttribute("name")).toBe("password");
});

/**
 * **The floor, declared where a browser can enforce it before a round trip.** It is not the
 * enforcement — `auth/auth.ts` refuses a short password whatever a form says — which is why the
 * number comes from the one module both read rather than being written twice.
 */
test("declares the password minimum, and says it in words too", () => {
  render(<SignUpPage />);

  const password = screen.getByLabelText("Password");
  expect(password.getAttribute("minLength")).toBe(String(passwordMinimum));
  expect(password.getAttribute("autocomplete")).toBe("new-password");
  expect(screen.queryByText(`At least ${passwordMinimum} characters.`)).not.toBeNull();
});

/**
 * **What this page may not say, which is the whole of the enumeration protection at the surface.**
 *
 * `auth/auth.ts` → `autoSignIn` makes signing up with an address somebody already holds answer
 * exactly as a free one does. Copy that promises the account now exists would undo it in prose: a
 * caller would learn from the wording what the status code refuses to tell them.
 */
test("promises no account was created, because it cannot know", () => {
  render(<SignUpPage />);

  const body = document.body.textContent ?? "";
  expect(body).toContain("Creating an account does not sign you in");
  expect(body).toContain("if it was already in use, nothing has changed");
  expect(body).not.toMatch(/that address is (already )?(taken|in use)\./i);
});

test("announces a refusal rather than only printing it", () => {
  render(<SignUpPage problem="Choose a longer password." />);

  expect(screen.getByRole("alert").textContent).toBe("Choose a longer password.");
});
