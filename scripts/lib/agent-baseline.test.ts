import { test } from "node:test";
import assert from "node:assert/strict";

import {
  compareProviderSettings,
  parseDocumentedProviderSettings,
  parseManifests,
  pluginId,
  pluginRootPaths,
  skillRoots,
} from "./agent-baseline.ts";

// The pure half of the agent baseline: what the two manifests say, what the register publishes, and
// how the two disagree. The wiring - reading files, listing skills, existence - is
// `scripts/check-docs.ts`, and the argument for every value asserted here is
// docs/infrastructure.md -> The Provider repository agent baseline, reasoned in ADR-0028.

/** The marketplace manifest, as `.claude-plugin/marketplace.json` writes it. */
const marketplace = JSON.stringify({
  name: "canoncore",
  owner: { name: "CanonCore" },
  plugins: [{ name: "canoncore-engineering", source: "./" }],
});

/** The plugin manifest beside it. */
const plugin = JSON.stringify({
  name: "canoncore-engineering",
  version: "0.1.0",
  skills: ["./.claude/skills"],
});

/** The block the register publishes, which is what a Provider repository commits verbatim. */
const documented = [
  "```json",
  JSON.stringify(
    {
      extraKnownMarketplaces: {
        canoncore: { source: { source: "github", repo: "jacobrees-canoncore/CanonCore" } },
      },
      enabledPlugins: { "canoncore-engineering@canoncore": true },
    },
    null,
    2,
  ),
  "```",
].join("\n");

test("the plugin id is the two manifests' names, composed in one place", () => {
  // The string a Provider repository's `enabledPlugins` key has to be, character for character.
  assert.equal(pluginId(parseManifests(marketplace, plugin)), "canoncore-engineering@canoncore");
});

test("the source is read rather than assumed, because it decides what travels", () => {
  assert.equal(parseManifests(marketplace, plugin).source, "./");
});

test("a second plugin entry is refused, since one id could then mean either", () => {
  const two = JSON.stringify({
    name: "canoncore",
    plugins: [
      { name: "canoncore-engineering", source: "./" },
      { name: "canoncore-extra", source: "./" },
    ],
  });
  assert.throws(() => parseManifests(two, plugin), /lists 2 plugins/);
});

test("the two manifests disagreeing about the plugin's name is refused here", () => {
  // Nothing in this repository uses the name; it is spent in a Provider's settings, so a mismatch
  // would otherwise surface only as a plugin that will not install, in a repository not this one.
  const renamed = JSON.stringify({ name: "canoncore-chain", skills: ["./.claude/skills"] });
  assert.throws(() => parseManifests(marketplace, renamed), /calls itself "canoncore-chain"/);
});

test("a skills path is turned into a repository path, and must be plugin-relative", () => {
  assert.deepEqual(skillRoots(parseManifests(marketplace, plugin)), [".claude/skills"]);
  const absolute = JSON.stringify({ name: "canoncore-engineering", skills: [".claude/skills"] });
  assert.throws(() => skillRoots(parseManifests(marketplace, absolute)), /not relative/);
});

test("the register's own settings block is read back, not trusted", () => {
  assert.deepEqual(parseDocumentedProviderSettings(documented), {
    marketplace: "canoncore",
    repo: "jacobrees-canoncore/CanonCore",
    enabledPlugin: "canoncore-engineering@canoncore",
  });
});

test("a document carrying no such block fails rather than reporting agreement", () => {
  assert.throws(
    () => parseDocumentedProviderSettings("# Infrastructure\n\nNothing here.\n"),
    /carries 0 `json` fences/,
  );
});

test("a second settings block is refused rather than silently preferring one", () => {
  // A register growing a second such fence is how this check would come to read a block nobody
  // meant. It also pins the fence scan: the earlier regex reached from the first fence to the word
  // it wanted, spanning the fence between them, and failed as "not valid JSON".
  assert.throws(() => parseDocumentedProviderSettings(`${documented}\n\n${documented}`), /carries 2 `json` fences/);
});

test("an unrelated json fence before the block does not confuse the scan", () => {
  const other = ["```json", JSON.stringify({ some: "other example" }, null, 2), "```"].join("\n");
  assert.equal(
    parseDocumentedProviderSettings(`${other}\n\n${documented}`).marketplace,
    "canoncore",
  );
});

test("a block agreeing with the manifests reports nothing", () => {
  const settings = parseDocumentedProviderSettings(documented);
  const baseline = parseManifests(marketplace, plugin);
  assert.deepEqual(
    compareProviderSettings(settings, baseline, "jacobrees-canoncore/CanonCore"),
    [],
  );
});

test("each way the block and the manifests can disagree is reported separately", () => {
  const baseline = parseManifests(marketplace, plugin);
  const stale = parseDocumentedProviderSettings(
    documented
      .replace('"canoncore":', '"canoncore-tools":')
      .replace("canoncore-engineering@canoncore", "canoncore-engineering@canoncore-tools"),
  );
  const problems = compareProviderSettings(stale, baseline, "jacobrees-canoncore/CanonCore");
  assert.equal(problems.length, 2);
  assert.match(problems[0], /names the marketplace "canoncore-tools"/);
  assert.match(problems[1], /enables "canoncore-engineering@canoncore-tools"/);
});

test("the block naming a different repository is reported", () => {
  const elsewhere = parseDocumentedProviderSettings(
    documented.replace("jacobrees-canoncore/CanonCore", "someone-else/CanonCore"),
  );
  const problems = compareProviderSettings(
    elsewhere,
    parseManifests(marketplace, plugin),
    "jacobrees-canoncore/CanonCore",
  );
  assert.deepEqual(problems, [
    'the block fetches "someone-else/CanonCore" and this repository is "jacobrees-canoncore/CanonCore"',
  ]);
});

test("a skill's payload paths are collected, deduplicated and stripped of sentence punctuation", () => {
  // The real shape: a path in a code span, a path ending a sentence, and the same path twice.
  const body = [
    "Read `${CLAUDE_PLUGIN_ROOT}/CODING_STANDARDS.md` before writing code.",
    "The argument is ${CLAUDE_PLUGIN_ROOT}/docs/agents/workflow.md, which is also",
    "at `${CLAUDE_PLUGIN_ROOT}/CODING_STANDARDS.md`.",
  ].join("\n");
  assert.deepEqual(pluginRootPaths(body), [
    "CODING_STANDARDS.md",
    "docs/agents/workflow.md",
  ]);
});

test("a body naming the placeholder without a path underneath it yields nothing", () => {
  // `/draft-pr` says only that the root *is* `${CLAUDE_PLUGIN_ROOT}`, which names no file.
  assert.deepEqual(pluginRootPaths("the pointers' root is `${CLAUDE_PLUGIN_ROOT}` rather"), []);
});
