// What a dispatchable lane *is*: the gate, the ordering, and what makes two lanes collide. Pure
// throughout — every function here takes plain data and returns plain data, so the whole of it is
// testable without Orca, Linear or git. The wiring that fetches those lives in
// scripts/next-lanes.ts, and the evidence under every rule is
// docs/research/choosing-what-to-dispatch-next.md.

/** A Linear issue, reduced to the fields a selection rule can actually use. */
export type Issue = {
  identifier: string;
  title: string;
  band: string;
  stateType: string;
  labels: string[];
  body: string;
};

/** One lane, as `orca worktree ps --json` reports it. */
export type Lane = {
  ticket: string;
  branch: string | null;
  workspaceStatus: string | null;
  status: string | null;
  agentStates: string[];
};

export type Candidate = {
  identifier: string;
  title: string;
  band: string;
  unblocks: number;
  classes: ConflictClasses;
  heldBackBy: string[];
};

/**
 * What a change collides over, kept in two kinds because they are established two different ways
 * and mean different things. Keeping them in one list made every caller re-split it.
 */
export type ConflictClasses = {
  /** Files this change is predicted to touch, read from the ticket's own body. A guess. */
  files: string[];
  /** Shared platform state, which git isolation does not reach at all. */
  platform: string[];
};

const OPEN_STATES = new Set(["backlog", "unstarted", "started"]);

/** `v1` before `Readiness` before `Later`, which is the only cost-of-delay signal the tracker has. */
const BAND_ORDER: Record<string, number> = { v1: 0, Readiness: 1, Later: 2 };

/**
 * The files two changes here are most likely to share, measured over the last 60 merges rather than
 * guessed: docs/research/choosing-what-to-dispatch-next.md -> The collision surface is documentation.
 * Leßenich et al. found no indicator transfers between projects, so this list is derived from this
 * repository and is expected to go stale as the shape of the work changes.
 */
const HOT_FILES = [
  "docs/infrastructure.md",
  "docs/agents/workflow.md",
  "docs/incidents.md",
  "CLAUDE.md",
  "scripts/lib/doc-checks.ts",
  "scripts/check-docs.ts",
];

/**
 * Shared platform state. A lane changing any of these is independent of nothing, because several of
 * check-docs's checks read a live source rather than the working tree, so their answer turns on when
 * the run happens — docs/agents/workflow.md -> The gates, and the incident under it. That table is
 * the only honest count: it has grown since the incident, which named six.
 */
const PLATFORM_CLASSES: Record<string, RegExp> = {
  "vercel-variable": /vercel env|environment variable|VERCEL_TOKEN|NEON_PGHOST|branch-scoped/i,
  "repository-ruleset": /ruleset|branch protection|required check/i,
  "actions-secret": /gh secret|actions secret|repository secret/i,
  "security-settings": /security_and_analysis|secret scanning|dependabot/i,
  "tracker-labels": /label definition|label roster|create a label/i,
  "neon-settings": /history window|neon project settings|retention window/i,
  // Narrowed after "a data migration of the wiki content" matched: the bare word is far too common
  // in a repository whose whole subject is moving records about.
  "database-migration": /drizzle-kit|\bALTER TABLE\b|\bCREATE TABLE\b|schema (change|migration)|database migration|migration file|\bmigrations?\//i,
};

export const isOpen = (issue: Issue | undefined): boolean =>
  issue !== undefined && OPEN_STATES.has(issue.stateType);

/**
 * Everything a ticket transitively unblocks. Two things keep the `Later` queue's chosen order from
 * reading as leverage, and only the first of them is doing any work today.
 *
 * **Only `v1` and `Readiness` are counted**, because those are the bands with somewhere to be. This
 * is what changes the answer: measured over the 41 open issues on 21 August 2026 it moved 17 of
 * them, taking the head of the `Later` chain from 12 to 0.
 *
 * **And the walk stops at a `Later` ticket rather than passing through it**, since that band is one
 * chain of `blocked-by` links that are mostly a chosen order rather than real dependencies
 * (docs/agents/issue-tracker.md -> `Later` is a work queue, not a dependency graph). On the same
 * measurement this changed nothing at all, because the filter above already discards whatever it
 * would have reached. It is kept as a guard against a `Later` ticket blocking a banded one, which
 * inverts the tracker's cross-band rule and would otherwise let the queue back in.
 */
