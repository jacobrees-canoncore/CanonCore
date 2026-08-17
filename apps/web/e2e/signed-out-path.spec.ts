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
 * **There is deliberately no cookie-scope assertion here, and the gap is worth recording.**
 *
 * A previous version of this file asserted that no `better-auth.*` cookie carried a `Domain`, which is
 * [ADR-0010](../../../docs/adr/0010-canonical-host-www.md)'s reason for `www` being canonical. It rested
 * on the premise that better-auth sets a CSRF cookie on a failed sign-in, so no account would be needed
 * to read the attributes. **That premise is false**, checked against a running server rather than read:
 * a failed sign-in returns `303` and **no `Set-Cookie` at all**, and a successful one returns exactly
 * one, `better-auth.session_token`. better-auth 1.6.29 has no CSRF cookie — its CSRF protection is
 * origin-checking middleware — and every cookie it sets comes from `setSessionCookie`, which sign-in
 * reaches only after the password verifies.
 *
 * So the assertion could not have passed, and Playwright is off the gate, so nothing would have said so.
 * **It is asserted in [`../src/db/rls.test.ts`](../src/db/rls.test.ts) instead**, on the `Set-Cookie`
 * header of a real successful sign-in against a real PostgreSQL, which is where an account can exist.
 *
 * **What is genuinely out of reach from here is the deployed half** — the attributes as a browser
 * receives them, past the CDN — because seeing them needs a signed-in session and this suite runs
 * against production by default. Buying it would mean creating an account in production, which is what
 * the header of this file refuses. CAN-30 GDPR export and erasure is what would make such an account
 * disposable, and until then this is a recorded gap rather than a hidden one.
 */
