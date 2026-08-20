# Test inboxes: reading the mail this project sends

**Researched 2026-08-18**, prompted by the day's work on
[CAN-136 Production cannot send email: Resend refuses the API key with 401](https://linear.app/jacobrees-canoncore/issue/CAN-136),
which could only be closed by sending real verification and reset mail to
`jacob.rees@vepple.com` and then opening Mail.app to see where it landed. The question is how to stop
doing that: dedicated inboxes that receive the mail and can be read by a program.

Every price, limit, endpoint and quotation below was read on that date from the page that owns it —
Resend's documentation index, its receiving pages, its API reference, its published
[OpenAPI specification](https://resend.com/openapi.json), its testing knowledge base, its usage-limits
page and its pricing page; Playwright's own best-practices page; each other vendor's own documentation
and pricing pages; the RFCs; and Google's and Microsoft's own postmaster pages. Nothing here comes
from a comparison article, a listicle, a roundup or a summary. Where a claim could only be reached
second-hand it is marked **unverified** and collected at the end.

**One further class of evidence, and it is the most perishable thing here.** The live
`jacobreesnew@gmail.com` Resend account was read on 18 August 2026 through the `resend` MCP, which
authenticates by OAuth and used no API key. Those observations are marked *measured* where they
appear, and they are what settles the central question rather than any documentation page.

> **Exclusion note.** Per this repository's standing constraint, no repository or page matching
> `canoncore*`, `CanonCore*` or `universora*` was read, fetched, cloned or quoted. Three agents did
> the vendor legwork; each was asked afterwards whether such a source had surfaced and each answered
> no. The local-capture sweep ran no open web search at all — every retrieval was direct to a named
> host — and the deliverability sweep touched only the vendors' own domains plus Google's and
> Microsoft's sender-support pages and `rfc-editor.org`. The string *CanonCore* appears in their
> sessions only as this working directory's path and this repository's own `CLAUDE.md`, which is this
> project rather than a prior one, and neither was read for the task.

## Contents

- [The answer](#the-answer)
- [What was measured against the live account](#what-was-measured-against-the-live-account)
- [The four simulator addresses, and the wall they hit](#the-four-simulator-addresses-and-the-wall-they-hit)
- [Receiving is already on, and it is a catch-all](#receiving-is-already-on-and-it-is-a-catch-all)
- [What it costs: two quota units and a full-access key](#what-it-costs-two-quota-units-and-a-full-access-key)
- [The guard in `send.ts`, and what any proposal has to do about it](#the-guard-in-sendts-and-what-any-proposal-has-to-do-about-it)
- [The categories of solution, and which ones can reach this project at all](#the-categories-of-solution-and-which-ones-can-reach-this-project-at-all)
- [Per-test addresses: plus-addressing and catch-alls](#per-test-addresses-plus-addressing-and-catch-alls)
- [What is actually done end to end, as against unit-testing the send](#what-is-actually-done-end-to-end-as-against-unit-testing-the-send)
- [Deliverability is a second question, and no test inbox answers it](#deliverability-is-a-second-question-and-no-test-inbox-answers-it)
- [The recommendation, in layers](#the-recommendation-in-layers)
- [Unverified](#unverified)

## The answer

**Use Resend's own inbound receiving on `mail.canoncore.com`. It is already provisioned, it is
already a catch-all, and it already works — the round trip was measured at 2.4 seconds.** No new
vendor, no new account and no SMTP host.

Three facts make it the answer rather than merely an option, and each was measured rather than read:

- **Any address at the domain is a mailbox.** Resend states that "*any email* sent to your receiving
  domain will be received", so `signup-8f21@mail.canoncore.com` needs no provisioning at all
  ([Receiving Emails](https://resend.com/docs/dashboard/receiving/introduction)).
- **The message is readable back over the API, body and headers.** `GET /emails/receiving/:id`
  returns `html`, `text` and `headers`, and a signed URL to the raw RFC 5322 message. A message
  received on 10 August 2026 was read in full on 18 August.
- **A webhook is not required.** "Resend stores emails as soon as they come in", and they can be
  retrieved without any endpoint being configured. The account carries **zero webhooks** and the
  round-trip message was still readable.

> **Acted on, 20 August 2026, by CAN-140 Verify a real send against our own inbox, not a personal
> mailbox.** All three steps of *The one real change* below have landed: the guard admits
> `@mail.canoncore.com`, `apps/web/e2e/verification-by-inbox.spec.ts` reads the inbox by hand against a
> preview, and the `full_access` key exists — `canoncore-inbox-reading`, held in a password manager and
> in no variable anywhere. This document is the evidence under that change and is left as it was
> measured; `docs/infrastructure.md` → *Reading the inbox* is the record of what was built.

**Three things it does not do, and one of them is the reason not to stop here.**

It does not answer *Inbox or Junk*, because it is not a consumer mailbox provider and has no spam
folder — see [Deliverability is a second question](#deliverability-is-a-second-question-and-no-test-inbox-answers-it).
It does not fit inside the `resend.dev`-only guard in `apps/web/src/mail/send.ts` without that guard
being widened. And reading it over the API needs a **`full_access`** key, which is a strictly larger
credential than the two `sending_access` keys this project holds.

**Everything in the local-SMTP-capture category is inapplicable here, and the reason is narrower than
"we do not use SMTP".** Mailpit, MailHog, Inbucket, maildev and Ethereal all capture **SMTP**, and
`apps/web/src/mail/send.ts` makes one HTTPS POST to `https://api.resend.com/emails`.
**Resend does offer SMTP** — `smtp.resend.com`, username `resend`, password the API key
([Send emails with SMTP](https://resend.com/docs/send-with-smtp)) — so the transport is a choice this
project made rather than a constraint it is under, and it would be dishonest to rule the category out
on a false premise. What rules it out is what that choice was *for*: `send.ts` records that "the
boundary a test has to control is the network", and stubbing `fetch` is what lets a test read the real
body including the link better-auth put in it. Moving to SMTP to make a local catcher usable would
trade a seam that works for one that needs a daemon, and would still capture only what a test already
sees.

## What was measured against the live account

Read through the `resend` MCP on 18 August 2026, on the `jacobreesnew@gmail.com` account. **The MCP
authenticates by OAuth against a browser login and carries no API key**, which is itself one of the
findings: an agent can read this account's inbound mail today without a credential existing anywhere.

| Probe | What came back |
| --- | --- |
| `list-domains` | One domain, `mail.canoncore.com`, `verified`, `eu-west-1`, **Sending enabled and Receiving enabled** |
| `list-webhooks` | **Zero.** Nothing is subscribed to `email.received`, and inbound is readable anyway |
| `list-received-emails` | Two messages. A Google DMARC report to `dmarc@mail.canoncore.com` (11 August), and `Inbound round-trip check` from `noreply@mail.canoncore.com` to `test@mail.canoncore.com` (10 August) |
| `get-received-email` on the round trip | The full plain-text body, **eight days after it was received**, plus a signed CloudFront URL for the raw message |
| `list-emails` | Twelve sent messages, the oldest 10 August — consistent with the free tier's 30-day retention. Two of them were sent to `jacob.rees@vepple.com` this morning, which is the practice this document is about |

**The round trip is 2.4 seconds.** The send is logged at `2026-08-10 14:40:00.712+00` and the receipt
at `2026-08-10T14:40:03.107Z`. That is one measurement of one message, not a distribution, but it is
the number that decides whether a test can poll for the message rather than wait on a human.

**The raw message download URL is signed and lives one hour**, measured: issued `13:54:39Z`, expiring
`14:54:39Z`. That matches what the attachments page states for attachment `download_url`s. It has to
be re-fetched from the API rather than stored.

### What the raw message carries, which is more than the body

The raw download of the round-trip message was read directly. Resend's inbound path is Amazon SES
receiving — the `MX` is `inbound-smtp.eu-west-1.amazonaws.com` — and the headers it stamps on are
worth knowing about, because they are a receiving-side verdict rather than a sending-side one:

```
Received: from a3-16.smtp-out.eu-west-1.amazonses.com ...
 by inbound-smtp.eu-west-1.amazonaws.com with SMTP id 1gl6p1uj7rk3uke5de2jmf90oojo9pphs9rufm81
 for test@mail.canoncore.com;
X-SES-Spam-Verdict: PASS
X-SES-Virus-Verdict: PASS
Authentication-Results: amazonses.com;
 spf=pass ...; dkim=pass header.i=@mail.canoncore.com;
 dkim=pass header.i=@amazonses.com; dmarc=pass header.from=mail.canoncore.com;
```

**So an inbound copy proves SPF, DKIM and DMARC as a real receiver computed them**, and carries a
spam and a virus verdict from that receiver. That is a genuine independent check and it is the same
class of evidence `docs/incidents.md` → *The delivered test message passed all three checks* recorded
from iCloud on 10 August 2026. **It is not the same claim**: iCloud also said
`X-Apple-Movetofolder: INBOX`, and nothing SES stamps is equivalent to that.

The `for test@mail.canoncore.com` clause in the `Received` header is what makes per-test addresses
usable — the specific recipient survives, so a test can match on it.

## The four simulator addresses, and the wall they hit

`delivered@`, `bounced@`, `complained@` and `suppressed@resend.dev` each "simulate a different
delivery event" ([What email addresses to use for
testing](https://resend.com/docs/knowledge-base/what-email-addresses-to-use-for-testing)). They are
the whole of Resend's isolation story, because there is no sandbox and no test credential
([ADR-0011](../adr/0011-transactional-email-resend.md)).

**They accept mail and produce an event. Nothing anywhere lets you read the message back from them.**
No endpoint in the API reference exposes a simulator mailbox, and the `list-received-emails` endpoint
"only returns emails received by your team" — a `resend.dev` address is not your team's. That is the
limitation this research exists to answer, and it is established by the absence of any such endpoint
rather than by a sentence saying so.

**But the body is not actually lost, and this is easy to miss.** `GET /emails/:id` on the *sent*
message returns `html`, `text` and `last_event`
([Retrieve Sent Email](https://resend.com/docs/api-reference/emails/retrieve-email)). So the
verification link inside a message sent to `delivered@resend.dev` **is** recoverable — from the
sender's own record, not from a mailbox. For getting a link out of a production send that no stub can
intercept, that is the cheapest route there is, and it needs no inbound at all. What it cannot tell
you is that anything arrived, because it is a copy of what left.

**Two smaller facts that matter.** Test sends "count against your account's sending quota". And
Resend refuses `@example.com` and `@test.com` outright with a `422`, because those domains bounce and
bounces cost reputation — so the obvious placeholder domains are not an option either.

## Receiving is already on, and it is a catch-all

`docs/infrastructure.md` → *Transactional email: Resend* records receiving as enabled for DMARC
reports, with the `MX` at host `mail` pointing to `inbound-smtp.eu-west-1.amazonaws.com`. What that
line understates is how much it buys.

**Every address at the domain already exists.** Resend states it twice, once in a callout and once in
its FAQ: "*any email* sent to your receiving domain will be received by Resend and forwarded to your
webhook … if your domain is `yourdomain.tld`, you will receive emails sent to `anything@yourdomain.tld`",
and "Yes. Once you add the MX record … you will receive emails for any address at that domain"
([Receiving Emails](https://resend.com/docs/dashboard/receiving/introduction)). There is no mailbox
to create, no alias to register and no per-address configuration. A test can invent
`reset-<uuid>@mail.canoncore.com` and it is a mailbox.

**The webhook is optional for this purpose.** Resend's own framing is webhook-first, and every code
sample on those pages starts from an `email.received` POST. But its FAQ answers the question directly:
"Will I lose my emails if my webhook endpoint is down? **No.** … Resend stores emails as soon as they
come in. Even if your webhook endpoint is down, you can still see your emails in the dashboard and
retrieve them using the Receiving API." The account carries no webhook at all and both received
messages are readable. **A webhook would be the right answer for a product feature and is the wrong
answer for a test**, which would then need a public endpoint, a signature check and somewhere to put
the message.

### The reading surface

| Route | What it gives | Auth |
| --- | --- | --- |
| `GET /emails/receiving` | Metadata for every message the team received: `from`, `to`, `subject`, `message_id`, timestamps, attachment metadata. `limit` max 100, cursor pagination with `before`/`after`. **No filter by recipient or subject** | API key, `full_access` |
| `GET /emails/receiving/:id` | `html`, `text`, `headers`, `received_for`, and `raw.download_url` with `raw.expires_at` | API key, `full_access` |
| `GET /emails/receiving/:id/attachments` | Attachment metadata and one-hour `download_url`s | API key, `full_access` |
| `resend emails receiving list` / `get` / `listen` | The same three, from the CLI. `listen` **polls** for new inbound mail and prints it as it arrives | API key, from `--api-key`, `RESEND_API_KEY` or `resend login` |
| The `resend` MCP | `list-received-emails`, `get-received-email`, `list-received-email-attachments` | **OAuth. No API key at all** |

The absence of a recipient filter is the one awkward edge: a caller pages the list and matches `to`
itself. At this project's volume — twelve sent messages in the whole account, two received — that is
one request.

## What it costs: two quota units and a full-access key

**A round trip spends two of the hundred a day, not one.** Resend's usage-limits page is explicit:
"Both sent and received emails count towards these quotas"
([Usage Limits](https://resend.com/docs/api-reference/rate-limit)). So the ceiling on inbound
round-trip checks is fifty a day, against a free tier of 3,000 a month and 100 a day. That is ample
for verification by hand and tight for anything that runs on every push.

**The API rate limit is ten requests a second per team**, which no polling loop this project would
write can approach.

**The credential is the real cost.** Resend has exactly two permissions:
`full_access` — "Can create, delete, get, and update any resource" — and `sending_access` —
"Can only send emails"
([Create API key](https://resend.com/docs/api-reference/api-keys/create-api-key)). Both keys this
project holds are `sending_access` restricted to `mail.canoncore.com`, deliberately, so that
"neither can read logs, manage domains or create further keys" (`docs/infrastructure.md` → *The keys*).
**Reading inbound mail requires the permission that can also delete the domain and mint further
keys.** There is no narrower scope to ask for.

That fact should decide *where* such a key may live, not whether inbound is used:

- **An agent or a person needs no key.** The `resend` MCP reads inbound over OAuth, which is how every
  measurement above was taken. This is the route that costs nothing.
- **A laptop can hold one.** `resend login` stores the key in the macOS Keychain rather than in a file.
- **A GitHub Actions secret is where it should not go.** `docs/infrastructure.md` already argues the
  general case — an automated check "would need `RESEND_API_KEY` as a GitHub Actions secret — a second
  store for a credential that lives in Vercel" — and this key would be strictly more powerful than the
  one that argument was about.

## The guard in `send.ts`, and what any proposal has to do about it

> **The first option below is what was done**, on 20 August 2026. The code quoted here is the version
> this was researched against; `apps/web/src/mail/send.ts` now admits both domains, and its
> `receiving` constant carries the argument beside the code.

```ts
export function mayBeSentTo(recipient: string, environment: string | undefined): boolean {
  if (environment === "production") return true;
  return recipient.toLowerCase().endsWith(`@${simulator}`);   // simulator = "resend.dev"
}
```

**Outside production, `test@mail.canoncore.com` is refused.** So inbound receiving and the guard do
not compose as they stand: a preview or a dev server cannot send to the domain whose mail we can read.
Only production can, which is the environment where creating a test account is exactly what
`apps/web/e2e/account-recovery.spec.ts` refuses to do.

There are three ways out and they are not equally good.

**Widen the allowance to the receiving domain**, so `mayBeSentTo` admits `@resend.dev` *or*
`@mail.canoncore.com`. This is the option that survives reading the guard's own justification: the
comment says the refusal exists because "a mistyped real address in a preview deployment **will send
a real email to a real person**". An address at our own catch-all receiving domain reaches no person —
it lands in a store only this team can read. So the widening does not weaken the property the guard
protects; it adds a second domain that has the same property for the same structural reason. It costs
one clause and one test, and it makes the domain's *catch-all* nature load-bearing, which should be
written down next to it.

**Run only against production.** No code change, and no use: the suite would have to create real
accounts in the real database, which is the bound `account-recovery.spec.ts` already records and which
**CAN-30 GDPR export and erasure** is named there as the thing that would lift.

**Send from a test harness rather than from the app.** A script that calls Resend directly, bypassing
`send.ts` entirely, can address anything. This is right for a one-off probe — it is what
`docs/infrastructure.md` → *Rotating a Resend key* already prescribes — and wrong for anything
claiming to test the product, because it tests a message the product did not compose.

## The categories of solution, and which ones can reach this project at all

Four categories, with the named examples that define each. The first question for every one of them
is not *is it good* but *can mail sent through Resend's API to a real address arrive in it*, and two of
the four cannot — which is the fact that decides most of this and is the fact a feature comparison
would bury.

### Local SMTP capture: Mailpit, MailHog, Inbucket, maildev

A daemon that listens on SMTP, stores everything, and serves it over a web UI and a JSON API. None of
them delivers anything anywhere; they are a sink with a reader on the side.

**None of them can receive a message that Resend's HTTP API sent**, and only one has an HTTP ingest at
all. **Mailpit** documents `POST /api/v1/send` — "Messages can alternatively be sent to Mailpit via
the HTTP API in JSON format, useful for applications that do not natively support SMTP" — but the
schema is Mailpit's own, capitalised keys with `From` as an object, against Resend's lowercase keys
and `from` as a string. Changing a base URL does not work; it would need a shim in the app that
reshapes the payload, which means the code path under test is not the production one. MailHog,
Inbucket and maildev have no ingest endpoint at all, established at source level rather than by
absence in the docs: Inbucket's complete REST route table contains no `POST`, and maildev's only
`POST`s are bulk-delete, relay and its MCP endpoint.

Nor can any of them be an MX for `mail.canoncore.com` in any documented way. Inbucket comes closest —
its configuration advises "reducing this significantly if you plan to expose Inbucket to the public
internet", and it accepts mail for any address — but it never mentions MX, and it has **no
authentication of any kind**: "no password is required to browse the content of the mailboxes". A
public Inbucket holding password-reset links is a credential leak with a web UI.

Two more things worth recording so nobody re-derives them:

- **MailHog is effectively dead.** Last commit to `master` 2 August 2022, last release August 2020,
  last Docker image rebuild August 2020. Its own maintainer's public answer is to use Mailpit
  instead. Do not adopt it.
- **Mailpit is the pick of the category if the category were ever right.** MIT, released this month,
  `/livez` and `/readyz` for a service container, a `GET /view/latest.html?query=…` endpoint that
  makes "click the link in the last email" one request, link checking, and optional **SpamAssassin**
  scoring against a local server or Postmark's hosted one. **Inbucket has no spam analysis** —
  that belief is wrong, checked against its repository tree, its book and its feature list.

### Fake SMTP as a service: Ethereal

Nodemailer's hosted catcher. Its whole design is the opposite of what is wanted here: "Point your app
at `smtp.ethereal.email` and send to any recipient address, real or made up. **Every message is
caught; nothing is ever delivered.**" Whatever address you write, the message lands back in the
sending account's own mailbox.

**Inbound is switched off for public accounts and cannot be turned on**: Ethereal discontinued it
because "this feature was exploited by cyber criminals due to the ease of creating anonymous
accounts", and mail sent to a public Ethereal address now bounces. Re-enabling it requires an active
EmailEngine subscription. And there is no HTTP API for reading a message — the routes are a preview
URL, the web UI, or IMAP/POP3.

**One detail disqualifies it outright for this project even if the rest fitted.** Ethereal's FAQ:
"**Message URLs are public and do not require authentication.**" A verification or reset link inside
such a message is readable by anyone holding the preview URL.

### Hosted sandbox capture: Mailtrap

Two Mailtrap products are relevant, their names are easy to confuse, and the distinction decides
whether Mailtrap applies at all. **The one that sounds like the answer is not it.**

**Email Sandbox** is interception, not reception: "a fake SMTP server that traps all emails sent from
your application", reached with Mailtrap's own SMTP credentials. That path cannot see a Resend send at
all, and Mailtrap says the product "is not designed to deliver emails to real email addresses". It
*does* offer a real receiving address per sandbox, `alias-12ab34@inbox.mailtrap.io`, which would work
from Resend — but only "starting from the Basic billing plan", **$14/month annual**. The free sandbox
tier has no address.

**Inbound Email**, part of the Email API product, is the one that actually receives: "Inbound Email
lets you receive incoming emails, read them via API"; inboxes are created over the API, catch-all
custom domains are supported by adding an MX record, and it is **included on the free tier**
(4,000/month, 150/day). The trap is retention: **email body retention on the free tier is three days**,
and the body is the thing a test reads.

### Disposable, API-readable inboxes: Mailosaur, MailSlurp, testmail.app, Mailinator

The category built for exactly this job. All four publish live MX, so all four can receive mail Resend
sends. They differ on price, on how an address is minted, and on who else can read it.

| | Address model | Read API | Free tier, read from the vendor's own pricing page 18 Aug 2026 | Entry price |
| --- | --- | --- | --- | --- |
| **Mailosaur** | `anything@<inbox-id>.mailosaur.net`, catch-all by design (wildcard MX confirmed by `dig`) | REST, HTTP Basic with the key as username; plus first-class **Links**, **Codes** and **Spam** assertions and `GET /api/analysis/deliverability/:id` | **None.** 14-day trial only | **$20/month** annual. Custom domains are **Enterprise-only** |
| **testmail.app** | `<namespace>.<tag>@inbox.testmail.app`, tags "made up on the fly" | REST and GraphQL, both with a `livequery` long-poll — the nicest CI primitive of the four | 100 emails/month, **1-day retention**, one random namespace. Whether the free plan carries API access is not stated | **$9/month** annual |
| **MailSlurp** | Randomised local part per inbox, `POST /inboxes` | REST, `x-api-key`, with `GET /waitForLatestEmail` | **The pricing page shows none**, only a 7-day trial, while support pages still describe a free personal tier. The vendor's own pages contradict each other | **$49.99/month**, plus **$30/month per custom domain** |
| **Mailinator** | Any inbox at a public or private domain | REST v2, token in a header or query string; **private domain required** | Verified Pro at **$0**: one private domain, 60 emails/day, 10MB permanent storage | $79/month annual for Business |

**Mailinator's public side is disqualifying and the reason should be quoted rather than summarised.**
Its own documentation: "All inboxes (and emails) are in the public domain. They are readable and
delete-able by anyone. … By design, there is NO privacy in the public Mailinator system." A
verification link sent to `@mailinator.com` is readable by strangers before the test consumes it. Its
private domains are fine; the public ones must never be used.

**Mailosaur is the one that would buy something Resend inbound does not**, and it is worth naming
precisely what: SpamAssassin scoring plus SPF/DKIM/DMARC and blocklist analysis on a received message,
and assertion helpers for links and codes. That is a $240-a-year answer to a question this project can
put differently, and its custom-domain support — the only way to test the real sending domain rather
than `*.mailosaur.net` — is Enterprise-only, so the version of it we could buy would not exercise
`mail.canoncore.com` at all.

**None of the four is worth buying as things stand**, because every one of them is a new vendor with
a new account and a new key, bought to do something the vendor we already pay nothing to already does.

**That is a cost-and-redundancy argument, not an
[ADR-0016](../adr/0016-provisioning-plain-api-keys-neon-excepted.md) one**, and the distinction is
worth keeping straight because the ADR is easy to misread as a bar on new vendors. Its test is
whether a Marketplace *integration* buys something a plain key cannot, and its own consequence is
that "a new vendor arrives as an account and a key". A plain API key from any of these four would
therefore **pass** that test. What refuses them is that the capability is already held.

## Per-test addresses: plus-addressing and catch-alls

A suite that runs more than once needs each run's mail to be distinguishable from the last run's.
There are two mechanisms and this project can already use both.

**Plus-addressing works on the simulator addresses, today, with no change to anything.** Resend
documents it: "All test email addresses support labeling … you can add a label after the `+` symbol
(e.g., `delivered+label1@resend.dev`)", with `delivered+signup@resend.dev` and
`delivered+password-reset@resend.dev` given as the worked example
([Send Test Emails](https://resend.com/docs/dashboard/emails/send-test-emails)). **`suppressed@` is
the exception** — Resend warns that it "does not support labeling yet".

This matters more than it looks, because `mayBeSentTo` matches on `endsWith("@resend.dev")`, and
`delivered+run-42@resend.dev` ends with exactly that. **So per-run addresses are already permitted by
the guard and need no code change** — they just still have nothing to read.

**A catch-all makes plus-addressing unnecessary rather than possible.** Because every local part at
`mail.canoncore.com` already resolves, a test does not need `+` at all: `signup-<uuid>@mail.canoncore.com`
is a distinct address without the syntax, which sidesteps every receiver that strips or mangles `+`.
Resend confirms subdomains work the same way — "You can add the MX record to any subdomain … and
receive emails there" — but that is moot here, because **the free tier allows one domain** and
`mail.canoncore.com` is it.

**Two local parts on that domain are already spoken for and a test must not use them.**
`dmarc@mail.canoncore.com` is the `rua=` target in the published DMARC record, and
`noreply@mail.canoncore.com` is `EMAIL_FROM`. Everything else is free. A recognisable prefix — `e2e-`
— would keep the received list readable when DMARC reports and test mail sit in it together, since the
list endpoint offers no filter.

## What is actually done end to end, as against unit-testing the send

This repository already unit-tests the send properly, and the research should say so plainly rather
than propose replacing it. `apps/web/src/db/rls.test.ts` replaces `fetch` for `api.resend.com` alone
and reads the emailed link straight out of the captured request body, against a real PostgreSQL, then
drives the link. `apps/web/src/mail/send.ts` records why that seam is the right one: "the boundary a
test has to control is the network". That is the strongest thing in the current setup and nothing
below should be read as an argument against it.

**The provider's own advice is to mock or to use a simulator address, and not to build an inbox.**
Resend's Playwright guide offers exactly two options — call the real API with
`to: ['delivered@resend.dev']`, or `page.route` the call and fulfil it — and notes that the first
"counts towards your account's sending quota"
([How to set up E2E testing with Playwright](https://resend.com/docs/knowledge-base/end-to-end-testing-with-playwright)).
Its testing page goes further and tells you not to do the local-catcher thing at all: under *When
testing, avoid*, it lists "setting up a fake SMTP server".

**Playwright's own guidance points the same way.** Its best-practices page says "Only test what you
control. Don't try to test links to external sites or third party servers that you do not control",
and recommends intercepting the call with the network API instead
([Best Practices](https://playwright.dev/docs/best-practices)). Neither page says anything at all
about reading a real inbox.

**So the honest summary of industry practice is narrower than the question implies.** The API-readable
inbox vendors exist and are used, but the two first-party sources closest to this stack both recommend
against reaching for one. What a real inbox buys is a claim neither a stub nor a simulator can make:
*a message addressed by the production code path arrived somewhere, intact, and its link worked*. That
claim is worth having once in a while against production. It is not worth having on every push, and
the cost of having it on every push is a `full_access` credential in CI plus two quota units per run
plus a class of flake that has nothing to do with the product.

## Deliverability is a second question, and no test inbox answers it

`docs/agents/tooling.md` states the rule this project already works to: "`resend` reports what the
provider did with a message; `macos-mail-mcp` reports what the recipient's mail client did with it. A
send can be `delivered` in Resend and sitting in Junk, so **a deliverability claim needs both**."

**Resend says the same thing about its own `delivered` status**, and this is the primary source that
settles it:

> "When an email is sent, it is marked as `Delivered` once the recipient server accepts it with a
> `250 OK` response. However, the server can then direct the email to the inbox, queue it for later,
> route it to the spam folder, or even discard it. … **Inbox Providers do not share any information on
> how the messages are later filtered.**"
> — [What if an email says delivered but the recipient has not received it?](https://resend.com/docs/knowledge-base/what-if-an-email-says-delivered-but-the-recipient-has-not-received-it)

**So a readable test inbox does not become a deliverability check by being readable.** Resend inbound
accepts everything addressed to the domain; it has no spam folder and makes no filtering decision, so
arriving there proves the message was sent and is intact and proves nothing about Gmail. The same is
true of Mailosaur, testmail.app, MailSlurp and every catcher above: what they can add is a
**SpamAssassin score**, which is a claim about how the message reads, not about where it went.
mail-tester states the gap in its own FAQ better than anyone: "Perfect Score, But Still in Spam! All
spam filters work differently."

There are three families of answer and only one of them fits this project.

**What Resend inbound *does* give, and it is more than nothing.** The raw message carries
`Authentication-Results: … spf=pass … dkim=pass header.i=@mail.canoncore.com … dmarc=pass
header.from=mail.canoncore.com` and `X-SES-Spam-Verdict: PASS`, computed by a receiver rather than by
the sender. That is a real check on the DNS being right, and it is the check most likely to break
silently when a record is edited — which, given the Namecheap *Mail Settings* dropdown that
`docs/infrastructure.md` → *DNS for mail* warns can destroy one of the two mail systems sharing that
zone, is the realistic failure here. It is not a placement claim.

**The reputation dashboards are blank at this volume, and one of them is blind by construction.**
Google Postmaster Tools requires volume Google refuses to quantify — "dashboards might not include all
data on days when your outgoing email volume is low" — and its spam rate is the proportion of mail
*recipients marked as spam after it reached the Inbox*. Google's own page: "**If Gmail automatically
sends a significant number of your messages to spam, the rate shown in the dashboard might seem low,
because recipients get fewer of your messages in their Inbox.**" Automatic junk-foldering makes the
number look better. Microsoft's SNDS is worse for us on three counts: it needs proof of ownership of
the sending IPs, which belong to Resend's shared pool; it publishes a floor — "mail traffic and spam
data may not be present for IPs which sent less than 100 messages on the given day"; and it disclaims
the question outright: "this result doesn't directly represent deliveries to users' inboxes or 'Junk
e-mail' folders." **DMARC aggregate reports answer a different question again**: RFC 7489 reports
authentication outcomes and the DMARC disposition applied, and a message that passes DMARC and is
junked on content grounds is indistinguishable in a report from one that landed in the Inbox.

**A seed mailbox at a real provider, read over that provider's own API, is the only thing that answers
it — and it need not be a personal mailbox.** This is the part of the current practice that is
correct and only the *choice of mailbox* that is wrong.

- **Gmail.** A message's `labelIds` include the system labels `INBOX` and `SPAM`, and the `CATEGORY_*`
  labels distinguish Primary from Promotions
  ([Labels](https://developers.google.com/workspace/gmail/api/guides/labels)). **The trap is that
  `users.messages.list` excludes spam by default**: without `includeSpamTrash: true` a junked message
  reads as missing rather than as junked, which is the failure mode that would quietly report success.
  The cost is a **restricted** OAuth scope — `gmail.readonly` and even `gmail.metadata` are both
  classified restricted — which for an unverified app means leaving it in Testing status, capped at
  100 test users, with **consent expiring every seven days**.
- **Outlook.com.** Microsoft Graph names `inbox` and `junkemail` as well-known mail folders that "work
  regardless of the locale of the user's mailbox", personal Microsoft accounts are explicitly
  supported, and `Mail.ReadBasic` is enough to enumerate a folder
  ([mailFolder](https://learn.microsoft.com/en-us/graph/api/resources/mailfolder)). **No restricted
  scope, no verification, no weekly re-consent** — materially easier than Gmail.
- **`macos-mail-mcp` stays useful and stays bounded.** It is what produced
  `X-Apple-Movetofolder: INBOX` in `docs/incidents.md` → *The delivered test message passed all three
  checks*, and it is the right tool when the recipient genuinely is a mailbox in Jacob's Mail.app. The
  standing constraint that it "reads every account in Jacob's Mail.app, work and personal" is exactly
  why it should not be the routine mechanism.
- **The paid seed-list vendors are real and priced out.** GlockApps is the only one with a free entry
  — **two spam-test credits, then $59/month** — and it does give genuine Inbox/Tabs/Spam breakdowns
  across Gmail, Outlook, Yahoo and thirty-plus others with a JSON API on every tier. Validity's Everest
  and Litmus do placement across ninety-plus providers and publish no price at all; both pricing pages
  are a contact-sales form.

## The recommendation, in layers

### Unit tests: **what you already do is right. Change nothing.**

`apps/web/src/db/rls.test.ts` stubs `fetch` for `api.resend.com` and reads the real request body,
including the link; `apps/web/src/mail/send.test.ts` asserts the guard, the refusal wording and the
property the stub depends on. That is a better seam than any inbox, it costs no quota, it needs no
credential, and it runs inside the four-command gate. **Nothing in this document is an argument for
touching it**, and the temptation to make the unit suite talk to a real inbox should be refused on
sight: it would trade a deterministic test for a network round trip and a `full_access` key.

### Local development: **`delivered+<label>@resend.dev`, and accept that there is nothing to read.**

Plus-addressing already passes `mayBeSentTo`, so a developer can send distinguishable mail today with
no change to anything, watch it appear in Resend's log, and read the body back with `GET /emails/:id`
if the link is actually wanted. Standing up a local Mailpit would mean moving the app to SMTP, which
would cost the `fetch` seam the unit tests are built on. **Do not do it.**

### CI: **nothing. Keep Playwright off the gate and keep Resend out of Actions.**

[ADR-0017](../adr/0017-testing-stack.md) keeps Playwright off the four-command gate because it
drives a deployed URL, and an inbox-reading test would need three things CI should not have: a
`full_access` Resend key as an Actions secret — strictly more powerful than the `RESEND_API_KEY`
`docs/infrastructure.md` already declines to put there — two of the hundred daily quota units per run,
and a wait on mail arriving. The 2.4-second round trip means the wait would usually be short, which is
the property that makes the eventual flake hard to diagnose rather than the property that makes it
safe.

### The one real change: **an inbox-reading Playwright spec, run by hand against a preview.**

This is what closes the gap `apps/web/e2e/account-recovery.spec.ts` writes down in as many words —
"**There is no inbox to read.** Both flows turn on a link that arrives by email. Resend has no mailbox
to poll."

**Read that bound precisely, because only half of it has expired.** *Resend has no mailbox to poll* is
now false: it has one, on our own domain, and it has had one since 10 August 2026. The rest of the
bullet — that the guard refuses every non-`resend.dev` recipient on a preview, "which is the guard
working, not an obstacle to route around" — is still exactly right, and is what step 1 below has to
change deliberately rather than route around. The spec's third bound, that a reset link against
production "is a one-hour capability over a real account", is untouched and is why this runs against a
preview. Its first bound, that these specs drive a deployed environment, is satisfied rather than
broken by a preview: a preview points at the shared schema-only branch
([ADR-0023](../adr/0023-one-shared-schema-only-preview-branch.md)), not at production's rows.

Three things have to be true and each is small. **All three landed on 20 August 2026** — the note in
*The answer* above says where each one lives now:

1. **Widen `mayBeSentTo` to admit `@mail.canoncore.com` as well as `@resend.dev`**, with the
   justification stated next to it: the domain is a catch-all we own, so an address at it reaches no
   person, which is the exact property the guard exists to protect. One clause, one test.
2. **Address each run uniquely** — `e2e-<run-id>@mail.canoncore.com`. No `+` is needed, because every
   local part already resolves, and a prefix keeps the received list legible beside the DMARC reports.
3. **Read it with a `full_access` key held on the laptop only**, through `resend login`, which stores
   it in the macOS Keychain. Never as an Actions secret. Poll `GET /emails/receiving`, match on `to`,
   then `GET /emails/receiving/:id` for the `text` and the link. Budget two quota units per run.

**What it would prove that nothing else proves:** that a message composed by the production code path,
sent by the real provider from the real domain, arrived somewhere intact, authenticated, and that the
link inside it works. **What it would not prove:** anything about Gmail.

### Occasional production verification: **stop mailing `jacob.rees@vepple.com`. Send to two places instead.**

Split the claim in two, because it is two claims.

- **Did it arrive and is it intact?** `noreply@mail.canoncore.com` → `verify-<date>@mail.canoncore.com`,
  read back through the `resend` MCP, which needs no key at all. That is the round trip already
  measured, and it also hands you `spf=pass`, `dkim=pass`, `dmarc=pass` and `X-SES-Spam-Verdict: PASS`
  from a receiver rather than from the sender.
- **Inbox or Junk?** A purpose-made **Outlook.com** seed account, read through Microsoft Graph's
  `junkemail` well-known folder. It is free, it needs no restricted scope and no weekly re-consent, and
  it is a mailbox that exists for this and holds nothing else. Add a Gmail seed only if Gmail placement
  becomes a live question, and remember `includeSpamTrash`.

**Keep `macos-mail-mcp` for the case it is actually for** — confirming what a real client did when the
recipient really is Jacob — and stop reaching for it as the routine check. And note that `mail-tester`
has already been used here once without being written down: the send log carries
`test-oicj9zgvj@srv1.mail-tester.com` from 10 August 2026, and nothing in the repository mentions it.
Three free tests in any rolling 24 hours, a SpamAssassin score and a blacklist check, no API below
$10/month: a fine pre-flight for the message's content, and not a placement claim. Note what it
actually is, in its own words — "a **vanilla install**" of SpamAssassin, with the score reversed — so
it tells you how the message reads to one filter and nothing about Gmail.

### What this does not need

No new vendor, no new account, no Marketplace integration, no SMTP daemon, no webhook endpoint, no
GitHub Actions secret, and no ADR — the receiving domain and the reading route both already exist and
[ADR-0011](../adr/0011-transactional-email-resend.md) is untouched. The only durable artefacts are one
widened clause in `send.ts` with its reason beside it, one spec, and a row in
`docs/infrastructure.md` recording that a third Resend key exists, what permission it carries and
where it lives.

## Unverified

Everything below could not be pinned to a page owned by the party making the claim, or could only be
reached second-hand. **Two rows are struck through** rather than omitted: both were open when the
documentation sweep finished, and both were then closed — one by a page, one by a measurement. They are
kept so nobody re-opens them.

| Claim | Why it is unverified | How to settle it |
| --- | --- | --- |
| ~~Whether received emails count against Resend's daily and monthly quota~~ | **Settled.** [Usage Limits](https://resend.com/docs/api-reference/rate-limit): "Both sent and received emails count towards these quotas." A round trip costs two of the hundred a day | — |
| ~~Whether Resend delivers a message from a verified sending domain to the same account's receiving domain~~ | **Settled by measurement, 18 August 2026.** The 10 August round trip went `noreply@mail.canoncore.com` → `test@mail.canoncore.com` and arrived in 2.4 seconds | — |
| Whether a `sending_access` key really is refused on `GET /emails/receiving` | The permission table says `sending_access` "Can only send emails", which is unambiguous, but it was not exercised — neither key's value can be read back from a Vercel Sensitive variable | Issue a throwaway `sending_access` key and call the endpoint with it |
| Whether the free tier's "30-day data retention" covers *received* messages as well as sent ones | The pricing page states one retention figure and does not distinguish the two. A message received 10 August was readable on 18 August, which is consistent with 30 days and does not establish it | Re-read the 10 August round trip after 9 September 2026 |
| Whether Resend imposes any size or rate limit on inbound mail | No Resend page states one. The attachment pages describe processing large attachments without naming a ceiling | Ask Resend support, or send a large message to the catch-all |
| Whether a Resend-managed `<id>.resend.app` receiving domain consumes the free tier's one-domain allowance | Resend documents both the managed receiving domain and the one-domain limit and never relates them | Moot under this recommendation, which uses `mail.canoncore.com`. Settle only if a second domain is ever wanted |
| Whether `GET /emails/receiving` is ordered newest-first | **Measured twice and documented nowhere.** The list came back newest-first on 18 and 20 August 2026, and Resend's OpenAPI specification carries no ordering field at all — only `limit`, `before`, `after` and `has_more`. `apps/web/e2e/verification-by-inbox.spec.ts` reads one page of 100 and notes that at three messages ever, volume rather than order is what makes that sound | Ask Resend, or add a cursor the day the account holds more than 100 received messages |
| The distribution of the inbound round-trip latency | **Three measurements now, not one: 2.4 seconds on 10 August 2026, then 2.39 and 2.88 seconds on 20 August 2026** — the later pair from sign-up to receipt, so each is an upper bound on the round trip rather than the round trip itself. Three points still support no claim about a worst case, which is exactly what a polling timeout has to be set against. `apps/web/e2e/verification-by-inbox.spec.ts` does hard-code one: **90 seconds**, roughly thirty times the slowest seen, chosen so that the failure it reports is an absence rather than a delay | Send ten and record the spread. Until then the timeout's margin is the defence, not the measurement |
| Whether Mailpit, MailHog, Inbucket or maildev can lawfully or workably be an MX for a public domain | None of the four mentions MX. Each binds a configurable SMTP address, so nothing prevents it technically. Established by absence | Irrelevant under this recommendation |
| Mailtrap Email Sandbox message retention | Stated nowhere in Mailtrap's sandbox docs or on its pricing page. The Inbound Email product does publish body retention (3 days free) | Only matters if Mailtrap is reconsidered |
| MailSlurp's free tier: whether one exists at all, and every numeric limit on it | Its pricing page shows only a 7-day Pro trial while its own support and guides pages still describe a free personal tier. **The vendor's pages contradict each other** | Only settleable by signing up. MailSlurp is rejected above on price regardless |
| Mailosaur's per-plan maximum retention in days, and whether the 14-day trial needs a card | The FAQ says the maximum "is dictated by the plan you're on" without publishing the numbers; the trial page states neither | Ask Mailosaur, if it is ever reconsidered |
| Mailosaur's custom-domain MX hostnames | Shown only inside the dashboard | Moot: custom domains are Enterprise-only |
| Whether testmail.app's free plan includes API access | The pricing table lists "Full API access" from Essential upward and omits the row for Free; nothing in the docs says Free lacks it, and the product has no UI-only mode | Only settleable by signing up |
| Mailinator's Verified Pro monthly quota, 1,000 or 2,000 | **Three vendor pages disagree**; two say 1,000 and the annual pricing page says 2,000 | Ask Mailinator. Moot unless Mailinator is reconsidered |
| Whether GlockApps' API is genuinely available on the free tier | Its current API documentation says "available on all plans, including the free tier"; an older GlockApps tutorial gates GET to Enterprise. The vendor's own pages disagree and the newer one should win | Only settleable by calling it with a free-tier key |
| Whether creating a Gmail or Outlook.com account for seed testing is permitted by those providers' terms | The sentence widely quoted as forbidding automated Gmail account creation **is not on the current Gmail Program Policies page**, which was read in full. What is there forbids circumvention and deceptive automation of the *interface* — and the Gmail API is the sanctioned alternative to automating the interface. Neither provider publishes an explicit permission for seed testing | Not settleable from published policy. The reading above is an interpretation, not a quotation, and creating the account by hand rather than by script is what keeps it clearly on the right side |
| The seed-list mechanics behind Validity Everest and Litmus | The Litmus help article now 301s to `knowledge.validity.com`, which returns **HTTP 401** | Needs an authenticated session. Moot: neither publishes a price |
| Mailgun's retention for stored inbound messages | Not stated on Mailgun's receive-forward-store page | Only matters if Mailgun is ever reconsidered |
| That no vendor except Resend and Mailtrap states in words that it accepts mail from *any* sender | Mailosaur, MailSlurp, testmail.app and Mailinator all publish live public `MX` records, checked with `dig` on 18 August 2026, and the whole product premise requires it — but none says so in a sentence | Send one message and see. Moot under this recommendation |
