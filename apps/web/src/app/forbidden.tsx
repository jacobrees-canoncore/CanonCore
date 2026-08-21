import { Interruption } from "./interruption";

/**
 * A 403, rendered where a `forbidden()` call interrupts a render.
 *
 * **`forbidden` is `experimental` at the installed Next 16.3.0** and needs `experimental.authInterrupts`
 * in `next.config.ts`, which is the opt-in this file arrives with. Nothing calls `forbidden()` yet —
 * CAN-32 Roles, takedown, and the Online Safety Act surfaces brings the first roles there are
 * anything to be forbidden by. What lands here is the design, so that ticket does not invent one.
 *
 * **The distinction from `unauthorized.tsx` is who you are, not what you did**: signed in and not
 * allowed, against not signed in at all. Answering the wrong one of the two tells a signed-out
 * stranger that signing in would have been enough.
 */
export default function Forbidden() {
  return (
    <Interruption heading="Not yours to see">
      You are signed in, but this is not something your account may look at.
    </Interruption>
  );
}
