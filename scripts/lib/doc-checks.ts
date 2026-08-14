// The parsing and comparison behind `scripts/check-docs.ts`.
//
// Everything here is pure: text in, data out, no filesystem and no subprocesses. That is the
// seam — the CLI owns reading files and running `gh`, `orca` and `vercel`; this module owns
// what their output means, and is what `doc-checks.test.ts` exercises.

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

/**
 * The check context each job in a workflow emits, in order.
 *
 * GitHub's rule is that the context is the job's `name:`, falling back to the job **id** when
 * none is set ("the name format is `<job name>`"). That fallback is why this walks the `jobs:`
 * block rather than grepping for `name:`: deleting a job's name silently renames the required
 * status check, which blocks every merge for ever, and the caller has to be told the new
 * context rather than that the workflow looks broken.
 */
export function parseCiJobNames(yaml: string): string[] {
  const lines = yaml.split("\n");
  const start = lines.findIndex((l) => /^jobs:/.test(l));
  if (start === -1) fail("the workflow has no `jobs:` block");

  const contexts: string[] = [];
  let id: string | null = null;
  let name: string | null = null;
  const flush = () => {
    if (id) contexts.push(name ?? id);
    id = null;
    name = null;
  };
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break; // a new top-level key ends the jobs block
    const job = line.match(/^ {2}([A-Za-z0-9_-]+):\s*$/);
    if (job) {
      flush();
      id = job[1];
      continue;
    }
    const named = line.match(/^ {4}name:[ \t]*(.+?)[ \t]*$/);
    if (named && id && name === null) name = named[1].replace(/^['"]|['"]$/g, "");
  }
  flush();

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

/** The Vercel-held rows of the variable roster. */
export function parseDocumentedVariables(markdown: string): Map<string, VariableState> {
  return new Map(
    parseTable(markdown, "Variable", "Holder", "Environments", "Sensitivity")
      .filter((r) => r.Holder.includes("Vercel"))
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
 * Punctuation is dropped and each remaining space becomes a hyphen, so an em dash surrounded by
 * spaces yields two hyphens — which is why the spaces are replaced one at a time rather than
 * collapsed.
 *
 * `_` is the exception, spared here as a word character because GitHub spares it too. Stripping it
 * made this gate *require* an anchor GitHub will not resolve rather than merely miss a broken one
 * — CAN-82. Every other character it was stripped alongside is punctuation this regex already
 * drops, which is why nothing replaced that strip.
 */
export function anchorsOf(body: string): { anchors: Set<string>; titles: string[] } {
  const seen = new Map<string, number>();
  const anchors = new Set<string>();
  const titles: string[] = [];
  for (const m of body.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)) {
    titles.push(norm(m[1]));
    const base = m[1]
      .trim()
      .toLowerCase()
      .replace(/[^\w\- ]/g, "")
      .replace(/ /g, "-");
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    anchors.add(n === 0 ? base : `${base}-${n}`);
  }
  return { anchors, titles };
}

type DocumentLink = {
  link: string
  path: string
  fragment: string | undefined
  line: number
}

/**
 * Relative markdown links, with their line numbers. Absolute URLs are skipped, and so are
 * site-absolute paths, which name a route on the deployed site rather than a file in the repo.
 */
export function findLinks(body: string): DocumentLink[] {
  const found: DocumentLink[] = [];
  for (const m of body.matchAll(/\]\(([^)\s]+)\)/g)) {
    const link = m[1];
    if (/^(https?:|mailto:|\/)/.test(link)) continue;
    const [path, fragment] = link.split("#");
    found.push({ link, path, fragment, line: body.slice(0, m.index).split("\n").length });
  }
  return found;
}

type DocumentPointer = {
  file: string
  section: string
  display: string
  line: number
}

// `file.md → *Section*`, optionally backticked and optionally already a markdown link. The
// section name may be wrapped across lines, so whitespace is normalised here.
const POINTER = /`?([A-Za-z0-9_./-]+\.md)`?\s*(?:\]\([^)]*\))?\s*→\s*\*([^*]+)\*/gs;

export function findPointers(body: string): DocumentPointer[] {
  return [...body.matchAll(POINTER)].map((m) => ({
    file: m[1],
    section: norm(m[2]),
    display: m[2].replace(/\s+/g, " ").trim(),
    line: body.slice(0, m.index).split("\n").length,
  }));
}

/** A pointer may shorten a long heading, so a title prefix counts as a resolution. */
export const pointerResolves = (section: string, titles: string[]) =>
  titles.some((t) => t === section || t.startsWith(section));
