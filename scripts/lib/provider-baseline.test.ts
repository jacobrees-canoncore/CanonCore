import { test } from "node:test";
import assert from "node:assert/strict";

import {
  baselineRuleset,
  parseCheckRuns,
  callerProblems,
  composeRequiredContext,
  parseDocumentedProviderContext,
  repositoryProblems,
  rootPackageProblems,
  rulesetProblems,
  unreportedContextProblem,
} from "./provider-baseline.ts";

// The pure half of the Provider baseline: what the two workflow files compose to, what a ruleset
// and a repository have to look like, and how a read-back disagrees. The wiring - `gh`, the
// writes, the report - is `scripts/provision-provider-repository.ts`, and the argument for every
// value asserted here is docs/infrastructure.md -> The Provider repository baseline.

/** The caller a Provider repository carries, as `docs/provider-baseline/ci.yml` writes it. */
const caller = [
  "name: CI",
  "on: push",
  "jobs:",
  "  baseline:",
  "    uses: jacobrees-canoncore/CanonCore/.github/workflows/provider-ci.yml@main",
].join("\n");

/** The called workflow, as `.github/workflows/provider-ci.yml` writes it. */
const called = [
  "name: Provider baseline",
  "on: workflow_call",
  "jobs:",
  "  gates:",
  "    name: test, typecheck, lint, build, audit",
  "    runs-on: ubuntu-latest",
  "    steps:",
  "      - run: pnpm run test",
].join("\n");

const CONTEXT = "baseline / test, typecheck, lint, build, audit";

test("the required context is the caller's job name, then the called job's", () => {
  // GitHub's documented format for a reusable workflow, and the string every Provider ruleset has
  // to require. A caller job with no `name:` reports its id, which is why the template leaves it
  // off: one string to keep in step rather than two.
  assert.equal(composeRequiredContext(caller, called), CONTEXT);
});

test("a second job on either side fails rather than composing the first one it finds", () => {
  // Two jobs mean two contexts, and a baseline that documents one string would then be silently
  // requiring half the gate. Which half is not a question a default should answer.
  const twoJobs = called + "\n  extra:\n    name: something else\n    steps:\n      - run: echo";
  assert.throws(() => composeRequiredContext(caller, twoJobs), /declares 2 jobs/);
  assert.throws(
    () => composeRequiredContext(caller + "\n  second:\n    uses: ./x.yml", called),
    /declares 2 jobs/,
  );
});

test("the baseline ruleset requires exactly the one context, and refuses a rewritten history", () => {
  const ruleset = baselineRuleset(CONTEXT);
  const checks = ruleset.rules.find((r) => r.type === "required_status_checks");
  assert.deepEqual(checks?.parameters?.required_status_checks, [{ context: CONTEXT }]);
  assert.deepEqual(
    ruleset.rules.map((r) => r.type).sort(),
    ["non_fast_forward", "required_linear_history", "required_status_checks"],
  );
  // `~DEFAULT_BRANCH` rather than the literal `main`, so renaming the branch cannot silently
  // unprotect it - the same reason this repository's own ruleset targets it.
  assert.deepEqual(ruleset.conditions.ref_name.include, ["~DEFAULT_BRANCH"]);
  assert.equal(ruleset.enforcement, "active");
});

test("a ruleset read back as the baseline provisioned it reports no problems", () => {
  assert.deepEqual(rulesetProblems(baselineRuleset(CONTEXT), CONTEXT), []);
});

test("a ruleset requiring a context no run reports is the failure this whole check exists for", () => {
  const live = baselineRuleset("baseline / gates");
  const problems = rulesetProblems(live, CONTEXT);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /baseline \/ gates/);
  assert.match(problems[0], /baseline \/ test, typecheck, lint, build, audit/);
});

test("a bypass actor is reported, because one makes the whole ruleset decorative", () => {
  const live = { ...baselineRuleset(CONTEXT), bypass_actors: [{ actor_id: 5, actor_type: "Team" }] };
  assert.match(rulesetProblems(live, CONTEXT).join("\n"), /bypass/);
});

test("a ruleset that is only evaluating is reported as not enforcing", () => {
  const live = { ...baselineRuleset(CONTEXT), enforcement: "evaluate" };
  assert.match(rulesetProblems(live, CONTEXT).join("\n"), /enforcement/);
});

