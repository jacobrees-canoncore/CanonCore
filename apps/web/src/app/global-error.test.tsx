import { palette } from "@canoncore/config";
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
