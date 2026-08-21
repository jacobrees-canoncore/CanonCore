import { siteName } from "@canoncore/config";

/**
 * The masthead, on every page.
 *
 * **The wordmark is not a heading**, and that is the decision worth recording: a `<header>` is
 * already a banner landmark, so a screen-reader user reaches it by landmark rather than by outline —
 * and an `h1` here would give every page a document outline that starts with the site's name before
 * the page's own.
 *
 * **The navigation holds one destination, because the product has one.** Every other address this
 * application serves is either an account page a reader arrives at from a link on the page they are
 * on, or a Story reached by its own address — `docs/infrastructure.md` → *The served surface*. It is
 * marked up as navigation anyway, so that the landmark a screen-reader user jumps to exists from the
 * start and gains entries rather than appearing later:
 * CAN-32 Roles, takedown, and the Online Safety Act surfaces brings `/legal`, and
 * CAN-57 Make a public Ordering discoverable and shareable brings a public Ordering.
 *
 * **What is deliberately not here is an account link.** "Sign in" against "Sign out" is a question
 * about the request, and asking it in the shell would make every route dynamic — including
 * `/privacy/analytics`, the one page in the application that is prerendered static. The front page
 * asks it instead, where the answer is already being read.
 *
 * **A plain `<a>` rather than `next/link`, on the same measurement `front-page.tsx` carries**: a
 * `next/link` cost that page 8,401 script bytes on 21 August 2026. In the shell that cost lands on
 * every page rather than one, and the page where it buys least is the front page, where this link
 * points at the page you are already on. With this here, no page in the application needs
 * `next/link` at all, so nothing pays it.
 */
export function SiteHeader() {
  return (
    <header className="masthead">
      <nav aria-label="Site">
        {/*
          **The one suppression in this application, and the rule fires here alone for a reason that
          is not about policy.** `@next/next/no-html-link-for-pages` compares each `href` through
          `normalizeURL`, which appends a trailing slash to everything except `"/"`, against route
          patterns built without one — so `^/sign-in$` never matches `/sign-in/`. **Ten plain page
          anchors across six files go unreported while this one does**, spelling four addresses
          between them: `/sign-in`, `/sign-up`, `/forgot-password` and `/privacy/analytics`. Read
          off `@next/eslint-plugin-next@16.3.0`, `dist/utils/url.js`, on 21 August 2026.

          So taking `next/link` here would not be following a rule the repository otherwise follows;
          it would be paying 8,401 bytes on every page because one address out of the five this
          application links to is spelled in a way the matcher happens to reach. The trade is the one the doc comment above states, and
          `no-linkification.test.tsx` is what actually holds this application's anchors to a closed
          set.
        */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- see above */}
        <a className="wordmark" href="/">
          {siteName}
        </a>
      </nav>
    </header>
  );
}
