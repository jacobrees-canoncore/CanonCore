import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

// Seam B: the CLI's contract with CI — what it exits with, and what it prints. The parsing
// underneath is `lib/doc-checks.test.ts`; this file only cares about the report.
//
// Every case runs against a fixture repository rather than against this one. Pointing these at
// the real tree would make `pnpm -r test` fail whenever a document drifted, which is the doc
// check's job and not the unit suite's: an unrelated prose edit would break the tests.

const HERE = dirname(fileURLToPath(import.meta.url));

type Run = { code: number; output: string; summary: string };

/**
 * Run the checker and return its exit code, its combined output and whatever it wrote to the job
 * summary, never throwing.
 *
 * `GITHUB_STEP_SUMMARY` is redirected rather than inherited, and that is not tidiness. A runner
 * sets it for every step, so a fixture left to inherit it appends its own verdicts to the real
 * run's page, indistinguishable from the real ones
 * (../docs/incidents.md -> A test fixture that spawns the CLI writes to the real job summary).
 */
function run(cli: string, env: NodeJS.ProcessEnv): Run {
  const summaryPath = join(mkdtempSync(join(tmpdir(), "check-docs-summary-")), "summary.md");
  const child = { ...process.env, GITHUB_STEP_SUMMARY: summaryPath, ...env };
  const read = () => {
    try {
      return readFileSync(summaryPath, "utf8");
    } catch {
      return "";
    }
  };
  try {
    const stdout = execFileSync(process.execPath, [cli], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: child,
    });
    return { code: 0, output: stdout, summary: read() };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? -1, output: `${e.stdout ?? ""}${e.stderr ?? ""}`, summary: read() };
  }
}

/**
 * A repository laid out like this one: the checks read tracked files, so the fixture needs a
 * real git index. `git` is resolved rather than assumed at a path.
 */
function fixture({
  jobName,
  documentedContext,
}: {
  jobName: string;
  documentedContext: string;
}): { cli: string; gitOnly: NodeJS.ProcessEnv } {
  const dir = mkdtempSync(join(tmpdir(), "check-docs-"));
  const write = (rel: string, body: string) => {
    mkdirSync(join(dir, dirname(rel)), { recursive: true });
    writeFileSync(join(dir, rel), body);
  };

  write(
    ".github/workflows/ci.yml",
    ["name: CI", "on: push", "jobs:", "  check:", `    name: ${jobName}`, "    steps:", "      - run: echo"].join("\n"),
  );
  write(
    "docs/infrastructure.md",
    [
      "# Infrastructure",
      "",
      "| Context | Source | Where it comes from |",
      "| --- | --- | --- |",
      `| \`${documentedContext}\` | \`.github/workflows/ci.yml\` | The job name |`,
      "",
      "| Variable | Holder | Environments | Sensitivity | What it is |",
      "| --- | --- | --- | --- | --- |",
      "| `DATABASE_URL` | Vercel | Production | Sensitive | The connection string |",
      // Both halves of the roster, because a fixture holding only one would let the check that
      // reads the other pass by finding nothing to compare — and finding nothing is what that
      // check fails on.
      "| `MIGRATION_DATABASE_URL` | GitHub Actions secret | — | — | The migration role |",
    ].join("\n"),
  );
  write(
    "docs/agents/triage-labels.md",
    [
      "# Triage labels",
      "",
      "**Category roles**",
      "",
      "| Label in mattpocock/skills | Label in our tracker | Meaning |",
      "| --- | --- | --- |",
      "| `bug` | `Bug` | Something is broken |",
      "",
      "**State roles**",
      "",
      "| Label in mattpocock/skills | Label in our tracker | Meaning |",
      "| --- | --- | --- |",
      "| `needs-triage` | `needs-triage` | Needs evaluating |",
    ].join("\n"),
  );

  cpSync(HERE, join(dir, "scripts"), { recursive: true });
  execFileSync("git", ["init", "-q"], { cwd: dir });
  execFileSync("git", ["add", "-A"], { cwd: dir });

  // A PATH holding git and nothing else, so only the local checks decide the exit code.
  const bin = join(dir, "bin");
  mkdirSync(bin);
  symlinkSync(execFileSync("git", ["--exec-path"], { encoding: "utf8" }).trim(), join(bin, "git-core"));
  symlinkSync(
    execFileSync("sh", ["-c", "command -v git"], { encoding: "utf8" }).trim(),
    join(bin, "git"),
  );

  return { cli: join(dir, "scripts", "check-docs.ts"), gitOnly: { PATH: bin } };
}

test("a job renamed out from under the register fails the build", () => {
  // The four-copies failure: rename the job and the required status check is a context nothing
  // emits, so every merge is blocked for ever rather than until CI finishes.
  const { cli, gitOnly } = fixture({
    jobName: "build only",
    documentedContext: "the documented context",
  });
  const { code, output } = run(cli, gitOnly);

  assert.equal(code, 1, output);
  assert.match(output, /^FAIL {2}ci\.yml job name matches the documented context/m);
  assert.match(output, /blocks every merge for ever/);
});

test("a register that agrees with the workflow passes, and unreachable sources only skip", () => {
  const { cli, gitOnly } = fixture({
    jobName: "the documented context",
    documentedContext: "the documented context",
  });
  const { code, output } = run(cli, gitOnly);

  assert.doesNotMatch(output, /^FAIL/m, output);
  assert.match(output, /^SKIP {2}the live ruleset requires the documented contexts/m);
  assert.equal(code, 0, output);
});

test("the job summary carries the same verdicts as the console report", () => {
  // The run's own page is where a reader meets a skip; the log is where they do not. So every
  // check the console reports has to appear in the summary, with the same verdict against it.
  const { cli } = fixture({ jobName: "the same", documentedContext: "the same" });
  const { output, summary } = run(cli, { PATH: "/nonexistent" });

  let checks = 0;
  for (const line of output.split("\n")) {
    const reported = line.match(/^(PASS|SKIP|FAIL) {2}(.+)$/);
    if (!reported) continue;
    const [, status, rest] = reported;
    const name = rest.split(/ {2,}/)[0].trim();
    checks++;
    assert.ok(summary.includes(`| ${status} | ${name} |`), `${status} ${name} is not in the summary`);
  }
  assert.ok(checks >= 5, `only ${checks} checks reported\n${output}`);
  assert.match(summary, /not a pass/, "the summary did not carry the skip warning");
});

test("an unreachable source is reported, and does not abort the whole run", () => {
  // Every check reaching a CLI must degrade to SKIP. If one of them can throw past the
  // reporting instead, a hiccup in `git` costs the operator every other check's result and
  // exits on a stack trace — which reads as "the documents are broken" when nothing is.
  const { cli } = fixture({
    jobName: "the documented context",
    documentedContext: "the documented context",
  });
  const { code, output } = run(cli, { PATH: "/nonexistent" });

  assert.doesNotMatch(output, /at ModuleJob\.run|^\s+at /m, "it exited on a stack trace");
  assert.match(output, /^PASS {2}ci\.yml job name/m, "the check needing no source did not run");
  assert.match(output, /^SKIP/m, "no check reported SKIP");
  assert.match(output, /not a pass/, "the summary did not say a skip is not a pass");
  assert.equal(code, 0, "an unreachable source must not fail the build");
});
