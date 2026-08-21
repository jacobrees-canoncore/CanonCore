import { expect, test } from "@playwright/test";

/**
 * The Sources page, against a deployed URL — **CAN-104 Read a Provider's capability declaration, and
 * refuse what it does not serve**.
 *
 * **What only a deployment can add is that the page is reachable from the footer of every page**,
 * which is the whole of what "surfaced to the owner" means for a fact nobody would go looking for.
 * [`../src/app/no-linkification.test.tsx`](../src/app/no-linkification.test.tsx) proves what the page
 * draws for a Provider that declares nothing; it renders the component directly, so it cannot say
 * that the route resolves or that anything leads to it.
 *
 * **It asserts the empty state, and that is the honest thing to assert today.** No Provider serves
 * the contract yet, so production has no Source to declare anything — and a spec written against a
 * row that does not exist would be a spec that has never run. The declaration itself is exercised
 * against a real PostgreSQL in [`../src/db/rls.test.ts`](../src/db/rls.test.ts).
 */

// A stranger, with no account and nothing kept from a previous visit — `front-page.spec.ts`'s
// reason: a Source belongs to nobody and every reader sees the same ones, so this is the reader
// whose view proves it.
test.use({ storageState: { cookies: [], origins: [] } });

test("the footer leads to the Sources page, and it says what it has", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Sources" }).click();

  await expect(page).toHaveURL(/\/sources$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sources");
  await expect(page.getByText("No Provider has declared a Source yet.")).toBeVisible();
});
