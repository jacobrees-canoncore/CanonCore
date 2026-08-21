import { Interruption } from "./interruption";

/**
 * A 401, rendered where an `unauthorized()` call interrupts a render. `forbidden.tsx` holds the
 * experimental opt-in these two share, and the distinction between them.
 */
export default function Unauthorized() {
  return (
    <Interruption heading="Sign in to see this">
      This page is for people with an account. <a href="/sign-in">Sign in</a>, and try the address
      again.
    </Interruption>
  );
}
