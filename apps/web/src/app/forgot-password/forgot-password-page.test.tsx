import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { ForgotPasswordPage } from "./forgot-password-page";

/**
 * The form's own attributes, for `sign-in-page.test.tsx`'s reason: they are what a reader depends on
 * and what a refactor drops silently.
 */
test("posts the form straight at better-auth's own endpoint", () => {
  render(<ForgotPasswordPage />);

  const form = document.querySelector("form");
  expect(form?.getAttribute("method")).toBe("post");
  expect(form?.getAttribute("action")).toBe("/api/auth/request-password-reset");
});

/**
 * **No hidden field, and that is the assertion rather than an absence nobody checks.**
 *
 * `redirectTo` is what decides where the link in somebody's mailbox sends them, and
 * `api/auth/[...all]/route.ts` → `flows` adds it server-side precisely so that a submitted body has no
 * say. A hidden input here would move that decision into markup a page could be induced to render.
 */
test("submits the email address and nothing else", () => {
  render(<ForgotPasswordPage />);

  const names = [...document.querySelectorAll("input")].map((input) => input.getAttribute("name"));
  expect(names).toEqual(["email"]);
  expect(document.querySelector("input[type='hidden']")).toBeNull();
});

test("asks for the address the way the other forms do", () => {
  render(<ForgotPasswordPage />);

  const email = screen.getByLabelText("Email address");
  expect(email.getAttribute("type")).toBe("email");
  // `username`, matching sign-in and sign-up, so a password manager fills the same field.
  expect(email.getAttribute("autocomplete")).toBe("username");
});

// No password field anywhere on this page: the new one is chosen on `/reset-password`, behind the
// link. A password input here would be a credential collected before anything had been proved.
test("collects no password", () => {
  render(<ForgotPasswordPage />);

  expect(document.querySelector("input[type='password']")).toBeNull();
});

test("says nothing at all before the form has been submitted", () => {
  render(<ForgotPasswordPage />);

  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.queryByRole("alert")).toBeNull();
});

/**
 * **The confirmation may not say whether that address has an account**, which is the one thing about
 * this page worth pinning.
 *
 * better-auth answers `/request-password-reset` identically either way — it mints a token and reads a
 * dummy verification row for an address nobody holds, to keep the timing alike — so a page claiming
 * "a link is on its way" without the condition would give away, to anybody who asked, which addresses
 * have accounts here. That is the same disclosure `auth/auth.ts` → `autoSignIn` exists to prevent on
 * sign-up.
 */
test("the confirmation is conditional, so it reveals no account", () => {
  render(<ForgotPasswordPage sent />);

  const notice = screen.getByRole("status").textContent ?? "";
  expect(notice).toMatch(/^If that email address has an account/);
  expect(notice).not.toMatch(/we have sent|a link has been sent|check your email for the link/i);
});

// The window the reader is told, read from the same constant `auth.ts` enforces. A page promising an
// hour over a token that expires in fifteen minutes is a page that lies twice a day.
test("the confirmation quotes the real lifetime of the link", () => {
  render(<ForgotPasswordPage sent />);

  expect(screen.getByRole("status").textContent).toContain("works for one hour");
});

// A refusal has to reach somebody who has just pressed a button and had the page reload under them.
test("announces a refusal rather than only printing it", () => {
  render(<ForgotPasswordPage problem="That is not an email address." />);

  expect(screen.getByRole("alert").textContent).toBe("That is not an email address.");
});

test("offers the way back to signing in", () => {
  render(<ForgotPasswordPage />);

  expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/sign-in");
});