test("a missing rule is named, not counted", () => {
  const live = {
    ...baselineRuleset(CONTEXT),
    rules: baselineRuleset(CONTEXT).rules.filter((r) => r.type !== "non_fast_forward"),
  };
  assert.match(rulesetProblems(live, CONTEXT).join("\n"), /non_fast_forward/);
});

test("no ruleset at all is one problem rather than a crash", () => {
  assert.match(rulesetProblems(undefined, CONTEXT).join("\n"), /no ruleset/);
});

/** A repository as `gh api repos/{owner}/{repo}` answers for one the baseline has been applied to. */
const provisioned = {
  private: false,
  allow_squash_merge: true,
  allow_merge_commit: false,
  allow_rebase_merge: false,
  delete_branch_on_merge: true,
  security_and_analysis: {
    secret_scanning: { status: "enabled" },
    secret_scanning_push_protection: { status: "enabled" },
  },
};

test("a repository read back as the baseline provisioned it reports no problems", () => {
  assert.deepEqual(repositoryProblems(provisioned), []);
});

test("a private Provider repository is reported, since the access model rests on public", () => {
  // ADR-0014 -> Decision 3 requires every Provider repository public, and the caller reaches this
  // reusable workflow *because* the called repository is public. A private one needs an explicit
  // access policy naming its callers, and the failure reads like a typo in the `uses:` line.
  assert.match(repositoryProblems({ ...provisioned, private: true }).join("\n"), /public/);
});

test("a merge method the baseline turns off is reported when it is back on", () => {
  const problems = repositoryProblems({ ...provisioned, allow_merge_commit: true });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /allow_merge_commit/);
});

test("secret scanning off is reported, and so is push protection", () => {
  const live = {
    ...provisioned,
    security_and_analysis: {
      secret_scanning: { status: "disabled" },
      secret_scanning_push_protection: { status: "disabled" },
    },
  };
  const problems = repositoryProblems(live).join("\n");
  assert.match(problems, /secret_scanning\b/);
  assert.match(problems, /secret_scanning_push_protection/);
});

test("a repository answering without the security block is reported, not read as all-off", () => {
  // The same rule the security roster follows: a value the run cannot read fails rather than
  // skipping, because the source answered. Reporting it as "off" would invent a reading.
  const rest: Record<string, unknown> = { ...provisioned };
  delete rest.security_and_analysis;
  assert.match(repositoryProblems(rest).join("\n"), /security_and_analysis/);
});

/** A root package.json the gate can run against: the four scripts, and a pnpm to run them with. */
const rootPackage = {
  packageManager: "pnpm@11.20.0",
  scripts: { test: "x", typecheck: "y", lint: "z", build: "w" },
};

test("a root package.json the gate can run against reports no problems", () => {
  assert.deepEqual(rootPackageProblems(JSON.stringify(rootPackage)), []);
});

test("the scripts the gate runs are named when they are missing, not counted", () => {
  const problems = rootPackageProblems(
    JSON.stringify({ ...rootPackage, scripts: { test: "x", lint: "z" } }),
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0], /no typecheck, build script/);
});

test("a repository with no package manager declared is reported, since the gate resolves pnpm from it", () => {
  // `pnpm/action-setup` takes no `version:` in the baseline, so without one of these two fields the
  // gate fails before it reaches a script — red on arrival, which is a gate that gets ignored.
  const withoutIt: Record<string, unknown> = { ...rootPackage };
  delete withoutIt.packageManager;
  assert.match(rootPackageProblems(JSON.stringify(withoutIt)).join("\n"), /packageManager/);
  assert.deepEqual(
    rootPackageProblems(JSON.stringify({ ...withoutIt, devEngines: { packageManager: "pnpm" } })),
    [],
  );
});

test("a package.json that is not JSON fails with something an operator can act on", () => {
  assert.throws(() => rootPackageProblems("not json at all"), /package\.json/);
});

test("a context nothing has reported is told apart from a repository that has run nothing", () => {
  // Nothing scanned is not nothing found. An empty list of check runs means no run has reported
  // yet, which is a different instruction to the operator than a run reporting other names.
  assert.equal(unreportedContextProblem([CONTEXT, "Vercel"], CONTEXT), undefined);
  assert.match(unreportedContextProblem([], CONTEXT) ?? "", /no check run/);
  assert.match(unreportedContextProblem(["baseline / gates"], CONTEXT) ?? "", /baseline \/ gates/);
});

