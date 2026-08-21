import { expect, test } from "vitest";
import { formatRuntime } from "./runtime";

test("says a runtime in whole minutes", () => {
  expect(formatRuntime(2700)).toBe("45 minutes");
});

test("says one of anything in the singular", () => {
  expect(formatRuntime(60)).toBe("1 minute");
  expect(formatRuntime(3600)).toBe("1 hour");
  expect(formatRuntime(1)).toBe("1 second");
});

test("says hours and minutes together", () => {
  expect(formatRuntime(11280)).toBe("3 hours 8 minutes");
});

// A runtime is an interval in the database, so it can carry seconds — an audio Version of a Story
// is 22:38 rather than 23 minutes. Dropping them would round a stated length into a wrong one.
test("says the seconds when there are any, rather than rounding them away", () => {
  expect(formatRuntime(11310)).toBe("3 hours 8 minutes 30 seconds");
  expect(formatRuntime(30)).toBe("30 seconds");
});

// Every part that is zero is left out, including one in the middle: "1 hour 0 minutes 30 seconds"
// is how a clock reads, not how anybody says it.
test("leaves out the parts that are zero", () => {
  expect(formatRuntime(3630)).toBe("1 hour 30 seconds");
});
