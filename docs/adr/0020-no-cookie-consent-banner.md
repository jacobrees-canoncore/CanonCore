---
status: accepted
---

# No cookie consent banner

**This service will not show a consent banner or a consent modal.** What it will carry instead is a
section of the privacy notice describing every storage and access technology in use, and an easy way
to object to the one that is not strictly necessary.

The position rests on two limbs of UK PECR as the ICO now reads it: the **strictly necessary**
exception covers the sign-in session, and the **statistical purposes** exception covers analytics, if
analytics are ever adopted. Both limbs carry conditions, and *The conditions are the decision* below
is the part of this that binds.

The reading, with the sources under it, is
[`docs/research/production-readiness-baseline.md`](../research/production-readiness-baseline.md) →
*UK PECR, and why a cookie banner is probably not needed*. That file is findings and hedges by design;
this ADR is the decision, because a legal conclusion sitting in `docs/research/` is one the repository's
own rules say is not a decision record ([`docs/research/README.md`](../research/README.md)). Settled
17 August 2026 under **CAN-75 Write the four missing ADRs and fix the glossary's self-violations**.

**This is scope, not legal advice**, and the compliance records this project does keep are
[`docs/compliance/`](../compliance/), which are Online Safety Act records and touch none of this.

## Contents

- [Nothing is stored on a device today, which is why this is decidable now](#nothing-is-stored-on-a-device-today-which-is-why-this-is-decidable-now)
- [The two limbs](#the-two-limbs)
- [The conditions are the decision](#the-conditions-are-the-decision)
- [What would kill the exception](#what-would-kill-the-exception)
- [The rejected alternatives](#the-rejected-alternatives)
- [What will try to reopen it](#what-will-try-to-reopen-it)
- [Consequences](#consequences)

## Nothing is stored on a device today, which is why this is decidable now

`apps/web` sets no cookie, reads none, and has no analytics package in
[`apps/web/package.json`](../../apps/web/package.json). So there is currently nothing for a banner to
ask about, and the decision is being taken **before** the first thing that would need one —
[CAN-24 Sign in and sign out](https://linear.app/jacobrees-canoncore/issue/CAN-24) brings the session
cookie, and analytics are not adopted at all.

Taking it now is the point. A banner is the kind of thing that gets added in the same week as the
feature that seemed to require it, by whoever is nearest, and then never removed; and the alternative
is not "no banner and no obligation" but a specific pair of duties that have to be built into the
privacy notice rather than bolted on after it exists.

> **The two paragraphs above describe 17 August 2026 and are kept in that tense, because the point
> they make is about *when* this was decided.** Both halves have since moved.
> [CAN-24 A signed-in and a signed-out path](https://linear.app/jacobrees-canoncore/issue/CAN-24)
> brought the session cookie, and **CAN-60 Gate the front end on bytes, budgets and React lint**
> brought the analytics: `@vercel/analytics` and `@vercel/speed-insights` are in
> [`apps/web/package.json`](../../apps/web/package.json) as of 21 August 2026, and **Web Analytics
> is switched on at Vercel** ([`docs/infrastructure.md`](../infrastructure.md) → *Hosting*, which
> also records why Speed Insights is not). There is still no banner, and what discharges the two
> conditions instead is named under *Consequences* below.

## The two limbs

**The sign-in session is strictly necessary.** The ICO's own worked example of the exception is
"Identifying a user once they have logged in to an online service for the duration of their visit",
which is exactly what better-auth's session cookie does under [ADR-0005](0005-stack.md).

**Analytics are covered by an exception that did not used to exist.** The ICO's finalised guidance on
storage and access technologies, updated for the Data (Use and Access) Act, lists **five** exceptions
rather than two, and the new one applies where storage or access is "for the sole purpose of
collecting statistical information about visitors to your service, with a view to improving it". So
the older instinct — that anything analytics-shaped needs consent in the UK — is out of date, and it
is the instinct every template and every vendor still encodes.

**Cookieless is not the same as out of scope**, and this is the trap worth naming. Vercel Web
Analytics uses no third-party cookie and instead identifies visitors "by a hash created from the
incoming request", discarded after 24 hours. PECR governs *access to* information on the device and
its rules "apply to any 'information' — they're not limited to personal data", with the ICO saying
they cover device fingerprinting where storage or access is involved. So the defensible ground for
analytics is the statistical purposes exception, **not** the absence of a cookie, which is why the
conditions below are not optional.

## The conditions are the decision

The exception is not self-executing. Two things attach to it, and the ICO's guidance is explicit that
"If you don't, you won't be using those exceptions correctly":

1. **Clear and comprehensive information about the use of the technology.** A section of the privacy
   notice naming what is stored or accessed, by what, and why — not a line in a terms page.
2. **An easy way to object to this use.** For the statistical purposes limb this is a real
   opt-out that works, not a link to a browser setting.

**So "no banner" is a heavier obligation than a banner, not a lighter one.** A banner discharges the
duty by asking; this discharges it by publishing and by building an off switch. That trade is taken
because a modal is a worse experience for a product whose whole value is reading, and because the
exception genuinely applies — not because it is less work.

**Where PECR requires consent, legitimate interests cannot be substituted for it.** That is stated by
the ICO directly, and it closes the escape route that a UK GDPR-shaped reading of this would suggest.

## What would kill the exception

The statistical purposes exception is narrow, and it **dies the moment analytics data is used for
anything beyond improving the service**. Concretely, any of these reopens this ADR rather than merely
complicating it:

- **Any third-party or advertising technology**, including an embedded widget that sets its own
  storage. Neither limb reaches those.
- **Analytics data joined to an account**, or used to build a profile of a person rather than a
  picture of the service.
- **Any storage or access serving a purpose the visitor did not come for** — A/B testing that is not
  about improving the service, personalisation, or anything shared onward.
- **A cookie for something other than the session.** "Strictly necessary" is judged against the
  service the user asked for, not against convenience.

**One constraint travels with adopting analytics at all, and it is imposed here rather than merely
noted**: a URL in this product can carry an Ordering's name and an author's, and automatic page-view
tracking captures URLs, so **`beforeSend` redaction is a condition of adopting analytics** and not a
later refinement.

**`beforeSend` turned out not to be the whole surface, which sharpens this rather than weakening
it.** Both Vercel scripts send the *route* beside the URL, and it never reaches `beforeSend`; the
route their own helper computes falls back to the raw path whenever a parameter value is encoded
differently in it, which is any Ordering slug carrying a space or an accent. So the condition is
**the redaction, not the hook** — whatever surface carries a path has to go through it.
[`apps/web/src/analytics/analytics.tsx`](../../apps/web/src/analytics/analytics.tsx) holds the
evidence and the answer. Found by review on 21 August 2026, before anything had been collected. Vercel's own warning and what its analytics collect are
[`docs/research/production-readiness-baseline.md`](../research/production-readiness-baseline.md) →
*UK PECR, and why a cookie banner is probably not needed*.

## The rejected alternatives

**A consent banner anyway, as belt and braces.** Rejected on three grounds and the third is the one
that matters: it costs conversion on a service whose front door is a page of prose; it is what almost
every comparable site does, which makes it invisible rather than informative; and **asking for
consent that is not needed misrepresents the position** — a person clicking "reject" on a strictly
necessary session cookie is being offered a choice the service cannot honour.

**Treating cookieless analytics as out of scope entirely.** Rejected under *The two limbs* above.
This is the reading that would feel safest and is the one that is actually wrong.

**Waiting until analytics are adopted to decide.** Rejected because the duty that this decision
creates lands on the privacy notice, and the privacy notice is written by
[CAN-30 GDPR export and erasure](https://linear.app/jacobrees-canoncore/issue/CAN-30) — which is
in flight now and would otherwise have to be revisited.

## What will try to reopen it

- **Every SaaS starter and UI kit**, most of which ship a consent component; `vercel:shadcn` and
  `vercel:next-forge` both propose component sets, and a banner is a standard member of one.
- **Consent-management vendors**, whose product is the banner, and whose marketing frames it as the
  default state of compliance in the UK and the EU.
- **The visible behaviour of other sites**, which is the strongest pressure of the four, because it
  looks like evidence. Most of those sites run advertising technology, which neither limb here
  reaches.
- **Any reader who knows the pre-Data (Use and Access) Act position**, under which the analytics
  exception did not exist. An out-of-date reading of PECR is indistinguishable from a careful one
  unless the guidance is re-read.
- **What would actually reopen it**: a change in what is stored, per *What would kill the exception*
  above, or a revision to the ICO's guidance. Both are re-checkable rather than arguable, and the
  guidance is worth re-reading before the URL is shared.

## Consequences

- **CAN-30 GDPR export and erasure's privacy notice carries the storage and access section**, and it
  is not optional prose: it is one of the two conditions the exception rests on.
- **An opt-out has to exist before analytics do**, so whichever ticket adopts analytics builds the
  objection route in the same change. **That ticket was CAN-60 Gate the front end on bytes, budgets
  and React lint**, on 21 August 2026, and the route is `/privacy/analytics` — reachable rather than
  merely addressable, because an address somebody has to be told is not "an easy way to object". It
  was linked from the front page alone until
  [CAN-89 Give the product a visual identity and a reading surface](https://linear.app/jacobrees-canoncore/issue/CAN-89)
  gave the application a footer, and **it is now in that footer on every page**, which is what the
  condition wanted and what one page could only approximate. Its three parts are
  [`apps/web/src/analytics/opt-out.ts`](../../apps/web/src/analytics/opt-out.ts), which holds the
  objection on the device and never sends it anywhere,
  [`apps/web/src/analytics/redaction.ts`](../../apps/web/src/analytics/redaction.ts), which is the
  `beforeSend` redaction this decision makes a condition rather than a refinement, and
  [`apps/web/src/analytics/analytics.tsx`](../../apps/web/src/analytics/analytics.tsx), which joins
  them. **The same page carries the analytics half of the information duty**, standing alone until
  CAN-30 GDPR export and erasure writes the notice it belongs in — the duty attaches to measuring,
  and measuring did not wait.
- **CAN-24 Sign in and sign out's cookie stays strictly necessary.** A session cookie doing a second
  job — remembering a preference, carrying a referral — leaves the exception and takes this decision
  with it.
- **No consent component exists in the codebase**, and adding one is a decision to be argued here
  rather than a component to be installed.
- **The guidance is re-read before the URL is shared**, alongside the Online Safety Act re-check that
  [`docs/research/README.md`](../research/README.md) already requires of
  [`online-safety-act-obligations.md`](../research/online-safety-act-obligations.md).
