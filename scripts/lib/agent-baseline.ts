// The Provider repository agent baseline, in the half that is a function of text.
//
// Pure throughout: JSON and markdown in, data and problem lines out, no filesystem and no
// subprocesses — the same seam `provider-baseline.ts` draws for the CI half, and
// `agent-baseline.test.ts` is where it is exercised.
//
// **What this exists to catch.** A Provider repository loads the engineering chain because four
// strings agree: the marketplace's name, the plugin's, the `source` that decides what travels, and
// the `skills` path that decides which skills do. Two of them are written into every Provider
// repository's own `.claude/settings.json`, which is not in this checkout, so a rename here breaks
// every one of those repositories at once and none of them reports why. The other two decide
// whether the documents arrive at all: with `source` anything but the repository root, `CLAUDE.md`,
// `CODING_STANDARDS.md`, `CONTEXT.md` and `docs/` stop travelling and every `${CLAUDE_PLUGIN_ROOT}`
// pointer in a skill resolves to nothing — silently, in a repository this one cannot see.
//
// **Every value below is docs/infrastructure.md -> The Provider repository agent baseline**, and
// the reasoning is ADR-0029. This module states what the baseline *is*; it does not restate why.

import { asRecord, fail } from "./doc-checks.ts";

/** What the two manifests say, once they have been read as the shape they must have. */
export type AgentBaseline = {
  /** The marketplace's name, which is the `@…` half of the plugin id a Provider enables. */
  marketplace: string;
  /** The plugin's name, which is the other half. */
  plugin: string;
  /** The plugin entry's `source`. The documents travel only while this is the marketplace root. */
  source: string;
  /** Every path the manifest adds to the skill scan, as written. */
  skills: string[];
};

/** The plugin id as a settings file has to spell it. One place composes it; everything uses this. */
export const pluginId = (baseline: AgentBaseline) => `${baseline.plugin}@${baseline.marketplace}`;

function json(body: string, what: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch (err) {
    return fail(`the ${what} is not valid JSON: ${(err as Error).message}`);
  }
  return asRecord(parsed) ?? fail(`the ${what} is not a JSON object`);
}

/**
 * The two manifests, read as one fact.
 *
 * The single-entry rule is the load-bearing one and is not a simplification: a second entry sharing
 * `source: "./"` would load its own subset of the same `skills/` directory, and which of the two a
 * Provider repository had enabled would decide which skills it got. One entry means the id in a
 * Provider's settings can only name this plugin.
 */
export function parseManifests(marketplaceJson: string, pluginJson: string): AgentBaseline {
  const market = json(marketplaceJson, "marketplace manifest");
  const marketplace = typeof market.name === "string" ? market.name : undefined;
  if (!marketplace) return fail("the marketplace manifest declares no `name`");

  const entries = Array.isArray(market.plugins) ? market.plugins : [];
  if (entries.length !== 1)
    return fail(
      `the marketplace manifest lists ${entries.length} plugins. A Provider repository enables ` +
        `one id, so a second entry here is a second thing that id could have meant.`,
    );
  const entry = asRecord(entries[0]) ?? fail("the marketplace's plugin entry is not an object");
  const source = typeof entry.source === "string" ? entry.source : undefined;
  if (!source)
    return fail(
      "the marketplace's plugin entry has no string `source`. Only a relative path makes this " +
        "repository the payload; an object source would fetch a different one.",
    );

  const manifest = json(pluginJson, "plugin manifest");
  const plugin = typeof manifest.name === "string" ? manifest.name : undefined;
  if (!plugin) return fail("the plugin manifest declares no `name`");
  const entryName = typeof entry.name === "string" ? entry.name : undefined;
  if (entryName !== plugin)
    return fail(
      `the marketplace lists the plugin as "${entryName}" and the plugin manifest calls itself ` +
        `"${plugin}". A Provider repository enables the marketplace's name, and the mismatch ` +
        `surfaces only there.`,
    );

  const declared = manifest.skills;
  const skills =
    typeof declared === "string"
      ? [declared]
      : Array.isArray(declared) && declared.every((s) => typeof s === "string")
        ? (declared as string[])
        : fail("the plugin manifest's `skills` is neither a string nor an array of strings");

  return { marketplace, plugin, source, skills };
}

