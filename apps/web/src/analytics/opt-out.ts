/**
 * The objection route [ADR-0020](../../../../docs/adr/0020-no-cookie-consent-banner.md) makes a
 * condition of measuring anything at all.
 *
 * There is no consent banner here because the ICO's statistical purposes exception applies, and
 * that exception carries two duties rather than none: information, and "an easy way to object to
 * this use". This module is the second one. It is an **opt-out** and not an opt-in, because the
 * exception does not run on consent — asking would misrepresent the position, which is the
 * argument the ADR takes against a banner.
 *
 * **`localStorage` rather than a cookie, and that is load-bearing.** The same ADR keeps the
 * session cookie inside the strictly necessary limb by letting it do exactly one job, and names
 * "a cookie for something other than the session" as a thing that would take the decision with
 * it. A preference held on the device and never sent to a server stays out of that question.
 *
 * @see analytics.tsx, which is the only place these are read on a page.
 * @see ../app/privacy/analytics/objection-control.tsx, which subscribes to it.
 */

/**
 * What the objection is stored under. Vercel's own example key is `va-disable`, offered as
 * "for example" rather than as a convention their script honours
 * (https://vercel.com/docs/analytics/redacting-sensitive-data), so nothing aligns by matching it
 * and a name the privacy notice can print without a gloss is worth more.
 */
export const objectionKey = "canoncore-analytics-objection";

/** Whether this browser has objected, and so must not be measured. */
export function objectedToMeasurement(): boolean {
  try {
    return window.localStorage.getItem(objectionKey) !== null;
  } catch {
    // Storage a browser refuses is storage no objection can be recorded in, so there is no
    // objection to read and no way to offer one either. Measuring anyway would be measuring
    // exactly the visitor who has no route to object, which is the condition the exception
    // rests on — so an unreadable store counts as an objection.
    return true;
  }
}

/**
 * Record or withdraw the objection, and report whether one is now in force.
 *
 * The return value is the state {@link objectedToMeasurement} will report rather than the state
 * asked for: a browser that refused the write is one that is not measured, and the page has to
 * say so rather than show a switch that did nothing.
 */
export function recordObjection(objected: boolean): boolean {
  try {
    if (objected) window.localStorage.setItem(objectionKey, new Date().toISOString());
    else window.localStorage.removeItem(objectionKey);
  } catch {
    // Deliberately swallowed. The caller learns what happened from the value below.
  }
  for (const watcher of watchers) watcher();
  return objectedToMeasurement();
}

/** Everything currently watching the objection, on this page. */
const watchers = new Set<() => void>();

/**
 * Watch the objection, in the shape `useSyncExternalStore` wants: subscribe, and get back the
 * unsubscribe.
 *
 * **A store rather than an effect, and the lint rule that says so is right.** The objection lives
 * on the device, so a component has to read it after mounting rather than while rendering — and
 * doing that with `useEffect` plus `setState` is the cascading-render shape
 * `react-hooks/set-state-in-effect` refuses. `useSyncExternalStore` is what the reading half of
 * that pattern is for, and it takes the server-render problem with it: the page renders "reading"
 * on the server and on hydration, then the real answer, with no mismatch to reconcile.
 *
 * **Two things can change it and both are subscribed.** {@link recordObjection} on this page, and
 * the same control in another tab — `storage` fires only for *other* documents
 * (https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event), which is exactly the
 * half the set above cannot see.
 */
export function subscribeToObjection(watcher: () => void): () => void {
  watchers.add(watcher);
  window.addEventListener("storage", watcher);
  return () => {
    watchers.delete(watcher);
    window.removeEventListener("storage", watcher);
  };
}
