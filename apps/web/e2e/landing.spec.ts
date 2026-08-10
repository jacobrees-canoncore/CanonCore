import { expect, test } from "@playwright/test";

/**
 * The expected strings are written out rather than imported from `@canoncore/config`,
 * so that changing the constant fails this test instead of moving with it.
 */
test("an anonymous visitor gets the landing page", async ({ page }) => {
  // Every Playwright test starts in a fresh browser context with no cookies and no
  // stored credentials, so the visitor here is anonymous by construction.
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("CanonCore");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("CanonCore");
  await expect(page.getByText("Being rebuilt.")).toBeVisible();
});
