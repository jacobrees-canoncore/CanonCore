import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  Skip,
  anchorsOf,
  compareVariables,
  explainFailure,
  findLinks,
  findPointers,
  parseCiJobNames,
  parseVercelEnv,
  pointerResolves,
} from './doc-checks.ts'

// `vercel env ls` as it actually prints: OSC 8 hyperlinks around each environment name, one row
// per environment, trailing "3d ago" column. Captured from the real CLI on 13 August 2026.
const envRow = (
  name: string,
  value: string,
  sensitivity: string,
  environments: string[],
  age = '3d ago',
) =>
  ` ${name.padEnd(34)} ${value.padEnd(27)} ${sensitivity.padEnd(19)} ` +
  environments
    .map((e: string) => `\x1b]8;;https://vercel.com/x/settings/environments/${e}\x07${e}\x1b]8;;\x07`)
    .join(', ') +
  `    ${age}`

test('a variable whose name is not all capitals is still read', () => {
  // Vercel accepts any name matching /^[A-Za-z_][A-Za-z0-9_]*$/. One the parser cannot see is
  // one the roster check cannot report as missing — a silent hole in "one complete roster".
  const live = parseVercelEnv(
    [
      envRow('DATABASE_URL', 'Hidden', 'Sensitive', ['Production']),
      envRow('legacy_token', 'abc…', 'Non-sensitive', ['Production', 'Preview']),
    ].join('\n'),
  )

  const entry = live.get('legacy_token')
  assert.ok(entry, 'the lowercase-named variable was dropped')
  assert.deepEqual([...entry.environments].sort(), ['Preview', 'Production'])
})

test('a variable set on Vercel but absent from the roster is reported', () => {
  const documented = new Map([
    ['DATABASE_URL', { environments: new Set(['Production']), sensitive: true }],
  ])
  const live = parseVercelEnv(
    [
      envRow('DATABASE_URL', 'Hidden', 'Sensitive', ['Production']),
      envRow('legacy_token', 'abc…', 'Non-sensitive', ['Production']),
    ].join('\n'),
  )

  assert.deepEqual(compareVariables(documented, live, 'the roster'), [
    'legacy_token is set on Vercel but missing from the roster',
  ])
})

// The real listing wraps the rows in a header and a footer, neither of which is a variable.
const HEADER = ' name                               value                       type                environments                        created    '
const FOOTER = ['', 'Common next commands:', '- `vercel env add --project canoncore`'].join('\n')

test('a row that looks like a variable but does not parse is not dropped silently', () => {
  // If Vercel changes its column layout, rows stop matching. Dropping them quietly makes the
  // roster check report agreement it never established — the failure this check exists to catch.
  const raw = [
    HEADER,
    envRow('DATABASE_URL', 'Hidden', 'Sensitive', ['Production']),
    ' ROTATED_SECRET                     Hidden                      Production, Preview',
    FOOTER,
  ].join('\n')

  assert.throws(() => parseVercelEnv(raw), Skip, 'an unreadable row was swallowed')
})

test('the listing header and footer are not mistaken for variables', () => {
  const live = parseVercelEnv(
    [HEADER, envRow('DATABASE_URL', 'Hidden', 'Sensitive', ['Production']), FOOTER].join('\n'),
  )

  assert.deepEqual([...live.keys()], ['DATABASE_URL'])
})

test('a job with no name: reports its id as the check context', () => {
  // GitHub uses the job id when `name:` is absent. Deleting that line silently renames the
  // required status check, which blocks every merge for ever — the failure this whole script
  // exists to catch, so the parser has to name the new context rather than give up.
  const workflow = [
    'name: CI',
    'on: push',
    'jobs:',
    '  check:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v7',
    '      - name: Install',
    '        run: pnpm install',
  ].join('\n')

  assert.deepEqual(parseCiJobNames(workflow), ['check'])
})

test('a named job reports its name, and the workflow and step names are not jobs', () => {
  const workflow = [
    'name: CI',
    'jobs:',
    '  check:',
    "    name: test, typecheck, lint",
    '    steps:',
    '      - name: Install',
    '        run: pnpm install',
    '  publish:',
    '    name: "release"',
    '    steps: []',
  ].join('\n')

  assert.deepEqual(parseCiJobNames(workflow), ['test, typecheck, lint', 'release'])
})

// --- Anchors -------------------------------------------------------------------------------
// The em dash case here and the directory-link case under Links were both live bugs, found while
// writing CAN-76 Restructure the agent documents: policy, procedure and incidents get their own
// homes. The first made every pointer into a heading with an em dash look broken; the second made
// directory links look missing.

