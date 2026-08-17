import { siteName } from "@canoncore/config";

/**
 * The two emails this service sends, and nothing that can send one.
 *
 * **Its own module for [`../auth/password.ts`](../auth/password.ts)'s reason.** `auth/auth.ts`
 * configures better-auth with these and opens a database pool doing it, so a test of the wording
 * would otherwise have to open one too. The lifetimes live here rather than beside the settings they
 * configure because the sentence that states one and the number that enforces it must not be able to
 * drift: `auth.ts` reads both constants below, and each is quoted to the reader by the function under
 * it.
 *
 * **Plain text, with no HTML half, and that is a decision rather than a shortcut.** Every word here
 * is a sentence and a URL; an HTML half would carry no information the text does not and would need a
 * template, a set of inlined styles and a second copy of the copy to keep in step — which is the
 * duplication [ADR-0013](../../../../docs/adr/0013-hand-written-css-no-framework.md) refuses in the
 * product and there is no reason to accept in the mail. Resend sends a text-only message on `text`
 * alone ([send an email](https://resend.com/docs/api-reference/emails/send-email), where `html` and
 * `text` are each optional).
 *
 * **Nothing here is a Source or a Provider.** Resend carries this service's own transactional mail
 * and is neither of the two things `CONTEXT.md` gives those names to;
 * [ADR-0011](../../../../docs/adr/0011-transactional-email-resend.md) says so in its own first
 * paragraph. So `RESEND_API_KEY` is not a *Source* credential and the shell rule in
 * [ADR-0014](../../../../docs/adr/0014-shell-providers-and-per-source-retention.md) does not reach
 * it — `CODING_STANDARDS.md` names it among the three credentials that are exempt.
 */

/** A message, with no recipient: who it goes to is [`send.ts`](send.ts)'s argument. */
export type Email = {
  readonly subject: string;
  readonly text: string;
};

/**
 * How long a verification link works for, in seconds. **24 hours, against better-auth's default of
 * one**, which its `expiresIn` option documents as `3600`.
 *
 * A verification link proves control of an address and grants nothing else —
 * `autoSignInAfterVerification` is off, so clicking it does not sign anybody in — so the window can
 * be long enough that somebody who reads their email once a day still gets in. An hour is short
 * enough to expire while its reader is asleep, and the only thing that costs is a second link.
 */
export const verificationLifetime = 60 * 60 * 24;

/**
 * How long a reset link works for, in seconds. **One hour, which is also better-auth's default**, and
 * it is stated because a default nobody chose is not a decision.
 *
 * This one is not the verification window and must not become it: a reset link *is* the credential
 * for the account, so the window is the shortest one that still lets somebody notice the mail, open
 * it and type a password.
 */
export const resetLifetime = 60 * 60;

/**
 * A lifetime above, as the reader is told it.
 *
 * Exported because the pages say it too — `/forgot-password` tells somebody how long the link it just
 * sent will work for — and a page and an email disagreeing about that is exactly the drift these
 * constants live here to prevent.
 */
export function howLongItWorks(seconds: number): string {
  const count = seconds / (60 * 60);
  return count === 1 ? "one hour" : `${count} hours`;
}

/** Blank-line separated, and ending in a newline, which is what a mail client expects of text. */
function paragraphs(...body: readonly string[]): string {
  return `${body.join("\n\n")}\n`;
}

/**
 * **Every sentence has to be true of somebody who did not ask for this email**, because anybody can
 * put anybody's address into the sign-up form. So it says what was attempted rather than greeting a
 * new account holder, and it says plainly that ignoring it is safe.
 *
 * The `url` is better-auth's own and resolves against its `baseURL`, which in production is
 * `https://www.canoncore.com` and nothing else —
 * [ADR-0010](../../../../docs/adr/0010-canonical-host-www.md), enforced in `auth/auth.ts` by
 * `hostsAllowedToIssueSessions`.
 */
export function verifyYourAddress(url: string): Email {
  return {
    subject: `Verify your email address for ${siteName}`,
    text: paragraphs(
      `Somebody created a ${siteName} account with this email address. Open this link to confirm ` +
        `that the address is yours:`,
      url,
      `The link works for ${howLongItWorks(verificationLifetime)}. If it has expired, try to sign ` +
        `in and ${siteName} will send you another one.`,
      `If you did not create an account, ignore this email. Nobody can use an account whose ` +
        `address has not been confirmed, and yours will not be used for anything else.`,
    ),
  };
}

/**
 * The same rule as above, and here it matters more: a reset link can be asked for by anybody who
 * knows an address, so the person reading this may be the account holder being attacked rather than
 * the one who asked. **"Your password has not changed" is the sentence that does the work.**
 *
 * "Once" is better-auth's behaviour rather than an aspiration: `/reset-password` calls
 * `consumeVerificationValue`, which deletes the row it reads
 * (`better-auth/dist/api/routes/password.mjs`, 1.6.29).
 */
export function chooseANewPassword(url: string): Email {
  return {
    subject: `Reset your ${siteName} password`,
    text: paragraphs(
      `Somebody asked to reset the password for the ${siteName} account with this email address. ` +
        `Open this link to choose a new one:`,
      url,
      `The link works for ${howLongItWorks(resetLifetime)} and can be used once.`,
      `If you did not ask for this, ignore this email. Your password has not changed, and whoever ` +
        `asked cannot see this message or tell that you received it.`,
    ),
  };
}
