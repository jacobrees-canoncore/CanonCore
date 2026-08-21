import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  Skip,
  anchorsOf,
  compareSecuritySettings,
  compareVariables,
  explainFailure,
  findLinks,
  findPointers,
  expiryDay,
  httpStatus,
  parseActionsSecrets,
  parseCiJobNames,
  parseDocumentedReleaseTokens,
  parseDocumentedSecuritySettings,
  parseSecretNames,
  parseSecurityAndAnalysis,
  parseUncheckedVariables,
  parseVercelTokens,
  parseVercelEnv,
  pointerResolves,
  readDependencyGraph,
  readVulnerabilityAlerts,
  renderJobSummary,
  lastUsedTokenNamed,
  loadedLines,
  parseDocumentedLineTarget,
  resolvePointer,
  findAvoidedWords,
  parseGlossary,
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

// --- The roster's three holders, and the rows the check cannot reach --------------------------
// Every row has to land in exactly one of the three readers below. A row that falls between them
// is compared by nothing and named by nothing, which is agreement reported across a roster the
// check never read in full.

const ROSTER = [
  '| Variable | Holder | Environments | Sensitivity | What it is |',
  '| --- | --- | --- | --- | --- |',
  '| `DATABASE_URL` | Vercel | Production | Sensitive | the application role |',
  '| `MIGRATION_DATABASE_URL` | GitHub Actions secret | — | — | the migration role |',
  '| `TMDB_API_READ_ACCESS_TOKEN` | `provider-tmdb` | Production | Sensitive | pending that repo |',
].join('\n')

test('the Actions-held rows are read apart from the Vercel-held ones', () => {
  assert.deepEqual([...parseActionsSecrets(ROSTER)], ['MIGRATION_DATABASE_URL'])
})

test('a documented variable no holder reaches is named rather than silently dropped', () => {
  // CAN-109 Decide whether the label roster check needs enforcing, or is honest as it stands
  // brought the Actions secrets under comparison, so what is left unchecked is the rows held
  // where neither reader looks — a Provider's own Vercel project, under ADR-0014. Dropping one
  // quietly is the same failure as dropping an unparseable row.
  assert.deepEqual(parseUncheckedVariables(ROSTER), ['TMDB_API_READ_ACCESS_TOKEN'])
})

test('a secret listing is read as one name per line, trailing newline and all', () => {
  // `gh secret list --json name --jq '.[].name'`, captured from the real CLI on 16 August 2026.
  // An empty last line read as a name would fail the comparison against a roster that is right.
  assert.deepEqual(
    [...parseSecretNames('MIGRATION_DATABASE_URL\nVERCEL_TOKEN\n')],
    ['MIGRATION_DATABASE_URL', 'VERCEL_TOKEN'],
  )
})

// --- The release token ------------------------------------------------------------------------
// Two tokens carried the release name between 14 and 16 August 2026, both unexpired. That is what
// this check has to survive: a date nobody can verify by reading, against a name that is not
// unique.

// `vercel tokens ls --json --limit 100` as it actually prints — captured from the real CLI on
// 16 August 2026, trimmed to the fields the check reads. The blank first line is the CLI's own.
const TOKENS_JSON = `
{
  "tokens": [
    {
      "id": "NC7KwX54fmoSWeutOo7UsXIqUEv3diIxfawJ9ShwJFpSUxcS",
      "name": "canoncore-github-actions-release",
      "type": "token",
      "origin": "manual",
      "scopes": [{ "type": "user", "origin": "manual" }],
      "expiresAt": 1818261829244,
      "activeAt": 1786902231859,
      "createdAt": 1786704237308
    },
    {
      "id": "J5nUaKcvT86vF42TaT36M4shmQc0KEetOuii8YdIJEV32nXi",
      "name": "canoncore-github-actions-release",
      "type": "token",
      "origin": "manual",
      "scope": "project-only",
      "scopes": [{ "type": "team", "teamId": "team_fM6JucuEULAiTuHY5TM5h3TP" }],
      "teamId": "team_fM6JucuEULAiTuHY5TM5h3TP",
      "expiresAt": 1818259570993,
      "activeAt": 1786703515811,
      "createdAt": 1786702034313,
      "projectId": "prj_BMzP9Dq7Qx3Eev8WwsvVoH5khnaU"
    },
    {
      "id": "z07dBaUWIKKlbSNSSq0VOs9h3Uix9QALTG5EE7QcqP4CwJD5",
      "name": "canoncore-local-dev",
      "type": "token",
      "origin": "manual",
      "scopes": [{ "type": "user", "origin": "manual" }],
      "expiresAt": null,
      "activeAt": 1776169222273,
      "createdAt": 1776167362737
    }
  ]
}`

const TOKEN_TABLE = [
  '| Token | Scope | Expires | State |',
  '| --- | --- | --- | --- |',
  "| `canoncore-github-actions-release` | User | `2027-08-14` | **Live.** What CI holds |",
  "| `canoncore-github-actions-release` | Project | `2027-08-14` | **Replaced** 14 August 2026 |",
].join('\n')

test('exactly one documented token row is the live one', () => {
  const rows = parseDocumentedReleaseTokens(TOKEN_TABLE)

  assert.equal(rows.length, 2)
  assert.deepEqual(
    rows.filter((r) => r.live),
    [
      {
        name: 'canoncore-github-actions-release',
        scope: 'User',
        expires: '2027-08-14',
        live: true,
      },
    ],
  )
})

