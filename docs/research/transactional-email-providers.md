# Transactional email providers

**Researched 2026-08-10**, for [CAN-20 Send from mail.canoncore.com and revoke the two DKIM keys](https://linear.app/jacobrees-canoncore/issue/CAN-20). Every
price, limit, DNS record and legal quotation below was read from the page that owns it on that date —
provider pricing pages, terms, AUPs, DPAs, sub-processor lists, status pages and API references;
Google's, Yahoo's and Microsoft's own sender pages; Namecheap's knowledgebase; the RFCs; and the
published npm tarballs and type declarations for each SDK. Nothing here comes from a comparison
article, a listicle or a summary. Where a claim could only be reached second-hand it is marked
**unverified** and collected at the end.

The `canoncore.com` zone was read twice on the same day: from the Namecheap dashboard, and
independently with `dig` against the authoritative servers `dns1.registrar-servers.com` and
`dns2.registrar-servers.com`. The two agree. Those observations are the most perishable thing here.

> **Exclusion note.** Per this repository's standing constraint, no repository or page matching
> `canoncore*`, `CanonCore*` or `universora*` was read, fetched, cloned or quoted. No such result
> surfaced in any search performed by this research or by any agent it delegated to; all reported
> none. The provenance of the DNS records described below was deliberately **not** investigated, for
> the same reason.

## The answer

**Use Resend. The runner-up is Postmark.**

Resend wins on the three things CAN-20 and CAN-31 actually turn on. Its free tier is 3,000 emails a
month at 100 a day, which covers verification and reset mail for a long time and does not expire. It
documents in as many words that there is **no approval process and no sandbox**, so the fourth
acceptance criterion — a test send reaching a real inbox — is achievable the moment DNS verifies. And
it is the only email provider that exists as a Vercel native integration, with a purpose-written
[better-auth page](https://resend.com/docs/send-with-better-auth) carrying the `waitUntil` guidance a
serverless deployment needs.

Postmark is the better-engineered service and this is not a comfortable margin. It separates
transactional from bulk traffic down to the IP ranges, has two sub-processors against Resend's
twenty-two, lets you configure retention from 7 to 365 days, and its published incident history is
far better. It loses on two facts: a **100 emails per month** free tier whose next rung is $15/mo,
and a **manual account review** that forbids sending outside your own verified domains until it
clears — which blocks CAN-20's fourth criterion on day one.

**The recommendation is not made because the zone already carries Resend records.** It carries them
(see below), and that lowers the cost of choosing Resend a little, but the switching cost in the
other direction is seven DNS records deleted and two added — Postmark needs only a DKIM `TXT` and a
`pm_bounces` `CNAME`. That is a ten-minute job, not lock-in. Note that the existing records have to
be deleted **whichever provider wins**, for the reasons in
[the security question](#the-existing-records-are-a-live-security-question), so choosing Resend saves
almost nothing in practice. If the evidence below reads differently to you, switch; nothing here is
expensive to undo.

### What would flip it to Postmark

Stated first because this decision is closer than the recommendation makes it sound.

- **Resend's sending reliability does not improve.** Its status page exposes only a rolling
  two-month window, and for 2026-07 to 2026-08 that window shows **13 incidents in about five weeks**
  and Resend's own posted **Email Sending and SMTP uptime of 99.77%** — roughly five hours a month.
  Postmark logged one incident over the same five weeks. Password-reset mail is the thing standing
  between a locked-out user and their account. Re-read
  [resend-status.com](https://resend-status.com/history) before CAN-31 ships and again a quarter
  later; if 99.77% is the trend rather than a bad patch, move.
- **A data-protection assessment cannot carry twenty-two US sub-processors.** Resend's
  [sub-processor list](https://resend.com/legal/subprocessors) (updated 2026-07-15) names 22
  entities, **every one in the USA**, including Anthropic ("Artificial Intelligence") and RunPod
  ("Self hosted LLM's"). Postmark's list is **Deft and AWS**. If CAN-21's terms of service work or a
  DPIA finds that chain unacceptable, Postmark is the answer.
- **The existing DKIM keys turn out to belong to a Resend team we do not control.** Resend states
  that "A domain can only be active on one Resend team at a time" and that "if someone else has
  already verified your domain in their own team, you will not be able to add it to yours"
  ([Managing domains](https://resend.com/docs/dashboard/domains/manage-domains)). If we cannot claim
  any name under `canoncore.com` on Resend, the decision is made for us. See
  [The existing records are a live security question](#the-existing-records-are-a-live-security-question).
- **Deliverability degrades in a way traceable to shared pools.** Resend puts everyone on shared IPs
  by default and publishes no claim that transactional mail is separated from its own marketing
  product. Postmark states the opposite in writing. A pattern of verification mail landing in spam is
  the signal.
- **Resend narrows or withdraws the free tier.** Its terms reserve the right to "modify the features,
  limits, or availability of the Free Tier" or to "cancel or discontinue the Free Tier". Once either
  provider is paid, $20/mo for Resend against $15/mo for Postmark is not a decisive argument, so a
  free tier that vanishes removes Resend's main advantage. SendGrid did exactly this in May 2025, so
  it is not a hypothetical.

**If cost or EU residency ever becomes the deciding axis, the answer is neither of these two — it is
ZeptoMail**, at roughly £2 per 10,000 emails with an EU data centre and a transactional-only sending
policy. It is not the runner-up today because it publishes no incident history and its Node SDK has
no public repository. See [The rest of the field](#the-rest-of-the-field).

### What choosing Resend commits us to

- **Every log and every piece of email metadata lives in the United States**, whichever sending
  region is chosen. Resend says this outright: "All account data, including email metadata, logs, and
  API records, is stored in the United States regardless of the sending region you select. Choosing
  `eu-west-1` means your emails are dispatched from Ireland, but your Resend account data still
  resides in the US" ([Regions](https://resend.com/docs/dashboard/domains/regions)). The DPA agrees:
  "Company's primary processing operations take place in the United States".
- **There is no London region.** The four are `us-east-1`, `eu-west-1` (Ireland), `sa-east-1` and
  `ap-northeast-1`. Ireland is the closest to `lhr1` and `eu-west-2`, and changing region later means
  deleting the domain and re-adding it.
- **An `MX` record on a return-path subdomain**, one level below whatever we send from. Postmark, by
  contrast, needs no `MX` at all.
- **Thresholds that are tight at low volume.** The AUP requires a complaint rate "lower than 0.08%"
  and a bounce rate "lower than 4%", and the quota documentation says breaching them can pause
  sending. At a hundred messages a month, one person clicking "mark as spam" is 1%.
- **A revocable free tier and a discretionary suspension right.** "We may terminate or suspend your
  account and bar access to Service immediately, without prior notice or liability, under our sole
  discretion, for any reason whatsoever"
  ([Terms of Service](https://resend.com/legal/terms-of-service), updated 2026-08-05).
- **Thirty days of logs, not configurable** below Enterprise. Shorter than Postmark's 45-day default,
  which is good for data minimisation and bad for investigating a report from three months ago.

## What the zone already carries

Read from the Namecheap dashboard on 2026-08-10 and confirmed by `dig` against the authoritative
servers. **Provenance was not investigated and must not be.** These are records that exist, of
unknown origin.

| Type | Host | Value | What it is |
| --- | --- | --- | --- |
| `A` | `@` | `216.198.79.1` | Vercel, apex |
| `CNAME` | `www` | `930a5c34adc350de.vercel-dns-017.com.` | Vercel, the canonical host |
| `CNAME` | `demo` | `bc3b9806163bfed9.vercel-dns-017.com.` | Vercel, resolves but the project 404s |
| `TXT` | `@` | `google-site-verification=HF_v7A7…` | Unrelated |
| `TXT` | `resend._domainkey` | `p=MIGfMA0…CQIDAQAB` | **Resend DKIM for `canoncore.com`** |
| `TXT` | `send` | `v=spf1 include:amazonses.com ~all` | Return-path SPF for `canoncore.com` |
| `MX` | `send` | `10 feedback-smtp.eu-west-1.amazonses.com.` | Return-path MX for `canoncore.com` |
| `TXT` | `resend._domainkey.send` | `p=MIGfMA0…wIDAQAB` | **Resend DKIM for `send.canoncore.com`** |
| `TXT` | `send.send` | `v=spf1 include:amazonses.com ~all` | Return-path SPF for `send.canoncore.com` |
| `MX` | `send.send` | `10 feedback-smtp.eu-west-1.amazonses.com.` | Return-path MX for `send.canoncore.com` |
| `TXT` | `_dmarc.send` | `v=DMARC1; p=none;` | DMARC for `send.canoncore.com` |

**There are two complete Resend domain entries here, not one plus a typo.** Resend's documented
default is that "Return-Path defaults to `send.example.com`"
([Add a domain](https://resend.com/docs/add-a-domain)), so a domain entry for `canoncore.com`
generates records at `resend._domainkey` and `send`, and a domain entry for `send.canoncore.com`
generates records at `resend._domainkey.send` and `send.send` — which is exactly what is present. The
`_dmarc.send` record clinches it: a paste error does not produce a coherent DMARC policy at the same
subdomain. Two distinct DKIM public keys confirm two separate entries. Both use
`feedback-smtp.eu-west-1.amazonses.com`, so both sit in Resend's Ireland region, and both confirm
Resend sends through Amazon SES — its sub-processor list names AWS as "Third party hosting and
sending provider".

**The two entries conflict with each other.** The apex entry's return path is `send.canoncore.com`,
which is simultaneously the second entry's sending domain. AWS, whose MAIL FROM machinery this is,
says plainly that "The MAIL FROM domain shouldn't be a subdomain that you also use to send email
from" ([Custom MAIL FROM](https://docs.aws.amazon.com/ses/latest/dg/mail-from.html)). Whatever else
CAN-20 does, it should not leave both standing.

**There is no apex DMARC and no apex SPF**, despite an apex DKIM key existing. `_dmarc.canoncore.com`
returns `NXDOMAIN`; the apex `TXT` is a single Google site-verification string. See
[The DMARC gap](#the-dmarc-gap).

**There is no wildcard.** `docs/infrastructure.md` recorded "a wildcard `* ALIAS` to
`cname.vercel-dns-017.com`" and said "the wildcard already resolves every hostname to Vercel". The
zone contains no `*` record of any type; arbitrary names return authoritative `NXDOMAIN`, and `www`
and `demo` are explicit per-host `CNAME`s. That file has since been corrected. Two consequences for
this ticket: **adding email records to this zone is unobstructed**, with no wildcard-precedence
question to answer; and **a sending subdomain will not resolve until its records exist**, so nothing
can be assumed live.

### The existing records are a live security question

A published DKIM public key means nothing on its own. It means something because somebody holds the
matching private key, and that somebody can sign mail as `canoncore.com` which will pass DKIM and
align under DMARC. There are two keys published here and this repository does not record who holds
either private half.

**What Resend documents.** A domain is exclusive to one team: "A domain can only be active on one
Resend team at a time", and "if someone else has already verified your domain in their own team, you
will not be able to add it to yours"
([Managing domains](https://resend.com/docs/dashboard/domains/manage-domains)). Deleting a domain is
a dashboard, API or CLI action. Account deletion queues "your account and all associated data… for
permanent deletion"
([Deleting an account](https://resend.com/docs/knowledge-base/how-can-i-delete-my-resend-account)).

**What Resend does not document, anywhere I could find.** Whether the private key survives domain
deletion; whether re-adding the same domain reissues the same key or a new one; whether a dormant or
unpaid account's domains are deactivated; and whether a deleted team's keys are destroyed or merely
detached. The [delete-domain API reference](https://resend.com/docs/api-reference/domains/delete-domain)
warns only about tracking-subdomain proxies. This is **unverified** and it is the load-bearing gap.

**What follows for CAN-20.** Three cases, and the remediation is the same in two of them.

1. **The account is Jacob's.** Then criteria one and two are largely met, and the work is cleanup plus
   the environment variables.
2. **The account exists and is not Jacob's.** Then whoever holds it can send DKIM-aligned mail as
   `canoncore.com` today, and Resend's exclusivity rule means Jacob **cannot verify `canoncore.com`
   on his own team at all** until they release it. Delete the DNS records — that revokes the signing
   authority immediately, because a DKIM signature is only checkable against a published key — and
   verify a fresh subdomain instead.
3. **The account no longer exists.** The records are then inert but still an unretracted claim in
   public DNS. Delete them anyway.

**In all three cases the answer is: delete every record you cannot account for, then verify a name
that nobody has claimed.** Removing a DKIM `TXT` record is the revocation mechanism; there is nothing
else to revoke. That is a further argument for verifying `mail.canoncore.com` rather than reusing
either existing name, and it is why an apex DMARC record at `p=none` with a reporting address should
go up first, so that anything still signing as `canoncore.com` shows up in a report.

## The comparison

Prices, allowances and retention read 2026-08-10.

| | Resend | Postmark | AWS SES | Mailgun |
| --- | --- | --- | --- | --- |
| Free tier | 3,000/mo, **100/day**, 1 domain | **100/mo**, no daily cap, up to 10 domains | **None**, only $200 of expiring credits | 100/day, 1 domain |
| First paid tier | $20/mo, 50,000 | $15/mo, 10,000 | à la carte, no minimum | $15/mo, 10,000 |
| Per 1,000 above | $0.90 | $1.80 | **$0.10** | $1.80 |
| Log retention | 30 days, fixed | 45 days, configurable 7–365 (+$5/mo, Pro) | none of its own; wire event destinations | **1 day** on Free and Basic |
| Approval gate | **None** | Manual, under 24h weekdays | **Sandbox**, reviewed production request | None documented |
| Day-one test to a real inbox? | Yes | Only after approval | **No** | Yes |
| DNS to verify | DKIM `TXT` + SPF `TXT` + `MX` on the return path | DKIM `TXT` + `pm_bounces` `CNAME` | **3 `CNAME`s**; `MX` only for custom MAIL FROM | 2 `TXT` + tracking `CNAME` + **two `MX`** |
| Subdomain required? | Return path only; sending subdomain recommended | No | Only for custom MAIL FROM | No (recommendation unverified) |
| EU sending | Ireland `eu-west-1`; **data in US** | **None**, all US, stated plainly | **`eu-west-2` (London)** | EU region, per-domain |
| Sub-processors | **22, all US** | **2** (Deft, AWS) | AWS itself | Sinch group, incl. a US entity |
| DPA self-serve? | Yes | Yes | Yes, auto-incorporated | Yes, but the artefact is stale |
| Transactional/bulk IP split | Not documented | **"does not mix… including IP ranges"** | Shared by default, no claim | Not documented |
| Test mode | Test recipient addresses only | **Test token + Sandbox servers** | **Mailbox simulator**, no reputation effect | `o:testmode`, discards, still billed |
| Vercel Marketplace | **Native, writes `RESEND_API_KEY`** | No | No | No |
| SDK | `resend@6.18.1` | `postmark@5.1.0` | `@aws-sdk/client-sesv2@3.1106.0` | `mailgun.js@13.3.0` |
| Governing law | California | Illinois | per AWS terms | **Texas** |

The four remaining candidates are in [The rest of the field](#the-rest-of-the-field). **ZeptoMail
comes closest to displacing Postmark** and is far cheaper than anything here; **SendGrid has no free
tier at all** since May 2025; Brevo and MailerSend both carry terms that forbid non-professional use.

## Resend

[Pricing](https://resend.com/pricing) ·
[Quotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits) ·
[Terms](https://resend.com/legal/terms-of-service) ·
[AUP](https://resend.com/legal/acceptable-use) ·
[DPA](https://resend.com/legal/dpa) ·
[Sub-processors](https://resend.com/legal/subprocessors) ·
[Status](https://resend-status.com/history)

**No approval, and they publish a document dedicated to saying so.**
[Does Resend require production approval?](https://resend.com/docs/knowledge-base/does-resend-require-production-approval):
"No, Resend does not require production approval. All accounts, including free accounts, have
immediate production access from the moment you sign up… There is no sandbox mode, no approval
process, and no waiting period." The only thing between signup and a real inbox is DNS verification,
which "will often verify within 15 minutes" but can take up to 72 hours. Before the domain verifies
you can send from `onboarding@resend.dev`, but **only to the email address on your own account**;
anything else returns `403`.

**Free tier.** 3,000 emails a month with a **daily quota of 100**, one domain, 30 days of retention,
one webhook endpoint. Both sent and inbound emails count, and multiple `To`, `CC` or `BCC` recipients
count separately. The API rate limit is **10 requests per second per team**, not per key. Pro is
$20/mo for 50,000 and $0.90 per additional 1,000. Region selection was Pro-only when the free tier
was announced in 2023 but was opened to everyone on
[2025-03-06](https://resend.com/changelog/multi-region-for-everyone): "If you're on the free plan and
would prefer a different region, you can change it to your preference."

**Domain verification** is DKIM `TXT` + SPF `TXT` + an `MX`, the last two on a return path that
"defaults to `send.example.com`" and is overridable through `customReturnPath`. Resend "strongly
recommend sending emails from a subdomain (e.g., `notifications.example.com`) instead of your root
domain (`example.com`) to conform to deliverability best practices", and notes "You can have multiple
subdomains associated with your root domain. But, each one must be configured and verified
individually." DMARC is a separate, post-verification step; Resend's
[DMARC page](https://resend.com/docs/dashboard/domains/dmarc) suggests
`v=DMARC1; p=none; rua=mailto:…` and notes "An email must pass either SPF or DKIM checks (but not
necessarily both) to achieve DMARC compliance."

**Namecheap is a first-class DNS provider in their docs.** The
[Namecheap guide](https://resend.com/docs/knowledge-base/namecheap) gives the exact fields, including
the one thing most likely to go wrong: "Omit your domain from the record values in Resend when you
paste. Instead of `send.example.com`, paste only `send`." The `send.send` records in the zone are
what happens when that instruction is followed for a domain that is itself a subdomain.

**Terms.** Recipients must have "explicitly opted in"; complaint rate "lower than 0.08%"; bounce rate
"lower than 4%"; opt-outs honoured "within 7 days". The free tier is expressly revocable. The DPA
binds on acceptance of the agreement, incorporates the EU SCCs and the UK Addendum, and deletes
account data "within 90 days of the account termination". Processing is in the United States.

**Integration.** `resend@6.18.1`, MIT, repo
[resend/resend-node](https://github.com/resend/resend-node), pushed 2026-08-09. The types in the
published tarball give the real signature:

```ts
declare class Resend {
  constructor(key?: string | undefined, options?: ResendOptions);
  readonly emails: Emails;
}

// Emails
send(payload: CreateEmailOptions, options?: CreateEmailRequestOptions): Promise<CreateEmailResponse>;

interface CreateEmailBaseOptions {
  from: string;        // "Your Name <sender@domain.com>"
  to: string | string[];
  subject: string;
  bcc?: string | string[];
  cc?: string | string[];
  replyTo?: string | string[];
  headers?: Record<string, string>;
  tags?: Tag[];
  attachments?: Attachment[];
  scheduledAt?: string;
}
// CreateEmailOptions additionally requires at least one of react | html | text.

type Response<T> = ({ data: T; error: null } | { error: ErrorResponse; data: null })
                 & { headers: Record<string, string> | null };
```

A failed send is a value to handle, not an exception to catch.

**better-auth.** The hook names and shapes come from better-auth's own
[`packages/core/src/types/init-options.ts`](https://github.com/better-auth/better-auth/blob/main/packages/core/src/types/init-options.ts):

```ts
sendVerificationEmail?: (
  data: { user: User; url: string; token: string },
  request?: Request,
) => Promise<void>;

sendResetPassword?: (
  data: { user: User; url: string; token: string },
  request?: Request,
) => Promise<void>;
```

The first lives under `emailVerification`, the second under `emailAndPassword`. better-auth's
[email page](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/concepts/email.mdx)
says "Better Auth works with any transactional email provider" and warns: "Avoid awaiting the email
sending to prevent timing attacks. On serverless platforms, use `waitUntil` or similar to ensure the
email is sent." Resend's [better-auth page](https://resend.com/docs/send-with-better-auth) repeats it:
"The hook examples below call `void resend.emails.send(...)` instead of awaiting it, as Better Auth
recommends, so the response time doesn't reveal whether an account exists. On serverless platforms,
wrap the send in `waitUntil` (or your platform's equivalent) so the function doesn't terminate before
the email is sent." **CAN-31 has to implement that, not just the send.**

better-auth itself recommends nobody. It does ship `@better-auth/infra` (`0.3.7`), whose `email`
module posts named templates to better-auth's own hosted "Dash email API" rather than to a provider.
That is a pre-1.0 fourth-party dependency that would put our mail through better-auth's
infrastructure and would not satisfy "a sending domain is verified with the provider" in any legible
way. Not a candidate.

**Reliability is the weak point.** See the flip conditions. The status page also shows an incident on
2026-07-30 titled "Test domain resend.dev failing test emails", worth knowing if the test addresses
end up load-bearing in CI.

**Longevity.** Y Combinator seed of $3M, then an
[$18M Series A led by Andreessen Horowitz announced 2024-12-04](https://resend.com/blog/series-a). No
Series B on their own blog. No price increase announced in two years; the Scale plan and
pay-as-you-go overages were additions.

## Postmark

[Pricing](https://postmarkapp.com/pricing) ·
[Approval process](https://postmarkapp.com/support/article/1084-how-does-the-account-approval-process-work) ·
[Message streams](https://postmarkapp.com/message-streams) ·
[EU privacy](https://postmarkapp.com/eu-privacy) ·
[Status history](https://status.postmarkapp.com/history)

**The approval gate is why it is the runner-up rather than the choice.** Postmark "manually review
each new account to ensure it won't be used to send emails that can potentially hurt our sending
reputation". Until it clears you "won't be able to send to any email address outside the domains
you've added to your account and verified". The review is "completed in less than 24 hours on
weekdays and a little longer on the weekends". `canoncore.com` has **no `MX` record at the apex**, so
there is no mailbox on the sending domain to test into — which means CAN-20's fourth criterion cannot
be met at all until approval lands. A day, not a wall, but a dependency the ticket does not
anticipate.

Nothing on any Postmark-owned page says hobby or pre-launch accounts are refused; they market to
"Side Projects" and "Bootstrapped Startups". The criteria are simply undisclosed.

**Free tier is 100 emails a month**, permanent — "Use it for however long you need, it doesn't
expire" — positioned for "Testing your integration / Evaluating Postmark's deliverability / Side
projects with low volume". There is no rung between it and Basic at $15/mo for 10,000; Postmark says
so: "We do not offer a tier between 100" and 10,000. Overage is $1.80 per 1,000 on Basic. Retention
is 45 days on every plan, configurable 7–365 days on Pro and above for $5/mo.

**The DNS is the simplest of any candidate.** A DKIM `TXT`, and a return-path `CNAME` at
`pm_bounces` pointing to `pm.mtasv.net`. **No `MX` and no SPF record**: "It is no longer required to
include Postmark in your own custom SPF record. Your emails sent through Postmark will always pass
SPF by default… since the Return-Path of all emails sent through Postmark already includes our
outbound sending IPs and SPF record."

**The IP separation is a written commitment.** "Transactional and broadcast (bulk) traffic does not
mix in Postmark, including IP ranges." Streams are typed at creation and the type "helps us group and
route emails into the right sending IPs". No other candidate makes this claim about itself.

**Data protection is the strongest of any candidate.** Two sub-processors, Deft and AWS, both US.
Retention stated plainly: "Postmark collects and retains content and metadata for all emails for 45
days", configurable down to 7. A Data Removal API exists. Against that, Postmark is candid that there
is no EU option at all: "Postmark is a US-based company and we also store our data in the US,
including personal data of our customers, and the data we process on behalf of our customers." The
DPA has been auto-incorporated since 2021-09-27, so "it is therefore no longer necessary to obtain a
signed copy."

**Test isolation is better than Resend's.** A literal test token, `POSTMARK_API_TEST`, validates the
call without sending; and Sandbox Servers "safely test out different parts of Postmark without
accidentally sending email to real recipients", where messages "are sent to a black hole". The
isolation is at the credential level, so a mistyped recipient still cannot escape. Resend's isolation
is at the recipient level, so a mistyped recipient does escape. Sandbox mode is on every plan
including Free.

**Integration.** `postmark@5.1.0`, repo
[ActiveCampaign/postmark.js](https://github.com/ActiveCampaign/postmark.js). The release cadence is
bursty: 4.0.5 in August 2024, then an eighteen-month gap, then 4.0.7 in February 2026 and 5.0.0 and
5.1.0 in July 2026. Fields are PascalCase and `MessageStream` is passed on every send:

```ts
import { ServerClient } from "postmark";

const postmark = new ServerClient(process.env.POSTMARK_SERVER_TOKEN!);

await postmark.sendEmail({
  From: "sender@example.com",
  To: "customer@example.com",
  Subject: "Reset your password",
  TextBody: "…",
  HtmlBody: "…",
  MessageStream: "outbound",
});
```

Postmark's better-auth material is an "AI Prompt" under
[integration/ai-prompts](https://postmarkapp.com/developer/integration/ai-prompts) rather than a
maintained page.

**Ownership.** Acquired by ActiveCampaign from Wildbit,
[announced 2022-05-03](https://www.activecampaign.com/about/newsroom/press-releases/activecampaign-acquires-postmark),
with a commitment that "Postmark and DMARC Digests will remain available as standalone products" —
which has held for four years. The contracting entity is now AC PM, LLC. The one pricing change in
two years was a **cut**: on 2025-08-06 Pro at 10,000 went from $60.50/mo to $16.50/mo and Platform
from $138/mo to $18/mo.

**Reliability.** Roughly 27 incidents over the twelve months to 2026-08, of which about five touched
outbound sending; the rest were webhook, statistics, inbound and UI delays. A full three-year archive
is published.

## AWS SES

Rejected, and the reason is the sandbox rather than the price.

[Every new account is in the sandbox](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html),
per Region: "You can only send mail **to** verified email addresses and domains, or to the Amazon SES
mailbox simulator", at "a maximum of 200 messages per 24-hour period" and "a maximum of 1 message per
second". Production access is a reviewed request from the console with an initial response "within 24
hours". **CAN-20's fourth criterion is unsatisfiable on day one on SES.** The
[mailbox simulator](https://docs.aws.amazon.com/ses/latest/dg/send-an-email-from-console.html) is
excellent — "Emails that you send to the mailbox simulator do not count toward your sending quota or
your bounce and complaint rates", and it works from inside the sandbox — but a simulator is not a
real inbox.

Everything else about SES suits this project. It runs in **`eu-west-2`**, the same region as the Neon
database and adjacent to `lhr1`. There is no free tier any more — the pricing page offers only "up to
$200 in AWS Free Tier credits" available "for 6 months after account creation" — but à la carte is
**$0.10 per 1,000** with no minimum, nine times cheaper than Resend's overage and eighteen times
cheaper than Postmark's. The GDPR DPA is incorporated automatically with the SCCs, nothing to sign.
Verification is three `CNAME`s for Easy DKIM; an `MX` is needed only for a custom MAIL FROM, and then
"you must publish **exactly one** MX record".

What it costs is everything else: no dashboard worth the name, no log retention of its own (you wire
configuration-set event destinations to CloudWatch or SNS and pay for them), a 1.85 MB SDK before its
transitive tree, and IAM to manage. For a solo developer whose failure mode is not shipping, that is
a lot of surface for a password-reset email. **Revisit if volume ever makes $0.10 per 1,000 matter**,
which for this product's shape means not for a very long time.

SES is nonetheless already in the picture: Resend runs on it, which is why the return-path records in
the zone point at `feedback-smtp.eu-west-1.amazonses.com`.

## Mailgun

Rejected. Two things decide it.

**One day of log retention on both the Free and the $15/mo Basic plan.** Five days needs Foundation
at $35/mo. Debugging a delivery complaint that arrives on Tuesday about Monday's email is not
possible.

**Four DNS records all marked required, including two `MX` records** — `10 mxa.mailgun.org` and
`10 mxb.mailgun.org` — whose stated purpose is inbound routing we do not want. The heaviest DNS
footprint of any candidate.

Beyond that: an unverified domain is capped at 300 emails a day; the AUP forbids more than one free
account "regardless of your corporate structure", so no separate staging account; test mode "will
accept the message but will not send it" and you are still "charged for messages sent in test mode",
which is weaker than either Postmark's sandbox or SES's simulator; and a UK operator contracts into
**Texas law with exclusive jurisdiction in San Antonio**. The EU region is genuine — "message data
never leaves the region in which it is processed" — but API keys are replicated globally and the
published DPA artefact is dated January 2023 and is in French.

Owned by Sinch since the
[Pathwire acquisition completed 2021-12-07](https://sinch.com/news/sinch-completes-acquisition-pathwire/),
roughly $1.9bn enterprise value.

## The rest of the field

Four more were investigated seriously. One of them nearly displaced Postmark as the runner-up.

### Zoho ZeptoMail — the one that nearly took second place

The best value in the field by a wide margin, and the only candidate whose product is *defined* as
transactional-only. [Pricing](https://www.zoho.com/zeptomail/pricing.html): "**1 credit = 10,000
emails**", each credit "valid up to 6 months from purchase", and "**Your first credit is on us!**"
The credit price is roughly **£2 per 10,000 emails**, so the entire volume this product will send for
years costs less than one month of Postmark. Domain verification is the lightest of anyone's — Zoho
tells you to skip SPF entirely: "To avoid redundancies, we recommend adding only the DKIM and CNAME
records for domain verification in ZeptoMail." An **EU data centre** exists (Amsterdam primary,
Dublin secondary). Message content storage is **opt-in and off by default**. Its
[sandbox](https://www.zoho.com/zeptomail/help/agent-sandbox.html) is the richest here: it "allows you
to test outgoing emails without having them delivered to the recipient", with addresses that simulate
hard bounce, soft bounce, policy failure, spam, user-not-found and invalid DNS, **and webhooks fire**,
so bounce handling can be integration-tested end to end. And its
[introduction](https://www.zoho.com/zeptomail/help/introduction.html) states the separation argument
outright: "We do not support sending of bulk emails or promotional emails like newsletters or
marketing campaign emails… Bulk email sending IPs have a low reputation… If we allow bulk emails, our
IPs' reputation is at stake."

**Why it is not the runner-up.** Four things, and the last is the one that decides it.

- **Every account is reviewed.** "Every new account in ZeptoMail is reviewed by our team to ensure its
  authenticity", against whether "your email-sending goals align with ZeptoMail's transactional
  email-only policy", typically two business days. Until it completes, "the Buy credits button will
  be disabled" — so a stalled review caps you at the free trial permanently. Same class of gate as
  Postmark's.
- **The region is fixed at signup and cannot be changed.** Zoho assigns a data centre at account
  creation and states that a user with an account in one "cannot sign up in another DC with the same
  email address". You must sign up at `zoho.eu`, not `zoho.com`, and getting it wrong is not
  recoverable without closing the account. ZeptoMail is absent from Zoho's DC-migration article.
- **There is no public incident history.** `us.zohostatus.com` shows current status only, and the EU
  status page is behind a sign-in wall. Every other candidate here publishes months or years of
  incidents. That is not a small thing for a service in the login path.
- **The `zeptomail` npm package has no public repository.** No issue tracker, no commit history, no
  way to read the code you are depending on or to see whether a bug you file will ever be looked at.
  Against `resend-node` and `postmark.js`, both public and both readable, that is a real difference
  for a decision meant to hold for years. Zoho's own sub-processor page also renders client-side and
  could not be read, so the sub-processor chain is **unknown** — for a service that will carry a
  terms of service, that is a gap, not a detail.

**It is the right answer if cost ever becomes the deciding axis**, or if EU residency becomes a hard
requirement that Resend and Postmark cannot meet. Nothing else here comes close on either.

### Brevo

French, EU-hosted, and generous: **300 emails a day forever**, which is three times Resend's daily
allowance. Its content-retention defaults are the best of any candidate — transactional logs are kept
but previews default to **never stored**, with Brevo's own reasoning being "if your transactional
emails contain private or sensitive recipient information (such as personal data, authentication
codes, or legal content)". That is exactly our payload. The DPA is Appendix 3 of the public terms, no
signature, and it defines "EEA" to include the United Kingdom. Sandbox mode is a single header,
`X-Sib-Sandbox: drop`.

Three things rule it out. **Its terms exclude non-professional use**: "You also agree to use our
Services for the **sole purpose of your professional activity, excluding any use as a
non-professional or consumer**." CanonCore is a public service but not a business, and that clause
sits badly next to a Vercel Hobby plan that itself "restricts users to non-commercial, personal use
only" — the two read as mutually exclusive. **Accounts are deleted after six months without a
login**, permanently and with no restoration. And **transactional sending needs a second, separate
human activation** beyond account approval: "Transactional email sending requires a separate
activation step from Brevo… contact our support team by creating a ticket from your account to
request activation", with no published turnaround. Its status page also shows roughly ten incidents a
month over the last quarter, including "Transactional email sending halted" on 2026-06-16.

### MailerSend

The healthiest SDK in the field — `mailersend@3.2.0` published 2026-08-10, ships its own types, two
runtime dependencies — and a fully self-serve DPA effective on acceptance of the terms, with hosting
in Google Cloud Belgium.

Ruled out on three counts. **Twenty-four hours of log retention on the free plan**, one day on Hobby,
seven on Starter. **No test mode of any kind** — the sandbox feature request on their own SDK
repository has been open since 2026-03-27; what exists simulates failures only, with no happy-path
test recipient. And the terms of use prohibit personal use in two separate places: use is permitted
"solely for purposes relating to your trade, business, craft, or profession as these Services are not
intended for personal use", and "You are not authorized to use the Services for personal, family, or
household purposes". The free tier has also been cut twice, from 12,000 to 3,000 to 500 a month.

### SendGrid

**SendGrid no longer has a free tier.** Twilio retired it:
"Twilio SendGrid will be retiring its Free Email API and Free Marketing Campaigns plan starting May
27, 2025… After that, an upgrade to a paid plan will be required to continue sending email"
([changelog](https://www.twilio.com/en-us/changelog/sendgrid-free-plan)). What remains is a 60-day
trial at 100 a day, after which "Any active email send integration using your account's API keys will
stop sending messages." The floor is **$19.95/mo**. That alone removes it from a pre-launch project's
shortlist, and it is the clearest example in this whole exercise of a provider changing the deal for
existing free users.

Beyond price it is the weakest fit on the axes this project cares about. **EU data residency requires
the Pro plan at $89.95/mo**, and SendGrid is explicitly carved out of Twilio's Binding Corporate
Rules: "the Twilio BCRs do not serve as a transfer mechanism for the SendGrid Services". **It is the
only candidate that admits its shared pool is contaminated by marketing mail**: "Marketing mail (the
primary type of mail sent by other shared IP pool users) inherently lowers IP reputation", and
customers cannot request a different pool. It is the only candidate that **forces a subdomain**
(`em####.example.com`). And `@sendgrid/mail` has had no feature work in two years — every commit since
2024 is a dependency bump, a licence-year update or a release tag.

It has three genuine merits worth recording. It **does not store message bodies at all**: "Twilio
SendGrid does not offer inbox services, nor do we store email content of emails processed and sent
through our servers." Its sandbox mode is real and documented — `mail_settings.sandbox_mode`, where
"The email will never be delivered while this feature is enabled" and "No Credits will be consumed",
returning `200 OK` rather than the usual `202`. And its Email Policy explicitly exempts our exact
traffic from consent and opt-out requirements, naming account confirmations and password resets.

**Twilio is not selling SendGrid.** No first-party divestiture, spin-off or strategic-review
announcement exists; the only such review was for Segment and it concluded by keeping the business.
`sendgrid.com` folded into `twilio.com` on 2026-02-26, which is consolidation rather than divestment.
Any claim to the contrary is press speculation and was not relied on.

## Apex or subdomain: send from a subdomain

The zone shows both were set up at some point. They should not both stand, and the one to keep is a
subdomain.

**Resend recommends it in its own words**: "We strongly recommend sending emails from a subdomain
(e.g., `notifications.example.com`) instead of your root domain (`example.com`) to conform to
deliverability best practices" ([Add a domain](https://resend.com/docs/add-a-domain)). Postmark
frames the same thing as long-standing advice: "we have always recommended separating transactional
traffic from other types of email by using different sending IPs **and From domains**"
([Message streams](https://postmarkapp.com/message-streams)). AWS's constraint on the MAIL FROM
domain is the third leg: it "shouldn't be a subdomain that you also use to send email from", which is
exactly the collision the current zone has.

The reasoning is containment. A sending domain accumulates reputation, and a bad month on one is a
bad month for everything sharing that name. Keeping mail off the apex means a deliverability problem
never reaches `www.canoncore.com`, and it means a future second stream (notifications, digests) can
be a separate subdomain with a separate reputation rather than sharing one.

**Be precise about what a subdomain does not buy you.** Google's bulk-sender threshold aggregates
across the whole organisational domain: "Messages sent from the same primary domain count toward the
5,000 limit", with their own worked example being 2,500 from a root plus 2,500 from a subdomain
adding up to bulk status. Subdomains isolate reputation, not volume accounting.

**Use `mail.canoncore.com`**, not either name currently in the zone. `canoncore.com` may be locked to
a Resend team we do not control, and `send.canoncore.com` is a return-path name doing double duty as
a sending domain, which is the collision above. `mail.` is unclaimed, reads correctly in a `From:`
header, and its return path lands at `send.mail.canoncore.com` where it belongs. It is also a sibling
of `www`, so [ADR-0010](../adr/0010-canonical-host-www.md) is untouched: the session cookie is
host-only and adding a mail subdomain cannot widen it.

## The DMARC gap

**Nothing requires DMARC of us.** Google requires of all senders only "SPF **or** DKIM"; DMARC, both
SPF and DKIM, and From-header alignment are listed under "Requirements for sending 5,000 or more
messages per day". Yahoo matches: "Implement SPF or DKIM at a minimum" for all senders, with DMARC
"at least p=none" under bulk. Microsoft's requirements start at "more than 5,000 emails per day".
Publish it anyway, for four reasons that are cheap to state and expensive to discover late.

1. **It is the only thing that makes the other two mean anything to a receiver.** SPF and DKIM tell a
   receiver a message was authorised; DMARC tells it what to do when they fail.
2. **The apex currently publishes a DKIM key and no policy at all.** A `p=none` record with a
   reporting address is how we would find out that something is still signing as `canoncore.com` —
   which, given the unaccounted keys, is a question we actively have.
3. **Google's bulk status is permanent and retroactive.** "Senders who meet the above criteria at
   least once are permanently considered bulk senders", and "Bulk sender status doesn't have an
   expiration date". One day over 5,000 across the whole primary domain and DMARC becomes mandatory
   forever. Publishing it now costs one `TXT` record; publishing it under pressure does not.
4. **Gmail is enforcing harder.** "Starting November 2025, Gmail is ramping up its enforcement on
   non-compliant traffic. Messages that fail to meet the email sender requirements will experience
   disruptions, including temporary and permanent rejections."

Publish at the apex, at `p=none`, with a real reporting inbox:

```
_dmarc.canoncore.com.  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@mail.canoncore.com;"
```

**The reporting address cannot be an ordinary personal inbox, and this is easy to get wrong.**
RFC 7489 makes a `rua` address outside the publishing domain's Organizational Domain conditional on
the *receiving* side opting in: the report generator queries
`<policy-domain>._report._dmarc.<destination-domain>` for a `v=DMARC1` record, and "where the above
algorithm fails to confirm that the external reporting was authorized by the Report Receiver, the
URI MUST be ignored by the Mail Receiver generating the report"
([RFC 7489 §7.1](https://datatracker.ietf.org/doc/html/rfc7489#section-7.1)). Point `rua` at an
iCloud or Gmail address and conforming receivers discard it silently, so the record looks correct and
produces nothing.

The test is the **Organizational Domain**, not an exact host match, so `dmarc@mail.canoncore.com`
is in scope for a policy published at `_dmarc.canoncore.com` and needs no authorisation record. That
is why receiving is enabled on `mail.canoncore.com`: it makes the reporting address one we control
inside our own domain, and Resend's inbound tooling can read the reports.

`p=none` is monitor-only and changes nothing about delivery. It is the right starting policy while
the sending picture is still being established, and it is exactly what Resend's own DMARC page and
Yahoo's bulk requirement both name as the minimum. Tighten to `quarantine` only once reports show a
clean picture for the mail we actually send. An apex policy covers subdomains by default, so
`mail.canoncore.com` inherits it and needs no record of its own.

One-click unsubscribe does **not** apply. Google: "One-click unsubscribe is required only for
marketing and promotional messages. Transactional messages are excluded from this requirement. Some
examples of transactional messages are password reset messages, reservation confirmations, and form
submission confirmations." Yahoo says the same. Note Google's caveat that "Message recipients, not
Google, determine the nature of the messages they receive", which is an argument for keeping
verification and reset mail visibly transactional in tone.

The remaining all-sender requirements — a valid forward and reverse DNS record for the sending IP,
TLS in transit, and a spam rate under 0.3% — are the provider's to satisfy, because we do not own the
sending IPs. That is itself a reason to use a provider rather than send from a function; Vercel's own
guidance is that "to send emails from Vercel without restrictions, we recommend the use of
third-party mail services".

## Preview versus production

CAN-20 asks for the API key in production and preview. What previews should actually send is a
separate question, and the honest answer for Resend is **the same domain, a second key, and test
recipient addresses in code** — because Resend has no test credential.

- **Resend** has no sandbox and no test API key; it says so. Isolation comes from the *recipient*:
  `delivered@resend.dev`, `bounced@resend.dev`, `complained@resend.dev` and `suppressed@resend.dev`
  simulate each outcome "without damaging your domain reputation". But "Test emails count against
  your account's sending quota", and a mistyped real address in a preview **will send for real**. The
  mitigation is a separate API key per environment, so a leaked or abused preview key can be revoked
  alone, plus a guard in the application that refuses non-`resend.dev` recipients outside production.
  The free tier allows **one domain**, so previews cannot have their own.
- **Postmark** isolates at the credential: a Sandbox Server's messages "are sent to a black hole", and
  `POSTMARK_API_TEST` validates without sending. A wrong recipient cannot escape.
- **SES** has the mailbox simulator, which uniquely does not consume the daily quota or affect
  reputation metrics.
- **Mailgun**'s `o:testmode` accepts and discards but bills you, and cannot exercise a bounce.

This is the axis on which Postmark is clearly better, and it is worth restating in CAN-31.

## What CAN-20 actually did

This section was a runbook. CAN-20 executed it on 10 August 2026, so what is provisioned — the
account, the domain, the five DNS records, the two API keys and the delivery evidence — is recorded
in [`docs/infrastructure.md`](../infrastructure.md), and the decision itself is
[ADR-0011](../adr/0011-transactional-email-resend.md). Keeping a second copy of the steps here would
only let the two drift.

Three things are worth carrying forward, because they were discovered by doing it rather than by
reading:

- **The free tier allows one domain.** Adding `mail.canoncore.com` required deleting the existing
  `canoncore.com` entry first, so there is a window with no verified sending domain. Plan for it.
- **Namecheap will not remove the last MX record** while Mail Settings is set to Custom MX. Edit that
  row into the one you want instead of deleting it.
- **Namecheap's record-type selector is a select2 widget**, so setting the underlying `<select>`
  programmatically does not reach Angular's model and the save silently no-ops. Drive it through
  jQuery, or use the UI.

## Unverified

Everything below could not be pinned to a page owned by the party making the claim.

| Claim | Why it is unverified | How to settle it |
| --- | --- | --- |
| ~~Who holds the private keys for `resend._domainkey` and `resend._domainkey.send`~~ | **Settled 10 August 2026.** `canoncore.com` was verified in this account; `send.canoncore.com` did not appear in it at all. Both records are deleted, so both keys are revoked | — |
| Whether a Resend private key survives domain deletion, and whether re-adding a domain reissues the same key | Resend documents neither. The delete-domain reference warns only about tracking proxies | Ask Resend support. Until then, deleting the published `TXT` is the revocation |
| Whether Resend deactivates domains on dormant or unpaid accounts | Not documented | Ask Resend support |
| ~~Whether `mail.canoncore.com` can be verified if `canoncore.com` is held by another Resend team~~ | **Not reached.** `canoncore.com` turned out to be ours, so the exclusivity rule was never tested against a subdomain. Still open if it ever matters | Only settleable against a domain another team holds |
| Resend's incident history beyond about two months | [resend-status.com](https://resend-status.com/history) exposes only a rolling window and ignores date parameters | Re-read monthly and keep a running count. The 99.77% figure is Resend's own for 2026-07 to 2026-08 |
| Whether Postmark refuses hobby or zero-traffic accounts | No Postmark-owned page states any criterion; they market to side projects. The approval criteria are undisclosed | Only settleable by applying |
| Whether a Hobby account may install a native Marketplace integration | Vercel's docs neither permit nor forbid it; the Marketplace terms require a payment method and say access "is not guaranteed for all Vercel users" | Moot under this recommendation, which declines the integration |
| Whether Microsoft's Outlook rejection (`550 5.7.515`) is live, versus Junk-routing only | Microsoft's own post contains both statements and no follow-up names a rejection date | Does not bind us below 5,000/day either way |
| Whether Google computes a spam rate at all at very low volume | Postmaster Tools lists "You send too little email" as a diagnostic; no minimum volume is published | Watch Postmaster Tools once real mail flows |
| That Vercel offers no first-party email product | Established by absence, plus Vercel's own KB recommending "third-party mail services" | Absence of evidence. Re-check if one is ever announced |
| How Namecheap splits a `TXT` value over 255 octets on the wire | Not documented; the 255-character figure circulating is a cPanel constraint, not BasicDNS | `dig` the record after adding it |
| Exact SES custom MAIL FROM SPF string | AWS's record table renders as a placeholder in text extraction | Irrelevant unless SES is chosen; the console generates it |
| Mailgun free-plan recipient restrictions without a card | Mailgun's help centre is behind Cloudflare and would not render | Only matters if Mailgun is reconsidered |
| ZeptoMail's sub-processor list | Zoho's sub-processor page renders client-side and returned "Loading data…"; four candidate JSON endpoints all 404 | Needs a browser. Settle before ZeptoMail is ever adopted, because CAN-21's terms depend on it |
| ZeptoMail's incident history | `us.zohostatus.com` shows current status only; `eu.zohostatus.com` is behind a sign-in wall | Needs an authenticated session |
| Whether ZeptoMail sandbox sends consume credits | Not stated; the 10,000/day sandbox quota exceeds a whole credit, which implies not | Only matters if ZeptoMail is adopted |
| Brevo's 12-month incident total | The status page paginates client-side; only about three months was retrievable | Needs a browser |
| MailerSend's message-body retention | No MailerSend page states how long a rendered body is kept, and it is not configurable | Only matters if MailerSend is reconsidered |
| Where MailerSend's free tier went from 3,000 to 500 | No company-owned announcement found for the second cut | The direction is established by the first cut, which they did announce |
| SendGrid's Email Activity add-on price | Not published; purchased in-console behind a login | Moot — SendGrid is rejected on the free-tier removal alone |
