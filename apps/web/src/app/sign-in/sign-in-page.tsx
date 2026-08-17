import { EmailField, PasswordField } from "@/app/credential-fields";
import { Problem } from "@/app/problem";

/**
 * The sign-in form, and nothing that reads a request. Split from `page.tsx` for
 * `sign-up-page.tsx`'s reason.
 *
 * `created` is the notice a completed sign-up comes back with. It is deliberately not "your account
 * was created": `auth/auth.ts` → `autoSignIn` says why this page must answer the same way whether
 * the address was free or already held.
 */
export function SignInPage({ problem, created }: { problem?: string; created?: boolean }) {
  return (
    <main>
      <h1>Sign in</h1>
      <hr />

      {created ? (
        <p className="lead" role="status">
          If that email address was free, the account now exists. Sign in below.
        </p>
      ) : null}

      <Problem>{problem}</Problem>

      <form method="post" action="/api/auth/sign-in/email">
        <EmailField />
        <PasswordField purpose="current" />
        <p>
          <button type="submit">Sign in</button>
        </p>
      </form>

      <hr />
      {/*
        Deliberately no "forgot your password" link. Resetting one needs a mail provider, and until
        CAN-31 Email verification and password reset ships there is nothing behind such a link — an
        offer this service cannot keep is worse than its absence.
      */}
      <p>
        No account yet? <a href="/sign-up">Create one</a>.
      </p>
    </main>
  );
}
