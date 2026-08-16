import { env } from "@/env";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { resolveDatabaseConnection } from "./database-url";
import * as schema from "./schema";

/**
 * The pool, and the transaction every read goes through.
 *
 * **The pool is module-private, and that is the point of putting it here.** `withSession` is the
 * only exported thing that can reach it, so there is no way to run a query without first saying
 * who is asking — a query that skipped that step would read as the anonymous session user or, on
 * a reused pooled connection, as whoever asked last.
 *
 * **Opened on the first query rather than when this module loads**, because a preview's database
 * host does not exist until its deployment does: Neon injects the branch's variables "via webhook
 * at deployment time"
 * ([preview branching](https://neon.com/docs/guides/vercel-native-integration-previews)). A pool
 * built at module scope would therefore have to be built during the build, when there is nothing
 * yet to connect to.
 */
let pool: Pool | undefined;

function database() {
  if (!pool) {
    const connection = resolveDatabaseConnection(env);
    // The deployment reporting the host it actually reached, which is the observation
    // docs/infrastructure.md -> How a preview reaches its own database was missing: the injected
    // values never appear in `vercel env pull`, so a running deployment is the only thing that
    // can say. Not a credential — a hostname opens nothing on its own.
    console.info(
      `[canoncore] database host ${connection.host} (VERCEL_ENV=${env.VERCEL_ENV ?? "unset"})`,
    );
    pool = new Pool({ connectionString: connection.url });
    // A connection the far side has already closed errors while it is sitting idle, and `pg`
    // raises that on the pool rather than on any query: the `error` event is *"Emitted whenever
    // an idle client in the pool encounters an error. This is common when your PostgreSQL server
    // shuts down, reboots, or a network partition otherwise causes it to become unavailable while
    // your pool has connected clients"* (`pg-pool` 3.14.0's README).
    //
    // **Without this listener that is not a missed log line, it is the end of the process.** An
    // `error` event with nothing listening is one Node *"[throws], a stack trace is printed, and
    // the Node.js process exits"* (https://nodejs.org/api/events.html#error-events) — which is
    // the wrong answer twice over: it takes down a deployment that has nothing wrong with it, and
    // it turns a dropped connection into exactly the erroneous HTTP status `health.ts` exists to
    // avoid answering with. There is nothing to do but say so. The pool discards the client
    // either way, which is what makes asking a second time worth anything.
    pool.on("error", (error) => {
      console.warn(`[canoncore] an idle database connection was dropped: ${error.message}`);
    });
  }
  return drizzle(pool, { schema });
}

/**
 * The session user for a request from nobody.
 *
 * The empty string rather than an absence, so that the anonymous path and a signed-in one differ
 * by the *value* of one setting and not by a code path — the same transaction, the same role, the
 * same policy. What makes it safe is `story`'s `story_owner_id_not_blank` constraint, in
 * `schema.ts`.
 */
export const anonymous = "";

/** What a caller is handed inside `withSession`: a transaction, already bound to a user. */
export type Session = Parameters<Parameters<ReturnType<typeof database>["transaction"]>[0]>[0];

/**
 * Once per pool, and the only assertion of ADR-0005 rule 1 that production ever makes.
 *
 * `rls.test.ts` asks `pg_roles` the same question, but of a container this repository created the
 * roles in, so it cannot fail for the deployment. Two ways a deployment could be reading through
 * no policy at all, and neither shows up as an error:
 *
 * - `BYPASSRLS`, which Neon's `neondb_owner` has.
 * - Being the table's *owner*. `canoncore_migrator` has no `BYPASSRLS` and would still see every
 *   row, because "table owners normally bypass row security as well"
 *   (https://www.postgresql.org/docs/current/ddl-rowsecurity.html). Checking the attribute alone
 *   would miss it, so the role's *name* is checked too wherever the environment says what it
 *   should be.
 */
let roleChecked = false;

async function assertTheRoleIsSubjectToPolicies(session: Session) {
  if (roleChecked) return;

  const { rows } = await session.execute<{ who: string; bypasses: boolean }>(
    sql`select current_user as who, rolbypassrls as bypasses
        from pg_roles where rolname = current_user`,
  );
  const role = rows[0];
  if (!role) throw new Error("Connected to the database as a role pg_roles does not list.");
  if (role.bypasses) {
    throw new Error(
      `Connected as ${role.who}, which has BYPASSRLS and therefore reads every row of every ` +
        "table regardless of policy. ADR-0005 rule 1. Refusing to serve.",
    );
  }
  if (env.DATABASE_APP_USER && role.who !== env.DATABASE_APP_USER) {
    throw new Error(
      `Connected as ${role.who}, not the application role ${env.DATABASE_APP_USER}. A role that ` +
        "owns these tables bypasses their policies without holding BYPASSRLS. Refusing to serve.",
    );
  }

  roleChecked = true;
}

/**
 * Open a transaction, say who is asking, and read.
 *
 * **`SET LOCAL`, and an explicit transaction, are both load-bearing** (ADR-0005, rule 3).
 * Production connects through Neon's pooler, which hands a connection back between statements, so
 * a session-level setting would be dropped before the query that needs it — or, worse, inherited
 * by the next request. `set_config` is that setting as a function call, which is what lets the
 * value be a bind parameter: `is_local` true means "the new value will only apply during the
 * current transaction" ([system administration
 * functions](https://www.postgresql.org/docs/current/functions-admin.html)).
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
    await assertTheRoleIsSubjectToPolicies(session);
    await session.execute(sql`select set_config(${schema.sessionUserSetting}, ${userId}, true)`);
    return read(session);
  });
}
