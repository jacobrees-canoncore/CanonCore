import { EmailField } from "@/app/credential-fields";
import { Notice } from "@/app/notice";
import { Problem } from "@/app/problem";
import { howLongItWorks, resetLifetime } from "@/mail/messages";

/**
 * The form that asks for a reset link, and nothing that reads a request. Split from `page.tsx` for
 * `sign-up-page.tsx`'s reason.
 *
 * **`action` points straight at better-auth's own endpoint**, with no hidden field on it: where the
 * emailed link lands is added server-side by
 * [`../api/auth/[...all]/route.ts`](../api/auth/%5B...all%5D/route.ts), which is also why the browser
 * must be the thing that posts here.
 */
export function ForgotPasswordPage({ problem, sent }: { problem?: string; sent?: boolean }) {
  return (
    <main>
      <h1>Reset your password</h1>
      <p className="lead">
        Give the email address on the account and we will send a link for choosing a new password.
      </p>
      <hr />

      {/*
        Said whether or not any account holds that address, which is the whole point: better-auth
        answers this endpoint identically either way — `auth/failures.ts` records that it generates a
        token and reads a dummy row for an unknown address to keep the timing alike — so this page
        cannot be asked whether a given person has an account here.
      */}
      <Notice>
        {sent
          ? `If that email address has an account, a link is on its way. It works for ` +
            `${howLongItWorks(resetLifetime)}.`
          : undefined}
      </Notice>

      <Problem>{problem}</Problem>

      <form method="post" action="/api/auth/request-password-reset">
        <EmailField />
        <p>
          <button type="submit">Send the link</button>
        </p>
      </form>

      <hr />
      <p>
        Remembered it? <a href="/sign-in">Sign in</a>.
      </p>
    </main>
  );
}
