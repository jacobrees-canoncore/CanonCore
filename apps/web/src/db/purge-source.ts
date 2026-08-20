import { and, eq, inArray, notExists, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";
import { snapshot, source, story, tombstone } from "./schema.ts";

/**
 * What a purge did, so that the run itself is the evidence it happened — which is what a duty owed
 * "promptly", with no figure attached, is answered with. `docs/runbook.md` → *A Source's licence
 * terminates* holds the obligation and its wording.
 */
export type PurgeReport = {
  readonly sourceId: string;
  readonly snapshotsDeleted: number;
  /** The Stories this purge emptied, each now a tombstone. Sorted, so two runs read alike. */
  readonly storiesTombstoned: readonly string[];
  /** Touched, and left standing because another Source still says something about them. */
  readonly storiesKeptForAnotherSource: number;
  /**
   * Tables this purge could not account for, empty on a complete one. Non-empty means **partial**:
   * everything the counts above describe still happened, the Source's own row was kept, and the
   * caller must fail rather than report a discharge — `unclassifiedTables` says why that is the
   * shape.
   */
  readonly tablesNotReached: readonly string[];
};

/**
 * Every table in the schema, and what a purge does with it.
 *
 * **It exists because two of the things a `§1.D` purge must reach do not exist yet** —
 * `supersededValue` and the audit payloads, named as unresolved by
 * `docs/adr/0014-shell-providers-and-per-source-retention.md` -> Decision 6, items 2 and 3, which
 * holds why each is Source content and why neither is settled. What this file adds is that the gap
 * cannot go quiet: a table missing from this record is reported by `unclassifiedTables` rather than
 * skipped.
 *
 * **Two bounds, stated because neither is obvious.** It is *table*-granular, so a Source-derived
 * column added to a table classified as kept — `story` is the only one a purge leaves standing —
 * trips nothing here. What forbids that is ADR-0004: the displayed record is derived and never
 * written directly, so a Source value has no business on `story` in the first place. And it reads
 * `public`, which is where every migration creates; an object in another schema is outside it.
 *
 * **The answer is not always "delete it".** A store held under a statutory retention duty is a
 * conflict rather than an omission: `docs/compliance/csea-reporting-procedure.md` -> What a report
 * must contain, and what this service actually holds records the same shape against GDPR erasure,
 * where Reg. 8 keeps a report's content for a year and the erasure job cannot. Such a table has to
 * be decided, not swept into the list below.
 */
// The values are read by people rather than by code, which is the point of them: a bare list of
// names would let a table be added without anybody writing down what the purge does with it.
export const howThePurgeTreatsEachTable = {
  snapshot:
    "Deleted, every row whose Source is the purged one. This is where a Source's content lives.",
  source:
    "Deleted last, in the same transaction, and only on a complete purge. `snapshot.source_id` " +
    "references it `on delete no action`, so that statement can only succeed if no Snapshot of it " +
    "survived anywhere — including rows this transaction never selected. A partial purge keeps the " +
    "row, because it is the handle the second run takes and because the proof would be a claim " +
    "that run cannot make.",
  story:
    "Deleted where the purge emptied it, and replaced by a tombstone. A Story another Source " +
    "still says something about is left standing (ADR-0014 decision 8).",
  version:
    "Deleted with the Story it belongs to, by the cascade on `version.story_id` rather than by any " +
    "statement here. Like `story` it holds no Source value directly — the displayed record is " +
    "derived and never written onto the row (ADR-0004) — so what a purge does with a Version is " +
    "decided entirely by what it does with its Story.",
  part_of:
    "Deleted with either Story it names, by the cascade, for `version`'s reason. An edge is this " +
    "product's own fact about two records rather than a value any Source supplied.",
  anchor:
    "Untouched, and not because it is out of reach. An Anchor carries no metadata at all, so no " +
    "Source ever supplied anything on it; it is also the row separate people's records are joined " +
    "on (ADR-0003), so deleting one would reach into catalogues this purge has no business in. An " +
    "Anchor whose last Story has gone is inert rather than orphaned.",
  tombstone:
    "Written, and never read or deleted here. It carries no value any Source supplied, which is " +
    "the whole of why it may remain.",

  // better-auth's five, added by CAN-24 A signed-in and a signed-out path. **All five are the same
  // answer for the same reason**, and they are listed one at a time anyway: the point of this record
  // is that a table cannot arrive without somebody writing down what happens to it, and a shared
  // entry would let the sixth in unnoticed.
  user:
    "Untouched. An account is this service's own fact about a person, never a value a Source " +
    "supplied, so a licence terminating says nothing about it. Erasing one is CAN-30 GDPR export " +
    "and erasure, which is a different duty owed to a different party.",
  session:
    "Untouched, for `user`'s reason. A session is a fact about a sign-in, and terminating a " +
    "Source's licence is not a reason to sign anybody out.",
  account:
    "Untouched, for `user`'s reason. A password hash comes from the person it belongs to and from " +
    "nowhere else.",
  verification:
    "Untouched, for `user`'s reason. A one-time token is issued by this service. It expires on its " +
    "own clock — CAN-31 Email verification and password reset owns that — and not on a Source's.",
  rate_limit:
    "Untouched, for `user`'s reason, and it holds no person's data at all: a counter against an " +
    "address and an endpoint.",
} as const;

/**
 * The tables in this database that `howThePurgeTreatsEachTable` says nothing about.
 *
 * Asked of `pg_class` rather than of `schema.ts`, because what has to be complete is the purge's
 * coverage of the **database**. A migration nobody thought about here is one case; a table created
 * by hand in production is the other, and it is not hypothetical — `docs/infrastructure.md` →
 * *Roles* records a privilege that existed in production and in no file, which no reading of the
 * migrations could have shown. Only a live read sees that.
 *
 * **It reports rather than refuses, and that is deliberate.** An earlier draft threw, which made the
 * duty undischargeable exactly when it was owed: the first purge after such a table landed would
 * delete nothing at all, and the code would have to be changed while the licence clock ran. Leaving
 * everything is a worse position than leaving everything-but-the-Snapshots. So the purge runs, keeps
 * the Source's row, and hands this list back for the caller to fail on — and the pressure to decide
 * before any of that happens sits in `rls.test.ts`, which fails in the pull request that adds an
 * unclassified table rather than during an incident.
 */
export async function unclassifiedTables(client: Client): Promise<string[]> {
  // Four `relkind`s rather than the ordinary-table `'r'` that `rls.test.ts` asks about, because the
  // question here is "could rows be sitting in it" and three other kinds answer yes: `'p'`
  // partitioned, `'f'` foreign, `'m'` materialised view. A materialised view over Snapshot values
  // would be cached content in the sense `§1.D` names, and an audit payload table is a plausible
  // thing to partition. Plain views (`'v'`) are excluded because they store no rows of their own.
  // The kinds are PostgreSQL's own (https://www.postgresql.org/docs/17/catalog-pg-class.html).
  const { rows } = await client.query<{ relname: string }>(
    `select relname from pg_class
      where relnamespace = 'public'::regnamespace and relkind in ('r', 'p', 'f', 'm')
      order by relname`,
  );

  return rows
    .map((row) => row.relname)
    .filter((table) => !(table in howThePurgeTreatsEachTable));
}

/**
 * Delete everything one Source said, and tombstone the Stories that leaves with nothing.
 *
 * **Run by hand, as `canoncore_migrator`, because termination is learnt by a person reading mail
 * rather than from a webhook.** `docs/runbook.md` → *A Source's licence terminates* is the
 * procedure, names the operator and holds the cross-check. The application role cannot run this at
 * all: it may read these tables and write none of them (migration 0005), and the one write it holds
 * anywhere — minting an Anchor, migration 0011 — reaches nothing this deletes. Which is why this
 * takes a client rather than going through `session.ts`.
 *
 * **One transaction, and it is not an Operation.** Nothing here is undoable and nothing should be:
 * `CONTEXT.md`'s glossary says that what the product does unbidden — a retention sweep, a purge — is
 * never an Operation, and an undo buffer holding purged Source content would be the breach again
 * with a nicer name.
 */
export async function purgeSource(client: Client, sourceId: string): Promise<PurgeReport> {
  const database = drizzle(client);

  return database.transaction(async (transaction) => {
    // Inside the transaction rather than before it. `drizzle(client)` runs every statement on the
    // client it was given, so a raw query here reads `pg_class` between this transaction's `begin`
    // and its deletes — checked rather than assumed: a `create table` issued this way was taken back
    // by rolling the drizzle transaction back, on PostgreSQL 17.11, 17 August 2026. It narrows the
    // window rather than closing it, because no lock this transaction holds prevents another session
    // committing DDL a moment later.
    const tablesNotReached = await unclassifiedTables(client);

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
        `Refusing to purge: there is no Source with id ${sourceId}. **This does not distinguish ` +
          "never-existed from already-purged**, and it cannot: a purge takes the row with it, so " +
          "a second run of a successful purge lands here. The run that did it is the record — " +
          "docs/runbook.md -> A Source's licence terminates says where to read it, and what " +
          "identifies which Source an id is.",
      );
    }

    const deleted = await transaction
      .delete(snapshot)
      .where(eq(snapshot.sourceId, sourceId))
      .returning({ storyId: snapshot.storyId });
    const touched = deleted.map((row) => row.storyId);

    // Decision 8's condition, asked of the database after the delete rather than worked out from
    // what was deleted: a Story is emptied when **no** Snapshot of it remains, whichever Source it
    // came from.
    //
    // **It owes a second clause the moment a Story can carry a value its owner typed** — such a
    // Story degrades to that value rather than becoming a tombstone (ADR-0004) — and that is not
    // only when the Override table lands. `story.title` is the case today: nothing writes one, and
    // the moment anything does, this condition is wrong before any new table exists to notice.
    // docs/runbook.md -> A Source's licence terminates says what a purge does to a title now.
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

    const emptiedIds = emptied.map((emptiedStory) => emptiedStory.id);

    if (emptiedIds.length > 0) {
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

      await transaction.delete(story).where(inArray(story.id, emptiedIds));
    }

    // Last, and load-bearing: see `source` in howThePurgeTreatsEachTable above. If this succeeds, no
    // Snapshot of this Source exists anywhere in the database.
    //
    // **Skipped when the purge is partial**, for two reasons that point the same way. The delete
    // would be claiming a completeness this run cannot claim — it proves only that `snapshot` is
    // clear, and an unclassified table is exactly the case where that is not the whole question. And
    // the row is the handle: with it gone, the re-run after the new table is classified would be
    // refused for naming a Source that is not there. A partial purge has to stay re-runnable.
    if (tablesNotReached.length === 0) {
      await transaction.delete(source).where(eq(source.id, sourceId));
    }

    return {
      sourceId,
      snapshotsDeleted: deleted.length,
      storiesTombstoned: [...emptiedIds].sort(),
      storiesKeptForAnotherSource: touched.length - emptied.length,
      tablesNotReached,
    };
  });
}
