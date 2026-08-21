// One preview database per Orca worktree, in the half that is a function of names and lists
// rather than of an API.
//
// Everything here is pure: names in, names out, no filesystem and no subprocesses. That is the
// same seam `doc-checks.ts` and `provider-baseline.ts` draw, and it exists because the interesting
// half of this design is a *deletion*: `sweepPlan` decides which databases to destroy, and a
// decision that can only be exercised by destroying something is a decision nothing reviews.
//
// Two consumers: `provision-worktree-database.ts` creates a branch and points a preview at it,
// `sweep-worktree-databases.ts` takes them away again.
//
// **The design and every value below is docs/adr/0025-a-preview-database-per-worktree.md**, with
// the provisioning state in docs/infrastructure.md -> A preview database per worktree. This file
// states what it does and points there rather than restating the argument.

/**
 * The prefix that separates a worktree's database from everything else in the project.
 *
 * It is load-bearing rather than tidy. `main` and `preview` live in the same Neon project as every
 * worktree database, and the only thing standing between the sweeper and production is that
 * neither of them can be named by `gitBranchOf`. A prefix is checkable; "the ones I made" is not.
 */
const PREFIX = "wt/";

/** The one variable that is per-worktree. `NEON_PGDATABASE` is `neondb` on every branch. */
export const PER_WORKTREE_VARIABLE = "NEON_PGHOST";

/** The Neon branch holding one git branch's preview database. */
export function neonBranchName(gitBranch: string): string {
  if (!gitBranch) throw new Error("a worktree database needs a git branch name, and it was empty.");
  if (gitBranch === "main")
    throw new Error(
      "`main` has no worktree database: it is production, reached through DATABASE_URL. " +
        "docs/adr/0023-one-shared-schema-only-preview-branch.md.",
    );
  if (gitBranch.startsWith(PREFIX))
    throw new Error(
      `\`${gitBranch}\` starts with the reserved \`${PREFIX}\` prefix, which would name the same ` +
        `Neon branch as the worktree database of \`${gitBranch.slice(PREFIX.length)}\`.`,
    );
  return PREFIX + gitBranch;
}

/**
 * The git branch a Neon branch holds the database for, or `undefined` if it holds nobody's.
 *
 * **`undefined` is what keeps `main` and `preview` out of every candidate list**, rather than a
 * name check repeated at each call site — and it is why this is a total function returning a
 * maybe instead of a partial one that throws.
 */
export function gitBranchOf(neonBranch: string): string | undefined {
  if (!neonBranch.startsWith(PREFIX)) return undefined;
  const gitBranch = neonBranch.slice(PREFIX.length);
  return gitBranch === "" ? undefined : gitBranch;
}

/**
 * The pooled spelling of a Neon host, which is the spelling the preview variables carry.
 *
 * One Neon compute answers to two names and the difference is one infix: the endpoints API returns
 * `ep-x.c-2.…` while a connection URI returns `ep-x-pooler.c-2.…`. `NEON_PGHOST` was read back on
 * 21 August 2026 as the pooled name, so a worktree's own row is spelled the same way — two rows
 * under one name that differed in shape would read as a mistake to everybody who saw them.
 *
 * This is `computeOf` in `apps/web/src/db/database-url.ts` run backwards, and that module is where
 * the rule is argued.
 */
export function pooledHostOf(host: string): string {
  const [compute, ...rest] = host.split(".");
  if (!compute || rest.length === 0 || !/^ep-[A-Za-z0-9-]+$/.test(compute))
    throw new Error(
      `\`${host}\` is not a Neon host. It should look like ep-….eu-west-2.aws.neon.tech — a whole ` +
        "connection string here would reach NEON_PGHOST and be used as a hostname at request time.",
    );
  return compute.endsWith("-pooler") ? host : [`${compute}-pooler`, ...rest].join(".");
}

export type NeonBranch = {
  readonly id: string;
  readonly name: string;
  readonly protected?: boolean;
  readonly default?: boolean;
};

export type SweepInput = {
  /** Every branch in the Neon project, ours and not. */
  readonly neonBranches: readonly NeonBranch[];
  /** Branch names on `origin`, from `git ls-remote --heads origin`. */
  readonly remoteBranches: readonly string[];
  /** Those of them carrying no commit `main` does not already have. */
  readonly emptyRemoteBranches: readonly string[];
  /** Branches with an Orca worktree open on them, or `undefined` if `orca` could not be asked. */
  readonly openWorktreeBranches: readonly string[] | undefined;
};

/** Not exported: a caller reads `neonBranch` and `reason` off a plan and never names the type. */
type SweepEntry = { readonly neonBranch: NeonBranch; readonly reason: string };

