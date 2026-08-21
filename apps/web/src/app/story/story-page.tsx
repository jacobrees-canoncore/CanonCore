import type { StoryDetail, StoryVersion } from "@/db/stories";
import { formatRuntime } from "./runtime";

/**
 * Everything a public Story page draws, and nothing that fetches.
 *
 * Split from `[id]/page.tsx` for `front-page.tsx`'s reason: the page is an async Server Component
 * reading the database, which a render test cannot call without one.
 *
 * **Nothing here is a link at all.** A title is a value somebody typed or a Source supplied, and
 * this application renders no such value as a followable address — `../no-linkification.test.tsx`
 * holds the closed set of addresses that may be anchors, and the illegal-content risk assessment's
 * *Existing controls relied on* is what rests on it. So what this Story is part of is named rather
 * than linked to, and reaching that Story means its own address.
 *
 * **The one link back used to be here and is now in the shell**, where CAN-89 Give the product a
 * visual identity and a reading surface put the masthead: a page that is arrived at from another
 * needs a way home on every route, not on the two that remembered.
 */
export function StoryPage({ story }: { story: StoryDetail }) {
  return (
    <>
      <h1>{story.title}</h1>
      <p className="lead">
        {story.runtimeSeconds === null ? "No runtime stated." : formatRuntime(story.runtimeSeconds)}
      </p>
      <hr />
      <h2 id="part-of">Part of</h2>
      {story.partOf.length === 0 ? (
        <p className="empty">Part of nothing else.</p>
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
        <p className="empty">No Version of this Story is recorded.</p>
      ) : (
        <ul aria-labelledby="versions">
          {story.versions.map((version) => (
            <li key={version.id}>{versionLine(version)}</li>
          ))}
        </ul>
      )}
    </>
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
