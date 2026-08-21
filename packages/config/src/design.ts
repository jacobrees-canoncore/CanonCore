/**
 * The visual identity, as values.
 *
 * **This file exists because a stylesheet is not the only renderer.** `apps/web/src/app/globals.css`
 * is where these values do their day job, and two things cannot read it: `global-error.tsx`, which
 * Next.js renders in place of the root layout and therefore without the application's global styles
 * ([`error.js`](https://nextjs.org/docs/app/api-reference/file-conventions/error#global-error) —
 * "global-error and the built-in 500 page render their own document and do **not** include your
 * global styles"), and the Open Graph image
 * [CAN-57 Make a public Ordering discoverable and shareable](https://linear.app/jacobrees-canoncore/issue/CAN-57)
 * will draw with satori, which supports a subset of CSS and no custom properties at all.
 *
 * So the values live here and the sheet is checked against them:
 * `apps/web/src/app/design-tokens.test.ts` asserts that every property below appears in `globals.css`
 * with the same value, and that the set matches exactly in both directions. That is what keeps one
 * source of truth without a build step, which
 * [ADR-0013](../../../docs/adr/0013-hand-written-css-no-framework.md) → *What would cross to a second
 * app* prefers to a token file and a transform.
 *
 * **Lengths are rem multiples as plain numbers, not strings.** The sheet appends `rem`; a renderer
 * with no rem multiplies by the browser's default root size of 16 CSS pixels. Writing `"1rem"` here
 * would make the second of those a string operation on a unit, which is the lossy conversion the
 * Design Tokens Format Module concedes for exactly this case
 * ([DTCG 2025.10](https://www.designtokens.org/tr/2025.10/format/)).
 *
 * Every choice below is argued in
 * [ADR-0030](../../../docs/adr/0030-the-visual-identity.md), including the ones that are house
 * decisions rather than findings.
 */

/**
 * The two palettes, and every colour in each has a job rather than a place on a ramp.
 *
 * **`rule` and `edge` are separate on purpose, and that is the one distinction here that a
 * reviewer's eye slides over.** A separator carries no information — take it away and the page still
 * says everything it said — so it may be as faint as it likes. A control's border *is* the
 * information that a control is there, which WCAG 2.2 **1.4.11 Non-text Contrast** puts at 3:1
 * against what it sits on. One `--rule` doing both jobs is how a sheet fails 1.4.11 while looking
 * tasteful, and it is what this sheet did until CAN-89 Give the product a visual identity and a
 * reading surface.
 *
 * The measured ratios are asserted rather than recorded: `design-tokens.test.ts` computes them from
 * these values with WCAG's own relative-luminance formula, so a colour edited here fails the run
 * rather than the audit.
 */
export const palette = {
  light: {
    /** The page. Warm off-white rather than `#fff`, which is the whole of the paper feeling. */
    bg: "#fbfaf8",
    /** Body text, headings, and the fill of a primary control. Near-black, warm. */
    fg: "#1a1917",
    /** Text that is about the page rather than of it: meta, hints, secondary prose. */
    muted: "#6f6a61",
    /** Separators. Deliberately below 3:1 — see the note above. Never a control's border. */
    rule: "#e3ded5",
    /**
     * The border of anything that has to read as a thing rather than as a background: a control you
     * can type in or press, the box a form's answer arrives in, the ring of the working indicator.
     * **What the role is, exactly, is the 3:1 floor of 1.4.11** — that is what separates it from
     * {@link palette.light.rule}, which carries no information and is held to nothing.
     */
    edge: "#948e83",
    /** The focus ring, and the only accent this palette has. */
    focus: "#2f7d76",
    /** A refusal. Paired with `role="alert"`, never carrying the meaning alone. */
    problem: "#8f2f24",
  },
  dark: {
    bg: "#141311",
    fg: "#f2efe9",
    muted: "#928b7f",
    rule: "#2c2a26",
    edge: "#6a655c",
    focus: "#3b9189",
    problem: "#f0a094",
  },
} as const;

