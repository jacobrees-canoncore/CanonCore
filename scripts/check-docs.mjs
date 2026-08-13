#!/usr/bin/env node
// Checks the documents against the sources they describe.
//
// A rule that lives only in prose is one nobody re-reads at the moment it is broken
// (docs/agents/workflow.md -> What a merge carries). These are the document claims that
// are machine-checkable, and they are exactly the class that went stale within three days
// of being written (docs/research/tracker-and-repository-audit.md section 7, finding 7).
//
//   1. required contexts  -  docs/infrastructure.md  vs  .github/workflows/ci.yml  vs  the ruleset
//   2. label roster       -  docs/agents/triage-labels.md  vs  the tracker's label list
//   3. variable roster    -  docs/infrastructure.md  vs  vercel env ls
//   4. links and anchors  -  every relative markdown link, across every tracked document
//   5. section pointers   -  every `file -> *Section*` reference, which is how CAN-76 replaced
//                            the duplication: one owning module, N one-line pointers
//
// Run:  node scripts/check-docs.mjs [--verbose]
//
// This file is the wiring: it reads files, runs the CLIs and prints the report. What their
// output *means* is scripts/lib/doc-checks.mjs, which is pure and is where the tests are.
//
// Exit 0 when nothing FAILED. A check whose source is unreachable is reported SKIP with the
// reason and does not fail the build - a transient API outage must not block every merge, which
// is the same reasoning that keeps a never-reporting context out of the ruleset. Skips are
// counted and printed, never silent.

import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  Skip,
  anchorsOf,
  compareVariables,
  diff,
  fail,
  findLinks,
  findPointers,
  parseCiJobNames,
  parseDocumentedContexts,
  parseDocumentedLabels,
  parseDocumentedVariables,
  parseLinearLabels,
  parseVercelEnv,
  pointerResolves,
  setEq,
  skip,
} from './lib/doc-checks.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VERBOSE = process.argv.includes('--verbose')
const WORKSPACE = 'ad2669ec-93a5-4ce1-97fa-c7d9247a1452'
const CONTEXT_HOME = 'docs/infrastructure.md'
const CI_WORKFLOW = '.github/workflows/ci.yml'
const LABEL_HOME = 'docs/agents/triage-labels.md'

const results = []
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

function check(name, fn) {
  try {
    results.push({ name, status: 'PASS', detail: fn() ?? '' })
  } catch (err) {
    results.push({ name, status: err instanceof Skip ? 'SKIP' : 'FAIL', detail: err.message })
  }
}

/** Run a command, or Skip if it is absent or refuses. */
function source(cmd, args, why) {
  try {
    return execFileSync(cmd, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60_000,
    })
  } catch (err) {
    skip(`${why}: \`${cmd} ${args.join(' ')}\` — ${(err.stderr || err.message).trim().split('\n')[0]}`)
  }
}

// ---------------------------------------------------------------------------
// 1. The required status check contexts.
//
// The CI job name is a required status check, so a rename that misses any copy blocks every
// merge for ever rather than until CI finishes. docs/infrastructure.md -> The ruleset is the
// single documented home for those names; this check ties that home to ci.yml and to the live
// ruleset, and refuses a second copy anywhere else in the documentation.
// ---------------------------------------------------------------------------

check('ci.yml job name matches the documented context', () => {
  const jobs = new Set(parseCiJobNames(read(CI_WORKFLOW)))
  const documented = parseDocumentedContexts(read(CONTEXT_HOME))
    .filter((r) => r.source.includes('ci.yml'))
    .map((r) => r.context)
  if (documented.length === 0) fail(`${CONTEXT_HOME} documents no context sourced from ci.yml`)
  const missing = documented.filter((c) => !jobs.has(c))
  if (missing.length)
    fail(
      `${CONTEXT_HOME} names ${missing.map((m) => `"${m}"`).join(', ')} as a ci.yml job, ` +
        `but ${CI_WORKFLOW} declares ${[...jobs].map((j) => `"${j}"`).join(', ')}. ` +
        `Renaming the job without the ruleset and this table blocks every merge for ever.`,
    )
  const extra = [...jobs].filter((j) => !documented.includes(j))
  if (extra.length)
    fail(
      `${CI_WORKFLOW} declares job(s) ${extra.map((j) => `"${j}"`).join(', ')} that ` +
        `${CONTEXT_HOME} does not record. Every job is a check context; record it or the ` +
        `ruleset cannot require it.`,
    )
  return `"${documented.join('", "')}"`
})

