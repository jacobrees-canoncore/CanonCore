import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { ForgotPasswordPage } from "./forgot-password/forgot-password-page";
import { FrontPage } from "./front-page";
import { ResetPasswordPage } from "./reset-password/reset-password-page";
import { SignInPage } from "./sign-in/sign-in-page";
import { SignUpPage } from "./sign-up/sign-up-page";
import { StoryPage } from "./story/story-page";

/**
 * **The rendered half of the non-linkification control.** Why the control exists and what the two
 * lint rules in `eslint.config.mjs` are each worth is written there; what belongs here is why an
 * assertion over a *rendered* result is a different check rather than a second copy of one.
 *
 * **It is about the surface, not about who wrote the string**, which is what makes it reach a
 * Provider at all. A displayed value is the overlay's composed answer — Snapshots from each
 * Source, an Override on top ([ADR-0004](../../../../docs/adr/0004-layered-overlay-for-sources-and-edits.md))
 * — so a title is the slot a Provider fills the moment anything imports. The surface never asks
 * which layer won, and this asserts that it cannot start to. It is also the only check that sees
 * an `<a href>` written by hand, which both lint rules miss.
 *
 * ## What changed on 17 August 2026, and what did not
 *
 * **The control was stated as "nothing rendered is hyperlinked" and is now stated as "nothing this
 * service did not author is hyperlinked".** The narrowing was forced by
 * **CAN-24 A signed-in and a signed-out path**, which gives the product its first navigation: a
 * page has to be able to link to `/sign-in`.
 *
 * **The control's substance is unchanged, and the assertion is stronger rather than weaker.** What
 * the finding rests on is the clause that followed the old wording — *"so a URL reaching a page is
 * not followable from it"* — and an `href` that is a literal in this repository is not a URL that
 * reached a page. So instead of counting anchors, this file now pins the **exact set** of them:
 * every `href` rendered anywhere must be one of `ownRoutes` below, which no value from a Source, a
 * Provider or a person can ever be. A data-derived `href` fails this whether or not it looks like a
 * link, and adding a route means adding it here on purpose.
 *
 * The two records this holds up were amended with it, each recording the change and why it needs no
 * reassessment: [`illegal-content-risk-assessment.md`](../../../../docs/compliance/illegal-content-risk-assessment.md)
 * → *Existing controls relied on* and *Step 4*.
 *
 * **Every surface that renders text belongs in this file**, and six exist today — the two account
 * recovery pages joined with **CAN-31 Email verification and password reset**, and the Story page
 * with **CAN-25 The catalogue: Version, part of, Anchor, canonical version**, which is earlier than
 * the assessment expected it: that record has the Story page arriving with CAN-27 Orderings and
 * Placements, and the imported broadcast Ordering, which now brings the Ordering page alone. CAN-26
 * Import a series from TMDB, with the overlay behind it brings a Listed Provider's prose, and
 * CAN-113 Add a Provider by pasting its URL brings a stranger's. Finding 2c of the illegal content
 * assessment names all three, so a surface landing without its case here makes that record false.
 *
 * **The Story page is the first surface whose every line is a value from outside** — a title, the
 * title of what it is part of, a Medium and a runtime — and it is also the first to link anywhere
 * but an account page. What it links to is `/`, a literal in the page and in the list below, which
 * is the move Step 4 of the assessment says in terms is *not* the one to watch for. The one that is
 * — an `href` derived from a value — this file fails whether or not it looks like a link.
 *
 * **CAN-31 Email verification and password reset also adds the one `href` on any of these pages that
 * is not a bare literal**, and it is the case this file exists to catch: `/reset-password`'s form
 * `action` is built from a token that arrived in a query string. It is a form target rather than an
 * anchor, so `queryAllByRole("link")` cannot see it — `reset-password-page.test.tsx` asserts it
 * separately, and what makes it safe is that the value is confined to a single URL-encoded query
 * parameter on a path this repository writes as a literal.
 */
