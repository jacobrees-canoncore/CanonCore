#!/usr/bin/env node
// Reads the board and prints the dispatchable frontier: which lanes hold a slot, which are stalled,
// and which tickets are worth dispatching next, with the prompt each would be dispatched with.
//
//   node scripts/next-lanes.ts              the board, against the default ceiling
//   node scripts/next-lanes.ts --ceiling 2  against a ceiling given for this run
//
// **It only ever reads.** Orca's worktree listing, the tracker's issue listing and relations, and
// `git diff --name-only`. It creates no lane, removes none, closes none out and writes nothing
// anywhere. Dispatching is the skill's job and needs the user to approve it; closing a lane out
// belongs to /review-pr.
//
// This file is the wiring. What a candidate *is* lives in scripts/lib/next-lanes.ts, which is pure
// and is where the tests are. The skill that reads this report is
// .claude/skills/next-lanes/SKILL.md, and the evidence under every rule is
// docs/research/choosing-what-to-dispatch-next.md.

import { execFileSync } from "node:child_process";

import {
  conflictClasses,
  dispatchPrompt,
  heldBackBy,
  holdsASlot,
  isOpen,
  laneHealth,
  needsBrowser,
  rank,
  unblocks,
  type Candidate,
  type Issue,
  type Lane,
} from "./lib/next-lanes.ts";

const WORKSPACE = "ad2669ec-93a5-4ce1-97fa-c7d9247a1452";
const TEAM = "CAN";

/** The ceiling is policy rather than a derived number — SKILL.md says why, at length. */
const DEFAULT_CEILING = 3;

/**
 * One Orca call.
 *
 * A refusal is reported rather than dereferenced. `orca` exits zero with an `ok: false` envelope on
 * stdout for some failures, so reading straight through to `result` turns "the CLI said why" into a
 * `TypeError` naming a property — the same reason `check-linear-bodies.ts` checks it.
 */
function orca(args: string[]): unknown {
  const envelope = JSON.parse(
    execFileSync("orca", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
      timeout: 120_000,
    }),
  ) as { ok?: boolean };
  if (envelope.ok !== true) throw new Error(`orca ${args[0]} ${args[1]} refused: ${JSON.stringify(envelope)}`);
  return envelope;
}

