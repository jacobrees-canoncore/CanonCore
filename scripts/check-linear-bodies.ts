#!/usr/bin/env node
// Checks Linear bodies for the two things Linear's own round trip does to them: it breaks an
// emphasis run that carries a newline, and it linkifies a bare ticket reference — which breaks the
// emphasis run *that* sat in. Both rules live in docs/agents/issue-tracker.md, one section each:
// Keep an emphasis run on one line, and check the stored body; and A bare identifier does not
// survive the sync.
//
//   node scripts/check-linear-bodies.ts --guard body.md   before you send it, or - for stdin
//   node scripts/check-linear-bodies.ts CAN-83            one stored body, after writing it
//   node scripts/check-linear-bodies.ts                   every team `CAN` body, archived included
//
// **Both findings fail, in both directions, because the baseline is clean.** All 142 bodies were
// swept and repaired on 21 August 2026: zero stray asterisks, zero bare references. That is the
// standing requirement knip is held to for the same reason — a report nobody expects to be empty is
// a report nobody reads (docs/agents/workflow.md -> The gates). Had the 22 bodies that carried a
// bare reference been left, this check would have shipped permanently red and stopped being run.
//
// This file is the wiring: it runs `orca linear`, paginates, and prints the report. What a finding
// *is* lives in script./lib/linear-bodies.ts and script./lib/linear-bodies.ts, which are pure
// and are where the tests are.
//
// Not a CI gate and not part of `check-docs.ts`. `orca` is a local desktop CLI that cannot run on a
// runner, and a ticket body is not a tracked file — `check-docs.ts` reads the repository's own
// documents and never the tracker's. This is the check an agent runs either side of a body write.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { findBareReferences, findSplitEmphasis, findStrayAsterisks } from "./lib/linear-bodies.ts";

function fail(why: string): never {
  throw new Error(why);
}

const WORKSPACE = "ad2669ec-93a5-4ce1-97fa-c7d9247a1452";
const TEAM = "CAN";
const PAGE = 100;

type Issue = { identifier: string; description: string | null }

/**
 * What `--json` returns. Declared rather than walked into blind: `result.meta.nextCursor` decides
 * whether the sweep stops, and a sweep that silently reads `undefined` there covers one page and
 * reports zero over the rest.
 */
type Envelope = {
  ok?: boolean
  result?: {
    issue?: Issue
    issues?: Issue[]
    meta?: { hasMore?: boolean; nextCursor?: string }
  }
}

/**
 * One `orca linear` call, with the workspace pinned — mandatory on every call, because Orca is
 * connected to three and picks one silently when the flag is absent.
 *
 * A refusal is reported rather than dereferenced. `orca` exits zero with an `ok: false` envelope on
 * stdout for some failures, so reading straight through to `result` turns "the CLI said why" into a
 * `TypeError` naming a property.
 */
function orca(args: string[]): Envelope {
  const envelope: Envelope = JSON.parse(
    execFileSync("orca", ["linear", ...args, "--workspace", WORKSPACE, "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
      timeout: 120_000,
    }),
  );
  if (!envelope.ok) fail(`orca linear ${args[0]} refused: ${JSON.stringify(envelope)}`);
  return envelope;
}

/**
 * Every body on the team, archived ones included.
 *
 * Both halves of that are load-bearing. A listing stops at `--limit` and reports the cut only in
 * `result.meta`, and it drops archived issues by default while saying nothing — so a sweep that
 * trusts one unpaginated call reports zero over a fraction of the corpus and looks identical to a
 * clean run. docs/agents/issue-tracker.md -> A listing is bounded, and only half of that is
 * signalled.
 */
function everyBody(): Issue[] {
  const issues: Issue[] = [];
  let cursor: string | undefined;
  do {
    const page = orca([
      "list-issues",
      "--team",
      TEAM,
      "--limit",
      String(PAGE),
      "--include-archived",
      ...(cursor ? ["--cursor", cursor] : []),
    ]);
    const result = page.result;
    if (!result?.issues) fail(`orca linear list-issues returned no issues array`);
    issues.push(...result.issues);
    cursor = result.meta?.hasMore ? result.meta.nextCursor : undefined;
  } while (cursor);
  return issues;
}

