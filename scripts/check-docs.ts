#!/usr/bin/env node
// Checks the documents against the sources they describe.
//
// A rule that lives only in prose is one nobody re-reads at the moment it is broken
// (docs/agents/workflow.md -> What a merge carries). These are the document claims that
// are machine-checkable, and they are exactly the class that went stale within three days
// of being written (docs/research/tracker-and-repository-audit.md section 7, finding 7).
//
//   1. required contexts  -  docs/infrastructure.md  vs  .github/workflows/ci.yml  vs  the ruleset
//   2. label roster       -  docs/agents/triage-labels.md  vs  the tracker's label list
//   3. variable roster    -  docs/infrastructure.md  vs  vercel env ls
//   4. secret roster      -  docs/infrastructure.md  vs  the GitHub Actions secrets
//   5. links and anchors  -  every relative markdown link, across every tracked document
//   6. section pointers   -  every `file -> *Section*` reference: both the document it names and
//                            the section within it, since a pointer written as prose carries no
//                            link for check 5 to follow. That shape is how CAN-76 Restructure the
//                            agent documents: policy, procedure and incidents get their own homes
//                            replaced the duplication: one owning module, N one-line pointers
//
// Run:  node scripts/check-docs.ts [--verbose]
//
// This file is the wiring: it reads files, runs the CLIs and prints the report. What their
// output *means* is scripts/lib/doc-checks.ts, which is pure and is where the tests are.
//
// Exit 0 when nothing FAILED. A check whose source is unreachable is reported SKIP with the
// reason and does not fail the build - a transient API outage must not block every merge, which
// is the same reasoning that keeps a never-reporting context out of the ruleset. Skips are
// counted and printed, never silent, and on a runner the whole report is written to the job
// summary so the reach of a green run is legible without opening the log. Which sources CI can
// actually reach is recorded in docs/agents/workflow.md -> The gates.

import { appendFileSync, readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Result } from "./lib/doc-checks.ts";
import {
  Skip,
  anchorsOf,
  compareVariables,
  describeDisagreement,
  describeTarget,
  explainFailure,
  fail,
  findLinks,
  findPointers,
  parseActionsSecrets,
  parseCiJobNames,
  parseDocumentedContexts,
  parseDocumentedLabels,
  parseDocumentedVariables,
  parseLinearLabels,
  parseSecretNames,
  parseUncheckedVariables,
  parseVercelEnv,
  pointerResolves,
  renderJobSummary,
  resolvePointer,
  setEq,
  skip,
  tally,
} from "./lib/doc-checks.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VERBOSE = process.argv.includes("--verbose");
const WORKSPACE = "ad2669ec-93a5-4ce1-97fa-c7d9247a1452";
const CONTEXT_HOME = "docs/infrastructure.md";
const CI_WORKFLOW = ".github/workflows/ci.yml";
const LABEL_HOME = "docs/agents/triage-labels.md";

const results: Result[] = [];
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

function check(name: string, fn: () => string | void) {
  try {
    results.push({ name, status: "PASS", detail: fn() ?? "" });
  } catch (err) {
    results.push({
      name,
      status: err instanceof Skip ? "SKIP" : "FAIL",
      detail: (err as Error).message,
    });
  }
}

/** Run a command, or Skip if it is absent or refuses. */
function source(cmd: string, args: string[], why: string): string {
  try {
    return execFileSync(cmd, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60_000,
    });
  } catch (err) {
    // Where a CLI puts its diagnosis is its own business: `vercel` and `gh` use stderr, `orca`
    // exits with an empty stderr and a JSON envelope on stdout. Take the first that says
    // anything, and fall back to Node's own "Command failed: …", which names only the command.
    const e = err as { stderr?: string; stdout?: string; message?: string };
    const output = e.stderr?.trim() || e.stdout?.trim() || e.message || "";
    return skip(`${why}: \`${cmd} ${args.join(" ")}\` — ${explainFailure(output)}`);
  }
}

