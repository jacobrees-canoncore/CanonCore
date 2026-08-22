import { and, eq, ne, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";
import { type CapabilityDeclaration, retentionAsInterval } from "../providers/declaration.ts";
import { snapshot, source } from "./schema.ts";

// **The `.ts` extensions above are load-bearing**, and they are why this module's imports look
// unlike its neighbours'. `node` runs the operator command by stripping types rather than by
// compiling a project, so every relative import on the path from `../../scripts/read-declaration.mts`
// down needs one — while everything under `src` that only Next and vitest reach is written without.
// `purge-source.ts` is the same case for the same reason. What catches an import that forgets:
// `../../scripts/read-declaration.test.mts`.

/**
 * Write down what a Provider declares about one Source.
 *
 * **Run as `canoncore_migrator`, not by the application**, which is why this takes a client rather
 * than going through `session.ts`. The application role may read every table here and write none of
 * them but the Anchor mint (migration 0005), and that is deliberate: a Source belongs to nobody, so
 * nothing a reader does may create or alter one. `purge-source.ts` takes a client for the same
 * reason.
 *
 * **The ingress a *person* uses is not this** — CAN-113 Add a Provider by pasting its URL is that,
 * and it is a different act with different duties. What this serves is a Listed Provider, which this
 * project writes and runs and which nobody pastes in: `docs/runbook.md` → *A Provider's declaration
 * is read or re-read* is the procedure.
 */

/** What a read of one Provider did, so the run is the record of it. */
export type DeclarationRecord = {
  readonly sourceId: string;
  readonly providerBaseUrl: string;
  /** What the Provider calls this Source. Scoped to that Provider and to no other. */
  readonly declaredId: string;
  readonly outcome: Outcome;
  /**
   * Snapshots of this Source that were stored under a declaration this read has superseded, and are
   * therefore withheld until they have been fetched again.
   *
   * Zero on every outcome but `superseded`, and reported rather than acted on: dropping them is a
   * different decision, owned by CAN-103 Refresh Snapshots before their Source's retention expires,
   * and drop what cannot be refreshed.
   */
  readonly snapshotsWithheld: number;
};

/**
 * What a read did to the row.
 *
 * - `recorded` — this Provider had not declared this Source before.
 * - `unchanged` — the same declaration, on the Provider's own clock. Only `read_at` moved.
 * - `superseded` — a later declaration replaced the one held. What was stored under the old one is
 *   now withheld, which is what stops the change being silent.
 */
export type Outcome = "recorded" | "unchanged" | "superseded";

/**
 * Store a declaration, or refuse the read that produced it.
 *
 * **A declaration older than the one held is refused rather than applied.** `declaredAt` is what
 * orders two reads, and the only reason to have it is to notice this case: a Provider that has gone
 * backwards is serving something stale or something else entirely, and writing it would put values
 * already stored under terms that were superseded before they were read.
 */
/**
 * Record that this Provider answered with something that is not a capability declaration, and say
 * how many Sources of its that reached.
 *
 * **Only for a Source already recorded, and only where the Provider answered.** There is nothing to
 * mark for one nothing has declared yet — it has no row, which is the whole of what failing closed
 * comes to there — and an unreachable host is not a Provider stating anything. `unreadableSince` in
 * [`schema.ts`](schema.ts) holds the line between the two, and what the mark withdraws.
 */
export async function recordUnreadableDeclaration(
  client: Client,
  providerBaseUrl: string,
  because: string,
): Promise<number> {
  const database = drizzle(client);

  // **By Provider alone, because an answer that did not parse names no Source.** `declared_id` comes
  // out of the declaration, and there isn't one — so what is marked is every row this Provider has
  // declared, which the contract makes at most one of: `/capabilities` answers for a single Source.
  const marked = await database
    .update(source)
    .set({
      // The **first** such answer, not the latest. A Provider answering rubbish every hour for a
      // month has been unreadable for a month, and a column that moved each time would report that
      // it started an hour ago.
      unreadableSince: sql`coalesce(${source.unreadableSince}, now())`,
      unreadableBecause: because,
    })
    .where(eq(source.providerBaseUrl, providerBaseUrl))
    .returning({ id: source.id });

  return marked.length;
}

export async function recordDeclaration(
  client: Client,
  providerBaseUrl: string,
  declaration: CapabilityDeclaration,
): Promise<DeclarationRecord> {
  const database = drizzle(client);

  // The columns a declaration decides, which is every column but the key and `read_at`. Named once
  // so the insert and the update below cannot describe different rows — an update that forgot a
  // member would leave the superseded declaration's answer standing beside the new one's, which is
  // exactly the re-interpretation this whole path exists to prevent.
  const declared = {
    name: declaration.source.name,
    url: declaration.source.url,
    declaredAt: declaration.declaredAt,
    retention: retentionAsInterval(declaration.retention),
    licenceSpdx: declaration.licence.spdx,
    licenceName: declaration.licence.name,
    licenceUrl: declaration.licence.url,
    licenceShareAlike: declaration.licence.shareAlike,
    attribution: declaration.attribution,
    restrictions: [...declaration.restrictions],
    classification: declaration.classification ?? null,
    orderingsCanonical: declaration.orderings?.canonical ?? null,
    livenessConfirmsDeletion: declaration.liveness?.confirmsDeletion ?? null,
    livenessEvidence: declaration.liveness?.evidence ?? null,

    // A declaration that reads clears the mark, which is what makes it a fact about the *last* read
    // rather than a flag that accumulates. Both halves together, because the constraint relates
    // them.
    unreadableSince: null,
    unreadableBecause: null,
  };

  // One shape for all three outcomes, so a member cannot be right on one path and forgotten on
  // another — the three differ in two fields and agreed on the other three by copying.
  const record = (outcome: Outcome, sourceId: string, snapshotsWithheld = 0): DeclarationRecord => ({
    sourceId,
    providerBaseUrl,
    declaredId: declaration.source.id,
    outcome,
    snapshotsWithheld,
  });

  return database.transaction(async (transaction) => {
    // `for update` on the Source's own row, so a second read of the same Provider running at the
    // same time cannot interleave between the comparison below and the write that depends on it.
    // `purge-source.ts` holds the same lock for the neighbouring reason.
    const [held] = await transaction
      .select({ id: source.id, declaredAt: source.declaredAt })
      .from(source)
      .where(
        and(
          eq(source.providerBaseUrl, providerBaseUrl),
          eq(source.declaredId, declaration.source.id),
        ),
      )
      .for("update");

    if (!held) {
      const [written] = await transaction
        .insert(source)
        .values({ providerBaseUrl, declaredId: declaration.source.id, ...declared })
        .returning({ id: source.id });

      return record("recorded", written.id);
    }

    if (held.declaredAt > declaration.declaredAt) {
      throw new Error(
        `Refusing to store: ${providerBaseUrl} declared ${declaration.declaredAt.toISOString()}, ` +
          `which is older than the ${held.declaredAt.toISOString()} already held for ` +
          `${declaration.source.id}. A Provider's own clock is what orders two reads, so a ` +
          "declaration going backwards is a Provider serving something superseded or something " +
          "else entirely. Nothing has been changed.",
      );
    }

    if (held.declaredAt.getTime() === declaration.declaredAt.getTime()) {
      // The same declaration. Only when it was last read moves, which is what makes a Source nobody
      // has re-read in a long time visible as one.
      await transaction
        .update(source)
        .set({ readAt: sql`now()`, unreadableSince: null, unreadableBecause: null })
        .where(eq(source.id, held.id));

      return record("unchanged", held.id);
    }

    await transaction
      .update(source)
      .set({ ...declared, readAt: sql`now()` })
      .where(eq(source.id, held.id));

    // Counted after the write rather than worked out from it: what is withheld is every Snapshot of
    // this Source not stored under the declaration now in force, which is the same question
    // `readSnapshot` asks of one row.
    const [{ withheld }] = await transaction
      .select({ withheld: sql<number>`count(*)::int` })
      .from(snapshot)
      .where(and(eq(snapshot.sourceId, held.id), ne(snapshot.sourceDeclaredAt, declaration.declaredAt)));

    return record("superseded", held.id, withheld);
  });
}
