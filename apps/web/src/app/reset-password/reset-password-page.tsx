import { PasswordField } from "@/app/credential-fields";
import { Problem } from "@/app/problem";

/**
 * The form that sets a new password, and nothing that reads a request. Split from `page.tsx` for
 * `sign-up-page.tsx`'s reason.
 *
 * **The whole page turns on the token**, which arrives in the query string: a reset link resolves to
 * better-auth's `/reset-password/:token`, which redirects here carrying it
 * ([`../api/auth/[...all]/route.ts`](../api/auth/%5B...all%5D/route.ts) has the shape of the round
 * trip). With no token there is nothing to submit, so the form is not rendered at all rather than
 * rendered and refused — a form that cannot work is worse than a sentence saying why.
 *
 * **The token goes on the `action` rather than into a hidden field.** better-auth accepts it in either
 * (`ctx.body.token || ctx.query?.token`), and putting it in the query is what lets a refusal carry it
 * back so a too-short password can be retyped without a second email. It is no more exposed there than
 * it already is: it arrived as a query parameter on this page's own address.
 */
export function ResetPasswordPage({ token, problem }: { token?: string; problem?: string }) {
  return (
    <main>
      <h1>Choose a new password</h1>
      <hr />

      <Problem>{problem}</Problem>

      {token ? (
        <form method="post" action={`/api/auth/reset-password?token=${encodeURIComponent(token)}`}>
          {/* `newPassword`, which is what `/reset-password` takes — the two other forms post
              `password`. `credential-fields.tsx` says why the name is the form's to spell. */}
          <PasswordField purpose="new" name="newPassword" />
          <p>
            <button type="submit">Set the new password</button>
          </p>
        </form>
      ) : (
        <p>
          This page needs the link from the email. Open that link, or{" "}
          <a href="/forgot-password">ask for a new one</a>.
        </p>
      )}

      <hr />
      <p>
        {token ? (
          <>
            Link expired? <a href="/forgot-password">Ask for a new one</a>.
          </>
        ) : (
          <>
            Remembered it? <a href="/sign-in">Sign in</a>.
          </>
        )}
      </p>
    </main>
  );
}