test('the token in use is the one used most recently, not the one created first', () => {
  // The whole point. Both tokens carry the release name and both are unexpired, so a check
  // matching on the name alone would have called the replaced one a match and passed on a
  // roster that was wrong — which is exactly what happened for two days in prose.
  const live = lastUsedTokenNamed(parseVercelTokens(TOKENS_JSON), 'canoncore-github-actions-release')

  assert.equal(live?.id, 'NC7KwX54fmoSWeutOo7UsXIqUEv3diIxfawJ9ShwJFpSUxcS')
  assert.equal(live?.projectOnly, false)
  assert.equal(expiryDay(live?.expiresAt ?? null), '2027-08-14')
})

test('a project-only token is read as one, and a token that never expires as never', () => {
  const tokens = parseVercelTokens(TOKENS_JSON)

  assert.equal(tokens.find((t) => t.projectOnly)?.id.startsWith('J5nUaKc'), true)
  assert.equal(expiryDay(tokens.find((t) => t.name === 'canoncore-local-dev')!.expiresAt), 'never')
})

test('a name no token carries comes back as nothing rather than as the wrong token', () => {
  assert.equal(lastUsedTokenNamed(parseVercelTokens(TOKENS_JSON), 'canoncore-release'), undefined)
})

test('a token listing that is not JSON, or carries no array, is a skip and not a failure', () => {
  // Same rule as the tracker's labels: an unreadable source must not read as a source that
  // disagreed. `vercel` changing its output format is an outage, not a stale roster.
  assert.throws(() => parseVercelTokens('Error: not logged in'), Skip)
  assert.throws(() => parseVercelTokens('{"error":{"code":"forbidden"}}'), Skip)
})

// --- The security settings --------------------------------------------------------------------
// Seven rows in three places, and the roster's own claim is that "off" here is a decision rather
// than a gap — which holds only while every row is compared and every setting is named.

// The roster as docs/infrastructure.md writes it, read back from the live repository on 17 August
// 2026. Every row's source is read off its own third column, so this fixture is also the record of
// which three shapes that column takes.
const SECURITY_ROSTER = [
  '| Setting | State | Read back by |',
  '| --- | --- | --- |',
  '| Dependency graph | **enabled** | `dependency-graph/sbom` → a package count while on. It answered `404` while off |',
  '| Dependabot alerts | **enabled** | `vulnerability-alerts` → `204 No Content` ([the documented *enabled*](https://x)) |',
  '| Secret scanning | **enabled** | `security_and_analysis.secret_scanning.status` |',
  '| Dependabot security updates | disabled | `security_and_analysis.dependabot_security_updates.status` |',
].join('\n')

const LIVE = {
  analysis: new Map([
    ['secret_scanning', true],
    ['dependabot_security_updates', false],
  ]),
  alerts: true,
  graph: true,
}

test('each row is routed to the source the roster names beside it', () => {
  // Which call speaks for a row is read off the document rather than off a list in the checker.
  // A row moved to a different source is then followed; a list would go on comparing it against
  // the one it used to have, and agree.
  assert.deepEqual(
    parseDocumentedSecuritySettings(SECURITY_ROSTER).map((r) => [r.setting, r.enabled, r.source]),
    [
      ['Dependency graph', true, { kind: 'graph' }],
      ['Dependabot alerts', true, { kind: 'alerts' }],
      ['Secret scanning', true, { kind: 'analysis', field: 'secret_scanning' }],
      ['Dependabot security updates', false, { kind: 'analysis', field: 'dependabot_security_updates' }],
    ],
  )
})

test('a roster row that is neither enabled nor disabled fails on the document alone', () => {
  // It decides without reaching a source, so it holds where `gh` is unreachable too — the same
  // shape as two rows claiming to be the live release token.
  assert.throws(
    () =>
      parseDocumentedSecuritySettings(
        [
          '| Setting | State | Read back by |',
          '| --- | --- | --- |',
          '| Secret scanning | **on** | `security_and_analysis.secret_scanning.status` |',
        ].join('\n'),
      ),
    /neither \*\*enabled\*\* nor disabled/,
  )
})

test('a roster row naming a source nothing can read fails rather than being skipped past', () => {
  // A row nothing compares is a row that has left the check without leaving the document, which
  // is the silence the whole script exists to remove.
  assert.throws(
    () =>
      parseDocumentedSecuritySettings(
        [
          '| Setting | State | Read back by |',
          '| --- | --- | --- |',
          '| Private vulnerability reporting | disabled | the Settings page |',
        ].join('\n'),
      ),
    /names no source this check can read/,
  )
})

test('a roster that agrees with the repository reports no problems', () => {
  assert.deepEqual(compareSecuritySettings(parseDocumentedSecuritySettings(SECURITY_ROSTER), LIVE), [])
})

test('a setting flipped under the roster is reported, whichever source answers for it', () => {
  // One row from each of the three sources, so a source wired to the wrong reading cannot pass
  // by agreeing with itself.
  assert.deepEqual(
    compareSecuritySettings(parseDocumentedSecuritySettings(SECURITY_ROSTER), {
      analysis: new Map([
        ['secret_scanning', false],
        ['dependabot_security_updates', false],
      ]),
      alerts: false,
      graph: false,
    }),
    [
      'Dependency graph: the roster records enabled, the repository has disabled',
      'Dependabot alerts: the roster records enabled, the repository has disabled',
      'Secret scanning: the roster records enabled, the repository has disabled',
    ],
  )
})

