// The parsing and comparison behind `scripts/check-docs.ts`.
//
// Everything here is pure: text in, data out, no filesystem and no subprocesses. That is the
// seam — the CLI owns reading files and running `gh`, `orca` and `vercel`; this module owns what
// their output means and how the report of it reads, and is what `doc-checks.test.ts` exercises.

import { posix } from "node:path";

import { parse } from "yaml";

import GithubSlugger from "github-slugger";
import type { Nodes } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";
import { toString } from "mdast-util-to-string";
import { frontmatter } from "micromark-extension-frontmatter";

/** Thrown when a source cannot be reached. The CLI reports these as SKIP rather than FAIL. */
export class Skip extends Error {}

export function skip(why: string): never {
  throw new Skip(why)
}

export function fail(why: string): never {
  throw new Error(why)
}

/** One variable, as either the roster or Vercel describes it. */
type VariableState = {
  environments: Set<string>
  sensitive: boolean
}

const unbacktick = (s: string) => s.replace(/`/g, "").trim();
const setDifference = <T,>(a: Set<T>, b: Set<T>) => [...a].filter((x) => !b.has(x));

const norm = (s: string) =>
  s.replace(/[`*]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

export const setEq = <T,>(a: Set<T>, b: Set<T>) =>
  a.size === b.size && [...a].every((x) => b.has(x));

/**
 * Two sets that should agree, described so the reader can act: what each side holds, and which
 * entries are unique to each. Both roster checks report the same shape, so they share this.
 */
export function describeDisagreement(
  live: Set<string>,
  documented: Set<string>,
  { liveName, docName }: { liveName: string; docName: string },
) {
  return (
    `${liveName} holds [${[...live].sort().join(", ")}] but ${docName} records ` +
    `[${[...documented].sort().join(", ")}]. Only in ${liveName}: ` +
    `[${setDifference(live, documented).join(", ")}]; only in ${docName}: ` +
    `[${setDifference(documented, live).join(", ")}].`
  );
}

/**
 * Why a command failed, in one line fit to show an operator.
 *
 * Taking the first line is the obvious choice and the wrong one, in two different ways, both
 * measured on 13 August 2026 against the CLIs this script runs:
 *
 * - `vercel env ls` with an invalid token puts its `Error:` on the **third** line, behind a
 *   `Vercel CLI 58.7.1 (Node.js 24.19.0)` banner (and, under Claude Code, a plugin marker).
 *   Reading line one reports the tool's version where its reason should be.
 * - `orca linear …` with a bad workspace writes **nothing to stderr** and puts a JSON envelope
 *   on stdout. Reading stderr at all reports nothing.
 *
 * A skip nobody can act on is barely better than a silent one, which is the whole reason skips
 * carry a reason. So: an error envelope if the output is one, else the first line that announces
 * itself as an error, else the first line there is.
 */
export function explainFailure(output: string): string {
  const enveloped = errorFromJson(output);
  if (enveloped) return enveloped;
  const lines = output
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.find((l) => /^(error|fatal)\b/i.test(l)) ?? lines[0] ?? "no output";
}

/** `orca` reports failure as `{ ok: false, error: { message } }` rather than as text. */
function errorFromJson(output: string): string | undefined {
  if (!output.trimStart().startsWith("{")) return undefined;
  try {
    const message = (JSON.parse(output) as { error?: { message?: unknown } })?.error?.message;
    return typeof message === "string" && message.trim() ? message.trim() : undefined;
  } catch {
    return undefined;
  }
}

/** Rows of the first markdown table whose header row contains every column named. */
function parseTable(markdown: string, ...columns: string[]): Record<string, string>[] {
  const lines = markdown.split("\n");
  const head = lines.findIndex(
    (l) => l.trimStart().startsWith("|") && columns.every((c) => l.includes(c)),
  );
  if (head === -1) fail(`no table with columns ${columns.join(", ")}`);
  const cells = (l: string) =>
    l
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
  const names = cells(lines[head]);
  const rows: Record<string, string>[] = [];
  for (let i = head + 2; i < lines.length; i++) {
    if (!lines[i].trimStart().startsWith("|")) break;
    const values = cells(lines[i]);
    rows.push(Object.fromEntries(names.map((n, j) => [n, values[j] ?? ""])));
  }
  if (rows.length === 0) fail(`table with columns ${columns.join(", ")} has no rows`);
  return rows;
}

/** One job in a workflow: the check name it reports, and what it calls. */
export type WorkflowJob = { id: string; display: string; uses?: string };

/**
 * The jobs a workflow declares, in order.
 *
 * GitHub's rule is that a job's check context is its `name:`, falling back to the job **id** when
 * none is set ("the name format is `<job name>`"), so both are read here: deleting a job's name
 * silently renames a required status check, which blocks every merge for ever, and the caller has
 * to be told the new context rather than that the workflow looks broken.
 *
 * **Parsed as YAML rather than walked line by line**, because one caller reads a workflow this
 * repository does not own. `provider-baseline.ts` reads `.github/workflows/ci.yml` out of a
 * Provider repository, where the layout is the Provider's own: any consistent indentation is valid
 * YAML, and a hand-rolled walk keyed to this repository's two-space style would report a
 * differently indented file as one with no jobs in it at all.
 */
export function parseWorkflowJobs(source: string, what = "the workflow"): WorkflowJob[] {
  let document: unknown;
  try {
    document = parse(source);
  } catch (err) {
    fail(`${what} is not valid YAML: ${(err as Error).message}`);
  }
  const jobs =
    typeof document === "object" && document !== null
      ? (document as { jobs?: unknown }).jobs
      : undefined;
  if (typeof jobs !== "object" || jobs === null) fail(`${what} declares no \`jobs:\` block`);
  return Object.entries(jobs as Record<string, unknown>).map(([id, job]) => {
    const declared = (typeof job === "object" && job !== null ? job : {}) as Record<string, unknown>;
    const named = typeof declared.name === "string" ? declared.name : undefined;
    return {
      id,
      display: named ?? id,
      uses: typeof declared.uses === "string" ? declared.uses : undefined,
    };
  });
}

/** The check context each job in a workflow emits, in order. */
export function parseCiJobNames(source: string): string[] {
  const contexts = parseWorkflowJobs(source).map((job) => job.display);
  if (contexts.length === 0) fail("the workflow declares no jobs");
  return contexts;
}

/** The required-context table in the register: what each context is and where it comes from. */
export function parseDocumentedContexts(markdown: string) {
  return parseTable(markdown, "Context", "Source").map((r) => ({
    context: unbacktick(r.Context),
    source: unbacktick(r.Source),
  }));
}

/** Every label the roster names, across both role tables plus the unmapped one. */
export function parseDocumentedLabels(markdown: string): Set<string> {
  const column = "Label in our tracker";
  const stateRoles = markdown.indexOf("**State roles**");
  if (stateRoles === -1) fail("the roster has no **State roles** heading");
  const labels = new Set(
    parseTable(markdown, column)
      .concat(parseTable(markdown.slice(stateRoles), column))
      .map((r) => unbacktick(r[column]))
      .filter(Boolean),
  );
  // Recorded in the same file as present in the tracker but deliberately carrying no role.
  for (const m of markdown.matchAll(/\*\*Unmapped:\*\*\s*Linear's\s*`([^`]+)`/g)) labels.add(m[1]);
  return labels;
}

export function parseLinearLabels(rawJson: string): Set<string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    skip(`could not parse the tracker's JSON: ${(err as Error).message}`);
  }
  const labels = (parsed as { result?: { labels?: { name: string }[] } })?.result?.labels;
  if (!Array.isArray(labels)) skip("the tracker returned no labels array");
  return new Set(labels.map((l) => l.name));
}

