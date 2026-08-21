import { Interruption } from "./interruption";

/**
 * A 403, rendered where a `forbidden()` call interrupts a render.
 *
 * **`forbidden` is `experimental` at the installed Next 16.3.0** and needs `experimental.authInterrupts`
 * in `next.config.ts`, which is the opt-in this file arrives with.
 *
 * **Nothing calls `forbidden()` yet, and that sits against a principle rather than beside it.**
 * `CLAUDE.md` → *Engineering principles* rules out configuration for a need that does not exist, and
 * on its own this would be exactly that. What overrides it is the ticket: CAN-89 Give the product a
 * visual identity and a reading surface names these two states, and this flag, in its acceptance
 * criteria — because a state designed with the rest is a state
 * CAN-32 Roles, takedown, and the Online Safety Act surfaces does not have to invent while it is
 * busy with roles. That ticket brings the first roles there is anything to be forbidden by.
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
