import { test } from "node:test";
import assert from "node:assert/strict";

import {
  deadVariables,
  gitBranchOf,
  neonBranchName,
  pooledHostOf,
  sweepPlan,
} from "./worktree-database.ts";

// The pure half of the per-worktree preview database: what a Neon branch is called, which host a
// preview is pointed at, and — the part worth the most care — which of them are safe to delete.
// The wiring (`gh`, `vercel`, the Neon API, the report) is in the two scripts beside this module.
// docs/adr/0025-a-preview-database-per-worktree.md holds the design and every value asserted here.

// ---------------------------------------------------------------------------
// Naming. The prefix is the only thing standing between a sweeper and `main`.
// ---------------------------------------------------------------------------

test("a worktree's Neon branch is its git branch under a reserved prefix", () => {
  assert.equal(neonBranchName("jacobdrees/can-138"), "wt/jacobdrees/can-138");
  assert.equal(neonBranchName("CAN-11-welcome-email-queue"), "wt/CAN-11-welcome-email-queue");
});

test("the git branch round-trips out of the Neon branch name", () => {
  // The sweeper reads the git branch back off the Neon branch rather than keeping a mapping
  // anywhere, so a name that did not round-trip would be a database nothing could ever match to a
  // branch — and therefore either never swept or swept wrongly.
  for (const branch of ["jacobdrees/can-138", "CAN-11-welcome-email-queue", "nested/deep/name"]) {
    assert.equal(gitBranchOf(neonBranchName(branch)), branch);
  }
});

test("a Neon branch without the prefix belongs to nobody here", () => {
  // `main` and `preview` are the two that matter: `gitBranchOf` returning undefined is what keeps
  // them out of every candidate list, rather than a name check repeated at each call site.
  assert.equal(gitBranchOf("main"), undefined);
  assert.equal(gitBranchOf("preview"), undefined);
  assert.equal(gitBranchOf("preview/jacobdrees/can-138"), undefined);
  assert.equal(gitBranchOf("wt"), undefined);
});

test("a git branch that would collide with the prefix is refused rather than encoded", () => {
  // `wt/x` as a *git* branch would name the same Neon branch as the worktree database of `x`,
  // and the sweeper would then read one as the other. Nothing here creates such a branch; the
  // refusal exists so that the round-trip above is a property rather than a convention.
  assert.throws(() => neonBranchName("wt/x"), /reserved/);
  assert.throws(() => neonBranchName("main"), /main/);
  assert.throws(() => neonBranchName(""), /empty/);
});

// ---------------------------------------------------------------------------
// The host. One compute answers to two names and the preview variables carry the pooled one.
// ---------------------------------------------------------------------------

test("the pooled host is the endpoint host with -pooler on the compute", () => {
  // `vercel env pull --environment=preview` read `NEON_PGHOST` back as the *pooled* name on
  // 21 August 2026, so a worktree's own host has to be spelled the same way or the two rows would
  // differ for no reason a reader could see.
  assert.equal(
    pooledHostOf("ep-still-sunset-zatkkheb.c-2.eu-west-2.aws.neon.tech"),
    "ep-still-sunset-zatkkheb-pooler.c-2.eu-west-2.aws.neon.tech",
  );
});

test("a host that is already pooled is left alone", () => {
  // The Neon API returns the unpooled host on an endpoint and the pooled one in a connection URI,
  // and which of the two a caller has depends on the endpoint it asked. Idempotent, so neither
  // caller has to know.
  const pooled = "ep-still-sunset-zatkkheb-pooler.c-2.eu-west-2.aws.neon.tech";
  assert.equal(pooledHostOf(pooled), pooled);
});

test("something that is not a Neon host is refused rather than decorated", () => {
  // The failure this prevents is a whole connection string reaching the Vercel variable, which
  // `database-url.ts` would then use as a hostname — a confusing connection error at request time
  // instead of a refusal here.
  assert.throws(() => pooledHostOf("postgresql://u:p@ep-x.eu-west-2.aws.neon.tech/neondb"), /host/);
  assert.throws(() => pooledHostOf(""), /host/);
});

// ---------------------------------------------------------------------------
// The sweep. Every test below is about refusing to delete something, which is the only kind of
// mistake this module can make that costs anything.
// ---------------------------------------------------------------------------

const branch = (name: string, over: Partial<NeonBranchInput> = {}): NeonBranchInput => ({
  id: `br-${name.replace(/\W/g, "-")}`,
  name,
  ...over,
});

type NeonBranchInput = Parameters<typeof sweepPlan>[0]["neonBranches"][number];

test("a worktree database whose git branch is gone from origin is swept", () => {
  const plan = sweepPlan({
    neonBranches: [branch("wt/jacobdrees/can-138"), branch("wt/jacobdrees/can-99")],
    remoteBranches: ["main", "jacobdrees/can-138"],
    emptyRemoteBranches: [],
    openWorktreeBranches: [],
  });
  assert.deepEqual(
    plan.sweep.map((s) => s.neonBranch.name),
    ["wt/jacobdrees/can-99"],
  );
  assert.match(plan.sweep[0]!.reason, /gone from origin/);
});

test("`main` and `preview` are not candidates at all", () => {
  const plan = sweepPlan({
    neonBranches: [branch("main"), branch("preview"), branch("wt/jacobdrees/can-99")],
    remoteBranches: ["main"],
    emptyRemoteBranches: [],
    openWorktreeBranches: [],
  });
  assert.deepEqual(
    plan.sweep.map((s) => s.neonBranch.name),
    ["wt/jacobdrees/can-99"],
  );
  assert.equal(plan.keep.length, 2);
});

