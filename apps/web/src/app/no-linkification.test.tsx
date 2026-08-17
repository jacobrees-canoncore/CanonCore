import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { ForgotPasswordPage } from "./forgot-password/forgot-password-page";
import { FrontPage } from "./front-page";
import { ResetPasswordPage } from "./reset-password/reset-password-page";
import { SignInPage } from "./sign-in/sign-in-page";
import { SignUpPage } from "./sign-up/sign-up-page";

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
 * **Every surface that renders text belongs in this file**, and five exist today — the two account
 * recovery pages joined with **CAN-31 Email verification and password reset**. CAN-27 Orderings
 * and Placements, and the imported broadcast Ordering brings the Ordering and Story pages, CAN-26
 * Import a series from TMDB, with the overlay behind it brings a Listed Provider's prose, and
 * CAN-113 Add a Provider by pasting its URL brings a stranger's. Finding 2c of the illegal content
 * assessment names all three, so a surface landing without its case here makes that record false.
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
const ownRoutes = ["/sign-in", "/sign-up", "/forgot-password"];

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

// Every page the navigation exists for. Their anchors are the reason this file's assertion had to
// change shape, so they are the ones it has to cover. **The two reset pages render a different set
// depending on what they were given**, and both renders are listed rather than only the fuller one:
// the branch is what a case-per-page test would miss.
test.each([
  ["the sign-in page", <SignInPage key="in" />, ["/forgot-password", "/sign-up"]],
  ["the sign-up page", <SignUpPage key="up" />, ["/sign-in"]],
  ["the forgot-password page", <ForgotPasswordPage key="forgot" />, ["/sign-in"]],
  ["the forgot-password page, having sent one", <ForgotPasswordPage key="sent" sent />, ["/sign-in"]],
  [
    "the reset page with a token",
    <ResetPasswordPage key="token" token="a-token" />,
    ["/forgot-password"],
  ],
  [
    "the reset page with no token",
    <ResetPasswordPage key="no-token" />,
    ["/forgot-password", "/sign-in"],
  ],
])("%s links only to this application's own routes", (_name, page, expected) => {
  render(page);

  expect(linksWithinOwnRoutes()).toEqual(expected);
});

// A refusal sentence is the one string on those pages that arrives from a request, so it is where an
// injected link would land if `failures.ts` ever reflected better-auth's message instead of mapping
// a code to a sentence of its own. Asserted on every page that renders one, because each has its own
// anchors and it is the *set* that this file pins.
test.each([
  ["the sign-in page", (problem: string) => <SignInPage problem={problem} />, ["/forgot-password", "/sign-up"]],
  ["the sign-up page", (problem: string) => <SignUpPage problem={problem} />, ["/sign-in"]],
  [
    "the forgot-password page",
    (problem: string) => <ForgotPasswordPage problem={problem} />,
    ["/sign-in"],
  ],
  [
    "the reset page",
    (problem: string) => <ResetPasswordPage token="a-token" problem={problem} />,
    ["/forgot-password"],
  ],
])("a refusal sentence on %s adds no anchor, whatever it says", (_name, page, expected) => {
  render(page(`Try ${hostile}`));

  expect(screen.getByRole("alert").textContent).toBe(`Try ${hostile}`);
  expect(linksWithinOwnRoutes()).toEqual(expected);
});

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

  expect(screen.getByRole("status").textContent).not.toContain(hostile);
  expect(linksWithinOwnRoutes()).toEqual(["/forgot-password", "/sign-up"]);
});
