import { test } from 'node:test'
import assert from 'node:assert/strict'

import { findBareReferences, findSplitEmphasis, findStrayAsterisks } from './linear-bodies.ts'

// Every specimen below is a verbatim read-back from a stored team `CAN` body on 21 August 2026,
// named where it came from. Inventing the shapes would be inventing the bug: what Linear stores is
// the whole subject, and a guess at it is what shipped a detector that missed half the corpus.

// docs/agents/issue-tracker.md -> Keep an emphasis run on one line, and check the stored body
const CORRUPTED_BOLD = `(31722153282), which skips identically. Found while landing **CAN-23 One Story from Neon, behind****
****row-level security**, whose PR added a \`DATABASE_PRODUCTION_HOST\` row to that very roster — so the`

const CORRUPTED_ITALIC = `whose document is \`docs/research/orca-gaps-and-the-worktree-workflow.md\` → *Question two: should**
**worktree-off-main be the documented default?*. The \`fatal:\` above was reproduced there, not inferred.`

// CAN-17 v1: the walking skeleton in production, then the founding case, lines 592-593: two bold
// runs, each whole, on consecutive lines. The line-boundary
// heuristic reads this as damage; nothing about it is damaged.
const TWO_WHOLE_BOLD_RUNS = ` * **Refresh and liveness transitions.**  
   **No longer out of scope, 15 August 2026.** ADR-0014 *Decision 6* makes retention a  `

test('a corrupted bold run is found', () => {
  const found = findStrayAsterisks(CORRUPTED_BOLD)
  assert.equal(found.length, 4)
  assert.deepEqual(
    found.map((f) => f.line),
    [1, 1, 2, 2],
  )
})

test('a corrupted italic run is found, which is the half the four-asterisk grep never saw', () => {
  assert.ok(
    !CORRUPTED_ITALIC.includes('****'),
    'the specimen carries no four-asterisk run to grep for',
  )
  const found = findStrayAsterisks(CORRUPTED_ITALIC)
  assert.equal(found.length, 4)
  assert.deepEqual(
    found.map((f) => f.line),
    [1, 2, 2, 2],
  )
})

test('two whole bold runs on consecutive lines are not damage', () => {
  assert.deepEqual(findStrayAsterisks(TWO_WHOLE_BOLD_RUNS), [])
})

test('an emphasis run split around inline code is not damage', () => {
  assert.deepEqual(findStrayAsterisks('**Do not** `await` **the send.**'), [])
})

test('asterisks quoted as the thing to look for are not damage', () => {
  const quoting = [
    'A stray `****` is the signature.',
    '',
    '```text',
    'behind****',
    '****row-level',
    '```',
  ].join('\n')
  assert.deepEqual(findStrayAsterisks(quoting), [])
})

test('an escaped asterisk is deliberate', () => {
  // The triage comment on CAN-135 Repair the 25 bodies Linear's emphasis mangling has corrupted,
  // and fix the check that misses half of them writes `\*\*` to show what was typed. Counting the
  // value of the text node rather than its source reports that comment as corrupt: four asterisks.
  const quoted = 'and omits \\*\\*`use=reference`\\*\\*, which is the signal'
  assert.deepEqual(findStrayAsterisks(quoted), [])
})

test('a clean body is clean', () => {
  const clean = [
    '## What to build',
    '',
    'A **bold run** and an *italic one*, each whole.',
    '',
    '* a bullet',
    '* another',
  ].join('\n')
  assert.deepEqual(findStrayAsterisks(clean), [])
})

test('the column names the asterisk, so the report can point at it', () => {
  assert.deepEqual(findStrayAsterisks('a *run**\n**split*'), [
    { line: 1, column: 8 },
    { line: 2, column: 1 },
  ])
})

test('a bare asterisk an author wrote in prose is reported too, which is the stated reach', () => {
  assert.deepEqual(findStrayAsterisks('a glob of * matches everything'), [{ line: 1, column: 11 }])
  assert.deepEqual(findStrayAsterisks('a glob of `*` matches everything'), [])
})

test('the guard refuses a bold run that crosses a newline', () => {
  const found = findSplitEmphasis(
    'Found while landing **CAN-23 One Story from Neon, behind\nrow-level security**, whose PR',
  )
  assert.equal(found.length, 1)
  assert.deepEqual(
    { startLine: found[0].startLine, endLine: found[0].endLine },
    { startLine: 1, endLine: 2 },
  )
  assert.match(found[0].text, /^CAN-23 One Story from Neon, behind/)
})

test('the guard refuses an italic run that crosses a newline', () => {
  const found = findSplitEmphasis(
    '→ *Question two: should\nworktree-off-main be the documented default?*.',
  )
  assert.equal(found.length, 1)
  assert.deepEqual(
    { startLine: found[0].startLine, endLine: found[0].endLine },
    { startLine: 1, endLine: 2 },
  )
})

test('the guard passes a run that is whole, however long the line', () => {
  const long = `A **${'word '.repeat(1200)}run** on one line.`
  assert.deepEqual(findSplitEmphasis(long), [])
})

test('the guard passes emphasis inside a fence, which is an example and not a run', () => {
  assert.deepEqual(findSplitEmphasis(['```text', '**A', 'B**', '```'].join('\n')), [])
})

