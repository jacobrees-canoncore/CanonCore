---
status: accepted
---

# The visual identity: colour, typography, spacing and the measure

[ADR-0013](0013-hand-written-css-no-framework.md) settled the *mechanism* — hand-written CSS, no
framework, no component library — and left the values themselves to be chosen deliberately by
[CAN-89 Give the product a visual identity and a reading surface](https://linear.app/jacobrees-canoncore/issue/CAN-89).
This is that choice. Settled 21 August 2026.

**Every number here is a decision rather than a finding, and the ones people expect evidence for are
exactly the ones with none.** ADR-0013 → *Two constraints recorded here because the design work has
no other home* asked for the reason behind the measure to be written down instead of implied; this
document does that for the measure and for everything beside it.

## Contents

- [What was chosen](#what-was-chosen)
- [The palette, and why a separator and a border are different colours](#the-palette-and-why-a-separator-and-a-border-are-different-colours)
- [The reader's own fonts, and a serif for the prose](#the-readers-own-fonts-and-a-serif-for-the-prose)
- [The measure is a preference, and it is 34 rem](#the-measure-is-a-preference-and-it-is-34-rem)
- [The criteria taken while designing, and what each measured](#the-criteria-taken-while-designing-and-what-each-measured)
- [The values live twice, and a test is what keeps them equal](#the-values-live-twice-and-a-test-is-what-keeps-them-equal)
- [What will try to reopen it](#what-will-try-to-reopen-it)
- [Consequences](#consequences)

## What was chosen

| | |
| --- | --- |
| Colour | Seven roles, two themes. Warm off-white paper, near-black warm ink, one accent |
| Typography | The reader's own fonts: a serif for prose, a sans for the interface |
| Scale | Six sizes, each 1.2 from the last, `body` at 1 rem |
| Spacing | Eight steps on a quarter-rem grid, named by how many quarter-rems each is |
| Measure | 34 rem |
| Leading | 1.6 for prose, 1.2 for headings, both unitless |
| Focus | A 3 px accent ring at a 2 px offset, on bare `:focus-visible` |
| Controls | 2.75 rem tall, which is 44 CSS pixels at the default root size |

The values are in [`packages/config/src/design.ts`](../../packages/config/src/design.ts) and in
[`apps/web/src/app/globals.css`](../../apps/web/src/app/globals.css), and
`design-tokens.test.ts` fails if those two disagree.

## The palette, and why a separator and a border are different colours

The warm paper and warm ink were already there, from
[CAN-22 A page on a public URL, deployed, with CI](https://linear.app/jacobrees-canoncore/issue/CAN-22),
and are kept: for a product whose surface is prose, an off-white that is not `#ffffff` is most of the
character at no cost at all. What is new is an accent and a split.

**The split is `rule` from `edge`, and it is the one thing here a reviewer's eye slides over.** A
separator carries no information — take it away and the page still says everything it said — so it
may be as faint as taste likes. A control's border **is** the information that a control is there,
which WCAG 2.2 **1.4.11 Non-text Contrast** holds at 3:1 against what it sits on. One token doing
both jobs is how a sheet fails 1.4.11 while looking tasteful, and it is what this sheet did: `--rule`
was the border of every input at 1.28:1.

**The accent has exactly one job**, which is the focus ring, and it takes a second in the favicon
because a browser tab may be either colour and the ink is not visible on both. Links deliberately do
not take it: every anchor this application renders points at one of its own routes or at its own
reporting address, so an anchor is navigation furniture and the underline does the work.

Measured ratios, computed from the specification's own relative-luminance definition and asserted in
`design-tokens.test.ts` rather than recorded here alone:

| Pair | Light | Dark | Floor |
| --- | --- | --- | --- |
| `fg` on `bg`, and `bg` on `fg` | 16.84:1 | 16.18:1 | 4.5:1 — 1.4.3 |
| `muted` on `bg` | 5.15:1 | 5.50:1 | 4.5:1 — 1.4.3 |
| `problem` on `bg` | 7.74:1 | 8.98:1 | 4.5:1 — 1.4.3 |
| `edge` on `bg` | 3.12:1 | 3.21:1 | 3:1 — 1.4.11 |
| `focus` on `bg` | 4.66:1 | 4.95:1 | 3:1 — 1.4.11, 2.4.13 |
| `focus` on `fg` | 3.61:1 | 3.27:1 | 3:1 — the ring beside a filled control |
| `rule` on `bg` | 1.28:1 | 1.30:1 | **none, deliberately** |

## The reader's own fonts, and a serif for the prose

**No web font.** `next/font` would self-host one with no request to Google
([Next.js, Font Module](https://nextjs.org/docs/app/api-reference/components/font)), which answers
the privacy objection and not the other three: every byte of it is on the page a stranger loads, it
is the one thing on these pages that could shift the layout as it swaps, and satori — which draws
the Open Graph image
[CAN-57 Make a public Ordering discoverable and shareable](https://linear.app/jacobrees-canoncore/issue/CAN-57)
needs — reads TTF, OTF and WOFF and **not** the WOFF2 `next/font` emits
([satori](https://github.com/vercel/satori)). A typeface is also the most reversible decision in this
document: it is one custom property.

**A serif for what you read, a sans for what you operate.** That is the identity, and it is a
preference rather than a finding — no evidence was sought or is claimed for serif reading speed on
screens. The argument is that this product's surface is long-form prose interleaved with entries, a
shape that has a printed ancestor and reads like one, and that a sans-serif interface around it is
what stops a control being mistaken for the text.

**Nothing sets a root font size**, because doing so is how a page stops honouring the size a reader
chose in their browser. `body` is 1 rem for that reason, and every other step is derived from it.

## The measure is a preference, and it is 34 rem

`main { max-width: 34rem }` was in the sheet already, and it stays. **What changes is that it now
says why, and the why is not evidence.**

The familiar 45–75 characters has no reachable primary source. WCAG **1.4.8 Visual Presentation** is
the origin of the 80-character figure and is **Level AAA**, and its own note says the requirement is
that a mechanism is available and "can be provided by the browser"
([WCAG 2.2](https://www.w3.org/TR/WCAG22/)). Apple's Human Interface Guidelines publish no
line-length guidance at all
([Typography](https://developer.apple.com/design/human-interface-guidelines/typography)). Material 3
publishes no characters-per-line figure
([applying type](https://m3.material.io/styles/typography/applying-type)). The one study reached in
full text tested 35, 55, 75 and 95 characters and found that "passages formatted with 95 cpl resulted
in faster reading speed" (Shaikh & Chaparro 2005,
[doi:10.1177/154193120504900514](https://doi.org/10.1177/154193120504900514)). The working is in
[`frontend-design-scope.md`](../research/frontend-design-scope.md) → *Reading is the surface, and it
is plain text by statute*.

**So the reason is this, and it is a house one.** 34 rem is where a paragraph of this product's own
prose broke at roughly seventy characters at the body size, which looked right to the person who
chose it. It is a `max-width` rather than a `width`, so a narrow viewport, a zoom and a reader's own
font size all win against it — which is what makes a wrong choice cheap. Anyone who wants to move it
should say what they looked at, not cite a number.

**The measure is the text column, not the column plus its gutter.** The gutter is the body's
`padding-inline`, so 34 rem stays the number of characters it was chosen for.

## The criteria taken while designing, and what each measured

ADR-0013 records WCAG 2.2 AA as a **self-imposed target**: no UK instrument binds this service to it.
Four criteria can only be decided while choosing values, so CAN-89 Give the product a visual
identity and a reading surface owns them rather than
[CAN-91 Check the accessibility conformance neither planned gate can reach](https://linear.app/jacobrees-canoncore/issue/CAN-91),
which audits a built page.

- **1.4.3 Contrast (Minimum), AA.** Met — the table above, asserted per theme.
- **1.4.11 Non-text Contrast, AA.** Met, and it is what forced `edge` out of `rule`.
- **2.5.8 Target Size (Minimum), AA** — 24 by 24 CSS pixels. Met with room: inputs and buttons carry
  `min-height: 2.75rem`, which is 44 px at the default root size and therefore also clears
  **2.5.5 Target Size (Enhanced), AAA**; the masthead and footer links carry block padding that puts
  each past 24 px, and a 1.5 rem gap between the footer's two.
- **2.4.13 Focus Appearance, AAA — the stretch, and it is met.** The ring is 3 CSS pixels at a 2 px
  offset, which is more than the two-pixel perimeter the criterion asks for, and it is drawn on
  pixels that were the page before focus landed, so `focus` against `bg` is the contrast the
  criterion means. The extra assertion is `focus` against `fg`, for the ring that runs beside a
  filled control. **Missing this would have failed nothing**; it is above the AA target.

Three more are handled by the sheet rather than measured here. **2.4.1 Bypass Blocks** is the skip
link, asserted in `site-shell.test.tsx` because it is the criterion that fails most quietly.
`prefers-reduced-motion` and `forced-colors` are honoured, each by a rule aimed at the one thing in
the sheet it reaches rather than by a blanket override — there is exactly one animation.

**What is not claimed here**: 1.4.10 Reflow, 1.4.12 Text Spacing, 1.4.4 Resize Text and 2.4.11 Focus
Not Obscured. Those need a built, populated page, and CAN-91 Check the accessibility conformance neither planned gate can reach owns
them. The one measurement taken in
passing is that neither the front page nor the sign-in page scrolls horizontally at a 320 px
viewport, which is evidence for that ticket rather than a substitute for it.

## The values live twice, and a test is what keeps them equal

The palette and the scales are exported from `packages/config` **and** written into `globals.css`.
That is duplication on purpose, and the reason is that a stylesheet is not the only renderer here:

- **`global-error.tsx`** replaces the root layout when it throws, and Next.js states that
  "`global-error` and the built-in 500 page render their own document and do **not** include your
  global styles"
  ([`error.js`](https://nextjs.org/docs/app/api-reference/file-conventions/error)). It builds its own
  sheet from the module.
- **The Open Graph image** CAN-57 Make a public Ordering discoverable and shareable will draw is
  satori, which supports a subset of CSS and no custom properties at all.

**Two lengths that are not colours or scale steps are in the module for the same reason**, and they
are there because this document's accessibility claims rest on them: the control height that 2.5.8
and 2.5.5 turn on, and the focus ring's width and offset that 2.4.13 turns on. Both are drawn twice
— once by the sheet, once by `global-error.tsx` — so both are checked, and neither can drift into a
page that quietly stops meeting a criterion this ADR says it meets. The ring is in **CSS pixels**
rather than rem, deliberately: 2.4.13 is written in CSS pixels, so an indicator sized in rem would
meet or miss it depending on a font size the reader chose for something else.

**The alternative is a build step, and ADR-0013 already preferred a check to a transform.** A Design
Tokens Format Module file plus Style Dictionary would buy a pipeline nobody removes and a lossy
conversion, for one application and one person — `frontend-design-scope.md` → *Tokens are separable,
and the second renderer is already inside v1* has the count: of that format's thirteen types only
`number` crosses unchanged and three are lossy. So the check is
`apps/web/src/app/design-tokens.test.ts`, and it asserts agreement **in both directions**, because a
one-way check passes a sheet that has quietly grown a token nothing else can read.

## What will try to reopen it

- **Any tool asked for a design system**, which will offer a `.tokens.json` file and a transform.
  ADR-0013 holds the trigger for adopting one: a platform with a different style system.
- **`vercel:shadcn` and `vercel:next-forge`**, which arrive carrying a finished visual identity —
  the thing a product with a house style should avoid buying rather than the thing to buy. ADR-0013
  → *What will try to reopen it* is the fuller list.
- **A request to cite evidence for the measure.** There is none, and *The measure is a preference*
  above is the answer rather than a search anybody should repeat.

**What would actually reopen it**: a second person writing CSS here, a platform that cannot read the
sheet, or prose long enough that the measure has been read at length rather than looked at.

## Consequences

- **The palette and both scales are data**, so CAN-57 Make a public Ordering discoverable and
  shareable draws its Open Graph card from the same values the page uses, rather than inventing a
  second design on the one image every shared link renders.
- **A new colour has to justify its contrast** or the test fails, which moves 1.4.3 and 1.4.11 from
  something an audit finds to something a run refuses.
- **The sheet grows to CSS Modules, never to a second global sheet** — ADR-0013's growth path is
  unchanged, and nothing here brings it closer.
- **CAN-90 Decide how an Ordering reads, and what the interface calls its parts inherits a
  vocabulary rather than a blank sheet**: six sizes, eight spacing steps, seven colour roles, and a
  heading scale that already runs to `h3`.