// The roster's four columns, named once. The three readers below partition the same rows on the
// same two predicates, so a column renamed in one and not the others would silently make them
// overlap or leave a gap — and the trio's whole value is that together they account for every row.
const rosterRows = (markdown: string) =>
  parseTable(markdown, "Variable", "Holder", "Environments", "Sensitivity");

// Which source can speak for a row, read off its Holder. Both are case-sensitive substring
// tests, and that is the one failure mode this arrangement still has: a Holder reading
// `Vercel (provider-tmdb)` would be pulled into the comparison against `canoncore` and leave the
// unchecked list at the same moment. docs/infrastructure.md → What this check compares, and what
// it cannot says so where a row gets written.
const heldByVercel = (holder: string) => holder.includes("Vercel");
const heldByActions = (holder: string) => holder.includes("GitHub Actions");

/** The Vercel-held rows of the variable roster. */
export function parseDocumentedVariables(markdown: string): Map<string, VariableState> {
  return new Map(
    rosterRows(markdown)
      .filter((r) => heldByVercel(r.Holder))
      .map((r) => [
        unbacktick(r.Variable),
        {
          environments: new Set(
            r.Environments.split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          ),
          sensitive:
            /\bSensitive\b/i.test(r.Sensitivity) && !/Non-sensitive/i.test(r.Sensitivity),
        },
      ]),
  );
}

/**
 * The GitHub-Actions-held rows of the variable roster. Under CAN-109 Decide whether the label
 * roster check needs enforcing, or is honest as it stands these stopped being unchecked prose and
 * came under comparison — on a laptop, which is as far as a keyless route reaches.
 * docs/infrastructure.md → What this check compares, and what it cannot has the argument.
 */
export function parseActionsSecrets(markdown: string): Set<string> {
  return new Set(
    rosterRows(markdown)
      .filter((r) => heldByActions(r.Holder))
      .map((r) => unbacktick(r.Variable)),
  );
}

/**
 * The roster rows this project documents but cannot verify: those held where neither reader
 * above looks, which since ADR-0014 means a Provider's own Vercel project. The two filters are
 * silent — the checks would otherwise report agreement across a roster they had only partly
 * read. Naming what is left over is what keeps the blind spot visible on every run, so the
 * roster's own claim about its reach can be trusted.
 */
export function parseUncheckedVariables(markdown: string): string[] {
  return rosterRows(markdown)
    .filter((r) => !heldByVercel(r.Holder) && !heldByActions(r.Holder))
    .map((r) => unbacktick(r.Variable));
}

/**
 * Secret names, one per line, as `gh secret list --json name --jq '.[].name'` prints them. Only
 * names, because a secret has no other property anyone can read back — so this catches a secret
 * set but undocumented, or documented but never set, and cannot catch a stale value.
 */
export function parseSecretNames(raw: string): Set<string> {
  return new Set(
    raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
}

// --- The release token ------------------------------------------------------------------------
//
// Reissuing a Vercel token leaves the one it replaced live until somebody revokes it, so a name
// can be carried by more than one unexpired token — as this one was, from 14 to 16 August 2026.
// A check matching on the name alone would have picked whichever it read first and called that
// agreement, which is why the comparison is anchored to last use instead.
// docs/infrastructure.md → Why this one is account-scoped holds the rows and the argument.

export type ReleaseTokenRow = { name: string; scope: string; expires: string; live: boolean };

/**
 * Every token the register says has held the release name, the live one included. `State` stays
 * prose because a reader needs the sentence and not a flag; the check reads only whether it opens
 * with **Live**, so a row demoted to history leaves the comparison by being rewritten as one.
 */
export function parseDocumentedReleaseTokens(markdown: string): ReleaseTokenRow[] {
  return parseTable(markdown, "Token", "Scope", "Expires", "State").map((r) => ({
    name: unbacktick(r.Token),
    scope: r.Scope,
    expires: unbacktick(r.Expires),
    live: /\*\*Live\b/.test(r.State),
  }));
}

export type VercelToken = {
  id: string;
  name: string;
  expiresAt: number | null;
  activeAt: number | null;
  projectOnly: boolean;
};

/**
 * `vercel tokens ls --json` as the CLI prints it, down to the fields this check reads. Anything
 * it cannot read is a Skip rather than a failure, the rule the tracker's labels state: a source
 * whose format moved, or that refused, must not read as a source that disagreed.
 */
export function parseVercelTokens(rawJson: string): VercelToken[] {
  const start = rawJson.indexOf("{");
  if (start === -1) skip("`vercel tokens ls` printed no JSON object");
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson.slice(start));
  } catch (err) {
    skip(`could not parse the token listing: ${(err as Error).message}`);
  }
  const tokens = (parsed as { tokens?: unknown })?.tokens;
  if (!Array.isArray(tokens)) skip("the token listing carried no tokens array");
  return tokens.map((t) => {
    const row = t as Record<string, unknown>;
    return {
      id: typeof row.id === "string" ? row.id : "",
      name: typeof row.name === "string" ? row.name : "",
      expiresAt: typeof row.expiresAt === "number" ? row.expiresAt : null,
      activeAt: typeof row.activeAt === "number" ? row.activeAt : null,
      // Vercel's own marker for the narrowest scope the dashboard offers: one project inside one
      // team. Why this is reported and never failed on is argued once, where the check is:
      // scripts/check-docs.ts, above `the release token's expiry matches Vercel`.
      projectOnly: row.scope === "project-only",
    };
  });
}

/**
 * Which token of a name is the one in use: the one Vercel last saw used. Creation order cannot
 * answer it — a replacement is newer, but so is a token minted and never wired up — and neither
 * can expiry, since a replaced token goes on being unexpired until somebody revokes it.
 */
export function lastUsedTokenNamed(tokens: VercelToken[], name: string): VercelToken | undefined {
  return tokens
    .filter((t) => t.name === name)
    .sort((a, b) => (b.activeAt ?? 0) - (a.activeAt ?? 0))[0];
}

/** An expiry as the register writes it: UTC, day precision — or `never`, which a token may be. */
export const expiryDay = (ms: number | null): string =>
  ms === null ? "never" : new Date(ms).toISOString().slice(0, 10);

// --- The security settings --------------------------------------------------------------------
//
// Seven rows in three places, and no one call reaches them all: five are fields of
// `security_and_analysis`, Dependabot alerts are a status code of their own, and the dependency
// graph has no read-back field anywhere — the SBOM endpoint's answer stands in for it.
// docs/infrastructure.md → Dependency and secret scanning holds the rows and the three calls.

/** Which of the three calls can answer a row, read off the source the roster names beside it. */
type SecuritySource =
  | { kind: "analysis"; field: string }
  | { kind: "alerts" }
  | { kind: "graph" }

/** One row of the security-settings roster: what it records, and what can read it back. */
export type SecuritySettingRow = { setting: string; enabled: boolean; source: SecuritySource }

/**
 * Which call answers a row, read off the source the roster writes beside it rather than off a list
 * kept here. A row moved to a different source is then followed by the check, where a list here
 * would go on comparing it against the one it used to have.
 */
const SECURITY_CALLS = {
  analysis: "`security_and_analysis.<field>.status`",
  alerts: "`vulnerability-alerts`",
  graph: "`dependency-graph/sbom`",
} as const;

