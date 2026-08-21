import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { objectionKey } from "@/analytics/opt-out";
import { withUnreachableStorage } from "@/analytics/unreachable-storage";
import { ObjectionControl } from "./objection-control";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

test("says visits are counted, and offers to stop", async () => {
  render(<ObjectionControl />);

  expect((await screen.findByRole("status")).textContent).toMatch(/counted/);
  expect(screen.getByRole("button").textContent).toBe("Stop counting my visits");
});

test("records the objection when the button is pressed", async () => {
  render(<ObjectionControl />);
  fireEvent.click(await screen.findByRole("button"));

  expect(window.localStorage.getItem(objectionKey)).not.toBeNull();
  expect(screen.getByRole("button").textContent).toBe("Count my visits");
});

test("withdraws the objection when the button is pressed again", async () => {
  window.localStorage.setItem(objectionKey, "2026-08-21T00:00:00.000Z");
  render(<ObjectionControl />);
  fireEvent.click(await screen.findByRole("button"));

  expect(window.localStorage.getItem(objectionKey)).toBeNull();
  expect(screen.getByRole("button").textContent).toBe("Stop counting my visits");
});

// A control that visibly does nothing is worse than one that explains itself. A browser refusing
// site data is already not measured, so the objection stands; what it cannot do is withdraw one.
test("says why nothing changed when the browser refuses to store the setting", async () => {
  withUnreachableStorage();

  render(<ObjectionControl />);
  fireEvent.click(await screen.findByRole("button"));

  expect(screen.getByRole("alert").textContent).toMatch(/does not let this site store/);
});