check('the job name has exactly one documented home', () => {
  const jobs = parseCiJobNames(read(CI_WORKFLOW))
  const allowed = new Set([CONTEXT_HOME, CI_WORKFLOW])
  const tracked = source('git', ['ls-files'], 'cannot list tracked files')
    .split('\n')
    .filter((f) => f.endsWith('.md') || f.endsWith('.yml') || f.endsWith('.mjs'))
    .filter((f) => !allowed.has(f))
    // The research archive and the incident record quote history verbatim, on purpose:
    // "never correct an entry into agreement with a later state". The tests quote the name
    // as fixture data, which is the same exemption for the same reason.
    .filter(
      (f) =>
        !f.startsWith('docs/research/') && f !== 'docs/incidents.md' && !f.endsWith('.test.mjs'),
    )
  const offenders = []
  for (const file of tracked) {
    let body
    try {
      body = read(file)
    } catch {
      continue
    }
    for (const job of jobs) if (body.includes(job)) offenders.push(`${file} ("${job}")`)
  }
  if (offenders.length)
    fail(
      `the CI job name is copied into ${offenders.join(', ')}. It must be named only in ` +
        `${CI_WORKFLOW} and ${CONTEXT_HOME}; everywhere else, point at that table.`,
    )
  return `${tracked.length} tracked files carry no copy`
})

check('the live ruleset requires the documented contexts', () => {
  const raw = source(
    'gh',
    [
      'api',
      'repos/jacobrees-canoncore/CanonCore/rules/branches/main',
      '--jq',
      '.[] | select(.type == "required_status_checks") | .parameters.required_status_checks[].context',
    ],
    'cannot read the ruleset',
  )
  const live = new Set(
    raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
  )
  if (live.size === 0) skip('the ruleset returned no required contexts (token may lack access)')
  const documented = new Set(parseDocumentedContexts(read(CONTEXT_HOME)).map((r) => r.context))
  if (!setEq(live, documented))
    fail(
      `ruleset requires [${[...live].join(', ')}] but ${CONTEXT_HOME} records ` +
        `[${[...documented].join(', ')}]. Only in ruleset: ` +
        `[${diff(live, documented).join(', ')}]; only in the doc: ` +
        `[${diff(documented, live).join(', ')}].`,
    )
  return `${live.size} contexts agree`
})

// ---------------------------------------------------------------------------
// 2. The label roster.
// ---------------------------------------------------------------------------

check('the label roster matches the tracker', () => {
  const documented = parseDocumentedLabels(read(LABEL_HOME))
  const live = parseLinearLabels(
    source(
      'orca',
      ['linear', 'team', 'labels', '--team', 'CAN', '--workspace', WORKSPACE, '--json'],
      'cannot read the tracker labels',
    ),
  )
  if (!setEq(live, documented))
    fail(
      `tracker holds [${[...live].sort().join(', ')}] but ${LABEL_HOME} records ` +
        `[${[...documented].sort().join(', ')}]. Only in the tracker: ` +
        `[${diff(live, documented).join(', ')}]; only in the doc: ` +
        `[${diff(documented, live).join(', ')}]. A label the doc invents cannot be applied — ` +
        `the CLI cannot create a label definition.`,
    )
  return `${live.size} labels agree`
})

// ---------------------------------------------------------------------------
// 3. The environment variable roster.
// ---------------------------------------------------------------------------