function securitySourceOf(setting: string, readBackBy: string): SecuritySource {
  const field = readBackBy.match(/security_and_analysis\.([a-z_]+)\.status/);
  if (field) return { kind: "analysis", field: field[1] };
  if (readBackBy.includes("vulnerability-alerts")) return { kind: "alerts" };
  if (readBackBy.includes("dependency-graph/sbom")) return { kind: "graph" };
  fail(
    `the security roster's ${setting} row names no source this check can read: "${readBackBy}". ` +
      `A row is compared against one of ${Object.values(SECURITY_CALLS).join(", ")}.`,
  );
}

/** The security-settings roster: every row's state, and which call speaks for it. */
export function parseDocumentedSecuritySettings(markdown: string): SecuritySettingRow[] {
  const rows = parseTable(markdown, "Setting", "State", "Read back by").map((r) => {
    const setting = unbacktick(r.Setting);
    const state = norm(r.State);
    // A state that is neither is a row nothing can compare, and it decides on the document alone,
    // so it fails where `gh` is unreachable too.
    if (state !== "enabled" && state !== "disabled")
      fail(
        `the security roster records ${setting} as "${r.State.trim()}", which is neither ` +
          "**enabled** nor disabled, so there is nothing to compare the repository against.",
      );
    return { setting, enabled: state === "enabled", source: securitySourceOf(setting, r["Read back by"]) };
  });
  // Every one of the three calls has to be named by a row. Two of them speak for a single row
  // each, so deleting that row takes its whole source out of the check — and what is left agrees,
  // which reads from the report exactly like seven rows having been compared. The
  // `security_and_analysis` half is covered the other way round, by the mirror in
  // `compareSecuritySettings`; these two have nothing to be missing from.
  const named = new Set(rows.map((r) => r.source.kind));
  const absent = Object.entries(SECURITY_CALLS).filter(([kind]) => !named.has(kind as never));
  if (absent.length)
    fail(
      `the security roster names no row read back from ${absent.map(([, call]) => call).join(", ")}, ` +
        "so that source is compared by nothing. A row is how a setting stays under the check.",
    );
  return rows;
}

/** What a command did, for the calls whose failure is an answer rather than an outage. */
export type Attempt = { ok: boolean; output: string }

/**
 * The HTTP status `gh api` failed with. It prints the status twice and on different streams —
 * `gh: Not Found (HTTP 404)`, and GitHub's own body carrying `"status": "404"` — so either will
 * do, which is what lets the caller hand over whatever it caught without sorting the two out.
 */
export function httpStatus(output: string): number | undefined {
  const matched = output.match(/\(HTTP (\d{3})\)/) ?? output.match(/"status":\s*"(\d{3})"/);
  return matched ? Number(matched[1]) : undefined;
}

/**
 * The five `security_and_analysis` rows.
 *
 * GitHub returns the block only to a caller with admin: *"In order to see the
 * security_and_analysis block for a repository you must have admin permissions for the repository
 * or be an owner or security manager for the organization that owns the repository"* [1]. So an
 * empty answer is a refusal rather than a repository holding no settings — and it is also this
 * check's own proof of entitlement, which the two readers below lean on: both document `404` as
 * their *off*, and a `404` returned to a caller who could not have read them either way is not an
 * answer. Skipping here is therefore what keeps the other two honest, rather than five rows lost
 * out of seven.
 *
 * [1] https://docs.github.com/en/rest/repos/repos#get-a-repository
 */
export function parseSecurityAndAnalysis(raw: string): Map<string, boolean> {
  const text = raw.trim();
  if (!text)
    skip(
      "the repository carried no `security_and_analysis` block, which GitHub returns only to a " +
        "caller with admin on it — so none of the three sources could be read as an answer",
    );
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    skip(`could not parse \`security_and_analysis\`: ${(err as Error).message}`);
  }
  // `null` is valid JSON, and `Object.entries(null)` throws a `TypeError` — which the report
  // classifies FAIL, on the very path that has to SKIP. `gh --jq` happens to print a bare newline
  // for a missing key rather than `null`, so this rests on a guard instead of on that convention.
  if (typeof parsed !== "object" || parsed === null)
    skip(
      `\`security_and_analysis\` came back as ${JSON.stringify(parsed)} rather than a block of ` +
        "settings, so nothing was read back",
    );
  const live = new Map<string, boolean>();
  for (const [field, value] of Object.entries(parsed as Record<string, unknown>)) {
    const status = (value as { status?: unknown } | null)?.status;
    // The source answered and this run cannot read what it said, which is not the unreachable
    // source a SKIP reports. Skipping would claim nothing was reached when something was, and
    // would take all seven rows out of the gate on the one machine where the gate exists — an
    // unknown status is only reachable once admin has been proved, so CI has skipped at the wall
    // long before here. A control over security settings treats what it cannot read as a denial
    // rather than as permission, which is the same refusal the rest of this file makes when it
    // declines to call an unread source agreement.
    if (status !== "enabled" && status !== "disabled")
      fail(
        `\`security_and_analysis.${field}.status\` came back as ${JSON.stringify(status)}, so the ` +
          "roster is not being compared. GitHub's shape for these settings may have moved.",
      );
    live.set(field, status === "enabled");
  }
  // Empty is not agreement, the rule the secret roster states: a block carrying no settings is one
  // this run did not read, and comparing against it would report every row as a setting the
  // repository has dropped.
  if (live.size === 0) skip("`security_and_analysis` carried no settings, so there was nothing to compare");
  return live;
}

/**
 * Dependabot alerts. GitHub documents exactly two answers — *"204 ... if repository is enabled
 * with vulnerability alerts"* and *"404 Not Found if repository is not enabled with vulnerability
 * alerts"* [1] — so the `404` that makes `gh api` exit non-zero is the *off* reading rather than a
 * failure. Anything else was not read, and says so.
 *
 * [1] https://docs.github.com/en/rest/repos/repos#check-if-vulnerability-alerts-are-enabled-for-a-repository
 */
export function readVulnerabilityAlerts(attempt: Attempt): boolean {
  if (attempt.ok) return true;
  if (httpStatus(attempt.output) === 404) return false;
  skip(`could not read \`vulnerability-alerts\`: ${explainFailure(attempt.output)}`);
}

/**
 * The dependency graph, which has no read-back field of its own: it is absent from
 * `security_and_analysis`, and the SBOM endpoint stands in for it — `404` while off, and a package
 * count while on, which is **two** readings rather than one. `enabled` is whether it answered;
 * `indexed` is whether the count is more than the repository's own entry. A graph can be the first
 * without being the second, and that pair is the whole of why this returns three fields.
 *
 * A `404` is also what an endpoint nobody may read can answer, and telling those apart is the
 * whole difficulty. What separates them sits upstream rather than in the response: reaching this
 * function at all means the caller held admin on the repository, since `parseSecurityAndAnalysis`
 * skips the check otherwise, and admin is *"at least read access to the repository"* [1] several
 * times over. So a `404` arriving here is the graph being off — which is also the only way it has
 * been observed, the endpoint having answered `404` while off and a package count once on
 * (docs/infrastructure.md → Dependency and secret scanning). Where the admin proof is missing the
 * check has already skipped, saying so.
 *
 * The status list on [1] cannot settle it either way: it names `403 Forbidden` and `404 Resource
 * not found` without saying which a refusal takes, so anything that is not a `404` is unread here
 * rather than diagnosed.
 *
 * **`indexed` is the second reading, and `enabled` does not carry it.** A count of one is the
 * package the SPDX document describes — the repository itself — and no dependency at all: the
 * graph is on, has parsed no manifest, and leaves Dependabot alerts matching against nothing. That
 * is the blindness docs/incidents.md → Dependabot alerts were enabled and blind is about, arriving
 * **without** the `404` that made it legible there, so nothing in the status separates the two.
 *
 * **That the self entry is always present is observed rather than documented**, and the threshold
 * rests on it. [1] describes the `packages` array without saying whether the repository is one of
 * them; what was read is the `SPDXRef-DOCUMENT … DESCRIBES` relationship pointing at a package
 * named for the repository, on `provider-tmdb` and on CanonCore, 21 August 2026 — the first
 * answering `1` package and `totalCount: 0` manifests, the second `781` and `8`.
 *
 * **What being wrong about it costs is the caller's to decide, and the two callers decided
 * differently**: `provision-provider-repository.ts` skips, `check-docs.ts` fails. So this is not a
 * conservative reading that can only under-report — on an established repository a wrong assumption
 * here is a red check. Each caller says why it chose what it did; what this function owes them is
 * the reading, not the verdict.
 *
 * [1] https://docs.github.com/en/rest/dependency-graph/sboms
 */
