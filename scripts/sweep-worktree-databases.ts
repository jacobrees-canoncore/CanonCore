#!/usr/bin/env node
// Takes back the databases `provision-worktree-database.ts` hands out.
//
//   node scripts/sweep-worktree-databases.ts           # say what would go, change nothing
//   node scripts/sweep-worktree-databases.ts --apply   # actually delete
//
// **Why a sweeper rather than a teardown hook or an expiry.** `orca worktree rm` runs
// `scripts.archive` only with `--run-hooks`, so the ordinary removal path skips it silently, and a
// teardown that fires on the tidy path alone tidies nothing. Neon's `expires_at` *does* work on this
// organisation — read back on 21 August 2026 as `ttl_interval_seconds` on a branch created with it,
// which settles a question `docs/research/per-worktree-preview-databases.md` left open — and it is
// still not used here, because it deletes the Neon half and leaves the Vercel variable pointing at a
// host that no longer answers, and because it can fire under a lane that is still open. A sweeper
// recovers from every missed teardown rather than only the next one, and takes both halves together.
//
// **Dry by default.** This deletes databases. `--apply` is the whole difference between reading a
// plan and destroying one, and the plan prints every survivor with the reason it survived — because
// a survivor nobody can explain is the next thing to accumulate unnoticed.
//
// The decision itself is `sweepPlan` in `scripts/lib/worktree-database.ts`, which is pure and
// tested; this file is the wiring. Design: docs/adr/0025-a-preview-database-per-worktree.md.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { NEON_PROJECT, NeonUnavailable, neonBranches, neonRequest } from "./lib/neon-api.ts";
import type { EnvironmentVariable } from "./lib/worktree-database.ts";
import { deadVariables, gitBranchOf, sweepPlan } from "./lib/worktree-database.ts";

const VERCEL_API = "https://api.vercel.com";
const VERCEL_PROJECT = "canoncore";
const REPOSITORY = "jacobrees-canoncore/CanonCore";

// The `projectId` Orca gives this repository's worktrees, read from `orca worktree list --json` on
// 21 August 2026. Orca also emits `repo:<uuid>` for a repository it has no forge remote for, so
// this is a value to re-read rather than assume — which is why `openWorktreeBranches` below treats
// "rows exist but none match" as *unknown* rather than as *none open*.
const ORCA_PROJECT = "github:jacobrees-canoncore/canoncore";

const VERCEL_AUTH = join(homedir(), "Library", "Application Support", "com.vercel.cli", "auth.json");
const VERCEL_CONFIG = join(homedir(), "Library", "Application Support", "com.vercel.cli", "config.json");

const apply = process.argv.includes("--apply");