test('a setting the repository carries and the roster does not is reported', () => {
  // The mirror of a secret set but undocumented, and the harder half to notice: GitHub adds
  // settings to this block, and an unrecorded one is off by omission rather than by decision.
  assert.deepEqual(
    compareSecuritySettings(parseDocumentedSecuritySettings(SECURITY_ROSTER), {
      ...LIVE,
      analysis: new Map([...LIVE.analysis, ['secret_scanning_validity_checks', false]]),
    }),
    [
      '`security_and_analysis.secret_scanning_validity_checks.status` is a setting the repository ' +
        'carries and the roster does not record, so whether it is off by decision or by omission is unsaid',
    ],
  )
})

test('a roster row read back from a field the repository does not carry is reported', () => {
  // A field GitHub renamed or withdrew. Reading it as `undefined` and comparing would make every
  // such row disagree in the same direction, which reads as the setting having been turned off.
  assert.deepEqual(
    compareSecuritySettings(parseDocumentedSecuritySettings(SECURITY_ROSTER), {
      ...LIVE,
      analysis: new Map([['dependabot_security_updates', false]]),
    }),
    [
      'Secret scanning is read back from `security_and_analysis.secret_scanning.status`, which the ' +
        'repository does not carry',
    ],
  )
})

test('a source named by no row at all fails, because nothing would be left to notice', () => {
  // Two of the three calls speak for a single row each. Delete that row and the call leaves the
  // check with it, and the rows that remain agree — which reads from the report exactly like seven
  // having been compared. The `security_and_analysis` half is covered the other way round, by the
  // mirror that reports a live setting no row records.
  assert.throws(
    () =>
      parseDocumentedSecuritySettings(
        [
          '| Setting | State | Read back by |',
          '| --- | --- | --- |',
          '| Secret scanning | **enabled** | `security_and_analysis.secret_scanning.status` |',
        ].join('\n'),
      ),
    /names no row read back from `vulnerability-alerts`, `dependency-graph\/sbom`/,
  )
})

test('a repository that answers with no security_and_analysis block is a skip, not a repository with nothing on', () => {
  // GitHub returns the block only to a caller with admin, so an empty answer is a refusal. It is
  // also this check's proof of entitlement — both readers below document `404` as their *off*,
  // and a `404` returned to a caller who could not read them either way is not an answer.
  assert.throws(() => parseSecurityAndAnalysis('   \n'), Skip)
  assert.throws(() => parseSecurityAndAnalysis('   \n'), /only to a caller with admin/)
})

test('a status the run cannot read fails, because the source answered', () => {
  // A SKIP says no source was reached. Here one was, and it said something this cannot read — so
  // skipping would both misreport what happened and take all seven rows out of the gate on the one
  // machine where the gate exists, an unknown status being reachable only once admin is proved.
  // A control over security settings treats what it cannot read as a denial rather than a pass.
  const unread = () => parseSecurityAndAnalysis('{"secret_scanning":{"status":"pending"}}')

  assert.throws(unread, /roster is not being compared/)
  assert.throws(unread, (err) => err instanceof Error && !(err instanceof Skip))
})

test('a source that could not be reached at all still skips', () => {
  // The other half of the same rule, and the reason it is a rule rather than a preference: an
  // outage must not read as a roster that disagreed.
  assert.throws(() => parseSecurityAndAnalysis('not json'), Skip)
})

test('a block that parses to something other than an object skips rather than failing', () => {
  // `null` is valid JSON, and `Object.entries(null)` throws a `TypeError` — which the report
  // classifies FAIL, on the one path the whole design requires to SKIP. A refusal has to skip
  // whichever way it arrives, and not only in the spelling this `gh` happens to use.
  for (const answer of ['null', '"disabled"', '[]']) {
    assert.throws(() => parseSecurityAndAnalysis(answer), Skip, `${answer} did not skip`)
  }
})

test('the five security_and_analysis rows are read as GitHub prints them', () => {
  // `gh api repos/jacobrees-canoncore/CanonCore --jq .security_and_analysis`, captured from the
  // real CLI on 17 August 2026.
  const live = parseSecurityAndAnalysis(
    '{"dependabot_security_updates":{"status":"disabled"},"secret_scanning":{"status":"enabled"},' +
      '"secret_scanning_non_provider_patterns":{"status":"disabled"},' +
      '"secret_scanning_push_protection":{"status":"enabled"},' +
      '"secret_scanning_validity_checks":{"status":"disabled"}}',
  )

  assert.equal(live.size, 5)
  assert.equal(live.get('secret_scanning_push_protection'), true)
  assert.equal(live.get('secret_scanning_validity_checks'), false)
})

// `gh api` exits non-zero on a `404` and prints the status twice, once per stream: its own line on
// stderr and GitHub's body on stdout. `attempt` takes stderr first, so this is the shape that
// actually reaches `httpStatus`; the body form is asserted separately below.
const ghFailure = (status: number, message: string) => ({
  ok: false,
  output: `gh: ${message} (HTTP ${status})`,
})

test('a status is read from either copy gh prints', () => {
  assert.equal(httpStatus('gh: Not Found (HTTP 404)'), 404)
  assert.equal(httpStatus('{\n  "message": "Forbidden",\n  "status": "403"\n}'), 403)
  assert.equal(httpStatus('spawnSync gh ENOENT'), undefined)
})