export function readDependencyGraph(attempt: Attempt): {
  enabled: boolean;
  indexed: boolean;
  packages: number;
} {
  if (!attempt.ok) {
    if (httpStatus(attempt.output) === 404) return { enabled: false, indexed: false, packages: 0 };
    skip(`could not read \`dependency-graph/sbom\`: ${explainFailure(attempt.output)}`);
  }
  // `Number("")` is `0`, so the emptiness has to be caught before the parse rather than by it:
  // an answer nobody read would otherwise report the graph enabled and holding nothing.
  //
  // Failing rather than skipping for the same reason as the status above: `attempt` came back
  // `ok`, so the endpoint answered, and a body this cannot read is a shape that moved rather than
  // a source that was out of reach.
  const answer = attempt.output.trim();
  const packages = Number(answer);
  if (!answer || !Number.isInteger(packages))
    fail(
      `\`dependency-graph/sbom\` answered "${answer}" where a package count was expected, so the ` +
        "graph's row is not being compared. The SBOM payload's shape may have moved.",
    );
  return { enabled: true, indexed: packages > 1, packages };
}

/** The three sources' answers, named as the roster's own Read back by column names them. */
export type LiveSecuritySettings = {
  analysis: Map<string, boolean>
  alerts: boolean
  graph: boolean
}

const stateWord = (enabled: boolean) => (enabled ? "enabled" : "disabled");

/** Roster against repository. Returns a list of human-readable problems; empty means agreement. */
export function compareSecuritySettings(
  documented: SecuritySettingRow[],
  live: LiveSecuritySettings,
): string[] {
  const problems: string[] = [];
  const named = new Set<string>();
  for (const row of documented) {
    let actual: boolean;
    if (row.source.kind === "analysis") {
      named.add(row.source.field);
      const status = live.analysis.get(row.source.field);
      if (status === undefined) {
        problems.push(
          `${row.setting} is read back from \`security_and_analysis.${row.source.field}.status\`, ` +
            "which the repository does not carry",
        );
        continue;
      }
      actual = status;
    } else {
      actual = row.source.kind === "alerts" ? live.alerts : live.graph;
    }
    if (actual !== row.enabled)
      problems.push(
        `${row.setting}: the roster records ${stateWord(row.enabled)}, the repository has ` +
          `${stateWord(actual)}`,
      );
  }
  // A setting the repository carries and the roster does not is the mirror of a secret set but
  // undocumented, and it is the harder one to notice: the roster's claim is that "off" here is a
  // decision rather than a gap, and that only holds while it names every setting there is.
  for (const field of live.analysis.keys())
    if (!named.has(field))
      problems.push(
        `\`security_and_analysis.${field}.status\` is a setting the repository carries and the ` +
          "roster does not record, so whether it is off by decision or by omission is unsaid",
      );
  return problems;
}

const ENVIRONMENTS = /Production|Preview|Development/g;
// A row of `vercel env ls`: leading space, the name, a value column, the sensitivity, the
// environments. The name matches what Vercel itself accepts, not the all-capitals convention
// this project happens to follow: a name the parser cannot see is one the roster check cannot
// report as missing, which is a silent hole in "one complete roster".
const ENV_ROW =
  /^\s+([A-Za-z_][A-Za-z0-9_]*)\s+\S.*?\s+(Sensitive|Non-sensitive|Encrypted|Plain)\s+(.+?)\s*$/;
// Anything shaped like a row — indented identifier, column gap, more content — so that a row
// the parser cannot read is caught rather than skipped past. The listing's own header has that
// shape too, hence the exclusion; its footer lines are unindented and never match.
const ENV_ROW_CANDIDATE = /^\s+[A-Za-z_][A-Za-z0-9_]*\s{2,}\S/;
const ENV_HEADER = /^\s+name\s{2,}value\s{2,}type\b/;

/** Strip OSC 8 hyperlinks and SGR colour, which the CLI emits even when not a TTY. */
function stripTerminalMarkup(raw: string): string {
  return raw.replace(/\x1b?\]8;;[^\x07\x1b]*(?:\x07|\x1b\\)?/g, "").replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * `vercel env ls` output as a Map of name to {environments, sensitive}. One variable can occupy
 * several rows (one per environment), so rows are merged rather than replaced.
 */
export function parseVercelEnv(raw: string): Map<string, VariableState> {
  const plain = stripTerminalMarkup(raw);
  const live = new Map<string, VariableState>();
  const unreadable: string[] = [];
  for (const line of plain.split("\n")) {
    if (!line.trim() || ENV_HEADER.test(line)) continue;
    const m = line.match(ENV_ROW);
    if (!m) {
      if (ENV_ROW_CANDIDATE.test(line)) unreadable.push(line.trim());
      continue;
    }
    const [, name, sensitivity, rest] = m;
    const entry = live.get(name) ?? { environments: new Set<string>(), sensitive: false };
    for (const e of rest.match(ENVIRONMENTS) ?? []) entry.environments.add(e);
    entry.sensitive ||= sensitivity === "Sensitive";
    live.set(name, entry);
  }
  // Half a listing is worse than none: the roster check would report agreement it never
  // established. Stop rather than compare, and say which line stopped it.
  if (unreadable.length)
    skip(
      `\`vercel env ls\` produced ${unreadable.length} row(s) this parser cannot read, so the ` +
        `comparison would be against a partial listing — its output format may have moved. ` +
        `First: "${unreadable[0]}"`,
    );
  return live;
}

/** Roster against reality. Returns a list of human-readable problems; empty means agreement. */
export function compareVariables(
  documented: Map<string, VariableState>,
  live: Map<string, VariableState>,
  home: string,
): string[] {
  const problems: string[] = [];
  for (const [name, want] of documented) {
    const got = live.get(name);
    if (!got) {
      problems.push(`${name} is documented but Vercel does not hold it`);
      continue;
    }
    if (!setEq(want.environments, got.environments))
      problems.push(
        `${name}: documented for [${[...want.environments].join(", ")}], Vercel has ` +
          `[${[...got.environments].sort().join(", ")}]`,
      );
    if (want.sensitive !== got.sensitive)
      problems.push(
        `${name}: documented ${want.sensitive ? "Sensitive" : "Non-sensitive"}, Vercel has ` +
          `${got.sensitive ? "Sensitive" : "Non-sensitive"}`,
      );
  }
  for (const name of live.keys())
    if (!documented.has(name)) problems.push(`${name} is set on Vercel but missing from ${home}`);
  return problems;
}

