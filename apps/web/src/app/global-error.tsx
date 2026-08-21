"use client";

import { fonts, leading, measure, palette, radius, siteName, spacing, typeScale } from "@canoncore/config";

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
    min-height: 2.75rem;
    padding: ${spacing[2]}rem ${spacing[6]}rem;
    border: 1px solid ${palette.light.fg};
    border-radius: ${radius}rem;
    background: ${palette.light.fg};
    color: ${palette.light.bg};
    font-family: ${fonts.ui};
    font-size: ${typeScale.body}rem;
    cursor: pointer;
  }
  :focus-visible { outline: 3px solid ${palette.light.focus}; outline-offset: 2px; }
  @media (prefers-color-scheme: dark) {
    body { background: ${palette.dark.bg}; color: ${palette.dark.fg}; }
    button { border-color: ${palette.dark.fg}; background: ${palette.dark.fg}; color: ${palette.dark.bg}; }
    :focus-visible { outline-color: ${palette.dark.focus}; }
  }
  @media (forced-colors: active) { :focus-visible { outline-color: Highlight; } }
`;

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
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
        </main>
      </body>
    </html>
  );
}
