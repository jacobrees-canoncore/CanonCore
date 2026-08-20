import { randomUUID } from "node:crypto";
import { mailReceivingDomain, productionUrl } from "@canoncore/config";
import { expect, test } from "@playwright/test";

/**
 * **The whole of email verification, against a real inbox, run by hand against a preview.**
 *
 * This is the one claim nothing else in this repository can make: that a message *this application
 * composed* left through the real provider, arrived somewhere intact, and that the link inside it
 * works. [`../src/db/rls.test.ts`](../src/db/rls.test.ts) drives both flows against a real
 * PostgreSQL with `fetch` stubbed, which is a better seam for everything except the one thing a stub
 * cannot do — leave the process.
 *
 * **It closes the bound [`account-recovery.spec.ts`](account-recovery.spec.ts) records**, and only
 * half of that bound had expired. *Resend has no mailbox to poll* is false: receiving has been on at
 * `mail.canoncore.com` since 10 August 2026 and it is a catch-all, so every address at it is a
 * mailbox with nothing to provision. The other half — that the guard in
 * [`../src/mail/send.ts`](../src/mail/send.ts) refuses a non-`resend.dev` recipient on a preview —
 * was changed deliberately rather than routed around: that guard now admits `@mail.canoncore.com`
 * too, for its own reason, and `send.ts` → `allowedOutsideProduction` carries the argument.
 *
 * ## Why this is not on any gate, and must not be put on one
 *
 * **Reading inbound mail needs a `full_access` Resend key**, which is the permission that can also
 * delete the sending domain and mint further keys — there is no narrower scope
 * ([Create API key](https://resend.com/docs/api-reference/api-keys/create-api-key)). Both keys a
 * *deployment* carries are deliberately `sending_access`, so a run of this spec needs a credential
 * strictly more powerful than anything in the environment it drives. `docs/infrastructure.md` →
 * *Reading the inbox* says where that key may live, and a GitHub Actions secret is not it.
 *
 * **And a run spends two of the hundred a day, not one**: "both sent and received emails count
 * towards these quotas" ([Usage Limits](https://resend.com/docs/api-reference/rate-limit)).
 *
 * The Playwright suite is off the four-command gate anyway
 * ([ADR-0017](../../../docs/adr/0017-testing-stack.md)), and `docs/research/email-testing-inboxes.md`
 * → *CI* is the argument for keeping this particular spec off any future one.
 *
 * ## How to run it
 *
 * ```bash
 * CANONCORE_E2E_BASE_URL=<preview url> \
 * CANONCORE_E2E_RESEND_API_KEY=<a full_access Resend key> \
 *   pnpm --filter @canoncore/web test:e2e verification-by-inbox
 * ```
 *
 * **A `next dev` server works too, and is the cheaper way to exercise this file.** The guard admits
 * our own domain from *every* environment that is not production, so `http://localhost:3000` sends
 * real mail through the real provider and the message is read back the same way. What that route
 * cannot prove is the environment: no Vercel routing, no CDN, no `*.vercel.app` host, and the
 * database is whatever the dev server was pointed at rather than the shared `preview` branch.
 * `docs/infrastructure.md` → *The spec that reads it* carries both commands.
 *
 * **First run, 20 August 2026, against a local dev server: passed in 6.2 seconds.** The account it
 * created came back `email_verified = true` with one session row, so the link genuinely verified the
 * address and the sign-in genuinely issued a session. Not yet run against a preview.
 *
 * **Without either variable it skips, loudly**, with the reason on the run — because the suite's
 * default target is production, where a sign-up would create an account nobody can erase until
 * **CAN-30 GDPR export and erasure**. That is the bound both sibling specs record, and the reason
 * this one needs a preview rather than merely preferring one: a preview reads the shared schema-only
 * `preview` Neon branch, which holds no production row
 * ([ADR-0023](../../../docs/adr/0023-one-shared-schema-only-preview-branch.md)).
 *
 * **What it leaves behind, on purpose.** One account per run in the preview branch's `user` table,
 * and two messages in Resend's log. Neither is worth a cleanup step: the preview branch holds no
 * production row and is reset from schema rather than tidied, and deleting the message would need the
 * same `full_access` key to destroy the only evidence the run produced.
 *
 * **How long Resend keeps it is not a number to rely on.** The pricing page states one 30-day
 * retention figure and does not distinguish sent from received, and
 * `docs/research/email-testing-inboxes.md` → *Unverified* records that the received half was never
 * established — a message received on 10 August was still readable on 18 August, which is consistent
 * with 30 days and does not prove it. Nothing here turns on the answer.
 *
 * **What it does not prove: anything about Gmail.** Resend inbound accepts everything addressed to
 * the domain and has no spam folder, so arriving there is arrival and intactness and nothing about
 * where a real receiver would file it. Inbox providers "do not share any information on how the
 * messages are later filtered"
 * ([Resend](https://resend.com/docs/knowledge-base/what-if-an-email-says-delivered-but-the-recipient-has-not-received-it)),
 * and `docs/research/email-testing-inboxes.md` → *Deliverability is a second question* holds what
 * would answer it instead.
 */

