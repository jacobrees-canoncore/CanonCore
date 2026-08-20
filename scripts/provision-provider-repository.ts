#!/usr/bin/env node
// Gives one Provider repository the half of the baseline that is not a workflow file.
//
// The baseline splits in two and this is the second half. A `uses:` line cannot enable secret
// scanning, cannot enable push protection and cannot create a ruleset: those are repository
// settings, and six or more repositories setting them by hand is where the drift starts. What each
// value is and why: docs/infrastructure.md -> The Provider repository baseline.
//
//   node scripts/provision-provider-repository.ts provider-tmdb
//
// It reads before it writes, and refuses rather than provisioning something half-true. The
// preflight is the guard that matters: a ruleset requiring a context nothing emits blocks every
// merge for ever (CAN-40 Give main a ruleset that refuses an unchecked merge), so this requires a
// run to have *reported* the composed context before it requires it of anything. That is also what
// bounds the damage of a mistyped repository name — a repository whose default branch does not
// call this project's reusable workflow is refused before a single setting is touched.
//
// One thing is deliberately not here. The **dependency graph** has no REST route this found, so it
// stays a dashboard step and is reported as a SKIP rather than as done: with the graph off,
// Dependabot alerts report nothing while still reading as enabled
// (docs/incidents.md -> Dependabot alerts were enabled and blind).
//
// The report's shape and its "a skip is not a pass" tally are `scripts/check-docs.ts`'s, reused
// rather than re-invented, because the two are read by the same person for the same reason.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import type { Attempt, Result } from "./lib/doc-checks.ts";
import {
  Skip,
  explainFailure,
  fail,
  readDependencyGraph,
  readVulnerabilityAlerts,
  skip,
  tally,
} from "./lib/doc-checks.ts";
import {
  baselineRuleset,
  callerProblems,
  composeRequiredContext,
  parseCheckRuns,
  repositoryProblems,
  rootPackageProblems,
  rulesetProblems,
  unreportedContextProblem,
} from "./lib/provider-baseline.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OWNER = "jacobrees-canoncore";
const CALLER_PATH = ".github/workflows/ci.yml";
const TEMPLATE = "docs/provider-baseline/ci.yml";
const REUSABLE = ".github/workflows/provider-ci.yml";

const named = process.argv[2];
if (!named || named.startsWith("-")) {
  console.error(
    "usage: node scripts/provision-provider-repository.ts <repository>\n\n" +
      "  <repository>  a Provider repository, `provider-tmdb` or `owner/provider-tmdb`.\n" +
      "                It must already carry the caller workflow and have run it once —\n" +
      "                docs/infrastructure.md -> The Provider repository baseline.",
  );
  process.exit(2);
}
const repository = named.includes("/") ? named : `${OWNER}/${named}`;

const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const context = composeRequiredContext(read(TEMPLATE), read(REUSABLE));

const results: Result[] = [];

function step(name: string, fn: () => string | void) {
  try {
    results.push({ name, status: "PASS", detail: fn() ?? "" });
  } catch (err) {
    results.push({
      name,
      status: err instanceof Skip ? "SKIP" : "FAIL",
      detail: (err as Error).message,
    });
  }
  return results[results.length - 1].status;
}

function attempt(args: string[], body?: unknown): Attempt {
  try {
    return {
      ok: true,
      output: execFileSync("gh", body === undefined ? args : [...args, "--input", "-"], {
        encoding: "utf8",
        input: body === undefined ? undefined : JSON.stringify(body),
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 60_000,
      }),
    };
  } catch (err) {
    const e = err as { stderr?: string; stdout?: string; message?: string };
    return { ok: false, output: e.stderr?.trim() || e.stdout?.trim() || e.message || "" };
  }
}

/** Run `gh`, or Skip with whatever it said. A source out of reach is not a setting that is wrong. */
function gh(args: string[], why: string, body?: unknown): string {
  const ran = attempt(args, body);
  return ran.ok ? ran.output : skip(`${why}: ${explainFailure(ran.output)}`);
}