/**
 * GitHub's heading slugs for a document, plus the normalised titles a prose pointer can name.
 *
 * GitHub slugs the *rendered* heading: "markup formatting is removed, leaving only the contents",
 * and "any other whitespace or punctuation characters are removed" [1]. So this renders first and
 * slugs second, leaving each half to a library — `mdast-util-to-string` for what a heading renders
 * to, and `github-slugger`, whose "overall goal … is to emulate the way GitHub handles generating
 * markdown heading anchors as close as possible" [2]. That last is a third party's claim of parity
 * rather than GitHub's own code, and it is the residual risk here; it is a far smaller one than
 * what it replaced.
 *
 * What it replaced is CAN-87 check-docs slugs the raw heading, not the rendered one, so three kinds
 * of heading get an anchor GitHub will not resolve. Deleting characters from the raw line
 * approximated rendering, and where the approximation broke, the check did not miss a broken
 * anchor — it *required* one, because the only spelling that satisfied it was the spelling GitHub
 * will not resolve. No strip closes that class, which is why the fix is a parser and not a better
 * regex: `_Helpful_` and `neondb_owner` differ only in what rendering does to them, since GitHub
 * drops the first pair as markup and keeps the second as content, which is why `ERR_ACCESS_DENIED`
 * in nodejs/node's `doc/api/errors.md` anchors as `#err_access_denied` [3]. Any rule written about
 * `_` alone gets one of the two wrong, and CAN-82 check-docs requires a heading anchor GitHub will
 * not resolve, for any heading with an underscore took that trade deliberately. There is now
 * nothing to trade.
 *
 * What a heading renders to is `rendered`, which is also what a pointer's section name is read
 * with, so the two sides of that comparison cannot drift apart.
 *
 * The parser also settles what counts as a heading, which the `^#` line match it replaced could
 * only guess at: a `#` comment inside a fenced code block is not one (six were being read as
 * headings here, each a title a `file → *Section*` pointer could falsely resolve against), a
 * heading inside a blockquote is, and YAML frontmatter is frontmatter rather than the setext
 * heading its closing `---` makes of it without that extension.
 *
 * The slugger is per document rather than per heading because tracking the `-1`/`-2` suffix GitHub
 * gives a repeated heading is exactly what the instance is for.
 *
 * `titles` is rendered, and so is the pointer it is compared against, since CAN-119 Close
 * check-docs's two silent pointer holes gave `findPointers` the same parser. A pointer written
 * `→ *An _emphasised_ word*` therefore resolves against the heading it names, which the raw-prose
 * section name it replaced would have called broken.
 *
 * [1] https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax
 * [2] https://github.com/Flet/github-slugger#readme
 * [3] https://github.com/nodejs/node/blob/9e23066b8af4d1661c30ebb9179fad86430d6503/doc/api/errors.md
 */
export function anchorsOf(body: string): { anchors: Set<string>; titles: string[] } {
  const slugger = new GithubSlugger();
  const anchors = new Set<string>();
  const titles: string[] = [];
  for (const node of descendants(parseMarkdown(body).children)) {
    if (node.type !== "heading") continue;
    const text = rendered(node);
    titles.push(norm(text));
    anchors.add(slugger.slug(text));
  }
  return { anchors, titles };
}

/**
 * What a node renders to, which is what both a heading's anchor and a pointer's section name are
 * built from.
 *
 * Both `toString` options are off because both defaults treat markup as contents, which is the same
 * mistake one layer down: `includeHtml` would put a literal `<kbd>` into the slug where GitHub puts
 * only what the element wraps, and `includeImageAlt` would slug an `alt` attribute, which is not
 * contents at all.
 */
const rendered = (node: Nodes) => toString(node, { includeHtml: false, includeImageAlt: false });

const parseMarkdown = (body: string) =>
  fromMarkdown(body, {
    extensions: [frontmatter()],
    mdastExtensions: [frontmatterFromMarkdown()],
  });

/**
 * Every run of siblings in the tree, so that a check can read what precedes a node — which is what
 * a pointer needs, since the document it names is the node before the arrow.
 */
function* siblingRuns(nodes: readonly Nodes[]): Generator<readonly Nodes[]> {
  yield nodes;
  for (const node of nodes) if ("children" in node) yield* siblingRuns(node.children);
}

/** Every node in document order, including any nested in a blockquote or a list item. */
function* descendants(nodes: readonly Nodes[]): Generator<Nodes> {
  for (const run of siblingRuns(nodes)) yield* run;
}

// Every node `fromMarkdown` produces carries a position; the type admits none because the field
// "must not be present if a node is generated" [1], which is a tree built by hand rather than read.
//
// [1] https://github.com/syntax-tree/unist#position
const lineOf = (node: Nodes) => node.position?.start.line ?? 0;

type DocumentLink = {
  link: string
  path: string
  fragment: string | undefined
  line: number
}

/**
 * Relative markdown links, with their line numbers. Absolute URLs are skipped, and so are
 * site-absolute paths, which name a route on the deployed site rather than a file in the repo.
 *
 * Parsed rather than matched, for the reason the note on `anchorsOf` gives: the `](…)` match this
 * replaced required a destination holding no whitespace, and a destination is "a sequence of zero
 * or more characters between an opening `<` and a closing `>`" *or* "a nonempty sequence of
 * characters that does not start with `<`, does not include ASCII control characters or space
 * character" [1]. So `[a](<a file.md>)` and `[a](file.md "a title")` are both links it could not
 * see and passed over in silence, while `[a](a file.md)` is not a link at all and so was never
 * there to reject. A parser answers all three the way GitHub does.
 *
 * It also settles two shapes the match could only guess at: a link inside a code fence is an
 * example rather than a link, and a reference definition (`[gates]: docs/agents/workflow.md`) is
 * a destination even though it carries no `](`.
 *
 * [1] https://spec.commonmark.org/0.31.2/#links
 */
export function findLinks(body: string): DocumentLink[] {
  const found: DocumentLink[] = [];
  for (const node of descendants(parseMarkdown(body).children)) {
    if (node.type !== "link" && node.type !== "image" && node.type !== "definition") continue;
    if (/^(https?:|mailto:|\/)/.test(node.url)) continue;
    const [path, fragment] = node.url.split("#");
    found.push({ link: node.url, path, fragment, line: lineOf(node) });
  }
  return found;
}

/**
 * What a pointer names as its document. The kind travels with the value because the three forms
 * resolve differently: a link target is relative to the document citing it, a filename written in
 * prose is from the repository root, and an ADR number names no file at all.
 */
export type PointerTarget =
  | { kind: "link"; value: string }
  | { kind: "name"; value: string }
  | { kind: "adr"; value: string }

type DocumentPointer = {
  target: PointerTarget
  section: string
  display: string
  line: number
}

