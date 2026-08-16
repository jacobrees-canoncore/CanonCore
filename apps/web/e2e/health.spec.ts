import { expect, test } from "@playwright/test";

/**
 * The request UptimeRobot sends, sent the way it sends it. The route exports no `HEAD` and Next's
 * own guide says that answers 405 — `route.ts` has why it does not, and this is that decided
 * against a deployment rather than against a reading.
 */
test("the uptime monitor's HEAD request is answered", async ({ request }) => {
  const response = await request.head("/api/health");

  expect(response.status()).toBe(200);
});

// A healthy site answering anything but 200 here is a phone call at 3am, for the reason `route.ts`
// gives: to this monitor the status code is the alert.
test("a healthy site answers 200, and says nothing else", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(await response.text()).toBe("");
  expect(response.headers()["cache-control"]).toContain("no-store");
});