const json = <T,>(args: string[], why: string, body?: unknown): T => {
  const raw = gh(args, why, body).trim();
  if (!raw) fail(`${why}: \`gh ${args.join(" ")}\` answered with nothing`);
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    return fail(`${why}: could not read \`gh\`'s answer as JSON — ${(err as Error).message}`);
  }
};

/** The one ruleset the baseline owns, or `undefined` where the repository carries none by that name. */
const rulesetNamedMain = (why: string) =>
  json<{ id: number; name: string }[]>(["api", `repos/${repository}/rulesets`], why).find(
    (r) => r.name === "main",
  );

const contents = (path: string, ref: string) =>
  gh(
    ["api", "-H", "Accept: application/vnd.github.raw", `repos/${repository}/contents/${path}?ref=${ref}`],
    `cannot read \`${path}\` from \`${ref}\``,
  );

// ---------------------------------------------------------------------------
// The preflight. Nothing below writes; every one of these refuses instead.
// ---------------------------------------------------------------------------

type Repo = { default_branch: string; private: boolean };

let branch = "";

const found = step("the repository exists and its default branch is named", () => {
  const repo = json<Repo>(["api", `repos/${repository}`, "--jq", "{default_branch,private}"], `cannot read ${repository}`);
  branch = repo.default_branch;
  return `${repository}, default branch \`${branch}\``;
});

if (found !== "PASS") report();

step("its gate calls the baseline rather than carrying a copy of it", () => {
  const problems = callerProblems(contents(CALLER_PATH, branch), read(TEMPLATE), read(REUSABLE));
  if (problems.length)
    fail(`\`${CALLER_PATH}\` on \`${branch}\` is not the baseline caller:\n    - ${problems.join("\n    - ")}`);
  return `\`${CALLER_PATH}\` calls ${REUSABLE}`;
});

step("its root package.json can run the gate at all", () => {
  const problems = rootPackageProblems(contents("package.json", branch));
  if (problems.length)
    fail(
      `the root package.json cannot run the gate:\n    - ${problems.join("\n    - ")}\n    ` +
        "Provisioning now would require a context that is red on arrival, and a gate that is red " +
        "on arrival is a gate that gets ignored.",
    );
  return "the four scripts, and a pnpm version to run them with";
});

// **CAN-40 Give main a ruleset that refuses an unchecked merge**'s lesson, in code: require
// nothing of a repository that has not been seen reporting it.
//
// It reports the run's conclusion and never fails on it. A red default branch is a reason to
// provision rather than a reason not to — the ruleset is what stops the next unchecked merge, and
// refusing to protect a branch because it is currently broken is backwards. Saying which it was is
// still the operator's business, because "provisioned" and "green" are two facts and a report that
// carried only the first would read like both.
step("the composed context has been seen reporting on the default branch", () => {
  // No `--jq`: the whole body, parsed in the module that is under test. Why that is a correctness
  // decision rather than a preference is written where the parsing is.
  const runs = parseCheckRuns(
    gh(
      ["api", `repos/${repository}/commits/${branch}/check-runs`],
      "cannot read the default branch's check runs",
    ),
  );
  const unreported = unreportedContextProblem(
    runs.map((r) => r.name),
    context,
  );
  if (unreported) fail(unreported);
  const conclusion = runs.find((r) => r.name === context)?.conclusion;
  return `\`${context}\`, whose last run concluded ${conclusion || "nothing yet"}`;
});

if (results.some((r) => r.status !== "PASS")) report();

// ---------------------------------------------------------------------------
// The writes. Each is followed by a read-back below rather than trusted.
// ---------------------------------------------------------------------------

step("squash-only merges, secret scanning and push protection are set", () => {
  gh(["api", `repos/${repository}`, "--method", "PATCH"], "cannot patch the repository", {
    allow_squash_merge: true,
    allow_merge_commit: false,
    allow_rebase_merge: false,
    delete_branch_on_merge: true,
    security_and_analysis: {
      secret_scanning: { status: "enabled" },
      secret_scanning_push_protection: { status: "enabled" },
    },
  });
  return "requested";
});

