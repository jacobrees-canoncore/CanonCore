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
//   5. release token      -  docs/infrastructure.md  vs  the expiry of the token CI last used
//   6. security settings  -  docs/infrastructure.md  vs  the repository's own three sources
//   7. links and anchors  -  every relative markdown link, across every tracked document
//   8. section pointers   -  every `file -> *Section*` reference: both the document it names and
//                            the section within it, since a pointer written as prose carries no
//                            link for check 7 to follow. That shape is how CAN-76 Restructure the
//                            agent documents: policy, procedure and incidents get their own homes
//                            replaced the duplication: one owning module, N one-line pointers
//   9. always-loaded size -  CLAUDE.md  vs  the target its own maintainer comment states
//  10. Provider baseline  -  docs/infrastructure.md  vs  the two workflow files that compose the
//                            status check context every Provider repository's ruleset requires
//  11. domain language    -  every tracked document  vs  CONTEXT.md's own `_Avoid_` lists, which
//                            were enforced by a reviewer's attention until CAN-129 Enforce the
//                            glossary's _Avoid_ lists with a check, instead of a reviewer's
//                            attention
//  12. backup promises    -  docs/infrastructure.md  vs  the workflow's cron and the retention the
//                            code enforces
//  13. backup freshness   -  docs/infrastructure.md  vs  what the backup store actually holds. The
//                            only one of these that reports on something *not happening*, which is
//                            how a nightly job stops: silently, and believed until it is needed
//  14. history window     -  docs/infrastructure.md  vs  Neon's own `history_retention_seconds`.
//                            The setting a backup does not cover, and the one with no code to go
//                            stale — so nothing but this would ever read it again
//  15. agent baseline     -  docs/infrastructure.md  vs  the two plugin manifests and the skills
//                            directory they publish, plus every `${CLAUDE_PLUGIN_ROOT}` path a
//                            skill names, none of which resolves in this checkout
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
import type { Attempt, Result } from "./lib/doc-checks.ts";
import { BACKUP_PREFIX, RETENTION_DAYS, freshness } from "./lib/backup.ts";
import { storedBackups } from "./lib/backup-io.ts";
import { NEON_PROJECT, NeonUnavailable, neonRequest } from "./lib/neon-api.ts";
import {
  composeRequiredContext,
  parseDocumentedProviderContext,
} from "./lib/provider-baseline.ts";
import {
  compareProviderSettings,
  parseDocumentedProviderSettings,
  parseManifests,
  pluginId,
  pluginRootPaths,
  skillRoots,
} from "./lib/agent-baseline.ts";
import {
  Skip,
  anchorsOf,
  compareSecuritySettings,
  compareVariables,
  describeDisagreement,
  describeTarget,
  explainFailure,
  fail,
  findLinks,
  findPointers,
  expiryDay,
  parseActionsSecrets,
  parseCiJobNames,
  parseDocumentedBackup,
  parseDocumentedContexts,
  parseDocumentedRetentionSeconds,
  parseDocumentedLabels,
  parseDocumentedLineTarget,
  parseDocumentedReleaseTokens,
  parseDocumentedSecuritySettings,
  parseDocumentedVariables,
  parseGlossary,
  findAvoidedWords,
  parseLinearLabels,
  parseSecretNames,
  parseSecurityAndAnalysis,
  parseUncheckedVariables,
  parseVercelEnv,
  parseVercelTokens,
  parseWorkflowCrons,
  pointerResolves,
  readDependencyGraph,
  readVulnerabilityAlerts,
  renderJobSummary,
  resolvePointer,
  setEq,
  skip,
  lastUsedTokenNamed,
  loadedLines,
  tally,
} from "./lib/doc-checks.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VERBOSE = process.argv.includes("--verbose");
const WORKSPACE = "ad2669ec-93a5-4ce1-97fa-c7d9247a1452";
const CONTEXT_HOME = "docs/infrastructure.md";
const CI_WORKFLOW = ".github/workflows/ci.yml";
const LABEL_HOME = "docs/agents/triage-labels.md";
const REPOSITORY = "jacobrees-canoncore/CanonCore";
const ALWAYS_LOADED = "CLAUDE.md";
const GLOSSARY = "CONTEXT.md";
const PROVIDER_CALLER = "docs/provider-baseline/ci.yml";
const PROVIDER_WORKFLOW = ".github/workflows/provider-ci.yml";
const BACKUP_WORKFLOW = ".github/workflows/backup-database.yml";
const MARKETPLACE_MANIFEST = ".claude-plugin/marketplace.json";
const PLUGIN_MANIFEST = ".claude-plugin/plugin.json";

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

