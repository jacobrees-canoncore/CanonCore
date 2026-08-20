import type { StoryDetail, StoryVersion } from "@/db/stories";
import { siteName } from "@canoncore/config";
import Link from "next/link";
import { formatRuntime } from "./runtime";

/**
 * Everything a public Story page draws, and nothing that fetches.
 *
 * Split from `[id]/page.tsx` for `front-page.tsx`'s reason: the page is an async Server Component
 * reading the database, which a render test cannot call without one.
 *
 * **Nothing here is a link except the one back to the front page.** A title is a value somebody
 * typed or a Source supplied, and this application renders no such value as a followable address —
 * `../no-linkification.test.tsx` holds the closed set of addresses that may be anchors, and the
 * illegal-content risk assessment's *Existing controls relied on* is what rests on it. So what this
 * Story is part of is named rather than linked to, and reaching that Story means its own address.
 *
 * That one link is `next/link` rather than a bare `<a>`, which is what
 * `@next/next/no-html-link-for-pages` requires of an href to a page — a client-side navigation
 * instead of a document load. It renders an anchor either way, so the control above sees it exactly
 * as it sees every other.
 */
export function StoryPage({ story }: { story: StoryDetail }) {
  return (
    <main>
      <p className="site">
        <Link href="/">{siteName}</Link>
      </p>
      <h1>{story.title}</h1>
      <p className="lead">
        {story.runtimeSeconds === null ? "No runtime stated." : formatRuntime(story.runtimeSeconds)}
      </p>
      <hr />
      <h2 id="part-of">Part of</h2>
      {story.partOf.length === 0 ? (
        <p>Part of nothing else.</p>
      ) : (
        <ul aria-labelledby="part-of">
          {story.partOf.map((whole) => (
            <li key={whole.id}>{whole.title}</li>
          ))}
        </ul>
      )}
      <hr />
      <h2 id="versions">Versions</h2>
      {story.versions.length === 0 ? (
        <p>No Version of this Story is recorded.</p>
      ) : (
        <ul aria-labelledby="versions">
          {story.versions.map((version) => (
            <li key={version.id}>{versionLine(version)}</li>
          ))}
        </ul>
      )}
    </main>
  );
}

/**
 * One Version as a line: its Medium, and its runtime where it has one.
 *
 * Every Medium in the enum is one lower-case word, so capitalising the first letter is the whole of
 * the display name and a table mapping seven values to seven near-identical strings would be seven
 * places for them to drift apart.
 */
function versionLine({ medium, runtimeSeconds }: StoryVersion): string {
  const name = medium[0].toUpperCase() + medium.slice(1);
  return runtimeSeconds === null ? name : `${name}, ${formatRuntime(runtimeSeconds)}`;
}
