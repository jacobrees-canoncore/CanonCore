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
