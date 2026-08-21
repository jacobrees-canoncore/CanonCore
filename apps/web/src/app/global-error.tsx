"use client";

import {
  controlHeight,
  focusRing,
  fonts,
  leading,
  measure,
  palette,
  radius,
  reportingAddress,
  siteName,
  spacing,
  typeScale,
} from "@canoncore/config";
import type { ErrorBoundaryProps } from "./interruption";

/**
 * The last page there is: the root layout itself threw, so there is no shell, no `globals.css` and
 * no `<main>` to draw inside.
 *
 * **This is the renderer that proves why the design is data.** Next.js is explicit that
 * "`global-error` and the built-in 500 page render their own document and do **not** include your
 * global styles" ([`error.js`](https://nextjs.org/docs/app/api-reference/file-conventions/error)),
 * so this file cannot use the sheet and has to carry its own — built from the same values in
 * `@canoncore/config` that `design-tokens.test.ts` pins `globals.css` to. Without that module this
 * page would be where the palette silently forked, on the one page nobody looks at until it is too
 * late.
 *
 * The `<style>` element rather than inline `style` props, because the one thing this page must get
 * right is the reader's own colour scheme, and a media query is the only way to ask.
 *
 * **It carries the reporting route too, and that is not decoration.** The footer puts that address on
 * every page the shell draws, which
 * [`code-measures-register.md`](../../../../docs/compliance/code-measures-register.md) records
 * against ICU D2 — and this page has no shell. It is also the page where a reader most has something
 * to report, so leaving it off would have made the claim false exactly where it mattered most.
 */
const sheet = `
  :root { color-scheme: light dark; }
  body {
    margin: 0;
    padding: ${spacing[8]}rem ${spacing[6]}rem;
    background: ${palette.light.bg};
    color: ${palette.light.fg};
    font-family: ${fonts.prose};
    font-size: ${typeScale.body}rem;
    line-height: ${leading.body};
  }
  main { max-width: ${measure}rem; margin-inline: auto; }
  h1 { margin: 0 0 ${spacing[6]}rem; font-size: ${typeScale.title}rem; line-height: ${leading.tight}; }
  p { margin: 0 0 ${spacing[4]}rem; font-size: ${typeScale.lead}rem; }
  button {
    min-height: ${controlHeight}rem;
    padding: ${spacing[2]}rem ${spacing[6]}rem;
    border: 1px solid ${palette.light.fg};
    border-radius: ${radius}rem;
    background: ${palette.light.fg};
    color: ${palette.light.bg};
    font-family: ${fonts.ui};
    font-size: ${typeScale.body}rem;
    cursor: pointer;
  }
  :focus-visible { outline: ${focusRing.width}px solid ${palette.light.focus}; outline-offset: ${focusRing.offset}px; }
  .meta { color: ${palette.light.muted}; font-family: ${fonts.ui}; font-size: ${typeScale.meta}rem; }
  /* Inherit, exactly as the sheet does: an anchor here is furniture, and the underline does the work. */
  a { color: inherit; }
  @media (prefers-color-scheme: dark) {
    body { background: ${palette.dark.bg}; color: ${palette.dark.fg}; }
    .meta { color: ${palette.dark.muted}; }
    button { border-color: ${palette.dark.fg}; background: ${palette.dark.fg}; color: ${palette.dark.bg}; }
    :focus-visible { outline-color: ${palette.dark.focus}; }
  }
  @media (forced-colors: active) { :focus-visible { outline-color: Highlight; } }
`;

export default function GlobalError({ error, retry }: ErrorBoundaryProps) {
  return (
    // `global-error` renders the document, so it has to supply the two elements a document is.
    <html lang="en">
      <body>
        {/*
          React hoists a `<title>` for us; a `<style>` it only hoists when given a precedence, so
          this one stays where it is written. Browsers apply it either way, and there is no second
          stylesheet here for its position to matter against.
        */}
        <title>{`Something went wrong — ${siteName}`}</title>
        <style>{sheet}</style>
        <main>
          <h1>Something went wrong</h1>
          <p>{siteName} could not draw this page at all, and the fault is at our end.</p>
          {error.digest === undefined ? null : <p>If you tell us about it, quote {error.digest}.</p>}
          <p>
            <button type="button" onClick={() => retry()}>
              Try again
            </button>
          </p>
          {/*
            The footer's reporting route, in the one document that has no footer. The `href` is
            composed from the same compile-time constant `site-footer.tsx` uses, and
            `global-error.test.tsx` pins it — `no-linkification.test.tsx` cannot, because this
            component renders a document and `render` puts what it is given inside a `<div>`.
          */}
          <p className="meta">
            <a href={`mailto:${reportingAddress}`}>Report content</a>
          </p>
        </main>
      </body>
    </html>
  );
}
