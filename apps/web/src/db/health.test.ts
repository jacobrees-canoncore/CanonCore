// @vitest-environment node
//
// The check's three answers, with a fake ask in place of a database. What `/api/health` answers is
// decided entirely by whether the ask throws, comes back empty, or comes back with a Story, so
// every branch that matters is reachable without PostgreSQL — the real ask needs one and is
// exercised from `rls.test.ts` alongside everything else that does.
//
// The last test is the one with no counterpart there: it ties the id this module asks for to the
// migration that inserts it, which is a text comparison rather than a query.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { checkHealth, foundingStory } from "./health";

// Fake, because the pauses between asks are real waits the check has to make and no test should.
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** Long enough for every pause this module can schedule, whatever it schedules them for. */
const pastEveryPause = 60_000;

/** A Story coming back. What it holds is the page's business, not this check's. */
const aStory = { id: foundingStory, title: "Rose" };

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
  let answer: (story: unknown) => void = () => {};
  const ask = vi.fn().mockReturnValue(new Promise((resolve) => (answer = resolve)));

  const found = checkHealth(ask);
  await vi.advanceTimersByTimeAsync(pastEveryPause);
  answer(aStory);

  expect(await found).toBe("healthy");
  expect(ask).toHaveBeenCalledTimes(1);
});

/**
 * The one thing this check depends on that is not in this repository's control flow: a row.
 *
 * **A mistyped id would be silent in the worst possible way.** `readStory` answers `undefined` for
 * anything that is not a uuid without opening a transaction, so a typo here would report
 * `story-unreadable` for ever, page the phone hourly, and never once ask the database — the
 * check's own database-silent branch would become unreachable.
 *
 * The migration is the source and this file is the copy, so the comparison runs that way round.
 * `docs/infrastructure.md` -> The Story the health check reads is the third place it is written
 * and `scripts/check-docs.ts` is what ties that one to these two.
 */
test("asks for the Story migration 0002 inserts", () => {
  const migration = readFileSync(
    fileURLToPath(new URL("../../drizzle/0002_the_founding_story.sql", import.meta.url)),
    "utf8",
  );

  expect(migration).toContain(`'${foundingStory}'`);
});