/** Resend's receiving API. Reading it is what needs the larger key. */
const inbound = "https://api.resend.com/emails/receiving";

/** The key that may read inbound mail, from the runner rather than from any deployment. */
const readingKey = process.env.CANONCORE_E2E_RESEND_API_KEY;

/** What the skip below reads, rather than `baseURL` — which falls back to production when it is unset. */
const preview = process.env.CANONCORE_E2E_BASE_URL;

/**
 * The hosts that serve **production**, which this spec must never sign up on.
 *
 * `www.canoncore.com` and the apex are the documented pair, and `canoncore.vercel.app` is the third:
 * a production deployment is served there too (`../src/auth/auth.ts` →
 * `hostsAllowedToIssueSessions`, which records it because that is what an earlier version of the
 * allowlist got wrong), so a base URL of that name reaches production's database under a name that
 * does not say so.
 *
 * **What this cannot catch, stated rather than left to be discovered.** A production deployment also
 * has a `canoncore-<hash>-<scope>.vercel.app` URL, and a preview's looks exactly the same — nothing
 * in the name distinguishes them, and the deployment publishes no environment of its own
 * (`../src/app/api/health/route.ts` says why that route deliberately has nowhere to put one). So the
 * operator passing the URL is the last check on which environment this drives, and that is why it is
 * passed explicitly rather than defaulted.
 */
function servesProduction(url: string): boolean {
  const { host } = new URL(url);
  return [new URL(productionUrl).host, "canoncore.com", "canoncore.vercel.app"].includes(host);
}

/** A stranger, as in both sibling specs: no account, and nothing kept from a previous visit. */
test.use({ storageState: { cookies: [], origins: [] } });

/** Metadata for one received message. The fields this spec reads, from Resend's own schema. */
type Inbound = { readonly id: string; readonly to: readonly string[] };

/**
 * The id of the message addressed to `address`, or nothing yet.
 *
 * **One page of a hundred, and no pagination.** The list has no filter by recipient, so a caller
 * matches `to` itself. What makes one page enough is the volume rather than the order: this account
 * has received **three** messages in its whole life, two of them DMARC reports, against a `limit`
 * capped at 100 (`docs/research/email-testing-inboxes.md` → *The reading surface*).
 *
 * **The order is newest-first, and that is measured rather than promised** — against the live account
 * on 18 and 20 August 2026; Resend's OpenAPI specification carries no ordering field, only `before`,
 * `after` and `has_more`, so nothing documents it. Nothing here rests on it today, at three messages
 * ever, and it is what would keep this working if the volume grew. It is recorded as unverified in
 * that document, and `has_more` is the signal to add a cursor if the volume ever makes it matter.
 */
async function inboundTo(address: string): Promise<string | undefined> {
  const response = await fetch(`${inbound}?limit=100`, {
    headers: { authorization: `Bearer ${readingKey ?? ""}` },
  });
  if (!response.ok) {
    throw new Error(
      `Resend refused the inbound list with ${response.status}. A sending_access key cannot read ` +
        "it, which is the likely cause: CANONCORE_E2E_RESEND_API_KEY has to be full_access. " +
        "docs/infrastructure.md -> Reading the inbox.",
    );
  }
  const { data } = (await response.json()) as { data: readonly Inbound[] };
  return data.find((message) => message.to.some((one) => one.toLowerCase() === address))?.id;
}

/**
 * The verification link out of a received message's plain text.
 *
 * **`\S+` is exact here rather than lucky**: `../src/mail/messages.ts` puts the URL alone in its own
 * paragraph, so nothing but whitespace bounds it and no trailing punctuation can be swallowed. The
 * path is better-auth's own `/api/auth/verify-email`, which
 * `../src/app/api/auth/[...all]/route.ts` mounts a `GET` for precisely so that a link in a mailbox
 * resolves.
 *
 * **`https?` rather than `https`, and that is not laxity.** A preview is always HTTPS, so an
 * `https`-only pattern passes there and fails against a `next dev` server on `http://localhost` —
 * which is a real way to exercise this file, since the guard admits our own domain from *any*
 * environment that is not production. It cost a run to find out. Nothing is loosened by it either:
 * the origin assertion in the test below pins the whole origin, scheme included, to the one this run
 * was pointed at.
 */
async function verificationLinkIn(id: string): Promise<string> {
  const response = await fetch(`${inbound}/${id}`, {
    headers: { authorization: `Bearer ${readingKey ?? ""}` },
  });
  expect(response.ok, `Resend refused message ${id} with ${response.status}`).toBe(true);
  const { text } = (await response.json()) as { text?: string };
  const link = text?.match(/https?:\/\/\S+\/api\/auth\/verify-email\?\S+/)?.[0];
  expect(link, `the received message carries no verification link. Its text was: ${text}`)
    .toBeDefined();
  return link!;
}

