import { passwordMinimum } from "@/auth/password";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { ResetPasswordPage } from "./reset-password-page";

/**
 * **This page carries the one `href`-shaped value in the application that is not a literal**, so it
 * gets more attention than its size suggests: the form's `action` is built from a token that arrived in
 * a query string.
 *
 * `no-linkification.test.tsx` cannot see it — a form target is not a link — so the assertions that it
 * stays confined to a single encoded query parameter are here.
 */

const token = "a-token-better-auth-would-have-issued";

test("posts to better-auth's endpoint, carrying the token in the query", () => {
  render(<ResetPasswordPage token={token} />);

  const form = document.querySelector("form");
  expect(form?.getAttribute("method")).toBe("post");
  expect(form?.getAttribute("action")).toBe(`/api/auth/reset-password?token=${token}`);
});

/**
 * **The token is URL-encoded, so nothing in it can add a parameter or leave the path.**
 *
 * The path itself is a literal in this repository; the only data-derived part of the whole `action` is
 * one query value. A token carrying `&`, `#` or a slash would otherwise change which endpoint the form
 * posts to, or add a field better-auth reads.
 */
test("a token carrying anything unexpected stays inside its own parameter", () => {
  render(<ResetPasswordPage token="a&newPassword=hunter2#/../../elsewhere" />);

  expect(document.querySelector("form")?.getAttribute("action")).toBe(
    "/api/auth/reset-password?token=a%26newPassword%3Dhunter2%23%2F..%2F..%2Felsewhere",
  );
});

/**
 * **With no token there is nothing to submit, so there is no form.**
 *
 * A rendered form here would post a password with no token, be refused, and send the reader back to
 * this same page — a loop that looks like a broken service rather than a missing link. So the page says
 * what is needed instead, and offers the way to get it.
 */
test("renders no form at all without a token, and says what is needed", () => {
  render(<ResetPasswordPage />);

  expect(document.querySelector("form")).toBeNull();
  expect(document.querySelector("input")).toBeNull();
  expect(screen.getByText(/needs the link from the email/)).toBeDefined();
  expect(screen.getByRole("link", { name: "ask for a new one" }).getAttribute("href")).toBe(
    "/forgot-password",
  );
});

/**
 * `new-password`, not `current-password`, and the minimum declared: this is the one other place in the
 * application where a password is chosen, so it has to agree with the sign-up form.
 * `credential-fields.tsx` is what makes them agree, and this asserts that it was used.
 */
test("asks for a new password the way the sign-up form does", () => {
  render(<ResetPasswordPage token={token} />);

  const password = screen.getByLabelText("Password");
  expect(password.getAttribute("type")).toBe("password");
  expect(password.getAttribute("autocomplete")).toBe("new-password");
  expect(password.getAttribute("minlength")).toBe(String(passwordMinimum));
});

/**
 * **`newPassword`, which is the name `/reset-password` takes** — the sign-in and sign-up forms post
 * `password`. The browser posts straight at better-auth's endpoint, so the form has to spell that
 * endpoint's own field name; getting it wrong is a form that submits successfully and resets nothing,
 * which is why it is asserted here rather than trusted to a shared component's default.
 *
 * No email field either: the token identifies the account, and asking for the address again would be
 * asking for something nothing checks against it — a field that changes nothing invites the belief
 * that it does.
 */
test("asks for nothing but the new password, under the name that endpoint takes", () => {
  render(<ResetPasswordPage token={token} />);

  const names = [...document.querySelectorAll("input")].map((input) => input.getAttribute("name"));
  expect(names).toEqual(["newPassword"]);
  // The label still reaches it, which the shared component only manages because its `id` follows the
  // `name`.
  expect(screen.getByLabelText("Password").getAttribute("name")).toBe("newPassword");
});

test("announces a refusal rather than only printing it", () => {
  render(<ResetPasswordPage token={token} problem="Choose a longer password." />);

  expect(screen.getByRole("alert").textContent).toBe("Choose a longer password.");
});

/**
 * **A refusal keeps the form, and keeps the token in it.** That is what `route.ts` →
 * `backToTheResetForm` is for: the likely refusal here is a password that was too short, and losing the
 * token would cost a second email for a typo.
 */
test("a refusal leaves the form usable, token and all", () => {
  render(<ResetPasswordPage token={token} problem="Choose a longer password." />);

  expect(document.querySelector("form")?.getAttribute("action")).toBe(
    `/api/auth/reset-password?token=${token}`,
  );
  expect(screen.getByLabelText("Password")).toBeDefined();
});

test("offers a new link, since a used or expired one is the ordinary failure here", () => {
  render(<ResetPasswordPage token={token} />);

  expect(screen.getByRole("link", { name: "Ask for a new one" }).getAttribute("href")).toBe(
    "/forgot-password",
  );
});