export function unblocks(start: string, blocks: Map<string, string[]>, issues: Map<string, Issue>): Set<string> {
  const seen = new Set<string>();
  const stack = [...(blocks.get(start) ?? [])];
  while (stack.length > 0) {
    const next = stack.pop();
    if (next === undefined || seen.has(next) || !isOpen(issues.get(next))) continue;
    seen.add(next);
    if (issues.get(next)?.band !== "Later") stack.push(...(blocks.get(next) ?? []));
  }
  return new Set([...seen].filter((id) => ["v1", "Readiness"].includes(issues.get(id)?.band ?? "")));
}

/**
 * The two state roles a lane can be opened for, and the prompt each is dispatched with.
 * `ready-for-human` does not mean "not dispatchable": it means the work has steps a person would
 * normally click through, so the lane is told to drive the browser for those and write code for the
 * rest. The label keeps the meaning docs/agents/triage-labels.md gives it.
 */
const DISPATCH_PROMPTS: Record<string, string> = {
  "ready-for-agent": "/implement",
  "ready-for-human": "use playwright mcp for human tasks and /implement for coding ones",
};

/** Which prompt a ticket is dispatched with, or undefined when it is not dispatchable at all. */
export function dispatchPrompt(issue: Issue): string | undefined {
  // `ready-for-agent` wins when both are somehow present: it needs no browser, so it is the cheaper
  // of the two to be wrong about.
  for (const role of ["ready-for-agent", "ready-for-human"])
    if (issue.labels.includes(role)) return DISPATCH_PROMPTS[role];
  return undefined;
}

/**
 * Whether a lane will want the browser. The Playwright MCP profile is shared across sessions, so a
 * second lane reaching for it gets "Browser is already in use" and neither can proceed — which makes
 * browser work mutually exclusive in a way git isolation does not reach, exactly like the platform
 * classes. Established by running into it rather than from any document.
 */
export const needsBrowser = (issue: Issue): boolean => issue.labels.includes("ready-for-human");

/**
 * Why a ticket may not be dispatched, or an empty list when it may. Precedence is a feasibility
 * constraint rather than a scoring input, and a state role that routes work elsewhere is a refusal
 * rather than a warning — docs/agents/triage-labels.md -> The roster.
 */
export function heldBackBy(
  issue: Issue,
  openBlockers: string[],
  inALane: boolean,
  browserLaneInFlight = false,
): string[] {
  const reasons: string[] = [];
  if (inALane) reasons.push("already in a lane");
  if (openBlockers.length > 0) reasons.push(`blocked by ${openBlockers.join(", ")}`);
  if (dispatchPrompt(issue) === undefined) reasons.push("no state role that dispatches");
  else if (needsBrowser(issue) && browserLaneInFlight)
    reasons.push("a lane in flight already holds the browser");
  return reasons;
}

/** What a ticket will collide over, read from its own body. A prediction, and reported as one. */
export function conflictClasses(issue: Pick<Issue, "body" | "title">): ConflictClasses {
  const text = `${issue.body} ${issue.title}`.toLowerCase();
  return {
    files: HOT_FILES.filter((file) => text.includes(file.toLowerCase())),
    platform: Object.entries(PLATFORM_CLASSES)
      .filter(([, pattern]) => pattern.test(text))
      .map(([name]) => name),
  };
}

/** Band first, then what the ticket unblocks, then the identifier so the answer is stable. */
export function rank(candidates: Candidate[]): Candidate[] {
  return [...candidates].sort(
    (a, b) =>
      (BAND_ORDER[a.band] ?? 9) - (BAND_ORDER[b.band] ?? 9) ||
      b.unblocks - a.unblocks ||
      a.identifier.localeCompare(b.identifier),
  );
}

/**
 * Whether a lane is holding its slot and doing nothing. Orca reports no event and no timeout for
 * either case, so a poll of `worktree ps` is the only thing that notices — and it cannot tell a lane
 * nobody is working from one a person is working by hand, which is why that is its own answer.
 */
export function laneHealth(lane: Lane): "stalled-on-prompt" | "finished" | "no-agent" | "working" {
  if (lane.status === "permission" || lane.agentStates.includes("blocked")) return "stalled-on-prompt";
  if (lane.agentStates.length === 0) return "no-agent";
  if (lane.agentStates.every((state) => state === "done")) return "finished";
  return "working";
}

/** A lane holds a slot until it is closed out. A ticket with no lane holds nothing. */
export const holdsASlot = (lane: Lane): boolean => lane.workspaceStatus !== "completed";
