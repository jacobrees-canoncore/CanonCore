---
status: accepted
---

# The canonical host is `www.canoncore.com`

Production is served from `www.canoncore.com`. The apex `canoncore.com` returns a **301** to it.
Settled 9 August 2026, provisioned under CAN-18.

## Why

**A host-only session cookie cannot be widened later by accident.** A cookie carrying a `Domain`
attribute is sent to that domain *and every subdomain of it*
([RFC 6265 §5.1.3](https://www.rfc-editor.org/rfc/rfc6265#section-5.1.3)). A cookie set without one
is host-only and is returned only to the exact host that set it
([§4.1.2.3](https://www.rfc-editor.org/rfc/rfc6265#section-4.1.2.3)).

Serve from the apex and the session cookie is reachable from anything later added under
`canoncore.com` — a status page, a marketing site, a provider sandbox, anything an unrelated
subdomain might one day host. Serve from `www` and adding a subdomain cannot retroactively widen
where the session is sent, because `www` is itself a sibling rather than a parent.

This is a decision about what a *future* mistake can cost, not about what is true today.

## What was weighed

It was a weak preference rather than a strong one, and it is recorded so that the weakness does not
invite a second argument later.

Once `demo.canoncore.com` was released the domain briefly had no subdomains; `mail.canoncore.com`
has since existed for Resend (*corrected 16 August 2026*), which strengthens rather than weakens
the case — a `Domain`-scoped cookie would now reach a mail-infrastructure hostname. The case rests on future-proofing plus the fact that `www` was already
configured and therefore free. The apex was considered and rejected on that basis, not overlooked.

Vercel's documentation in fact recommends `www` as the primary domain with a redirect
(*corrected 16 August 2026 — this line previously claimed it took no position*), which supports
the decision without deciding it.

## What will try to reopen it

Auth tooling defaults toward the apex, because a `Domain`-scoped cookie is what you want when you
*do* intend to share a session across subdomains. `vercel:auth` and most better-auth examples will
suggest setting a cookie domain. Treat a suggestion to set one, or to serve production from the
apex, as a proposal to reopen this — not as advice.

[CAN-24](https://linear.app/jacobrees-canoncore/issue/CAN-24) bakes this into better-auth's base URL
and cookie domain, and [CAN-31](https://linear.app/jacobrees-canoncore/issue/CAN-31) into the
absolute links in verification and reset emails. Both were written against this decision. Changing
it after they land means changing them too.

What is actually provisioned is recorded in
[`docs/infrastructure.md`](../infrastructure.md).
