/**
 * The flat ESLint configuration every workspace in this repository inherits.
 *
 * It exists so that a rule turned on here is on everywhere, rather than in whichever
 * `eslint.config.mjs` happened to remember it. `packages/config` lints itself with it, and
 * `apps/web` spreads it after its `eslint-config-next` entries — that file says why the order
 * is load-bearing.
 *
 * JavaScript rather than TypeScript, unlike the rest of `src`: ESLint loads this file itself,
 * and its loader is Node's.
 */
export default [];
