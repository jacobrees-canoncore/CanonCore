import { readViewer, sessionUserFor } from "@/auth/viewer";
import { readStory } from "@/db/stories";
import { notFound } from "next/navigation";
import { StoryPage } from "../story-page";

/**
 * Rendered per request, for `../../page.tsx`'s reason: row-level security decides what this page
 * contains from the session user set inside the transaction, so a build-time render would be a
 * render for nobody, and one cached copy would be one reader's view served to the next.
 */
export const dynamic = "force-dynamic";

/**
 * One Story at its own address.
 *
 * **A 404 is the answer to all three ways this can find nothing** — no such Story, a Story this
 * reader may not see, and an id that is not a uuid — because the alternative tells a stranger which
 * of them it was. `readStory` is where that collapsing happens and says why.
 *
 * A Story that has been purged is a fourth, and it answers 404 too for now: the row is gone and a
 * tombstone stands where it was. Answering the 410 that tombstone exists for is CAN-111 Decide and
 * build what a dropped Story renders as.
 */
export default async function Story({ params }: PageProps<"/story/[id]">) {
  const { id } = await params;
  const viewer = await readViewer();
  const story = await readStory(sessionUserFor(viewer), id);

  if (!story) notFound();

  return <StoryPage story={story} />;
}
