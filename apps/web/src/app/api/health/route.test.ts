// @vitest-environment node
//
// The mapping from what the check found to what the monitor sees. `health.test.ts` proves which
// answer each failure produces; this file proves what each answer costs, which is the half that
// decides whether a phone rings and which runbook entry it rings about.
//
// The check is mocked because the point here is the three codes, and the real one needs a
// PostgreSQL to reach any of them: `rls.test.ts` is what asks it against one, and
// `e2e/health.spec.ts` asserts the healthy answer against a deployment.
import { expect, test, vi } from "vitest";
import type { Health } from "@/db/health";
import { GET } from "./route";

// Hoisted, because `vi.mock` runs before the import above and would otherwise close over nothing.
const checkHealth = vi.hoisted(() => vi.fn());
vi.mock("@/db/health", () => ({ checkHealth }));

const answered = async (health: Health) => {
  checkHealth.mockResolvedValue(health);
  return GET();
};

test("a healthy site is a 200", async () => {
  expect((await answered("healthy")).status).toBe(200);
});

// The failure CAN-151 Watch the Story route, where a broken policy serves 200 with nothing in it
// exists to make visible. It has to be an erroneous status or the monitor reports the site up,
// which is the whole gap: a broken policy is silent everywhere else.
test("a Story that does not come back is a 500", async () => {
  expect((await answered("story-unreadable")).status).toBe(500);
});

// Distinct from the 500 on purpose. Both page the phone; the code is what says which entry in
// docs/runbook.md the person who was woken should open.
test("a database that does not answer is a 503", async () => {
  expect((await answered("database-silent")).status).toBe(503);
});

// Same argument for all three: a monitor sending HEAD never reads a body, and a route with
// somewhere to put detail is one that accumulates it.
test.each(["healthy", "story-unreadable", "database-silent"] as const)(
  "says nothing but its status when %s",
  async (health) => {
    expect(await (await answered(health)).text()).toBe("");
  },
);

// A cached answer is an answer about the past, and the question is about now.
test("refuses to be cached", async () => {
  expect((await answered("healthy")).headers.get("Cache-Control")).toBe("no-store");
});
