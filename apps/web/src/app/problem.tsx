/**
 * What a form says when it was submitted and refused.
 *
 * `role="alert"` so that a reader who has just pressed a button is told, rather than having to go
 * looking: the page reloads on submission, and without this the only difference is a paragraph
 * somebody has to notice. The sentence is always one of ours — `auth/failures.ts` says why nothing
 * from the query string is rendered.
 */
export function Problem({ children }: { children: string | undefined }) {
  if (!children) return null;
  return (
    <p className="problem" role="alert">
      {children}
    </p>
  );
}