step("Dependabot alerts are on", () => {
  gh(["api", `repos/${repository}/vulnerability-alerts`, "--method", "PUT"], "cannot enable Dependabot alerts");
  return "requested";
});

step("the ruleset requires the composed context, and refuses a rewritten history", () => {
  const existing = rulesetNamedMain("cannot list the rulesets");
  const payload = baselineRuleset(context);
  const written = existing
    ? gh(["api", `repos/${repository}/rulesets/${existing.id}`, "--method", "PUT"], "cannot update the ruleset", payload)
    : gh(["api", `repos/${repository}/rulesets`, "--method", "POST"], "cannot create the ruleset", payload);
  const id = (JSON.parse(written) as { id: number }).id;
  return `${existing ? "updated" : "created"} ruleset ${id}`;
});

// ---------------------------------------------------------------------------
// The read-back. What was asked for is not what is true until it is read.
// ---------------------------------------------------------------------------

step("the repository reads back as the baseline", () => {
  const problems = repositoryProblems(
    json<unknown>(["api", `repos/${repository}`], "cannot re-read the repository"),
  );
  if (problems.length) fail(`${repository} is not the baseline:\n    - ${problems.join("\n    - ")}`);
  return "public, squash-only, secret scanning and push protection on";
});

step("the ruleset reads back as the baseline", () => {
  // Listed then fetched by id, because the list omits the rules. `gh api
  // repos/jacobrees-canoncore/CanonCore/rulesets --jq '.[0] | keys'` on 20 August 2026 returned
  // `_links, created_at, enforcement, id, name, node_id, source, source_type, target, updated_at`
  // — no `rules` and no `bypass_actors`, which are the two this read-back exists for.
  const listed = rulesetNamedMain("cannot re-list the rulesets");
  const problems = rulesetProblems(
    listed && json<unknown>(["api", `repos/${repository}/rulesets/${listed.id}`], "cannot re-read the ruleset"),
    context,
  );
  if (problems.length) fail(`the ruleset is not the baseline:\n    - ${problems.join("\n    - ")}`);
  return `requires \`${context}\`, nobody bypasses it`;
});

step("Dependabot alerts read back as on", () => {
  if (!readVulnerabilityAlerts(attempt(["api", `repos/${repository}/vulnerability-alerts`])))
    fail("`vulnerability-alerts` answered 404, so the alerts did not stay on");
  return "204 No Content";
});

// Last, and a SKIP rather than a FAIL when it is off: nothing here can turn it on, and a step that
// reports a human's outstanding work as a failure of provisioning is a step that gets ignored.
step("the dependency graph is on, which is what makes the alerts above see anything", () => {
  const graph = readDependencyGraph(
    attempt(["api", `repos/${repository}/dependency-graph/sbom`, "--jq", ".sbom.packages | length"]),
  );
  if (!graph.enabled)
    skip(
      "the dependency graph is off, so Dependabot alerts will report nothing while still reading " +
        "as enabled. No REST route to it was found — turn it on at Settings → Advanced Security → " +
        "Dependency graph, then re-run this.",
    );
  return `${graph.packages} packages in the graph`;
});

report();

/**
 * The report, and the exit code.
 *
 * **A SKIP is a non-zero exit here, where `check-docs.ts` treats one as passing.** The two differ
 * because what they are for differs: a document check that failed on an unreachable API would block
 * every merge on somebody else's outage, while a provisioning run that did not provision must never
 * report success — the operator would go and create the next repository. So the only exit code
 * meaning "this repository now carries the baseline" is the one where every step passed, and the
 * dependency graph's dashboard step keeps it non-zero until somebody has done it.
 */
function report(): never {
  const width = Math.max(...results.map((r) => r.name.length));
  for (const r of results) console.log(`${r.status.padEnd(4)}  ${r.name.padEnd(width)}  ${r.detail}`);
  console.log(`\n${tally(results)}`);
  process.exit(results.every((r) => r.status === "PASS") ? 0 : 1);
}
