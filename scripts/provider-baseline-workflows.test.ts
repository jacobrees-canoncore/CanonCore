import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

// The two files the Provider baseline is made of, read as YAML rather than as text.
//
// Why this reads the real tree, where `check-docs.test.ts` runs against a fixture: these files
// *are* the thing under test, the same reason `provider-contract.test.ts` gives. And why they are
// tested at all, where every other workflow here is proved by running: **nothing in this
// repository ever runs `provider-ci.yml`**. It is `workflow_call`-only, so no push triggers it, and
// the first thing to execute it will be a pull request in a Provider repository — where a typo in
// the `uses:` path reads as *cannot find reusable workflow*, and a malformed job breaks every
// Provider at once. `scripts/check-docs.ts` composes the two job names but parses neither file as
// YAML, so it would not see any of that.
//
// What each value is for: docs/infrastructure.md -> The Provider repository baseline.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REUSABLE = ".github/workflows/provider-ci.yml";
const CALLER = "docs/provider-baseline/ci.yml";

type Job = { "runs-on"?: string; uses?: string; steps?: { run?: string; uses?: string }[] };
type Workflow = { on?: unknown; jobs?: Record<string, Job> };

const workflow = (path: string) => parse(readFileSync(join(ROOT, path), "utf8")) as Workflow;

const reusable = workflow(REUSABLE);
const caller = workflow(CALLER);

test("the baseline is callable and is triggered by nothing else", () => {
  // A `push` trigger here would run a Provider's gate against this repository on every push, where
  // none of the four scripts it calls exists — a permanently red workflow nobody could fix without
  // changing what a Provider inherits.
  assert.deepEqual(reusable.on, "workflow_call");
});

test("each side declares exactly one job, because the required context is composed from both", () => {
  // Two jobs on either side is two contexts, and the ruleset every Provider repository carries
  // requires one string. `composeRequiredContext` refuses to guess which; this is the assertion
  // that the files it reads have not grown a second one.
  assert.deepEqual(Object.keys(reusable.jobs ?? {}), ["gates"]);
  assert.deepEqual(Object.keys(caller.jobs ?? {}), ["baseline"]);
});

test("the caller calls this repository's baseline, at the path that actually exists", () => {
  // The failure this catches is invisible here and fatal there: a wrong path is a *cannot find
  // reusable workflow* error in a Provider repository, which reads like a typo in the caller
  // rather than in the file it names.
  const uses = caller.jobs?.baseline.uses;
  assert.equal(uses, `jacobrees-canoncore/CanonCore/${REUSABLE}@main`);
});

test("the caller passes no secrets, because the baseline needs none", () => {
  // Why none: docs/infrastructure.md -> The Provider repository baseline.
  assert.equal("secrets" in (caller.jobs?.baseline ?? {}), false);
});

test("the gate runs the four scripts and then the audit, in that order", () => {
  const runs = (reusable.jobs?.gates.steps ?? []).map((s) => s.run).filter(Boolean);
  assert.deepEqual(runs, [
    "pnpm install --frozen-lockfile",
    "pnpm run test",
    "pnpm run typecheck",
    "pnpm run lint",
    "pnpm run build",
    // Last on purpose: an advisory published overnight is not a broken build, and a red audit must
    // not be what hides a genuine compile error (docs/agents/workflow.md -> The gates).
    "pnpm audit --audit-level=high",
  ]);
});

test("the gate checks out, and sets up pnpm and Node, and runs on something", () => {
  const job = reusable.jobs?.gates;
  assert.equal(job?.["runs-on"], "ubuntu-latest");
  const uses = (job?.steps ?? []).map((s) => s.uses).filter(Boolean) as string[];
  assert.ok(
    uses.some((u) => u.startsWith("actions/checkout@")),
    "a called workflow gets no checkout for free",
  );
  assert.ok(uses.some((u) => u.startsWith("pnpm/action-setup@")));
  assert.ok(uses.some((u) => u.startsWith("actions/setup-node@")));
});
