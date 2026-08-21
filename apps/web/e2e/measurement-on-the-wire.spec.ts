import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

/**
 * **What each measurement product is actually handed, read off the wire of a deployed site** —
 * **CAN-147 Verify the analytics redaction and opt-out against a real deployment**.
 *
 * [`../src/analytics/redaction.test.ts`](../src/analytics/redaction.test.ts) proves the redaction as
 * a function, and derives its cases from the routes `src/app` serves so that a route added later
 * cannot leak by being forgotten. **None of that is evidence that Vercel received a redacted
 * address**, because a pure function cannot be asked whether anything left the browser. This file
 * asks the only question that one cannot: given a real page on a real deployment, what is in the
 * body of the request that goes out?
 *
 * It is the same split the repository already insists on for email, where `resend` reports what the
 * provider did and `macos-mail-mcp` reports what the recipient's client did —
 * [`verification-by-inbox.spec.ts`](verification-by-inbox.spec.ts) is the other half of that pair
 * and the model for this one.
 *
 * ## Why one launch flag decides whether this file tests anything at all
 *
 * **Both scripts drop any browser that reports automation, before they read anything else.** The
 * predicate is byte-identical in `/_vercel/insights/script.js` and `/_vercel/speed-insights/script.js`
 * and only its minified binding differs — `t` in the first, `r` in the second — read off the live
 * scripts on 21 August 2026:
 *
 * ```js
 * function t(){return!!(navigator.webdriver||navigator.userAgent.includes("Headless"))}
 * // …
 * if(t())return;   // no queue, no listener, no request — the script simply stops
 * ```
 *
 * A browser it refuses measures **nothing at all**, and a broken redaction and a working one look
 * identical from there: every "the token did not leak" assertion passes because no request was made.
 * That is the trap this file is shaped against, and it is why {@link onlyPageview} fails when there
 * is no pageview rather than returning an empty set to assert over.
 *
 * **The two halves of the guard are cleared by two different things, and only one of them is here.**
 * `--disable-blink-features=AutomationControlled` leaves `navigator.webdriver` false — that flag is
 * what the `playwright` MCP server already launches Chrome with, so it is the sanctioned browser's
 * own configuration rather than one invented for this file. The user-agent half is already clear
 * before this file does anything: `playwright.config.ts` uses `devices["Desktop Chrome"]`, whose
 * user-agent override says `Chrome/151.0.7922.34` where a bare headless Chromium would say
 * `HeadlessChrome`. **So this runs headless like every sibling spec**, and needs no display.
 *
 * Both halves were checked by removing them, on 21 August 2026 against a preview: with the flag all
 * three tests pass, and without it all three fail on {@link onlyPageview} rather than passing on an
 * empty set.
 *
 * ## Where to point it
 *
 * ```bash
 * CANONCORE_E2E_BASE_URL=<preview url> \
 *   pnpm --filter @canoncore/web test:e2e measurement-on-the-wire
 * ```
 *
 * **Without that variable it skips, loudly**, and the reason is below `target`: this file *writes*
 * where its siblings only read, and the suite's default target is production. Production is a
 * legitimate thing to point it at — a page view is what the site is for, which is exactly what makes
 * these valid evidence rather than a simulation — but it has to be chosen rather than defaulted into.
 *
 * ## What it deliberately does not do
 *
 * **It carries an invented token rather than a live one.** The sharpest case the redaction exists
 * for is `/reset-password`, whose query string holds a working one-hour capability over an account,
 * and the redaction cannot tell a live token from an invented one — it drops everything after the
 * path. Minting a real token to assert the same code path would put a working credential in a test
 * file. It was checked once by hand with a live token instead, and `docs/infrastructure.md` →
 * *What the two measurement products were observed doing* records that run.
 */

// The one flag this file cannot run without: its whole subject is a script that refuses an
// automated browser, and the header says which half of that refusal each thing clears.
test.use({
  launchOptions: { args: ["--disable-blink-features=AutomationControlled"] },
  // A stranger, as `front-page.spec.ts`, `story-page.spec.ts` and `signed-out-path.spec.ts` each
  // say it. **It changes nothing mechanically** — Playwright gives every test its own context and
  // `playwright.config.ts` sets no `storageState`, so the objection toggled below cannot outlive a
  // test anyway. It is here to state the starting state, which on the one file that writes to
  // `localStorage` is worth stating.
  storageState: { cookies: [], origins: [] },
});

/** Which deployment this run was pointed at, and the reason the skip below exists. */
const target = process.env.CANONCORE_E2E_BASE_URL;

