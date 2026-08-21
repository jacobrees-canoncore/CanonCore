// The Provider repository baseline, in the half that is a function of text rather than of an API.
//
// Everything here is pure: yaml and JSON in, data and problem lines out, no filesystem and no
// subprocesses. That is the same seam `doc-checks.ts` draws — `provision-provider-repository.ts`
// owns reading files and running `gh`; this module owns what the baseline *is* and how a read-back
// disagrees with it, and `provider-baseline.test.ts` is where that is exercised.
//
// Two consumers rather than one, which is the reason it is a module at all: the provisioning
// script writes the ruleset, and `check-docs.ts` compares the same composed context to the one
// documented string. A second copy of the composition is the drift the composition exists to stop.
//
// **Every value and every argument below is docs/infrastructure.md -> The Provider repository
// baseline.** This file states what it does and points there; it does not restate the reasoning,
// which is the arrangement `.github/workflows/ci.yml` already has with
// docs/agents/workflow.md -> The gates.

import type { WorkflowJob } from "./doc-checks.ts";
import { asRecord, fail, parseWorkflowJobs } from "./doc-checks.ts";

type Rule = {
  type: string;
  parameters?: { required_status_checks?: { context: string }[] } & Record<string, unknown>;
};

export type Ruleset = {
  name: string;
  target: string;
  enforcement: string;
  conditions: { ref_name: { include: string[]; exclude: string[] } };
  rules: Rule[];
  bypass_actors: unknown[];
};

/** The scripts the called workflow runs, in the order it runs them. */
const BASELINE_SCRIPTS = ["test", "typecheck", "lint", "build"];

const REQUIRED_RULES = ["required_linear_history", "non_fast_forward", "required_status_checks"];

const str = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

/** The one job a file this repository owns is allowed to declare. */
function soleJob(source: string, what: string): WorkflowJob {
  const jobs = parseWorkflowJobs(source, what);
  if (jobs.length !== 1)
    fail(
      `the ${what} declares ${jobs.length} jobs (${jobs.map((j) => j.display).join(", ")}). The ` +
        `baseline composes one context, so a second job here is a second context that no Provider ` +
        `ruleset requires — and which of them the gate is would be decided by whichever came first.`,
    );
  return jobs[0];
}

/** The one place the two halves are joined. Everything that needs the string goes through it. */
const composed = (callerJob: string, calledJob: string) => `${callerJob} / ${calledJob}`;

/**
 * The required status check context a Provider repository's ruleset has to name: the caller's job
 * name, then the called workflow's.
 *
 * Composed rather than written down, because the string has to move when either file moves.
 * GitHub's documented format, the live call it was read off, and why neither job carries a `name:`
 * are all in the register.
 */
export const composeRequiredContext = (caller: string, called: string): string =>
  composed(soleJob(caller, "caller").display, soleJob(called, "called workflow").display);

/**
 * The ruleset every Provider repository gets: this repository's own, provisioned by
 * **CAN-40 Give main a ruleset that refuses an unchecked merge** and read back on 20 August 2026,
 * with one context instead of two. Which context is left out, and why leaving it out is the safer
 * failure, is in the register.
 */
export const baselineRuleset = (context: string): Ruleset => ({
  name: "main",
  target: "branch",
  enforcement: "active",
  conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
  rules: [
    { type: "required_linear_history" },
    { type: "non_fast_forward" },
    {
      type: "required_status_checks",
      parameters: {
        strict_required_status_checks_policy: false,
        do_not_enforce_on_create: false,
        required_status_checks: [{ context }],
      },
    },
  ],
  bypass_actors: [],
});

