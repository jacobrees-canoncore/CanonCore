import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { FrontPage } from "./front-page";

/**
 * **The rendered half of the non-linkification control.** Why the control exists and what the two
 * lint rules in `eslint.config.mjs` are each worth is written there; what belongs here is why an
 * assertion over a *rendered* result is a different check rather than a second copy of one.
 *
 * **It is about the surface, not about who wrote the string**, which is what makes it reach a
 * Provider at all. A displayed value is the overlay's composed answer — Snapshots from each
 * Source, an Override on top ([ADR-0004](../../../../docs/adr/0004-layered-overlay-for-sources-and-edits.md))
 * — so a title is the slot a Provider fills the moment anything imports. The surface never asks
 * which layer won, and this asserts that it cannot start to. It is also the only check that sees
 * an `<a href>` written by hand, which both lint rules miss.
 *
 * **Every surface that renders text belongs in this file**, and one exists today. CAN-27 Orderings
 * and Placements, and the imported broadcast Ordering brings the Ordering and Story pages, CAN-26
 * Import a series from TMDB, with the overlay behind it brings a Listed Provider's prose, and
 * CAN-113 Add a Provider by pasting its URL brings a stranger's. Finding 2c of
 * [`illegal-content-risk-assessment.md`](../../../../docs/compliance/illegal-content-risk-assessment.md)
 * names all three, so a surface landing without its case here makes that record false.
 */
const hostile = "https://example.invalid/looks-like-a-link";

test("renders a URL as text, and produces no anchor element", () => {
  render(
    <FrontPage
      stories={[{ id: "00000000-0000-4000-8000-000000000001", title: hostile }]}
    />,
  );

  expect(screen.getByRole("listitem").textContent).toBe(hostile);
  expect(screen.queryAllByRole("link")).toEqual([]);
});
