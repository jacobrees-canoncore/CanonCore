import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  controlHeight,
  focusRing,
  fonts,
  leading,
  measure,
  palette,
  radius,
  spacing,
  typeScale,
} from "@canoncore/config";
import { expect, test } from "vitest";

/**
 * **The sheet and the values are one decision kept in two places, and this is what stops them
 * drifting.** `@canoncore/config`'s `design.ts` says why they are in two places at all: a
 * stylesheet cannot be read by `global-error.tsx`, which Next.js renders without the application's
 * global styles, nor by satori, which draws the Open Graph image
 * CAN-57 Make a public Ordering discoverable and shareable needs.
 *
 * The alternative — generating the sheet from the module — is a build step, and
 * [ADR-0013](../../../../docs/adr/0013-hand-written-css-no-framework.md) prefers a check to a
 * transform while there is one application and one person. A check costs a test; a transform costs
 * a pipeline nobody removes.
 *
 * **The agreement is asserted in both directions**, which is the half that matters: a one-way check
 * passes a sheet that has quietly grown a token the module has never heard of, and that token is
 * then a value nothing else can read.
 */
// Resolved from the working directory rather than from `import.meta.url`, which the test
// transform rewrites to a non-file scheme. Vitest runs from `apps/web` — `vitest.config.ts`'s
// `include` is rooted there too.
const sheet = readFileSync(resolve("src/app/globals.css"), "utf8");

/**
 * The custom properties declared in one `:root` block, as a map.
 *
 * `after` picks which `:root` — the file has two, and the second is inside the
 * `prefers-color-scheme: dark` media query. Scanning to the first `}` is enough because neither
 * block nests anything.
 *
 * The pattern carries the brace because the sheet's own header comment says the word `:root` in
 * prose, and a search for the bare word finds that first. It reached the right block anyway, by way
 * of the next `{` happening to be the real one — which is the kind of thing that keeps working
 * until somebody edits a comment.
 */
