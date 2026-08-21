import { expect, test } from "@playwright/test";

/**
 * The public Story page, against a deployed URL — **CAN-25 The catalogue: Version, part of, Anchor,
 * canonical version**.
 *
 * What only a deployment can add is what the unit tests cannot see: that the address resolves at
 * all, that a reader with no account is served it, and that the three tables behind it are read
 * inside one request through the policies rather than by a role that bypasses them.
 * [`../src/db/rls.test.ts`](../src/db/rls.test.ts) is where the query itself is proved, against a
 * real PostgreSQL and a real reader.
 *
 * **The address is a uuid this repository writes down**, because nothing on the front page links
 * here: an `href` built from a row's id is the one change
 * `docs/compliance/illegal-content-risk-assessment.md` → *Step 4* says must not ship without the
 * assessment being redone, and this page is reached by its address instead.
 */

// A stranger, with no account and nothing kept from a previous visit — `front-page.spec.ts`'s
// reason: it is the whole claim this spec makes.
test.use({ storageState: { cookies: [], origins: [] } });

/** Migration 0002's Story, and migration 0012's Version of it and Story it is part of. */
const foundingStory = {
  address: "/story/00000000-0000-4000-8000-000000000001",
  title: "Rose",
  runtime: "45 minutes",
  partOf: "Series 1",
  version: "Television, 45 minutes",
};

test("an anonymous visitor is served a public Story, whole", async ({ page }) => {
  const response = await page.goto(foundingStory.address);

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(foundingStory.title);
  // The runtime is the canonical Version's, which is the only place a runtime lives (ADR-0001).
  await expect(page.getByText(foundingStory.runtime, { exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Part of" }).getByRole("listitem")).toHaveText([
    foundingStory.partOf,
  ]);
  await expect(page.getByRole("list", { name: "Versions" }).getByRole("listitem")).toHaveText([
    foundingStory.version,
  ]);
});

// The Story the founding one is part of, which has no Version and nothing above it. Both empty
// states are on a real page rather than only in a render test, because "empty" is what a broken
// policy produces and this is the deployment where that would happen.
test("a Story with nothing on it says so rather than rendering a bare heading", async ({ page }) => {
  await page.goto("/story/00000000-0000-4000-8000-000000000002");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Series 1");
  await expect(page.getByText("Part of nothing else.")).toBeVisible();
  await expect(page.getByText("No Version of this Story is recorded.")).toBeVisible();
});

/**
 * An address in the right shape that names nothing, and one that is not a uuid at all. Both are
 * 404s, and so is a Story the reader may not see — which is the point: a private Story of somebody
 * else's must not be distinguishable from one that was never there.
 */
test("an address that names no Story anybody may read is a 404", async ({ page }) => {
  const missing = await page.goto("/story/00000000-0000-4000-8000-00000000ffff");
  expect(missing?.status()).toBe(404);

  const malformed = await page.goto("/story/not-a-uuid");
  expect(malformed?.status()).toBe(404);
});
