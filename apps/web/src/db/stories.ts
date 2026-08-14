import { story } from "./schema";
import { withSession } from "./session";

export type Story = {
  readonly id: string;
  readonly title: string;
};

/**
 * Every Story this user may read.
 *
 * **There is no `where` clause, and adding one would be the bug.** The policy on `story` decides
 * what comes back, so this query is also the assertion that it does: an application filter would
 * hide a broken policy behind the right answer, and a broken policy returns an empty result
 * rather than an error (ADR-0005, rule 2). `rls.test.ts` reads the same table the same way.
 */
export async function readVisibleStories(userId: string): Promise<Story[]> {
  return withSession(userId, (session) =>
    session.select({ id: story.id, title: story.title }).from(story).orderBy(story.title),
  );
}
