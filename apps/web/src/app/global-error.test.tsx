import { palette, reportingAddress } from "@canoncore/config";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import GlobalError from "./global-error";

/**
 * **The one page in this application that does not get `globals.css`**, because Next.js renders it
 * in place of the root layout: "`global-error` and the built-in 500 page render their own document
 * and do **not** include your global styles"
 * ([`error.js`](https://nextjs.org/docs/app/api-reference/file-conventions/error)). So it carries a
 * sheet of its own, built from `@canoncore/config` — and this is what stops that sheet quietly
 * becoming a second, older design on the page nobody looks at until something is already wrong.
 *
 * `renderToStaticMarkup` rather than Testing Library, because this component renders `<html>` and
 * `<body>` and a container element is exactly what it must not be put inside.
 */
const markup = () =>
  renderToStaticMarkup(
    <GlobalError error={Object.assign(new Error("gone"), { digest: "abc123" })} retry={() => {}} />,
  );

test("it draws its own document, in the palette both themes", () => {
  const html = markup();

  expect(html).toContain("<html");
  expect(html).toContain("<body");
  expect(html).toContain(palette.light.bg);
  expect(html).toContain(palette.dark.bg);
  expect(html).toContain("prefers-color-scheme: dark");
});

// A reader with nothing else to go on gets the one thing that matches this to a server-side log.
test("it offers the digest, and nothing else from the error", () => {
  const html = markup();

  expect(html).toContain("abc123");
  expect(html).not.toContain("gone");
});

/**
 * **The anchors on this page, pinned here because `no-linkification.test.tsx` cannot see them.**
 * That file renders each surface into a container, which a component that draws its own `<html>`
 * cannot go inside — so the closed-set assertion the illegal-content finding rests on is made here
 * instead, over the same rule: the only `href` is a literal of this repository's own.
 *
 * It is also the ICU D2 assertion for the one page the footer does not reach.
 */
test("its only anchor is the reporting route", () => {
  const hrefs = [...markup().matchAll(/href="([^"]*)"/g)].map(([, href]) => href);

  expect(hrefs).toEqual([`mailto:${reportingAddress}`]);
});
