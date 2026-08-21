// @vitest-environment node
//
// The check's three answers, with a fake ask in place of a database. What `/api/health` answers is
// decided entirely by whether the ask throws, comes back empty, or comes back with a Story, so
// every branch that matters is reachable without PostgreSQL — the real ask needs one and is
// exercised from `rls.test.ts` alongside everything else that does.
//
// **Which Story it asks for is not asserted here**, though it is the one thing this module depends
// on that no code creates. It is a text comparison across four files rather than a behaviour, and
// `scripts/check-docs.ts` owns all four — half of them documents. A test here could read those
// files too; what it could not do is be the single place the comparison lives, and two half-checks
// that each cover some of the copies are how the copies drift.
import type { StoryDetail } from "./stories";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { checkHealth } from "./health";

// Fake, because the pauses between asks are real waits the check has to make and no test should.
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** Long enough for every pause this module can schedule, whatever it schedules them for. */
const pastEveryPause = 60_000;

/** A Story coming back. What it holds is the page's business, not this check's. */
const aStory: StoryDetail = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Rose",
  runtimeSeconds: 2700,
  versions: [],
  partOf: [],
};

test("a Story that comes back is a healthy site", async () => {
  const ask = vi.fn().mockResolvedValue(aStory);

  const found = checkHealth(ask);
  await vi.advanceTimersByTimeAsync(pastEveryPause);

  expect(await found).toBe("healthy");
  expect(ask).toHaveBeenCalledTimes(1);
});

// The failure this whole ticket exists for. A policy that stopped letting the anonymous reader
// through returns no rows rather than an error, so this is the case that would otherwise be
// indistinguishable from a healthy site — CAN-151 Watch the Story route, where a broken policy
// serves 200 with nothing in it.
test("a Story that does not come back is not a healthy site", async () => {
  const ask = vi.fn().mockResolvedValue(undefined);

  const found = checkHealth(ask);
  await vi.advanceTimersByTimeAsync(pastEveryPause);

  expect(await found).toBe("story-unreadable");
});

// Asking again is for a connection that died, and this is not one: the database answered. A policy
// that returned no rows returns no rows again a quarter of a second later, so a retry here would
// buy nothing and spend three times the compute to buy it.
test("does not ask again when the database answered", async () => {
  const ask = vi.fn().mockResolvedValue(undefined);

  const found = checkHealth(ask);
  await vi.advanceTimersByTimeAsync(pastEveryPause);

  await found;
  expect(ask).toHaveBeenCalledTimes(1);
});

// The criterion the retry exists for: one failed ask is a blip, and a blip must not answer with a
// status that pages a phone. docs/infrastructure.md -> Uptime monitoring: UptimeRobot says why
// nothing in the monitor can absorb it instead.
test("one failed ask is not a failed check", async () => {
  const ask = vi
    .fn()
    .mockRejectedValueOnce(new Error("Connection terminated"))
    .mockResolvedValue(aStory);

  const found = checkHealth(ask);
  await vi.advanceTimersByTimeAsync(pastEveryPause);

  expect(await found).toBe("healthy");
  expect(ask).toHaveBeenCalledTimes(2);
});

test("a database that never answers is a different failure from a Story that does not come back", async () => {
  const ask = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

  const found = checkHealth(ask);
  await vi.advanceTimersByTimeAsync(pastEveryPause);

  expect(await found).toBe("database-silent");
  expect(ask).toHaveBeenCalledTimes(3);
});

// A check that gave up on the first slow ask would report an outage every time Neon reactivates a
// suspended compute, which it does on the next query rather than on a schedule.
test("waits for an ask rather than abandoning it", async () => {
  let answer: (story: StoryDetail) => void = () => {};
  const ask = vi.fn().mockReturnValue(new Promise((resolve) => (answer = resolve)));

  const found = checkHealth(ask);
  await vi.advanceTimersByTimeAsync(pastEveryPause);
  answer(aStory);

  expect(await found).toBe("healthy");
  expect(ask).toHaveBeenCalledTimes(1);
});
