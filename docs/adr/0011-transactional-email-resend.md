# Transactional email is Resend

An account you can be locked out of is not an account, so email verification and password reset
need a provider that will actually deliver. Eight candidates were checked against their own pricing
pages, terms, AUPs, sub-processor lists and status pages in
[`docs/research/transactional-email-providers.md`](../research/transactional-email-providers.md).
**We use Resend**, sending from `mail.canoncore.com`.

This decision is about the provider that carries *our own* transactional mail. It says nothing about
Providers in the [ADR-0007](0007-provider-contract.md) sense, which are unrelated.

## Why, and what it cost to decide

Three things settle it, and none of them is "Resend is the best email service".

**There is no approval gate.** Resend states there is "no sandbox mode, no approval process, and no
waiting period". AWS SES starts every account in a sandbox, and Postmark holds new accounts behind a
manual review that blocks sending to any address outside your own verified domains until it clears.
For a ticket whose acceptance criterion is "a test send reaches a real inbox", a review queue is the
difference between done today and done when somebody replies.

**The free tier fits the shape of the mail.** 3,000 a month at 100 a day, against a product that
sends verification and reset mail and nothing else. Postmark's free tier is 100 a month.
**SendGrid was excluded outright**: Twilio removed its free tier in May 2025.

**It is written for this stack.** Resend publishes a better-auth integration page carrying the
`waitUntil` guidance a serverless deployment needs. ADR-0005 settled on better-auth, so that is the
seam this has to fit.

## Postmark is the runner-up, and the margin is uncomfortable

Postmark is the better-engineered service and this ADR should not pretend otherwise. It separates
transactional from bulk traffic down to the IP ranges, has **2 sub-processors against Resend's 22**,
allows retention to be configured between 7 and 365 days, and isolates test sending at the
credential — a Sandbox Server's messages go to a black hole, so a mistyped address cannot escape.
Resend has no test credential at all.

**What flips this decision to Postmark:**

- Resend's exclusivity rule blocks us. "A domain can only be active on one Resend team at a time",
  so if `mail.canoncore.com` ever cannot be verified on our team, the decision moves.
- A data-protection assessment that cannot carry 22 US sub-processors. CAN-21 writes the terms of
  service; if that work concludes the sub-processor chain is too long to disclose honestly, this
  reopens.
- Sustained deliverability trouble traceable to shared pools.

**Zoho ZeptoMail is the answer if cost or EU residency becomes the deciding axis** — roughly £2 per
10,000 emails, an EU data centre, a transactional-only policy and a bounce-simulating sandbox. It
lost on publishing no incident history and shipping an SDK with no public repository, both of which
are decidable later.

## What choosing it commits us to

**Every log and every piece of email metadata is stored in the United States**, whichever sending
region is selected, and there are 22 sub-processors. The `eu-west-1` region governs where mail is
sent *from*, not where records are kept. **CAN-21's terms of service and any privacy notice have to
say so.** This is the single most consequential thing on this page and the easiest to forget,
because the region selector implies otherwise.

**There is no test mode.** Isolation comes from the recipient — `delivered@`, `bounced@`,
`complained@` and `suppressed@resend.dev` simulate outcomes without touching domain reputation — so
a mistyped real address in a preview deployment **will send for real**. Any code sending mail must
refuse non-`resend.dev` recipients outside production. Test sends still consume the daily quota.

**Mail is sent from a subdomain, never the apex.** Resend's own guidance is to send from a subdomain
"to conform to deliverability best practices". A sending domain accumulates reputation, and keeping
that off the apex means a bad month for mail never reaches `www.canoncore.com`.
[ADR-0010](0010-canonical-host-www.md) is untouched: `mail.` is a sibling of `www`, so the session
cookie stays host-only.

## What will try to reopen this

The Vercel Marketplace lists Resend as its only email provider, and installing it looks like the
obvious path. **Decline it.** It provisions a billable resource on a Hobby account and takes
ownership of the environment variable, which is the failure CAN-18 already paid for with
`DATABASE_URL` and the `NEON_` prefix. A plain API key keeps the control.

Anything proposing that we send mail directly from a function reopens this too. We do not own the
sending IPs, and the forward and reverse DNS, TLS and spam-rate requirements that every receiver
imposes are the provider's to satisfy. Vercel's own guidance is to use "third-party mail services".

What is actually provisioned — the account, the domain, the DNS records, the keys and where each
lives — is [`docs/infrastructure.md`](../infrastructure.md), not here.
