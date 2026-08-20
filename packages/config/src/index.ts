/** The name the product is published under. */
export const siteName = "CanonCore";

/**
 * The canonical production origin. The apex 301s to it, so this is the only
 * form to link to or link from — see ADR-0010 and `docs/infrastructure.md`.
 */
export const productionUrl = "https://www.canoncore.com";

/**
 * The domain this product's mail is sent from **and received at**. Resend holds one domain on the
 * free tier and it does both jobs.
 *
 * **Here rather than in `apps/web` because two things must not disagree about it.** The guard in
 * `apps/web/src/mail/send.ts` admits recipients at this domain outside production, and
 * `apps/web/e2e/verification-by-inbox.spec.ts` addresses one there and then reads it — so a change to
 * this string that reached only one of them would make the spec address a recipient the guard refuses,
 * and the symptom would be a message that never arrives rather than an error.
 *
 * **Not the sending identity**, which is `EMAIL_FROM` and is a variable rather than a constant: the
 * local part and the display name belong to the deployment. What is fixed is the domain.
 * `docs/infrastructure.md` → *Transactional email: Resend* is what is provisioned.
 */
export const mailReceivingDomain = "mail.canoncore.com";
