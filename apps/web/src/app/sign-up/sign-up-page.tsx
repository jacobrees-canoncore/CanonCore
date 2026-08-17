import { EmailField, PasswordField } from "@/app/credential-fields";
import { Problem } from "@/app/problem";
import { siteName } from "@canoncore/config";

/**
 * The sign-up form, and nothing that reads a request.
 *
 * Split from `page.tsx` so that this half stays a plain function of its arguments — the same split
 * `front-page.tsx` makes, and for the same reason: the page reads `searchParams` and is therefore
 * async, which a render test cannot call.
 *
 * **`action` points straight at better-auth's own endpoint**, and the form is plain HTML with no
 * JavaScript behind it. Why the browser must be the thing that posts there, rather than a Server
 * Action doing it: [`../api/auth/[...all]/route.ts`](../api/auth/%5B...all%5D/route.ts).
 */
export function SignUpPage({ problem }: { problem?: string }) {
  return (
    <main>
      <h1>Create an account</h1>
      <p className="lead">One account, holding one catalogue. {siteName} is being rebuilt.</p>
      <hr />

      <Problem>{problem}</Problem>

      <form method="post" action="/api/auth/sign-up/email">
        <p>
          <label htmlFor="name">Name</label>
          {/* better-auth's `user.name` is required by its own model. Nothing renders it yet. */}
          <input id="name" name="name" type="text" autoComplete="name" required />
        </p>
        <EmailField />
        <PasswordField purpose="new" />
        <p>
          <button type="submit">Create account</button>
        </p>
      </form>

      <hr />
      {/*
        True whether or not the address was free, which is the whole point: signing up with an
        email somebody already holds answers exactly as it does for a new one, so this page cannot
        be asked whether a given person has an account. `auth/auth.ts` -> `autoSignIn` holds the
        argument, and CAN-31 Email verification and password reset will tell the real owner.
      */}
      <p>
        Creating an account does not sign you in. If the address was free, sign in next; if it was
        already in use, nothing has changed.
      </p>
      <p>
        Already have an account? <a href="/sign-in">Sign in</a>.
      </p>
    </main>
  );
}
