import assert from "node:assert/strict";
import { test } from "node:test";

import {
  conflictClasses,
  dispatchPrompt,
  heldBackBy,
  needsBrowser,
  holdsASlot,
  laneHealth,
  rank,
  unblocks,
  type Candidate,
  type Issue,
  type Lane,
} from "./next-lanes.ts";

const issue = (identifier: string, band: string, over: Partial<Issue> = {}): Issue => ({
  identifier,
  title: `title of ${identifier}`,
  band,
  stateType: "backlog",
  labels: ["ready-for-agent"],
  body: "",
  ...over,
});

const graph = (edges: Record<string, string[]>) => new Map(Object.entries(edges));

test("unblocks counts what a ticket transitively frees", () => {
  const issues = new Map([
    ["A", issue("A", "v1")],
    ["B", issue("B", "v1")],
    ["C", issue("C", "Readiness")],
  ]);
  assert.deepEqual([...unblocks("A", graph({ A: ["B"], B: ["C"] }), issues)].sort(), ["B", "C"]);
});

test("a closed ticket is neither counted nor traversed through", () => {
  const issues = new Map([
    ["A", issue("A", "v1")],
    ["B", issue("B", "v1", { stateType: "completed" })],
    ["C", issue("C", "v1")],
  ]);
  assert.deepEqual([...unblocks("A", graph({ A: ["B"], B: ["C"] }), issues)], []);
});

// The rule the whole ordering turns on. Without it the Later queue's chosen order reads as leverage.
test("leverage is not counted through a Later ticket", () => {
  const issues = new Map([
    ["A", issue("A", "v1")],
    ["L", issue("L", "Later")],
    ["M", issue("M", "Later")],
    ["V", issue("V", "v1")],
  ]);
  const blocks = graph({ A: ["L"], L: ["M"], M: ["V"] });
  // L is reached and is Later, so it is not counted and nothing beyond it is reached at all.
  assert.deepEqual([...unblocks("A", blocks, issues)], []);
});

test("a Later ticket reached directly is still not counted, but a v1 sibling is", () => {
  const issues = new Map([
    ["A", issue("A", "v1")],
    ["L", issue("L", "Later")],
    ["V", issue("V", "v1")],
  ]);
  assert.deepEqual([...unblocks("A", graph({ A: ["L", "V"] }), issues)], ["V"]);
});

test("a cycle terminates rather than hanging", () => {
  const issues = new Map([
    ["A", issue("A", "v1")],
    ["B", issue("B", "v1")],
  ]);
  assert.deepEqual([...unblocks("A", graph({ A: ["B"], B: ["A"] }), issues)].sort(), ["A", "B"]);
});

test("the gate refuses a ticket for every reason that applies", () => {
  assert.deepEqual(heldBackBy(issue("A", "v1"), [], false), []);
  assert.deepEqual(heldBackBy(issue("A", "v1"), ["X", "Y"], false), ["blocked by X, Y"]);
  assert.deepEqual(heldBackBy(issue("A", "v1"), [], true), ["already in a lane"]);
  assert.deepEqual(heldBackBy(issue("A", "v1", { labels: ["needs-triage"] }), [], false), [
    "no state role that dispatches",
  ]);
  assert.deepEqual(heldBackBy(issue("A", "v1", { labels: [] }), [], false), [
    "no state role that dispatches",
  ]);
});

// ready-for-human is dispatchable, with a prompt that tells the lane to drive the browser.
test("both dispatching state roles pass the gate, and each gets its own prompt", () => {
  const agent = issue("A", "v1", { labels: ["ready-for-agent"] });
  const human = issue("B", "v1", { labels: ["ready-for-human"] });
  assert.deepEqual(heldBackBy(agent, [], false), []);
  assert.deepEqual(heldBackBy(human, [], false), []);
  assert.equal(dispatchPrompt(agent), "/implement");
  assert.equal(dispatchPrompt(human), "use playwright mcp for human tasks and /implement for coding ones");
  assert.equal(dispatchPrompt(issue("C", "v1", { labels: ["needs-info"] })), undefined);
});

test("ready-for-agent wins when a ticket somehow carries both roles", () => {
  const both = issue("A", "v1", { labels: ["ready-for-human", "ready-for-agent"] });
  assert.equal(dispatchPrompt(both), "/implement");
});

// The Playwright profile is shared across sessions, so two browser lanes deadlock each other.
test("only one lane may hold the browser at a time", () => {
  const human = issue("B", "v1", { labels: ["ready-for-human"] });
  const coder = issue("A", "v1", { labels: ["ready-for-agent"] });
  assert.equal(needsBrowser(human), true);
  assert.equal(needsBrowser(coder), false);
  assert.deepEqual(heldBackBy(human, [], false, true), ["a lane in flight already holds the browser"]);
  assert.deepEqual(heldBackBy(human, [], false, false), []);
  // A coding lane is unaffected by a browser lane in flight.
  assert.deepEqual(heldBackBy(coder, [], false, true), []);
});

test("conflict classes keep files and platform state apart", () => {
  const found = conflictClasses({
    title: "Something",
    body: "It edits `docs/infrastructure.md` and provisions a Vercel env variable.",
  });
  assert.deepEqual(found.files, ["docs/infrastructure.md"]);
  assert.deepEqual(found.platform, ["vercel-variable"]);
});

test("a ticket naming nothing shared collides over nothing", () => {
  const found = conflictClasses({ title: "Rename a component", body: "Touches one file." });
  assert.deepEqual(found, { files: [], platform: [] });
});

test("ranking puts band first, then leverage, then the identifier", () => {
  const make = (identifier: string, band: string, count: number): Candidate => ({
    identifier,
    title: "",
    band,
    unblocks: count,
    classes: { files: [], platform: [] },
    heldBackBy: [],
  });
  const ordered = rank([
    make("CAN-3", "Later", 90),
    make("CAN-2", "Readiness", 5),
    make("CAN-1", "v1", 0),
    make("CAN-4", "v1", 7),
  ]).map((c) => c.identifier);
  assert.deepEqual(ordered, ["CAN-4", "CAN-1", "CAN-2", "CAN-3"]);
});

const lane = (over: Partial<Lane> = {}): Lane => ({
  ticket: "CAN-1",
  branch: "refs/heads/x",
  workspaceStatus: "in-progress",
  status: "working",
  agentStates: ["working"],
  ...over,
});

test("a lane waiting on a prompt is stalled, however its agent reads", () => {
  assert.equal(laneHealth(lane({ status: "permission" })), "stalled-on-prompt");
  assert.equal(laneHealth(lane({ agentStates: ["blocked"] })), "stalled-on-prompt");
});

test("a finished agent is distinguished from one still working and from none at all", () => {
  assert.equal(laneHealth(lane({ status: "active", agentStates: ["done"] })), "finished");
  assert.equal(laneHealth(lane({ agentStates: [] })), "no-agent");
  assert.equal(laneHealth(lane({ agentStates: ["done", "working"] })), "working");
});

// The key is always present and the array is what empties, so `has("agents")` would never fire.
test("a closed-out lane holds no slot", () => {
  assert.equal(holdsASlot(lane({ workspaceStatus: "completed" })), false);
  assert.equal(holdsASlot(lane({ workspaceStatus: "in-progress" })), true);
});
