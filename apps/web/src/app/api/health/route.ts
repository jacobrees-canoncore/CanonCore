import { checkHealth, type Health } from "@/db/health";

/**
 * Each answer's status code. Every one of them is argued below; the map is here so that adding a
 * fourth answer to `Health` will not compile until this file has decided what the monitor sees.
 */
const statuses: Record<Health, number> = {
  healthy: 200,
  "story-unreadable": 500,
  "database-silent": 503,
};

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
 * **Since CAN-151 Watch the Story route, where a broken policy serves 200 with nothing in it, what
 * it checks is the product rather than the process.** `health.ts` reads the founding Story the way
 * the public Story page reads it, so a row-level-security policy that stopped letting a stranger
 * through fails this check — where a `select 1` would have passed it and the page would have
 * served an empty 200. That failure is the one this project has designed hardest against and is
 * also the one that reports nothing, which is why it is the one the monitor now watches.
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
 * **Two failing statuses, and neither is a 4xx.** UptimeRobot counts 2xx and 3xx as up and pages
 * instantly on anything else, so the status code *is* the alert — which leaves no room for
 * anything meaning "degraded, don't worry". Both codes below page the phone and neither softens
 * the other; what the second one buys is the *triage*, at the only moment the evidence is free.
 * A `503` says the application ran and PostgreSQL did not answer it three times; a `500` says
 * PostgreSQL answered and the Story did not come back, which is a policy or a migration rather
 * than an outage. They are different entries in docs/runbook.md, and telling them apart from the
 * alert alone costs nothing here and one `curl` at three in the morning otherwise.
 *
 * **No body, in any of the three answers.** A monitor sending `HEAD` would never read one, and a
 * health route with somewhere to put detail is a health route that accumulates it: the version,
 * the host, the error, the row count. Every one of those is something a stranger could then ask
 * this route for.
 *
 * **So nothing here reveals the row it read, and that is what makes it safe to expose.** The
 * strongest reading of these three codes is whether one public Story is currently readable by
 * somebody with no account — which is exactly what its own public address answers to anyone who
 * asks, and it names no id, no owner and no field.
 */
export async function GET() {
  return new Response(null, {
    status: statuses[await checkHealth()],
    // A cached answer is an answer about the past, and the one question this route is asked is
    // whether the database is answering *now*.
    headers: { "Cache-Control": "no-store" },
  });
}