/**
 * The skill directories the manifest reaches, as repository paths.
 *
 * `skills` adds to the default `skills/` scan rather than replacing it, so a path here is one this
 * repository chose. The check that matters is that each names a directory that exists: a moved
 * skills directory leaves a manifest pointing at nothing, and the plugin still installs — with no
 * skills in it, which reads in `claude plugin details` as a plugin that simply has none.
 */
export function skillRoots(baseline: AgentBaseline): string[] {
  return baseline.skills.map((path) => {
    if (!path.startsWith("./"))
      return fail(
        `the plugin manifest's skills path "${path}" is not relative to the plugin root. ` +
          "Claude Code requires `./`, and anything else is not resolved at all.",
      );
    return path.replace(/^\.\//, "").replace(/\/$/, "");
  });
}

/** What a Provider repository has to commit, as this repository's manifests decide it. */
export type ProviderSettings = { marketplace: string; repo: string; enabledPlugin: string };

/**
 * The settings block the register publishes, read back out of it.
 *
 * The block is what somebody provisioning a Provider repository copies, so it is the one piece of
 * this document that lands in another repository verbatim. Reading it back rather than trusting it
 * is the same rule the variable rosters follow: what was written is not what is true until it has
 * been read.
 */
export function parseDocumentedProviderSettings(body: string): ProviderSettings {
  // Every fenced block, then the one that is the settings block — rather than one regex reaching
  // from the first fence to the word it is looking for, which spans any fence between the two and
  // then fails as "not valid JSON", naming everything except the reason.
  const fences = [...body.matchAll(/```json\n([\s\S]*?)\n```/g)].map((hit) => hit[1]);
  const blocks = fences.filter((fence) => fence.includes('"enabledPlugins"'));
  if (blocks.length !== 1)
    return fail(
      `docs/infrastructure.md carries ${blocks.length} \`json\` fences containing ` +
        "`enabledPlugins`, and the register publishes exactly one — the block a Provider " +
        "repository commits, which this check reads back.",
    );
  const settings = json(blocks[0], "documented Provider settings block");

  const markets = asRecord(settings.extraKnownMarketplaces);
  const names = Object.keys(markets ?? {});
  if (names.length !== 1)
    return fail(
      `the documented settings block declares ${names.length} marketplaces. A Provider repository ` +
        "reaches this practice through one.",
    );
  const source = asRecord(markets?.[names[0]])?.source;
  const repo = asRecord(source)?.repo;
  if (typeof repo !== "string")
    return fail("the documented marketplace source names no `repo`");

  const enabled = Object.keys(asRecord(settings.enabledPlugins) ?? {});
  if (enabled.length !== 1)
    return fail(
      `the documented settings block enables ${enabled.length} plugins, and the baseline is one.`,
    );

  return { marketplace: names[0], repo, enabledPlugin: enabled[0] };
}

/** Every way the published block and the manifests can disagree, as lines a reader can act on. */
export function compareProviderSettings(
  documented: ProviderSettings,
  baseline: AgentBaseline,
  repository: string,
): string[] {
  const problems: string[] = [];
  if (documented.marketplace !== baseline.marketplace)
    problems.push(
      `the block names the marketplace "${documented.marketplace}" and ` +
        `.claude-plugin/marketplace.json calls it "${baseline.marketplace}"`,
    );
  if (documented.repo !== repository)
    problems.push(`the block fetches "${documented.repo}" and this repository is "${repository}"`);
  if (documented.enabledPlugin !== pluginId(baseline))
    problems.push(
      `the block enables "${documented.enabledPlugin}" and the manifests compose ` +
        `"${pluginId(baseline)}"`,
    );
  return problems;
}

/**
 * Every path a skill body reaches through `${CLAUDE_PLUGIN_ROOT}`.
 *
 * These resolve against the payload rather than against the working directory, so nothing else here
 * would notice one going stale: a moved document leaves the skill pointing at a file that exists in
 * this checkout and not in the copy a Provider repository installed. The trailing punctuation a
 * sentence puts after a path is trimmed, since a path is being named rather than linked.
 */
export function pluginRootPaths(body: string): string[] {
  const found = new Set<string>();
  for (const hit of body.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([A-Za-z0-9_./-]+)/g))
    found.add(hit[1].replace(/[.,;:]+$/, ""));
  return [...found];
}
