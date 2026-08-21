import { Interruption } from "./interruption";

/**
 * A 403, rendered where a `forbidden()` call interrupts a render.
 *
 * **`forbidden` is `experimental` at the installed Next 16.3.0** and needs `experimental.authInterrupts`
 * in `next.config.ts`, which is the opt-in this file arrives with.
 *
 * **Nothing calls `forbidden()` yet**, and turning an experimental flag on for a page nothing can
 * reach sits against `CLAUDE.md` → *Engineering principles* rather than beside it.
 * [ADR-0030](../../../../docs/adr/0030-the-visual-identity.md) → *The two states nothing calls yet*
 * is what decides it, and what would reverse it.
 * CAN-32 Roles, takedown, and the Online Safety Act surfaces brings the first roles there is
 * anything to be forbidden by.
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