function declarations(after: string): Map<string, string> {
  const block = /:root\s*\{/g;
  block.lastIndex = sheet.indexOf(after);
  const start = block.exec(sheet)!.index;
  const open = sheet.indexOf("{", start);
  const body = sheet.slice(open + 1, sheet.indexOf("}", open));
  const found = new Map<string, string>();
  for (const line of body.split(";")) {
    const at = line.indexOf(":");
    const name = line.slice(0, at).trim();
    if (name.startsWith("--")) found.set(name, line.slice(at + 1).trim());
  }
  return found;
}

/** Every design token, as the sheet has to spell it. Lengths are rem multiples; leading is a ratio. */
const expectedRoot = new Map<string, string>([
  ...Object.entries(palette.light).map(([name, value]) => [`--${name}`, value] as const),
  ...Object.entries(typeScale).map(([name, value]) => [`--text-${name}`, `${value}rem`] as const),
  ...Object.entries(spacing).map(([step, value]) => [`--space-${step}`, `${value}rem`] as const),
  ["--measure", `${measure}rem`],
  ...Object.entries(leading).map(([name, value]) => [`--leading-${name}`, `${value}`] as const),
  ...Object.entries(fonts).map(([name, value]) => [`--font-${name}`, value] as const),
  ["--radius", `${radius}rem`],
  // The two geometry values ADR-0029's accessibility claims rest on, and the only lengths here in
  // CSS pixels: `design.ts` says why the focus ring cannot be in rem.
  ["--control-height", `${controlHeight}rem`],
  ["--focus-width", `${focusRing.width}px`],
  ["--focus-offset", `${focusRing.offset}px`],
]);

test("globals.css declares exactly the design tokens, with the exported values", () => {
  expect(declarations(":root")).toEqual(expectedRoot);
});

// The dark block overrides the palette and nothing else. A type scale or a spacing step that
// differed between the two would be a second design rather than a second palette.
test("the dark block overrides exactly the palette", () => {
  expect(declarations("prefers-color-scheme: dark")).toEqual(
    new Map(Object.entries(palette.dark).map(([name, value]) => [`--${name}`, value])),
  );
});

/**
 * **The WCAG contrast ratio, computed from the specification's own definitions rather than taken
 * from a tool.** Relative luminance is `0.2126 R + 0.7152 G + 0.0722 B` over channels linearised by
 * `c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ^ 2.4`, and the ratio is `(L1 + 0.05) /
 * (L2 + 0.05)` with the lighter first
 * ([WCAG 2.2, relative luminance](https://www.w3.org/TR/WCAG22/#dfn-relative-luminance) and
 * [contrast ratio](https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio)).
 *
 * Eleven lines, and the alternative is a dependency for eleven lines.
 */
function contrast(one: string, other: string): number {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5]
      .map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const [lighter, darker] = [luminance(one), luminance(other)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

// The formula against a pair whose answer is fixed by arithmetic rather than by taste: black on
// white is 21:1 exactly, and any colour against itself is 1:1. Without this the assertions below
// would pass just as happily on a function that returned 21 for everything.
test("the contrast formula agrees with the two ratios the specification fixes", () => {
  expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 10);
  expect(contrast("#2f7d76", "#2f7d76")).toBeCloseTo(1, 10);
});

/**
 * **1.4.3 Contrast (Minimum), Level AA**: text at 4.5:1 against its background. Every colour this
 * palette renders text in is here, and the two themes are checked alike — a dark mode that fails is
 * the ordinary way this criterion is missed, because it is designed second and checked never.
 */
test.each(["light", "dark"] as const)("%s: every text colour clears 1.4.3 at 4.5:1", (theme) => {
  const { bg, fg, muted, problem } = palette[theme];
  for (const colour of [fg, muted, problem]) expect(contrast(colour, bg)).toBeGreaterThanOrEqual(4.5);
  // A primary control inverts the two, so the same pair is read the other way round on every button.
  expect(contrast(bg, fg)).toBeGreaterThanOrEqual(4.5);
});

/**
 * **1.4.11 Non-text Contrast, Level AA**: 3:1 for what identifies a control or its state. `edge` is
 * the border that says a control is there; `focus` is the ring that says which one you are on.
 *
 * `rule` is deliberately absent and deliberately below this: it separates, and a separator carries
 * no information the criterion is about. `design.ts` holds that distinction, and it is the reason
 * the two are different tokens.
 */
test.each(["light", "dark"] as const)("%s: control edges and the focus ring clear 1.4.11 at 3:1", (theme) => {
  const { bg, edge, focus } = palette[theme];
  expect(contrast(edge, bg)).toBeGreaterThanOrEqual(3);
  expect(contrast(focus, bg)).toBeGreaterThanOrEqual(3);
});

/**
 * **2.4.13 Focus Appearance, Level AAA — the stretch, and it is met.** CAN-89 Give the product a
 * visual identity and a reading surface flags it as above the AA target ADR-0013 records, so this
 * assertion is extra credit rather than a floor.
 *
 * The criterion's contrast half is between the focused and unfocused states of the same pixels. The
 * ring is drawn at `outline-offset`, so those pixels were the page before focus landed — which
 * makes `focus` against `bg` the pair, and the assertion above already fixes it. What this adds is
 * the case that pair does not cover: a primary control is filled with `fg`, so the ring runs beside
 * near-black on one side and the page on the other, and a ring indistinguishable from the thing it
 * surrounds is one a reader has to hunt for.
 */
test.each(["light", "dark"] as const)("%s: the focus ring is distinct from a filled control", (theme) => {
  const { fg, focus } = palette[theme];
  expect(contrast(focus, fg)).toBeGreaterThanOrEqual(3);
});

/**
 * **The favicon is the one place a palette value is written outside both homes**, because an SVG
 * asset can import nothing. So it is pinned here instead: the mark is drawn in the accent on the
 * page's own colour, and an edit to either that forgot the file would leave the product's smallest
 * surface in last season's colours.
 */
test("the favicon is drawn in the palette's own colours", () => {
  const icon = readFileSync(resolve("src/app/icon.svg"), "utf8");

  expect(icon).toContain(`fill="${palette.light.focus}"`);
  expect(icon).toContain(`fill="${palette.light.bg}"`);
});