test('the guard is blind to a body Linear has mangled, which is why it is not the detector', () => {
  assert.deepEqual(findSplitEmphasis(CORRUPTED_BOLD), [])
  assert.deepEqual(findSplitEmphasis(CORRUPTED_ITALIC), [])
  assert.equal(findStrayAsterisks(CORRUPTED_BOLD).length, 4)
  assert.equal(findStrayAsterisks(CORRUPTED_ITALIC).length, 4)
})

// ---------------------------------------------------------------------------
// The bare references a save converts, which is the other half of the guard.
// ---------------------------------------------------------------------------

const URL = 'https://linear.app/jacobrees-canoncore/issue/CAN-23'
const TITLED = `[CAN-23 One Story from Neon, behind row-level security](<${URL}>)`

test('a bare identifier in prose is found', () => {
  assert.deepEqual(findBareReferences('Deferred rather than answered on the CAN-23 branch.'), [
    { reference: 'CAN-23', line: 1, form: 'prose' },
  ])
})

test('an identifier that is the whole of a link text is found', () => {
  // What the GitHub sync rewrites into a GitHub number naming a different ticket.
  assert.deepEqual(findBareReferences(`Observed on [CAN-23](${URL}), from the person who wrote it.`), [
    { reference: 'CAN-23', line: 1, form: 'link text' },
  ])
})

test('the title inside the link text is immune', () => {
  assert.deepEqual(findBareReferences(`Landed under ${TITLED}, whose PR added a row.`), [])
})

test('a code span is immune', () => {
  assert.deepEqual(findBareReferences('The range `CAN-1` to `CAN-126` was swept.'), [])
})

test('a fence is immune', () => {
  assert.deepEqual(findBareReferences(['```text', 'landing CAN-23, whose PR', '```'].join('\n')), [])
})

test('a number inside a link text carrying more than the number is immune', () => {
  // Both read from stored bodies on 21 August 2026 — CAN-45 Preview deployments do not appear to
  // get their own Neon branch, and CAN-135 Repair the 25 bodies Linear's emphasis mangling has
  // corrupted, and fix the check that misses half of them. Neither is a violation, which is why the
  // check has to read link text rather than grep for the token.
  const pr = '[PR #59](<https://github.com/jacobrees-canoncore/CanonCore/pull/59>)'
  assert.deepEqual(findBareReferences(`the first preview deployment (${pr}, commit \`3d9eea9\`)`), [])
  const mirror =
    '[jacobrees-canoncore/CanonCore#212 Put the title inside the link text](<https://github.com/x>)'
  assert.deepEqual(findBareReferences(`merging ${mirror} will mangle it`), [])
})

test('a bare pull-request number in prose is found, since Linear linkifies whatever numbers that way', () => {
  assert.deepEqual(findBareReferences('Landed as #59 on 12 August.'), [
    { reference: '#59', line: 1, form: 'prose' },
  ])
})

test('number-and-title in plain text is still bare, which is the form that broke on this pass', () => {
  // The first line of CAN-85 Decide whether deploy ownership earns an ADR, or stays a note in the
  // register was exactly this. The save linkified the number and split the bold run around it. The
  // form these repository documents prescribe is not safe inside a Linear body.
  assert.deepEqual(
    findBareReferences('**CAN-23 One Story from Neon, behind row-level security** changed who owns it.'),
    [{ reference: 'CAN-23', line: 1, form: 'prose' }],
  )
})

test('the line is reported, so the report can point at it', () => {
  const body = ['## Parent', '', 'None.', '', 'Blocked by CAN-88 and CAN-127.'].join('\n')
  assert.deepEqual(
    findBareReferences(body).map((f) => `${f.reference}@${f.line}`),
    ['CAN-88@5', 'CAN-127@5'],
  )
})

test('a mirrored reference is reported once, not twice', () => {
  // `CanonCore#212` also matches the bare-number pattern; the longer form wins.
  assert.deepEqual(findBareReferences('See CanonCore#212 for the repair.'), [
    { reference: 'CanonCore#212', line: 1, form: 'prose' },
  ])
})

test('a code span is protection, measured across nineteen of them', () => {
  assert.deepEqual(findBareReferences('Deferred on the `CAN-23` branch.'), [])
  assert.deepEqual(findBareReferences('The range `CAN-1` to `CAN-4` is archived.'), [])
})

test('a code span alone inside an emphasis run is not protection', () => {
  // Sent on 21 August 2026 as `**\`CAN-69\`**'s`, stored as `[CAN-69](url)'s`: an emphasis run
  // wrapping nothing but a code span loses the code mark, and the bare identifier then linkifies.
  // The same run carrying text as well keeps it — `**\`CAN-88\`'s body needs…**` came back as
  // `` \`CAN-88\`**'s body needs…** ``, restructured but still code. So the run's other content is
  // what decides, and only the empty case is a hazard.
  assert.deepEqual(findBareReferences("**`CAN-69`**'s sentence is corrected"), [
    { reference: 'CAN-69', line: 1, form: 'lone code span in emphasis' },
  ])
  assert.deepEqual(findBareReferences("**`CAN-88`'s body needs both repairs**"), [])
  assert.deepEqual(findBareReferences('*`CAN-69`* on its own in italic'), [
    { reference: 'CAN-69', line: 1, form: 'lone code span in emphasis' },
  ])
})
