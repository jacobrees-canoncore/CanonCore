import { EmailField, PasswordField } from "@/app/credential-fields";
import { Notice } from "@/app/notice";
import { Problem } from "@/app/problem";

/**
 * What this page has to say, beyond the form.
 *
 * **Three things can have just happened, and each arrives as a `?flag` on this page's own address** —
 * a sign-up completed, an address confirmed, a password changed. All three end here rather than on the
 * front page, because none of them signs anybody in: `auth/auth.ts` holds that decision three times
 * over, at `autoSignIn`, at `autoSignInAfterVerification`, and in what a reset deliberately leaves
 * alone.
 */
type WhatJustHappened = {
  problem?: string;
  created?: boolean;
  verified?: boolean;
  reset?: boolean;
};

/**
 * The sign-in form, and nothing that reads a request. Split from `page.tsx` for
 * `sign-up-page.tsx`'s reason.
 */
export function SignInPage(happened: WhatJustHappened) {
  return (
    <>
      <h1>Sign in</h1>
      <hr />

      <Notice>{noticeFor(happened)}</Notice>

      <Problem>{happened.problem}</Problem>

      <form method="post" action="/api/auth/sign-in/email">
        <EmailField />
        <PasswordField purpose="current" />
        <p>
          <button type="submit">Sign in</button>
        </p>
      </form>

      {/*
        Behind this is a real flow as of CAN-31 Email verification and password reset. Until then the
        link was deliberately absent, because an offer this service could not keep would have been
        worse than its absence.
      */}
      <p>
        <a href="/forgot-password">Forgotten your password?</a>
      </p>

      <hr />
      <p>
        No account yet? <a href="/sign-up">Create one</a>.
      </p>
    </>
  );
}

/**
 * The one notice to show, or none.
 *
 * **A refusal silences all three**, and that is the case worth a function rather than three ternaries
 * in the markup. `verify-email` redirects here with `?verified&error=TOKEN_EXPIRED` when the link had
 * expired — the flag it was given, plus the code for what actually went wrong — so a page reading the
 * flag alone would congratulate somebody on confirming an address that is still unconfirmed. The
 * `Problem` beside it is the true half.
 *
 * A reader can only have arrived by one route at a time, so the order settles nothing real. Reset is
 * first because it is the only one of the three that says something about their password.
 */
function noticeFor({ problem, created, verified, reset }: WhatJustHappened): string | undefined {
  if (problem) return undefined;
  if (reset) return "Your password has been changed. Sign in with the new one.";
  if (verified) return "Your email address is confirmed. Sign in below.";
  if (created) {
    // Deliberately not "your account was created": `auth/auth.ts` → `autoSignIn` says why this page
    // must answer the same way whether the address was free or already held.
    //
    // **The conditional governs both clauses, and it has to.** An address already in use is sent
    // nothing at all — better-auth's `onExistingUserSignUp` is the hook that would tell its real
    // owner and nothing configures it — so "a confirmation link is on its way" is true only in the
    // case the opening clause names.
    return (
      "If that email address was free, the account now exists and a confirmation link is on its " +
      "way. Open it, then sign in below."
    );
  }
  return undefined;
}
