import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { cpSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

// Seam B: the CLI's contract with CI — what it exits with, and what it prints. The parsing
// underneath is `lib/doc-checks.test.ts`; this file only cares about the report.
//
// Every case runs against a fixture repository rather than against this one. Pointing these at
// the real tree would make `pnpm -r test` fail whenever a document drifted, which is the doc
// check's job and not the unit suite's: an unrelated prose edit would break the tests.

const HERE = dirname(fileURLToPath(import.meta.url));

type Run = { code: number; output: string };

/** Run the checker and return its exit code and combined output, never throwing. */
function run(cli: string, env: NodeJS.ProcessEnv): Run {
  try {
    const stdout = execFileSync(process.execPath, [cli], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...env },
    });
    return { code: 0, output: stdout };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? -1, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
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
