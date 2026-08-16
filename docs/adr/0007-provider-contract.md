---
status: superseded by ADR-0014
---

# The provider contract is public, versioned and additive-only

> **Superseded 15 August 2026 by
> [ADR-0014](0014-shell-providers-and-per-source-retention.md)**, under
> [CAN-97 Record the shell architecture, the reachability split and per-Source retention](https://linear.app/jacobrees-canoncore/issue/CAN-97).
> Two sentences below cannot survive that decision. **"Sources that no general database covers"** is
> wrong by one step: every Source is now reached through a Provider, including the general database,
> so the contract is the only ingress rather than the residual. And **"No store, no review process,
> no manifests"** cannot survive a listed set of Providers this project writes, runs and reviews.
>
> **Most of this file is still right**, which is why it is superseded rather than deleted. A reader
> arriving from one of those documents is misled by those two sentences and by the three corrections
> named next, by the shape sentence at the foot of this file repeating the no-store-no-review
> framing unannotated, and by the MIT line below overstating its own research — the spec's
> `info.license` says MIT, its scope unstated (*blockquote widened 16 August 2026*).
> [ADR-0014](0014-shell-providers-and-per-source-retention.md) → *What survives of ADR-0007* is the
> authority: it says what is kept unchanged, what breaks, that the additive-only justification below
> is **false for every Provider that will exist in v1** and is re-derived on self-hostability
> instead, that the Audiobookshelf-compatible reader is a Provider in a repository of its own rather
> than something shipped in the product, and what five things the capability endpoint has to carry
> that it was never sized for.

Sources that no general database covers are added by pasting in the URL of a service that speaks
CanonCore's contract. No store, no review process, no manifests. Nothing source-specific ships in
the product, and no provider lives in this repository.

Audiobookshelf is the only real prior art: one endpoint, a base URL and an auth value typed into
settings, a docs-repo markdown table instead of a registry, and a warning that community providers
are unreviewed. Kavita hardcodes its providers. OPDS is a catalogue feed for reader apps, not a
metadata contract.

## What we take, and what we do not

**Take the shape:** one endpoint, pasted URL, no store, no review.

**Do not take the schema.** It is audiobook-shaped. No type discriminator, no date beyond
`publishedYear`, no identifiers beyond `isbn`/`asin`, no episode or issue numbering, no
relationships, one cover — and no way to express an ordering, which is the thing this product is
for. Its spec is MIT-licensed, so the shape can be borrowed freely.

**Ship an Audiobookshelf-compatible adapter anyway.** Their `GET /search` maps well enough onto
title, range, sequence, narrator, duration and year to populate real records, and it inherits the
community providers already written against it.

**Fix three things Audiobookshelf got wrong:**

1. **A capability endpoint.** Theirs has none, so a client cannot know what it is talking to. A
   provider declares what it serves.
2. **A real parameter surface.** With only three query parameters, provider configuration gets
   smuggled into URL paths (`/audioteka/lang:pl`). A thin contract does not remove configuration,
   it relocates it somewhere unvalidated.
3. **A published OpenAPI spec, versioned in the URI.** URI versioning is the most debuggable and
   familiar pattern, and a spec as single source of truth prevents the drift Audiobookshelf has,
   where the spec declares two query parameters and the client sends four.

## A deliberate exception to the no-backward-compatibility rule

`CLAUDE.md` says to remove obsolete paths rather than carry compatibility layers. That reasoning
depends on controlling both sides of a change. **A published provider contract is the one interface
where we do not**: someone else's service implements it and deploys on their schedule.

So this contract is explicitly versioned, evolves **additive-only**, and carries a deprecation
policy. The exception is bounded to the contract itself and does not license compatibility layers
anywhere else in the codebase.
