import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { RETENTION_DAYS } from "./lib/backup.ts";

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
 *
 * `tokenRows` is the release-token table's body. It is a parameter rather than part of
 * `documents` because a case wanting a different table would otherwise have to rewrite the whole
 * register, taking every other check's source with it.
 */
function fixture({
  jobName,
  documentedContext,
  documents = {},
  untracked = [],
  tokenRows = ["| `the-release-token` | User | `2027-08-14` | **Live.** What CI holds |"],
  // All three calls, because the roster is now required to name each of them — a fixture short of
  // one would fail every case on a rule none of them is about.
  securityRows = [
    "| Secret scanning | **enabled** | `security_and_analysis.secret_scanning.status` |",
    "| Dependabot alerts | **enabled** | `vulnerability-alerts` → `204 No Content` |",
    "| Dependency graph | **enabled** | `dependency-graph/sbom` → a package count while on |",
  ],
  // The Provider baseline's two halves and the one string they compose. Parameters rather than
  // fixture constants because the check that compares them is the check a case has to be able to
  // break, and breaking it by rewriting the register would take every other check's source with it.
  providerCallerJob = "baseline",
  providerCalledJob = "gates",
  documentedProviderContext = "baseline / gates",
  // The glossary, for the same reason: one term, one `_Avoid_` list and one exemption is the
  // smallest thing check 11 can read. A case that wants a violation writes the document that
  // carries it rather than rewriting this.
  glossaryTerms = ["**Merge**:", "One person's assertion that two Anchors are the same thing.", "_Avoid_: Deduplicate, alias, combine"],
  // The backup's two promises and the two things that implement them, for the same reason again:
  // check 12 compares a register row to a workflow and to a constant, so a case that wants to break
  // it needs to move one side without rewriting the register.
  scheduledCron = "17 2 * * *",
  documentedCron = "17 2 * * *",
  documentedRetentionDays = RETENTION_DAYS,
}: {
  jobName: string;
  documentedContext: string;
  documents?: Record<string, string>;
  untracked?: string[];
  tokenRows?: string[];
  securityRows?: string[];
  providerCallerJob?: string;
  providerCalledJob?: string;
  documentedProviderContext?: string;
  glossaryTerms?: string[];
  scheduledCron?: string;
  documentedCron?: string;
  documentedRetentionDays?: number;
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
  // The baseline's two halves. Both are read by path rather than through the document set, so a
  // fixture without them fails every case on a missing file rather than on what the case is about.
  write(
    ".github/workflows/provider-ci.yml",
    ["name: Provider baseline", "on: workflow_call", "jobs:", `  ${providerCalledJob}:`, "    steps:", "      - run: pnpm run test"].join("\n"),
  );
  // Read by path like the two above, so a fixture without it fails every case on a missing file.
  write(
    ".github/workflows/backup-database.yml",
    ["name: Back up the database", "on:", "  schedule:", `    - cron: "${scheduledCron}"`, "jobs:", "  backup:", "    steps:", "      - run: echo"].join("\n"),
  );
  write(
    "docs/provider-baseline/ci.yml",
    ["name: CI", "on: push", "jobs:", `  ${providerCallerJob}:`, "    uses: owner/repo/.github/workflows/provider-ci.yml@main"].join("\n"),
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
      "",
      "### Why this one is account-scoped",
      "",
      "| Token | Scope | Expires | State |",
      "| --- | --- | --- | --- |",
      ...tokenRows,
      "",
      "## The Provider repository baseline",
      "",
      `**The required context is \`${documentedProviderContext}\`**, composed from the caller and`,
      "the workflow it calls rather than written down twice.",
      "",
      "## Dependency and secret scanning",
      "",
      "| Setting | State | Read back by |",
      "| --- | --- | --- |",
      ...securityRows,
      "",
      "## Backups",
      "",
      "| | |",
      "| --- | --- |",
      `| Schedule | \`${documentedCron}\` nightly |`,
      `| Retention | \`${documentedRetentionDays} days\`, enforced by the job |`,
      "",
      "## Database",
      "",
      "| | |",
      "| --- | --- |",
      "| History retention | **7 days**, `history_retention_seconds: 604800` |",
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
  // The always-loaded document, because one check reads it by name and a fixture without it would
  // fail every case on a missing file rather than on whatever the case is about. Deliberately well
  // under its own target, so only a case that overrides it exercises the failure.
  write(
    "CLAUDE.md",
    ["# CanonCore", "<!--", "Target: under 20 lines. Stripped before loading.", "-->", "", "One rule."].join("\n"),
  );
  write(
    "CONTEXT.md",
    [
      "# CanonCore",
      "",
      "## Language",
      "",
      "**A proper name is exempt.**",
      "",
      "| Phrase | Why the word is not the banned one |",
      "| --- | --- |",
      "| `alias record` | DNS's own word, not this glossary's |",
      "",
      ...glossaryTerms,
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
   * (../docs/incidents.md -> The same fixture inherited its working directory, and two checks went
   * untested for three days).
   *
   * `GITHUB_STEP_SUMMARY` is redirected to a temporary file. A runner sets it for every step, so
   * a fixture left to inherit it appends its own verdicts to the real run's page,
   * indistinguishable from the real ones
   * (../docs/incidents.md -> A test fixture that spawns the CLI writes to the real job summary).
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

  // **`HOME` and the two credentials are part of the isolation, not decoration.** The child
  // inherits this process's environment, so a checkout with a Neon key on disk or a blob token
  // exported would have two checks reaching live services and comparing them against a fixture's
  // invented register. Pointing `HOME` at the fixture hides `~/.config/canoncore/`, and an empty
  // string for each token is read as absent — so both report SKIP here whatever the machine holds.
  return { run, gitOnly: { PATH: bin, HOME: dir, NEON_API_KEY: "", BLOB_READ_WRITE_TOKEN: "" } };
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
  assert.match(summary, /\| PASS \| every relative link and anchor resolves \| 4 documents \|/);
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
    // The Provider baseline's called workflow is hidden with them, and the backup workflow with it:
    // both are tracked `.yml` outside every allowed set, so leaving either in the index would give
    // the two scans one file to search and the vacuous-pass this case is about would no longer be
    // vacuous. Anything else tracked and outside those sets has to join this list for the same
    // reason — which is what adding the backup workflow found.
    untracked: [
      "docs/",
      "CLAUDE.md",
      "CONTEXT.md",
      ".github/workflows/provider-ci.yml",
      ".github/workflows/backup-database.yml",
    ],
  });
  const { code, output } = run(gitOnly);

  assert.equal(code, 1, output);
  assert.match(output, /^FAIL {2}the job name has exactly one documented home {2,}.*was left to search/m);
  assert.match(output, /^FAIL {2}every relative link and anchor resolves {2,}.*no tracked markdown/m);
  assert.match(output, /^FAIL {2}every "file → \*Section\*" pointer resolves {2,}.*no tracked markdown/m);
  // The fourth walker of that listing, and the one that would otherwise report a clean glossary
  // over a repository it never opened. Its own source is still on disk and still parses, which is
  // exactly how a vacuous pass here would look like a real one.
  assert.match(output, /^FAIL {2}every document uses the glossary's word for the concept {2,}.*no tracked markdown/m);
});

test("a register naming two live release tokens fails before it reaches Vercel", () => {
  // Reissuing leaves the replaced token live, so the register grows a second row and the reader
  // has to be told which one CI runs on. Two rows claiming to be that one is not a smaller version
  // of the same answer — the check would compare against whichever it read first, and a wrong
  // expiry would then pass. This decides on the document alone, so it holds even where `vercel`
  // is unreachable.
  const { run, gitOnly } = fixture({
    jobName: "the register's context",
    documentedContext: "the register's context",
    tokenRows: [
      "| `the-release-token` | User | `2027-08-14` | **Live.** What CI holds |",
      "| `the-release-token` | Project | `2026-11-01` | **Live.** Also, apparently |",
    ],
  });
  const { code, output } = run(gitOnly);

  assert.equal(code, 1, output);
  assert.match(output, /^FAIL {2}the release token's expiry matches Vercel/m);
  assert.match(output, /marks 2 release tokens \*\*Live\*\*/);
});

test("a security roster row that records neither state fails before it reaches GitHub", () => {
  // The seven rows are security settings, so a row nothing can compare is worse than a stale
  // variable name. Like the two-live-tokens case this decides on the document alone, which is
  // what makes it the half of the check that gates wherever the script runs — `gh` reaches
  // `security_and_analysis` only with admin on the repository, and CI has no way to hold it.
  const { run, gitOnly } = fixture({
    jobName: "the register's context",
    documentedContext: "the register's context",
    securityRows: [
      "| Secret scanning | **on** | `security_and_analysis.secret_scanning.status` |",
      "| Dependabot alerts | **enabled** | `vulnerability-alerts` → `204 No Content` |",
      "| Dependency graph | **enabled** | `dependency-graph/sbom` → a package count while on |",
    ],
  });
  const { code, output } = run(gitOnly);

  assert.equal(code, 1, output);
  assert.match(output, /^FAIL {2}the security-settings roster matches the repository/m);
  assert.match(output, /neither \*\*enabled\*\* nor disabled/);
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

test("a document grown past the target stated in its own comment fails the build", () => {
  // The always-loaded file went 38% over its published number before anyone measured it, then
  // drifted back under without that being recorded either
  // (../docs/research/document-length-for-agents.md). Both are the same failure: nobody counting.
  const { run, gitOnly } = fixture({
    jobName: "the register's context",
    documentedContext: "the register's context",
    documents: {
      "CLAUDE.md": [
        "# CanonCore",
        "<!--",
        "Target: under 3 lines. This comment is stripped before loading, so it is free.",
        "-->",
        "",
        "One.",
        "Two.",
        "Three.",
        "Four.",
      ].join("\n"),
    },
  });
  const { code, output } = run(gitOnly);

  assert.equal(code, 1, output);
  assert.match(output, /^FAIL {2}CLAUDE\.md is within its own stated line target/m);
  // The number it reports has to be the loaded count, not the length on disk: nine lines on disk,
  // three of them the comment. The blank line after a comment is content and does count.
  assert.match(output, /6 loaded lines against its stated target of 3/);
});

test("a document sitting exactly on its target passes, because that is where it was landed", () => {
  // "under 200" is the published wording, but 200 exactly is the spot CLAUDE.md was deliberately
  // trimmed to. Without this, a later `>` -> `>=` would break that with a green suite.
  const { run, gitOnly } = fixture({
    jobName: "the register's context",
    documentedContext: "the register's context",
    documents: {
      "CLAUDE.md": [
        "# CanonCore",
        "<!--",
        "Target: under 5 lines. Stripped before loading, so these lines are free.",
        "-->",
        "",
        "One.",
        "Two.",
        "Three.",
      ].join("\n"),
    },
  });
  const { code, output, summary } = run(gitOnly);

  assert.match(output, /^PASS {2}CLAUDE\.md is within its own stated line target/m);
  assert.doesNotMatch(output, /^FAIL/m, output);
  assert.equal(code, 0, output);

  // Eight lines on disk, three of them the comment, so five loaded against a target of five: the
  // boundary itself, and the case the wording "under" would read the other way. A passing check
  // prints its detail only under `--verbose`, so the count is asserted where it always appears.
  assert.match(summary, /\| PASS \| CLAUDE\.md is within its own stated line target \| 5 loaded of 5 \|/);
});

test("a Provider baseline job renamed out from under the register fails the build", () => {
  // The same failure as the first case in this file, multiplied: the context is composed from the
  // caller and the workflow it calls, and every Provider repository's ruleset requires the string
  // the register records. Renaming either job blocks every merge in every one of them at once, and
  // no Provider repository would report it — there is no ruleset here for the live check to read.
  const { run, gitOnly } = fixture({
    jobName: "the register's context",
    documentedContext: "the register's context",
    providerCalledJob: "checks",
    documentedProviderContext: "baseline / gates",
  });
  const { code, output } = run(gitOnly);

  assert.equal(code, 1, output);
  assert.match(output, /^FAIL {2}the Provider baseline context matches the documented one/m);
  assert.match(output, /compose "baseline \/ checks" but docs\/infrastructure\.md records "baseline \/ gates"/);
});

test("the composed Provider context written out a second time fails the build", () => {
  // One composed string, one documented home. A copy in prose is a copy nobody updates when the
  // job moves, and the reader is then told to require a context nothing emits.
  const { run, gitOnly } = fixture({
    jobName: "the register's context",
    documentedContext: "the register's context",
    documents: {
      "docs/agents/workflow.md": [
        "# Workflow",
        "",
        "A Provider's ruleset requires `baseline / gates`, which this file should not be saying.",
      ].join("\n"),
    },
  });
  const { code, output } = run(gitOnly);

  assert.equal(code, 1, output);
  assert.match(output, /^FAIL {2}the Provider baseline context has exactly one documented home/m);
  assert.match(output, /docs\/agents\/workflow\.md \("baseline \/ gates"\)/);
});

test("a document using an `_Avoid_` word for the concept it is listed against fails the build", () => {
  // The rule CODING_STANDARDS.md → Domain language states, enforced by a reviewer's attention
  // until CAN-129 Enforce the glossary's _Avoid_ lists with a check, instead of a reviewer's
  // attention. The sentence names Merge, so `alias` here is the concept's own word being avoided
  // rather than the word doing some other job.
  const { run, gitOnly } = fixture({
    jobName: "the register's context",
    documentedContext: "the register's context",
    documents: {
      "docs/adr/0003-no-shared-catalogue.md": [
        "# No shared catalogue",
        "",
        "A Merge is one person's assertion, held as an alias rather than a rewrite.",
      ].join("\n"),
    },
  });
  const { code, output } = run(gitOnly);

  assert.equal(code, 1, output);
  assert.match(output, /^FAIL {2}every document uses the glossary's word for the concept/m);
  assert.match(output, /0003-no-shared-catalogue\.md:3 → "an alias"/);
  assert.match(output, /`alias` is on Merge's `_Avoid_` list/);
});

test("the same word doing another job passes, which is what keeps the gate worth having", () => {
  // The other half of the rule, and the half that decides whether anyone leaves the check on:
  // `alias` is banned for Merge, not banned outright. A sentence about DNS names no concept, and
  // the glossary's exemption table carries the phrase besides.
  const { run, gitOnly } = fixture({
    jobName: "the register's context",
    documentedContext: "the register's context",
    documents: {
      "docs/runbook.md": [
        "# Runbook",
        "",
        "The apex is held as an alias record, and a Merge is not involved.",
      ].join("\n"),
    },
  });
  const { code, output, summary } = run(gitOnly);

  assert.doesNotMatch(output, /^FAIL/m, output);
  assert.equal(code, 0, output);
  // What it walked, asserted rather than assumed: a pass over an empty document set reads
  // identically to a pass over the repository.
  assert.match(summary, /\| PASS \| every document uses the glossary's word for the concept \| 1 term across 5 documents \|/);
});

test("a register promising a schedule the workflow does not run fails", () => {
  // The failure this pair exists for: prose that describes a nightly backup, and a workflow that
  // was moved, disabled or never scheduled. A backup is believed through its documentation, so the
  // documentation is the side that gets compared rather than the side that gets trusted.
  const { run, gitOnly } = fixture({
    jobName: "the register's context",
    documentedContext: "the register's context",
    scheduledCron: "17 2 * * *",
    documentedCron: "0 3 * * *",
  });
  const { code, output } = run(gitOnly);

  assert.equal(code, 1, output);
  assert.match(output, /^FAIL {2}the backup's schedule and retention match what the register promises/m);
  assert.match(output, /promises a backup on `0 3 \* \* \*`.*is scheduled on `17 2 \* \* \*`/s);
});

test("a register promising a retention the code does not keep fails", () => {
  const { run, gitOnly } = fixture({
    jobName: "the register's context",
    documentedContext: "the register's context",
    documentedRetentionDays: RETENTION_DAYS + 60,
  });
  const { code, output } = run(gitOnly);

  assert.equal(code, 1, output);
  assert.match(output, /promises \d+ days of backups and .*keeps 30\. The code is what deletes them\./s);
});

test("a workflow with no schedule at all fails rather than reading as agreement", () => {
  // An empty list is the case a `includes` check waves through if it is written the other way
  // round, and it is the shape of a schedule someone commented out.
  const { run, gitOnly } = fixture({
    jobName: "the register's context",
    documentedContext: "the register's context",
    scheduledCron: "",
  });
  const { code, output } = run(gitOnly);

  assert.equal(code, 1, output);
  assert.match(output, /^FAIL {2}the backup's schedule and retention match what the register promises/m);
  // The reason matters as much as the verdict: "scheduled on nothing" is what distinguishes a
  // workflow with no schedule from one whose schedule merely disagrees.
  assert.match(output, /is scheduled on nothing/);
});