/**
 * **Opt in by naming the deployment, because every run of this file writes to a real dataset.**
 * Unlike its siblings, which only read, each test here posts a page view and a set of vitals that
 * Vercel keeps — and this suite's default target is production, where the whole dataset is currently
 * a handful of events that `docs/infrastructure.md` → *What the two measurement products were
 * observed doing* cites as evidence. So `pnpm --filter @canoncore/web test:e2e` with no variable set
 * would quietly triple it. Pointing at production deliberately is still allowed; doing it by
 * accident is what this refuses.
 *
 * **Printed as well as skipped**, for `verification-by-inbox.spec.ts`'s reason: the `list` reporter
 * renders a skip as a dash and no reason, so an unset variable would read as a spec that ran.
 */
test.beforeEach(() => {
  const unconfigured =
    "CANONCORE_E2E_BASE_URL is unset, and this suite's default target is production";
  if (!target) console.log(`[measurement-on-the-wire] skipping: ${unconfigured}`);
  test.skip(!target, unconfigured);
});

/** Migration 0002's Story, as `story-page.spec.ts` records it. Its identifier is the thing at risk. */
const storyIdentifier = "00000000-0000-4000-8000-000000000001";
const storyAddress = `/story/${storyIdentifier}`;

/**
 * A Web Analytics pageview, in the shape the live script posts. `o` is the URL it decided to report
 * and `dp` the route beside it — the field that never reaches `beforeSend`, which is why
 * [`../src/analytics/analytics.tsx`](../src/analytics/analytics.tsx) supplies it.
 */
type Pageview = { readonly o: string; readonly dp?: string };

/** One Speed Insights sample. Both `route` and `href` name the page, so both have to be redacted. */
type Vital = { readonly type: string; readonly route: string; readonly href: string };

/** What one page load sent, with the raw bodies kept so an assertion can search the whole of them. */
type Sent = { readonly pageviews: Pageview[]; readonly vitals: Vital[]; readonly bodies: string[] };

/** The body as JSON, or nothing — see {@link watchMeasurement} for why this may not throw. */
function parsedOrNull<Shape>(body: string): Shape | null {
  try {
    return JSON.parse(body) as Shape;
  } catch {
    return null;
  }
}

/**
 * Watch both products for the rest of this page's life.
 *
 * **Two mechanisms rather than one, because the two vendors send differently**: Web Analytics posts
 * JSON through `fetch`, which the request event can read, and Speed Insights posts a body the
 * request event reports as empty — so its request is intercepted and continued instead.
 */
async function watchMeasurement(page: Page): Promise<Sent> {
  const sent: Sent = { pageviews: [], vitals: [], bodies: [] };

  // **Neither handler may throw.** A request listener throws into Playwright's event loop rather
  // than into a test, so a body that will not parse would surface as an unhandled rejection instead
  // of a red assertion. An unreadable body is recorded and left unparsed; the floors below then fail
  // on the count, which is a legible failure.
  page.on("request", (request) => {
    if (!/\/_vercel\/insights\/view$/.test(request.url())) return;
    const body = request.postData() ?? "";
    sent.bodies.push(body);
    const parsed = parsedOrNull<Pageview>(body);
    if (parsed) sent.pageviews.push(parsed);
  });

  await page.route("**/_vercel/speed-insights/vitals*", async (route) => {
    const body = route.request().postDataBuffer()?.toString("utf8") ?? "";
    sent.bodies.push(body);
    sent.vitals.push(...(parsedOrNull<{ metrics?: Vital[] }>(body)?.metrics ?? []));
    await route.continue();
  });

  return sent;
}

/** Forget what has been seen so far, so the next visit is asserted on its own. */
function forget(sent: Sent): void {
  sent.pageviews.length = 0;
  sent.vitals.length = 0;
  sent.bodies.length = 0;
}

/**
 * Load a page and give both products time to report.
 *
 * **The interaction and the hiding are not decoration.** Speed Insights was observed sending nothing
 * until the page was hidden — a bare load plus a four-second wait produced no `vitals` request at
 * all on 21 August 2026, and dispatching the two events below produced one immediately — and an
 * interaction is what finalises the largest contentful paint and gives `INP` a sample. The heading
 * is clicked rather than a coordinate, because a coordinate can land on a link and navigate.
 *
 * **The waits are fixed on purpose, and cannot be event-driven.** Every assertion in this file is
 * about how many requests arrived in a window — one, or none — and "none yet" is indistinguishable
 * from "none ever" except by waiting. Waiting for a request instead would prove the first arrived
 * and nothing about a second.
 */
async function visit(page: Page, address: string): Promise<void> {
  await page.goto(address, { waitUntil: "load" });
  await page.waitForTimeout(1_500);
  await page.getByRole("heading").first().click();
  await page.waitForTimeout(1_000);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("pagehide"));
  });
  await page.waitForTimeout(2_500);
}