const hostile = "https://example.invalid/looks-like-a-link";

/**
 * Every address this application may render an anchor to, and it is a closed set.
 *
 * **A literal in this repository is the whole of what makes an anchor permissible.** None of these
 * can be a value a Source supplied, a Provider returned or a person typed, which is exactly the
 * property the finding rests on. A page that wants a new one adds it here first.
 */
const ownRoutes = ["/", "/sign-in", "/sign-up", "/forgot-password"];

/** Every `href` the rendered result carries, in the order they appear. */
function renderedLinks() {
  return screen.queryAllByRole("link").map((link) => link.getAttribute("href"));
}

/**
 * The rendered anchors, checked against the closed set and returned for an exact assertion.
 *
 * **Two checks rather than one, and the pairing is deliberate.** `ownRoutes.includes` on its own is
 * vacuously satisfied by a page with no anchors, which is how an earlier version of this file passed
 * while pinning nothing; an exact `toEqual` on its own would pass a page whose anchors all changed
 * together. So membership is asserted here, and each case then asserts the exact list it expects.
 */
function linksWithinOwnRoutes() {
  const links = renderedLinks();
  for (const href of links) expect(ownRoutes).toContain(href);
  return links;
}

// `toEqual` on the whole list rather than `every(...)`, which an earlier version used: `every` is
// vacuously true on an empty array, so it would have passed while pinning nothing — and the compliance
// record rests on this file pinning the *exact* set. The signed-out front page draws both account links.
test("the front page renders a URL as text, and links only to its own routes", () => {
  render(<FrontPage stories={[{ id: "00000000-0000-4000-8000-000000000001", title: hostile }]} />);

  expect(screen.getByRole("listitem").textContent).toBe(hostile);
  expect(linksWithinOwnRoutes()).toEqual(["/sign-in", "/sign-up"]);
});

// The signed-in front page, which is a different render: it draws a sign-out form and an email
// address instead of the two links. An email address is a value a person typed, so it is exactly the
// kind of string that must not become a `mailto:` or anything else followable.
test("a signed-in reader's own email address is not linkified either", () => {
  render(
    <FrontPage
      stories={[{ id: "00000000-0000-4000-8000-000000000001", title: hostile }]}
      signedInAs="someone@example.invalid"
    />,
  );

  expect(screen.getByText("someone@example.invalid")).toBeDefined();
  expect(linksWithinOwnRoutes()).toEqual([]);
});

/**
 * The founding Story as the page draws it, with a URL where every value a person or a Source could
 * supply would be: the Story's own title, and the title of the Story it is part of.
 */
const hostileStory = {
  id: "00000000-0000-4000-8000-000000000001",
  title: hostile,
  runtimeSeconds: 2700,
  versions: [
    { id: "00000000-0000-4000-8000-0000000000b1", medium: "television" as const, runtimeSeconds: 2700 },
  ],
  partOf: [{ id: "00000000-0000-4000-8000-000000000002", title: hostile }],
};

test("the Story page renders every title as text, and links only to the front page", () => {
  render(<StoryPage story={hostileStory} />);

  // Twice: the heading, and the line naming what this Story is part of. Both are strings that
  // arrived from outside, and neither is followable.
  expect(screen.getAllByText(hostile)).toHaveLength(2);
  expect(linksWithinOwnRoutes()).toEqual(["/"]);
});

// The same page with nothing on it, which is the render row-level security produces when a policy
// is wrong: the empty states are prose this repository wrote, so they add no anchor either.
test("a Story with no Versions and nothing to be part of adds no anchor", () => {
  render(<StoryPage story={{ ...hostileStory, runtimeSeconds: null, versions: [], partOf: [] }} />);

  expect(linksWithinOwnRoutes()).toEqual(["/"]);
});