// ---------------------------------------------------------------------------
// 1. The required status check contexts.
//
// The CI job name is a required status check, so a rename that misses any copy blocks every
// merge for ever rather than until CI finishes. docs/infrastructure.md -> The ruleset is the
// single documented home for those names; this check ties that home to ci.yml and to the live
// ruleset, and refuses a second copy anywhere else in the documentation.
// ---------------------------------------------------------------------------

check("ci.yml job name matches the documented context", () => {
  const jobs = new Set(parseCiJobNames(read(CI_WORKFLOW)));
  const documented = parseDocumentedContexts(read(CONTEXT_HOME))
    .filter((r) => r.source.includes("ci.yml"))
    .map((r) => r.context);
  if (documented.length === 0) fail(`${CONTEXT_HOME} documents no context sourced from ci.yml`);
  const missing = documented.filter((c) => !jobs.has(c));
  if (missing.length)
    fail(
      `${CONTEXT_HOME} names ${missing.map((m) => `"${m}"`).join(", ")} as a ci.yml job, ` +
        `but ${CI_WORKFLOW} declares ${[...jobs].map((j) => `"${j}"`).join(", ")}. ` +
        `Renaming the job without the ruleset and this table blocks every merge for ever.`,
    );
  const extra = [...jobs].filter((j) => !documented.includes(j));
  if (extra.length)
    fail(
      `${CI_WORKFLOW} declares job(s) ${extra.map((j) => `"${j}"`).join(", ")} that ` +
        `${CONTEXT_HOME} does not record. Every job is a check context; record it or the ` +
        `ruleset cannot require it.`,
    );
  return `"${documented.join('", "')}"`;
});

check("the job name has exactly one documented home", () => {
  const jobs = parseCiJobNames(read(CI_WORKFLOW));
  const allowed = new Set([CONTEXT_HOME, CI_WORKFLOW]);
  const tracked = source("git", ["ls-files"], "cannot list tracked files")
    .split("\n")
    .filter((f) => /\.(md|yml|ts)$/.test(f))
    .filter((f) => !allowed.has(f))
    // The research archive quotes history verbatim, on purpose; the tests quote the name as
    // fixture data. Neither is a second home a reader could mistake for the register.
    .filter((f) => !f.startsWith("docs/research/") && !f.endsWith(".test.ts"));
  // Nothing scanned is not nothing found, the same distinction the document set draws below: this
  // check searches the tracked tree for a second home, so an empty list means it searched nowhere,
  // which reads from the report exactly like having searched and found none. What emptied the list
  // is not the point — `git ls-files` returning nothing and the four filters above removing
  // everything leave the check equally vacuous.
  if (tracked.length === 0)
    fail("no tracked .md, .yml or .ts file was left to search for a second copy of the job name");
  const offenders: string[] = [];
  for (const file of tracked) {
    let body: string;
    try {
      body = read(file);
    } catch {
      continue;
    }
    for (const job of jobs) if (body.includes(job)) offenders.push(`${file} ("${job}")`);
  }
  if (offenders.length)
    fail(
      `the CI job name is copied into ${offenders.join(", ")}. It must be named only in ` +
        `${CI_WORKFLOW} and ${CONTEXT_HOME}; everywhere else, point at that table.`,
    );
  return `${tracked.length} tracked files carry no copy`;
});