/** How a ruleset read back from GitHub differs from the baseline, in lines an operator can act on. */
export function rulesetProblems(ruleset: unknown, context: string): string[] {
  const live = asRecord(ruleset);
  if (!live)
    return [
      "no ruleset named `main` came back, so nothing refuses an unchecked merge on the default " +
        "branch. A waiting skill is a convention; only the ruleset is an enforcement.",
    ];

  const problems: string[] = [];
  if (live.enforcement !== "active")
    problems.push(`enforcement is \`${String(live.enforcement)}\`, not \`active\``);
  if (live.target !== "branch")
    problems.push(`the target is \`${String(live.target)}\`, not \`branch\``);

  const include = asRecord(asRecord(live.conditions)?.ref_name)?.include;
  if (!Array.isArray(include) || include.length !== 1 || include[0] !== "~DEFAULT_BRANCH")
    problems.push(
      `it targets ${JSON.stringify(include)} rather than ["~DEFAULT_BRANCH"], so renaming the ` +
        "default branch would unprotect it",
    );

  // Empty is the documented answer rather than an unread one: a bypass actor would make the whole
  // ruleset decorative, because it would only ever stop somebody who was not trying.
  const bypass = live.bypass_actors;
  if (Array.isArray(bypass) && bypass.length > 0)
    problems.push(`${bypass.length} bypass actor(s) can merge past it: ${JSON.stringify(bypass)}`);

  const rules = Array.isArray(live.rules) ? (live.rules as Rule[]) : [];
  const missing = REQUIRED_RULES.filter((type) => !rules.some((r) => r?.type === type));
  if (missing.length) problems.push(`it carries no ${missing.join(", ")} rule`);

  const checks = rules.find((r) => r?.type === "required_status_checks");
  if (checks) {
    const required = (checks.parameters?.required_status_checks ?? []).map((c) => c?.context);
    if (required.length !== 1 || required[0] !== context)
      problems.push(
        `it requires ${JSON.stringify(required)} where the baseline composes ` +
          `${JSON.stringify([context])}. A context nothing reports blocks every merge for ever, ` +
          "and a renamed one is the same failure arriving quietly.",
      );
  }
  return problems;
}

/**
 * How a repository read back from GitHub differs from the baseline.
 *
 * An absent security block is reported as unread rather than as all-off: the source answered, so
 * calling it off would invent a reading. Why it can be absent — the call needs admin on the
 * repository — is docs/infrastructure.md -> Dependency and secret scanning, which cites it.
 */
export function repositoryProblems(repository: unknown): string[] {
  const repo = asRecord(repository);
  if (!repo) return ["the repository call came back with nothing to read"];

  const problems: string[] = [];
  if (repo.private !== false)
    problems.push(
      "the repository is not public. ADR-0014 -> Decision 3 requires every Provider repository " +
        "public in all three classes, and a private one cannot be called by the baseline without " +
        "an access policy naming its callers — a failure that reads like a typo in the `uses:` line.",
    );

  const expected: [string, boolean][] = [
    ["allow_squash_merge", true],
    ["allow_merge_commit", false],
    ["allow_rebase_merge", false],
    ["delete_branch_on_merge", true],
  ];
  for (const [field, want] of expected)
    if (repo[field] !== want) problems.push(`\`${field}\` is ${String(repo[field])}, not ${want}`);

  const analysis = asRecord(repo.security_and_analysis);
  if (!analysis) {
    problems.push(
      "the repository answered with no `security_and_analysis` block, so secret scanning was not " +
        "read rather than read as off — the call needs admin on the repository.",
    );
    return problems;
  }
  for (const setting of ["secret_scanning", "secret_scanning_push_protection"]) {
    const status = asRecord(analysis[setting])?.status;
    if (status !== "enabled")
      problems.push(`\`${setting}\` is \`${String(status)}\`, not \`enabled\``);
  }
  return problems;
}

/**
 * What a Provider repository's root `package.json` is missing that the gate needs.
 *
 * Both halves are things that make the gate red on its first run, and a gate that is red on
 * arrival is a gate that gets ignored. The four scripts are what the workflow calls. The package
 * manager is what resolves pnpm: `pnpm/action-setup` takes no `version:` here, which its README
 * says is *"Optional when there is a `packageManager` or `devEngines.packageManager` field in the
 * `package.json`"* (https://github.com/pnpm/action-setup, read 20 August 2026) — so without one
 * the gate fails before it reaches a script.
 */
export function rootPackageProblems(packageJson: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(packageJson);
  } catch (err) {
    fail(`the repository's root package.json is not JSON: ${(err as Error).message}`);
  }
  const root = asRecord(parsed) ?? {};
  const scripts = asRecord(root.scripts) ?? {};
  const problems: string[] = [];

  const missing = BASELINE_SCRIPTS.filter((name) => typeof scripts[name] !== "string");
  if (missing.length)
    problems.push(
      `it declares no ${missing.join(", ")} script, and the gate runs each of them with \`pnpm run\``,
    );

  const declared =
    str(root.packageManager) ?? str(asRecord(root.devEngines)?.packageManager) ?? undefined;
  if (!declared)
    problems.push(
      "it declares neither `packageManager` nor `devEngines.packageManager`, so the gate's " +
        "`pnpm/action-setup` step has no pnpm version to resolve",
    );
  return problems;
}

