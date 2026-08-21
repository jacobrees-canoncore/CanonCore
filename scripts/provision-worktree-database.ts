#!/usr/bin/env node
// Gives this worktree a preview database of its own, so two lanes cannot migrate one database.
//
//   node scripts/provision-worktree-database.ts              # the `orca.yaml` setup hook
//   node scripts/provision-worktree-database.ts --print-host # resolve only, write nothing
//
// **What it does, in the order the order matters.** It creates the git branch on GitHub at the
// commit the worktree was based on, creates a Neon branch under `preview`, and sets a Vercel
// Preview `NEON_PGHOST` scoped to that one git branch. Every preview deployment of the branch then
// reads its own database, and `docs/adr/0025-a-preview-database-per-worktree.md` holds why each of
// the three steps is where it is.
//
// **The GitHub step is first because Vercel refuses the third without it.**
// `POST /v10/projects/canoncore/env` answers `BAD_REQUEST` / `branch_not_found` for a `gitBranch`
// that is not on the connected repository, so the variable cannot exist before the branch does —
// which is the finding that reshaped this design, since the ticket assumed it could. Creating the
// ref through the API fires GitHub's `create` event rather than `push`, so it starts no Vercel
// build: the branch exists, nothing is deployed, and the first real push already reads its own
// database. The ref is created at the *base* commit — one `origin` already has — so this publishes
// no work, whenever it is run.
//
// **It never fails a lane, and reports SKIP rather than FAIL for the whole of it.** The fallback is
// a working preview: with no branch-scoped variable the environment-wide `NEON_PGHOST` applies and
// the preview reads the shared `preview` branch, which is what every preview did before this
// existed. A hook that aborted `orca worktree create` over a database the lane may never need would
// be worse than one that leaves you on the shared branch and says so.
//
// `--print-host` is the exception and exits non-zero when it cannot answer, because its caller —
// `apply-migrations-ahead-of-merge.sh` — has to tell "no database of its own" from "this host".

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type { Result } from "./lib/doc-checks.ts";
import { Skip, explainFailure, skip, tally } from "./lib/doc-checks.ts";
import {
  PER_WORKTREE_VARIABLE,
  neonBranchName,
  pooledHostOf,
} from "./lib/worktree-database.ts";

const NEON_PROJECT = "steep-wave-52467839";
const PARENT_BRANCH = "preview";
const VERCEL_PROJECT = "canoncore";
const REPOSITORY = "jacobrees-canoncore/CanonCore";
const NEON_API = "https://console.neon.tech/api/v2";

/** Where the machine keeps the Neon key. docs/infrastructure.md -> The Neon API key. */
const KEY_FILE = join(homedir(), ".config", "canoncore", "neon-api-key");