test('an em dash in a heading yields two hyphens, as GitHub does', () => {
  const { anchors } = anchorsOf('## `CLAUDE.md` — over the only limit that applies to it')

  assert.ok(anchors.has('claudemd--over-the-only-limit-that-applies-to-it'))
})

test('backticks and punctuation are dropped from the slug', () => {
  const { anchors } = anchorsOf('## `--delete-branch` fails after the merge has succeeded')

  assert.ok(anchors.has('--delete-branch-fails-after-the-merge-has-succeeded'))
})

// The two halves of the class this used to strip wholesale. Why GitHub keeps the one and drops the
// rest, with the sources: the note on `anchorsOf`.

test('an underscore survives the slug, as GitHub keeps it', () => {
  const { anchors } = anchorsOf('## `neondb_owner` cannot SET ROLE to another role')

  assert.ok(anchors.has('neondb_owner-cannot-set-role-to-another-role'))
})

test('brackets, parentheses and asterisks are dropped from the slug', () => {
  const { anchors } = anchorsOf('## `new Error(message[, options])` and an *emphasised* word')

  assert.ok(anchors.has('new-errormessage-options-and-an-emphasised-word'))
})

test('repeated headings get GitHub -1 / -2 suffixes', () => {
  const { anchors } = anchorsOf(
    ['## The account', '## The account', '## The account'].join('\n\ntext\n\n'),
  )

  assert.deepEqual([...anchors], ['the-account', 'the-account-1', 'the-account-2'])
})

// --- Links ---------------------------------------------------------------------------------

test('external and site-absolute links are left alone; relative ones are returned', () => {
  const body = [
    '[docs](https://example.com/a)',
    '[mail](mailto:report@canoncore.com)',
    '[a route](/legal/terms-of-service)',
    '[a folder](docs/adr/)',
    '[a section](../incidents.md#a-slash-command-sent-mid-message-never-loaded)',
  ].join('\n')

  assert.deepEqual(
    findLinks(body).map(({ path, fragment }) => [path, fragment]),
    [
      ['docs/adr/', undefined],
      ['../incidents.md', 'a-slash-command-sent-mid-message-never-loaded'],
    ],
  )
})

// --- Pointers ------------------------------------------------------------------------------

test('a pointer whose section name wraps across lines still resolves', () => {
  const body = '`docs/agents/issue-tracker.md` → *A description write must not be\nbundled with anything else*'
  const [pointer] = findPointers(body)
  const { titles } = anchorsOf('### A description write must not be bundled with anything else')

  assert.equal(pointer.file, 'docs/agents/issue-tracker.md')
  assert.ok(pointerResolves(pointer.section, titles))
})

test('a pointer may shorten a heading, but may not name a different one', () => {
  const { titles } = anchorsOf('## The review runs once, and `/implement` is normally where')

  assert.ok(pointerResolves('the review runs once', titles), 'a title prefix should resolve')
  assert.equal(pointerResolves('the review runs twice', titles), false)
})

// --- Why a source failed --------------------------------------------------------------------

test('the reason for a skip is the error line, not whatever came first', () => {
  // A SKIP exists to tell the operator what to fix. Taking stderr's first line gives them the
  // CLI's version instead — observed against `vercel env ls` with an invalid token, where the
  // real cause sat on the third line behind a plugin marker and a banner.
  const stderr = [
    '<claude-code-hint v="1" type="plugin" value="vercel@claude-plugins-official" />',
    'Vercel CLI 58.7.1 (Node.js 24.19.0)',
    'Error: You defined "--token", but its contents are invalid. Must not contain: "-"',
    'Learn More: https://err.sh/vercel/invalid-token-value',
  ].join('\n')

  assert.equal(
    explainFailure(stderr),
    'Error: You defined "--token", but its contents are invalid. Must not contain: "-"',
  )
})

test('a failure with no error line falls back to its first line', () => {
  // `git` absent from PATH reports exactly this, with no `Error:` prefix to find.
  assert.equal(explainFailure('\n\nspawnSync git ENOENT\n'), 'spawnSync git ENOENT')
})

test('a failure that said nothing at all says so', () => {
  assert.equal(explainFailure('   '), 'no output')
})

test('a CLI that reports its error as JSON on stdout still explains itself', () => {
  // `orca` exits non-zero with an empty stderr and a JSON envelope on stdout. That is the one
  // source with no CI backstop — the label roster gates locally or nowhere — so an unusable
  // reason there is the worst place to have one.
  const stdout = JSON.stringify(
    { id: "8419418d", ok: false, error: { code: "linear_invalid_workspace", message: "No connected Linear workspace matched bogus." } },
    null,
    2,
  )

  assert.equal(explainFailure(stdout), "No connected Linear workspace matched bogus.")
})
