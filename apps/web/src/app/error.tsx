"use client";

import { Interruption } from "./interruption";

/**
 * What a page becomes when rendering it threw, anywhere below the root layout.
 *
 * A Client Component because an error boundary has to be one. The shell around it is not: this
 * replaces the page, so the masthead, the footer and the reporting route in it all survive — which
 * is the reason the shell is in the layout rather than in the pages.
 *
 * **Nothing from the error is rendered except the digest**, and the digest is the whole point of
 * it: Next.js replaces a Server Component's message with a generic one "to prevent leaking
 * sensitive details" and gives `error.digest` as the hash that matches it to the server-side log
 * ([`error.js`](https://nextjs.org/docs/app/api-reference/file-conventions/error)). So the reader
 * gets something to quote and this page gets nothing to leak. It is not a linkification case
 * either — the digest is rendered as text, like every other value this application draws.
 *
 * `retry` rather than `reset`, which Next 16 documents as the one to reach for: it re-fetches and
 * re-renders the boundary's children, where `reset` only clears the error state.
 */
export default function PageError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <>
      <Interruption heading="Something went wrong">
        This page did not finish loading, and the fault is at our end rather than yours.
      </Interruption>
      {error.digest === undefined ? null : (
        <p className="account">
          If you tell us about it, quote <strong>{error.digest}</strong>.
        </p>
      )}
      <p>
        <button type="button" onClick={() => retry()}>
          Try again
        </button>
      </p>
    </>
  );
}