/**
 * Six sizes, in rem, each a step of **1.2** — a minor third — from the one before, with `body` at 1.
 *
 * **Nothing sets a root font size**, here or in the sheet, because doing so is how a page stops
 * honouring the size a reader chose in their browser. `body` is 1 rem so that the reader's own
 * choice is the base every other step is derived from.
 *
 * The names are roles rather than sizes, because the point of a scale is that a role picks a step
 * and never a number.
 */
export const typeScale = {
  /** Meta and hints. One step below body. */
  meta: 0.833,
  /** Body prose. The size everything else is derived from, and it is the browser's own default. */
  body: 1,
  /** The opening sentence of a page. */
  lead: 1.2,
  /** A section heading within a page. */
  heading: 1.44,
  /** The heading of a page you arrived at from another. */
  title: 1.728,
  /** The largest thing on the front page, and nothing else. */
  display: 2.074,
} as const;

/**
 * The spacing scale, in rem, keyed by how many quarter-rem units each is.
 *
 * **A quarter of a rem is 4 CSS pixels at the default root size**, so every step lands on a whole
 * pixel there, and `4` is exactly one line of body text's own size — which is what lets vertical
 * rhythm be written in multiples of the text rather than in numbers chosen per rule.
 */
export const spacing = {
  1: 0.25,
  2: 0.5,
  3: 0.75,
  4: 1,
  6: 1.5,
  8: 2,
  12: 3,
  16: 4,
} as const;

/**
 * The reading measure, in rem. **A house decision, and it has to read as one.**
 *
 * The familiar 45–75 characters has no reachable primary source: WCAG 1.4.8 Visual Presentation is
 * Level AAA and its own note says the mechanism may be provided by the browser, Apple's Human
 * Interface Guidelines publish no line-length guidance, Material 3 publishes no characters-per-line
 * figure, and the one study reached in full text found the *longest* line fastest (Shaikh &
 * Chaparro 2005, [doi:10.1177/154193120504900514](https://doi.org/10.1177/154193120504900514)).
 * ADR-0030 → *The measure is a preference* is the reasoning; `docs/research/frontend-design-scope.md`
 * → *Reading is the surface* holds the evidence.
 */
export const measure = 34;

/** Line heights, unitless so they inherit as ratios and track a descendant's own size. */
export const leading = {
  /** Body prose. Material 3's recommendation and WCAG 1.4.12's floor coincide at 1.5; this is above both. */
  body: 1.6,
  /** Headings, where a body ratio opens gaps the eye reads as separation. */
  tight: 1.2,
} as const;

/**
 * The two stacks, both of them the reader's own fonts.
 *
 * **No web font, and that is a decision rather than an omission.** `next/font` would self-host one
 * with no request to Google, but every byte of it is on the page a stranger loads, it is the one
 * thing on these pages that could shift the layout as it swaps, and satori — which draws the Open
 * Graph image — reads TTF, OTF and WOFF and **not** the WOFF2 `next/font` emits. A typeface is the
 * most reversible decision here: it is one property.
 */
export const fonts = {
  /** Everything you read. */
  prose: 'ui-serif, Georgia, "Iowan Old Style", "Times New Roman", serif',
  /** Everything you operate: labels, controls, meta, the masthead. */
  ui: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
} as const;

/** The one corner radius, in rem. 4 CSS pixels at the default root size. */
export const radius = 0.25;

/**
 * The least a control may be tall, in rem — 44 CSS pixels at the default root size.
 *
 * WCAG 2.2 **2.5.8 Target Size (Minimum)** asks for 24 by 24 CSS pixels at AA. This is the 44 of
 * **2.5.5 Target Size (Enhanced)**, which is AAA, because the difference between them costs nothing
 * on a form with two fields and a button.
 */
export const controlHeight = 2.75;

/**
 * The focus ring, **in CSS pixels rather than rem**, and the exception is deliberate: WCAG 2.2
 * **2.4.13 Focus Appearance** is written in CSS pixels — "at least as large as the area of a 2 CSS
 * pixel thick perimeter" — so an indicator expressed in rem would meet or miss the criterion
 * depending on a font size the reader chose for something else.
 *
 * The offset is what puts the ring on the page rather than on the control, which is what makes
 * {@link palette.light.focus} against `bg` the pair the criterion's contrast half is about.
 */
export const focusRing = { width: 3, offset: 2 } as const;