// A document named in the prose that runs up to the arrow, either as a filename or as an ADR by
// its number, which is how one live pointer names ADR-0005 without naming a file.
const NAMED_BEFORE_ARROW = /(?:^|[\s(])(?:([A-Za-z0-9_./-]+\.md)|ADR-(\d{4}))\s*→\s*$/;
// The same arrow with nothing before it but the arrow, which puts the document in the node before.
const BARE_ARROW = /^\s*→\s*$/;

/**
 * Every `document → *Section*` pointer — the shape left behind by CAN-76 Restructure the agent
 * documents: policy, procedure and incidents get their own homes, which replaced the duplication
 * with one owning module and N one-line pointers.
 *
 * Parsed rather than matched for the same reason as `findLinks`, and here the match was losing
 * three live shapes with no FAIL and no SKIP. `[ADR-0014](0014-….md) → *Decision 6*`, the whole
 * supersession chain, because it required the `.md` filename as the link *text*. Then both ways a
 * quoted pointer wraps, because `\s*` cannot cross the `>` that opens the next line: with the wrap
 * before the arrow there was no match at all, and with it inside the name the `>` was matched as
 * part of the heading being named.
 *
 * The parser strips the block marker itself, and renders the name, so a pointer to
 * `*An _emphasised_ word*` now resolves against the heading it names rather than being called
 * broken.
 */
export function findPointers(body: string): DocumentPointer[] {
  const found: DocumentPointer[] = [];
  for (const run of siblingRuns(parseMarkdown(body).children)) {
    for (const [i, node] of run.entries()) {
      if (node.type !== "emphasis") continue;
      const named = documentBefore(run, i);
      if (!named) continue;
      const text = rendered(node);
      found.push({ ...named, section: norm(text), display: text.replace(/\s+/g, " ").trim() });
    }
  }
  return found;
}

/** A pointer's document as its author wrote it, which is what a failure has to quote back. */
export const describeTarget = (target: PointerTarget) =>
  target.kind === "adr" ? `ADR-${target.value}` : target.value;

/**
 * The document named immediately before `run[i]`, or nothing — which is the answer for most
 * arrows. `docs/compliance/code-measures-register.md` maps each duty with `*A section* → *Its
 * subsection*` and `docs/incidents.md` walks a user interface with `Projects → the row's menu →
 * *Update Project Connection*`; both are correct prose naming no document, and reading either as a
 * pointer would fail a run over a file that does not exist because it was never meant to.
 */
function documentBefore(
  run: readonly Nodes[],
  i: number,
): { target: PointerTarget; line: number } | undefined {
  const before = run[i - 1];
  if (before?.type !== "text") return undefined;
  const named = before.value.match(NAMED_BEFORE_ARROW);
  // A name in prose can sit lines above the emphasis within one text node, so of the two the
  // emphasis is the closer line to report. A link or a code span is a node with a line of its own.
  if (named)
    return {
      target: named[1] ? { kind: "name", value: named[1] } : { kind: "adr", value: named[2] },
      line: lineOf(run[i]),
    };
  if (!BARE_ARROW.test(before.value)) return undefined;
  const preceding = run[i - 2];
  if (preceding?.type === "link")
    return { target: { kind: "link", value: preceding.url }, line: lineOf(preceding) };
  if (preceding?.type === "inlineCode" && preceding.value.endsWith(".md"))
    return { target: { kind: "name", value: preceding.value }, line: lineOf(preceding) };
  return undefined;
}

/**
 * The tracked documents a pointer names: none, one, or — where a bare filename is ambiguous —
 * several. Anything but one is a broken pointer, and the caller says which, because nothing else
 * covers it: a bare prose pointer carries no `](…)`, so the link check never sees the file it names.
 *
 * Ambiguity fails rather than guessing. Eight tracked documents here share three names between
 * them, `SKILL.md` alone belonging to four, so first-hit-wins is how a pointer would come to
 * resolve against a document nobody meant — silently, which is the whole complaint.
 *
 * `posix` computes with a path rather than reaching for one, and `/` is the separator git records
 * whatever the platform [1].
 *
 * [1] https://git-scm.com/docs/gitformat-index — "'/' is used as path separator"
 */
export function resolvePointer(
  target: PointerTarget,
  from: string,
  documents: Iterable<string>,
): string[] {
  const docs = [...documents];
  switch (target.kind) {
    case "link": {
      const path = posix.join(posix.dirname(from), target.value.split("#")[0]);
      return docs.filter((d) => d === path);
    }
    // A name carrying a directory is a path from the repository root and has to match one, or a
    // pointer left behind by a move would go on finding the file under its basename. A bare
    // filename names the document wherever it sits, since a pointer names a document rather than a
    // path from the document citing it.
    case "name":
      return target.value.includes("/")
        ? docs.filter((d) => d === target.value)
        : docs.filter((d) => posix.basename(d) === target.value);
    case "adr":
      return docs.filter((d) => d.startsWith(`docs/adr/${target.value}-`));
  }
}

/**
 * Each line of a document, paired with whether a block-level HTML comment owns it.
 *
 * One walk, because two readers need the same answer from opposite sides: what a document costs to
 * load is the lines a comment does *not* own, and the target it publishes is stated in the lines a
 * comment does. Splitting them into two scanners is how the two would come to disagree.
 *
 * Inside a fenced block everything is an example, marker included — and a file explaining its own
 * maintainer comment is the one most likely to quote an unclosed one.
 */
function* classified(body: string): Generator<{ line: string; inComment: boolean }> {
  const lines = body.split("\n");
  // A file ending in a newline has no line after it, and `split` says otherwise.
  if (lines.at(-1) === "") lines.pop();
  let inComment = false;
  let inFence = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!inComment && trimmed.startsWith("```")) {
      inFence = !inFence;
      yield { line, inComment: false };
      continue;
    }
    if (inFence) {
      yield { line, inComment: false };
      continue;
    }
    if (inComment) {
      const closed = trimmed.indexOf("-->");
      if (closed === -1) {
        yield { line, inComment: true };
        continue;
      }
      inComment = false;
      // Text after the close is content, so the line loads despite having started inside.
      yield { line, inComment: trimmed.slice(closed + "-->".length).trim() === "" };
      continue;
    }
    if (!trimmed.startsWith("<!--")) {
      yield { line, inComment: false };
      continue;
    }
    const closed = trimmed.indexOf("-->", "<!--".length);
    if (closed === -1) {
      inComment = true;
      yield { line, inComment: true };
      continue;
    }
    // Opened and closed on one line: block-level only if it left nothing behind.
    yield { line, inComment: trimmed.slice(closed + "-->".length).trim() === "" };
  }
}

/**
 * What a document costs to load, which is not its length on disk.
 *
 * *"Block-level HTML comments (`<!-- maintainer notes -->`) in CLAUDE.md files are stripped before
 * the content is injected into Claude's context"* [1], so a maintainer note is free — and counting
 * it would report a file as over its target while the content actually loaded was under it.
 * `docs/research/document-length-for-agents.md` is where that rests.
 *
 * [1] https://code.claude.com/docs/en/memory
 */
export function loadedLines(body: string): number {
  let loaded = 0;
  for (const { inComment } of classified(body)) if (!inComment) loaded++;
  return loaded;
}

/**
 * The line target the document itself publishes, so the number has one home and the check can never
 * disagree with the file it gates. It is read **only from the maintainer comment**, which is both
 * where it belongs — that part of the file costs nothing to carry — and what stops a sentence
 * elsewhere in the document quietly raising the ceiling.
 *
 * Absent, this fails rather than skipping: the source is a tracked file and so is always reachable,
 * which makes a missing target drift rather than an outage. Defaulting instead would make deleting
 * the comment the cheapest way to pass.
 */
export function parseDocumentedLineTarget(body: string): number {
  const commented = [...classified(body)].filter((l) => l.inComment).map((l) => l.line).join("\n");
  const found = commented.match(/Target:\s*under\s*(\d+)\s*lines/i);
  if (!found)
    return fail(
      "no line target is stated: expected `Target: under N lines` in the document's own comment",
    );
  return Number(found[1]);
}

/** A pointer may shorten a long heading, so a title prefix counts as a resolution. */
export const pointerResolves = (section: string, titles: string[]) =>
  titles.some((t) => t === section || t.startsWith(section));


// --- The glossary's `_Avoid_` lists -------------------------------------------------------------

/** One glossary entry: the concept's own word, what it says, and what its `_Avoid_` list bans. */
type GlossaryTerm = { term: string; definition: string; avoid: string[] }

