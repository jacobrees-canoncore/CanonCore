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
    <>
      <h1 className="headline">{siteName}</h1>
      <p className="lead">Being rebuilt.</p>
      <hr />
      <p>This domain is reserved for the new version, which is still in development.</p>
      <hr />
      {signedInAs === undefined ? (
        // Plain anchors rather than `next/link`, and react-doctor's `nextjs-no-a-element` is
        // knowingly accepted on both — a warning rather than a gate. `site-header.tsx` holds the
        // measurement the trade rests on, for every anchor in the application rather than these two.
        <p className="meta">
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
        <form className="meta" method="post" action="/api/auth/sign-out">
          <span>
            Signed in as <strong>{signedInAs}</strong>.
          </span>{" "}
          <button type="submit">Sign out</button>
        </form>
      )}
      <hr />
      <h2>{signedInAs === undefined ? "Public Stories" : "Stories you can read"}</h2>
      {stories.length === 0 ? (
        <p className="empty">No Story is public yet.</p>
      ) : (
        <ul>
          {stories.map((story) => (
            <li key={story.id}>{story.title}</li>
          ))}
        </ul>
      )}
    </>
  );
}
