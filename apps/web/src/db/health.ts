import { anonymous } from "./session";
import { readStory, type StoryDetail } from "./stories";

/**
 * The Story the check reads, and the one thing it depends on that no code in this repository
 * creates: a row, inserted by migration 0002 and given the rest of its shape by migration 0012.
 *
 * **It is written down in three places and `scripts/check-docs.ts` compares them.** Here, in that
 * migration, and in `docs/infrastructure.md` -> The Story the health check reads. Removing the
 * record reddens a build rather than leaving a check nobody can explain, and a copy that drifts
 * from the migration is caught before it can reach production — where it would be silent in the
 * worst way available: `readStory` answers `undefined` for anything that is not a uuid without
 * opening a transaction, so a typo here would report `story-unreadable` for ever, page the phone
 * hourly, and never once ask the database.
 */
const foundingStoryId = "00000000-0000-4000-8000-000000000001";

/**
 * One read of that Story: it comes back, it comes back as nothing, or it throws.
 *
 * **Typed as the read rather than as `unknown`**, because `undefined` is no longer a value this
 * discards — it is one of the three answers. An ask that resolved to `null` for the same meaning
 * would read as a healthy site, and this is what stops one being substituted.
 */
type Ask = () => Promise<StoryDetail | undefined>;

/** Three asks, a quarter-second apart. Both numbers are small against the monitor's 30 seconds. */
const asks = 3;
const pauseBetweenAsks = 250;

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The real ask: the public Story page's own read, for a reader with no account, opened exactly as
 * that page opens it.
 *
 * **`readStory` rather than a query of this module's own**, because a check that reads the table a
 * different way is a check that can pass while the page fails. The transaction, the session user,
 * the policies it goes through and the three tables it touches are the page's, and there is one
 * implementation of them.
 *
 * **The anonymous session user is the whole point of asking as nobody.** Row-level security decides
 * what comes back from the value set inside the transaction (`session.ts`), so this asks the one
 * question a stranger's request asks: is the public Story still public to somebody with no account.
 */
const askForTheFoundingStory: Ask = () => readStory(anonymous, foundingStoryId);

/**
 * What the check found. Three answers rather than two, because the two failures have different
 * causes, different fixes and different entries in `docs/runbook.md`.
 */
export type Health = "healthy" | "story-unreadable" | "database-silent";

/**
 * Whether this deployment can still serve its one Story. The whole of what `/api/health` decides,
 * and deliberately the whole of what it reports.
 *
 * **It reads a Story rather than asking `select 1`, and that is the change CAN-151 Watch the Story
 * route, where a broken policy serves 200 with nothing in it made.** `select 1` proved a connection
 * and nothing a visitor would notice. **A broken policy returns an empty result rather than an
 * error** (ADR-0005, rule 2), so a deployment whose row-level security had stopped letting the
 * anonymous reader through answered `select 1` perfectly and served an empty front page with a
 * `200`. ADR-0018's own consequence is the warrant for closing that: *the health route is the
 * monitored surface, so anything that makes it answer 200 while the product is broken is a defect
 * in the check, not a passing check*.
 *
 * **The earlier argument against naming a table was that it would start answering questions about
 * the schema.** It does not: what comes back is discarded, and the answer is one of three status
 * codes. What that argument protected is the *response*, and `route.ts` still holds it.
 *
 * **This costs nothing extra to run**, which is what makes it affordable at all. A Neon compute is
 * billed for the five-minute window each wake opens rather than by the query
 * ([ADR-0026](../../../../docs/adr/0026-the-database-bill-is-watched-rather-than-capped.md)), so a
 * bigger question asked on the same hourly knock is free, and a second monitor asking it would not
 * have been.
 *
 * **Three asks rather than one, because a single failed ask must not page a phone.** The monitor
 * treats a check that answers an erroneous status quite differently from one that answers
 * nothing, and nothing in it can delay an alert — the per-channel delay is disabled on the free
 * plan and there is no failure threshold at all (docs/infrastructure.md -> Uptime monitoring:
 * UptimeRobot, which holds both with their source). So the repetition that setting would have
 * provided is done here instead, inside the one request.
 *
 * **The retry is for a dead connection and for nothing else, which is why an empty answer returns
 * immediately.** Neon suspends an idle compute and reactivates it on the next query, *"within a
 * few hundred milliseconds"* ([scale to zero](https://neon.com/docs/introduction/scale-to-zero)),
 * and this application holds a pool across that. Asking again is worth something only because the
 * failed connection does not come back: a client whose socket has died is marked unqueryable
 * (`_handleErrorEvent` in `pg` 8.23.0's `client.js`) and is removed on release rather than returned
 * to the pool (the `!client._queryable` clause of `_release`, in `pg-pool` 3.14.0). `session.ts`
 * covers the other half, a client that dies while it is idle. **A database that answered with no
 * rows has none of that wrong with it**, and will answer with no rows again a quarter of a second
 * later, so retrying would only spend three times the compute and delay the alert.
 *
 * **Nothing here gives up on a slow ask, and that is the safer of the two failure modes.** A check
 * that abandoned one would report an outage every time a suspended compute took a moment to come
 * back. If an ask never returns at all, the bound is the monitor's own 30-second timeout, and a
 * check that times out is the one UptimeRobot confirms from other locations before believing —
 * the opposite of the error status this route works to avoid answering with.
 */
export async function checkHealth(ask: Ask = askForTheFoundingStory): Promise<Health> {
  for (let asked = 1; asked <= asks; asked++) {
    try {
      return (await ask()) === undefined ? "story-unreadable" : "healthy";
    } catch {
      // Deliberately unread. What went wrong is for the runtime log, which the deployment already
      // writes; carrying it any further would end with it on the response.
      if (asked < asks) await pause(pauseBetweenAsks);
    }
  }
  return "database-silent";
}