/** The glossary as this check reads it: every entry, and the phrases the lists do not reach. */
export type Glossary = { terms: GlossaryTerm[]; exempt: string[] }

/** One use of an `_Avoid_` word for the concept it is listed against. */
export type DomainLanguageFinding = {
  line: number
  /** The word as the document wrote it. */
  word: string
  /** The concept whose `_Avoid_` list bans it. */
  term: string
  /** The phrase it was found in, which is what a reader has to be shown to act. */
  quote: string
  /** Why this occurrence is the banned sense rather than another. */
  why: string
}

/**
 * The glossary, read out of the document that holds it.
 *
 * The vocabulary has one home — `CONTEXT.md` — for the reason the line-target check reads its
 * number out of `CLAUDE.md`: a second copy in this file is a copy nobody updates, and the check
 * would then enforce a glossary the project no longer has.
 *
 * An entry stating no `_Avoid_` list fails rather than being passed over. The lists are the whole
 * subject here, so an entry that lost one is a concept this silently stopped enforcing, which is
 * the drift the file exists to catch. Same reasoning for a parse that finds no entries at all:
 * empty is not agreement, it is a glossary this run never read.
 *
 * `definition` is carried for a second reader: `provider-contract.test.ts` asserts that the
 * contract's closed vocabularies are the words the glossary defines, and a second regex over the
 * same document is the drift this whole file exists to catch rather than to create.
 */
export function parseGlossary(markdown: string): Glossary {
  const terms: GlossaryTerm[] = [];
  // `**Term**:` alone on a line opens an entry, which runs to the next one.
  const blocks = markdown.split(/^\*\*([^*\n]+)\*\*:[ \t]*$/m);
  for (let i = 1; i < blocks.length; i += 2) {
    const term = blocks[i].trim();
    const listed = blocks[i + 1].match(/^_Avoid_:[ \t]*(.+)$/m);
    if (!listed) fail(`the glossary entry for ${term} states no \`_Avoid_\` list`);
    terms.push({
      term,
      definition: blocks[i + 1].slice(0, listed.index),
      avoid: listed[1].split(",").map(norm).filter(Boolean),
    });
  }
  if (terms.length === 0)
    fail("no glossary entries were found: expected `**Term**:` lines each carrying `_Avoid_:`");
  const exempt = parseTable(markdown, "Phrase")
    .map((r) => norm(r.Phrase))
    .filter(Boolean);
  return { terms, exempt };
}

/**
 * What the glossary has settled about each of its banned words, which is what decides whether an
 * occurrence can be read as the banned sense at all.
 *
 * - `owners` — which concepts ban the word. **More than one and it is not checkable**: "collection"
 *   is banned for Ordering, for Catalogue and for Ownership, so the glossary has not said which
 *   concept a bare use belongs to and neither can this.
 * - `termWords` — every word the glossary uses inside a term's own name. A banned word among them
 *   is one the glossary also uses *for* a concept, so an occurrence is not evidence of the banned
 *   sense: `source`, `provider`, `entry` and `part` are all of them.
 * - `qualifiers` — a term of the form `<banned word> <another term>`, today *Canonical version*
 *   alone. A word the glossary uses **only to qualify** a term is not a thing in its own right, so
 *   it has no standalone job in the domain and a standalone use is the banned sense. That is what
 *   separates `canonical` from `entry`, `part` and `source`, which the glossary uses as the head
 *   of a term or as a term outright and which therefore do have one.
 */
function settled(glossary: Glossary) {
  const owners = new Map<string, string[]>();
  for (const t of glossary.terms)
    for (const a of t.avoid) owners.set(a, [...(owners.get(a) ?? []), t.term]);
  const byName = new Map(glossary.terms.map((t) => [t.term.toLowerCase(), t.term]));
  const termWords = new Set(glossary.terms.flatMap((t) => t.term.toLowerCase().split(/\s+/)));
  const qualifiers: { word: string; qualified: string; bannedFor: string }[] = [];
  for (const t of glossary.terms) {
    const [first, ...rest] = t.term.toLowerCase().split(/\s+/);
    const qualified = byName.get(rest.join(" "));
    const bannedFor = owners.get(first);
    if (rest.length && qualified && bannedFor?.length === 1)
      qualifiers.push({ word: first, qualified, bannedFor: bannedFor[0] });
  }
  return { owners, termWords, qualifiers };
}

// The determiners a term appears behind when it names something — "a Story", "the Ordering", "one
// Version". Only the ones that cannot themselves be the subject: `another`, `each`, `any` and
// `that` can, so "another lists its episodes" and "a document that lists them" would be read as
// nouns behind them when the word is a verb.
const DETERMINERS = "a an the its their our your his her my one two every no".split(" ");

/** A word as a document may write it. Multi-word entries are phrases and do not inflect. */
function inflections(word: string): string[] {
  if (/\s/.test(word)) return [word];
  if (/[^aeiou]y$/.test(word)) return [word, `${word.slice(0, -1)}ies`];
  if (/(s|x|z|ch|sh)$/.test(word)) return [word, `${word}es`];
  return [word, `${word}s`];
}

/** A term as the glossary writes it in prose, which is how a document naming the concept does. */
const capitalised = (term: string) => term[0].toUpperCase() + term.slice(1);

/** A phrase, matched across the line breaks a document wraps it on. */
const spaced = (phrase: string) => phrase.replace(/\s+/g, "\\s+");

const anyOf = (words: string[]) => words.map(spaced).join("|");

/**
 * A word matched at either case, so that the slots around it can stay case-sensitive. An `i` flag
 * would be simpler and would take the whole pattern with it — including the lowercase-only
 * adjective slot below, which is the one thing separating "one Ordering lists a serial" from a
 * noun behind two adjectives.
 */
const eitherCase = (word: string) => `[${word[0].toLowerCase()}${word[0].toUpperCase()}]${spaced(word.slice(1))}`;

/**
 * One block's prose, in pieces that each know the line they came from.
 *
 * Three things are not prose and are dropped here rather than filtered later. A code span is code:
 * `0014-shell-providers-and-per-source-retention.md` is a filename, not a sentence calling a
 * Provider a source, and it was the largest class of false reading by a wide margin. An `_Avoid_`
 * line **is** one of the lists, and an `_e.g._` line names particular things, which the glossary
 * exempts in terms — so a check reading either as prose fails on the document that defines it.
 * Both markers run to the end of their entry, which is how the glossary is laid out.
 */
function blockProse(block: Nodes): { text: string; line: number }[] {
  const pieces: { text: string; line: number }[] = [];
  let structural = false;
  let startsLine = true;
  const walk = (nodes: readonly Nodes[]) => {
    for (const node of nodes) {
      if (node.type === "inlineCode" || node.type === "code" || node.type === "html") {
        pieces.push({ text: " · ", line: lineOf(node) });
        startsLine = false;
        continue;
      }
      // Only where the glossary puts them: opening a line of their own. The same word mid-sentence
      // is prose, and taking the rest of the paragraph with it would be a hole nothing reports.
      if (node.type === "emphasis" && startsLine) {
        const marker = norm(rendered(node));
        if (marker === "avoid" || marker === "e.g.") {
          structural = true;
          continue;
        }
      }
      if (node.type === "text") {
        if (!structural) pieces.push({ text: node.value, line: lineOf(node) });
        startsLine = node.value.endsWith("\n");
        continue;
      }
      if ("children" in node) walk(node.children);
    }
  };
  walk([block]);
  return pieces;
}

