import type { Story } from "@/db/stories";
import { siteName } from "@canoncore/config";

/**
 * Everything the front page draws, and nothing that fetches.
 *
 * Split from `page.tsx` so that this half stays a plain function of its arguments: the page is an
 * async Server Component reading the database, which a render test cannot call without one.
 */
export function FrontPage({
  stories,
  signedInAs,
}: {
  stories: readonly Story[];
  /** The signed-in reader's email address, or nothing at all for a visitor with no account. */
  signedInAs?: string;
}) {
  return (
    <main>
      <h1>{siteName}</h1>
      <p className="lead">Being rebuilt.</p>
      <hr />
      <p>This domain is reserved for the new version, which is still in development.</p>
      <hr />
      {signedInAs === undefined ? (
        <p className="account">
          <a href="/sign-in">Sign in</a> or <a href="/sign-up">create an account</a>.
        </p>
      ) : (
        // A form rather than a link, because signing out is a POST: better-auth deletes the session
        // row, and a GET that changed state could be fired by anything that loads a URL.
        //
        // **It carries no fields, and that is now a plain fact rather than a load-bearing one.** An
        // earlier version of this comment claimed the absence was what got the request past
        // `/sign-out`'s media-type check. It is not: a browser sends an empty body rather than no
        // body, and this form was refused with a 415 in a browser after a unit test said otherwise.
        // `../api/auth/[...all]/route.ts` records the wrong turn and re-encodes every form post
        // instead, so this form would work with fields as well as without them.
        <form className="account" method="post" action="/api/auth/sign-out">
          <span>
            Signed in as <strong>{signedInAs}</strong>.
          </span>{" "}
          <button type="submit">Sign out</button>
        </form>
      )}
      <hr />
      <h2>{signedInAs === undefined ? "Public Stories" : "Stories you can read"}</h2>
      {stories.length === 0 ? (
        <p>No Story is public yet.</p>
      ) : (
        <ul>
          {stories.map((story) => (
            <li key={story.id}>{story.title}</li>
          ))}
        </ul>
      )}
      {/*
        The objection route ADR-0020 requires, reachable rather than merely existing: "an easy way
        to object" is not satisfied by an address you would have to be told. Here rather than in a
        footer on every page because this application has no footer yet, and CAN-89 Give the
        product a visual identity and a reading surface is what gives it one.

        **A plain anchor, like the two above it, and react-doctor's `nextjs-no-a-element` is
        knowingly accepted here.** The rule is right in general — a plain `<a>` costs client-side
        navigation and prefetching — and wrong on this page, which the byte budget CAN-60 Gate the
        front end on bytes, budgets and React lint added is what showed: `next/link` here took this
        page from 139,219 to 147,620 script bytes, measured both ways on 21 August 2026. That is
        8,401 bytes on the page a stranger loads, to soft-navigate one link most of them will never
        follow. `story-page.tsx` uses `Link` because it is a page you arrive at from another.
      */}
      <hr />
      <p className="account">
        <a href="/privacy/analytics">How visits are counted</a>
      </p>
    </main>
  );
}
