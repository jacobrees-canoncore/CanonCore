// The parsing and comparison behind `scripts/check-docs.ts`.
//
// Everything here is pure: text in, data out, no filesystem and no subprocesses. That is the
// seam — the CLI owns reading files and running `gh`, `orca` and `vercel`; this module owns what
// their output means and how the report of it reads, and is what `doc-checks.test.ts` exercises.

import { posix } from "node:path";

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

/** A pointer may shorten a long heading, so a title prefix counts as a resolution. */
export const pointerResolves = (section: string, titles: string[]) =>
  titles.some((t) => t === section || t.startsWith(section));

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
