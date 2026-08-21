"use client";

import { useState, useSyncExternalStore } from "react";
import { objectedToMeasurement, recordObjection, subscribeToObjection } from "@/analytics/opt-out";
import { Problem } from "@/app/problem";

/**
 * The "easy way to object" the statistical purposes exception requires, and the reason there is no
 * consent banner anywhere on this site:
 * [ADR-0020](../../../../../../docs/adr/0020-no-cookie-consent-banner.md).
 *
 * **It is a client component because the answer lives on the device.** The objection is a
 * `localStorage` entry that never reaches a server, so nothing rendered on one can know the state
 * of it — which is why the first paint says it is reading rather than guessing and then correcting
 * itself in front of the reader. `undefined` is that first paint, and it is the server snapshot
 * below rather than a loading flag anybody has to maintain.
 */
export function ObjectionControl() {
  const objected = useSyncExternalStore(
    subscribeToObjection,
    objectedToMeasurement,
    // The server has no device to ask, and neither does the client until it has hydrated. React
    // uses this for both, then re-renders with the real answer.
    () => undefined,
  );
  const [refused, setRefused] = useState(false);

  if (objected === undefined) {
    return <p role="status">Reading this browser&rsquo;s setting.</p>;
  }

  function toggle() {
    // Recorded first and read second, never folded into the line below: `&&` short-circuits, so
    // an expression guarded on the *old* state would skip the write in the case that matters.
    const nowObjected = recordObjection(!objected);
    // Asked to be counted and still not counted: the browser refused the write. Everywhere else
    // the request and the outcome agree, so this is the only thing worth saying out loud.
    // `=== true` rather than a bare truthiness test: the early return above narrows this in the
    // component body but not inside a nested function, so without it the expression is
    // `boolean | undefined` and `setRefused` refuses it.
    setRefused(objected === true && nowObjected);
  }

  return (
    <>
      <p role="status">
        {objected
          ? "Your visits to this site are not counted."
          : "Your visits to this site are counted."}
      </p>
      <p>
        <button type="button" onClick={toggle}>
          {objected ? "Count my visits" : "Stop counting my visits"}
        </button>
      </p>
      <Problem>
        {refused
          ? "This browser does not let this site store anything, so the setting cannot be " +
            "changed here. Nothing is counted either way."
          : undefined}
      </Problem>
    </>
  );
}
