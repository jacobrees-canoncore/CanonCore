import type { ReactNode } from "react";

/**
 * What Next.js hands an error boundary, and **the two that exist cannot disagree about it**: one
 * call site renders whichever component is configured with `{ error, reset, retry }` regardless of
 * which file it came from (`next@16.3.0`, `dist/client/components/error-boundary.js`, lines
 * 110-114). So this is written once, and `error.tsx` and `global-error.tsx` share it even though
 * they can share no markup — one draws into `globals.css` and the other into a document of its own.
 *
 * `reset` is deliberately absent: Next 16 documents `retry` as the one to reach for, and a prop
 * declared here is a prop somebody will use.
 */
export type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

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
