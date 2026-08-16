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

type Fixture = {
  /** Run the checker against this fixture, `env` layered over the inherited environment. */
  run: (env: NodeJS.ProcessEnv) => Run;
  /** A PATH holding git and nothing else, so only the local checks decide the exit code. */
  gitOnly: NodeJS.ProcessEnv;
};

/**
 * A repository laid out like this one: the checks read tracked files, so the fixture needs a
 * real git index. `git` is resolved rather than assumed at a path.
 *
 * `documents` adds further tracked markdown, which is how a case gives one check something to
 * fail on; `untracked` hides paths from the index without removing them from disk, which is how
 * a case takes the document set away while leaving every file the other checks read.
 */
function fixture({
  jobName,
  documentedContext,
  documents = {},
  untracked = [],
}: {
  jobName: string;
  documentedContext: string;
  documents?: Record<string, string>;
  untracked?: string[];
}): Fixture {
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
      "## The ruleset",
      "",
      "| Context | Source | Where it comes from |",
      "| --- | --- | --- |",
      `| \`${documentedContext}\` | \`.github/workflows/ci.yml\` | The job name |`,
      "",
      "Which role each label plays is in [the triage labels](agents/triage-labels.md).",
      "",
      "## The variables",
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
      "",
      // Something for the link and the pointer check to resolve, in all three shapes they have to
      // handle: a relative link with an anchor, a pointer naming its document in prose, and a
      // pointer naming it as a link. A fixture carrying none of these let both checks pass by
      // walking nothing.
      "## Where the rest of it lives",
      "",
      "The register is [docs/infrastructure.md](../infrastructure.md#the-ruleset), and",
      "docs/infrastructure.md → *The variables* names every one this repository holds.",
      "",
      "[The register](../infrastructure.md) → *The ruleset* names the contexts as well.",
    ].join("\n"),
  );
  for (const [rel, body] of Object.entries(documents)) write(rel, body);

  cpSync(HERE, join(dir, "scripts"), { recursive: true });
  // The checker's own source is machinery, not fixture content: it is copied in so the CLI can be
  // run against this root at all, and tracking it would put its prose into the document set and
  // its `node_modules` into the file list. A fixture's tracked files are the ones the case wrote.
  write(".gitignore", ["scripts/", ...untracked].join("\n"));
  execFileSync("git", ["init", "-q"], { cwd: dir });
  execFileSync("git", ["add", "-A"], { cwd: dir });

  const bin = join(dir, "bin");
  mkdirSync(bin);
  symlinkSync(execFileSync("git", ["--exec-path"], { encoding: "utf8" }).trim(), join(bin, "git-core"));
  symlinkSync(
    execFileSync("sh", ["-c", "command -v git"], { encoding: "utf8" }).trim(),
    join(bin, "git"),
  );

  /**
   * Run the checker and return its exit code, its combined output and whatever it wrote to the job
   * summary, never throwing.
   *
   * Two things the child must not inherit, and both are the point rather than housekeeping.
   *
   * `cwd` is this fixture's root. The checker reads files against a root derived from its own
   * location but runs `git ls-files` in the working directory, so a child left to inherit one
   * makes the two disagree, and what the suite then reports depends on where it was invoked from
   * (../docs/incidents.md → *The same fixture inherited its working directory, and two checks went
   * untested for three days*).
   *
   * `GITHUB_STEP_SUMMARY` is redirected to a temporary file. A runner sets it for every step, so
   * a fixture left to inherit it appends its own verdicts to the real run's page,
   * indistinguishable from the real ones
   * (../docs/incidents.md → *A test fixture that spawns the CLI writes to the real job summary*).
   */
  const run = (env: NodeJS.ProcessEnv): Run => {
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
      const stdout = execFileSync(process.execPath, [join(dir, "scripts", "check-docs.ts")], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        cwd: dir,
        env: child,
      });
      return { code: 0, output: stdout, summary: read() };
    } catch (err) {
      const e = err as { status?: number; stdout?: string; stderr?: string };
      return { code: e.status ?? -1, output: `${e.stdout ?? ""}${e.stderr ?? ""}`, summary: read() };
    }
  };

  return { run, gitOnly: { PATH: bin } };
}

test("a job renamed out from under the register fails the build", () => {
  // The four-copies failure: rename the job and the required status check is a context nothing
  // emits, so every merge is blocked for ever rather than until CI finishes.
  const { run, gitOnly } = fixture({
    jobName: "build only",
    documentedContext: "the register's context",
  });
  const { code, output } = run(gitOnly);

  assert.equal(code, 1, output);
  assert.match(output, /^FAIL {2}ci\.yml job name matches the documented context/m);
  assert.match(output, /blocks every merge for ever/);
});

