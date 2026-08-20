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
 * - **There was no inbox to read, and now there is one — for verification only, and not from here.**
 *   Both flows turn on a link that arrives by email. Resend does have a mailbox to poll: receiving on
 *   `mail.canoncore.com` is a catch-all, and the guard in
 *   [`../src/mail/send.ts`](../src/mail/send.ts) admits it since **CAN-140 Verify a real send against
 *   our own inbox, not a personal mailbox** — deliberately widened rather than routed around.
 *   [`verification-by-inbox.spec.ts`](verification-by-inbox.spec.ts) is what reads it, and it is a
 *   separate file because it must never run against this suite's default target: it signs up. What
 *   stays out of reach *here* is the reset flow, for the bullet below rather than for want of an
 *   inbox.
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
 * **This suite deliberately submits nothing, and that is a fourth bound worth writing down.**
 *
 * A draft of it posted to `/api/auth/request-password-reset` with an address at `.invalid` — which
 * sends no mail, because no account holds it and better-auth returns early. It was dropped anyway, for
 * two reasons that are properties of *this* endpoint rather than of posting in general:
 *
 * - **It is rate limited at three per ten minutes per caller** (`../src/auth/auth.ts` → `rateLimit`),
 *   so a fourth run of this suite inside ten minutes would fail on the limiter rather than on
 *   anything about the service. The failed sign-in in `signed-out-path.spec.ts` does post, and gets
 *   away with it because its window is ten *seconds*.
 * - **The claim is already proved, and proved better.** That an unknown address gets the same answer
 *   as a known one is asserted in [`../src/db/rls.test.ts`](../src/db/rls.test.ts), which can check
 *   the thing a browser cannot: that no email was sent at all.
 *
 * So what is left here is what a deployment alone can add, and nothing that writes.
 */