test("an empty list of remote branches refuses the whole sweep rather than deleting everything", () => {
  // This is the one that matters. `git ls-remote` failing, or being run somewhere with no
  // network, returns nothing — and "no branch is on origin" and "I could not read origin" are the
  // same value. Read as the former it deletes every database in the project.
  const plan = sweepPlan({
    neonBranches: [branch("wt/jacobdrees/can-138")],
    remoteBranches: [],
    emptyRemoteBranches: [],
    openWorktreeBranches: [],
  });
  assert.equal(plan.sweep.length, 0);
  assert.match(plan.refusals.join(" "), /could not be read|no branches/);
});

test("a protected or default Neon branch is never swept, whatever it is called", () => {
  // Belt and braces against a `wt/` name being given to something load-bearing by hand. Cheap,
  // and the alternative is that one mis-named branch is one irreversible deletion.
  const plan = sweepPlan({
    neonBranches: [
      branch("wt/jacobdrees/can-99", { protected: true }),
      branch("wt/jacobdrees/can-98", { default: true }),
    ],
    remoteBranches: ["main"],
    emptyRemoteBranches: [],
    openWorktreeBranches: [],
  });
  assert.equal(plan.sweep.length, 0);
  assert.equal(plan.keep.length, 2);
  for (const kept of plan.keep) assert.match(kept.reason, /protected|default/);
});

test("a branch on origin carrying nothing main lacks is swept only when no worktree is open", () => {
  // The abandoned-lane case. The setup hook creates the git branch on GitHub at the base commit,
  // so a lane that was opened and never worked leaves a branch carrying nothing — indistinguishable
  // from a live lane that has not committed yet, except by whether a worktree is open on it.
  const inputs = {
    neonBranches: [branch("wt/jacobdrees/can-138")],
    remoteBranches: ["main", "jacobdrees/can-138"],
    emptyRemoteBranches: ["jacobdrees/can-138"],
  };

  const open = sweepPlan({ ...inputs, openWorktreeBranches: ["jacobdrees/can-138"] });
  assert.equal(open.sweep.length, 0);
  assert.match(open.keep[0]!.reason, /worktree is open/);

  const closed = sweepPlan({ ...inputs, openWorktreeBranches: [] });
  assert.deepEqual(
    closed.sweep.map((s) => s.neonBranch.name),
    ["wt/jacobdrees/can-138"],
  );
  assert.match(closed.sweep[0]!.reason, /carries nothing/);
});

test("an unreadable worktree list keeps the abandoned-lane class rather than guessing at it", () => {
  // `orca` is a desktop CLI: it is absent on a runner and can fail locally. Undefined is not an
  // empty list, and reading it as one would delete the database of every lane that has not yet
  // committed. The other class — gone from origin — is unaffected, so a degraded sweep still does
  // the useful half.
  const plan = sweepPlan({
    neonBranches: [branch("wt/jacobdrees/can-138"), branch("wt/jacobdrees/can-99")],
    remoteBranches: ["main", "jacobdrees/can-138"],
    emptyRemoteBranches: ["jacobdrees/can-138"],
    openWorktreeBranches: undefined,
  });
  assert.deepEqual(
    plan.sweep.map((s) => s.neonBranch.name),
    ["wt/jacobdrees/can-99"],
  );
  assert.match(plan.keep[0]!.reason, /could not be read/);
});

// ---------------------------------------------------------------------------
// The Vercel half. One row in this listing is the fallback every other preview reads.
// ---------------------------------------------------------------------------

test("only branch-scoped rows for dead branches are deleted", () => {
  const rows = [
    { id: "env_shared", key: "NEON_PGHOST", target: ["preview"] },
    { id: "env_138", key: "NEON_PGHOST", target: ["preview"], gitBranch: "jacobdrees/can-138" },
    { id: "env_99", key: "NEON_PGHOST", target: ["preview"], gitBranch: "jacobdrees/can-99" },
  ];
  assert.deepEqual(
    deadVariables(rows, ["jacobdrees/can-99"]).map((r) => r.id),
    ["env_99"],
  );
});

test("the row with no git branch is never returned, even if a dead branch is named ''", () => {
  // The single most expensive mistake available here: the row with no `gitBranch` is the
  // environment-wide `NEON_PGHOST` that every preview without an override reads, and deleting it
  // takes every preview in the project down at once. It is excluded by shape, not by name, so no
  // string arriving in the dead list can select it.
  const rows = [
    { id: "env_shared", key: "NEON_PGHOST", target: ["preview"] },
    { id: "env_also_shared", key: "NEON_PGHOST", target: ["preview"], gitBranch: "" },
  ];
  assert.deepEqual(deadVariables(rows, ["", "jacobdrees/can-99"]), []);
});

test("a variable of another name is left alone", () => {
  // The scope is one variable. `NEON_PGDATABASE` is `neondb` on every branch and is deliberately
  // not per-worktree, so a branch-scoped row under that name is somebody else's and not ours to
  // remove.
  const rows = [
    { id: "env_db", key: "NEON_PGDATABASE", target: ["preview"], gitBranch: "jacobdrees/can-99" },
    { id: "env_99", key: "NEON_PGHOST", target: ["preview"], gitBranch: "jacobdrees/can-99" },
  ];
  assert.deepEqual(
    deadVariables(rows, ["jacobdrees/can-99"]).map((r) => r.id),
    ["env_99"],
  );
});

test("a production-targeted row is left alone however it is named", () => {
  // Nothing should ever create one, and if something did, this sweeper is not the thing that
  // should discover it by deleting it.
  const rows = [
    { id: "env_prod", key: "NEON_PGHOST", target: ["production"], gitBranch: "jacobdrees/can-99" },
  ];
  assert.deepEqual(deadVariables(rows, ["jacobdrees/can-99"]), []);
});
