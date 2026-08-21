import type { ReactNode } from "react";

/**
 * A page that cannot show what was asked for, in the four flavours Next.js has a file convention
 * for: not found, forbidden, unauthorized, and an error.
 *
 * **None of them offers a way back, and that is the shell's job rather than an omission.** The
 * masthead links to the front page on every page, so a "return home" link here would be a second
 * copy of one a reader already has — and one more anchor for `no-linkification.test.tsx` to pin.
 */
export function Interruption({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <>
      <h1>{heading}</h1>
      <p className="lead">{children}</p>
    </>
  );
}
