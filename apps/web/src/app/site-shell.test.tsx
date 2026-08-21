import { reportingAddress } from "@canoncore/config";
import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import { SiteShell } from "./site-shell";

/**
 * **Two of these assertions hold up something outside this file, which is why the shell is tested
 * at all rather than left to the eye.**
 *
 * The reporting route in the footer is what
 * [`code-measures-register.md`](../../../../docs/compliance/code-measures-register.md) records for
 * ICU D2 and PCU D2 — "linked from the footer of every page" — and a compliance record that rests
 * on a rendered result should rest on an asserted one.
 *
 * The skip link is WCAG 2.4.1 Bypass Blocks, and it is the criterion that fails most quietly: a
 * link whose target has been renamed still renders, still takes focus, and simply does not go
 * anywhere.
 */
const shell = () => render(<SiteShell>A page.</SiteShell>);

test("the reporting route is in the footer, as an address needing no account", () => {
  shell();

  expect(screen.getByRole("link", { name: "Report content" }).getAttribute("href")).toBe(
    `mailto:${reportingAddress}`,
  );
});

test("the skip link comes first and lands on the content", () => {
  const { container } = shell();

  const skip = screen.getByRole("link", { name: "Skip to the content" });
  // First in the document order, which is what makes it first in the tab order.
  expect(container.querySelector("a")).toBe(skip);

  const target = skip.getAttribute("href")?.slice(1);
  const landing = container.querySelector(`#${target}`);
  expect(landing).toBe(screen.getByRole("main"));
  // Focusable, or the jump scrolls the page and leaves the caret in the masthead behind it.
  expect(landing?.getAttribute("tabindex")).toBe("-1");
});

// The masthead's way home, which is why no page draws one of its own any more. It is navigation
// rather than a bare link so that the landmark exists from the start — `site-header.tsx` says why
// it holds one destination today, and which tickets add the next two.
test("the masthead is a link to the front page and is not a heading", () => {
  shell();

  const site = screen.getByRole("navigation", { name: "Site" });
  expect(within(site).getByRole("link", { name: "CanonCore" }).getAttribute("href")).toBe("/");
  expect(screen.queryAllByRole("heading")).toEqual([]);
});
