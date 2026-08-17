---
status: accepted
---

# Third-party services are provisioned with a plain API key, and Neon is the one exception

When this project needs something it does not run itself, it creates an account with that vendor
directly, issues a key or a token, and stores it as an environment variable **this repository
names**. It does not install the vendor's Vercel Marketplace integration.

**Neon is the exception, and there is exactly one reason for it**: preview database branching is a
per-deployment resource lifecycle, and no key we hold can drive one. Everything else on the estate —
Resend, Sentry, UptimeRobot — is a plain key or no credential at all.

This ADR is about the vendors that carry *our own* infrastructure. It says nothing about a *Source*
or a *Provider* in the [ADR-0014](0014-shell-providers-and-per-source-retention.md) sense, which are
a different concept that happens to share the words "service" and "integration". What is provisioned
right now is [`docs/infrastructure.md`](../infrastructure.md); this is why the route differs by
vendor. Settled 17 August 2026 under **CAN-75 Write the four missing ADRs and fix the glossary's
self-violations**, ratifying what
[CAN-18 Provision the Vercel project, the Neon database and the production domain](https://linear.app/jacobrees-canoncore/issue/CAN-18)
and [ADR-0011](0011-transactional-email-resend.md) had already done in opposite directions without
either stating the rule.

## Contents

- [The test: does the integration know about a deployment?](#the-test-does-the-integration-know-about-a-deployment)
- [What Neon's integration cost, itemised](#what-neons-integration-cost-itemised)
- [Billing is not the discriminator, and ADR-0011 reads as if it is](#billing-is-not-the-discriminator-and-adr-0011-reads-as-if-it-is)
- [What will try to reopen it](#what-will-try-to-reopen-it)
- [Consequences](#consequences)

## The test: does the integration know about a deployment?

A Marketplace integration and an API key buy different things, and only one of them is unobtainable
by hand.

**An integration is told about deployments; a key is not.** Neon's creates one
`preview/<git-branch>` branch per git branch that has a preview deployment, and injects
`NEON_PGHOST` and `NEON_PGDATABASE` **into that one deployment by webhook** — they are not
project-level variables, and `vercel env ls` cannot show them
([`docs/infrastructure.md`](../infrastructure.md) → *Environment variables*). That is the whole of
what cannot be reproduced with a key. A token of ours could create the branch; nothing would then
tell the running deployment which branch it got, and a project-level variable carrying one branch's
host is not a smaller version of the right answer — it is the bug, because every other preview would
read it too.

**A key is enough for anything whose value is the same in every deployment.** `RESEND_API_KEY` sends
mail; `SENTRY_DSN` accepts events; UptimeRobot needs no credential at all, because it polls this site
rather than being called by it ([`docs/infrastructure.md`](../infrastructure.md) →
*Uptime monitoring: UptimeRobot*). None of the three has a resource whose lifetime is a deployment's
lifetime, so for all three an integration would buy nothing and cost what the next section itemises.

So the rule is not "avoid the Marketplace". It is: **install an integration only for a
platform-level behaviour a credential cannot express, and pay for it knowingly.**

## What Neon's integration cost, itemised

The exception is priced rather than free, and three of these four costs are consequences of the
integration rather than of Neon:

- **Sixteen environment variables it owns.** All sixteen `NEON_*` the integration had written were
  removed on 13 August 2026, and whether it re-writes them is still an open check
  ([`docs/infrastructure.md`](../infrastructure.md) → *Environment variables*).
- **A prefix that must not be tidied away.** The integration writes under `NEON_`, which
  deliberately leaves `DATABASE_URL` free for us. Unprefixed, **the integration owns `DATABASE_URL`
  and fills it with the `neondb_owner` role**, which has `rolbypassrls = true` and is what
  [ADR-0005](0005-stack.md) → *Three rules that are not optional* forbids outright
  ([`docs/infrastructure.md`](../infrastructure.md) → *Roles*).
- **A production gate bought to unlock a preview feature.** `Require Active Resource Before Deploy`
  is the prerequisite for the branching checkbox and it is not scoped to previews, so production
  deploys now depend on Neon being reachable. **That coupling was accepted knowingly and cannot be
  bought in part** — the setting, and what it was read back as, are
  [`docs/infrastructure.md`](../infrastructure.md) → *Database*.
- **An auth system offered on the way past.** The integration will provision Neon's own
  authentication, and the register records it as disabled.

**None of that is an argument against the exception**; it is the price of the one thing the
integration buys, recorded so that a second exception has to clear the same bar. What it *is* an
argument against is installing an integration for convenience, because every item above arrived
without being asked for.

## Billing is not the discriminator, and ADR-0011 reads as if it is

[ADR-0011](0011-transactional-email-resend.md) → *What will try to reopen this* declines the Resend
integration and names "a billable resource on a Hobby account" first. **Taken as the rule, that
would have refused Neon too**: the Neon plan is Launch, billed through Vercel, which is precisely why
exhausting a Neon quota here bills rather than suspends the compute
([`docs/infrastructure.md`](../infrastructure.md) → *Database*, and
[`docs/runbook.md`](../runbook.md)). Money is a cost on both sides of this line and therefore cannot
be what separates them.

ADR-0011's second clause is the load-bearing one — "takes ownership of the environment variable" —
and this ADR generalises it: **ownership is the standing cost, and a per-deployment resource is the
only thing worth paying it for.** Resend has none, so its integration is the cost with nothing bought.

## What will try to reopen it

Three installed skills route around this decision by design, and one MCP tool reopens a different
ADR while looking compliant with it.

- **`vercel:marketplace`**, whose stated job is "discovering, installing, and managing third-party
  integrations via the `vercel integration` CLI", and whose named categories include
  "observability/monitoring, messaging/email, search, or CMS". That set is exactly the vendors this
  project already holds as plain keys.
- **`vercel:vercel-storage`**, which presents storage as "Blob, Edge Config, and Marketplace storage
  (Neon Postgres, Upstash Redis)" — so a *second* store arrives by the Marketplace route as the
  default, carrying the four costs above for something that may have no preview lifecycle at all.
- **`vercel:bootstrap`**, which lists "provision[ing] integrations" as a bootstrap step, and so
  proposes the route before anyone has asked what is being bought.
- **The `neon` MCP's `provision_neon_auth`.** It is one call, and since Neon rebuilt the feature on
  Better Auth it no longer reads as reopening anything: Neon's own documentation titles it
  **Managed Better Auth**, "powered by Better Auth", pinned to Better Auth 1.4.18, and records that
  the previous implementation was Stack Auth
  ([Neon, Managed Better Auth](https://neon.com/docs/auth/overview), read 17 August 2026). **Until 17 August 2026 the register gave the reason for
  disabling it as "the integration would otherwise provision a competing auth system". That was true
  of Stack Auth and is not true of what replaced it, so the row now points here instead; the reason it
  stays disabled is stronger than the one it lost.** What the call does is create a `neon_auth`
  schema, deploy "a managed REST API service" in the database's region, and return a branch-specific
  auth URL, with the application talking to it through `@neondatabase/auth` rather than
  `better-auth`. ADR-0005 settled on "better-auth, users in our own Postgres"; this keeps the
  library's shape and moves session issuance to a deployment we do not own, while the feature is
  still in Beta. It also lands a schema **no migration created**, which every row-level-security
  tripwire in [`apps/web/src/db/rls.test.ts`](../../apps/web/src/db/rls.test.ts) is blind to:
  **every tripwire that enumerates tables scopes itself to the `public` schema** — some by
  `relnamespace = 'public'::regnamespace`, some by `table_schema = 'public'` — so a second schema is
  outside all of them however many are added.

**What would actually reopen this**, as against merely proposing it: a vendor whose useful unit is
per-deployment, the way Neon's branch is. That is the test, and nothing else on the estate meets it.

## Consequences

- **A new vendor arrives as an account and a key**, with a row in
  [`docs/infrastructure.md`](../infrastructure.md) → *Environment variables* naming the holder, and
  no Marketplace install.
- **A second Marketplace integration is a decision, not a step**, and has to name the
  per-deployment resource it buys before it is installed.
- **Neon Auth stays disabled**, and the register's row now points here for the reason rather than
  carrying its own, because a competing library was never the objection that mattered and has not
  been one since Neon rebuilt the feature.
- **`NEON_` stays.** Removing the prefix hands `DATABASE_URL` to the integration and the owner role
  to the application, which is ADR-0005 rule 1 failing silently.
