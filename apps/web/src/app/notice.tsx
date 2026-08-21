/**
 * What a form says when it was submitted and *worked*, and nothing needs fixing.
 *
 * The mirror of [`problem.tsx`](problem.tsx), and it exists for the same reason turned around:
 * `role="status"` so that a reader who has just pressed a button is told, rather than having to
 * notice a paragraph that appeared. `status` rather than `alert` because nothing is wrong —
 * an assertive announcement for good news interrupts a screen reader for no reason.
 *
 * There are four of these across two pages — an account created, an address confirmed, a password
 * changed, a link sent — which is what made it worth sharing rather than the second one.
 */
export function Notice({ children }: { children: string | undefined }) {
  if (!children) return null;
  return (
    <p className="notice" role="status">
      {children}
    </p>
  );
}
