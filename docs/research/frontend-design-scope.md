# The front-end design work, and how it divides

**Researched 2026-08-14**, against the two design tickets about to be filed and against
[CAN-50 Record the styling decision, which CAN-22 made by default](https://linear.app/jacobrees-canoncore/issue/CAN-50).
The question: the deferred front-end design work was going to be one ticket and is currently drafted
as two — is two right, does it decompose into more or fewer genuinely separable pieces, and what is
missing from the two as drafted?

Every specification status, criterion number, rule count, version and publish date below was read on
that date from the document or registry that owns it: the W3C's WCAG 2.2 and WCAG 3.0 Recommendations
and Working Drafts, the CSS Working Group's Text, Fonts and Inline drafts, the EPUB 3.3 and Web
Annotation Recommendations, the IIIF Presentation API 3.0 and its Cookbook, the Design Tokens
Community Group's 2025.10 report, `legislation.gov.uk`, Deque's own coverage page, the `axe-core`,
`eslint-plugin-jsx-a11y`, `react-native-tvos`, `react-native-web`, Storybook and satori repositories
and their published tarballs, the npm registry, the GitHub API, Next.js's own documentation, Expo's
and React Native's own documentation, Apple's Human Interface Guidelines and Material Design 3.
Nothing here comes from a blog summarising a spec, a comparison article or a listicle. Claims that
could only be reached second-hand are marked **unverified**.

> **Exclusion note.** Per this repository's standing constraint, no earlier CanonCore or Universora
> repository — anything matching `canoncore*`, `CanonCore*` or `universora*` under any account or
> org — was read, fetched, searched for or quoted. All four research agents reported that no such
> result surfaced. One name did appear, inside this repository's own records: `canoncore-storybook`,
> one of the four Vercel projects deleted on 13 August 2026
> ([`docs/infrastructure.md`](../infrastructure.md), [`docs/incidents.md`](../incidents.md)). It was
> deliberately **not** investigated, and nothing below is informed by it.

## Contents

- [What this proposes](#what-this-proposes)
- [The answer in one paragraph](#the-answer-in-one-paragraph)
- [The cycle is not a cycle](#the-cycle-is-not-a-cycle)
- [What the design work would be done against](#what-the-design-work-would-be-done-against)
- [Web and native share three things, and components are not one of them](#web-and-native-share-three-things-and-components-are-not-one-of-them)
- [Tokens are separable, and the second renderer is already inside v1](#tokens-are-separable-and-the-second-renderer-is-already-inside-v1)
- [Reading is the surface, and it is plain text by statute](#reading-is-the-surface-and-it-is-plain-text-by-statute)
- [Laying out an Ordering: the prior art, and where it runs out](#laying-out-an-ordering-the-prior-art-and-where-it-runs-out)
- [Where both planned gates stop, and it is short of the design](#where-both-planned-gates-stop-and-it-is-short-of-the-design)
- [What the two drafts miss](#what-the-two-drafts-miss)
- [The three tickets](#the-three-tickets)
- [Rejected, with reasons](#rejected-with-reasons)

## What this proposes

**Three tickets, not two**, plus two corrections that belong in the ADR that CAN-50 Record the
styling decision, which CAN-22 made by default is already writing, rather than in the tracker. The
two drafts are wrong in both directions: one piece too few on the `apps/web` side, one piece too
many on the `packages/ui` side. Below, the drafts keep their own names — **Design A** for the
`apps/web` one, **Design B** for the `packages/ui` one — and Design A is what becomes Designs 1 and 2
in the table.

| | What it is | Trigger | Section below |
| --- | --- | --- | --- |
| **Design 1** | Visual identity and the reading surface, in `apps/web` | **None. Unblocked today.** Deadline is the URL-sharing gate | *Reading is the surface* |
| **Design 2** | How an Ordering reads — information architecture and interface copy | CAN-27 Orderings and Placements, and the imported broadcast Ordering, and CAN-28 Author an Ordering by hand, have landed | *Laying out an Ordering* |
| **Design 3** | The accessibility conformance neither planned gate can reach | Design 1 and Design 2 have landed | *Where both planned gates stop* |
| ~~Design B~~ | `packages/ui`, reusable primitives, Storybook | **Do not file.** Its trigger is not reachable and its content is largely a mirage | *Web and native share three things* |
| ~~Design tokens~~ | A DTCG token file | **Do not file yet.** One acceptance criterion on Design 1, one paragraph in ADR-0013 | *Tokens are separable* |

## The answer in one paragraph

**The cycle that forced the split is not a cycle**, because ADR-0005's second-consumer rule governs
*extracting a package*, not *making a design decision*, and nothing about `apps/web` having a visual
identity depends on a second app existing. What a later Expo app would inherit is not components —
those genuinely do not port, for reasons Expo states in writing — but the token *values* and the
accessibility vocabulary, and both of those survive whether or not a package is ever extracted. So
Design A can and should start now, and Design B should not be filed at all: `packages/ui` is named
in no ADR, the tooling that would bridge a Next.js App Router app to React Native has not shipped
since January 2024, and Storybook for web and Storybook for React Native are two different products.
Design A then splits, because its two halves have different triggers and different definitions of
done: the craft half is unblocked today and its deadline is the URL-sharing gate, while the
domain half cannot start until there is an Ordering to lay out. A third piece is genuinely separable
and currently owned by nobody: **the WCAG 2.2 criteria that a design decision can break and that
neither [CAN-52 Lint the accessibility rules eslint-config-next leaves off](https://linear.app/jacobrees-canoncore/issue/CAN-52)
nor [CAN-58 Assert accessibility in the end-to-end tests](https://linear.app/jacobrees-canoncore/issue/CAN-58)
can see**, which matter here because `content/legal/reporting-and-complaints.md` already promises
strangers, on `main`, that these pages work with a keyboard and a screen reader.

## The cycle is not a cycle

The stated reason for splitting one ticket into two was that as one ticket it forms a cycle: design
must precede [CAN-11 Mobile app](https://linear.app/jacobrees-canoncore/issue/CAN-11), or mobile
invents an identity by default; and design must follow it, because
[ADR-0005](../adr/0005-stack.md) → *Repo shape* draws no boundary before a second consumer exists
and [`production-readiness-baseline.md`](production-readiness-baseline.md) → *Rejected, with reasons*
rejects Storybook on exactly that condition.

Three things dissolve it.

**ADR-0005's rule is about packages, not about decisions.** Its words are "no boundary is drawn
before a second consumer exists" and "`packages/domain` and `packages/api-client` get extracted when
`apps/mobile` arrives". It is a rule about when to *move code into a package*. Choosing a typeface,
a palette, a measure and a focus style for `apps/web` moves no code anywhere.

**`packages/ui` is named in no ADR.** ADR-0005 anticipates exactly two extractions and neither is
UI. The only place `packages/ui` appears in this repository is
[`production-readiness-baseline.md`](production-readiness-baseline.md) → *Rejected, with reasons*,
which revisited Storybook "when `packages/ui` is real and consumed by both `apps/web` and the later
Expo apps — which is the genuine second consumer ADR-0005 already anticipates". That last clause was
an over-reading of its own citation: ADR-0005 anticipates `packages/domain` and `packages/api-client`
and says nothing about shared UI at all. **The false attribution was removed when this file landed**;
the trigger that replaces it is recorded there as ADR-0013's, per *Rejected, with reasons* below.

**The thing a later app would inherit is not the thing the rule governs.** The evidence in the next
two sections is that components do not cross from a Next.js App Router app to an Expo app, and that
the parts of a design which do cross — colour and type *values*, and the accessibility vocabulary —
cross as plain data, needing no package boundary and no second consumer to justify them.

So the ordering is: design `apps/web` now, extract nothing, and record in ADR-0013 what would and
would not carry if `apps/mobile` ever arrives.

## What the design work would be done against

Read from the working tree on 14 August 2026, so this is what exists rather than what is planned.

`apps/web/src/app/globals.css` is 86 lines, last touched today by
[CAN-23 One Story from Neon, behind row-level security](https://linear.app/jacobrees-canoncore/issue/CAN-23)
(`aaa495f`). It carries four custom properties (`--bg`, `--fg`, `--muted`, `--rule`), `color-scheme:
light dark`, one `@media (prefers-color-scheme: dark)` block, a system font stack, and
`main { max-width: 34rem }`. It contains **no focus styling of any kind**, no
`prefers-reduced-motion` and no `forced-colors`.

`apps/web/src/app` contains exactly `layout.tsx`, `page.tsx`, `front-page.tsx`,
`front-page.test.tsx` and `globals.css`. Next.js documents `loading`, `error`, `global-error`,
`not-found`, `forbidden`, `unauthorized`, `template` and `default` as file conventions
([Next.js, file-system conventions](https://nextjs.org/docs/app/api-reference/file-conventions)) and
**none of them exists**. There is no `apps/web/public/` directory, so there is no favicon, no icon,
no wordmark and no `opengraph-image`. There is no nav and no footer — which
[`docs/compliance/code-measures-register.md`](../compliance/code-measures-register.md) already
requires under ICU D2, "Reporting route to be linked from the footer of every page".

Two documents in `content/legal/` — 154 lines and eight `##` headings in the terms of service, plus
the reporting and complaints page — are, in the register's own words, "written but is not rendered
anywhere". Nothing in `apps/` or `packages/` references them, and no ticket says how they become
HTML. ICU G3.2(a)(ii) requires each provision to be individually locatable by heading, which is a
statement about anchors and about layout.

## Web and native share three things, and components are not one of them

[CAN-12 TV app (Apple TV)](https://linear.app/jacobrees-canoncore/issue/CAN-12) claims "Shared UI
with web or phone is largely a mirage; what shares is the domain layer", and its own audit
correction says the premise "did not survive verification". **Both are right, about different
boundaries, and the ticket should be split rather than rewritten.**

**Phone ↔ TV: UI genuinely shares.** `react-native-tvos`'s README says the fork is "a full fork of
the main repository, with only the changes needed to support Apple TV and Android TV", built "with
the intention of making existing React Native applications 'just work' on TV, with few or no changes
needed in the JavaScript code"; `Pressable`, `TouchableHighlight` and `TouchableOpacity` "just work"
via native focus events, and `VirtualizedList` contents are "automatically wrapped with a
`TVFocusGuideView`"
([README](https://github.com/react-native-tvos/react-native-tvos/blob/main/README.md)). The TV
additions really are props — `focusable`, `hasTVPreferredFocus`, `nextFocusUp/Down/Left/Right`,
`tvParallaxProperties`, `scrollSnapAlign` — with only four genuinely new components or modules
(`TVFocusGuideView`, `TVTextScrollView`, `TVEventHandler`, `TVEventControl`). Expo documents one
project building both targets: "Using the React Native TV library as the `react-native` dependency
in an Expo project, it becomes capable of targeting both mobile (Android, iOS) and TV (Android TV,
Apple TV) devices" ([Expo, building for TV](https://docs.expo.dev/guides/building-for-tv/)).
`react-native-tvos@0.86.2-0` was published 2026-08-02 and the repo was last pushed 2026-08-08
([npm](https://registry.npmjs.org/react-native-tvos), GitHub API) — this is a live fork, not a stale
one.

**Next.js App Router ↔ Expo: UI does not share as component code.** Expo says so at the top of its
own guide: "**Using Next.js is not an official part of Expo's universal app development workflow**",
"Using Expo with Next.js means you can share **some** of your existing components and APIs", and,
under Limitations, "**Expo Next.js adapter does not support the experimental app directory**"
([Expo, using Next.js](https://docs.expo.dev/guides/using-nextjs/)). The adapter it names,
`@expo/next-adapter`, is at **6.0.0, published 2024-01-08**, and its peer dependencies are
`webpack ^4.46.0 || ^5.74.0` and `react-native-web ^0.18 || ^0.19`
([npm](https://registry.npmjs.org/@expo/next-adapter)) — against Next 16.3.0 with Turbopack and the
`react-native-web ~0.21.0` that Expo SDK 57 pins. `react-native-web` is at **0.21.2, published
2025-10-16**, its default branch's last commit is the same day, and it carries **no deprecation
notice** and 127 open issues (npm registry; GitHub API on `necolas/react-native-web`) — not dead,
but ten months quiet. Its server story is `AppRegistry.getApplication()` into
`ReactDOMServer.renderToString`, not RSC
([react-native-web, rendering](https://necolas.github.io/react-native-web/docs/rendering/)).

The styling model does not survive the crossing either. `react-native-web` "supports all long-form
CSS properties. There is no direct support for `@`-rules, selectors, pseudo-selectors, and
pseudo-elements" ([styling](https://necolas.github.io/react-native-web/docs/styling/)) — which rules
out this repository's `@media (prefers-color-scheme: dark)`, its `* { box-sizing }` and its
`li + li` outright. React Native's own docs are equally plain: "you must use points or percentages.
**Ems and other units are not supported**"
([layout props](https://reactnative.dev/docs/layout-props)), and `View` "elements do not support text
content or text styles" ([RNW, View](https://necolas.github.io/react-native-web/docs/view/)).

**What does cross**, and it is wider than the ticket's "domain layer": the domain types and Zod
schemas; the token *values*; and the accessibility vocabulary, since React Native now accepts the
ARIA spelling and states that "`role` communicates the purpose of a component and has precedence
over the `accessibilityRole` prop" ([RN, accessibility](https://reactnative.dev/docs/accessibility)).
Label strings and role names port; the semantics they buy do not.

**And Expo's monorepo rule is narrower than
[`platform-reach.md`](platform-reach.md) → *4.2 The TV monorepo tax* read it as being.** The wording is
"If you have more than one **Expo project** in a monorepo… then all of them **should** be modified to
use the React Native TV package" — `should`, with a stated reason, and scoped to Expo projects. A
Next.js app that never depends on `react-native` is not an Expo project and has no `react-native`
dependency to conflict. The root `resolutions` pin still reaches `apps/web`'s lockfile; the alias
does not reach an app that never imports the package. That section said "your web app, your phone
app, everything"; **it was narrowed when this file landed**, and the cost it names is real within the
scope Expo actually gives it.

**So Design B should not be filed.** There is no second consumer for a shared component package, and
the one that ADR-0005 does anticipate — an Expo app — would not consume web components if it existed.
Storybook makes it worse rather than better: `@storybook/react-native` is a **separate package**
(10.5.4, 2026-07-27) that runs inside the app under Metro, the addon that renders React Native
components in a *web* Storybook is `@storybook/addon-react-native-web` at **0.0.29, published
2025-03-21**, and Storybook's own Next.js docs put Server Component rendering behind an
`experimentalRSC` feature flag and advise extracting pure components rather than importing
data-fetching pages ([Storybook 10.5, Next.js](https://storybook.js.org/docs/get-started/frameworks/nextjs)).
CAN-22 A page on a public URL, deployed, with CI already did that extraction — `front-page.tsx` is
split from `page.tsx` for exactly that reason — without Storybook.

## Tokens are separable, and the second renderer is already inside v1

The Design Tokens Community Group format reached its first stable version on **28 October 2025**:
*Design Tokens Format Module 2025.10*, a **Final Community Group Report**, which states of itself
"This specification was published by the Design Tokens Community Group. It is not a W3C Standard nor
is it on the W3C Standards Track… This specification is considered stable"
([DTCG 2025.10, Format](https://www.designtokens.org/tr/2025.10/format/)). Note that
`https://tr.designtokens.org/format/` now redirects to a preview draft carrying "Do not refer to this
document directly, and do not implement anything in this document" — cite the dated 2025.10 URL.

**Tokens are genuinely separable from components.** A `.tokens.json` file is inert JSON with no
React, no CSS and no platform API surface, and the spec's own framing is "a file format to exchange
design tokens between different tools".

**But they do not port unchanged, and the spec says so.** `dimension` values are an object with a
numeric `value` and a `unit` of `"px"` or `"rem"` only, and the spec concedes "Not all platforms have
an equivalent to rem, so translation tools MAY need to do a lossy conversion to a fixed px size by
assuming a default font size (usually 16px)". `color` in 2025.10 is an object of `colorSpace` (one of
fourteen) plus `components`, with `hex` merely **optional** — while React Native parses only `srgb`,
`hsl` and `hwb`, and supports no `oklch()`, `lab()`, `color-mix()` or `var()`
([RN, colors](https://reactnative.dev/docs/colors)). Worst of all, DTCG `typography.lineHeight` is a
unitless ratio while React Native's `lineHeight` is an absolute value in points, so a transform must
multiply by `fontSize` and the result stops tracking font-size changes. Of the thirteen types, only
`number` crosses untouched; `cubicBezier` and `duration` are trivial; the other ten need a real
transform and three of them are lossy. Style Dictionary, the reference implementation, ships a
different dimension transform per platform for precisely this reason — `size/rem` for CSS against
`size/object` for React Native
([Style Dictionary, predefined transforms](https://styledictionary.com/reference/hooks/transforms/predefined/))
— and says of the new format "the latest format 2025.10 does not have full support yet in Style
Dictionary. This is a work in progress in v5"
([Style Dictionary, DTCG](https://styledictionary.com/info/dtcg/)).

**The surprising part is that a second renderer arrives inside v1, and it is not Expo.**
[CAN-57 Make a public Ordering discoverable and shareable](https://linear.app/jacobrees-canoncore/issue/CAN-57)
requires Open Graph tags. An Open Graph *image* is `opengraph-image.tsx` rendered by `ImageResponse`
from `next/og`, which is satori — and satori "supports a limited subset of HTML and CSS features",
uses "the same Flexbox layout engine as React Native", does not support `calc`, and "currently
supports three font formats: TTF, OTF and WOFF. Note that **WOFF2 is not supported**"
([satori README](https://github.com/vercel/satori)). Next's own example reads a `.ttf` off disk and
passes it as a buffer
([Next.js, opengraph-image](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)).
So the OG card cannot read `globals.css`, cannot use the `next/font` output, and needs the palette
and the type scale as values. That is a token requirement with a v1 trigger.

**The proportionate answer under this repository's principles is not a tokens ticket.** It is one
acceptance criterion on Design 1 — the palette and type scale are exported as data from
`packages/config` as well as emitted as CSS custom properties — and one paragraph in ADR-0013
recording that a DTCG file with a build step is what would be adopted if a platform with a different
style system ever arrives, along with the fact that only one of thirteen types would cross unchanged.

## Reading is the surface, and it is plain text by statute

Every Placement carries an Argument, so the primary surface is long-form prose interleaved with the
Placements of an Ordering. Two constraints shape it, and neither is in either draft ticket.

**The prose is plain text, and making it richer is a compliance change rather than a design change.**
[CAN-27 Orderings and Placements, and the imported broadcast Ordering](https://linear.app/jacobrees-canoncore/issue/CAN-27)
carries as an acceptance criterion that user free text renders "as plain text and is never
linkified. No `dangerouslySetInnerHTML`, no markdown renderer and no autolinking", with a test
asserting a URL in an Argument produces no anchor element.
[`illegal-content-risk-assessment.md`](../compliance/illegal-content-risk-assessment.md) →
*Step 4 — Review* lists "Linkifying user free text" among the changes that require the assessment to
be **redone before they ship**. So there is no italic for a story title, no blockquote for a citation
and no link from an Argument to the Story it cites. Everything the typography has to do, it has to do
with measure, leading, hierarchy and white space. A design that reaches for a markdown renderer to
make prose readable trips a statutory reassessment. Note the boundary precisely: the prohibition is on
*user* free text, so rendering the repository's own `content/legal/` markdown is a different question
— and an unowned one.

**Only two typographic numbers actually bind, and the popular one is not among them.** WCAG 2.2 is a
W3C Recommendation of **12 December 2024** (republished with errata; originally 5 October 2023), and
WCAG 3.0 remains a Working Draft of 3 March 2026 which says of itself "It is inappropriate to cite
this document as other than a work in progress"
([WCAG 2.2](https://www.w3.org/TR/WCAG22/), [WCAG 3.0](https://www.w3.org/TR/wcag-3.0/)). At AA:

- **1.4.12 Text Spacing** requires that no loss of content or functionality occurs when a user sets
  line height to 1.5×, paragraph spacing to 2×, letter spacing to 0.12× and word spacing to 0.16× the
  font size. It is a robustness requirement, not a design one.
- **1.4.10 Reflow** requires no two-dimensional scrolling at "a width equivalent to 320 CSS pixels",
  which the specification notes is "a starting viewport width of 1280 CSS pixels wide at 400% zoom".

**1.4.8 Visual Presentation — the source of the 80-character figure — is Level AAA**, and its own
Note 1 says "Content is not required to use these values. The requirement is that a mechanism is
available… The mechanism can be provided by the browser". Its 80-character and 1.5-leading figures
are a ceiling satisfiable by the user agent, not a design obligation.

**And the evidence base for the folklore measure does not exist in reachable primary literature.**
The only full-text study reached was Shaikh & Chaparro, *The Effects of Line Length on Reading
Performance of Online News Articles*, HFES 49(5):701–705 (2005),
[doi:10.1177/154193120504900514](https://doi.org/10.1177/154193120504900514), which tested 35, 55, 75
and 95 characters per line and found that "passages formatted with 95 cpl resulted in faster reading
speed", with satisfaction unaffected and preference split to the extremes. Dyson & Haselgrove (2001,
[doi:10.1006/ijhc.2001.0458](https://doi.org/10.1006/ijhc.2001.0458)) and McLeish (2007,
[doi:10.1177/0264619607075995](https://doi.org/10.1177/0264619607075995)) are **unverified** — the
bibliographic records were confirmed but both are paywalled and neither is open access, so neither is
cited for a finding. **No primary source was found establishing 45–75 characters as an optimum.** The
W3C's own Understanding document for 1.4.8 gives a rationale for 80 and cites no study for it.
`main { max-width: 34rem }` in `globals.css` is therefore a house choice, and ADR-0013 should record
it as one rather than implying evidence behind it.

Vendor guidance is thinner than expected and worth stating so nobody re-searches it. **Apple's Human
Interface Guidelines publish no line-length guidance at all**; they do publish per-platform default
and minimum text sizes (iOS 17pt/11pt, macOS 13pt/10pt, **tvOS 29pt/23pt**) and advise that "when you
display text in wide columns or long passages, more space between lines (loose leading) can make it
easier for people to keep their place"
([Apple, Typography](https://developer.apple.com/design/human-interface-guidelines/typography)).
**Material 3 publishes no characters-per-line figure either**, only that for body copy "we recommend
a line height ratio around 1.5 times the type size"
([Material 3, applying type](https://m3.material.io/styles/typography/applying-type)). That 1.5 is
the one number where vendor guidance and WCAG 1.4.12 coincide, and it is the defensible basis for a
body line-height decision.

Every CSS property that a typographic design would reach for is still a draft. `text-wrap-style:
pretty | balance` is in CSS Text 4, a **Working Draft of 8 June 2026**, and the spec says of `pretty`
that "the precise set of improvements is user agent dependent" and of `balance` that "UAs may treat
this value as `auto` if there are more than ten lines to balance" — so `balance` is for headings, not
paragraphs. `hanging-punctuation` is in CSS Text 3, a **Candidate Recommendation Draft** which names
it in its own at-risk list. `font-optical-sizing` is in CSS Fonts 4, a **Working Draft of 11 August
2026** (CSS Fonts 3, the Recommendation, does not define it). `text-box-trim`/`text-box-edge` are in
CSS Inline 3, a **Working Draft**. One settled point from CSS Inline 3 §5.1 is worth taking: a
unitless `line-height` inherits as a number and so tracks descendant font sizes, while `em` and `%`
inherit as absolute lengths and do not.

Two implementation facts from Next.js's own docs bound Design 1. `next/font` gives "built-in
automatic self-hosting" with "No requests are sent to Google by the browser", and `adjustFontFallback`
defaults to on "to reduce Cumulative Layout Shift"
([Next.js, Font Module](https://nextjs.org/docs/app/api-reference/components/font)) — which is the
first-party answer to a self-hosted typeface and matters for the CLS half of
[CAN-60 Gate the front end on bytes, budgets and React lint](https://linear.app/jacobrees-canoncore/issue/CAN-60).
And Next's CSS page warns that because global stylesheets integrate with Suspense, Next "does not
remove stylesheets as you navigate between routes which can lead to conflicts. We recommend using
global styles for *truly* global CSS"
([Next.js, CSS](https://nextjs.org/docs/app/getting-started/css)) — so a design that grows past one
`globals.css` should move to CSS Modules rather than a second global sheet. The same page recommends
Tailwind twice, which makes **Next.js's own documentation** one of the things that will try to reopen
the decision that CAN-50 Record the styling decision, which CAN-22 made by default is recording,
alongside the `vercel:shadcn` and `vercel:next-forge` skills that ticket already names.

## Laying out an Ordering: the prior art, and where it runs out

[`chronology-reference-shape.md`](chronology-reference-shape.md) records the scale this has to
survive: 551 and 614 entries on two reference pages, at roughly 147,000 and 114,000 characters, every
position followed by prose, phases as inline groupings (50 of them on one page), two distinct kinds
of unplaced, and a filter UI over six orthogonal axes. **CAN-17 v1: the walking skeleton in
production, then the founding case puts filtering out of scope for v1** —
"All four are displayed; none is filterable" — so the design brief is a six-hundred-entry prose
document that a stranger has to be able to read with no filter. Neither draft ticket says that, and
the acceptance criteria of CAN-27 Orderings and Placements, and the imported broadcast Ordering and
of CAN-28 Author an Ordering by hand say only that the entries render in position order.

**IIIF Presentation API 3.0 has already solved the shape, and its solution is to give the position
its own URI.** A `Range` is "an ordered list of Canvases, and/or further Ranges"; the `sequence`
behavior marks a Range as "different orderings of the Canvases listed in the `items` property of the
Manifest"; and "if there is more than one Range that has the behavior value `sequence`, for example a
second Range to represent an alternative ordering of the pages of a manuscript, the first Range should
be used as the default and the others should be able to be selected". The spec is explicit that a
Canvas may be referenced from several Ranges — it says Canvases "DO NOT inherit behaviors from any
referencing Ranges, as there might be several with different behaviors" — and that a Range's contents
"need not be contiguous or in the same order as in the Manifest's `items` property or any other
Range". Ranges "must have URIs", while "this is not true for Canvases, which must have their own URI
without a fragment", and a Range "may have the `annotations` property"
([IIIF Presentation 3.0](https://iiif.io/api/presentation/3.0/)). Cookbook recipe 0027 is a worked
two-ordering example, "Physical sequence" `p1,p2,p3,p4` against "Author-intended sequence"
`p2,p3,p4,p1`, with no per-position prose field on either
([IIIF Cookbook 0027](https://iiif.io/api/cookbook/recipe/0027-alternative-page-order/)). Position as
an addressable resource, record as a stable URI, argument as an annotation: that is the published
shape, and it is what this product's Placement already is.

**EPUB 3.3 is the counter-example, and its split is the useful one.** The Recommendation states of
spine items that "`item` element IDs MUST NOT be referenced more than once"
([EPUB 3.3](https://www.w3.org/TR/epub-33/)) — a flat prohibition on one resource occupying two
positions in the reading order. Its *navigation* document has no such rule. EPUB separates a reading
order, where duplicates are forbidden, from a navigation structure, where they are fine. Everything
CanonCore does lives on the navigation side of that line.

**The distinction story 7 of CAN-17 v1: the walking skeleton in production, then the founding case
asks for has no published solution.** Wikibase — the most mature
published model of many values with per-value evidence, and the origin of a rank vocabulary almost
identical to this repository's — states outright that "there may be multiple preferred statements.
This may imply a multi-valued property (e.g. a person's children), **or a disagreement** (diverging
population figures given by different sources)", and declines to distinguish them, adding "this model
is intentionally left coarse and simple"
([Wikibase DataModel](https://www.mediawiki.org/wiki/Wikibase/DataModel)). RDF Schema 1.1's
`rdf:Seq`/`rdf:Alt` pair is the nearest published expression of "all of these" against "choose one",
and RDF concedes it is convention: `rdf:Seq` is "formally… no different from an `rdf:Bag` or an
`rdf:Alt`" ([RDF Schema 1.1](https://www.w3.org/TR/rdf-schema/)). **So "this happens twice" versus "we
do not know which is right" is a distinction this product has to draw in the interface, because no
published model draws it in the data.** That is the single hardest thing in Design 2, and it is
exactly what that ticket calls the definition of done.

Three lesser findings, recorded so nobody re-researches them. TMDB Episode Groups carry a per-group
`description` and a per-episode `order` but **no per-position prose**, and their documentation is
silent on whether an episode may appear twice in one group
([TMDB, episode group details](https://developer.themoviedb.org/reference/tv-episode-group-details)).
TheTVDB v4 gives one scalar `number` per season type, so multi-positioning happens across orders
rather than within one, and carries no justification field
([TVDB v4 OpenAPI](https://thetvdb.github.io/v4-api/swagger.yml)). The W3C Web Annotation Data Model
is the right shape for an Argument and publishes thirteen motivations, of which the closest are
`assessing` and `describing` — **there is no motivation meaning "argues for"**, though the companion
vocabulary sanctions new ones as `skos:Concept` subclasses
([Web Annotation Data Model](https://www.w3.org/TR/annotation-model/)). IFLA LRM names ordering as
constitutive of an aggregating work and then provides no element to record it in, and BIBFRAME 3.0.1
has no ordering property at all — `bf:order` does not exist.

## Where both planned gates stop, and it is short of the design

This is the section that turns a suspicion into a ticket.

**The tag list in CAN-58 Assert accessibility in the end-to-end tests was Playwright's documented
one, and it contained no WCAG 2.2 tag.** The ticket specified `wcag2a`, `wcag2aa`, `wcag21a` and
`wcag21aa`, which is exactly what
[Playwright's accessibility-testing page](https://playwright.dev/docs/accessibility-testing)
recommends, and that page mentions no 2.2 tag anywhere. **`wcag22aa` was added to the ticket when
this file landed**, on the reasoning in the next two paragraphs: it costs nothing, it is the whole of
what WCAG 2.2 adds to any axe run, and leaving it off would have left the gate silently stopping at
2.1 while the self-imposed target recorded below is 2.2 AA. It buys one rule, and the ceiling below
is unmoved.

**axe-core has exactly one rule across all nine criteria WCAG 2.2 added.** Its own rule-descriptions
document carries a "WCAG 2.2 Level A & AA Rules" section containing a single entry, `target-size`
(2.5.8), prefaced with "These rules are disabled by default, until WCAG 2.2 is more widely adopted
and required"
([axe-core rule descriptions](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)).
There is **no `wcag22a` tag in axe-core at all**, so the two Level A additions — 3.2.6 Consistent Help
and 3.3.7 Redundant Entry — are unreachable by any tag. Tag greps returning zero rules: `wcag1410`
(Reflow), `wcag1411` (Non-text Contrast), `wcag247` (Focus Visible), `wcag2411`, `wcag2413`,
`wcag257`, `wcag326`, `wcag337`, `wcag148`. axe-core is at 4.13.0, published 2026-08-05.

One correction while we are here: passing `withTags(['wcag22aa'])` **does** run `target-size` despite
its `enabled: false`, because `rule.enabled` is only consulted when the include list is empty
([`rule-should-run.js`](https://github.com/dequelabs/axe-core/blob/develop/lib/core/utils/rule-should-run.js)).
It is easy to state the opposite.

**The standard assertion discards the results that matter most.** axe separates `incomplete` from
`violations` — "these results were aborted and require further testing. This can happen either because
of technical restrictions to what the rule can test"
([axe-core API](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md)) — and
`expect(results.violations).toEqual([])` ignores that array entirely. axe's own locale strings show
where `color-contrast` degrades to `incomplete`: background image, background gradient, contained
image node, overlapped by another element, complex text shadows, alpha transparency, partially
obscured, outside the viewport, pseudo element. **Every one of those is a design condition.** Where a
styling decision lives is precisely where the gate goes quiet.

**Deque's own page concedes the criterion-coverage number this repository cited it as refuting.**
CAN-32 Roles, takedown, and the Online Safety Act surfaces, CAN-58 Assert accessibility in the
end-to-end tests and [`production-readiness-baseline.md`](production-readiness-baseline.md) →
*What to gate on, and what not to* all cite that page for the 57% figure. The same
page says: "In our analysis we found automated issues for **16 out of the 50 Success Criteria** under
WCAG 2.1 Level AA. **This supports the 20 to 30% automated coverage claims that many experts claim
today.** However, our analysis indicates that this definition does not accurately reflect the number
of issues found in testing real web pages"
([Deque, automated coverage](https://www.deque.com/automated-accessibility-testing-coverage/)).
**So Deque affirms the 16/50 count and disputes only what it is taken to measure**: the definition is
inaccurate as a predictor of issue *volume*, not as a count of criteria. Its 16/50 is measured
against WCAG **2.1**, before any of 2.2's new criteria exist in the study. The repository's use of
57.38% as a floor is correct; describing Deque as rejecting the criterion-count framing outright is
not, and the two places that did — CAN-58 Assert accessibility in the end-to-end tests and
`production-readiness-baseline.md` — were reworded when this file landed. **`docs/compliance/code-measures-register.md` does not cite that page at all**, so
nothing in the statutory records moves.

Deque's own appendix is the sharpest evidence. In its corpus, **1.4.11 Non-text Contrast is `N/A`
automated against 4,539 manual issues**, **1.4.10 Reflow is `N/A` against 1,181**, **2.4.7 Focus
Visible is `N/A` against 7,312**, and **1.4.12 Text Spacing is 15 automated against 657 manual**. Even
1.4.3 Contrast, the highest-volume criterion in the whole study, leaves 14,981 issues that only
manual testing found.

**`eslint-plugin-jsx-a11y` cannot reach any of it, and that is architectural rather than a gap.** Its
own README calls it a "**static AST checker** for accessibility rules on JSX elements" and says
"because it only catches errors in static code, use it in combination with" a runtime checker. It
never renders, never computes a style and never has a viewport, so contrast, target size, focus
appearance and reflow are not expressible in what it sees. Grepping its README for `contrast`,
`target size`, `reflow`, `zoom`, `color`, `spacing` and `viewport` returns zero matches.

**One correction to CAN-52 Lint the accessibility rules eslint-config-next leaves off and to
`production-readiness-baseline.md`, applied when this file landed.** Both said that
`eslint-plugin-jsx-a11y`'s `recommended` config enables "29 rules as `error`". Unpacking
`eslint-plugin-jsx-a11y@6.10.2` (the current `latest`, published 2024-10-26) and counting its
`recommendedRules` object: **34 rules are named, three are set to `off`
(`anchor-ambiguous-text`, `control-has-associated-label`, `label-has-for`), leaving 31 active at
`error`** out of 39 rules shipped. Nothing about the ticket changes; the number does, and both now
say 31.

**No UK instrument binds this service to WCAG 2.2 AA.** The Public Sector Bodies (Websites and Mobile
Applications) (No. 2) Accessibility Regulations 2018 apply, by regulation 4(1), to "a website or
mobile application of a **public sector body**", and the instrument never mentions WCAG at all
([SI 2018/952](https://www.legislation.gov.uk/uksi/2018/952/made)). The Equality Act 2010's
reasonable-adjustments duty does attach to a service provider (s.29(7)) and is owed to "disabled
persons generally" (Schedule 2, para 2(2)), but names no standard and no level
([s.29](https://www.legislation.gov.uk/ukpga/2010/15/section/29),
[Sch 2](https://www.legislation.gov.uk/ukpga/2010/15/schedule/2)). This is scope, not legal advice.
**So WCAG 2.2 AA here is a self-imposed target — which is exactly the kind of thing ADR-0013 should
record, rather than something to track as a compliance obligation.** What *is* an obligation is
narrower and already written down: ICU G3.2(d) and ICU D2.4 on the terms page and the reporting
route, plus ICU G3.2(b) — the terms should be "laid out and formatted in a way that helps United
Kingdom users read and understand them" — and ICU D2.3(e), the reporting process designed for a
reading age of 13. [`code-measures-register.md`](../compliance/code-measures-register.md) →
*Sub-measures recorded explicitly* says of the last two: "**Neither is asserted as tested**". And
`content/legal/reporting-and-complaints.md` already promises the public, on `main`: "We are building
this page and our reporting route to work with a keyboard alone and with a screen reader."

## What the two drafts miss

Collected so the gap list is one place rather than scattered above.

- **Nine unbuilt Next.js states.** `loading`, `error`, `global-error`, `not-found`, `forbidden`,
  `unauthorized`, plus empty lists, import progress (story 35 of CAN-17 v1: the walking skeleton in
  production, then the founding case — "a long import is not a blank
  screen") and a favicon. None exists; none is designed anywhere.
- **The global shell.** No nav, no footer, no skip link — while ICU D2 requires the reporting route
  "linked from the footer of every page", and WCAG 3.2.6 Consistent Help (Level A, new in 2.2)
  requires help mechanisms to occur in the same order across a set of pages.
- **How `content/legal/` becomes HTML**, with per-heading anchors for ICU G3.2(a)(ii). Written, not
  rendered, not ticketed.
- **Interface copy for the domain vocabulary.** `CONTEXT.md` → *Using these documents* and
  `CODING_STANDARDS.md` → *Domain language* both govern "names in code, tests and issue titles".
  **Neither mentions user-facing labels.** The definition of done in CAN-17 v1: the walking skeleton
  in production, then the founding case is a stranger reading the page
  "the way they would read a wiki page", and that stranger meets Ordering, Placement, Argument, Phase,
  entry type, rank, Unplaced and Validity with no onboarding. Whether the page says "Placement" is an
  open decision nobody has taken.
- **Six hundred entries with no filter**, per *Laying out an Ordering* above.
- **The design deadline is inside v1, not after it.** [`docs/infrastructure.md`](../infrastructure.md)
  → *The URL-sharing gate* lists gate one's two outstanding conditions as CAN-32 Roles, takedown, and
  the Online Safety Act surfaces and CAN-30 GDPR export and erasure, both v1 tickets. The first
  stranger arrives when they land, and sees whatever design exists then.
- **The token requirement with a v1 trigger**, per *Tokens are separable* above.
- **The WCAG 2.2 AA criteria no planned gate can see**, per the section above.

## The three tickets

**Design 1 — Visual identity and the reading surface.** Type, colour, spacing, dark mode, focus
styling, the nine unbuilt states, the global shell, and how `content/legal/` renders. Its acceptance
criteria should include the palette and type scale exported as data from `packages/config` as well as
CSS custom properties, and a recorded reason for the chosen measure rather than an implied one.
**Trigger: none — unblocked today. Deadline: before the URL-sharing gate opens.** Its definition of
done is that a stranger finds the page legible and finished.

**Design 2 — How an Ordering reads.** The information architecture of a six-hundred-entry, unfiltered,
argument-per-entry document: Phases as groups, entry type and rank as legible distinctions, Unplaced
at the end, Validity as a label, the Story page showing every Ordering it appears in, and above all
story 7 of CAN-17 v1: the walking skeleton in production, then the founding case — one Story at two
positions readable as two positions of one thing, with "this
happens twice" distinguishable from "we do not know which is right". Plus the interface copy for the
eight domain terms. **Trigger: CAN-27 Orderings and Placements, and the imported broadcast
Ordering, and CAN-28 Author an Ordering by hand, have landed.** Its definition of done is the product
thesis being legible without explanation.

**Design 3 — The accessibility conformance no gate reaches.** The criteria that can only be checked
against a built, populated page: 1.4.10 Reflow at 320 CSS px, 2.4.11 Focus Not Obscured, 1.4.12
surviving a text-spacing override, 1.4.4 at 200%, 3.2.6 across the page set, and the `incomplete`
results that the assertion in CAN-58 Assert accessibility in the end-to-end tests discards. Its
output is a record naming which criteria were checked by hand and how, which
`code-measures-register.md` can then cite instead of asserting. **Trigger: Design 1 and Design 2
have landed**, since there is nothing to audit before that. The criteria that are
decided *while* designing — 1.4.3 contrast, 1.4.11 non-text contrast, 2.4.13 focus appearance, 2.5.8
target size — belong as acceptance criteria on Designs 1 and 2, not here.

## Rejected, with reasons

Named so the boundary is recorded rather than implied, and so a later reader does not read each gap
as an oversight.

- **Design B as drafted — `packages/ui`, primitives, Storybook.** No ADR anticipates `packages/ui`;
  components do not cross from a Next.js App Router app to an Expo app; the adapter that would bridge
  them last shipped 2024-01-08 against webpack and `react-native-web ^0.18 || ^0.19`; Storybook for
  web and Storybook for React Native are separate products and the addon bridging them is at 0.0.29
  from March 2025. The corrected trigger — "a second app rendering to the same primitives", which is
  phone-and-TV inside one Expo project rather than web-and-native — belongs in ADR-0013.
- **A design-tokens ticket now.** Real and separable, but with one app, one OG image and one person,
  a `.tokens.json` file plus a build step is the speculative abstraction this repository's principles
  rule out. Adopt the requirement as data; adopt the format when a platform with a different style
  system exists. Revisit if `apps/mobile` is ever created.
- **Rewriting `apps/web` in `View`/`Text` so components could be shared.** It would cost element
  selectors, `@media` and pseudo-classes (none supported by `react-native-web`'s styling model), the
  App Router, and RSC — trading a working product for unfinished complexity, which
  `CLAUDE.md` → *Engineering principles* forbids by name.
- **Adopting Tailwind or shadcn/ui as part of the design work.** Out of scope here; that decision is
  that of CAN-50 Record the styling decision, which CAN-22 made by default, and belongs in
  ADR-0013. Recorded only because Next.js's own CSS page now recommends Tailwind twice, which makes
  the framework's documentation a fourth thing that will try to reopen it.
- **A markdown renderer or rich text for Arguments.** Not a design choice at all: CAN-27 Orderings and
  Placements, and the imported broadcast Ordering prohibits it
  and `illegal-content-risk-assessment.md` → *Step 4 — Review* makes linkifying user free text a
  change requiring the assessment to be redone before it ships.
- **Visual regression snapshots as a fourth ticket.** `toHaveScreenshot()` is available at zero
  marginal cost, but Playwright warns "for consistent screenshots, run tests in the same environment
  where the baseline screenshots were generated"
  ([Playwright, visual comparisons](https://playwright.dev/docs/test-snapshots)), and this repository's
  Playwright suite drives a *deployed* URL from a laptop rather than running as one of the four CI
  gates ([`docs/agents/workflow.md`](../agents/workflow.md) → *The gates*). It can be an acceptance
  criterion on Design 1 once the design is stable; it cannot be a gate.
- **A design ticket blocked on CAN-11 Mobile app.** That is the cycle, and *The cycle is not a cycle*
  above is why it is not one.
- **Waiting for WCAG 3.0.** It is a Working Draft that says of itself "It is inappropriate to cite
  this document as other than a work in progress", and WCAG 2.2 calls itself "needed as an interim
  measure" for a "multi-year effort".
- **Citing 45–75 characters as an evidence-based measure.** No reachable primary source supports it;
  the one full-text study found the longest line fastest. Record the chosen measure as a house
  decision.
