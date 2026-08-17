import { and, eq, inArray, notExists, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";
import { snapshot, source, story, tombstone } from "./schema.ts";

/**
 * What a purge did, so that the run itself is the evidence it happened.
 *
 * **The counts are the point rather than a convenience.** TMDB's `§1.D` obliges us to "promptly
 * delete or otherwise purge all TMDB Content, including any cached content"
 * ([API Terms of Use](https://www.themoviedb.org/api-terms-of-use)), and *prompt* with no figure
 * attached is judged after the event against how quickly we could have acted. A dispatched run
 * printing what it removed is what makes that answerable.
 */
export type PurgeReport = {
  readonly sourceId: string;
  readonly snapshotsDeleted: number;
  /** The Stories this purge emptied, each now a tombstone. Sorted, so two runs read alike. */
  readonly storiesTombstoned: readonly string[];
  /** Touched, and left standing because another Source still says something about them. */
  readonly storiesKeptForAnotherSource: number;
};

/**
 * Every table in the schema, and what a purge does with it.
 *
 * **This exists because two of the things a `§1.D` purge has to reach do not exist yet.**
 * [ADR-0014](../../../../docs/adr/0014-shell-providers-and-per-source-retention.md) → *Decision 6*
 * names them as unresolved: `supersededValue`, which is by construction a verbatim copy of Source
 * content sitting in the **override** table, and ADR-0008's audit payloads, which a purge is a
 * second reason to scrub on a different trigger. Neither table is written yet, so neither can be
 * purged yet — and a purge that quietly skipped them would report success while leaving Source
 * content behind, which is the failure the whole ticket exists to prevent.
 *
 * So the schema is checked before anything is deleted, and a table nobody has classified stops the
 * purge. Adding a table means answering the question here; it is the same device
 * `rls.test.ts` uses to stop a table arriving with nobody having decided whether it needs a policy.
 *
 * **The answer is not always "delete it".** A store held under a statutory retention duty is a
 * conflict rather than an omission: `docs/compliance/csea-reporting-procedure.md` -> What a report
 * must contain, and what this service actually holds records the same shape against GDPR erasure,
 * where Reg. 8 keeps a report's content for a year and the erasure job cannot. Such a table has to
 * be decided, not swept into the list below.
 */
export const howThePurgeTreatsEachTable = {
  snapshot:
    "Deleted, every row whose Source is the purged one. This is where a Source's content lives.",
  source:
    "Deleted last, in the same transaction. `snapshot.source_id` references it `on delete no " +
    "action`, so that statement can only succeed if no Snapshot of it survived anywhere — " +
    "including rows this transaction never selected.",
  story:
    "Deleted where the purge emptied it, and replaced by a tombstone. A Story another Source " +
    "still says something about is left standing (ADR-0014 decision 8).",
  tombstone:
    "Written, and never read or deleted here. It carries no value any Source supplied, which is " +
    "the whole of why it may remain.",
} as const;

/**
 * Refuse to purge a schema this module does not recognise.
 *
 * Asked of `pg_class` rather than of `schema.ts`, because what has to be complete is the purge's
 * coverage of the **database**: a table created by a migration nobody thought about here is exactly
 * the case a list in TypeScript cannot see.
 *
 * Exported so that a test can create a table and watch this refuse. `purgeSource` calls it before
 * opening its transaction.
 */
export async function assertEveryTableIsClassified(client: Client): Promise<void> {
  const { rows } = await client.query<{ relname: string }>(
    `select relname from pg_class
      where relnamespace = 'public'::regnamespace and relkind = 'r'
      order by relname`,
  );

  const unclassified = rows
    .map((row) => row.relname)
    .filter((table) => !(table in howThePurgeTreatsEachTable));

  if (unclassified.length > 0) {
    throw new Error(
      `Refusing to purge: nothing says what this purge should do with ${unclassified.join(", ")}. ` +
        "A table holding a Source's content that the purge does not reach is a breach that " +
        "reports success. Classify it in howThePurgeTreatsEachTable in src/db/purge-source.ts — " +
        "docs/adr/0014-shell-providers-and-per-source-retention.md -> Decision 6 lists the two " +
        "known cases, `supersededValue` and the audit payloads.",
    );
  }
}

/**
 * Delete everything one Source said, and tombstone the Stories that leaves with nothing.
 *
 * **Run by hand, as `canoncore_migrator`, because termination is learnt by a person reading mail
 * rather than from a webhook.** `docs/runbook.md` → *A Source's licence terminates* is the
 * procedure, names the operator and holds the cross-check. The application role cannot run this at
 * all: it holds `SELECT` and nothing else (migration 0005), which is why this takes a client rather
 * than going through `session.ts`.
 *
 * **One transaction, and it is not an Operation.** Nothing here is undoable and nothing should be:
 * `CONTEXT.md` → *Operation* says that what the product does unbidden — a retention sweep, a purge
 * — is never one, and an undo buffer holding purged Source content would be the breach again with
 * a nicer name.
 */
export async function purgeSource(client: Client, sourceId: string): Promise<PurgeReport> {
  await assertEveryTableIsClassified(client);

  const database = drizzle(client);

  return database.transaction(async (transaction) => {
    // `for update` on the Source's own row, which is what makes this atomic against an import
    // running at the same time. A foreign key check on `insert into snapshot` needs a key-share
    // lock on the row it references, and `for update` "prevents them from being locked, modified or
    // deleted by other transactions until the current transaction ends. That is, other transactions
    // that attempt … SELECT FOR KEY SHARE of these rows will be blocked"
    // (https://www.postgresql.org/docs/17/explicit-locking.html). Observed rather than inferred:
    // holding this lock blocked a concurrent Snapshot insert on PostgreSQL 17.11, 17 August 2026.
    //
    // Without it the insert would land after the delete and before the source delete, and the
    // foreign key would refuse the source delete — a rollback rather than a leak, but a purge that
    // failed for a reason nobody at 3am would recognise.
    const [locked] = await transaction
      .select({ id: source.id })
      .from(source)
      .where(eq(source.id, sourceId))
      .for("update");

    // A purge of nothing prints the same report as a purge that worked, and that report is the
    // evidence the duty was discharged. So a Source that is not there is a refusal, not a zero.
    if (!locked) {
      throw new Error(
        `Refusing to purge: there is no Source with id ${sourceId}. Read the ids from the ` +
          "database rather than from anywhere else — docs/runbook.md -> A Source's licence " +
          "terminates says what identifies which Source an id is, and what does not.",
      );
    }

    const deleted = await transaction
      .delete(snapshot)
      .where(eq(snapshot.sourceId, sourceId))
      .returning({ storyId: snapshot.storyId });
    const touched = deleted.map((row) => row.storyId);

    // Decision 8's condition, asked of the database after the delete rather than worked out from
    // what was deleted: a Story is emptied when **no** Snapshot of it remains, whichever Source it
    // came from. When Overrides exist this gains a second clause — a Story carrying a value its
    // owner typed degrades to it rather than becoming a tombstone (ADR-0004) — and the tripwire
    // above is what will make that a decision rather than an omission.
    const emptied =
      touched.length === 0
        ? []
        : await transaction
            .select({
              id: story.id,
              ownerId: story.ownerId,
              visibility: story.visibility,
            })
            .from(story)
            .where(
              and(
                inArray(story.id, touched),
                notExists(
                  transaction
                    .select({ one: sql`1` })
                    .from(snapshot)
                    .where(eq(snapshot.storyId, story.id)),
                ),
              ),
            );

    if (emptied.length > 0) {
      // `deleted` is left to its column default, so the moment recorded is this transaction's own.
      // Owner and Visibility are carried across: they are the product's facts about the record
      // rather than any Source's, and they are what the tombstone's policy reads.
      await transaction.insert(tombstone).values(
        emptied.map((emptiedStory) => ({
          id: emptiedStory.id,
          formerType: "story" as const,
          ownerId: emptiedStory.ownerId,
          visibility: emptiedStory.visibility,
        })),
      );

      await transaction.delete(story).where(
        inArray(
          story.id,
          emptied.map((emptiedStory) => emptiedStory.id),
        ),
      );
    }

    // Last, and load-bearing: see `source` in howThePurgeTreatsEachTable above. If this succeeds,
    // no Snapshot of this Source exists anywhere in the database.
    await transaction.delete(source).where(eq(source.id, sourceId));

    return {
      sourceId,
      snapshotsDeleted: deleted.length,
      storiesTombstoned: emptied.map((emptiedStory) => emptiedStory.id).sort(),
      storiesKeptForAnotherSource: touched.length - emptied.length,
    };
  });
}
