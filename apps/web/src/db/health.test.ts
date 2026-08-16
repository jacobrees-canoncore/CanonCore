// @vitest-environment node
//
// The blip policy, with a fake ask in place of a database. What `/api/health` answers is decided
// entirely by how many times it asks before it gives up, so every branch that matters is
// reachable without PostgreSQL — the real ask needs one and is exercised from `rls.test.ts`
// alongside everything else that does.
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { databaseAnswers } from "./health";

// Fake, because the pauses between asks are real waits the check has to make and no test should.
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** Long enough for every pause this module can schedule, whatever it schedules them for. */
const pastEveryPause = 60_000;

test("answers when the database answers", async () => {
  const ask = vi.fn().mockResolvedValue(undefined);

  const answered = databaseAnswers(ask);
  await vi.advanceTimersByTimeAsync(pastEveryPause);

  expect(await answered).toBe(true);
  expect(ask).toHaveBeenCalledTimes(1);
});

// The criterion this whole module exists for: one failed ask is a blip, and a blip must not
// answer with a status that pages a phone. docs/infrastructure.md -> Uptime monitoring:
// UptimeRobot says why nothing in the monitor can absorb it instead.
test("one failed ask is not a failed check", async () => {
  const ask = vi.fn().mockRejectedValueOnce(new Error("Connection terminated")).mockResolvedValue(undefined);

  const answered = databaseAnswers(ask);
  await vi.advanceTimersByTimeAsync(pastEveryPause);

  expect(await answered).toBe(true);
  expect(ask).toHaveBeenCalledTimes(2);
});

test("a database that never answers is a failed check", async () => {
  const ask = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

  const answered = databaseAnswers(ask);
  await vi.advanceTimersByTimeAsync(pastEveryPause);

  expect(await answered).toBe(false);
  expect(ask).toHaveBeenCalledTimes(3);
});

// A check that gave up on the first slow ask would report an outage every time Neon reactivates a
// suspended compute, which it does on the next query rather than on a schedule.
test("waits for an ask rather than abandoning it", async () => {
  let answer = () => {};
  const ask = vi.fn().mockReturnValue(new Promise<void>((resolve) => (answer = resolve)));

  const answered = databaseAnswers(ask);
  await vi.advanceTimersByTimeAsync(pastEveryPause);
  answer();

  expect(await answered).toBe(true);
  expect(ask).toHaveBeenCalledTimes(1);
});
