import { env } from "@/env";
import type { Email } from "./messages";

/**
 * The one request that sends an email, and the guard standing in front of it.
 *
 * ## Why this is a `fetch` and not Resend's own SDK
 *
 * **The whole of sending an email is one authenticated POST**, and the SDK is a typed wrapper over
 * exactly that request ([send an email](https://resend.com/docs/api-reference/emails/send-email)). It
 * adds no retry of its own, so what it would buy here is a `{ data, error }` shape in exchange for a
 * dependency in the `pnpm audit` gate.
 *
 * Two things make owning the request the better trade rather than merely the cheaper one. **The guard
 * below has to be the last thing that happens before the request leaves**, and that is checkable only
 * where the request is built. And **the boundary a test has to control is the network**: stubbing
 * `fetch` captures the real body, including the link better-auth put in it, where mocking an SDK
 * module would assert against the shape of our own mock.
 *
 * ## The guard, which is the only isolation Resend offers
 *
 * **Resend has no test credential and no sandbox.** Isolation comes from the *recipient* instead:
 * `delivered@`, `bounced@`, `complained@` and `suppressed@resend.dev` simulate each outcome without
 * touching the sending domain's reputation
 * ([ADR-0011](../../../../docs/adr/0011-transactional-email-resend.md) → *What choosing it commits us
 * to*). So a mistyped real address in a preview deployment **will send a real email to a real
 * person**, and refusing every non-`resend.dev` recipient outside production is not hygiene — it is
 * the only mechanism there is. Test sends still spend the 100-a-day quota.
 *
 * **Production is the only environment exempt**, read off `VERCEL_ENV`, which Vercel sets on every
 * deployment and nothing sets on a laptop. So a preview and a dev server are both inside the guard,
 * and a preview is the case it exists for: previews are unprotected
 * (`docs/infrastructure.md` → *Hosting*), so its sign-up form is reachable by anyone who has the URL.
 */

/** Resend's send endpoint. One request, one email. */
const endpoint = "https://api.resend.com/emails";

/** The only domain a recipient may be on outside production. */
const simulator = "resend.dev";

/**
 * Whether this recipient may be sent to from this environment.
 *
 * **`@resend.dev` rather than `resend.dev`**, so the `@` anchors the match to the whole domain: an
 * address at `notresend.dev` ends with the second string and not the first. Exported so the refusal
 * can be asserted directly rather than inferred from a send that did not happen — a send that was
 * never attempted looks exactly like a send that was refused.
 */
export function mayBeSentTo(recipient: string, environment: string | undefined): boolean {
  if (environment === "production") return true;
  return recipient.toLowerCase().endsWith(`@${simulator}`);
}

/**
 * Refused here rather than defaulted, for `auth/auth.ts` → `secret`'s reason: the variable is optional
 * in [`../env.ts`](../env.ts) because which variables a deployment carries depends on which deployment
 * it is, so the refusal belongs where the value is read.
 *
 * **Two keys under one name**, one per environment, so a leaked preview key can be revoked without
 * interrupting production — `docs/infrastructure.md` → *The keys*. Nothing here may assume the two
 * environments share a credential, and nothing here needs to.
 */
function credential(): string {
  if (!env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is not set, so no email can be sent. docs/infrastructure.md -> " +
        "Transactional email holds the two keys and which environment carries which.",
    );
  }
  return env.RESEND_API_KEY;
}

/**
 * `CanonCore <noreply@mail.canoncore.com>`, from the environment rather than from a constant here.
 *
 * **A subdomain, never the apex**, which is containment rather than convention: a sending domain
 * accumulates reputation, and keeping that off the apex means a bad month for mail cannot reach
 * `www.canoncore.com`. `mail.` is a sibling of `www`, so
 * [ADR-0010](../../../../docs/adr/0010-canonical-host-www.md) is untouched and the session cookie
 * stays host-only. The free tier allows one domain, so this is also the only address available.
 */
function sender(): string {
  if (!env.EMAIL_FROM) {
    throw new Error(
      "EMAIL_FROM is not set, so no email can be sent. It is the verified sending identity, " +
        "`CanonCore <noreply@mail.canoncore.com>` — docs/infrastructure.md -> Transactional email.",
    );
  }
  return env.EMAIL_FROM;
}

/**
 * Resend's own machine-readable name for a refusal, which is safe to log where its `message` is not.
 *
 * Resend's error bodies carry `{ statusCode, message, name }`, and one of the `message`s quotes an
 * email address back at you (the 403 for the shared testing domain, in its own documentation). `name`
 * is a stable slug — `validation_error`, `rate_limit_exceeded` — so it is the half worth keeping.
 */
async function whyRefused(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => undefined);
  const name =
    typeof body === "object" && body !== null ? (body as { name?: unknown }).name : undefined;
  return typeof name === "string" ? name : "no reason given";
}

/**
 * Send one email, or throw saying why not.
 *
 * **Nothing between the guard and `fetch` is awaited**, and that is load-bearing twice over. It is
 * what makes the guard provably the last thing before the request leaves, and it is what lets
 * `db/rls.test.ts` read the emailed link straight after the route call it came from: the request is
 * handed to `fetch` synchronously, so a stub has recorded it before this function's first suspension.
 * `send.test.ts` asserts that property rather than leaving it to be noticed.
 *
 * **Throwing is the right shape even though nobody is waiting.** `auth/auth.ts` hands every send to
 * `after`, so this runs once the response has gone; a refusal is therefore a log line rather than
 * something a reader sees, which is what it should be. The alternative — returning a value nobody
 * reads — would make a refused send indistinguishable from a delivered one.
 */
export async function send(recipient: string, { subject, text }: Email): Promise<void> {
  if (!mayBeSentTo(recipient, env.VERCEL_ENV)) {
    throw new Error(
      `Refusing to send "${subject}": outside production a recipient must be at ${simulator}, and ` +
        "this one is not. Resend has no test credential and no sandbox, so this refusal is the " +
        "only isolation there is and a real address here would reach a real person — " +
        "docs/adr/0011-transactional-email-resend.md. **The address is deliberately not quoted " +
        "here**: content/legal/terms-of-service.md tells readers an error report carries no email " +
        "address, and this message is exactly what would end up in one.",
    );
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${credential()}`,
      "content-type": "application/json",
    },
    // `text` and no `html`: `messages.ts` says why there is no second half to keep in step.
    body: JSON.stringify({ from: sender(), to: recipient, subject, text }),
  });

  if (!response.ok) {
    throw new Error(
      `Resend refused "${subject}" with ${response.status}: ${await whyRefused(response)}. Its ` +
        "own message is not repeated here, because one of them quotes the recipient's address.",
    );
  }
}
