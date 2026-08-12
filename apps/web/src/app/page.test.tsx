import { siteName } from "@canoncore/config";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "./page";

test("names the site in its heading", () => {
  render(<Home />);

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(siteName);
});

test("says the site is being rebuilt", () => {
  render(<Home />);

  expect(screen.queryByText("Being rebuilt.")).not.toBeNull();
});
