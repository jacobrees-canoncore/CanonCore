import { Working } from "@/app/working";

/**
 * What a Story page shows while the three tables behind it are read.
 *
 * **It is here rather than at the root, and a measurement moved it.** A `loading.tsx` high in the
 * tree is a valid Suspense boundary, so Next.js finds it and stops looking — which puts *every*
 * page's content inside a boundary, including its heading. Next's own streaming guide is explicit
 * about what that costs: "If your LCP element (a hero image, a main heading, a product photo) is
 * inside a Suspense boundary, it can't paint until that boundary resolves", and "for non-image LCP
 * elements (text, headings), make sure they are not wrapped in a Suspense boundary that depends on
 * slow data" (`next@16.3.0`, `dist/docs/01-app/02-guides/streaming.md`).
 *
 * At the root it did exactly that. Measured on one machine, one build, three runs each: with a root
 * `loading.tsx` the front page's observed LCP ran 438/75/363 ms against a first paint of 146/75/71,
 * and the asserted figure swung 2014-2264 ms; without it, observed LCP equalled first paint on every
 * run and the asserted figure was flat at 2011-2017. On CI the worst run reached 2580 ms and broke
 * the 2500 ms budget in `lighthouserc.cjs`.
 *
 * **This segment is the case the convention is actually for.** The same guide: `loading.js` "is
 * useful when there's nothing meaningful to show until the page's data resolves", and its own
 * comparison table gives it as best for "pages where nothing renders without data". This page's
 * `h1` *is* the Story's title, so there is nothing to paint before the read finishes — the boundary
 * costs it nothing, and a reader watching a suspended Neon compute wake up gets the shell and a
 * sentence rather than a blank page.
 *
 * The front page is the opposite shape: its heading, its lead and its prose owe nothing to the
 * database, so they belong in the shell. When a genuinely slow read arrives —
 * CAN-26 Import a series from TMDB, with the overlay behind it — the boundary goes around *that*,
 * close to the access, which is what the same guide recommends over a file high in the tree.
 */
export default function Loading() {
  return <Working>Loading.</Working>;
}