/**
 * **What each page's anchors are, stated once**, and everything below reads from it.
 *
 * The exact set is what the compliance finding rests on, so the cost of stating it three times — once
 * per assertion shape — is three places that can drift apart while each still passes. A review flagged
 * that; this is the fix.
 *
 * **A page whose links depend on what it was given gets an entry per render**, not one for the fuller
 * case: `/reset-password` drops its "sign in" offer once it has a token to submit, and a table holding
 * only the richer render would pass while the other branch went unchecked.
 *
 * `render` is a function rather than an element so that each case can be given a refusal or a notice
 * without a second table restating the same expectations.
 */
const surfaces = [
  {
    name: "the sign-in page",
    render: (extra: { problem?: string } = {}) => <SignInPage {...extra} />,
    links: ["/forgot-password", "/sign-up"],
  },
  {
    name: "the sign-up page",
    render: (extra: { problem?: string } = {}) => <SignUpPage {...extra} />,
    links: ["/sign-in"],
  },
  {
    name: "the forgot-password page",
    render: (extra: { problem?: string } = {}) => <ForgotPasswordPage {...extra} />,
    links: ["/sign-in"],
  },
  {
    name: "the forgot-password page, having sent one",
    render: (extra: { problem?: string } = {}) => <ForgotPasswordPage sent {...extra} />,
    links: ["/sign-in"],
  },
  {
    name: "the reset page with a token",
    render: (extra: { problem?: string } = {}) => <ResetPasswordPage token="a-token" {...extra} />,
    links: ["/forgot-password"],
  },
  {
    // No token, so no form to submit — and the offer to sign in instead, which the render above drops.
    name: "the reset page with no token",
    render: (extra: { problem?: string } = {}) => <ResetPasswordPage {...extra} />,
    links: ["/forgot-password", "/sign-in"],
  },
] as const;

// Every page the navigation exists for. Their anchors are the reason this file's assertion had to
// change shape, so they are the ones it has to cover.
test.each(surfaces.map((surface) => [surface.name, surface] as const))(
  "%s links only to this application's own routes",
  (_name, surface) => {
    render(surface.render());

    expect(linksWithinOwnRoutes()).toEqual(surface.links);
  },
);

// A refusal sentence is the one string on those pages that arrives from a request, so it is where an
// injected link would land if `failures.ts` ever reflected better-auth's message instead of mapping
// a code to a sentence of its own. Asserted on every page that renders one, because each has its own
// anchors and it is the *set* that this file pins.
test.each(surfaces.map((surface) => [surface.name, surface] as const))(
  "a refusal sentence on %s adds no anchor, whatever it says",
  (_name, surface) => {
    render(surface.render({ problem: `Try ${hostile}` }));

    expect(screen.getByRole("alert").textContent).toBe(`Try ${hostile}`);
    expect(linksWithinOwnRoutes()).toEqual(surface.links);
  },
);

/**
 * **The notice a *successful* action comes back with, which is a second string arriving from a
 * request** and was not covered before CAN-31 Email verification and password reset.
 *
 * Its shape differs from a refusal in the way that matters: the prose is selected by a flag's mere
 * presence rather than by a code, so nothing from the query string reaches the sentence at all. That
 * makes it the safer of the two — and it is asserted rather than argued, because the flag-to-prose
 * mapping is the kind of thing a later change could turn into a value being rendered.
 */
test.each([
  ["a completed sign-up", <SignInPage key="created" created />],
  ["a confirmed address", <SignInPage key="verified" verified />],
  ["a changed password", <SignInPage key="reset" reset />],
])("the notice for %s adds no anchor either", (_name, page) => {
  render(page);

  // The sign-in page's own set, read from the table above rather than restated here — all three of
  // these notices are that page's.
  const signIn = surfaces.find((surface) => surface.name === "the sign-in page")!;
  expect(screen.getByRole("status").textContent).not.toContain(hostile);
  expect(linksWithinOwnRoutes()).toEqual(signIn.links);
});
