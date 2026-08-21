import { afterEach, describe, expect, test, vi } from "vitest";
import {
  objectedToMeasurement,
  objectionKey,
  recordObjection,
  subscribeToObjection,
} from "./opt-out";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

/**
 * Storage that throws on every access, which is what a browser with site data blocked gives.
 *
 * Spied on the prototype rather than on `window.localStorage`: jsdom hands back a Proxy, and an
 * own property defined on that does not shadow the method the call actually reaches.
 */
function withUnreachableStorage() {
  const insecure = () => {
    throw new Error("The operation is insecure.");
  };
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(insecure);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(insecure);
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(insecure);
}

describe("objectedToMeasurement", () => {
  test("is false by default, because the exception does not run on consent", () => {
    expect(objectedToMeasurement()).toBe(false);
  });

  test("is true once an objection has been recorded", () => {
    recordObjection(true);
    expect(objectedToMeasurement()).toBe(true);
  });

  test("is false again once the objection is withdrawn", () => {
    recordObjection(true);
    recordObjection(false);
    expect(objectedToMeasurement()).toBe(false);
    expect(window.localStorage.getItem(objectionKey)).toBeNull();
  });

  test("is true when storage cannot be read, because an objection that cannot be recorded cannot be honoured", () => {
    withUnreachableStorage();
    expect(objectedToMeasurement()).toBe(true);
  });
});

describe("recordObjection", () => {
  test("reports whether the objection is now in force", () => {
    expect(recordObjection(true)).toBe(true);
    expect(recordObjection(false)).toBe(false);
  });

  test("reports the objection as in force when storage refused it, matching what is measured", () => {
    withUnreachableStorage();
    expect(recordObjection(false)).toBe(true);
  });
});

describe("subscribeToObjection", () => {
  // The watcher set is module state, so a subscription left behind outlives its test. Every case
  // here unsubscribes, including the two that are not about unsubscribing.
  test("tells a subscriber when the objection changes on this page", () => {
    const told = vi.fn();
    const stop = subscribeToObjection(told);

    recordObjection(true);
    recordObjection(false);
    stop();

    expect(told).toHaveBeenCalledTimes(2);
  });

  test("tells a subscriber when another tab changes it", () => {
    const told = vi.fn();
    const stop = subscribeToObjection(told);

    window.dispatchEvent(new StorageEvent("storage", { key: objectionKey }));
    stop();

    expect(told).toHaveBeenCalledTimes(1);
  });

  test("stops telling it once unsubscribed", () => {
    const told = vi.fn();
    subscribeToObjection(told)();

    recordObjection(true);
    window.dispatchEvent(new StorageEvent("storage", { key: objectionKey }));

    expect(told).not.toHaveBeenCalled();
  });
});