test("a register that agrees with the workflow passes, and unreachable sources only skip", () => {
  const { run, gitOnly } = fixture({
    jobName: "the register's context",
    documentedContext: "the register's context",
  });
  const { code, output, summary } = run(gitOnly);

  assert.doesNotMatch(output, /^FAIL/m, output);
  assert.match(output, /^SKIP {2}the live ruleset requires the documented contexts/m);
  assert.equal(code, 0, output);

  // What the two document checks actually walked, asserted rather than assumed. A pass over an
  // empty set is what this suite reported for as long as the child inherited its directory, and
  // the count is printed only in the summary and under `--verbose`.
  assert.match(summary, /\| PASS \| every relative link and anchor resolves \| 2 documents \|/);
  assert.match(summary, /\| PASS \| every "file → \*Section\*" pointer resolves \| 2 pointers resolve \|/);
});

test("a link that resolves to nothing fails the build", () => {
  const { run, gitOnly } = fixture({
    jobName: "the register's context",
    documentedContext: "the register's context",
    documents: {
      "docs/agents/workflow.md": [
        "# Workflow",
        "",
        "The gates are in [the register](../nowhere.md), under [the ruleset](../infrastructure.md#gates).",
      ].join("\n"),
    },
  });
  const { code, output } = run(gitOnly);

  assert.equal(code, 1, output);
  assert.match(output, /^FAIL {2}every relative link and anchor resolves/m);
  assert.match(output, /docs\/agents\/workflow\.md:3 → \.\.\/nowhere\.md \(no such file\)/);
  assert.match(output, /docs\/agents\/workflow\.md:3 → \.\.\/infrastructure\.md#gates \(no such anchor\)/);
  // The neighbouring check has nothing to say about this document, and says nothing.
  assert.match(output, /^PASS {2}every "file → \*Section\*" pointer resolves/m);
});

test("a pointer that resolves to nothing fails the build", () => {
  const { run, gitOnly } = fixture({
    jobName: "the register's context",
    documentedContext: "the register's context",
    documents: {
      "docs/agents/workflow.md": [
        "# Workflow",
        "",
        "docs/infrastructure.md → *No such section* is where the gates are recorded.",
        "",
        "nowhere.md → *The ruleset* is where they are not.",
      ].join("\n"),
    },
  });
  const { code, output } = run(gitOnly);

  assert.equal(code, 1, output);
  assert.match(output, /^FAIL {2}every "file → \*Section\*" pointer resolves/m);
  assert.match(
    output,
    /docs\/agents\/workflow\.md:3 → docs\/infrastructure\.md → \*No such section\* \(docs\/infrastructure\.md has no such section\)/,
  );
  assert.match(output, /→ nowhere\.md → \*The ruleset\* \(no tracked document of that name\)/);
  assert.match(output, /^PASS {2}every relative link and anchor resolves/m);
});

test("a listing that came back empty fails rather than passing over nothing", () => {
  // The failure this suite could not see. Three checks walk `git ls-files`, and a listing that
  // matches nothing gives each of them nothing to look at — which reads, from the report, exactly
  // like every link and every pointer having resolved and no second home for the job name having
  // been found. Only the files are hidden here: every document is still on disk, so the checks
  // reading a named file are unaffected and the difference is the listing alone.
  const { run, gitOnly } = fixture({
    jobName: "the register's context",
    documentedContext: "the register's context",
    untracked: ["docs/"],
  });
  const { code, output } = run(gitOnly);

  assert.equal(code, 1, output);
  assert.match(output, /^FAIL {2}the job name has exactly one documented home {2,}.*no tracked file/m);
  assert.match(output, /^FAIL {2}every relative link and anchor resolves {2,}.*no tracked markdown/m);
  assert.match(output, /^FAIL {2}every "file → \*Section\*" pointer resolves {2,}.*no tracked markdown/m);
});

test("the job summary carries the same verdicts as the console report", () => {
  // The run's own page is where a reader meets a skip; the log is where they do not. So every
  // check the console reports has to appear in the summary, with the same verdict against it.
  const { run } = fixture({ jobName: "the register's context", documentedContext: "the register's context" });
  const { output, summary } = run({ PATH: "/nonexistent" });

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
  const { run } = fixture({
    jobName: "the register's context",
    documentedContext: "the register's context",
  });
  const { code, output } = run({ PATH: "/nonexistent" });

  assert.doesNotMatch(output, /at ModuleJob\.run|^\s+at /m, "it exited on a stack trace");
  assert.match(output, /^PASS {2}ci\.yml job name/m, "the check needing no source did not run");
  assert.match(output, /^SKIP/m, "no check reported SKIP");
  assert.match(output, /not a pass/, "the summary did not say a skip is not a pass");
  assert.equal(code, 0, "an unreachable source must not fail the build");
});
