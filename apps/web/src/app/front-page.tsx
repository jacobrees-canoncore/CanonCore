import type { Story } from "@/db/stories";
import { siteName } from "@canoncore/config";

/**
 * Everything the front page draws, and nothing that fetches.
 *
 * Split from `page.tsx` so that this half stays a plain function of its arguments: the page is
 * an async Server Component reading the database, which a render test cannot call without one.
 */
export function FrontPage({ stories }: { stories: readonly Story[] }) {
  return (
    <main>
      <h1>{siteName}</h1>
      <p className="lead">Being rebuilt.</p>
      <hr />
      <p>
        This domain is reserved for the new version, which is still in
        development.
      </p>
      <hr />
      <h2>Public Stories</h2>
      {stories.length === 0 ? (
        <p>No Story is public yet.</p>
      ) : (
        <ul>
          {stories.map((story) => (
            <li key={story.id}>{story.title}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
