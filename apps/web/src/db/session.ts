import { sql } from "drizzle-orm";
import { type Database, database } from "./client";
import { sessionUserSetting } from "./schema";

/**
 * The session user for a request from nobody.
 *
 * The empty string rather than an absence, so that the anonymous path and a signed-in one differ
 * by the *value* of one setting and not by a code path — the same transaction, the same role,
 * the same policy. `story`'s `story_owner_id_not_blank` constraint is what makes it safe: no
 * owner can ever equal it, so an anonymous reader matches the policy's public branch and nothing
 * else.
 */
export const anonymous = "";

/** What a caller is handed inside `withSession`: a transaction, already bound to a user. */
export type Session = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Open a transaction, say who is asking, and read.
 *
 * **`SET LOCAL`, and an explicit transaction, are both load-bearing** (ADR-0005, rule 3).
 * Production connects through Neon's pooler, which hands a connection back to the pool between
 * statements, so a session-level setting would be dropped before the query that needs it —
 * or, worse, be inherited by the next request. `set_config(..., true)` is `SET LOCAL` in a form
 * that takes the value as a bind parameter, which a bare `SET LOCAL` cannot.
 *
 * The value is not sanitised anywhere and does not need to be. It is bound, never interpolated,
 * and the policy compares it against `owner_id`, so an unrecognised value matches no rows rather
 * than every row.
 */
export async function withSession<T>(
  userId: string,
  read: (session: Session) => Promise<T>,
): Promise<T> {
  return database().transaction(async (session) => {
    await session.execute(sql`select set_config(${sessionUserSetting}, ${userId}, true)`);
    return read(session);
  });
}
