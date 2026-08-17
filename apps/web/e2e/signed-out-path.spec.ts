import { expect, test } from "@playwright/test";

/**
 * The signed-out half of **CAN-24 A signed-in and a signed-out path**, against a deployed URL.
 *
 * ## Why this suite stops where it does
 *
 * **It does not sign anybody up.** These specs run against a *deployed* environment — production
 * without `CANONCORE_E2E_BASE_URL`, and `docs/agents/workflow.md` → *After the merge* keeps that in
 * scope — so a spec that created an account would create one in production's database, on a service
 * whose URL is deliberately not shared and whose accounts nobody has agreed to hold. There is no
 * erasure route yet either: that is **CAN-30 GDPR export and erasure**.
 *
 * **The signed-in path is proved elsewhere, and more strictly.**
 * [`../src/db/rls.test.ts`](../src/db/rls.test.ts) signs up, signs in and signs out through the
 * real route against a real PostgreSQL, and reads the database afterwards — which is more than a
 * browser can see. What only a deployment can add is that the pages *exist* at their addresses,
 * that they are reachable with no account, and that the two things ADR-0010 and ADR-0005 rule 3
 * rest on are true of a real response: the cookie's scope, and the session context surviving Neon's
 * pooler.
 */

// A stranger, with no account and nothing kept from a previous visit. Stated rather than assumed,
// because it is the whole claim these specs make.
test.use({ storageState: { cookies: [], origins: [] } });

test("an anonymous visitor is offered a way in from the front page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("link", { name: "create an account" })).toBeVisible();
  // Signed out, so there must be no way to sign out. A rendered sign-out button here would mean the
  // page had decided somebody was signed in when nobody was.
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
});

test.describe("the two forms a visitor with no account can reach", () => {
  test("the sign-in page renders its form, signed out", async ({ page }) => {
    const response = await page.goto("/sign-in");

    expect(response?.status()).toBe(200);
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("the sign-up page renders its form, signed out", async ({ page }) => {
    const response = await page.goto("/sign-up");

    expect(response?.status()).toBe(200);
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  });

  test("each form offers the other", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("link", { name: "Create one" }).click();
    await expect(page).toHaveURL(/\/sign-up$/);

    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
  });
});

/**
 * **The refusal path, driven with a password nobody holds.**
 *
 * This is the one place a deployed run posts to `/api/auth`, and it is safe to: a failed sign-in
 * creates nothing. What it proves is the whole of the redirect design against a real deployment —
 * that a plain form post is accepted, answered with a `303` rather than JSON, and that the reader
 * lands on a page carrying a sentence of ours rather than better-auth's.
 *
 * The email is at `.invalid`, reserved by [RFC 2606](https://www.rfc-editor.org/rfc/rfc2606) so it
 * cannot be anybody's address.
 */
test("a failed sign-in comes back as a page, with a sentence of our own", async ({ page }) => {
  await page.goto("/sign-in");

  await page.getByLabel("Email address").fill("nobody@can-24.invalid");
  await page.getByLabel("Password").fill("not-a-password-anybody-holds");
  await page.getByRole("button", { name: "Sign in" }).click();

  // A page, not a JSON body: the redirect in `../src/app/api/auth/[...all]/route.ts` is what makes
  // a form usable without JavaScript, and it is invisible to every test that calls `auth.api`
  // directly.
  await expect(page).toHaveURL(/\/sign-in\?error=INVALID_EMAIL_OR_PASSWORD$/);
  await expect(page.getByRole("alert")).toHaveText(
    "That email address and password do not match an account.",
  );
});

/**
 * **The cookie's scope, read off a real response**, which is the one assertion only a deployment
 * can make: [ADR-0010](../../../docs/adr/0010-canonical-host-www.md) chose `www` as canonical *so
 * that* the session cookie stays host-only, and a `Domain` attribute is what most better-auth
 * examples suggest adding. A unit test sees what the library was configured to do; this sees what
 * the browser was actually sent, past the CDN.
 *
 * Read from the failed sign-in above rather than from a successful one, because better-auth sets
 * its CSRF cookie on both — so no account is needed to see the attributes.
 */
test("no auth cookie is scoped wider than the host that set it", async ({ page, context }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("nobody@can-24.invalid");
  await page.getByLabel("Password").fill("not-a-password-anybody-holds");
  await page.getByRole("button", { name: "Sign in" }).click();

  const host = new URL(page.url()).hostname;
  const authCookies = (await context.cookies()).filter((cookie) =>
    cookie.name.startsWith("better-auth."),
  );

  expect(authCookies.length).toBeGreaterThan(0);
  for (const cookie of authCookies) {
    // Playwright reports a host-only cookie's domain as the host itself; a `Domain=` attribute
    // becomes a leading dot. The leading dot is the thing ADR-0010 exists to keep out.
    expect(cookie.domain).toBe(host);
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.secure).toBe(true);
  }
});