test("Dependabot alerts read 204 as on and 404 as off, and anything else as unread", () => {
  // GitHub documents exactly those two answers for this endpoint, which is what lets the `404`
  // `gh` exits non-zero on be a reading rather than a failure.
  assert.equal(readVulnerabilityAlerts({ ok: true, output: '' }), true)
  assert.equal(readVulnerabilityAlerts(ghFailure(404, 'Not Found')), false)
  assert.throws(() => readVulnerabilityAlerts(ghFailure(403, 'Forbidden')), Skip)
  assert.throws(() => readVulnerabilityAlerts({ ok: false, output: 'spawnSync gh ENOENT' }), Skip)
})

test('the dependency graph is read from the SBOM, which has no field of its own', () => {
  // A package count while on, `404` while off. The refusal this could be confused with is a
  // `403` here, and a caller without admin has already skipped the whole check upstream — so a
  // `404` arriving is the graph being off.
  assert.deepEqual(readDependencyGraph({ ok: true, output: '696\n' }), {
    enabled: true,
    indexed: true,
    packages: 696,
  })
  assert.deepEqual(readDependencyGraph(ghFailure(404, 'Not Found')), {
    enabled: false,
    indexed: false,
    packages: 0,
  })
  assert.throws(() => readDependencyGraph(ghFailure(403, 'Forbidden')), Skip)
})

test('a graph holding only the repository itself is on and has indexed nothing', () => {
  // The reading `enabled` cannot carry, and the one a `404` used to be the only sign of. Why one
  // package is none, and what the threshold rests on, is `readDependencyGraph`'s own docblock.
  // What is pinned here is the boundary, because it is the whole of the decision.
  assert.deepEqual(readDependencyGraph({ ok: true, output: '1\n' }), {
    enabled: true,
    indexed: false,
    packages: 1,
  })

  // Two is the boundary: one dependency beside the repository's own entry is a manifest parsed.
  assert.equal(readDependencyGraph({ ok: true, output: '2\n' }).indexed, true)

  // Zero has never been seen from this endpoint, and the threshold catches it anyway rather than
  // resting on that. `> 1` is deliberately not `=== 1`: a reading below the self entry is a graph
  // holding even less, not a special case to pass through.
  assert.equal(readDependencyGraph({ ok: true, output: '0\n' }).indexed, false)
})

test('an SBOM answer that is not a package count fails rather than being read as on', () => {
  // `--jq` producing anything but a number means the payload's shape moved. Treating it as truthy
  // would report the graph enabled on the strength of not having read it, and skipping would call
  // an endpoint that answered `200` unreachable. `Number("")` is `0`, so the empty case has to be
  // caught before the parse rather than by it.
  for (const answer of ['null\n', '', 'not a number']) {
    assert.throws(
      () => readDependencyGraph({ ok: true, output: answer }),
      (err) => err instanceof Error && !(err instanceof Skip),
      `${JSON.stringify(answer)} did not fail`,
    )
  }
  assert.throws(() => readDependencyGraph({ ok: true, output: '' }), /not being compared/)
})

// --- The job summary --------------------------------------------------------------------------

test('the job summary names what was skipped, and says a skip is not a pass', () => {
  // Why one is written at all: a green run's page has to say which rows were compared and which
  // were not, without opening the log. A summary reporting only the tally would read, from its
  // green tick, exactly like a run that checked everything.
  const summary = renderJobSummary([
    { name: 'the variable roster matches Vercel', status: 'PASS', detail: '8 variables agree' },
    { name: 'the label roster matches the tracker', status: 'SKIP', detail: '`orca` is not here' },
  ])

  assert.match(summary, /\| SKIP \| the label roster matches the tracker \| `orca` is not here \|/)
  assert.match(summary, /1 passed, 1 skipped, 0 failed/)
  assert.match(summary, /not a pass/)
})

