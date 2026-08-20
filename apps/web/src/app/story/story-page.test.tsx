import type { StoryDetail } from "@/db/stories";
import { siteName } from "@canoncore/config";
import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import { StoryPage } from "./story-page";

/**
 * The founding Story as migration 0012 leaves it: one television Version of forty-five minutes,
 * named as its canonical one, and part of Series 1.
 */
const rose: StoryDetail = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Rose",
  runtimeSeconds: 2700,
  versions: [
    { id: "00000000-0000-4000-8000-0000000000b1", medium: "television", runtimeSeconds: 2700 },
  ],
  partOf: [{ id: "00000000-0000-4000-8000-000000000002", title: "Series 1" }],
};

/** A Story with nothing on it, which is what `Series 1` itself is until something imports. */
const bare: StoryDetail = {
  id: "00000000-0000-4000-8000-000000000002",
  title: "Series 1",
  runtimeSeconds: null,
  versions: [],
  partOf: [],
};

test("names the Story in its heading", () => {
  render(<StoryPage story={rose} />);

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Rose");
});

// The runtime is the canonical Version's and never the Story's own (ADR-0001), which is why the
// page can state one at all without adjudicating which Version is the real one.
test("states the runtime its canonical Version gives it", () => {
  render(<StoryPage story={rose} />);

  expect(screen.queryByText("45 minutes")).not.toBeNull();
});

test("says so when no Version has been named to give it one", () => {
  render(<StoryPage story={bare} />);

  expect(screen.queryByText("No runtime stated.")).not.toBeNull();
});

/**
 * Each list is asked for by its own name rather than by its position, which is what the
 * `aria-labelledby` on it is for: a reader is told which list they are in, and a test that named
 * neither would pass with the two lists swapped.
 */
const list = (name: string) => within(screen.getByRole("list", { name }));

test("lists what the Story is part of", () => {
  render(<StoryPage story={rose} />);

  expect(list("Part of").getAllByRole("listitem").map((item) => item.textContent)).toEqual([
    "Series 1",
  ]);
});

test("lists the Versions, each with its Medium and its runtime", () => {
  render(<StoryPage story={rose} />);

  expect(list("Versions").getAllByRole("listitem").map((item) => item.textContent)).toEqual([
    "Television, 45 minutes",
  ]);
});

// Half the Media in the enum have no length in time. A Version of one says what it is and stops,
// rather than claiming a runtime of nothing.
test("a Version with no runtime says its Medium alone", () => {
  render(
    <StoryPage
      story={{
        ...rose,
        versions: [
          { id: "00000000-0000-4000-8000-0000000000b2", medium: "prose", runtimeSeconds: null },
        ],
      }}
    />,
  );

  expect(list("Versions").getByRole("listitem").textContent).toBe("Prose");
});

/**
 * Both empty states, and they are worth a test for `front-page.test.tsx`'s reason: this page reads
 * through row-level security, a broken policy returns nothing rather than failing, so "empty" is a
 * state the page will genuinely be in and it has to say something.
 */
test("says so when there is nothing to be part of and no Version", () => {
  render(<StoryPage story={bare} />);

  expect(screen.queryByRole("list")).toBeNull();
  expect(screen.queryByText("Part of nothing else.")).not.toBeNull();
  expect(screen.queryByText("No Version of this Story is recorded.")).not.toBeNull();
});

// The one link the page draws, and the only navigation there is: the front page is where a reader
// came from and the only other place to go.
test("links back to the front page, by name", () => {
  render(<StoryPage story={rose} />);

  expect(screen.getByRole("link", { name: siteName }).getAttribute("href")).toBe("/");
});
