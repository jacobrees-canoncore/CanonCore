import { expect, test } from "vitest";
import { formatRetention } from "./retention";

test("a Source whose terms cap nothing says so, rather than showing a duration", () => {
  // "Indefinite" is a value and never an absence, so it has a sentence of its own rather than
  // falling through to whatever an empty duration would render as.
  expect(formatRetention("indefinite")).toContain("No limit");
});

test.each([
  ["P6M", "6 months"],
  ["P1Y", "1 year"],
  ["P1Y6M", "1 year, 6 months"],
  ["P14D", "14 days"],
  ["PT30M", "30 minutes"],
  ["P1Y2M3DT4H5M6S", "1 year, 2 months, 3 days, 4 hours, 5 minutes, 6 seconds"],
])("%s reads as %s", (retention, expected) => {
  expect(formatRetention(retention)).toBe(`${expected} from when the Source was read.`);
});

test("a duration this cannot read is shown as it was declared", () => {
  // Nothing malformed can be stored — the parse refuses it — so this covers a notation PostgreSQL
  // emitted that this expression does not know, which is a thing to show rather than to hide.
  expect(formatRetention("P1W")).toBe("P1W");
});