/** What a lane has actually changed. Every worktree shares one `.git`, so any branch is readable. */
function touched(branch: string | null): Set<string> {
  if (branch === null) return new Set();
  try {
    const range = `origin/main...${branch.replace("refs/heads/", "")}`;
    // A lane's branch is not always present locally; that is not an error worth printing.
    const out = execFileSync("git", ["diff", "--name-only", range], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return new Set(out.split("\n").filter(Boolean));
  } catch {
    return new Set();
  }
}

function lanes(): Lane[] {
  const data = orca(["worktree", "ps", "--json"]) as {
    result: {
      worktrees: {
        linkedLinearIssue: string | null;
        branch: string | null;
        workspaceStatus: string | null;
        status: string | null;
        agents?: { state: string }[];
      }[];
    };
  };
  return data.result.worktrees
    .filter((w) => w.linkedLinearIssue !== null)
    .map((w) => ({
      ticket: w.linkedLinearIssue as string,
      branch: w.branch,
      workspaceStatus: w.workspaceStatus,
      status: w.status,
      // The key is always present and the array is what empties, so testing `agents` for existence
      // would never fire on a closed-out lane.
      agentStates: (w.agents ?? []).map((a) => a.state),
    }));
}

/** Every issue on the team. A listing is bounded, so paginate until `hasMore` is false. */
function issues(): Issue[] {
  const rows: Issue[] = [];
  let cursor: string | undefined;
  for (;;) {
    const args = ["linear", "list-issues", "--team", TEAM, "--workspace", WORKSPACE, "--limit", "100", "--json"];
    if (cursor !== undefined) args.push("--cursor", cursor);
    const data = orca(args) as {
      result: {
        issues: {
          identifier: string;
          title: string;
          description?: string;
          state: { type: string };
          project?: { name: string } | null;
          labels?: { name: string }[];
        }[];
        meta: { hasMore?: boolean; nextCursor?: string };
      };
    };
    for (const row of data.result.issues)
      rows.push({
        identifier: row.identifier,
        title: row.title,
        band: row.project?.name ?? "-",
        stateType: row.state.type,
        labels: (row.labels ?? []).map((l) => l.name),
        body: row.description ?? "",
      });
    if (data.result.meta.hasMore !== true || data.result.meta.nextCursor === undefined) return rows;
    cursor = data.result.meta.nextCursor;
  }
}

function relationsOf(identifier: string): { blocks: string[]; blockedBy: string[] } {
  const args = ["linear", "issue", identifier, "--relations", "--workspace", WORKSPACE, "--json"];
  const data = orca(args) as {
    result: { relations?: { type: string; direction: string; relatedIssue: { identifier: string } }[] };
  };
  const relations = data.result.relations ?? [];
  const pick = (direction: string) =>
    relations.filter((r) => r.type === "blocks" && r.direction === direction).map((r) => r.relatedIssue.identifier);
  return { blocks: pick("outbound"), blockedBy: pick("inbound") };
}

/** Everything the report needs, so that gathering it and rendering it stay separate jobs. */
type Board = {
  ceiling: number;
  holding: Lane[];
  byTicket: Map<string, Issue>;
  candidates: Candidate[];
  heldBack: Candidate[];
  changedByAFlyingLane: Set<string>;
  platformInFlight: Set<string>;
  browserHeldBy: string | undefined;
};

function gather(ceiling: number): Board {
  const holding = lanes().filter(holdsASlot);
  const byTicket = new Map(issues().map((i) => [i.identifier, i]));
  const open = [...byTicket.values()].filter((i) => isOpen(i)).map((i) => i.identifier);

  const blocks = new Map<string, string[]>();
  const blockedBy = new Map<string, string[]>();
  for (const identifier of open) {
    const { blocks: out, blockedBy: back } = relationsOf(identifier);
    blocks.set(identifier, out);
    blockedBy.set(identifier, back);
  }

  // Asymmetric on purpose. A lane in flight has a diff, so read it; a candidate has only its own
  // body, so the reading is a prediction and is reported as one.
  const changedByAFlyingLane = new Set<string>();
  const platformInFlight = new Set<string>();
  let browserHeldBy: string | undefined;
  for (const lane of holding) {
    for (const file of touched(lane.branch)) changedByAFlyingLane.add(file);
    const issue = byTicket.get(lane.ticket);
    if (issue === undefined) continue;
    for (const p of conflictClasses(issue).platform) platformInFlight.add(p);
    if (needsBrowser(issue)) browserHeldBy = lane.ticket;
  }

  const inALane = new Set(holding.map((l) => l.ticket));
  const candidates: Candidate[] = [];
  const heldBack: Candidate[] = [];
  for (const identifier of open) {
    const issue = byTicket.get(identifier) as Issue;
    const openBlockers = (blockedBy.get(identifier) ?? []).filter((b) => isOpen(byTicket.get(b)));
    const entry: Candidate = {
      identifier,
      title: issue.title,
      band: issue.band,
      unblocks: unblocks(identifier, blocks, byTicket).size,
      classes: conflictClasses(issue),
      heldBackBy: heldBackBy(issue, openBlockers, inALane.has(identifier), browserHeldBy !== undefined),
    };
    (entry.heldBackBy.length > 0 ? heldBack : candidates).push(entry);
  }

  return { ceiling, holding, byTicket, candidates, heldBack, changedByAFlyingLane, platformInFlight, browserHeldBy };
}

function report(board: Board): void {
  const { ceiling, holding, byTicket, candidates, heldBack } = board;
  const free = Math.max(0, ceiling - holding.length);
  const say = (line: string) => process.stdout.write(`${line}\n`);
  const inFlight = holding.map((l) => l.ticket).sort().join(", ");

  say(`LANES HOLDING A SLOT: ${holding.length} of ${ceiling}   ${inFlight === "" ? "(none)" : inFlight}`);
  for (const lane of holding) {
    const health = laneHealth(lane);
    if (health === "stalled-on-prompt")
      say(`   ${lane.ticket}: STALLED on a prompt — answer it or close the lane out. It holds a slot and does nothing.`);
    if (health === "finished") say(`   ${lane.ticket}: agent finished — land it or close the lane out.`);
    if (health === "no-agent")
      say(`   ${lane.ticket}: no agent running. Expected if a person is working it by hand; a stall otherwise, and Orca cannot tell the two apart.`);
  }
  if (board.browserHeldBy !== undefined)
    say(`   ${board.browserHeldBy} holds the browser, so no second browser lane may open.`);

  say(`\nFREE SLOTS: ${free}`);
  if (free === 0) {
    say("   At the ceiling. Block all new starts and report what would free a slot rather than choosing");
    say("   a ticket (Reinertsen W6). What follows is context only — do not dispatch from it.");
  }

  say(`\n${free === 0 ? "WOULD BE DISPATCHABLE" : "DISPATCHABLE"}, best first (${candidates.length} passed the gate):`);
  for (const c of rank(candidates)) {
    const issue = byTicket.get(c.identifier) as Issue;
    const browser = needsBrowser(issue) ? "  [holds the browser]" : "";
    say(`   ${c.band.padEnd(10)} ${c.identifier.padEnd(8)} unblocks ${String(c.unblocks).padStart(2)}  ${c.title.slice(0, 52)}${browser}`);
    say(`            prompt: "${dispatchPrompt(issue) ?? ""}"`);
    const collides = c.classes.files.filter((f) => board.changedByAFlyingLane.has(f));
    const predicted = c.classes.files.filter((f) => !board.changedByAFlyingLane.has(f));
    const alsoInFlight = c.classes.platform.filter((p) => board.platformInFlight.has(p));
    if (collides.length > 0) say(`            COLLIDES: a lane in flight has already changed ${collides.join(", ")}`);
    if (c.classes.platform.length > 0) {
      const shared = alsoInFlight.length > 0 ? ", which a lane in flight also looks likely to change" : "";
      say(`            MAY TOUCH SHARED PLATFORM STATE (${c.classes.platform.join(", ")})${shared}.`);
      say("            Read the ticket before believing it; sequence alone if it holds.");
    }
    if (predicted.length > 0) say(`            may touch ${predicted.join(", ")} (predicted from its body)`);
  }

  say(`\nHELD BACK BY THE GATE: ${heldBack.length}`);
  for (const h of rank(heldBack).slice(0, 12))
    say(`   ${h.band.padEnd(10)} ${h.identifier.padEnd(8)} ${h.heldBackBy.join("; ")}`);
}

function main(): void {
  const flag = process.argv.indexOf("--ceiling");
  const ceiling = flag === -1 ? DEFAULT_CEILING : Number(process.argv[flag + 1]);
  if (!Number.isInteger(ceiling) || ceiling < 1) throw new Error("--ceiling takes a whole number of lanes, 1 or more");
  report(gather(ceiling));
}

main();
