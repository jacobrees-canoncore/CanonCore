import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/**
 * Everything around a page: the skip link, the masthead, the one `<main>`, and the footer.
 *
 * **Separate from `layout.tsx` so that it can be rendered on its own**, which is what lets
 * `site-shell.test.tsx` assert the two claims a statutory record and a WCAG criterion each rest on
 * — that the reporting route is on every page, and that the skip link's target exists. A root
 * layout renders `<html>` and `<body>`, and a test cannot put those inside a container.
 *
 * It emits no element of its own, so the four below stay direct children of `<body>` and the grid
 * in `globals.css` sees them.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      {/*
        First in the body, so it is first in the tab order — which is the whole of what WCAG 2.4.1
        Bypass Blocks asks for. `globals.css` keeps it off-screen until it takes focus.
      */}
      <a className="skip" href={`#${contentId}`}>
        Skip to the content
      </a>
      <SiteHeader />
      {/*
        `tabIndex={-1}` so the skip link moves focus here rather than only scrolling: a fragment
        jump alone leaves the caret where it was, and the next Tab goes back into the masthead.
      */}
      <main id={contentId} tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}

/**
 * The fragment the skip link jumps to, and the `id` of the element it lands on — one constant, so
 * the two cannot be edited apart. A skip link pointing at nothing is the ordinary way 2.4.1 fails,
 * and it fails silently: the link is there, focus simply does not move.
 */
const contentId = "content";