test('a summary with nothing skipped does not warn about skips', () => {
  const summary = renderJobSummary([
    { name: 'the secret roster matches GitHub Actions', status: 'PASS', detail: '2 secrets agree' },
  ])

  assert.doesNotMatch(summary, /not a pass/)
  assert.match(summary, /1 passed, 0 skipped, 0 failed/)
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

// `_` is the pair only a rendered heading can tell apart: markup in the one, content in the
// other, and identical in the raw line. Why GitHub keeps the one and drops the other, with the
// source: the note on `anchorsOf`.

test('an underscore survives the slug, as GitHub keeps it', () => {
  const { anchors } = anchorsOf('## `neondb_owner` cannot SET ROLE to another role')

  assert.ok(anchors.has('neondb_owner-cannot-set-role-to-another-role'))
})

test('an emphasised word loses its underscores, which are markup rather than content', () => {
  const { anchors } = anchorsOf('## An _emphasised_ word')

  assert.ok(anchors.has('an-emphasised-word'))
})

test('brackets, parentheses and asterisks are dropped from the slug', () => {
  const { anchors } = anchorsOf('## `new Error(message[, options])` and an *emphasised* word')

  assert.ok(anchors.has('new-errormessage-options-and-an-emphasised-word'))
})

test('a non-ASCII letter survives the slug', () => {
  const { anchors } = anchorsOf('## Débogage du système')

  assert.ok(anchors.has('débogage-du-système'))
})

test('a link in a heading is slugged with its text, never its target', () => {
  const { anchors } = anchorsOf('## See [the workflow](docs/agents/workflow.md) first')

  assert.ok(anchors.has('see-the-workflow-first'))
})

// The same mistake one layer down, and the reason both `toString` options are off. Inline HTML and
// an `alt` attribute are markup rather than contents, so GitHub slugs neither.

test('inline HTML in a heading contributes what it wraps, not the tags', () => {
  const { anchors } = anchorsOf('## Press <kbd>Ctrl</kbd> to stop')

  assert.ok(anchors.has('press-ctrl-to-stop'))
})

test('an image in a heading contributes nothing, its alt text least of all', () => {
  const { anchors } = anchorsOf('## ![logo](logo.png) The project')

  assert.ok(anchors.has('-the-project'))
})

test('repeated headings get GitHub -1 / -2 suffixes', () => {
  const { anchors } = anchorsOf(
    ['## The account', '## The account', '## The account'].join('\n\ntext\n\n'),
  )

  assert.deepEqual([...anchors], ['the-account', 'the-account-1', 'the-account-2'])
})

// What is a heading at all. The first two were wrong in this repository's own documents before
// CAN-87 check-docs slugs the raw heading, not the rendered one, so three kinds of heading get an
// anchor GitHub will not resolve. The third never was: the `^#` line match ignored frontmatter
// correctly, and it is the parser that would invent a heading there without its extension.

test('a `#` comment inside a fenced code block is not a heading', () => {
  const { anchors, titles } = anchorsOf(
    ['# The loop', '', '```bash', '# create the branch first', '```'].join('\n'),
  )

  assert.deepEqual([...anchors], ['the-loop'])
  assert.deepEqual(titles, ['the loop'])
})

test('a heading nested in a blockquote or a list item is still a heading', () => {
  const { anchors } = anchorsOf(['> ### Quoted', '', '1. Item', '', '   ### Nested'].join('\n'))

  assert.deepEqual([...anchors], ['quoted', 'nested'])
})

test('YAML frontmatter is not a heading, though its closing `---` would make one', () => {
  const { anchors } = anchorsOf(
    ['---', 'name: implement', 'description: does a thing', '---', '', '# The body'].join('\n'),
  )

  assert.deepEqual([...anchors], ['the-body'])
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

test('a destination CommonMark allows a space in is read rather than passed over', () => {
  // The `](…)` match this replaced required a destination holding no whitespace, so both forms
  // that legitimately hold one went unchecked with no FAIL and no SKIP. A bare `](docs/c d.md)`
  // is not a link at all, so unlike those two there is nothing there to reject.
  const body = [
    '[bracketed](<docs/a file.md>)',
    '[titled](docs/b.md "The title")',
    '[neither](docs/c d.md)',
  ].join('\n\n')

  assert.deepEqual(
    findLinks(body).map((l) => l.path),
    ['docs/a file.md', 'docs/b.md'],
  )
})

test('a reference definition is a destination too', () => {
  const body = ['See [the gates][gates].', '', '[gates]: docs/agents/workflow.md#the-gates'].join('\n')

  assert.deepEqual(
    findLinks(body).map(({ path, fragment }) => [path, fragment]),
    [['docs/agents/workflow.md', 'the-gates']],
  )
})

test('a link inside a code fence is an example rather than a link', () => {
  // A document showing what a link looks like is not making one. The same question, for a `#`
  // comment being read as a heading, was settled by CAN-87 check-docs slugs the raw heading, not
  // the rendered one, so three kinds of heading get an anchor GitHub will not resolve.
  const body = ['```md', '[a](docs/deleted.md)', '```'].join('\n')

  assert.deepEqual(findLinks(body), [])
})

// --- Pointers ------------------------------------------------------------------------------
// A pointer is prose, but the document it names is markdown — a link, a code span or a bare
// filename — and any of those can wrap across lines and carry a blockquote marker into the middle
// of the section name. CAN-119 Close check-docs's two silent pointer holes replaced the raw-text
// match for the reason the note on `anchorsOf` gives: what a match cannot see, it passes over.

test('a pointer whose section name wraps across lines still resolves', () => {
  const body = '`docs/agents/issue-tracker.md` → *A description write must not be\nbundled with anything else*'
  const [pointer] = findPointers(body)
  const { titles } = anchorsOf('### A description write must not be bundled with anything else')

  assert.deepEqual(pointer.target, { kind: 'name', value: 'docs/agents/issue-tracker.md' })
  assert.ok(pointerResolves(pointer.section, titles))
})

test('a bare pointer to a document nothing tracks resolves to nothing', () => {
  // The first silent hole. The check passed over any file it could not find, on the stated
  // assumption that the link check owned file existence — but `findLinks` reads `](…)` syntax and
  // a bare prose pointer has none, so renaming the file left every bare pointer to it stale.
  const [pointer] = findPointers('`docs/agents/renamed-away.md` → *The gates*')

  assert.deepEqual(resolvePointer(pointer.target, 'CLAUDE.md', ['docs/agents/workflow.md']), [])
})

test('a filename written in prose resolves wherever the document sits', () => {
  // A pointer names a document rather than a path from the document citing it:
  // `frontend-design-scope.md` is cited from `docs/adr/` and from `docs/research/` alike.
  const [pointer] = findPointers('`frontend-design-scope.md` → *Rejected, with reasons*')

  assert.deepEqual(
    resolvePointer(pointer.target, 'docs/adr/0013-hand-written-css-no-framework.md', [
      'docs/research/frontend-design-scope.md',
    ]),
    ['docs/research/frontend-design-scope.md'],
  )
})

test('a name carrying a directory has to match that directory', () => {
  // Where a name is a path from the repository root, matching it by basename alone would let a
  // pointer go on resolving after the document moved out from under it — stale in exactly the way
  // a bare pointer to a deleted file is, and just as quiet.
  const [pointer] = findPointers('`docs/gone/workflow.md` → *The gates*')

  assert.deepEqual(resolvePointer(pointer.target, 'CLAUDE.md', ['docs/agents/workflow.md']), [])
})

test('a bare filename two documents share names neither of them', () => {
  // Four tracked documents are called `SKILL.md` and two are called `README.md`. Returning the
  // first match would resolve the pointer against whichever `git ls-files` happened to list first,
  // so the caller is handed both and fails.
  const [pointer] = findPointers('`README.md` → *The gates*')

  assert.deepEqual(
    resolvePointer(pointer.target, 'CLAUDE.md', ['README.md', 'docs/research/README.md']),
    ['README.md', 'docs/research/README.md'],
  )
})

test('the supersession form, a link whose text is the ADR number, is a pointer', () => {
  // The second silent hole, and it is how ADR-0004 and ADR-0007 point into ADR-0014. The match
  // required the `.md` filename as the link *text*, so the whole chain matched nothing: renaming a
  // heading in ADR-0014 left CI green while the amended ADRs pointed at a section that had gone.
  const body = '> [ADR-0014](0014-shell-providers-and-per-source-retention.md) → *Decision 6*.'
  const [pointer] = findPointers(body)

  assert.deepEqual(pointer.target, {
    kind: 'link',
    value: '0014-shell-providers-and-per-source-retention.md',
  })
  assert.deepEqual(
    resolvePointer(pointer.target, 'docs/adr/0004-layered-overlay-for-sources-and-edits.md', [
      'docs/adr/0014-shell-providers-and-per-source-retention.md',
    ]),
    ['docs/adr/0014-shell-providers-and-per-source-retention.md'],
  )
})

test('an ADR named by its number alone still names a document', () => {
  const [pointer] = findPointers('it does not: ADR-0005 → *Repo shape* names `packages/domain`')

  assert.deepEqual(pointer.target, { kind: 'adr', value: '0005' })
  assert.deepEqual(
    resolvePointer(pointer.target, 'docs/research/production-readiness-baseline.md', [
      'docs/adr/0005-stack.md',
    ]),
    ['docs/adr/0005-stack.md'],
  )
})

test("a blockquote's own marker does not become part of the section named", () => {
  // Live in `docs/compliance/childrens-risk-assessment.md`: the name wraps, and matching raw text
  // put the continuation line's `>` into the middle of the heading.
  const body = [
    '> [ADR-0012](../adr/0012-adult-works.md) → *The poster is provider',
    '> content*.',
  ].join('\n')
  const [pointer] = findPointers(body)
  const { titles } = anchorsOf('## The poster is provider content, so the Part that governs it is Part 5')

  assert.equal(pointer.section, 'the poster is provider content')
  assert.ok(pointerResolves(pointer.section, titles))
})

test('a pointer whose arrow ends the line is still a pointer', () => {
  // The other way a quoted pointer wraps, live in ADR-0012. `\s*` cannot cross the `>` that opens
  // the continuation line, so the match saw an arrow pointing at nothing.
  const body = [
    '> [`docs/research/tracker-and-repository-audit.md`](../research/tracker-and-repository-audit.md) →',
    '> *CAN-13 Artwork*.',
  ].join('\n')
  const [pointer] = findPointers(body)

  assert.deepEqual(pointer.target, {
    kind: 'link',
    value: '../research/tracker-and-repository-audit.md',
  })
  assert.equal(pointer.section, 'can-13 artwork')
})

test('an arrow that names no document is not a pointer', () => {
  // Both shapes are live and both are correct prose. Reading either as a pointer would fail a run
  // over a document naming no file at all: `docs/compliance/code-measures-register.md` maps each
  // duty to a section of a page, and `docs/incidents.md` walks a user interface.
  assert.deepEqual(findPointers('| *How we protect people from illegal content* → *Terrorism content* |'), [])
  assert.deepEqual(findPointers("Projects → the row's menu → *Update Project Connection*"), [])
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

// ---------------------------------------------------------------------------------------------
// `CLAUDE.md`'s length: the one document here with a published number to fail against, and one that
// has drifted both ways unnoticed (docs/research/document-length-for-agents.md).
// ---------------------------------------------------------------------------------------------

test('a maintainer comment does not count towards what a document costs to load', () => {
  // Seven lines on disk. `Block-level HTML comments ... are stripped before the content is injected
  // into Claude's context` (code.claude.com/docs/en/memory), so four of them are free.
  const body = ['# Title', '<!--', 'a note', 'to a maintainer', '-->', '', 'A rule.'].join('\n')

  assert.equal(loadedLines(body), 3)
})

test('a comment that opens and closes on one line does not swallow the rest', () => {
  const body = ['<!-- one line -->', '# Title', 'A rule.'].join('\n')

  assert.equal(loadedLines(body), 2)
})

test('the newline a file ends with is not a line of its own', () => {
  // Every tracked document here ends with one, so getting this wrong reads every file as a line
  // longer than it is — and this check exists to compare against a number.
  assert.equal(loadedLines('# Title\nA rule.\n'), 2)
})

test('the target is read from the document that has to meet it', () => {
  // Written here rather than in the checker so the number has one home, and stated inside the
  // comment because that is the part of the file that costs nothing to load.
  const body = ['# CanonCore', '<!--', 'Loaded every request. Target: under 200 lines (docs).', '-->'].join('\n')

  assert.equal(parseDocumentedLineTarget(body), 200)
})

test('a document stating no target fails saying what it expected, rather than defaulting to one', () => {
  // Defaulting to 200 would make deleting the comment the cheapest way to pass. It FAILS rather
  // than skipping because the source is a tracked file and so is always reachable: a missing target
  // is drift, not an outage.
  assert.throws(
    () => parseDocumentedLineTarget('# CanonCore\n\nNo comment at all.'),
    (err: unknown) =>
      err instanceof Error &&
      !(err instanceof Skip) &&
      /Target: under N lines/.test(err.message),
  )
})

test('a comment closing mid-line leaves the text beside it counted, and does not swallow the rest', () => {
  // The failure this guards runs the wrong way: an over-long file would be reported as short, so
  // the gate goes quiet rather than noisy.
  const body = ['# Title', '<!-- an aside --> and a rule', 'Another rule.'].join('\n')

  assert.equal(loadedLines(body), 3)
})

test('a comment marker inside a fenced block is an example, not a comment', () => {
  // A file explaining its own maintainer comment is exactly the file likely to quote one. Read as
  // real, an unclosed marker drops every line below it and the count comes back short — quiet, and
  // in the direction that passes.
  const body = ['# Title', '```markdown', '<!--', 'how to write one', '```', 'A rule.'].join('\n')

  assert.equal(loadedLines(body), 6)
})

test('prose that reads like a target does not become one', () => {
  // The docstring, the failure message and the gate all say the number lives in the document's own
  // comment. Prose matching first would let a sentence anywhere in the file raise the ceiling.
  // Deliberately *above* the comment, because first-match-wins would otherwise pass this by
  // accident rather than by scoping.
  const body = [
    '# CanonCore',
    'An earlier draft said Target: under 900 lines. It is quoted here and is not the rule.',
    '<!--',
    'Target: under 200 lines (code.claude.com/docs/en/memory).',
    '-->',
  ].join('\n')

  assert.equal(parseDocumentedLineTarget(body), 200)
})

// --- The glossary's `_Avoid_` lists ------------------------------------------------------------

/**
 * A glossary laid out like `CONTEXT.md`: the exemption table, then entries carrying a definition,
 * an optional `_e.g._` line and an `_Avoid_` list. Only the entries a case needs are written, so
 * the shared/one-owner split is whatever that case set up rather than whatever the real glossary
 * happens to hold today.
 */
const glossaryOf = (entries: string, exemptions: string[] = []) =>
  parseGlossary(
    [
      '## Language',
      '',
      '**A proper name is exempt.**',
      '',
      '| Phrase | Why the word is not the banned one |',
      '| --- | --- |',
      ...(exemptions.length ? exemptions : ['| `nothing at all` | A row, so the table has one |']),
      '',
      entries,
    ].join('\n'),
  )

const MERGE = ['**Merge**:', "One person's assertion that two Anchors are the same thing.", '_Avoid_: Deduplicate, link, alias, combine, resolve'].join('\n')
const ORDERING = ['**Ordering**:', 'A named, authored sequence over Stories.', '_e.g._ Broadcast order. An in-universe chronology.', '_Avoid_: List, order, sort, sequence, timeline, collection, playlist'].join('\n')
const CATALOGUE = ['**Catalogue**:', "One person's own Stories.", '_Avoid_: Library, collection, database'].join('\n')

test('the glossary is read out of the document rather than carried here', () => {
  const glossary = glossaryOf([MERGE, ORDERING].join('\n\n'))

  assert.deepEqual(
    glossary.terms.map((t) => t.term),
    ['Merge', 'Ordering'],
  )
  assert.deepEqual(glossary.terms[0].avoid, ['deduplicate', 'link', 'alias', 'combine', 'resolve'])
  // Carried for `provider-contract.test.ts`, which asserts the contract's closed vocabularies are
  // the words the glossary defines. It stops at the `_Avoid_` line, which is not the definition.
  assert.match(glossary.terms[0].definition, /two Anchors are the same thing/)
  assert.doesNotMatch(glossary.terms[0].definition, /Avoid/)
})

test('a term whose entry states no `_Avoid_` list fails rather than passing over it', () => {
  // The lists are the whole subject. An entry that lost one would otherwise be a concept the
  // check silently stopped enforcing, which is the drift this file exists to catch.
  assert.throws(
    () => glossaryOf(['**Merge**:', 'One assertion.'].join('\n')),
    /Merge.*no `_Avoid_` list/,
  )
})

test('a glossary holding no terms fails, because an empty set is not agreement', () => {
  assert.throws(() => glossaryOf('Nothing but prose here.'), /no glossary entries were found/)
})

test('a word used for the concept its list names is a finding', () => {
  const found = findAvoidedWords(
    'A Merge is one assertion, held as an alias rather than a rewrite.',
    glossaryOf(MERGE),
  )

  assert.deepEqual(
    found.map((f) => [f.term, f.word]),
    [['Merge', 'alias']],
  )
})

test('the same word in a sentence that names no concept is left alone', () => {
  // The whole of the scoping: `alias` is banned for Merge, not banned outright. A sentence about
  // DNS is not a sentence using it for Merge, and flagging it would be the noise that gets a
  // gate turned off.
  assert.deepEqual(
    findAvoidedWords('The record is held as an alias of the apex.', glossaryOf(MERGE)),
    [],
  )
})

test('a word more than one concept bans is not checkable at all', () => {
  // `collection` is on Ordering's list and on Catalogue's. The glossary has not settled which
  // concept a bare use belongs to, so neither can this.
  assert.deepEqual(
    findAvoidedWords(
      'An Ordering is not a collection, and neither is a Catalogue.',
      glossaryOf([ORDERING, CATALOGUE].join('\n\n')),
    ),
    [],
  )
})

test('a verb is not a name, so it is not a use of the word for the concept', () => {
  assert.deepEqual(
    findAvoidedWords('One Ordering lists a serial where another lists episodes.', glossaryOf(ORDERING)),
    [],
  )
})

test('a proper name passes, which is the exemption the glossary already writes', () => {
  const found = findAvoidedWords(
    'An Ordering is separate, so a broadcast order and a chronological order are two of them.',
    glossaryOf(ORDERING, ['| `broadcast order` | A proper name of one Ordering |']),
  )

  assert.deepEqual(
    found.map((f) => f.quote),
    ['a chronological order'],
  )
})

test("the glossary's own `_Avoid_` and `_e.g._` lines are the lists and the names, not prose", () => {
  // Ordering's list is the word `order` itself, and its example is "Broadcast order". A check
  // reading either as prose would fail on the glossary that defines it.
  assert.deepEqual(findAvoidedWords(ORDERING, glossaryOf(ORDERING)), [])
})

test('an `_e.g._` mid-sentence is prose, and does not take the rest of the paragraph with it', () => {
  // The marker is structural where the glossary puts it — opening a line of its own. Read anywhere
  // else it would silently stop checking the rest of a paragraph, which is a hole nothing reports.
  const found = findAvoidedWords(
    'One example follows — _e.g._ a Merge is held as an alias rather than a rewrite.',
    glossaryOf(MERGE),
  )

  assert.deepEqual(
    found.map((f) => f.word),
    ['alias'],
  )
})

test('a table cell is a sentence of its own, because a row is not one', () => {
  // Tables are not parsed as tables here — the parser is CommonMark, where a table is a paragraph
  // of pipes — so without a boundary at `|` the register would be whatever any cell in the table
  // named, and the rows above and below it would join in.
  assert.deepEqual(
    findAvoidedWords(
      ['| Concept | How it is held |', '| --- | --- |', '| A Merge | as an alias |'].join('\n'),
      glossaryOf(MERGE),
    ),
    [],
  )
})

test('a word inside a code span is code rather than prose', () => {
  assert.deepEqual(
    findAvoidedWords('A Merge is stored in `an alias` column.', glossaryOf(MERGE)),
    [],
  )
})

test('the line reported is the line the word sits on, not the block it started in', () => {
  const found = findAvoidedWords(
    ['# Heading', '', 'A Merge is one assertion,', 'held as an alias rather than a rewrite.'].join('\n'),
    glossaryOf(MERGE),
  )

  assert.deepEqual(
    found.map((f) => f.line),
    [4],
  )
})

// --- A word the glossary only ever uses to qualify another term --------------------------------

const VALIDITY = ['**Validity**:', 'Whether the thing a Placement records counts.', '_Avoid_: Canon, canonical, canonicity, official, legitimate'].join('\n')
const VERSION = ['**Version**:', 'One specific way a Story can be watched.', '_Avoid_: Edition, cut, release'].join('\n')
const CANONICAL_VERSION = ['**Canonical version**:', 'An optional pointer from a Story to a Version.', '_Avoid_: Default, primary, main, preferred'].join('\n')

const QUALIFIED = glossaryOf([VALIDITY, VERSION, CANONICAL_VERSION].join('\n\n'))

test('a banned word the glossary only uses to qualify a term is a finding wherever it stands alone', () => {
  // No sentence here names Validity, and that is the point: `canonical` qualifies *Version* in
  // the glossary and does nothing else, so it has no standalone job to be doing.
  const found = findAvoidedWords('Broadcast order is the canonical episode set.', QUALIFIED)

  assert.deepEqual(
    found.map((f) => [f.term, f.word]),
    [['Validity', 'canonical']],
  )
})

test('the qualified term itself passes, since that is the word the glossary has', () => {
  assert.deepEqual(
    findAvoidedWords('A Story may point at a canonical version of itself.', QUALIFIED),
    [],
  )
})

test('a qualifier the glossary bans for nobody is not checked', () => {
  // "Listed Provider" qualifies Provider too, and `listed` is on no `_Avoid_` list. Only a word
  // the glossary has actually banned somewhere is one this can speak about.
  const glossary = glossaryOf(
    [
      '**Provider**:',
      'A service that speaks the contract.',
      '_Avoid_: Plugin, extension, adapter',
      '',
      '**Listed Provider**:',
      'A Provider this project runs.',
      '_Avoid_: First-party, built-in, core',
    ].join('\n'),
  )

  assert.deepEqual(findAvoidedWords('The listed set is short.', glossary), [])
})

test('a qualifier use the glossary exempts passes with its reason recorded there', () => {
  assert.deepEqual(
    findAvoidedWords(
      'The canonical host is www.canoncore.com.',
      glossaryOf(
        [VALIDITY, VERSION, CANONICAL_VERSION].join('\n\n'),
        ['| `canonical host` | DNS\'s own word for the name that serves |'],
      ),
    ),
    [],
  )
})
