---
status: accepted
---

# The testing stack: Vitest in the app, `node:test` in the tooling, Playwright against a deployed URL

Four commands are the test-and-build gate, and the Playwright suite deliberately is not among
them:

| Where | Runner | What it can see |
| --- | --- | --- |
| `apps/web` | **Vitest** 4, jsdom, with Testing Library | Units, rendered components, this directory's own configuration, and — against a real PostgreSQL — the row-level security policies |
| `scripts` | **`node:test`**, no runner installed | The repository's own artefacts, which import nothing from the app: the documents check, and the published Provider contract |
| `packages/config` | none yet | Nothing of its own — no `test` script and no test. The ESLint rules it exports are asserted from `apps/web` |
| Deployed URL | **Playwright** | A real environment, after something has been deployed |

**The gate is `pnpm -r test`, `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r build`, in that order, in
one Actions job.** [CAN-22 A page on a public URL, deployed, with CI](https://linear.app/jacobrees-canoncore/issue/CAN-22)
required the first three and the fourth is this project's own. The Playwright suite is outside all
four.

None of that was ever recorded as a decision. It arrived with CAN-22 A page on a public URL,
deployed, with CI and grew, and
[`docs/agents/workflow.md`](../agents/workflow.md) → *The gates* carries it as procedure — what to
run, in what order, and which check reaches which source. **This ADR records the choices under that
procedure**, so that the next runner or the next package is weighed against something. Settled
17 August 2026 under **CAN-75 Write the four missing ADRs and fix the glossary's self-violations**.
Procedure stays in `workflow.md`; nothing here restates it.

## Contents

- [Vitest, and the two things it is not asked to do](#vitest-and-the-two-things-it-is-not-asked-to-do)
- [`node:test` in `scripts`, which is not an inconsistency](#nodetest-in-scripts-which-is-not-an-inconsistency)
- [Playwright drives a deployed URL, which is why it is not a gate](#playwright-drives-a-deployed-url-which-is-why-it-is-not-a-gate)
- [The known gap: Testing Library cannot render an async Server Component](#the-known-gap-testing-library-cannot-render-an-async-server-component)
- [The rejected alternatives](#the-rejected-alternatives)
- [What will try to reopen it](#what-will-try-to-reopen-it)
- [Consequences](#consequences)

## Vitest, and the two things it is not asked to do

`apps/web` runs `vitest run` in a jsdom environment, with `@vitejs/plugin-react` and the `@` alias
resolved to `src` ([`apps/web/vitest.config.mts`](../../apps/web/vitest.config.mts)).

**Two globs, and the second is a seam rather than an exception.** A configuration file has no
importer to reach it through, so a test of one either sits beside it or is reached from a directory it
has nothing to do with. The second glob buys the first, which is why config tests are not under
`src`; [`apps/web/vitest.config.mts`](../../apps/web/vitest.config.mts) names the globs and which
file each is for.

**Vitest rather than Jest because the app is already a Vite-shaped toolchain's worth of
configuration.** Vitest reads TypeScript, JSX and the path alias through the same resolver the
plugin gives it, so the config holds no transform, no module mapper and no `ts-jest` — it is a
plugin, an alias and two globs. That is the whole of the argument, and it is a configuration
argument rather than a claim that one runner finds more bugs.

**Testing Library rather than snapshots or a renderer of our own.** `@testing-library/react` and
`@testing-library/dom` are the only rendering dependencies, and the component tests assert what a
reader sees rather than what the tree contains.

Two things this suite is deliberately not asked to do:

- **It is not the browser.** jsdom is not a rendering engine, so nothing about layout, focus or CSS
  is decided here — see *Playwright*, below.
- **It is not the deploy.** `next build` is the fourth command precisely because Vitest cannot see a
  server-only import reached from a client component or a page that throws during static generation.

**The one suite that is not optional is the row-level security suite**, and it is the reason `test`
runs first: [`apps/web/src/db/rls.test.ts`](../../apps/web/src/db/rls.test.ts) needs a real
PostgreSQL, and a misconfigured policy returns an empty result rather than an error, so a *skipped*
cross-tenant read test reports exactly what a broken one reports. [ADR-0005](0005-stack.md) →
*Three rules that are not optional* is what requires it; how it is wired, and why it fails rather
than skips on a runner, is [`docs/agents/workflow.md`](../agents/workflow.md) → *The gates*.
**That single requirement is what settles the runner question in the other direction too**: a runner
is acceptable here only if it can run node-environment database tests alongside jsdom component
tests in one command, which Vitest does per-file and a browser-only runner cannot do at all.

## `node:test` in `scripts`, which is not an inconsistency

[`scripts`](../../scripts) runs `node --test`, importing `node:test` and `node:assert/strict`, and
has no test runner in its dependencies at all.

**Node 24 runs the TypeScript directly**, so `node --test` over `check-docs.test.ts` needs no
transform, no loader and no config file. *"By default Node.js will execute TypeScript files that
contains only erasable TypeScript syntax"*, and type stripping has been "enabled by default" since
v23.6.0 ([Node.js, TypeScript support](https://nodejs.org/api/typescript.html), read 17 August 2026)
— comfortably inside what [`package.json`](../../package.json) requires (`engines.node >= 24`; the
tree runs 24.19.0). Adding
Vitest here would add a bundler and a devDependency to a package whose entire purpose is to be
runnable by whatever Node the runner already has.

**And the package has nothing in common with the app's suite.** It renders no component, needs no
DOM and imports nothing from `apps/web`.
Sharing a runner across the two would buy one fewer name in the repository and cost the property that
makes `scripts` trustworthy: it is the thing that checks the documents, and it depends on almost
nothing.

> **Amended 17 August 2026 — "almost nothing" is now nine packages, and the property is narrower
> than this section claimed.** It read "its five dependencies are four markdown parsers and a
> slugger", which stopped being true when
> [CAN-7 Provider contract: define and publish it](https://linear.app/jacobrees-canoncore/issue/CAN-7)
> added a second suite here: the published Provider contract is checked with an OpenAPI validator,
> a JSON Schema validator and a YAML parser.
>
> **The argument survives, and it is worth saying which part.** What made `scripts` trustworthy was
> never the count — it was that nothing it depends on can transform the thing under test. Four
> markdown parsers, a schema validator and a YAML parser are all *readers*; none is a bundler, a
> loader or a transform, so `node --test` over the TypeScript still needs no build step and the
> package is still runnable by whatever Node a runner already has. **A dependency that compiles or
> transforms is what would reverse this**, not the tenth reader.

**`scripts` is a workspace member for one reason — so that `pnpm -r test` includes it.** It sits at
the root rather than under `packages/` because it is repo tooling rather than shared TypeScript
([`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) says so at the line that adds it). Two runners
under one command is the consequence, and it is cheaper than the alternative.

## Playwright drives a deployed URL, which is why it is not a gate

[`apps/web/playwright.config.ts`](../../apps/web/playwright.config.ts) has **no `webServer`**, and
its `baseURL` is `CANONCORE_E2E_BASE_URL` falling back to the production URL from
`@canoncore/config`. So it tests a *deployment*, and there is nothing for it to talk to inside a CI
job that has deployed nothing.

**That is the decision, not an omission.** The alternative — `webServer` starting `next start`
against a local build — would test a fifth environment that nothing ships: no Vercel routing, no
Neon, no environment variables as production holds them. The failures worth catching end-to-end here
are exactly the ones that only exist once something is deployed, so pointing the suite at a preview
is what makes a green run mean anything.

**A preview URL is the intended target and production is the fallback**, which makes an
argument-free run a check on a deploy that has already happened rather than a gate on one about to.
The command, and what to do with the result, are
[`docs/agents/workflow.md`](../agents/workflow.md) → *The gates* and → *After the merge*.

**A path crossing a closed Provider is out of its reach from a preview**
([ADR-0014](0014-shell-providers-and-per-source-retention.md)), which bounds what an end-to-end run
can prove about an import and is a Provider-side decision rather than a testing one.

## The known gap: Testing Library cannot render an async Server Component

`@testing-library/react` cannot render an async Server Component. The app's front page is a Server
Component that reads the database, so **the component-test seam dies on the first data-driven page**
— recorded as a forward-looking finding of the 12–13 August audit
([`docs/research/tracker-and-repository-audit.md`](../research/tracker-and-repository-audit.md) →
*6. Landed-work review findings*).

**Recording it here rather than resolving it is deliberate.** The three answers are all real and all
premature: extract the data-free part of the page and test that (cheap, and does not test the page);
test the query and the deployed page separately, which is what the suite does today; or adopt a
runner that can render server components. The choice is made by the first page whose logic is worth a
component test, not by this ADR. What must not happen is the gap being discovered as "our tests do
not catch that" after a page ships.

## The rejected alternatives

**Jest** is the other default. It is rejected on configuration cost against this toolchain rather
than on capability, per *Vitest* above. Nothing in the suite depends on a Vitest-only API, so the
migration cost is a config file if that ever changes.

**Cypress** was not weighed against Playwright on features; `@playwright/test` was already the
Next.js-adjacent default and the suite drives one browser project (`chromium`). Reopening this needs
a reason from a real failure, not a comparison table.

**A single runner across all three packages** is rejected above: it would put a bundler into
`scripts`, and the saving is cosmetic.

**Testcontainers, or a per-run Neon branch, for the database tests.** CI runs a `postgres:17`
service container instead — 17 because production is PostgreSQL 17.10, read from Neon on 14 August
2026 and recorded at the `services:` block of
[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml). A per-run Neon branch would
cost a database credential in CI and make the gate depend on a vendor being up; the container makes
it depend on nothing but the runner.

**Coverage thresholds** are not adopted. A percentage gate on a repository whose most important test
is one assertion about an empty result set would measure the wrong thing and could be satisfied
without it. The non-negotiable suite is named explicitly instead, which is a stronger claim than a
number.

## What will try to reopen it

- **Any scaffold**, because every one of them writes a runner config. `vercel:next-forge` installs a
  Turborepo layout with its own test wiring, and reopens [ADR-0005](0005-stack.md) → *No build
  orchestrator* in the same move.
- **The absence of Playwright from CI reads as a bug**, and the fix that suggests itself is
  `webServer`. It is the wrong fix, for the reason above.
- **`packages/config` having no `test` script reads as a gap.** It is not one, and the real hazard is
  the opposite way round: `pnpm -r test` errors only when *no* package has the script, so a package
  with no tests is silent rather than failing
  ([`docs/research/tracker-and-repository-audit.md`](../research/tracker-and-repository-audit.md) →
  *6. Landed-work review findings*). That is a genuine silent-skip surface, and the reason a new
  package's first commit should carry a `test` script even where the suite is empty.

## Consequences

- **A new package declares a `test` script when it is created**, or its tests are skipped in silence
  by a command that still exits zero.
- **A test that needs a browser goes to Playwright and runs against a preview**, never into the
  jsdom suite.
- **The row-level security suite is the fixed point.** A change to the test stack has to keep it
  running against a real PostgreSQL, failing rather than skipping in CI.
- **Two runners are the settled state**, and unifying them is a change that has to argue against
  `scripts` depending on almost nothing.
- **The Server Component gap is owned by the first page that needs it**, and is on record here so
  that it is chosen rather than discovered.
