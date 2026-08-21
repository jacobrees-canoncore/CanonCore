import { vi } from "vitest";

/**
 * Make every `localStorage` call throw, which is what a browser with site data blocked gives.
 *
 * **Spied on `Storage.prototype` rather than on `window.localStorage`**: jsdom hands back a Proxy,
 * and an own property defined on that does not shadow the method the call actually reaches. Undone
 * by `vi.restoreAllMocks()`, which every caller does in an `afterEach`.
 *
 * Shared because two suites need the same refusal — [`opt-out.test.ts`](opt-out.test.ts) asserts
 * what the module does with it, and
 * [`../app/privacy/analytics/objection-control.test.tsx`](../app/privacy/analytics/objection-control.test.tsx)
 * asserts what the page says about it. A second inline copy is the one that drifts.
 */
export function withUnreachableStorage(): void {
  const insecure = () => {
    throw new Error("The operation is insecure.");
  };
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(insecure);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(insecure);
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(insecure);
}