/**
 * The one pageview that visit should have produced.
 *
 * **Exactly one, and the failure message names the likely cause**, because zero is the reading this
 * file exists to refuse: a run whose browser the script rejected sends nothing, and every assertion
 * about what a request does not contain would then hold vacuously.
 */
function onlyPageview(sent: Sent): Pageview {
  expect(
    sent.pageviews,
    "no pageview left the browser. If the launch flag in this file's `test.use` has gone, the " +
      "script refused the browser before reading anything — see this file's header — and nothing " +
      "below would have been tested.",
  ).toHaveLength(1);
  return sent.pageviews[0]!;
}

/**
 * The samples that visit should have produced, having refused an empty set for the same reason
 * {@link onlyPageview} does: an assertion over no samples is an assertion about nothing.
 */
function someVitals(sent: Sent): readonly Vital[] {
  expect(sent.vitals, "Speed Insights reported no sample").not.toHaveLength(0);
  return sent.vitals;
}

/**
 * Every measurement body that went out, asserted not to carry `secret` anywhere in it.
 *
 * **The whole body rather than the fields the types above name**, because a field this file does not
 * know about is exactly how something would travel unnoticed.
 */
function nothingCarried(sent: Sent, secret: string): void {
  expect(sent.bodies, "no measurement body to search").not.toHaveLength(0);
  for (const body of sent.bodies) expect(body).not.toContain(secret);
}

test("a Story is reported as its shape, and its identifier never leaves the browser", async ({
  page,
  baseURL,
}) => {
  const sent = await watchMeasurement(page);
  await visit(page, storyAddress);

  const shape = new URL("/story/*", baseURL!).toString();
  expect(onlyPageview(sent)).toMatchObject({ o: shape, dp: "/story/*" });

  // The route surface as well as the URL. Both vendors send the route beside the URL and it never
  // reaches `beforeSend`, which is the finding `../src/analytics/analytics.tsx` records.
  for (const vital of someVitals(sent)) {
    expect(vital, `the ${vital.type} sample`).toMatchObject({ route: "/story/*", href: shape });
  }

  nothingCarried(sent, storyIdentifier);
});

test("nothing after a question mark is reported", async ({ page, baseURL }) => {
  const sent = await watchMeasurement(page);

  // Invented, and unmistakably so — this file's header says why a live token is not used here, and
  // the redaction cannot tell the difference because it drops the query string whole.
  const invented = `an-invented-token-${randomUUID()}-that-must-never-be-reported`;
  await visit(page, `/reset-password?token=${invented}`);

  // The address really did carry it: without this the assertion below could pass on a page that
  // never received the query string in the first place.
  expect(page.url()).toContain(invented);
  expect(onlyPageview(sent)).toMatchObject({
    o: new URL("/reset-password", baseURL!).toString(),
    dp: "/reset-password",
  });

  // Both products, not only the pageview: the `href` Speed Insights sends is built from
  // `location.href` too, so this page is a case for it as much as for Web Analytics.
  for (const vital of someVitals(sent)) {
    expect(vital, `the ${vital.type} sample`).toMatchObject({ route: "/reset-password" });
  }

  nothingCarried(sent, invented);
});

test("the objection stops every event, and withdrawing it starts them again", async ({ page }) => {
  const sent = await watchMeasurement(page);

  await page.goto("/privacy/analytics", { waitUntil: "load" });
  await page.getByRole("button", { name: "Stop counting my visits" }).click();
  await expect(page.getByRole("status")).toHaveText(/not counted/);

  // **This half asserts an absence, and an absence is what a refused browser also produces** — so on
  // its own it would be the vacuous pass this file exists to refuse. What rescues it is the
  // withdrawal below, in the same browser and the same test: if the script had refused this browser,
  // that assertion fails. The two halves are one claim and must not be split into two tests.
  forget(sent);
  await visit(page, storyAddress);
  await visit(page, "/");
  expect(sent.pageviews, "an objection was recorded and pageviews carried on").toHaveLength(0);
  expect(sent.vitals, "an objection was recorded and vitals carried on").toHaveLength(0);

  await page.goto("/privacy/analytics", { waitUntil: "load" });
  await page.getByRole("button", { name: "Count my visits" }).click();
  await expect(page.getByRole("status")).toHaveText(/are counted/);

  forget(sent);
  await visit(page, storyAddress);
  // The withdrawal is the half a `localStorage` read cannot prove: measuring has to resume, or the
  // control is an off switch rather than an objection.
  expect(onlyPageview(sent)).toMatchObject({ dp: "/story/*" });
  expect(someVitals(sent).length, "vitals did not resume with the objection withdrawn")
    .toBeGreaterThan(0);
});
