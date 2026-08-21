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

export { fonts, leading, measure, palette, radius, spacing, typeScale } from "./design";

/**
 * Where a member of the public reports content, and complains about what we did about it.
 *
 * **A real mailbox on the apex, monitored by a person** — `docs/infrastructure.md` → *Reporting
 * address* is what is provisioned and why it is not the Resend inbound domain. The Online Safety
 * Act Codes require the route to be easy to find and to work for someone with no account, which is
 * what puts it in the footer of every page: `docs/compliance/code-measures-register.md`, ICU D2.
 *
 * **Here rather than in `apps/web` for `mailReceivingDomain`'s reason.** Two public documents in
 * `content/legal/` publish this address and the footer links to it, so a change that reached only
 * one of them would leave the product telling a reporter two different things.
 */
export const reportingAddress = "report@canoncore.com";