/**
 * Sentences, with where each starts, since the register is decided one sentence at a time.
 *
 * A `|` ends one as surely as a full stop does. Tables are not parsed as tables here — the parser
 * runs on CommonMark, where a table is a paragraph of pipes — so without this a row's cells read as
 * one sentence and, worse, so do the rows above and below it. The register is then whatever any
 * cell in the table happened to name. Every `|` this repository writes in prose is inside a code
 * span, which is dropped before this sees it.
 */
function* sentences(text: string): Generator<{ sentence: string; at: number }> {
  const boundary = /(?<=[.;:!?])\s+|\s*\|\s*/g;
  let at = 0;
  let found: RegExpExecArray | null;
  while ((found = boundary.exec(text))) {
    yield { sentence: text.slice(at, found.index), at };
    at = found.index + found[0].length;
  }
  yield { sentence: text.slice(at), at };
}

/**
 * Every use of an `_Avoid_` word **for the concept it is listed against**, which is the whole
 * difficulty: the lists are per concept rather than a banned-word list, so "collection" is wrong
 * for a Catalogue and right for a media collection, and a check flagging every occurrence would be
 * noise and would be turned off. Measured over this repository's tracked markdown, every listed
 * word and its plural comes to 18,261 occurrences, so "flag them all" is not a gate anyone keeps.
 *
 * Two rules decide it, and each is grounded in something the glossary itself says rather than in a
 * guess about English.
 *
 * **The register rule.** A word counts as used for concept T when the sentence *names* T, by T's
 * own word, cased as the glossary writes it — and when the word is naming something rather than
 * doing another job: behind a determiner, as a term is ("an alias", "a work"), which is what
 * separates a name from a verb ("one Ordering lists a serial") and from a modifier
 * ("source-specific code"). A sentence that never mentions Merge is not a sentence using `alias`
 * for Merge, whatever else it is doing.
 *
 * **The qualifier rule.** `settled` above has it: a word the glossary uses only to qualify a term
 * has no standalone job in the domain, so no register is needed and none is asked for.
 *
 * **What this does not reach**, stated because a gate whose reach is assumed is worse than one
 * whose reach is known. A heading carries no register, so a title using the wrong common noun
 * passes — `docs/adr/0012-…`'s own title did, and was fixed by hand; every heading-scoped rule
 * tried against this repository ran at roughly one genuine finding in thirteen, which is the noise
 * this is built to avoid. A glossary entry's own definition is out too, because `**Term**:` ends a
 * sentence: what a concept *is* — "A named, authored sequence" — is a definition rather than a
 * naming, and the lists ban naming one.
 */
export function findAvoidedWords(body: string, glossary: Glossary): DomainLanguageFinding[] {
  const { owners, termWords, qualifiers } = settled(glossary);
  const found: DomainLanguageFinding[] = [];
  const exempt = glossary.exempt.map((phrase) => new RegExp(spaced(phrase), "gi"));

  for (const block of parseMarkdown(body).children) {
    const pieces = blockProse(block);
    const text = pieces.map((p) => p.text).join("");
    // Which line a character of that text came from: the piece holding it, plus the wraps before it.
    const lineAt = (index: number) => {
      let start = 0;
      for (const piece of pieces) {
        if (index < start + piece.text.length)
          return piece.line + (piece.text.slice(0, index - start).match(/\n/g)?.length ?? 0);
        start += piece.text.length;
      }
      return pieces.at(-1)?.line ?? 0;
    };

    for (const { sentence, at } of sentences(text)) {
      const allowed = (index: number, length: number) =>
        exempt.some((phrase) => {
          phrase.lastIndex = 0;
          for (const hit of sentence.matchAll(phrase))
            if (hit.index <= index && index + length <= hit.index + hit[0].length) return true;
          return false;
        });
      const report = (hit: { index: number; word: string; quote: string }, rest: Omit<DomainLanguageFinding, "line" | "quote" | "word">) => {
        if (allowed(hit.index, hit.word.length)) return;
        found.push({
          ...rest,
          word: hit.word,
          quote: hit.quote.replace(/\s+/g, " ").trim(),
          line: lineAt(at + hit.index),
        });
      };

      for (const { word, qualified, bannedFor } of qualifiers) {
        // The qualified term is the word doing its one legitimate job, so it is not a use at all.
        const standalone = new RegExp(
          `\\b(${word})\\b(?!\\s+(?:${anyOf(inflections(qualified))})\\b)(\\s+\\S+)?`,
          "gi",
        );
        for (const hit of sentence.matchAll(standalone))
          report(
            { index: hit.index, word: hit[1], quote: hit[0] },
            {
              term: bannedFor,
              why: `the glossary uses \`${word}\` only to qualify ${qualified}, so it names nothing on its own`,
            },
          );
      }

      const named = glossary.terms.filter((t) =>
        new RegExp(`\\b(?:${anyOf(inflections(t.term).map(capitalised))})\\b`).test(sentence),
      );
      for (const { term, avoid } of named)
        for (const word of avoid) {
          // Banned by more than one concept, or a word the glossary also uses for a concept of its
          // own — either way the glossary has left a second reading open, and so must this.
          if ((owners.get(word)?.length ?? 0) !== 1) continue;
          if (word.split(/\s+/).some((part) => termWords.has(part))) continue;
          const naming = new RegExp(
            `\\b(?:${DETERMINERS.map(eitherCase).join("|")})\\s+(?:[a-z][a-z-]*\\s+){0,2}` +
              `(${inflections(word).map(eitherCase).join("|")})\\b`,
            "g",
          );
          for (const hit of sentence.matchAll(naming)) {
            // The frame's own start is the determiner; the word is what the exemptions cover.
            const wordAt = sentence.toLowerCase().indexOf(hit[1].toLowerCase(), hit.index);
            report(
              { index: wordAt, word: hit[1], quote: hit[0] },
              { term, why: `the sentence names ${term}, whose \`_Avoid_\` list holds it` },
            );
          }
        }
    }
  }
  return found;
}


// ---------------------------------------------------------------------------------------------
// The report.
//
// A check that skips reads, from the green tick on the run, exactly like a check that passed —
// the weakness CAN-109 Decide whether the label roster check needs enforcing, or is honest as it
// stands was opened to settle. Two of the sources this script reads cannot be reached from every
// place it runs, so what the run actually compared has to be legible without opening a log.
// ---------------------------------------------------------------------------------------------

/** One check's outcome: what it was, how it went, and what it read to decide. */
export type Result = { name: string; status: "PASS" | "SKIP" | "FAIL"; detail: string };

/** The tally both the console report and the job summary end with, so the two cannot disagree. */
export function tally(results: Result[]): string {
  const failed = results.filter((r) => r.status === "FAIL").length;
  const skipped = results.filter((r) => r.status === "SKIP").length;
  return (
    `${results.length - failed - skipped} passed, ${skipped} skipped, ${failed} failed` +
    (skipped ? "  (a skipped check reached no source; it is not a pass)" : "")
  );
}

/**
 * The same report as markdown, for `$GITHUB_STEP_SUMMARY`. It renders on the run's own page, so
 * a reader can see which rows were compared and which were skipped without opening the log —
 * which is the only place the reach of a run was previously recorded.
 */
export function renderJobSummary(results: Result[]): string {
  const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
  return [
    "### The documents, checked against the sources they describe",
    "",
    "| | Check | What it read |",
    "| --- | --- | --- |",
    ...results.map((r) => `| ${r.status} | ${cell(r.name)} | ${cell(r.detail)} |`),
    "",
    `**${tally(results)}**`,
    "",
  ].join("\n");
}