/**
 * How the caller a Provider repository actually carries differs from the template.
 *
 * Two things are load-bearing and nothing else is. Some job in it has to *call* the baseline
 * rather than carry a copy — a shared workflow inherited by pointing at it is the whole of what
 * this baseline is, and a copied gate passes every other check here while drifting from the second
 * repository onwards. And that job's name has to be the one the documented context was composed
 * from, because that is the string the ruleset is about to require.
 *
 * **Everything else about the file is the Provider's own.** Jobs of its own beside the calling one
 * are fine, and are why this finds the calling job rather than requiring a file with one job in it.
 */
export function callerProblems(fetched: string, template: string, called: string): string[] {
  const ref = soleJob(template, "caller template").uses;
  if (!ref) fail("the caller template's job has no `uses:`, so there is no baseline to point at");

  const jobs = parseWorkflowJobs(fetched, "the repository's caller workflow");
  const calling = jobs.filter((j) => j.uses === ref);
  if (calling.length === 0)
    return [
      `no job in it calls \`${ref}\`. Its jobs are ` +
        `${JSON.stringify(jobs.map((j) => j.display))}, and the baseline is inherited by pointing ` +
        "at it — a copy is the drift the shared workflow exists to stop.",
    ];
  if (calling.length > 1)
    return [
      `${calling.length} of its jobs call \`${ref}\`, so it reports that many contexts and the ` +
        `ruleset would require one of them: ${JSON.stringify(calling.map((j) => j.display))}.`,
    ];

  const expected = composeRequiredContext(template, called);
  const actual = composed(calling[0].display, soleJob(called, "called workflow").display);
  return actual === expected
    ? []
    : [
        `its gate reports \`${actual}\` where the documented context is \`${expected}\`. Copy ` +
          "`docs/provider-baseline/ci.yml` unchanged, or the ruleset would require a context this " +
          "repository does not emit.",
      ];
}

/** One check run on the default branch: the name it reports, and how it ended. */
export type CheckRun = { name: string; conclusion: string | undefined };

/**
 * The check runs on a commit, read from `gh api …/check-runs`'s whole body.
 *
 * **The body rather than a `--jq` projection, and that is a correctness decision.** An earlier
 * version asked `gh` for `.check_runs[] | "\(.name)\t\(.conclusion)"`, and TypeScript ate the
 * backslashes before it ever reached jq: the program `gh` received was the *constant string*
 * `"(.name)\t(.conclusion)"`, so every repository reported one check run by that name, the
 * composed context never matched, and provisioning could not reach a write. It failed in the
 * direction that reads as working — the preflight refusing, with a message naming a plausible
 * reason. Parsing here instead means there is no jq program to get wrong and this is under test.
 */
export function parseCheckRuns(body: string): CheckRun[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch (err) {
    fail(`the check-runs listing is not JSON: ${(err as Error).message}`);
  }
  const runs = asRecord(parsed)?.check_runs;
  if (!Array.isArray(runs))
    fail("the check-runs listing carried no `check_runs` array, so its shape has moved");
  return runs.flatMap((run) => {
    const name = str(asRecord(run)?.name);
    // A run whose name cannot be read is dropped rather than named `undefined`, which would be a
    // context an operator could be told to require.
    return name ? [{ name, conclusion: str(asRecord(run)?.conclusion) }] : [];
  });
}

/**
 * Why the composed context cannot be required yet, or `undefined` when a run has reported it.
 *
 * Nothing scanned is not nothing found, so an empty listing is a different instruction from a
 * listing that named something else. This is what keeps the **CAN-40 Give main a ruleset that
 * refuses an unchecked merge** failure — a required context nothing emits, blocking every merge for
 * ever — out of a repository that has never run its gate.
 */
export function unreportedContextProblem(reported: string[], context: string): string | undefined {
  if (reported.includes(context)) return undefined;
  if (reported.length === 0)
    return (
      "no check run has reported on the default branch, so there is nothing to compare. Commit " +
      "the caller workflow, let one run finish, then provision — a ruleset requiring a context " +
      "nothing emits blocks every merge for ever."
    );
  return (
    `no check run is named \`${context}\`. What reported instead: ` +
    `${reported.map((n) => `\`${n}\``).join(", ")}. Either the caller was edited or GitHub ` +
    "composes the two job names differently than the baseline does; take the reported name."
  );
}

/** The one documented home for the composed context, read rather than restated. */
export function parseDocumentedProviderContext(markdown: string): string {
  const named = markdown.match(/\*\*The required context is `([^`]+)`\*\*/);
  if (!named)
    fail(
      "no line reading **The required context is `…`** was found, so the composed status check " +
        "context has no documented home to compare against",
    );
  return named[1];
}