check("the live ruleset requires the documented contexts", () => {
  const raw = source(
    "gh",
    [
      "api",
      "repos/jacobrees-canoncore/CanonCore/rules/branches/main",
      "--jq",
      '.[] | select(.type == "required_status_checks") | .parameters.required_status_checks[].context',
    ],
    "cannot read the ruleset",
  );
  const live = new Set(
    raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  if (live.size === 0) skip("the ruleset returned no required contexts (token may lack access)");
  const documented = new Set(parseDocumentedContexts(read(CONTEXT_HOME)).map((r) => r.context));
  if (!setEq(live, documented))
    fail(describeDisagreement(live, documented, { liveName: "the ruleset", docName: CONTEXT_HOME }));
  return `${live.size} contexts agree`;
});

// ---------------------------------------------------------------------------
// 2. The label roster. `orca` is a local desktop CLI and cannot run on a CI runner, so this
//    check reports SKIP there and gates locally instead.
// ---------------------------------------------------------------------------

check("the label roster matches the tracker", () => {
  const documented = parseDocumentedLabels(read(LABEL_HOME));
  const live = parseLinearLabels(
    source(
      "orca",
      ["linear", "team", "labels", "--team", "CAN", "--workspace", WORKSPACE, "--json"],
      "cannot read the tracker labels",
    ),
  );
  if (!setEq(live, documented))
    fail(
      describeDisagreement(live, documented, { liveName: "the tracker", docName: LABEL_HOME }) +
        " A label the doc invents cannot be applied — the CLI cannot create a label definition.",
    );
  return `${live.size} labels agree`;
});

// ---------------------------------------------------------------------------
// 3. The environment variable roster.
// ---------------------------------------------------------------------------

check("the variable roster matches Vercel", () => {
  const roster = read(CONTEXT_HOME);
  const documented = parseDocumentedVariables(roster);
  if (documented.size === 0) fail(`${CONTEXT_HOME} records no Vercel-held variables`);
  const live = parseVercelEnv(
    source("vercel", ["env", "ls", "--project", "canoncore"], "cannot read the Vercel environment"),
  );
  if (live.size === 0) skip("parsed no rows from `vercel env ls` — its output format may have moved");
  const problems = compareVariables(documented, live, `the roster in ${CONTEXT_HOME}`);
  if (problems.length)
    fail(
      `the roster in ${CONTEXT_HOME} disagrees with \`vercel env ls\`:\n    - ` +
        problems.join("\n    - "),
    );
  // Rows held anywhere but Vercel are outside this comparison by construction, and saying so is
  // the point: the reach of the check is stated on every run rather than inferred from a count
  // that shrinks quietly whenever a credential moves off this project.
  const unchecked = parseUncheckedVariables(roster);
  return unchecked.length
    ? `${documented.size} agree; ${unchecked.length} held elsewhere and unchecked (${unchecked.join(", ")})`
    : `${documented.size} variables agree`;
});

// ---------------------------------------------------------------------------
// 4. The GitHub Actions secrets. Local, like the label roster and for the same reason: every
//    route to them from a runner costs a credential, and that was weighed and refused.
//    docs/infrastructure.md -> What this check compares, and what it cannot has the argument.
// ---------------------------------------------------------------------------

check("the secret roster matches GitHub Actions", () => {
  const documented = parseActionsSecrets(read(CONTEXT_HOME));
  if (documented.size === 0) fail(`${CONTEXT_HOME} records no GitHub Actions secrets`);
  const live = parseSecretNames(
    source(
      "gh",
      ["secret", "list", "--json", "name", "--jq", ".[].name"],
      "cannot read the Actions secrets",
    ),
  );
  // Empty is not agreement. A `gh` whose listing came back empty, for whatever reason, would
  // otherwise report a roster of two as matching a store of none.
  if (live.size === 0) skip("no secret names came back, so there was nothing to compare");
  if (!setEq(live, documented))
    fail(
      describeDisagreement(live, documented, {
        liveName: "GitHub Actions",
        docName: CONTEXT_HOME,
      }) + " A secret set but undocumented is how this roster goes stale.",
    );
  return `${live.size} secrets agree`;
});

// ---------------------------------------------------------------------------
// 5 & 6. The pointers.
//
// The restructure of CAN-76 Restructure the agent documents: policy, procedure and incidents get
// their own homes gave each rule one owning module and N one-line pointers. A pointer that rots is
// worse than the duplication it replaced, because the reader is now sent nowhere rather than to a
// stale copy. Both checks are local, so they always run.
// ---------------------------------------------------------------------------

// Built on first use rather than at module level. A `Skip` thrown out here would escape the
// reporting entirely: the run would die on a stack trace, taking every other check's result
// with it, and exit on a code that is not this script's.
let documentCache: Map<string, { body: string; anchors: Set<string>; titles: string[] }> | undefined;
const documents = () => {
  documentCache ??= new Map(
    source("git", ["ls-files", "*.md"], "cannot list tracked files")
      .split("\n")
      .filter((f) => f.endsWith(".md"))
      .map((f) => {
        const body = read(f);
        return [f, { body, ...anchorsOf(body) }] as const;
      }),
  );
  // Empty is not agreement, the rule the secret roster states above: a set that came back empty is
  // not a repository whose every pointer holds, it is a repository this run never read. It fails
  // here where the secret roster skips, because the two sources differ in what empty can mean -
  // `gh` is remote and an outage must not block every merge, while `git ls-files` is local and has
  // already skipped if git could not be reached, so an empty listing is git having run and found
  // nothing. Not hypothetical, and it was invisible for three days - docs/incidents.md -> The same
  // fixture inherited its working directory, and two checks went untested for three days.
  if (documentCache.size === 0)
    fail("`git ls-files \"*.md\"` matched no tracked markdown, so there was nothing to resolve");
  return documentCache;
};

check("every relative link and anchor resolves", () => {
  const docs = documents();
  const broken: string[] = [];
  for (const [file, { body }] of docs) {
    const base = dirname(file);
    for (const { link, path, fragment, line } of findLinks(body)) {
      const target = path ? join(base, path) : file;
      // A directory link is legitimate — `docs/adr/` points at the folder.
      if (path && !existsSync(join(ROOT, target))) {
        broken.push(`${file}:${line} → ${link} (no such file)`);
        continue;
      }
      if (!fragment || !target.endsWith(".md")) continue;
      let entry = docs.get(target);
      if (!entry) {
        try {
          entry = { body: "", ...anchorsOf(read(target)) };
        } catch {
          continue;
        }
      }
      if (!entry.anchors.has(fragment)) broken.push(`${file}:${line} → ${link} (no such anchor)`);
    }
  }
  if (broken.length) fail(`broken links:\n    - ${broken.join("\n    - ")}`);
  return `${docs.size} documents`;
});

check('every "file → *Section*" pointer resolves', () => {
  const docs = documents();
  const broken: string[] = [];
  let pointers = 0;
  for (const [file, { body }] of docs) {
    for (const { target, section, display, line } of findPointers(body)) {
      pointers++;
      const where = `${file}:${line} → ${describeTarget(target)} → *${display}*`;
      // A pointer names its own document, so this check owns whether that document exists. The
      // link check cannot: a bare prose pointer carries no `](…)` for it to see.
      const named = resolvePointer(target, file, docs.keys());
      if (named.length !== 1) {
        broken.push(
          named.length === 0
            ? `${where} (no tracked document of that name)`
            : `${where} (that name is carried by ${named.join(", ")}; name one of them)`,
        );
        continue;
      }
      const [resolved] = named;
      if (!pointerResolves(section, docs.get(resolved)!.titles))
        broken.push(`${where} (${resolved} has no such section)`);
    }
  }
  if (broken.length)
    fail(`pointers that resolve to nothing:\n    - ${broken.join("\n    - ")}`);
  return `${pointers} pointers resolve`;
});

// ---------------------------------------------------------------------------

const width = Math.max(...results.map((r) => r.name.length));
for (const r of results) {
  const line = `${r.status.padEnd(4)}  ${r.name.padEnd(width)}`;
  console.log(r.status === "PASS" && !VERBOSE ? line : `${line}  ${r.detail}`);
}
console.log(`\n${tally(results)}`);

// The same report where a reader of a green run will actually meet it. A log line saying which
// rows were compared is one nobody opens a passing job to read, so the run's own page carries
// the table too - every check, its result and what it read.
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, renderJobSummary(results));

process.exit(results.some((r) => r.status === "FAIL") ? 1 : 0);
