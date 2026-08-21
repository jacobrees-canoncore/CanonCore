// @vitest-environment node
//
// The liveness route's whole value is what it does *not* do, so that is what is asserted here.
//
// Why a route that reaches the database is expensive, and what this one is for, are in
// `route.ts`. Not restated here: one meaning, one place.
//
// What matters for the tests below is the consequence. This route must never grow a database
// dependency, and the last test is the guard on that, because the regression would be invisible —
// adding one read would still pass every behavioural test above while quietly restoring the bill.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { GET } from "./route";

test("answers 200", async () => {
  expect((await GET()).status).toBe(200);
});

// A cached 200 is a 200 about the past. The monitor is asking whether this deployment is running
// *now*, and an edge-cached answer would keep saying yes after it stopped — which is the same
// failure `/api/health` avoids by refusing to be cached, for the same reason.
test("refuses to be cached", async () => {
  expect((await GET()).headers.get("Cache-Control")).toBe("no-store");
});

// Same argument as `/api/health`: a monitor sending HEAD never reads a body, and a liveness route
// with somewhere to put detail is one that accumulates it.
test("says nothing but its status", async () => {
  expect(await (await GET()).text()).toBe("");
});

/**
 * Every way this file could reach Postgres, and why each one counts separately.
 *
 * **Naming only `@/db` would be the obvious guard and the wrong one.** It is the front door, but
 * three others open onto the same room, and the second and third do not mention `db` at all:
 * `pg` and `drizzle-orm` are the layers underneath it, and `@/auth` is better-auth, which holds a
 * pool of its own on its own role (docs/adr/0021-a-third-database-role-for-better-auth.md). A
 * plausible future edit here is an auth check, not a query, so that last one is the likeliest real
 * regression and the easiest to wave through in review.
 */
const waysToReachTheDatabase = [
  { via: "the application's own database module", pattern: /@\/db|["'./]db\// },
  { via: "the Postgres driver directly", pattern: /from\s+["']pg["']/ },
  { via: "the query builder, which carries a connection", pattern: /drizzle-orm/ },
  { via: "better-auth, which holds a pool of its own", pattern: /@\/auth/ },
];

// The guard. Written against the source rather than the behaviour because there is no behaviour to
// observe: a route that reached the database would still answer 200, and the only symptom would be
// a bill nobody reads for a month.
//
// It is a text search, so it proves only that this file does not name these things — a helper
// imported from elsewhere could still reach them, and nothing here would notice. That is the
// honest limit of it, and it is worth having anyway because the regression it is built for is an
// import added to this file: the plausible future edit here is an auth check or a "while we are
// in here" read, not a helper written to hide one.
test.each(waysToReachTheDatabase)("does not reach the database via $via", ({ pattern }) => {
  const source = readFileSync(fileURLToPath(new URL("./route.ts", import.meta.url)), "utf8");

  expect(source).not.toMatch(pattern);
});
