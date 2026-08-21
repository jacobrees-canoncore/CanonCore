/**
 * Whether this deployment is running. Deliberately not whether it can serve a request.
 *
 * **Nothing polls this yet, and adding it before anything does is deliberate.** Any check that
 * reaches the database costs money: the ask wakes a Neon compute, which then bills for the whole
 * of its five-minute scale-to-zero timeout, so a check arriving every five minutes never lets it
 * sleep. That is what happened here. The uptime monitor polled the **front page** every five
 * minutes until 21 August 2026, and `/` is `force-dynamic` and reads Stories from Postgres on
 * every request, so the database was awake 63.8% of wall clock: $18.55 of compute in the eleven
 * days the project had existed, which is about $52 in a full month against a $24 platform fee, for
 * a service with no users
 * (docs/adr/0026-the-database-bill-is-watched-rather-than-capped.md).
 *
 * **This route exists so that the frequent check can be the cheap one.** The intended shape is two
 * monitors: this one polled often and waking nothing, and `/api/health` polled rarely and still
 * proving the database. **Neither half is in place yet** — the monitor still points at the front
 * page and now runs hourly, and whether the free plan permits a second monitor at all is
 * unresolved. docs/infrastructure.md -> Uptime monitoring: UptimeRobot holds both, and the ADR
 * above holds what has to happen before the split can land.
 *
 * **It must never reach the database**, and `route.test.ts` asserts that against this file's
 * source rather than its behaviour. A read added here would still answer 200; the only symptom
 * would be the bill, a month later.
 *
 * **What it can and cannot see.** It answers only if Next is executing this handler on this
 * deployment, so it covers the failures that take the whole site: a deployment paused by Spend
 * Management, a failed release, DNS, TLS, a Vercel incident. It cannot see a database outage at
 * all, and that is not a gap here — it is `/api/health`'s job, and pretending otherwise is what
 * `docs/runbook.md` warns against when it says detection is one bit wide. **A monitor pointed here
 * instead of at `/api/health`, rather than as well as, would be strictly worse than today**: it
 * would report green through a total database failure.
 *
 * **`GET` and no `HEAD`, and no body**, for the same two reasons as `/api/health`: the monitor
 * only ever sends `HEAD`, which Next maps onto `GET` where a route exports no `HEAD` of its own,
 * and a liveness route with somewhere to put detail is one that accumulates it.
 */
export async function GET() {
  return new Response(null, {
    status: 200,
    // A cached answer is an answer about the past, and the one question this route is asked is
    // whether this deployment is running *now*. Without this the edge could keep answering 200
    // for a deployment that has stopped.
    headers: { "Cache-Control": "no-store" },
  });
}
