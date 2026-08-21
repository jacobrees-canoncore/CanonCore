import { sql } from "drizzle-orm";
import { type CapabilityDeclaration, retentionFromInterval } from "../providers/declaration";
import { source } from "./schema";
import { withSession } from "./session";

/**
 * Every Source this catalogue draws on, as the Provider that serves it declared them.
 *
 * **A read, and only a read.** The row is written by `canoncore_migrator` in
 * [`record-declaration.ts`](record-declaration.ts); the application role holds `SELECT` on this
 * table and nothing else, which is why a page can show what a Source obliges and nothing a reader
 * does can change it.
 */

/** One Source, and the declaration currently in force for it. */
export type DeclaredSource = {
  readonly id: string;
  /** The Provider this was declared by. Half of the Source's identity — `schema.ts` says why. */
  readonly providerBaseUrl: string;
  /** When the application last read the declaration, on its own clock rather than the Provider's. */
  readonly readAt: Date;
  readonly declaration: CapabilityDeclaration;
};

/**
 * The retention, in the form the Provider declared it.
 *
 * **`intervalstyle` is set for the transaction rather than the interval being reformatted here.**
 * PostgreSQL's default output for `interval 'P6M'` is `6 mons`, and its ISO 8601 style gives back
 * `P6M` — the same string that went in
 * ([date/time output](https://www.postgresql.org/docs/17/datatype-datetime.html)). So what the
 * Provider said survives the round trip rather than being reconstructed from parts, and
 * `infinity` is unaffected by the style either way.
 */
const isoIntervals = sql`select set_config('intervalstyle', 'iso_8601', true)`;

/**
 * Read every Source, and what its Provider declares about it.
 *
 * **There is no `where` clause and there is no policy either**, which is the one place in this
 * application where those two facts sit together: a Source belongs to nobody and every reader sees
 * the same ones ([ADR-0014](../../../../docs/adr/0014-shell-providers-and-per-source-retention.md)
 * → *Decision 6*). `rls.test.ts` holds the tripwires that stand in for the cross-tenant test this
 * table cannot have.
 *
 * The values come back as the declaration they were written from. Nothing re-parses them: the only
 * thing that writes this table writes what
 * [`declaration.ts`](../providers/declaration.ts) has already refused or accepted, and a second
 * parse here would be a second place for the shape to be described.
 */
export async function readDeclaredSources(userId: string): Promise<DeclaredSource[]> {
  return withSession(userId, async (session) => {
    await session.execute(isoIntervals);

    const rows = await session
      .select({
        id: source.id,
        providerBaseUrl: source.providerBaseUrl,
        declaredId: source.declaredId,
        name: source.name,
        url: source.url,
        declaredAt: source.declaredAt,
        readAt: source.readAt,
        retention: source.retention,
        licenceSpdx: source.licenceSpdx,
        licenceName: source.licenceName,
        licenceUrl: source.licenceUrl,
        licenceShareAlike: source.licenceShareAlike,
        attribution: source.attribution,
        restrictions: source.restrictions,
        classification: source.classification,
        orderingsCanonical: source.orderingsCanonical,
        livenessConfirmsDeletion: source.livenessConfirmsDeletion,
        livenessEvidence: source.livenessEvidence,
      })
      .from(source)
      // By the Source's name, then by the Provider that declared it, so two Providers serving
      // Sources of the same name still come back the same way twice.
      .orderBy(source.name, source.providerBaseUrl);

    return rows.map((row) => ({
      id: row.id,
      providerBaseUrl: row.providerBaseUrl,
      readAt: row.readAt,
      declaration: {
        declaredAt: row.declaredAt,
        source: { id: row.declaredId, name: row.name, url: row.url },
        retention: retentionFromInterval(row.retention),
        licence: {
          spdx: row.licenceSpdx,
          name: row.licenceName,
          url: row.licenceUrl,
          shareAlike: row.licenceShareAlike,
        },
        attribution: row.attribution,
        restrictions: row.restrictions,
        // Null is what a Provider that does not do this thing looks like in the column, and
        // `undefined` is what it looks like in the declaration. The two mean the same and the
        // refusals read the second, so the conversion happens once, here.
        classification: row.classification ?? undefined,
        orderings:
          row.orderingsCanonical === null ? undefined : { canonical: row.orderingsCanonical },
        liveness:
          row.livenessConfirmsDeletion === null
            ? undefined
            : {
                confirmsDeletion: row.livenessConfirmsDeletion,
                evidence: row.livenessEvidence ?? undefined,
              },
      },
    }));
  });
}