check('the variable roster matches Vercel', () => {
  const documented = parseDocumentedVariables(read(CONTEXT_HOME))
  if (documented.size === 0) fail(`${CONTEXT_HOME} records no Vercel-held variables`)
  const live = parseVercelEnv(
    source('vercel', ['env', 'ls', '--project', 'canoncore'], 'cannot read the Vercel environment'),
  )
  if (live.size === 0) skip('parsed no rows from `vercel env ls` — its output format may have moved')
  const problems = compareVariables(documented, live, `the roster in ${CONTEXT_HOME}`)
  if (problems.length)
    fail(
      `the roster in ${CONTEXT_HOME} disagrees with \`vercel env ls\`:\n    - ` +
        problems.join('\n    - '),
    )
  return `${documented.size} variables agree`
})

// ---------------------------------------------------------------------------
// 4 & 5. The pointers.
//
// The restructure of CAN-76 gave each rule one owning module and N one-line pointers. A pointer
// that rots is worse than the duplication it replaced, because the reader is now sent nowhere
// rather than to a stale copy. Both checks are local, so they always run.
// ---------------------------------------------------------------------------

// Built on first use rather than at module level. A `Skip` thrown out here would escape the
// reporting entirely: the run would die on a stack trace, taking every other check's result
// with it, and exit on a code that is not this script's.
let documentCache
const documents = () => {
  documentCache ??= new Map(
    source('git', ['ls-files', '*.md', '.claude/skills/*'], 'cannot list tracked files')
      .split('\n')
      .filter((f) => f.endsWith('.md'))
      .map((f) => {
        const body = read(f)
        return [f, { body, ...anchorsOf(body) }]
      }),
  )
  return documentCache
}

check('every relative link and anchor resolves', () => {
  const docs = documents()
  const broken = []
  for (const [file, { body }] of docs) {
    const base = dirname(file)
    for (const { link, path, fragment, line } of findLinks(body)) {
      const target = path ? join(base, path).replace(`${ROOT}/`, '') : file
      // A directory link is legitimate — `docs/adr/` points at the folder.
      if (path && !existsSync(join(ROOT, target))) {
        broken.push(`${file}:${line} → ${link} (no such file)`)
        continue
      }
      if (!fragment || !target.endsWith('.md')) continue
      let entry = docs.get(target)
      if (!entry) {
        try {
          entry = anchorsOf(read(target))
        } catch {
          continue
        }
      }
      if (!entry.anchors.has(fragment)) broken.push(`${file}:${line} → ${link} (no such anchor)`)
    }
  }
  if (broken.length) fail(`broken links:\n    - ${broken.join('\n    - ')}`)
  return `${docs.size} documents`
})

check('every "file → *Section*" pointer resolves', () => {
  const docs = documents()
  const byName = new Map([...docs.keys()].map((f) => [f.split('/').pop(), f]))
  const broken = []
  for (const [file, { body }] of docs) {
    for (const { file: named, section, display, line } of findPointers(body)) {
      const target = byName.get(named.split('/').pop())
      if (!target) continue // a document outside the tracked set; the link check owns those
      if (!pointerResolves(section, docs.get(target).titles))
        broken.push(`${file}:${line} → ${named} → *${display}*`)
    }
  }
  if (broken.length)
    fail(`pointers naming a section that does not exist:\n    - ${broken.join('\n    - ')}`)
  return 'all resolve'
})

// ---------------------------------------------------------------------------

const width = Math.max(...results.map((r) => r.name.length))
for (const r of results) {
  const line = `${r.status.padEnd(4)}  ${r.name.padEnd(width)}`
  console.log(r.status === 'PASS' && !VERBOSE ? line : `${line}  ${r.detail}`)
}

const failed = results.filter((r) => r.status === 'FAIL').length
const skipped = results.filter((r) => r.status === 'SKIP').length
console.log(
  `\n${results.length - failed - skipped} passed, ${skipped} skipped, ${failed} failed` +
    (skipped ? '  (a skipped check reached no source; it is not a pass)' : ''),
)
process.exit(failed ? 1 : 0)
