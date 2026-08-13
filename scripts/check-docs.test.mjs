import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

// Seam B: the CLI's contract with CI — what it exits with, and what it prints. The parsing
// underneath is `lib/doc-checks.test.mjs`; this file only cares about the report.

const HERE = dirname(fileURLToPath(import.meta.url))
const CLI = join(HERE, 'check-docs.mjs')

/** Run the checker and return its exit code and combined output, never throwing. */
function run({ cli = CLI, env } = {}) {
  try {
    const stdout = execFileSync(process.execPath, [cli], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    })
    return { code: 0, output: stdout }
  } catch (err) {
    return { code: err.status, output: `${err.stdout ?? ''}${err.stderr ?? ''}` }
  }
}

test('an unreachable source is reported, and does not abort the whole run', () => {
  // Every check reaching a CLI must degrade to SKIP. If one of them can throw past the
  // reporting instead, a hiccup in `git` costs the operator every other check's result and
  // exits on a stack trace — which reads as "the documents are broken" when nothing is.
  const { code, output } = run({ env: { PATH: '/nonexistent' } })

  assert.doesNotMatch(output, /at ModuleJob\.run|^\s+at /m, 'it exited on a stack trace')
  assert.match(output, /^SKIP/m, 'no check reported SKIP')
  assert.match(output, /passed, \d+ skipped, \d+ failed/, 'no summary was printed')
  assert.match(output, /not a pass/, 'the summary did not say a skip is not a pass')
  assert.equal(code, 0, 'an unreachable source must not fail the build')
})

// --- Against a fixture repository ----------------------------------------------------------
// The checks read tracked files, so a fixture has to be a real git repo laid out like this one.
// The external CLIs are kept off PATH so only the local checks decide the exit code.

const LOCAL_ONLY = { PATH: '/usr/bin:/bin' }

function fixture({ jobName, documentedContext }) {
  const dir = mkdtempSync(join(tmpdir(), 'check-docs-'))
  const write = (rel, body) => {
    mkdirSync(join(dir, dirname(rel)), { recursive: true })
    writeFileSync(join(dir, rel), body)
  }

  write(
    '.github/workflows/ci.yml',
    ['name: CI', 'on: push', 'jobs:', '  check:', `    name: ${jobName}`, '    steps:', '      - run: echo'].join('\n'),
  )
  write(
    'docs/infrastructure.md',
    [
      '# Infrastructure',
      '',
      '| Context | Source | Where it comes from |',
      '| --- | --- | --- |',
      `| \`${documentedContext}\` | \`.github/workflows/ci.yml\` | The job name |`,
      '',
      '| Variable | Holder | Environments | Sensitivity | What it is |',
      '| --- | --- | --- | --- | --- |',
      '| `DATABASE_URL` | Vercel | Production | Sensitive | The connection string |',
    ].join('\n'),
  )
  write(
    'docs/agents/triage-labels.md',
    [
      '# Triage labels',
      '',
      '**Category roles**',
      '',
      '| Label in mattpocock/skills | Label in our tracker | Meaning |',
      '| --- | --- | --- |',
      '| `bug` | `Bug` | Something is broken |',
      '',
      '**State roles**',
      '',
      '| Label in mattpocock/skills | Label in our tracker | Meaning |',
      '| --- | --- | --- |',
      '| `needs-triage` | `needs-triage` | Needs evaluating |',
    ].join('\n'),
  )

  cpSync(HERE, join(dir, 'scripts'), { recursive: true })
  execFileSync('git', ['init', '-q'], { cwd: dir })
  execFileSync('git', ['add', '-A'], { cwd: dir })
  return join(dir, 'scripts', 'check-docs.mjs')
}

test('a job renamed out from under the register fails the build', () => {
  // The four-copies failure: rename the job and the required status check is a context nothing
  // emits, so every merge is blocked for ever rather than until CI finishes.
  const cli = fixture({ jobName: 'build only', documentedContext: 'test, typecheck, lint, build' })
  const { code, output } = run({ cli, env: LOCAL_ONLY })

  assert.equal(code, 1, 'drift did not fail the build')
  assert.match(output, /^FAIL {2}ci\.yml job name matches the documented context/m)
  assert.match(output, /blocks every merge for ever/)
})

test('a register that agrees with the workflow passes, and unreachable sources only skip', () => {
  const cli = fixture({ jobName: 'test, typecheck, lint, build', documentedContext: 'test, typecheck, lint, build' })
  const { code, output } = run({ cli, env: LOCAL_ONLY })

  assert.doesNotMatch(output, /^FAIL/m, output)
  assert.match(output, /^SKIP {2}the live ruleset requires the documented contexts/m)
  assert.equal(code, 0)
})