const run = (file: string, args: string[]) =>
  execFileSync(file, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function tryRun(file: string, args: string[]): string | undefined {
  try {
    return run(file, args);
  } catch {
    return undefined;
  }
}

function die(why: string): never {
  console.error(`\n  ✗ ${why}\n`);
  process.exit(1);
}

/**
 * The Vercel CLI's own token, rather than a second permanent secret.
 *
 * **`vercel env rm` has no `--git-branch` flag** on 58.7.1 — its help shows only
 * `vercel env remove name [environment]` — so the CLI can create a branch-scoped variable and
 * cannot delete one, and removal has to go through the REST API. Rather than mint and store a
 * second Vercel token beside the Neon key, this reads the one the CLI already holds. A `vercel`
 * command is run first because that token is short-lived and the CLI refreshes it on use; if the
 * file has moved or the shape has changed this stops rather than guessing.
 */
function vercelAuth(): { token: string; teamId: string } {
  if (tryRun("vercel", ["whoami"]) === undefined)
    die("`vercel whoami` failed, so the CLI is not authenticated and its token cannot be refreshed.");
  try {
    const token = (JSON.parse(readFileSync(VERCEL_AUTH, "utf8")) as { token?: string }).token;
    const teamId = (JSON.parse(readFileSync(VERCEL_CONFIG, "utf8")) as { currentTeam?: string })
      .currentTeam;
    if (!token || !teamId) throw new Error("no token or no current team");
    return { token, teamId };
  } catch (error) {
    return die(
      `could not read the Vercel CLI's own credentials from ${VERCEL_AUTH}: ${(error as Error).message}. ` +
        "Its format may have moved — docs/adr/0025-a-preview-database-per-worktree.md -> Teardown.",
    );
  }
}

async function vercel(url: string, token: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  const body = await response.text();
  if (!response.ok)
    die(`${init.method ?? "GET"} ${url} answered ${response.status}: ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : {};
}

const neon = async (path: string, init?: RequestInit) => {
  try {
    return await neonRequest(path, init);
  } catch (error) {
    return die(error instanceof NeonUnavailable ? error.message : String(error));
  }
};

// --- What is out there. -------------------------------------------------------------------------

const branches = await (async () => {
  try {
    return await neonBranches();
  } catch (error) {
    return die(error instanceof NeonUnavailable ? error.message : String(error));
  }
})();

// Fetched first, so `origin/main` and every remote head are current rather than as stale as the
// last thing this worktree happened to do. A sweeper reading a stale origin would call a branch
// that landed an hour ago live, which is harmless, and one that was created an hour ago gone,
// which is not — so this is the read that has to be fresh.
if (tryRun("git", ["fetch", "origin", "--prune"]) === undefined)
  die("`git fetch origin` failed, so origin cannot be read and nothing can safely be called orphaned.");

const remote = (tryRun("git", ["ls-remote", "--heads", "origin"]) ?? "")
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [sha, ref] = line.split("\t");
    return { sha: sha!, branch: ref!.replace("refs/heads/", "") };
  });

const mainSha = tryRun("git", ["rev-parse", "origin/main"]);

/**
 * Remote branches carrying no commit `main` does not already have.
 *
 * The provisioning hook creates the git branch at the base commit before any work exists, so an
 * abandoned lane leaves exactly this — and `git merge-base --is-ancestor` is how it is told from a
 * branch with work on it. **A commit this checkout does not have reads as *not* empty**, which is
 * the safe direction: it keeps a database rather than deleting one over a failed lookup.
 */
const emptyRemoteBranches = remote
  .filter(
    ({ sha, branch }) =>
      branch !== "main" &&
      mainSha !== undefined &&
      tryRun("git", ["merge-base", "--is-ancestor", sha, mainSha]) !== undefined,
  )
  .map((r) => r.branch);

/**
 * Branches with an Orca worktree open on them, or `undefined` if `orca` could not be asked.
 *
 * The distinction is load-bearing and `sweepPlan` relies on it: an empty list means "no lane is
 * open", `undefined` means "I do not know", and reading the second as the first deletes the
 * database of every lane that has not committed yet.
 *
 * **So the emptiness test is applied after the filter, not before it.** `orca` lists every
 * repository it manages, and this one is identified by a `projectId` string that is Orca's to
 * change. Rows present with none matching is therefore *unknown* — the filter may simply have
 * stopped matching — and reading it as "no lane is open" would be the one path where a changed
 * value degrades toward deleting things. An archived lane is excluded on purpose: archiving is how
 * a lane is declared finished, and the branch still has to carry no commits to be swept at all.
 */
function openWorktreeBranches(): string[] | undefined {
  const raw = tryRun("orca", ["worktree", "list", "--json"]);
  if (raw === undefined) return undefined;
  try {
    const parsed = JSON.parse(raw) as { result?: { worktrees?: unknown } };
    const rows = (parsed.result?.worktrees ?? []) as {
      projectId?: string;
      branch?: string;
      isArchived?: boolean;
    }[];
    if (!Array.isArray(rows) || rows.length === 0) return undefined;
    const mine = rows.filter((r) => r.projectId === ORCA_PROJECT && typeof r.branch === "string");
    if (mine.length === 0) return undefined;
    return mine
      .filter((r) => !r.isArchived)
      .map((r) => r.branch!.replace("refs/heads/", ""));
  } catch {
    return undefined;
  }
}

const plan = sweepPlan({
  neonBranches: branches,
  remoteBranches: remote.map((r) => r.branch),
  emptyRemoteBranches,
  openWorktreeBranches: openWorktreeBranches(),
});

// --- The report, which is the whole output of a run without `--apply`. --------------------------

console.log(`\n▸ Worktree preview databases on Neon project ${NEON_PROJECT}\n`);

for (const refusal of plan.refusals) console.log(`  ✗ ${refusal}`);
if (plan.refusals.length) process.exit(1);

const width = Math.max(1, ...[...plan.sweep, ...plan.keep].map((e) => e.neonBranch.name.length));
for (const kept of plan.keep) console.log(`  keep    ${kept.neonBranch.name.padEnd(width)}  ${kept.reason}`);
for (const going of plan.sweep) console.log(`  DELETE  ${going.neonBranch.name.padEnd(width)}  ${going.reason}`);

// A branch-scoped variable can outlive the Neon branch it named — a hand-deleted branch, an earlier
// half-finished sweep — so the dead set is computed from origin rather than from what this run is
// about to delete. Anything scoped to a branch that is gone is dead whoever removed the database.
const onOrigin = new Set(remote.map((r) => r.branch));
const sweptBranches = plan.sweep.map((s) => gitBranchOf(s.neonBranch.name)!);
const { token, teamId } = vercelAuth();
const environmentRows = (
  (await vercel(`${VERCEL_API}/v10/projects/${VERCEL_PROJECT}/env?teamId=${teamId}`, token)) as {
    envs?: EnvironmentVariable[];
  }
).envs ?? [];

const deadBranches = [
  ...new Set([
    ...sweptBranches,
    ...environmentRows
      .map((row) => row.gitBranch)
      .filter((b): b is string => typeof b === "string" && b !== "" && !onOrigin.has(b)),
  ]),
];
const goingVariables = deadVariables(environmentRows, deadBranches);

for (const row of goingVariables)
  console.log(`  DELETE  ${row.key} scoped to ${row.gitBranch} on Vercel`);

// The abandoned-lane class leaves a git branch too, and it carries nothing `main` lacks — that is
// the test that put it in this class — so removing it loses no commit. A branch swept because it
// was already gone from origin has nothing to remove.
//
// `main` is excluded here as well as by every test upstream. It cannot reach this list — nothing
// names a Neon branch `wt/main` (`neonBranchName` refuses it) and `emptyRemoteBranches` skips it —
// so this guards against a future edit rather than against today's inputs, which is the point of it.
const goingRefs = sweptBranches.filter((b) => b !== "main" && onOrigin.has(b));
for (const branch of goingRefs) console.log(`  DELETE  refs/heads/${branch} on GitHub (carries nothing)`);

const total = plan.sweep.length + goingVariables.length + goingRefs.length;
if (total === 0) {
  console.log("\n  Nothing to sweep.\n");
  process.exit(0);
}
if (!apply) {
  console.log(`\n  ${total} things would go. Nothing was changed — re-run with --apply.\n`);
  process.exit(0);
}

// --- Apply. -------------------------------------------------------------------------------------
//
// **The Vercel variable goes before the Neon branch it names, and the order is a safety property
// rather than a preference.** Interrupted the other way round — a failed `DELETE`, a shape that
// moved, the process killed — the variable would be left overriding the fallback with a host that
// no longer answers, which is the exact state ADR-0025 -> *Teardown* refuses `expires_at` for.
// Interrupted this way round, the branch is orphaned and the preview falls back to the shared
// `preview` branch: the next run takes the branch, because the plan is computed from origin rather
// than from what any earlier run managed to finish.

for (const row of goingVariables) {
  await vercel(`${VERCEL_API}/v9/projects/${VERCEL_PROJECT}/env/${row.id}?teamId=${teamId}`, token, {
    method: "DELETE",
  });
  console.log(`  ✓ deleted ${row.key} scoped to ${row.gitBranch}`);
}
for (const going of plan.sweep) {
  await neon(`/projects/${NEON_PROJECT}/branches/${going.neonBranch.id}`, { method: "DELETE" });
  console.log(`  ✓ deleted Neon branch ${going.neonBranch.name}`);
}
for (const branch of goingRefs) {
  if (tryRun("gh", ["api", "-X", "DELETE", `repos/${REPOSITORY}/git/refs/heads/${branch}`]) === undefined)
    console.log(`  ⚠ could not delete refs/heads/${branch}; it carries nothing, so this is untidy only`);
  else console.log(`  ✓ deleted refs/heads/${branch}`);
}

console.log("");
