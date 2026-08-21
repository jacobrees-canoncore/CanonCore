import { siteName } from "@canoncore/config";
import { expect, test } from "@playwright/test";

// A stranger, with no account and nothing stored from a previous visit. Stated
// rather than assumed, because it is the whole claim this test is making.
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * The public Stories the migrations insert — 0002 the first, 0012 the one it is part of. Named here
 * rather than read from anywhere: this suite drives a deployed URL and has no database connection to
 * ask. They are listed by title, which is the order `readVisibleStories` asks for.
 */
const publicStories = ["Rose", "Series 1"];

test("an anonymous visitor is served the front page", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(siteName);
  await expect(page.getByText("Being rebuilt.")).toBeVisible();
  await expect(
    page.getByText("This domain is reserved for the new version"),
  ).toBeVisible();
});

// The end of the walking skeleton: a row in Neon, read by the application role inside a
// transaction that set the anonymous session user, filtered by a policy in the database, and
// rendered to somebody with no account. A 200 alone would not have shown any of that — the page
// renders whether the query returns rows or not, which is the point of ADR-0005 rule 2.
test("the public Stories reach an anonymous visitor", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("listitem")).toHaveText(publicStories);
});
