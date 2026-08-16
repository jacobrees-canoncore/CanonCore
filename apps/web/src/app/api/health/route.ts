import { databaseAnswers } from "@/db/health";

/**
 * What the uptime monitor asks, and how anyone finds out the site is down.
 *
 * **A route rather than the front page, though the front page would do it today.** `/` reads a
 * Story through this same pool, so a database that stopped answering would take it to a 500 and a
 * monitor watching it would go red — by accident. That is one `error.tsx`, one cached render or
 * one page that needs no row away from being untrue, and it would stop being true *silently*: the
 * monitor would keep reporting a green page while the database was gone. Here the dependency is
 * the thing being checked rather than a side effect of it.
 *
 * The monitor, its constraints and its alert route are docs/infrastructure.md -> Uptime
 * monitoring: UptimeRobot; what to do when it fires is docs/runbook.md.
 *
 * **`GET` and no `HEAD`, though the monitor only ever sends `HEAD`.** The free plan cannot be
 * switched to `GET`, and Next's own guide says an unsupported method answers 405 — but the
 * implementation shipped in this version maps `HEAD` onto the `GET` handler where a route exports
 * no `HEAD` of its own (docs/incidents.md -> A failing check reaches the phone, a recovering one
 * may not, which read it out of `next` itself). A `HEAD` export would be a second copy of this
 * handler kept in step by hand.
 *
 * **200 or nothing, never a status that describes the state.** UptimeRobot counts 2xx and 3xx as
 * up and pages instantly on anything else, so the status code *is* the alert — which leaves no
 * room for a 4xx meaning "degraded, don't worry". 503 is therefore the whole of what this route
 * can say about a database it cannot reach, and `databaseAnswers` is what makes sure it only says
 * it about a database that has failed to answer three times.
 *
 * **No body, in either answer.** A monitor sending `HEAD` would never read one, and a health route
 * with somewhere to put detail is a health route that accumulates it: the version, the host, the
 * error, the row count. Every one of those is something a stranger could then ask this route for.
 */
export async function GET() {
  return new Response(null, {
    status: (await databaseAnswers()) ? 200 : 503,
    // A cached answer is an answer about the past, and the one question this route is asked is
    // whether the database is answering *now*.
    headers: { "Cache-Control": "no-store" },
  });
}