test("the documented context is read from the one home that names it", () => {
  const doc = ["## The Provider repository baseline", "", "**The required context is `x / y`**, composed", "rather than chosen."].join("\n");
  assert.equal(parseDocumentedProviderContext(doc), "x / y");
  assert.throws(() => parseDocumentedProviderContext("## Something else\n"), /required context/);
});

test("a caller that copied the gates instead of calling them is reported", () => {
  // The whole point of the baseline is that a Provider repository *calls* it: "a shared, versioned
  // workflow the next repository inherits by pointing at it, or the drift starts at repository
  // two". A repository whose gate is its own copy passes every other check here.
  const copied = ["name: CI", "on: push", "jobs:", "  baseline:", "    steps:", "      - run: pnpm run test"].join("\n");
  assert.match(callerProblems(copied, caller, called).join("\n"), /no job in it calls/);
  assert.match(callerProblems(copied, caller, called).join("\n"), /provider-ci\.yml@main/);
});

test("a caller whose job was renamed is reported, since its context is no longer the documented one", () => {
  const renamed = caller.replace("  baseline:", "  gates:");
  assert.match(callerProblems(renamed, caller, called).join("\n"), /gates \/ test, typecheck/);
});

test("the caller the template describes reports nothing against itself", () => {
  assert.deepEqual(callerProblems(caller, caller, called), []);
});

test("a Provider's own jobs beside the calling one are its business, not a problem", () => {
  // The baseline is the floor, not the ceiling. Requiring a caller with exactly one job in it
  // would refuse a Provider that had added a deploy job, and the only remedy would be deleting it.
  const withExtra = caller + [
    "",
    "  its-own-thing:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - run: echo something this Provider needs",
  ].join("\n");
  assert.deepEqual(callerProblems(withExtra, caller, called), []);
});

test("a caller indented differently is still recognised, because the layout is the Provider's", () => {
  // Any consistent indentation is valid YAML. A hand-rolled walk keyed to four spaces would report
  // this as a repository that had copied the gates rather than called them.
  const reindented = [
    "name: CI",
    "on: push",
    "jobs:",
    "    baseline:",
    "        uses: jacobrees-canoncore/CanonCore/.github/workflows/provider-ci.yml@main",
  ].join("\n");
  assert.deepEqual(callerProblems(reindented, caller, called), []);
});

test("two jobs both calling the baseline are reported, since that is two contexts", () => {
  const twice = caller + "\n  again:\n    uses: jacobrees-canoncore/CanonCore/.github/workflows/provider-ci.yml@main";
  assert.match(callerProblems(twice, caller, called).join("\n"), /2 of its jobs call/);
});

test("a caller that is not valid YAML fails with what the parser said", () => {
  assert.throws(() => callerProblems("jobs:\n  a: [unclosed", caller, called), /not valid YAML/);
});

test("a check-runs listing is read as one name and conclusion per run", () => {
  // The regression this replaced a `--jq` projection to prevent: TypeScript ate the backslashes in
  // `"\(.name)\t\(.conclusion)"`, so jq received a constant string, every repository reported one
  // run called `(.name)`, and provisioning could never reach a write. It failed in the direction
  // that reads as working, which is why the parse is here and under test.
  const body = JSON.stringify({
    check_runs: [
      { name: "baseline / gates", conclusion: "success" },
      { name: "queued one", conclusion: null },
      { conclusion: "success" },
    ],
  });
  assert.deepEqual(parseCheckRuns(body), [
    { name: "baseline / gates", conclusion: "success" },
    // A run still going has no conclusion, and that is not the same as a name nobody can read: the
    // third row is dropped, because `undefined` is not a context to tell an operator to require.
    { name: "queued one", conclusion: undefined },
  ]);
});

test("a check-runs listing whose shape has moved fails rather than reading as an empty branch", () => {
  // An empty read must not look like a repository that has never run its gate: one says provision
  // later, the other says this script can no longer see what reported.
  assert.throws(() => parseCheckRuns("{}"), /no `check_runs` array/);
  assert.throws(() => parseCheckRuns("not json"), /not JSON/);
  assert.deepEqual(parseCheckRuns(JSON.stringify({ check_runs: [] })), []);
});