/**
 * The same contract as `check`, for one whose source is reached with `await`.
 *
 * It exists rather than `check` becoming async because every other check here is a subprocess or a
 * file read, and making all fourteen return promises to serve one would put the ordering of the
 * report — which is the order a reader meets the checks in — at the mercy of remembering to await.
 */
async function checkAsync(name: string, fn: () => Promise<string | void>) {
  try {
    results.push({ name, status: "PASS", detail: (await fn()) ?? "" });
  } catch (err) {
    results.push({
      name,
      status: err instanceof Skip ? "SKIP" : "FAIL",
      detail: (err as Error).message,
    });
  }
}

/**
 * Run a command and report what it did, rather than deciding for the caller. Most callers want
 * `source` below, which decides; the security settings cannot use it, because `gh api` exits
 * non-zero on a `404` and a `404` is one of the two answers GitHub documents for two of its calls.
 */
function attempt(cmd: string, args: string[]): Attempt {
  try {
    return {
      ok: true,
      output: execFileSync(cmd, args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 60_000,
      }),
    };
  } catch (err) {
    // Where a CLI puts its diagnosis is its own business: `vercel` and `gh` use stderr, `orca`
    // exits with an empty stderr and a JSON envelope on stdout. Take the first that says
    // anything, and fall back to Node's own "Command failed: …", which names only the command.
    const e = err as { stderr?: string; stdout?: string; message?: string };
    return { ok: false, output: e.stderr?.trim() || e.stdout?.trim() || e.message || "" };
  }
}