const run = (file: string, args: string[], cwd?: string) =>
  execFileSync(file, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

/** Run something, or Skip with whatever it said. A tool out of reach is not a lane that is wrong. */
function orSkip(file: string, args: string[], why: string, cwd?: string): string {
  try {
    return run(file, args, cwd);
  } catch (err) {
    const e = err as { stderr?: string; stdout?: string; message?: string };
    skip(`${why}: ${explainFailure(e.stderr?.trim() || e.stdout?.trim() || e.message || "")}`);
  }
}

/**
 * The Neon key, from the environment or from the machine's own file.
 *
 * **It is never in this repository and never in a Vercel variable.** It can create and destroy
 * databases, so it lives on the machine that runs the hook and nowhere a deployment can reach —
 * docs/adr/0016-provisioning-plain-api-keys-neon-excepted.md.
 */
function neonKey(): string {
  const fromEnvironment = process.env.NEON_API_KEY?.trim();
  if (fromEnvironment) return fromEnvironment;
  let fromFile = "";
  try {
    fromFile = readFileSync(KEY_FILE, "utf8").trim();
  } catch {
    /* absent and unreadable are the same problem here, and get the same message */
  }
  if (fromFile) return fromFile;
  return skip(
    `no Neon API key. Set NEON_API_KEY, or put one in ${KEY_FILE} — ` +
      "docs/infrastructure.md -> The Neon API key says which key and how to reissue it",
  );
}

async function neon(path: string, init: RequestInit = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${NEON_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${neonKey()}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch (err) {
    if (err instanceof Skip) throw err;
    return skip(`Neon could not be reached: ${(err as Error).message}`);
  }
  const body = await response.text();
  if (!response.ok)
    skip(`Neon answered ${response.status} to ${init.method ?? "GET"} ${path}: ${body.slice(0, 200)}`);
  return body ? JSON.parse(body) : {};
}

type NeonBranchRow = { id: string; name: string };
type NeonEndpoint = { host: string; type: string };

async function branches(): Promise<NeonBranchRow[]> {
  const body = (await neon(`/projects/${NEON_PROJECT}/branches`)) as { branches?: NeonBranchRow[] };
  return body.branches ?? [];
}

/**
 * The pooled host of a branch's read-write compute.
 *
 * Read from the endpoints listing rather than from a connection URI on purpose: the URI carries a
 * password and nothing here needs one. The host alone is what a preview is pointed at, and it opens
 * nothing without `DATABASE_APP_PASSWORD` — which is why the variable is Non-sensitive.
 */
async function hostOf(branchId: string): Promise<string> {
  const body = (await neon(`/projects/${NEON_PROJECT}/branches/${branchId}/endpoints`)) as {
    endpoints?: NeonEndpoint[];
  };
  const endpoint = (body.endpoints ?? []).find((e) => e.type === "read_write");
  if (!endpoint) skip(`Neon branch ${branchId} has no read-write compute, so there is no host`);
  return pooledHostOf(endpoint!.host);
}

const worktree = process.env.ORCA_WORKTREE_PATH ?? process.cwd();

/** The branch this worktree is on, refusing the two cases that have no worktree database. */
function currentBranch(): string {
  const branch = orSkip("git", ["rev-parse", "--abbrev-ref", "HEAD"], "cannot read the branch", worktree);
  if (branch === "HEAD") skip("this worktree is on a detached HEAD, so there is nothing to name");
  if (branch === "main")
    skip("`main` is production and has no worktree database — docs/adr/0023-one-shared-schema-only-preview-branch.md");
  return branch;
}

/**
 * Put the branch on GitHub, at a commit `origin` already has.
 *
 * The base is `git merge-base HEAD origin/main`, never `HEAD`: at worktree creation the two are the
 * same commit, and later they are not — and pushing `HEAD` would publish unpushed work from a setup
 * hook, which is the one thing a setup hook must never do.
 */
function ensureRef(gitBranch: string): string {
  const onOrigin = orSkip(
    "git",
    ["ls-remote", "--heads", "origin", gitBranch],
    "cannot reach origin, so whether the branch is there is unknown",
    worktree,
  );
  if (onOrigin !== "") return `refs/heads/${gitBranch} was already on GitHub`;

  const base = orSkip("git", ["merge-base", "HEAD", "origin/main"], "no base commit", worktree);
  orSkip(
    "gh",
    ["api", `repos/${REPOSITORY}/git/refs`, "-f", `ref=refs/heads/${gitBranch}`, "-f", `sha=${base}`],
    `cannot create refs/heads/${gitBranch}`,
  );
  return `refs/heads/${gitBranch} created at ${base.slice(0, 7)}, which fires \`create\` not \`push\`, so no build started`;
}

async function ensureNeonBranch(gitBranch: string): Promise<{ host: string; detail: string }> {
  const wanted = neonBranchName(gitBranch);
  const all = await branches();

  const existing = all.find((b) => b.name === wanted);
  if (existing) return { host: await hostOf(existing.id), detail: `${wanted} was already there` };

  const parent = all.find((b) => b.name === PARENT_BRANCH);
  if (!parent)
    skip(
      `there is no \`${PARENT_BRANCH}\` branch to branch from — docs/infrastructure.md -> The shared preview branch`,
    );

  // No endpoint options are passed, deliberately: the branch inherits the project's
  // `default_endpoint_settings`, so the compute size is one decision in one place rather than a
  // number copied into this file. CAN-144 Bound or detect the Neon bill owns that setting.
  const created = (await neon(`/projects/${NEON_PROJECT}/branches`, {
    method: "POST",
    body: JSON.stringify({
      branch: { name: wanted, parent_id: parent!.id },
      endpoints: [{ type: "read_write" }],
    }),
  })) as { branch: NeonBranchRow };

  return { host: await hostOf(created.branch.id), detail: `${wanted} created under ${PARENT_BRANCH}` };
}

/**
 * Point one git branch's previews at one host.
 *
 * `--no-sensitive` matches the environment-wide row and is not cosmetic. `vercel env add` stores a
 * Preview value Sensitive by default; `parseVercelEnv` in `scripts/lib/doc-checks.ts` merges every
 * row of one name and takes Sensitive if any row is, and the roster check compares sensitivity — so
 * one Sensitive branch-scoped row would redden `check-docs` for every lane at once.
 */
function pointPreviewAt(gitBranch: string, host: string): string {
  orSkip(
    "vercel",
    // prettier-ignore
    ["env", "add", PER_WORKTREE_VARIABLE, "preview",
     "--git-branch", gitBranch, "--project", VERCEL_PROJECT,
     "--no-sensitive", "--force", "--value", host],
    "`vercel env add` refused, so the preview stays on the shared branch",
  );
  return `${PER_WORKTREE_VARIABLE} for ${gitBranch} → ${host}`;
}

// --- `--print-host`: resolve, print, and say nothing else. -------------------------------------

if (process.argv.includes("--print-host")) {
  try {
    const wanted = neonBranchName(currentBranch());
    const existing = (await branches()).find((b) => b.name === wanted);
    if (!existing) process.exit(1);
    process.stdout.write(await hostOf(existing.id));
  } catch {
    process.exit(1);
  }
} else {
  const results: Result[] = [];

  function step(name: string, fn: () => string | Promise<string>): Promise<void> {
    return Promise.resolve()
      .then(fn)
      .then((detail) => {
        results.push({ name, status: "PASS", detail });
      })
      .catch((err: Error) => {
        results.push({ name, status: err instanceof Skip ? "SKIP" : "FAIL", detail: err.message });
      });
  }

  // Resolved once and reused, so a Skip on the branch name stops the two steps that depend on it
  // rather than each of them rediscovering the same thing in its own words.
  let gitBranch = "";
  let host = "";

  await step("this worktree is on a branch with a database of its own", () => {
    gitBranch = currentBranch();
    return gitBranch;
  });
  if (gitBranch)
    await step("the branch exists on GitHub, so Vercel will accept a variable for it", () =>
      ensureRef(gitBranch),
    );
  if (results.every((r) => r.status === "PASS"))
    await step("the branch has a Neon database under `preview`", async () => {
      const made = await ensureNeonBranch(gitBranch);
      host = made.host;
      return made.detail;
    });
  if (results.every((r) => r.status === "PASS"))
    await step("this branch's previews are pointed at it", () => pointPreviewAt(gitBranch, host));

  const width = Math.max(...results.map((r) => r.name.length));
  console.log("");
  for (const r of results) console.log(`${r.status.padEnd(4)}  ${r.name.padEnd(width)}  ${r.detail}`);
  console.log(`\n${tally(results)}`);

  // **Exit 0 whatever happened**, which is the whole posture of this script. Anything short of all
  // four steps means the preview reads the shared `preview` branch — every preview's behaviour
  // before this existed — so the cost is that a migration applied here can collide with another
  // lane's, and the lane itself is fine.
  if (!results.every((r) => r.status === "PASS")) {
    console.log(
      "\nNo database of its own, and the lane is fine: the preview will read the shared `preview`\n" +
        "branch. What that costs, and how to fix it by re-running this, is\n" +
        "docs/adr/0025-a-preview-database-per-worktree.md -> When the hook does not run.",
    );
  }
  process.exit(0);
}