/** What the sweep saw, as a sentence: the terms the tracker doc asks a count to be defended in. */
function describeReach(issues: Issue[]): string {
  const numbers = issues
    .map((issue) => Number(issue.identifier.replace(`${TEAM}-`, "")))
    .sort((a, b) => a - b);
  const seen = new Set(numbers);
  const missing = [];
  for (let n = numbers[0]; n < numbers[numbers.length - 1]; n++)
    if (!seen.has(n)) missing.push(`${TEAM}-${n}`);
  const span = `${TEAM}-${numbers[0]} to ${TEAM}-${numbers[numbers.length - 1]}`;
  const gaps = missing.length ? `, absent: ${missing.join(", ")}` : ", unbroken";
  return `${issues.length} bodies, ${span}${gaps}`;
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/**
 * What one stored body carries, printed with the source line beside each finding — the line is what
 * tells you which run broke, and which reference is about to be rewritten.
 */
function report(label: string, body: string): { strays: number; bare: number } {
  const strays = findStrayAsterisks(body);
  const bare = findBareReferences(body);
  if (!strays.length && !bare.length) return { strays: 0, bare: 0 };
  const lines = body.split("\n");
  const headline = [
    strays.length ? plural(strays.length, "stray asterisk") : "",
    bare.length ? plural(bare.length, "bare reference") : "",
  ]
    .filter(Boolean)
    .join(", ");
  console.log(`\n${label} — ${headline}`);
  for (const line of [...new Set(strays.map((f) => f.line))])
    console.log(`  ${String(line).padStart(4)}: ${lines[line - 1]}`);
  for (const line of [...new Set(bare.map((f) => f.line))]) {
    const here = bare.filter((f) => f.line === line);
    const named = here.map((f) => `${f.reference} (${f.form})`).join(", ");
    console.log(`  ${String(line).padStart(4)}: ${named}`);
  }
  return { strays: strays.length, bare: bare.length };
}

const args = process.argv.slice(2);

if (args[0] === "--guard") {
  const source = args[1];
  if (!source) {
    console.error("--guard needs a file, or - for stdin");
    process.exit(2);
  }
  const markdown = readFileSync(source === "-" ? 0 : source, "utf8");

  const split = findSplitEmphasis(markdown);
  for (const run of split)
    console.log(
      `lines ${run.startLine}-${run.endLine}: emphasis run crosses a newline — ` +
        run.text.replace(/\s+/g, " "),
    );

  const bare = findBareReferences(markdown);
  for (const found of bare)
    console.log(
      `line ${found.line}: ${found.reference} is bare (${found.form}) — the save linkifies it`,
    );

  if (split.length)
    console.log(
      `\n${plural(split.length, "run")} would be mangled. Close each on the line it opens,` +
        " however long that line runs.",
    );
  if (bare.length)
    console.log(
      `\n${plural(bare.length, "reference")} would be linkified, breaking any emphasis run it sits` +
        " in. Put the title inside the link text, or the reference inside a code span.",
    );
  if (!split.length && !bare.length) console.log("nothing here that the save will rewrite");
  process.exit(split.length || bare.length ? 1 : 0);
}

const named = (id: string): Issue =>
  orca(["issue", id]).result?.issue ?? fail(`orca linear issue ${id} returned no issue`);

const issues: Issue[] = args.length ? args.map(named) : everyBody();

const counts = issues.map((issue) => report(issue.identifier, issue.description ?? ""));
const strays = counts.reduce((total, c) => total + c.strays, 0);
const exposed = counts.filter((c) => c.bare).length;

const read = args.length
  ? `${issues.length} ${issues.length === 1 ? "body" : "bodies"} read`
  : describeReach(issues);

console.log(
  `\n${read}, ${strays} stray asterisks` +
    `, ${exposed} ${exposed === 1 ? "body" : "bodies"} carrying a bare reference`,
);

process.exit(strays || exposed ? 1 : 0);