/** Run a command, or Skip if it is absent or refuses. */
function source(cmd: string, args: string[], why: string): string {
  const ran = attempt(cmd, args);
  return ran.ok
    ? ran.output
    : skip(`${why}: \`${cmd} ${args.join(" ")}\` — ${explainFailure(ran.output)}`);
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

/**
 * Every tracked file outside `allowed` that carries one of `strings`, and how many were searched.
 *
 * Shared by the two contexts that each have one documented home: this repository's job name and
 * the composed Provider baseline context. They are the same rule about two strings, so a second
 * copy of the scan would be the drift the scan is for.
 *
 * Nothing scanned is not nothing found, the same distinction the document set draws below: an
 * empty list means it searched nowhere, which reads from the report exactly like having searched
 * and found none. What emptied the list is not the point — `git ls-files` returning nothing and
 * the filters removing everything leave the check equally vacuous. **That guard is here rather
 * than in each caller**, because it is a property of the scan rather than of what is being scanned
 * for: a third caller cannot forget it.
 */
function secondHomes(strings: string[], allowed: Set<string>, what: string) {
  const tracked = source("git", ["ls-files"], "cannot list tracked files")
    .split("\n")
    .filter((f) => /\.(md|yml|ts)$/.test(f))
    .filter((f) => !allowed.has(f))
    // The research archive quotes history verbatim, on purpose; the tests quote the name as
    // fixture data. Neither is a second home a reader could mistake for the register.
    .filter((f) => !f.startsWith("docs/research/") && !f.endsWith(".test.ts"));
  if (tracked.length === 0)
    fail(`no tracked .md, .yml or .ts file was left to search for a second copy of ${what}`);
  const offenders: string[] = [];
  for (const file of tracked) {
    let body: string;
    try {
      body = read(file);
    } catch {
      continue;
    }
    for (const s of strings) if (body.includes(s)) offenders.push(`${file} ("${s}")`);
  }
  return { searched: tracked.length, offenders };
}

check("the job name has exactly one documented home", () => {
  const jobs = parseCiJobNames(read(CI_WORKFLOW));
  const { searched, offenders } = secondHomes(
    jobs,
    new Set([CONTEXT_HOME, CI_WORKFLOW]),
    "the job name",
  );
  if (offenders.length)
    fail(
      `the CI job name is copied into ${offenders.join(", ")}. It must be named only in ` +
        `${CI_WORKFLOW} and ${CONTEXT_HOME}; everywhere else, point at that table.`,
    );
  return `${searched} tracked files carry no copy`;
});

check("the live ruleset requires the documented contexts", () => {
  const raw = source(
    "gh",
    [
      "api",
      `repos/${REPOSITORY}/rules/branches/main`,
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
// 5. The release token's expiry.
//
// The roster records when `VERCEL_TOKEN` runs out, and an expiry nobody re-reads is one that goes
// stale silently — there is no failure until the day it stops the release. So the date is compared
// rather than merely written down, and the token it is compared against is the one Vercel last saw
// used, because a name is not unique: reissuing leaves the replaced token live and unexpired, as
// happened here from 14 to 16 August 2026.
//
// The comparison is to the day, so a replacement minted hours after the token it replaces slips
// through — which is what 14 August was. It catches the ordinary case, a reissue weeks or months
// later whose expiry moves with it. docs/infrastructure.md -> Why this one is account-scoped says
// so where the date is written.
//
// Which is as far as this goes: what a *wrongly scoped* token costs is answered by CAN-109 Decide
// whether the label roster check needs enforcing, or is honest as it stands, on the job summary.
// The scope is reported in the detail line here and never failed on.
// ---------------------------------------------------------------------------

// `vercel tokens ls --help` on 16 August 2026 (CLI 58.7.1) documents `--limit` as "Maximum number
// of tokens to return (default 20)" and offers no flag for the next page; asking for 101 returns
// ``Error: `--limit` must be between 1 and 100.`` At 100 this account fills the page, so the listing
// is capped in practice however it is asked for — and what that costs is handled below rather than
// assumed away.
const TOKEN_LIMIT = 100;

check("the release token's expiry matches Vercel", () => {
  const documented = parseDocumentedReleaseTokens(read(CONTEXT_HOME)).filter((t) => t.live);
  if (documented.length !== 1)
    fail(
      `${CONTEXT_HOME} marks ${documented.length} release tokens **Live**, and exactly one can be ` +
        `in use. Rewrite the others' State as history.`,
    );
  const [row] = documented;
  const tokens = parseVercelTokens(
    source(
      "vercel",
      ["tokens", "ls", "--json", "--limit", String(TOKEN_LIMIT)],
      "cannot read the Vercel tokens",
    ),
  );
  // Empty is not agreement, the rule the secret roster states: a listing that came back with
  // nothing is one this run never read, not an account holding no tokens.
  if (tokens.length === 0) skip("no tokens came back, so there was nothing to compare");

  // A full page is the listing stopping, not the account ending. It comes back ordered by last
  // use, descending — read off the live CLI on 16 August 2026, where `activeAt` descends across
  // all 100 rows and `createdAt` does not — so everything a full page leaves out was used less
  // recently than everything in it. A name present in the page therefore has its most recently
  // used holder in the page, which is the one compared below. What a full page cannot tell apart
  // is a name that is absent from a name that fell off the end: absent is worth failing on, and
  // off-the-end is an outage, so the two part company here.
  const capped = tokens.length >= TOKEN_LIMIT;
  const live = lastUsedTokenNamed(tokens, row.name);
  if (!live) {
    if (capped)
      skip(
        `no token named \`${row.name}\` among the newest ${TOKEN_LIMIT}, which is as far as ` +
          `\`vercel tokens ls\` reaches`,
      );
    fail(
      `no Vercel token is named \`${row.name}\`, which ${CONTEXT_HOME} records as the live one. ` +
        `A release token that does not exist stops the release on the next merge to \`main\`.`,
    );
  }
  const expires = expiryDay(live.expiresAt);
  if (expires !== row.expires)
    fail(
      `${CONTEXT_HOME} records \`${row.name}\` as expiring ${row.expires}; the token Vercel last ` +
        `saw used expires ${expires}. Reissuing leaves the replaced token live, so a register ` +
        `that is not compared can go on describing a token nothing runs on.`,
    );
  const sharing = tokens.filter((t) => t.name === row.name).length;
  return (
    `expires ${expires}, scope ${live.projectOnly ? "project-only" : "wider than one project"}, ` +
    `read the newest ${tokens.length}` +
    (sharing > 1 ? `, ${sharing} of them carry the name` : "")
  );
});

// ---------------------------------------------------------------------------
// 6. The security settings.
//
// Seven rows of prose sitting beside four rosters that each have a check, which is how a row that
// quietly stops being true goes unnoticed. Three calls, because the settings live in three places
// and none of them reaches all seven.
//
// `security_and_analysis` is read first, and not only for its own five rows: it comes back only to
// a caller with admin, which is what tells the other two calls' `404` apart from an endpoint the
// caller may not read at all. Where it is refused the check reports having read nothing rather
// than five rows out of seven. The readers in scripts/lib/doc-checks.ts carry that argument with
// its citations; why the roster gates on a laptop is docs/infrastructure.md -> Dependency and
// secret scanning, and where every check gates is docs/agents/workflow.md -> The gates.
// ---------------------------------------------------------------------------

check("the security-settings roster matches the repository", () => {
  const documented = parseDocumentedSecuritySettings(read(CONTEXT_HOME));
  const analysis = parseSecurityAndAnalysis(
    source(
      "gh",
      ["api", `repos/${REPOSITORY}`, "--jq", ".security_and_analysis"],
      "cannot read the repository",
    ),
  );
  const alerts = readVulnerabilityAlerts(
    attempt("gh", ["api", `repos/${REPOSITORY}/vulnerability-alerts`]),
  );
  const graph = readDependencyGraph(
    attempt("gh", [
      "api",
      `repos/${REPOSITORY}/dependency-graph/sbom`,
      "--jq",
      ".sbom.packages | length",
    ]),
  );
  const problems = compareSecuritySettings(documented, { analysis, alerts, graph: graph.enabled });
  if (problems.length)
    fail(
      `the security-settings roster in ${CONTEXT_HOME} disagrees with the repository:\n    - ` +
        problems.join("\n    - "),
    );
  // **The graph row agreeing is not the graph seeing anything**, and the row cannot express the
  // difference: it says `enabled`, and a graph holding nothing is enabled. What that leaves is the
  // two Dependabot rows beside it matching against an empty index — `readDependencyGraph` carries
  // the reading and the incident it belongs to. It is checked here rather than in
  // `compareSecuritySettings` because it is not a disagreement with the document, and that
  // function's job is the comparison.
  //
  // **`fail` here where `provision-provider-repository.ts` skips on the identical condition**, and
  // the difference is the repository rather than the reading. There it is a repository created
  // minutes ago whose graph GitHub has not got to yet: provisioning genuinely succeeded, nothing
  // the operator can do would help, and a FAIL would report their work as broken. Here it is a
  // repository years into its life whose graph has been indexing all along, so the same reading is
  // a live posture defect rather than a wait. This check is local-only, so a red one costs a laptop
  // rather than every merge.
  if (graph.enabled && !graph.indexed)
    fail(
      "the dependency graph is on and holds no dependency at all, so it has indexed no manifest " +
        "and the two Dependabot rows above are matching against nothing. The roster agrees with " +
        "it either way, which is why this is checked separately.",
    );
  // The package count is reported and never compared: it moves with every dependency change, and
  // a gate that is red on arrival is a gate that gets ignored. What it is evidence of is the graph
  // answering at all, which is the row that has no field of its own to read back.
  return (
    `${documented.length} settings agree` +
    (graph.enabled ? `, ${graph.packages} packages in the graph` : "")
  );
});

// ---------------------------------------------------------------------------
// 7 & 8. The pointers.
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
// 9. The always-loaded document's length.
//
// `CLAUDE.md` is read on every request, so a line changing no behaviour is a real cost
// (CODING_STANDARDS.md -> Documents are the artefact here). It is the only document here with a
// published number to fail against, and it has drifted both ways without anyone noticing:
// docs/research/document-length-for-agents.md holds both episodes and the measurements.
//
// Two things make this check different from the eight above. Its source is the file it gates, so it
// can never be a SKIP. And the target is read out of that file's own maintainer comment rather than
// written here, so the number has one home - the same rule the job-name check enforces for the
// required status check context.
// ---------------------------------------------------------------------------

check(`${ALWAYS_LOADED} is within its own stated line target`, () => {
  const body = read(ALWAYS_LOADED);
  const target = parseDocumentedLineTarget(body);
  const loaded = loadedLines(body);
  // "under 200" is the published wording and 200 exactly is where this file was deliberately
  // landed, so the boundary passes rather than failing the spot that was chosen on purpose.
  if (loaded > target)
    fail(
      `${ALWAYS_LOADED} is ${loaded} loaded lines against its stated target of ${target}. ` +
        "Cut a line to add one, or move the content to a pointer document - the seam to move it " +
        "along is in that file's own comment. Raising the number is a decision to argue in " +
        "docs/research/document-length-for-agents.md, not an edit to make here.",
    );
  return `${loaded} loaded of ${target}`;
});

// ---------------------------------------------------------------------------
// 10. The Provider baseline's required status check context.
//
// The same failure as check 1, one repository further out and worse for being multiplied: the
// context every Provider repository's ruleset requires is composed from two files here — the
// caller a Provider copies and the reusable workflow it calls — and renaming either job blocks
// every merge in every Provider repository that already requires the old string. Nothing in a
// Provider repository would report that, and there is no ruleset here to compare against.
//
// So the composition is checked where both halves live. What it does not reach is the Provider
// rulesets themselves, and since 21 August 2026 one exists — `provider-tmdb`'s, requiring this
// string. It stays out of this file on purpose rather than for want of a subject:
// `provision-provider-repository.ts` reads every setting it wrote back and exits non-zero on any
// that has drifted, so **a re-run of it is the nearest thing to that comparison** — and a check
// here would first need a roster of Provider repositories written into a document, a second copy of
// a list the organisation already holds, which is the drift this file exists to catch rather than
// to create.
//
// **That is not the same as drift detection existing.** The re-run writes before it reads, and
// nothing runs it unprompted, so what it catches is drift somebody already went looking for.
// **CAN-145 Give the Provider provisioning a report-only mode, and something that runs it** owns
// both halves; docs/infrastructure.md -> What the first real run showed records the gap.
// ---------------------------------------------------------------------------

check("the Provider baseline context matches the documented one", () => {
  const composed = composeRequiredContext(read(PROVIDER_CALLER), read(PROVIDER_WORKFLOW));
  const documented = parseDocumentedProviderContext(read(CONTEXT_HOME));
  if (composed !== documented)
    fail(
      `${PROVIDER_CALLER} and ${PROVIDER_WORKFLOW} compose "${composed}" but ${CONTEXT_HOME} ` +
        `records "${documented}". Every Provider repository's ruleset requires the documented ` +
        `string, so a job renamed here blocks every merge in every one of them at once.`,
    );
  return `"${composed}"`;
});

check("the Provider baseline context has exactly one documented home", () => {
  const composed = composeRequiredContext(read(PROVIDER_CALLER), read(PROVIDER_WORKFLOW));
  const { searched, offenders } = secondHomes(
    [composed],
    new Set([CONTEXT_HOME]),
    "the composed context",
  );
  if (offenders.length)
    fail(
      `the composed Provider context is written out in ${offenders.join(", ")}. It is composed ` +
        `from two files and recorded in ${CONTEXT_HOME} alone; everywhere else, point there.`,
    );
  return `${searched} tracked files carry no copy`;
});

// ---------------------------------------------------------------------------
// 11. The domain language.
//
// `CODING_STANDARDS.md` -> Domain language makes an `_Avoid_` word used for the concept it is
// listed against a finding, and until this check it was a finding only where a reviewer happened
// to notice one. It is the largest rule here that lived only in prose, which is the class this
// file exists for.
//
// Local files throughout, and it walks checks 7 and 8's listing, so it skips where they do and
// nowhere else: `git ls-files` failing to run at all. An empty listing fails there rather than
// passing, which is what stops this reporting a clean glossary over a repository it never opened.
// The vocabulary is read out of CONTEXT.md rather than written here, so the glossary keeps one
// home, and so does every exception: the table in that file's *Language* section is the only
// place one lives.
//
// **`docs/research/` is out of scope, and CONTEXT.md -> Using these documents is why**: it "is not
// domain documentation ... its contents are findings, not decisions". A research document quotes
// what an outside source called a thing, and one of them quotes these very violations back - the
// audit that found them. Checking it would fail a run for recording the audit accurately.
// ---------------------------------------------------------------------------

check("every document uses the glossary's word for the concept", () => {
  const glossary = parseGlossary(read(GLOSSARY));
  const scope = [...documents()].filter(([file]) => !file.startsWith("docs/research/"));
  const wrong: string[] = [];
  for (const [file, { body }] of scope)
    for (const f of findAvoidedWords(body, glossary))
      wrong.push(`${file}:${f.line} → "${f.quote}" — \`${f.word}\` is on ${f.term}'s \`_Avoid_\` list and ${f.why}`);
  if (wrong.length)
    fail(
      `${wrong.length} use${wrong.length === 1 ? "" : "s"} of a word the glossary bans for that ` +
        `concept:\n    - ${wrong.join("\n    - ")}\n    Write the term instead, or record the ` +
        `exception in ${GLOSSARY} → *Language* with the reason beside it.`,
    );
  const terms = glossary.terms.length;
  return `${terms} term${terms === 1 ? "" : "s"} across ${scope.length} document${scope.length === 1 ? "" : "s"}`;
});

// ---------------------------------------------------------------------------
// 12. The nightly backup.
//
// **A backup is believed, which is why it is checked from outside the job that takes it.** A run
// that goes red sends mail; a run that never happens sends nothing, and the two ways this schedule
// stops without failing are both silent — GitHub disables a scheduled workflow after 60 days of
// repository inactivity, and a schedule only ever runs from the default branch, so an edit that has
// not merged changes nothing while reading as if it had.
//
// So there are two checks. The first is local and always runs: the register promises a schedule and
// a retention, and both are compared against the things that actually implement them. The second
// reads the store and is the one that can say a backup exists, so it needs the credential and
// reports SKIP without it.
//
// **What the second one costs is a read-write token in this job**, and that is argued rather than
// waved through: this job already holds `MIGRATION_DATABASE_URL`, which can drop every table it is
// backing up, and an account-scoped `VERCEL_TOKEN`. A token that can delete backups adds nothing a
// compromised run of this job could not already do, and it buys the only thing that notices a
// backup that stopped happening.
// ---------------------------------------------------------------------------

check("the backup's schedule and retention match what the register promises", () => {
  const documented = parseDocumentedBackup(read(CONTEXT_HOME));
  const scheduled = parseWorkflowCrons(read(BACKUP_WORKFLOW));
  if (!scheduled.includes(documented.cron))
    fail(
      `${CONTEXT_HOME} promises a backup on \`${documented.cron}\` and ${BACKUP_WORKFLOW} is ` +
        `scheduled on ${scheduled.length ? scheduled.map((c) => `\`${c}\``).join(", ") : "nothing"}. ` +
        `A register describing a schedule nothing runs is the failure a backup is most believed through.`,
    );
  if (documented.retentionDays !== RETENTION_DAYS)
    fail(
      `${CONTEXT_HOME} promises ${documented.retentionDays} days of backups and ` +
        `scripts/lib/backup.ts keeps ${RETENTION_DAYS}. The code is what deletes them.`,
    );
  return `\`${documented.cron}\`, kept ${documented.retentionDays} days`;
});

await checkAsync("the backup store holds one no older than the register promises", async () => {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) skip("no BLOB_READ_WRITE_TOKEN, so the backup store was not read");
  const documented = parseDocumentedBackup(read(CONTEXT_HOME));
  const stored = await storedBackups(token);
  const verdict = freshness(stored, new Date(), documented.maxAgeHours);
  if (verdict.overdue) {
    // **A schedule that has never existed cannot have stopped.** A workflow runs on a schedule only
    // from the default branch, so between writing this job and merging it there is a window in
    // which no backup can happen and every push would fail on one not having. That is not a
    // detector working; it is a detector that would block the merge that arms it. So an overdue
    // backup is a finding only once the workflow is actually on `main` - asked here rather than
    // assumed, and a question GitHub cannot answer is itself a reason to skip rather than to fail.
    const landed = attempt("gh", [
      "api",
      `repos/${REPOSITORY}/contents/${BACKUP_WORKFLOW}?ref=main`,
      "--jq",
      ".name",
    ]);
    if (!landed.ok)
      skip(
        `nothing is overdue: ${BACKUP_WORKFLOW} is not on the default branch, so no schedule has ` +
          `ever run - gh said ${explainFailure(landed.output)}`,
      );
    fail(
      verdict.newest
        ? `the newest backup is ${Math.round(verdict.ageHours ?? 0)} hours old, and ` +
            `${CONTEXT_HOME} promises one on \`${documented.cron}\`. Two nights missed means the ` +
            `schedule has stopped rather than slipped — the workflow may have been disabled for ` +
            `inactivity, or the run is failing.`
        : `the backup store holds nothing under \`${BACKUP_PREFIX}\`, and ${CONTEXT_HOME} ` +
            `promises a backup on \`${documented.cron}\`.`,
    );
  }
  return `${stored.length} stored, newest ${Math.round(verdict.ageHours ?? 0)} hours old`;
});

// ---------------------------------------------------------------------------
// 14. Neon's history window.
//
// **The other half of this ticket, and the half that has no code to go stale — which is exactly why
// it needed a check.** A backup is a system somebody would notice breaking; a retention setting is
// one number in a console that nothing here would ever read again. CAN-55's own triage said so
// while the ticket was still being argued: *"If option one is taken, something should assert the
// window is what it is supposed to be, for the same reason."*
//
// **Locally only, and that is a deliberate consequence of where the key lives.** The Neon API key
// can create and destroy databases, so docs/infrastructure.md -> The Neon API key keeps it off
// every runner; a check that reads Neon therefore reports SKIP in CI and compares on a laptop, the
// same reach as the label roster.
// ---------------------------------------------------------------------------

await checkAsync("Neon's history window matches the register", async () => {
  const documented = parseDocumentedRetentionSeconds(read(CONTEXT_HOME));
  let live: number | undefined;
  try {
    const body = (await neonRequest(`/projects/${NEON_PROJECT}`)) as {
      project?: { history_retention_seconds?: number };
    };
    live = body.project?.history_retention_seconds;
  } catch (error) {
    if (error instanceof NeonUnavailable) skip(`cannot read the Neon project: ${error.message}`);
    throw error;
  }
  if (live === undefined) skip("Neon answered without a `history_retention_seconds`, so nothing was compared");
  if (live !== documented)
    fail(
      `${CONTEXT_HOME} records a ${documented}-second history window and Neon is set to ${live}. ` +
        `The window is what a mistake older than one night is recovered from, and nothing else in ` +
        `this repository would notice it changing.`,
    );
  return `${live} seconds, ${live / 86_400} days`;
});

// ---------------------------------------------------------------------------
// 15. The agent baseline the Provider repositories install.
//
// Check 10's failure, in the other half of what a Provider repository inherits. There the string
// that breaks every Provider at once is a status check context; here it is the plugin id, and the
// same thing is true of it: it is written into repositories this checkout cannot see, so nothing
// there reports a rename here and nothing here notices one either.
//
// Two of the strings are worse than a rename, because they fail by *installing*. With the plugin's
// `source` anything but the marketplace root, the documents stop travelling and the plugin still
// installs; with the `skills` path pointing at a directory that has moved, it installs with no
// skills in it. Both read, from the far end, as a plugin that simply carries less than it used to.
//
// Local files throughout, so this never skips. What it does not reach is the far end: no Provider
// repository's `.claude/settings.json` is in this checkout, and a roster of them here would be the
// second copy of a list the organisation already holds - the same reasoning that keeps Provider
// rulesets out of check 10.
//
// **The `${CLAUDE_PLUGIN_ROOT}` half is the one with no other guard at all.** Check 7 follows
// relative markdown links; these are not links, and they resolve against a copy of this repository
// rather than against this repository, so a document moved here leaves a skill pointing at a file
// that is present in every checkout and absent from every payload.
// ---------------------------------------------------------------------------

check("the documented agent baseline matches the manifests", () => {
  const baseline = parseManifests(read(MARKETPLACE_MANIFEST), read(PLUGIN_MANIFEST));
  const problems = compareProviderSettings(
    parseDocumentedProviderSettings(read(CONTEXT_HOME)),
    baseline,
    REPOSITORY,
  );
  // The payload is what makes the documents travel, and `"./"` is the only source that is this
  // repository. ADR-0029 -> Why the payload is the whole repository is the argument.
  if (baseline.source !== "./")
    problems.push(
      `the marketplace's plugin source is "${baseline.source}" rather than "./", so the payload ` +
        `is no longer this repository and every document the skills reach stops travelling`,
    );
  for (const root of skillRoots(baseline))
    if (!existsSync(join(ROOT, root)))
      problems.push(`the plugin manifest adds the skills path "${root}", which does not exist`);
  if (problems.length)
    fail(
      `the agent baseline disagrees with itself:\n${problems.map((p) => `    - ${p}`).join("\n")}\n` +
        `    Every Provider repository committed the block in ${CONTEXT_HOME}, so a disagreement ` +
        `here is one none of them can see.`,
    );
  return `${pluginId(baseline)}, ${baseline.skills.length} skills path${baseline.skills.length === 1 ? "" : "s"}`;
});

check("every ${CLAUDE_PLUGIN_ROOT} path a skill names resolves", () => {
  const baseline = parseManifests(read(MARKETPLACE_MANIFEST), read(PLUGIN_MANIFEST));
  const roots = skillRoots(baseline);
  const skills = source("git", ["ls-files", "*/SKILL.md"], "cannot list tracked files")
    .split("\n")
    .filter(Boolean)
    .filter((path) => roots.some((root) => path.startsWith(`${root}/`)));
  if (!skills.length)
    fail("`git ls-files \"*/SKILL.md\"` matched no skill under the manifest's own skills paths");

  const missing: string[] = [];
  let named = 0;
  for (const skill of skills)
    for (const path of pluginRootPaths(read(skill))) {
      named += 1;
      if (!existsSync(join(ROOT, path))) missing.push(`${skill} → \${CLAUDE_PLUGIN_ROOT}/${path}`);
    }
  if (missing.length)
    fail(
      `paths that resolve to nothing in the payload:\n${missing.map((m) => `    - ${m}`).join("\n")}`,
    );
  return `${named} path${named === 1 ? "" : "s"} across ${skills.length} skills`;
});

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