/**
 * Poll for the message. **The round trip was measured at 2.4 seconds**, send to receipt, so this
 * usually returns on the second look — and the generous ceiling is there because the failure this
 * has to distinguish is *mail that never arrived* from *mail that was slow*, and only waiting can.
 */
async function waitForTheMessage(address: string): Promise<string> {
  const deadline = Date.now() + 90_000;
  for (;;) {
    const id = await inboundTo(address);
    if (id) return id;
    if (Date.now() > deadline) {
      throw new Error(
        `No message reached ${address} within 90 seconds. The round trip measures 2.4 seconds, so ` +
          "this is an absence rather than a delay: check Resend's send log for a refusal, and that " +
          "the deployment carries a RESEND_API_KEY that authenticates.",
      );
    }
    await new Promise((wait) => setTimeout(wait, 2_000));
  }
}

/**
 * **One test rather than several, because each step consumes the one before it** — there is no
 * verification link without a sign-up and no sign-in without the link — and splitting it would spend
 * two more quota units per run to re-establish the same state.
 */
test("a sign-up's verification email arrives, and its link makes the account usable", async ({
  page,
  baseURL,
}) => {
  // **Printed as well as skipped, because a skip is otherwise silent.** The `list` reporter renders a
  // skipped test as a dash and no reason, so on the one spec in the suite that needs configuring, a
  // skip would read as a spec that ran.
  const unconfigured = !readingKey
    ? "CANONCORE_E2E_RESEND_API_KEY is unset, so no key may read inbound mail"
    : !preview
      ? "CANONCORE_E2E_BASE_URL is unset, and this suite's default target is production"
      : undefined;
  if (unconfigured) console.log(`[verification-by-inbox] skipping: ${unconfigured}`);
  test.skip(unconfigured !== undefined, unconfigured ?? "");
  // A failure rather than a skip, because a skip would read as "not configured" when what happened
  // is that a spec which creates an account was pointed at the environment holding real ones.
  //
  // **Asked of `baseURL` rather than of the variable**, though past the skip above they are the same
  // string: `playwright.config.ts` resolves one from the other, and `baseURL` is what every navigation
  // below actually uses. Checking the variable would be checking a value nothing here reads.
  expect(
    servesProduction(baseURL!),
    "refusing to sign up on production: pass a preview's URL, and see this file's header",
  ).toBe(false);

  // Longer than Playwright's 30-second default, because most of it is spent waiting on mail rather
  // than on the browser.
  test.setTimeout(180_000);

  /**
   * A fresh mailbox per run, and a prefix so the received list stays legible beside the DMARC reports.
   * Nothing provisions it, because the domain is a catch-all — `../src/mail/send.ts` →
   * `allowedOutsideProduction` is why that is what makes addressing it safe at all.
   */
  const address = `e2e-${randomUUID().slice(0, 8)}@${mailReceivingDomain}`;
  // Generated rather than written down, so that a legible run does not also publish a working
  // password for an account on an open preview. It is thrown away with the run.
  const password = `an-e2e-password-${randomUUID()}`;
  console.log(`[verification-by-inbox] signing up as ${address} on ${baseURL}`);

  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("An end-to-end run");
  await page.getByLabel("Email address").fill(address);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  // Not the front page: signing up does not sign anybody in — `../src/auth/auth.ts` → `autoSignIn`.
  await expect(page).toHaveURL(/\/sign-in\?created$/);

  const link = await verificationLinkIn(await waitForTheMessage(address));

  // **The link's own origin is the deployment under test**, which is what proves the message came
  // from this preview rather than from an earlier run somewhere else: better-auth resolves it from
  // the request's host against `hostsAllowedToIssueSessions`, so a link pointing anywhere else would
  // mean the message being read is not the one this sign-up provoked.
  //
  // **And it catches one real failure rather than only a mix-up.** A preview reached at a host that is
  // not `*.vercel.app` misses that allowlist, and better-auth then resolves `baseURL` to its
  // `fallback` — the production URL — so the emailed link would point at production while everything
  // on the page still looked right.
  expect(new URL(link).origin).toBe(new URL(baseURL!).origin);

  await page.goto(link);

  // `/sign-in`, not the front page: verifying proves control of an address and grants nothing else —
  // `../src/auth/auth.ts` → `autoSignInAfterVerification`.
  await expect(page).toHaveURL(/\/sign-in\?verified$/);

  await page.getByLabel("Email address").fill(address);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  // The whole claim, in one place: the account created by that sign-up is now usable, and it became
  // usable because a link that arrived by email was followed. Before the link it could not sign in
  // at all — `../src/auth/auth.ts` → `requireEmailVerification`.
  await expect(page).toHaveURL(new URL("/", baseURL!).toString());
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(page.getByText(address)).toBeVisible();
});