export type SweepPlan = {
  /** Safe to delete, with why. */
  readonly sweep: readonly SweepEntry[];
  /** Left alone, with why — printed, because a survivor nobody can explain is the next incident. */
  readonly keep: readonly SweepEntry[];
  /** Reasons the whole sweep was declined. Non-empty means nothing was planned at all. */
  readonly refusals: readonly string[];
};

/**
 * Which worktree databases are safe to delete, and why every survivor survived.
 *
 * **Two classes are swept and they are established differently.** A branch gone from `origin` is
 * finished: `/review-pr` squash-merges and the branch is deleted, so its database has no reader
 * left. A branch still on `origin` but carrying no commit `main` lacks is an *abandoned lane* — the
 * setup hook creates the git branch at the base commit before any work exists, so a lane opened and
 * never worked leaves exactly that, and it is indistinguishable from a live lane that has not
 * committed yet except by whether a worktree is open on it.
 *
 * **Two absences are refused rather than read as emptiness**, and both would otherwise delete
 * databases somebody is using:
 *
 * - **No remote branches at all.** `git ls-remote` failing, or running with no network, returns
 *   nothing, and "no branch is on origin" is the same value as "origin could not be read". Read as
 *   the first it sweeps every database in the project. Refused outright.
 * - **No worktree list.** `orca` is a desktop CLI that is absent on a runner, and `undefined` is
 *   not an empty list. The abandoned-lane class needs it and is kept without it; the gone-from-
 *   origin class does not, so a degraded run still does the useful half rather than nothing.
 */
export function sweepPlan(input: SweepInput): SweepPlan {
  const sweep: SweepEntry[] = [];
  const keep: SweepEntry[] = [];
  const refusals: string[] = [];

  if (input.remoteBranches.length === 0)
    refusals.push(
      "`git ls-remote --heads origin` listed no branches, which is what it also returns when it " +
        "could not be read. Every worktree database would look orphaned. Nothing was planned.",
    );
  if (refusals.length) return { sweep, keep, refusals };

  const onOrigin = new Set(input.remoteBranches);
  const empty = new Set(input.emptyRemoteBranches);
  const openWorktrees = input.openWorktreeBranches && new Set(input.openWorktreeBranches);

  for (const neonBranch of input.neonBranches) {
    const gitBranch = gitBranchOf(neonBranch.name);
    if (gitBranch === undefined) {
      keep.push({ neonBranch, reason: "not a worktree database" });
      continue;
    }
    // Nothing creates a `wt/` branch protected or default, so reaching this means somebody named
    // something load-bearing by hand. A sweeper is not the right thing to discover that with.
    if (neonBranch.protected || neonBranch.default) {
      keep.push({ neonBranch, reason: "the Neon branch is protected or default" });
      continue;
    }
    if (!onOrigin.has(gitBranch)) {
      sweep.push({ neonBranch, reason: `\`${gitBranch}\` is gone from origin` });
      continue;
    }
    if (!empty.has(gitBranch)) {
      keep.push({ neonBranch, reason: `\`${gitBranch}\` is live on origin` });
      continue;
    }
    if (openWorktrees === undefined) {
      keep.push({
        neonBranch,
        reason:
          `\`${gitBranch}\` carries nothing main lacks, but the open worktrees could not be read, ` +
          "so an abandoned lane cannot be told from one that has not committed yet",
      });
      continue;
    }
    if (openWorktrees.has(gitBranch)) {
      keep.push({ neonBranch, reason: `a worktree is open on \`${gitBranch}\`` });
      continue;
    }
    sweep.push({
      neonBranch,
      reason: `\`${gitBranch}\` carries nothing main does not already have and no worktree is open`,
    });
  }

  return { sweep, keep, refusals };
}

export type EnvironmentVariable = {
  readonly id: string;
  readonly key: string;
  readonly target: readonly string[];
  readonly gitBranch?: string | null;
};

/**
 * The branch-scoped `NEON_PGHOST` rows belonging to git branches that no longer exist.
 *
 * **The row with no `gitBranch` is excluded by shape rather than by name, and that is the whole
 * point of this function.** That row is the environment-wide Preview `NEON_PGHOST` every preview
 * without an override reads — the fallback the entire design rests on — and deleting it takes
 * every preview in the project down at once. Selecting rows by "not in the live set" would return
 * it the moment a dead-branch list contained an empty string, so the shape test comes first and no
 * string arriving in `deadGitBranches` can reach it.
 */
export function deadVariables(
  rows: readonly EnvironmentVariable[],
  deadGitBranches: readonly string[],
): readonly EnvironmentVariable[] {
  const dead = new Set(deadGitBranches);
  return rows.filter(
    (row) =>
      typeof row.gitBranch === "string" &&
      row.gitBranch !== "" &&
      row.key === PER_WORKTREE_VARIABLE &&
      row.target.length === 1 &&
      row.target[0] === "preview" &&
      dead.has(row.gitBranch),
  );
}
