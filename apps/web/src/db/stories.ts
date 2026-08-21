import { eq, sql } from "drizzle-orm";
import * as z from "zod";
import { partOf, story, version } from "./schema";
import { withSession } from "./session";

export type Story = {
  readonly id: string;
  readonly title: string;
};

/** One Version of a Story, as a Story page shows it — `CONTEXT.md` → *Version*. */
export type StoryVersion = {
  readonly id: string;
  readonly medium: (typeof version.medium.enumValues)[number];
  /** Absent for a Version with no length in time, which is the ordinary case for prose or a comic. */
  readonly runtimeSeconds: number | null;
};

/** Everything one Story page draws: the Story, its Versions, and what it is part of. */
export type StoryDetail = Story & {
  /**
   * The runtime of this Story's canonical Version, and absent when it has not named one or when the
   * one it named has no runtime. It is never a runtime of the Story's own, because a Story does not
   * have one ([ADR-0001](../../../../docs/adr/0001-two-levels-story-and-version.md)).
   */
  readonly runtimeSeconds: number | null;
  readonly versions: readonly StoryVersion[];
  /** The Stories this one is part of. Unordered containment, so they are listed by title. */
  readonly partOf: readonly Story[];
};

/**
 * A runtime as a count of seconds, read out of the `interval` the column holds — why seconds rather
 * than the interval itself is on `version.runtime` in [`schema.ts`](schema.ts).
 *
 * **`::int` is what makes this a number.** `extract` returns `numeric`
 * ([date/time functions](https://www.postgresql.org/docs/17/functions-datetime.html)), and `pg`
 * hands `numeric` back as a *string* rather than risking a precision it cannot represent — read
 * back from this database on 20 August 2026 as `"2700.000000"` without the cast and `2700` with it.
 */
const runtimeInSeconds = sql<number | null>`extract(epoch from ${version.runtime})::int`;

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

/**
 * One Story, with everything a public Story page shows, or nothing at all.
 *
 * **`undefined` covers three different states on purpose**: no Story has this id, the reader may not
 * see the one that has, and the id is not a uuid at all. The page answers 404 to all three, which is
 * the only answer that does not tell a stranger which of them it was — a Story of somebody else's
 * that is private has to be indistinguishable from one that never existed.
 *
 * **The `where` clauses here are lookups and not a policy in disguise**, which is the distinction
 * `readVisibleStories` above turns on: each names the row being asked for rather than restating who
 * may read it. What decides whether this Story, its Versions and its containment come back is the
 * policy on each table, and `rls.test.ts` reads all three the same way.
 *
 * The uuid check is the one guard that is not the database's: `story.id` is a `uuid` column, so a
 * path segment that is not one makes PostgreSQL raise a syntax error rather than return no rows —
 * an error page where a 404 is the truth.
 */
export async function readStory(userId: string, id: string): Promise<StoryDetail | undefined> {
  if (!z.uuid().safeParse(id).success) return undefined;

  return withSession(userId, async (session) => {
    // A left join, because a Story that has named no canonical Version is the ordinary case rather
    // than a missing row: `Series 1` is one, and an inner join would render it as no Story at all.
    const [found] = await session
      .select({ id: story.id, title: story.title, runtimeSeconds: runtimeInSeconds })
      .from(story)
      .leftJoin(version, eq(version.id, story.canonicalVersionId))
      .where(eq(story.id, id));

    if (!found) return undefined;

    const versions = await session
      .select({ id: version.id, medium: version.medium, runtimeSeconds: runtimeInSeconds })
      .from(version)
      .where(eq(version.storyId, id))
      // By Medium, which PostgreSQL orders in the enum's own declaration order, and then by id so
      // that two Versions in the same Medium come back the same way twice.
      .orderBy(version.medium, version.id);

    const wholes = await session
      .select({ id: story.id, title: story.title })
      .from(partOf)
      .innerJoin(story, eq(story.id, partOf.wholeId))
      .where(eq(partOf.partId, id))
      .orderBy(story.title);

    return { ...found, versions, partOf: wholes };
  });
}
