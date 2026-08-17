import { expect, test } from "@playwright/test";

/**
 * The two pages **CAN-31 Email verification and password reset** adds, against a deployed URL.
 *
 * ## Why this suite stops where it does, which is earlier than the ticket's own criterion
 *
 * **It drives neither flow.** The end-to-end test the ticket asks for is in
 * [`../src/db/rls.test.ts`](../src/db/rls.test.ts), which runs both of them through the same route
 * handlers a browser reaches, against a real PostgreSQL, with one `fetch` stubbed. Three things put
 * them out of reach from here and each is a property of the environment rather than an omission:
 *
 * - **These specs run against a deployed environment** — production without
 *   `CANONCORE_E2E_BASE_URL` — so a spec that created an account would create one in production's
 *   database, on a service whose URL is deliberately not shared. `signed-out-path.spec.ts` records
 *   that bound and its reason; **CAN-30 GDPR export and erasure** is what would make such an account
 *   disposable.
 * - **There is no inbox to read.** Both flows turn on a link that arrives by email. Resend has no
 *   mailbox to poll, and on a preview the guard in [`../src/mail/send.ts`](../src/mail/send.ts)
 *   refuses every recipient that is not at `resend.dev` — which is the guard working, not an
 *   obstacle to route around.
 * - **A reset link is a one-hour capability over a real account.** Even given an inbox, driving the
 *   reset flow against production would mean changing a real password.
 *
 * **So what only a deployment can add is what is here**: that the two pages exist at their addresses,
 * that they are reachable with no account, that the navigation between them and the sign-in page is
 * whole, and that the reset page behaves correctly when reached *without* a token — which is exactly
 * how a stranger reaches it, and the one case a person typing the URL will hit.
 */

// A stranger, with no account and nothing kept from a previous visit. Stated rather than assumed,
// because it is the whole claim these specs make.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("the two pages a person who cannot get in can reach", () => {
  test("the forgot-password page renders its form, signed out", async ({ page }) => {
    const response = await page.goto("/forgot-password");

    expect(response?.status()).toBe(200);
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send the link" })).toBeVisible();
    // No password here: the new one is chosen on the other page, behind the link. A password field
    // on this page would be a credential collected before anything had been proved.
    await expect(page.getByLabel("Password")).toHaveCount(0);
  });

  /**
   * **Reached with no token, which is how a stranger reaches it.**
   *
   * There is deliberately no form in that state: one would post a password with no token, be refused,
   * and land back here — a loop that reads as a broken service rather than as a missing link. So the
   * page says what is needed and offers the way to get it.
   */
  test("the reset page asks for the link rather than offering a form nothing is behind", async ({
    page,
  }) => {
    const response = await page.goto("/reset-password");

    expect(response?.status()).toBe(200);
    await expect(page.getByText(/needs the link from the email/)).toBeVisible();
    await expect(page.getByLabel("Password")).toHaveCount(0);
    await expect(page.getByRole("button")).toHaveCount(0);
  });
});

/**
 * **The way in, from the page a person is on when they discover they cannot get in.**
 *
 * Until this ticket the sign-in page carried no such link, deliberately: there was no mail provider,
 * so the offer could not have been kept. This is the assertion that it now can be — and it is the one
 * step of either flow that needs no email at all.
 */
test("sign-in offers the reset flow, and the way back is whole", async ({ page }) => {
  await page.goto("/sign-in");

  await page.getByRole("link", { name: "Forgotten your password?" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);

  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});

/**
 * **Asking for a link answers the same way whether or not that address has an account**, which is this
 * flow's enumeration protection and the one part of it a deployed run can prove.
 *
 * It is safe to post to `/api/auth` from here for `signed-out-path.spec.ts`'s reason turned around: the
 * address is at `.invalid`, reserved by [RFC 2606](https://www.rfc-editor.org/rfc/rfc2606) so it cannot
 * be anybody's, and no account holds it — so better-auth's own code path sends nothing at all. What is
 * exercised is the answer, not a send.
 *
 * **This does spend one request against the reset endpoint's rate limit** (three per ten minutes per
 * caller), which is worth knowing if this spec is ever run repeatedly against one deployment.
 */
test("asking for a link reveals nothing about whether the address has an account", async ({
  page,
}) => {
  await page.goto("/forgot-password");

  await page.getByLabel("Email address").fill("nobody@can-31.invalid");
  await page.getByRole("button", { name: "Send the link" }).click();

  // A page, not a JSON body, and the notice is conditional: "if that email address has an account".
  // A notice claiming a link had been sent would answer, to anybody who asked, which addresses have
  // accounts here.
  await expect(page).toHaveURL(/\/forgot-password\?sent$/);
  const notice = page.getByRole("status");
  await expect(notice).toContainText("If that email address has an account");
  await expect(notice).not.toContainText("We have sent");
});
