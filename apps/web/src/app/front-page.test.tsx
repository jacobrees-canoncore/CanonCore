import { siteName } from "@canoncore/config";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { FrontPage } from "./front-page";

test("names the site in its heading", () => {
  render(<FrontPage stories={[]} />);

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(siteName);
});

test("says the site is being rebuilt", () => {
  render(<FrontPage stories={[]} />);

  expect(screen.queryByText("Being rebuilt.")).not.toBeNull();
});

test("lists the Stories it was given", () => {
  render(
    <FrontPage
      stories={[
        { id: "00000000-0000-4000-8000-000000000001", title: "Rose" },
        { id: "00000000-0000-4000-8000-000000000002", title: "Blink" },
      ]}
    />,
  );

  expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
    "Rose",
    "Blink",
  ]);
});

// The page reads through row-level security, and a broken policy returns nothing rather than
// failing — so "empty" is a state this page will genuinely be in if anything goes wrong, and it
// has to say something rather than render a bare heading.
test("says so when there is nothing public to show", () => {
  render(<FrontPage stories={[]} />);

  expect(screen.queryByRole("list")).toBeNull();
  expect(screen.queryByText("No Story is public yet.")).not.toBeNull();
});

/**
 * The account line, which is the front page's whole share of CAN-24 A signed-in and a signed-out
 * path: the page has to say which of the two states a reader is in, and offer the way out of it.
 */
test("offers a way in when nobody is signed in", () => {
  render(<FrontPage stories={[]} />);

  expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/sign-in");
  expect(screen.getByRole("link", { name: "create an account" }).getAttribute("href")).toBe(
    "/sign-up",
  );
  expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
});

test("names the signed-in reader, and offers the way out", () => {
  render(<FrontPage stories={[]} signedInAs="someone@example.invalid" />);

  expect(screen.queryByText("someone@example.invalid")).not.toBeNull();
  expect(screen.getByRole("button", { name: "Sign out" })).toBeDefined();
  expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
});

/**
 * **A `POST`, and with no named input.** Both halves are load-bearing and neither is visible from the
 * rendered page: signing out deletes a session row, so a `GET` that anything could fire is wrong; and
 * `/sign-out` inherits `application/json`, which a form-encoded *body* would fail with a `415` — so
 * the form must send no fields at all. `../app/api/auth/[...all]/route.ts` records the second, and
 * `db/rls.test.ts` proves it against a real request.
 */
test("signs out with a POST that carries no fields", () => {
  render(<FrontPage stories={[]} signedInAs="someone@example.invalid" />);

  const form = document.querySelector("form");
  expect(form?.getAttribute("method")).toBe("post");
  expect(form?.getAttribute("action")).toBe("/api/auth/sign-out");
  expect(form?.querySelectorAll("[name]")).toHaveLength(0);
});

// The heading is the page saying whose list this is. Signed out it can only be the public ones;
// signed in it is those plus your own, which is what the policy on `story` returns.
test("says whose Stories the list is", () => {
  render(<FrontPage stories={[]} />);
  expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Public Stories");

  render(<FrontPage stories={[]} signedInAs="someone@example.invalid" />);
  expect(
    screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent),
  ).toContain("Stories you can read");
});
