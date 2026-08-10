import { siteName } from "@canoncore/config";
import { expect, test } from "@playwright/test";

// A stranger, with no account and nothing stored from a previous visit. Stated
// rather than assumed, because it is the whole claim this test is making.
test.use({ storageState: { cookies: [], origins: [] } });

test("an anonymous visitor is served the holding page", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(siteName);
  await expect(page.getByText("Being rebuilt.")).toBeVisible();
  await expect(
    page.getByText("This domain is reserved for the new version"),
  ).toBeVisible();
});
