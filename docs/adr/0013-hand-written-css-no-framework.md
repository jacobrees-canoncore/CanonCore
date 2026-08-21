---
status: accepted
---

# Styling is hand-written CSS, with no framework and no component library

`apps/web/src/app/globals.css` is 86 lines of hand-written CSS: four custom properties, one
`@media (prefers-color-scheme: dark)` block, a system font stack, and element selectors on semantic
HTML. There is no `postcss.config`, no `tailwind.config`, no `components.json`, and no styling
dependency in `apps/web/package.json`.

**Nothing decided that.** [CAN-22 A page on a public URL, deployed, with CI](https://linear.app/jacobrees-canoncore/issue/CAN-22)
shipped a page and the styling arrived with it, which left the one significant stack choice with no
ADR behind it — and therefore the one an installed skill can reopen without contradicting anything
written down. This ADR ratifies the default and records what it was weighed against. Settled
14 August 2026 under
[CAN-50 Record the styling decision, which CAN-22 made by default](https://linear.app/jacobrees-canoncore/issue/CAN-50).

## Contents

- [The scale this is decided against](#the-scale-this-is-decided-against)
- [Deferring is nearly free, which is what makes deferring right](#deferring-is-nearly-free-which-is-what-makes-deferring-right)
- [The rejected alternatives](#the-rejected-alternatives)
- [What would cross to a second app, and what would not](#what-would-cross-to-a-second-app-and-what-would-not)
- [Two constraints recorded here because the design work has no other home](#two-constraints-recorded-here-because-the-design-work-has-no-other-home)
- [What will try to reopen it](#what-will-try-to-reopen-it)
- [Consequences](#consequences)

## The scale this is decided against

Read from the working tree on 14 August 2026:

- `globals.css` is **86 lines, 1,164 bytes**.
- The application contains **one `className` in total** — `<p className="lead">` in
  `front-page.tsx`. Everything else is styled through element selectors on semantic HTML.
- The whole styled surface is two headings, two paragraphs, two rules and a list: a 33-line
  `front-page.tsx` and a 19-line root layout.

**What a CSS framework sells is scale management**: a shared vocabulary so that several people name
the same thing the same way, scoping so that one component's styles cannot reach another's, and
dead-style elimination so that an unused rule costs nothing to ship. Each is the answer to a problem
that a 1KB sheet with one class name and one contributor does not have. `CLAUDE.md` →
*Engineering principles* asks for "the simplest implementation that fully meets the current
requirements" and rules out speculative abstraction by name.

**Custom properties and `prefers-color-scheme` are the platform's own mechanism**, needing no build
step, no plugin and no configuration file.
[CAN-89 Give the product a visual identity and a reading surface](https://linear.app/jacobrees-canoncore/issue/CAN-89)
extends that sheet directly; it does not have to replace it first. **It has since done so, and the
values it chose are [ADR-0030](0030-the-visual-identity.md)** — including the reason for the measure
that *Two constraints recorded here* below asks for.

## Deferring is nearly free, which is what makes deferring right

[ADR-0005](0005-stack.md) → *No build orchestrator* declined Turborepo on the reasoning that "adding
it later is a config file rather than a migration, which makes deferring it nearly free and adopting
it early a speculative abstraction of the sort this repo's principles rule out". Tailwind has the
same shape. Adopting it is `pnpm add -D tailwindcss @tailwindcss/postcss`, a `postcss.config.mjs`,
and `@import "tailwindcss"` at the top of the sheet that already exists — the steps Next.js's own
CSS guide gives at the version installed here (`next@16.3.0`,
`dist/docs/01-app/01-getting-started/11-css.md`, shipped inside `node_modules`).

Nothing has to be undone to adopt it, so nothing is lost by waiting until there is something to
adopt it for. The reverse does not hold: a framework taken now would be in the markup of every
component written between now and the day it stopped being wanted.

## The rejected alternatives

**Tailwind CSS** is the ecosystem's default answer and the one the framework itself gives — see
*What will try to reopen it*. It is rejected for now on the argument above, plus one specific to
this ticket: Tailwind ships a palette, a type scale and a spacing scale, and taking them is a design
decision. Taking them *by default* is precisely the failure this ADR exists to record. CAN-89 Give
the product a visual identity and a reading surface has to choose those values deliberately
whichever mechanism ends up carrying them.

**shadcn/ui** is not separable from the Tailwind decision. Its own manual-installation page states
that components "are styled using Tailwind CSS and require Tailwind CSS to be installed in the
project", with `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` and
`tw-animate-css` as core dependencies
([shadcn/ui, manual installation](https://ui.shadcn.com/docs/installation/manual)); `shadcn init`
then writes `components.json`, a `cn()` utility and a CSS-variable theme
([shadcn/ui, CLI](https://ui.shadcn.com/docs/cli)). So it is the Tailwind decision plus five
packages plus a config file. What it offers is dozens of components; this product renders a heading,
a paragraph and a list. Copying source rather than installing a package makes it look free, and it
is not — the accessibility behaviour of every copied component becomes ours to maintain, and
[CAN-91 Check the accessibility conformance neither planned gate can reach](https://linear.app/jacobrees-canoncore/issue/CAN-91)
is the ticket that would inherit it.

**A component library — MUI, Chakra, Mantine** — fails against this stack rather than against taste.
Next.js's own CSS-in-JS guide lists `@mui/material` and `chakra-ui` among the libraries "supported in
Client Components in the `app` directory" (`dist/docs/01-app/02-guides/css-in-js.md`), and MUI's
documented App Router integration puts `AppRouterCacheProvider` in the root layout with `'use
client'` on the theme provider
([MUI, Next.js integration](https://mui.com/material-ui/integrations/nextjs)). That is a client
boundary at the root of an application whose front page is a Server Component reading the database.
They also arrive carrying a finished visual identity, which for a product with a house style is the
thing to avoid rather than the thing to buy.

**CSS Modules is not a rejected alternative; it is the recorded growth path.** The same Next.js CSS
guide warns that because global stylesheets integrate with Suspense, Next "does not remove
stylesheets as you navigate between routes which can lead to conflicts", and recommends global
styles for "*truly* global CSS". When one sheet stops being enough the answer is a `*.module.css`
beside the component — never a second global sheet.

## What would cross to a second app, and what would not

[ADR-0005](0005-stack.md) → *Repo shape* draws no boundary "before a second consumer exists", and
that rule is read as blocking a styling or design decision until `apps/mobile` exists. It is not: it
governs when code moves into a package. Two corrections belong here rather than in the tracker, and
[`frontend-design-scope.md`](../research/frontend-design-scope.md) → *Web and native share three
things, and components are not one of them* holds the evidence for both.

**A shared component package is not what a second app would want.** `packages/ui` is named in no
ADR; ADR-0005 anticipates `packages/domain` and `packages/api-client` and nothing about shared UI.
Components do not cross from a Next.js App Router app to an Expo one — `@expo/next-adapter` is at
6.0.0 from January 2024 against webpack, Expo's own guide says the adapter "does not support the
experimental app directory", and `react-native-web` has "no direct support for `@`-rules, selectors,
pseudo-selectors, and pseudo-elements", which rules out this sheet's
`@media (prefers-color-scheme: dark)` and its `li + li` outright. **The trigger for a shared
primitives package is a second app rendering to the same primitives — phone and TV inside one Expo
project, not web and native.** That replaces the trigger
[`production-readiness-baseline.md`](../research/production-readiness-baseline.md) once attributed to
ADR-0005, which ADR-0005 never said.

**What crosses is values, not code, and values need no package.**
[CAN-57 Make a public Ordering discoverable and shareable](https://linear.app/jacobrees-canoncore/issue/CAN-57)
proves it inside v1 with no second app at all: an Open Graph image is satori by way of `next/og`, so
it cannot read `globals.css` and cannot use `next/font`'s output, and needs the palette and type
scale as data. CAN-89 Give the product a visual identity and a reading surface carries that as an
acceptance criterion — exported from `packages/config` as well as emitted as custom properties. A
DTCG token file with a build step is what would be adopted if a platform with a different style
system ever arrived; of that format's thirteen types only `number` crosses unchanged and three are
lossy, so adopting it today would buy a build step and a lossy transform for one renderer.

**NativeWind is the one real argument for Tailwind crossing**, and it does not decide this.
[`platform-reach.md`](../research/platform-reach.md) records that Tailwind's `focus:` and `active:`
pseudo-classes work on tvOS through it, because focus and blur are real native events there. But the
benefit arrives only with `apps/mobile`, which [ADR-0005](0005-stack.md) → *Sequence* puts after v1,
and adopting Tailwind then costs exactly what it costs now.

## Two constraints recorded here because the design work has no other home

Neither is about a framework, and both were assigned to this ADR rather than to a ticket:
[`frontend-design-scope.md`](../research/frontend-design-scope.md) → *Rejected, with reasons* for the
first, and CAN-91 Check the accessibility conformance neither planned gate can reach for the second.
They sit here because a decision that binds every later design ticket is an ADR's job, not a
ticket's.

**The measure is a house choice and should read as one.** `main { max-width: 34rem }` is in the sheet
today, and the familiar 45–75 character figure has no reachable primary source behind it: WCAG 1.4.8
Visual Presentation is Level AAA and its own note says the mechanism may be provided by the browser,
Apple's Human Interface Guidelines publish no line-length guidance, Material 3 publishes no
characters-per-line figure, and the one study reached in full text found the *longest* line fastest
(Shaikh & Chaparro 2005,
[doi:10.1177/154193120504900514](https://doi.org/10.1177/154193120504900514)). Whatever CAN-89 Give
the product a visual identity and a reading surface chooses is therefore a decision, not a finding.
Record the reason; do not imply evidence. The working is in
[`frontend-design-scope.md`](../research/frontend-design-scope.md) → *Reading is the surface, and it
is plain text by statute*.

**WCAG 2.2 AA is a self-imposed target.** No UK instrument binds this service to it: the Public
Sector Bodies (Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018 apply to a
public sector body and never mention WCAG at all
([SI 2018/952](https://www.legislation.gov.uk/uksi/2018/952/made)), and the Equality Act 2010's
reasonable-adjustments duty names no standard and no level
([s.29](https://www.legislation.gov.uk/ukpga/2010/15/section/29)). What *is* an obligation is
narrower and already written down in
[`code-measures-register.md`](../compliance/code-measures-register.md). Holding to AA anyway is a
decision this project takes, which is why it belongs here and not in the compliance record. This is
scope, not legal advice.

## What will try to reopen it

**`vercel:shadcn`**, whose stated purpose is adding a component library. Its path patterns include
`apps/*/src/components/ui/**` and `packages/*/src/components/ui/**` — directories this repository
would create the moment it has a second component — and its bash patterns include
`pnpm create next-app`.

**`vercel:next-forge`**, which installs a Turborepo layout whose `packages/design-system` is shadcn
components. Its path patterns include `pnpm-workspace.yaml` and `apps/web/**`, **both of which exist
here now**, so it can activate against this repository as it stands. It reopens ADR-0005's
orchestrator and repo-shape decisions in the same move.

**Next.js's own documentation**, which is the strongest of the three because it is first-party and
cannot be uninstalled. At the version installed here it recommends Tailwind twice in normative
voice — "We recommend using global styles for *truly* global CSS (like Tailwind's base styles),
Tailwind CSS for component styling, and CSS Modules for custom scoped CSS when needed", and, under
*Recommendations*, "**Use Tailwind CSS** for most styling needs as it covers common design patterns
with utility classes" — and lists Tailwind first among the six options. It is advice about the
median project, which this is not.

**What would actually reopen it**, as against merely proposing it:

- **A second app rendering to the same primitives**, per the corrected trigger above.
- **A second person writing CSS here.** A shared vocabulary is most of what a framework buys, and
  there is nothing to coordinate while there is one contributor.
- **The sheet outgrowing one file**, which is answered by CSS Modules before it is answered by a
  framework.

## Consequences

- **CAN-89 Give the product a visual identity and a reading surface designs into `globals.css` and
  `packages/config`**, with no framework to adopt first and no component library's identity to
  displace.
- **The palette and type scale exist as data, not only as CSS**, because CAN-57 Make a public
  Ordering discoverable and shareable renders an image that cannot read the stylesheet.
- **Growth goes to CSS Modules, not to a second global sheet**, on Next's own Suspense warning.
- **Nothing has to be removed to reverse this.** Adopting Tailwind later is two dev dependencies, a
  PostCSS config and one `@import`, which is what makes the deferral cheap rather than merely
  cautious.
