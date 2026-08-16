import { sql } from "drizzle-orm";
import { anonymous, withSession } from "./session";

/** One request to the database, of the kind that either answers or throws. */
type Ask = () => Promise<unknown>;

/** Three asks, a quarter-second apart. Both numbers are small against the monitor's 30 seconds. */
const asks = 3;
const pauseBetweenAsks = 250;

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The real ask: a transaction that says who is asking, opened exactly as a page render opens one.
 *
 * `select 1` and no table, because this is liveness and nothing else: a query naming one would
 * start answering questions about the schema, which is the surface `route.ts` argues this route
 * must not grow.
 */
const askTheDatabase: Ask = () =>
  withSession(anonymous, (session) => session.execute(sql`select 1`));

/**
 * Whether the database answers. The whole of what `/api/health` decides, and deliberately the
 * whole of what it reports.
 *
 * **Three asks rather than one, because a single failed ask must not page a phone.** The monitor
 * treats a check that answers an erroneous status quite differently from one that answers
 * nothing, and nothing in it can delay an alert — the per-channel delay is disabled on the free
 * plan and there is no failure threshold at all (docs/infrastructure.md -> Uptime monitoring:
 * UptimeRobot, which holds both with their source). So the repetition that setting would have
 * provided is done here instead, inside the one request.
 *
 * **The blip this is built for is a connection that is already dead.** Neon suspends an idle
 * compute and reactivates it on the next query, *"within a few hundred milliseconds"*
 * ([scale to zero](https://neon.com/docs/introduction/scale-to-zero)), and this application holds
 * a pool across that. Asking again is worth something only because the failed connection does not
 * come back: a client whose socket has died is marked unqueryable (`_handleErrorEvent` in `pg`
 * 8.23.0's `client.js`) and is removed on release rather than returned to the pool (the
 * `!client._queryable` clause of `_release`, in `pg-pool` 3.14.0). `session.ts` covers the other
 * half, a client that dies while it is idle. Either way the second ask opens a fresh connection
 * rather than finding the same corpse.
 *
 * **Nothing here gives up on a slow ask, and that is the safer of the two failure modes.** A check
 * that abandoned one would report an outage every time a suspended compute took a moment to come
 * back. If an ask never returns at all, the bound is the monitor's own 30-second timeout, and a
 * check that times out is the one UptimeRobot confirms from other locations before believing —
 * the opposite of the error status this route works to avoid answering with.
 */
export async function databaseAnswers(ask: Ask = askTheDatabase): Promise<boolean> {
  for (let asked = 1; asked <= asks; asked++) {
    try {
      await ask();
      return true;
    } catch {
      // Deliberately unread. What went wrong is for the runtime log, which the deployment already
      // writes; carrying it any further would end with it on the response.
      if (asked < asks) await pause(pauseBetweenAsks);
    }
  }
  return false;
}
