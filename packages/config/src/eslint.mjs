import jsxA11y from "eslint-plugin-jsx-a11y";

/**
 * The flat ESLint configuration shared across this repository's workspaces.
 *
 * It exists so that a rule turned on here is on wherever it applies, rather than in whichever
 * `eslint.config.mjs` happened to remember it. `apps/web` spreads it after its
 * `eslint-config-next` entries, and that file carries the argument for the order, which is
 * load-bearing. `packages/config` lints itself with it. `scripts` does not: it has its own
 * configuration and is Node tooling with no JSX in it.
 *
 * JavaScript rather than TypeScript, unlike the rest of `src`: ESLint loads this file itself,
 * and its loader is Node's.
 *
 * **It sets rules and registers no plugin, and that is forced rather than chosen.** ESLint
 * compares plugin objects by reference and throws `Cannot redefine plugin "jsx-a11y"` on any
 * mismatch, and `eslint-config-next` registers a wildcard-interop *copy* of
 * `eslint-plugin-jsx-a11y` rather than the module object, so nothing imported here can ever be
 * the same reference. Registering the plugin is therefore the consumer's: `apps/web` has it
 * from `eslint-config-next`, and `packages/config` does it in its own `eslint.config.mjs`. A
 * consumer that has neither fails loudly, with the rule's own name in the message.
 *
 * That bounds what declaring the plugin here buys in `apps/web`: the rule *names and
 * severities* below come from the version this package declares, so a change to them shows up
 * in a lockfile diff, but the code that runs them is still the copy `eslint-config-next`
 * resolved. Only a major-version split between the two would separate the two sets, and that
 * fails loudly rather than silently — a rule named here that the running plugin does not have
 * is an error naming the rule.
 */
export default [
  {
    rules: {
      // `eslint-config-next@16.3.0` depends on this plugin but enables six of its rules, all
      // at `warn`: five about ARIA attribute validity, plus `alt-text`. The plugin's own
      // `recommended` config enables 31 at `error` — 34 named, three of them `off`, out of 39
      // shipped — `label-has-associated-control`, `click-events-have-key-events`,
      // `anchor-is-valid`, `html-has-lang` and `iframe-has-title` among them. Counted from
      // `eslint-plugin-jsx-a11y@6.10.2`. `warn` is the part that matters: a warning does not
      // fail a run, so those six were never a gate.
      //
      // Spread from the plugin's own `recommended` rather than listed here, so the set is
      // whatever the declared version ships and a change to it arrives in a lockfile diff.
      //
      // `recommended` rather than `flatConfigs.strict`. Both enable the same 31 rules, and six
      // of them differ in the options they carry. The pair that decides it are
      // `no-static-element-interactions` and `no-noninteractive-tabindex`, which lose
      // `allowExpressionValues: true` under strict — the option that lets a `role` supplied by
      // an expression rather than a literal go unflagged, which is ordinary React. Strict also
      // drops the element exceptions in the two role-conversion rules and the handler list in
      // `no-noninteractive-element-interactions`, and adds `progressbar` and `slider` to the
      // roles `interactive-supports-focus` treats as tabbable. Nothing here has met one of
      // those cases yet, so strict would be a stricter answer to a question this codebase has
      // not asked.
      //
      // Nothing below downgrades a rule. All 31 stay at `error` as the plugin ships them.
      ...jsxA11y.flatConfigs.recommended.rules,

      // The one rule the spread above would quietly weaken, and the reason it is worth a line
      // of its own. A flat config entry replaces a rule wholesale rather than merging into it,
      // and `recommended` sets `alt-text` to a bare `"error"` with no options — so it lands on
      // top of `eslint-config-next`'s `["warn", { elements: ["img"], img: ["Image"] }]` and
      // throws away `img: ["Image"]`, the option that is the only reason `next/image`'s
      // `<Image>` is checked for alt text at all. Severity up, rule count up, and coverage of
      // the one image component this application will actually use silently down.
      //
      // `elements` is deliberately not restored with it. It defaults to
      // `["img", "object", "area", 'input[type="image"]']`, and Next narrows it to `["img"]`
      // alone, so copying Next's option verbatim would trade one silent narrowing for another.
      // Omitting it keeps all four and adds `<Image>` to them.
      "jsx-a11y/alt-text": ["error", { img: ["Image"] }],
    },
  },
];
