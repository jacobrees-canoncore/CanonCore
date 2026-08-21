import { reportingAddress } from "@canoncore/config";
import { expect, test } from "@playwright/test";

/**
 * The shell, against a deployed URL — **CAN-89 Give the product a visual identity and a reading
 * surface**.
 *
 * **What only a deployment can add is that the root layout actually wraps every route.**
 * [`../src/app/site-shell.test.tsx`](../src/app/site-shell.test.tsx) proves the shell draws what it
 * should when it is rendered; it cannot prove that Next.js renders it around a page, because it
 * renders the component directly. The claim
 * `docs/compliance/code-measures-register.md` records for ICU D2 is about *every page*, so it is
 * asserted on more than one.
 */

// A stranger, with no account and nothing kept from a previous visit — `front-page.spec.ts`'s
// reason: it is the whole claim this spec makes.
test.use({ storageState: { cookies: [], origins: [] } });

/** One of each kind of route: reaches the database, prerendered static, and rendered per request. */
const everyPage = ["/", "/privacy/analytics", "/sign-in"];

test.describe("the reporting route is in the footer of every page", () => {
  for (const path of everyPage) {
    test(path, async ({ page }) => {
      await page.goto(path);

      const report = page.getByRole("contentinfo").getByRole("link", { name: "Report content" });
      await expect(report).toHaveAttribute("href", `mailto:${reportingAddress}`);
    });
  }
});

// WCAG 2.4.1 Bypass Blocks, end to end: the link is the first thing a keyboard reaches, it is
// visible once it has focus — it is off-screen until then — and it puts focus on the content.
test("the skip link is the first tab stop and moves focus to the content", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to the content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();

  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});
