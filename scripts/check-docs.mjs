#!/usr/bin/env node
// Checks the documents against the sources they describe.
//
// A rule that lives only in prose is one nobody re-reads at the moment it is broken
// (docs/agents/workflow.md -> What a merge carries). These are the document claims that
// are machine-checkable, and they are exactly the class that went stale within three days
// of being written (docs/research/tracker-and-repository-audit.md section 7, finding 7).
//
//   1. required contexts  -  docs/infrastructure.md  vs  .github/workflows/ci.yml  vs  the ruleset
//   2. label roster       -  docs/agents/triage-labels.md  vs  orca linear team labels
//   3. variable roster    -  docs/infrastructure.md  vs  vercel env ls
//   4. links and anchors  -  every relative markdown link, across every tracked document
//   5. section pointers   -  every `file -> *Section*` reference, which is how CAN-76 replaced
//                            the duplication: one owning module, N one-line pointers
//
// Run:  node scripts/check-docs.mjs [--verbose]
//
// Exit 0 when nothing FAILED. A check whose source is unreachable is reported SKIP with the
// reason and does not fail the build - a transient API outage must not block every merge, which
// is the same reasoning that keeps a never-reporting context out of the ruleset. Skips are
// counted and printed, never silent.

import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VERBOSE = process.argv.includes('--verbose')
const WORKSPACE = 'ad2669ec-93a5-4ce1-97fa-c7d9247a1452'

const results = []
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

function check(name, fn) {
  try {
    const detail = fn()
    results.push({ name, status: 'PASS', detail: detail ?? '' })
  } catch (err) {
    results.push({
      name,
      status: err instanceof Skip ? 'SKIP' : 'FAIL',
      detail: err.message,
    })
  }
}

class Skip extends Error {}
const skip = (why) => {
  throw new Skip(why)
}
const fail = (why) => {
  throw new Error(why)
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

/** Rows of the first markdown table whose header row contains every column named. */
function table(markdown, ...columns) {
  const lines = markdown.split('\n')
  const head = lines.findIndex(
    (l) => l.trimStart().startsWith('|') && columns.every((c) => l.includes(c)),
  )
  if (head === -1) fail(`no table with columns ${columns.join(', ')}`)
  const cells = (l) =>
    l
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim())
  const names = cells(lines[head])
  const rows = []
  for (let i = head + 2; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trimStart().startsWith('|')) break
    const values = cells(line)
    rows.push(Object.fromEntries(names.map((n, j) => [n, values[j] ?? ''])))
  }
  if (rows.length === 0) fail(`table with columns ${columns.join(', ')} has no rows`)
  return rows
}

const unbacktick = (s) => s.replace(/`/g, '').trim()
const setEq = (a, b) => a.size === b.size && [...a].every((x) => b.has(x))
const diff = (a, b) => [...a].filter((x) => !b.has(x))

// ---------------------------------------------------------------------------
// 1. The required status check contexts.
//
// The CI job name is a required status check, so a rename that misses any copy blocks every
// merge for ever rather than until CI finishes. docs/infrastructure.md -> The ruleset is the
// single documented home for those names; this check ties that home to ci.yml and to the live
// ruleset, and refuses a second copy anywhere else in the documentation.
// ---------------------------------------------------------------------------

const CONTEXT_HOME = 'docs/infrastructure.md'
const CI_WORKFLOW = '.github/workflows/ci.yml'

function documentedContexts() {
  return table(read(CONTEXT_HOME), 'Context', 'Source').map((r) => ({
    context: unbacktick(r.Context),
    source: unbacktick(r.Source),
  }))
}

function ciJobNames() {
  const yaml = read(CI_WORKFLOW)
  const names = [...yaml.matchAll(/^\s{4}name:\s*(.+?)\s*$/gm)].map((m) =>
    m[1].replace(/^['"]|['"]$/g, ''),
  )
  if (names.length === 0) fail(`${CI_WORKFLOW} declares no job name:`)
  return names
}

check('ci.yml job name matches the documented context', () => {
  const jobs = new Set(ciJobNames())
  const documented = documentedContexts()
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
  const jobs = ciJobNames()
  const allowed = new Set([CONTEXT_HOME, CI_WORKFLOW, 'scripts/check-docs.mjs'])
  const tracked = source('git', ['ls-files'], 'cannot list tracked files')
    .split('\n')
    .filter((f) => f.endsWith('.md') || f.endsWith('.yml') || f.endsWith('.mjs'))
    .filter((f) => !allowed.has(f))
    // The research archive and the incident record quote history verbatim, on purpose:
    // "never correct an entry into agreement with a later state".
    .filter((f) => !f.startsWith('docs/research/') && f !== 'docs/incidents.md')
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
  const live = new Set(raw.split('\n').map((s) => s.trim()).filter(Boolean))
  if (live.size === 0) skip('the ruleset returned no required contexts (token may lack access)')
  const documented = new Set(documentedContexts().map((r) => r.context))
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
  const doc = read('docs/agents/triage-labels.md')
  const documented = new Set(
    table(doc, 'Label in our tracker')
      .concat(table(doc.slice(doc.indexOf('**State roles**')), 'Label in our tracker'))
      .map((r) => unbacktick(r['Label in our tracker']))
      .filter(Boolean),
  )
  // Recorded in the same file as present but deliberately unmapped.
  for (const m of doc.matchAll(/\*\*Unmapped:\*\*\s*Linear's\s*`([^`]+)`/g)) documented.add(m[1])

  const raw = source(
    'orca',
    ['linear', 'team', 'labels', '--team', 'CAN', '--workspace', WORKSPACE, '--json'],
    'cannot read the tracker labels',
  )
  let live
  try {
    live = new Set(JSON.parse(raw).result.labels.map((l) => l.name))
  } catch (err) {
    skip(`could not parse orca linear output: ${err.message}`)
  }
  if (!setEq(live, documented))
    fail(
      `tracker holds [${[...live].sort().join(', ')}] but docs/agents/triage-labels.md records ` +
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
  const documented = new Map(
    table(read(CONTEXT_HOME), 'Variable', 'Holder', 'Environments', 'Sensitivity')
      .filter((r) => r.Holder.includes('Vercel'))
      .map((r) => [
        unbacktick(r.Variable),
        {
          environments: new Set(r.Environments.split(',').map((s) => s.trim()).filter(Boolean)),
          sensitive: /(^|[^-])\bSensitive\b/i.test(r.Sensitivity) && !/Non-sensitive/i.test(r.Sensitivity),
        },
      ]),
  )
  if (documented.size === 0) fail(`${CONTEXT_HOME} records no Vercel-held variables`)

  const raw = source(
    'vercel',
    ['env', 'ls', '--project', 'canoncore'],
    'cannot read the Vercel environment',
  )
  // Strip OSC 8 hyperlinks and ANSI, then read the fixed-width listing.
  const plain = raw
    // eslint-disable-next-line no-control-regex
    .replace(/\]8;;[^]*(|\\)/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/\[[0-9;]*m/g, '')
  const live = new Map()
  for (const line of plain.split('\n')) {
    const m = line.match(/^\s+([A-Z][A-Z0-9_]*)\s+\S.*?\s+(Sensitive|Non-sensitive|Encrypted|Plain)\s+(.+?)\s*$/)
    if (!m) continue
    const [, name, sensitivity, envs] = m
    const environments = new Set(
      (envs.match(/Production|Preview|Development/g) ?? []).map((s) => s),
    )
    const entry = live.get(name) ?? { environments: new Set(), sensitive: false }
    for (const e of environments) entry.environments.add(e)
    entry.sensitive ||= sensitivity === 'Sensitive'
    live.set(name, entry)
  }
  if (live.size === 0) skip('parsed no rows from `vercel env ls` — its output format may have moved')

  const problems = []
  for (const [name, want] of documented) {
    const got = live.get(name)
    if (!got) {
      problems.push(`${name} is documented but Vercel does not hold it`)
      continue
    }
    if (!setEq(want.environments, got.environments))
      problems.push(
        `${name}: documented for [${[...want.environments].join(', ')}], Vercel has ` +
          `[${[...got.environments].sort().join(', ')}]`,
      )
    if (want.sensitive !== got.sensitive)
      problems.push(
        `${name}: documented ${want.sensitive ? 'Sensitive' : 'Non-sensitive'}, Vercel has ` +
          `${got.sensitive ? 'Sensitive' : 'Non-sensitive'}`,
      )
  }
  for (const name of live.keys())
    if (!documented.has(name))
      problems.push(`${name} is set on Vercel but missing from the roster in ${CONTEXT_HOME}`)

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

const docFiles = source('git', ['ls-files', '*.md', '.claude/skills/*'], 'cannot list tracked files')
  .split('\n')
  .filter((f) => f.endsWith('.md'))

const norm = (s) => s.replace(/[`*]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

/** GitHub's heading slug, including its -1/-2 suffixes for repeats. */
function anchorsOf(body) {
  const seen = new Map()
  const set = new Set()
  const titles = []
  for (const m of body.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)) {
    titles.push(norm(m[1]))
    const base = m[1]
      .trim()
      .toLowerCase()
      .replace(/[`*_[\]()]/g, '')
      .replace(/[^\w\- ]/g, '')
      .replace(/ /g, '-')
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    set.add(n === 0 ? base : `${base}-${n}`)
  }
  return { anchors: set, titles }
}

const docs = new Map(
  docFiles.map((f) => {
    const body = read(f)
    return [f, { body, ...anchorsOf(body) }]
  }),
)

check('every relative link and anchor resolves', () => {
  const broken = []
  for (const [file, { body }] of docs) {
    const base = dirname(file)
    for (const m of body.matchAll(/\]\(([^)\s]+)\)/g)) {
      const link = m[1]
      // Absolute URLs, and site-absolute paths that name a route rather than a file.
      if (/^(https?:|mailto:|#?\/)/.test(link) && !link.startsWith('#')) continue
      const [path, frag] = link.split('#')
      const target = path ? join(base, path).replace(`${ROOT}/`, '') : file
      const line = body.slice(0, m.index).split('\n').length
      // A directory link is legitimate — `docs/adr/` points at the folder.
      if (path && !existsSync(join(ROOT, target))) {
        broken.push(`${file}:${line} → ${link} (no such file)`)
        continue
      }
      if (!frag || !target.endsWith('.md')) continue
      const entry = docs.get(target) ?? (() => {
        try {
          return anchorsOf(read(target))
        } catch {
          return null
        }
      })()
      if (entry && !entry.anchors.has(frag)) broken.push(`${file}:${line} → ${link} (no such anchor)`)
    }
  }
  if (broken.length) fail(`broken links:\n    - ${broken.join('\n    - ')}`)
  return `${docs.size} documents`
})

check('every "file → *Section*" pointer resolves', () => {
  const byName = new Map([...docs.keys()].map((f) => [f.split('/').pop(), f]))
  const pattern =
    /`?([A-Za-z0-9_./-]+\.md)`?\s*(?:\]\([^)]*\))?\s*→\s*\*([^*]+)\*/gs
  const broken = []
  for (const [file, { body }] of docs) {
    for (const m of body.matchAll(pattern)) {
      const target = byName.get(m[1].split('/').pop())
      if (!target) continue // a document outside the tracked set; the link check owns those
      const want = norm(m[2])
      // A pointer may shorten a long heading, so a title prefix counts.
      if (!docs.get(target).titles.some((t) => t === want || t.startsWith(want)))
        broken.push(
          `${file}:${body.slice(0, m.index).split('\n').length} → ${m[1]} → *${m[2].replace(/\s+/g, ' ')}*`,
        )
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
  if (r.status === 'PASS') console.log(VERBOSE ? `${line}  ${r.detail}` : line)
  else console.log(`${line}  ${r.detail}`)
}

const failed = results.filter((r) => r.status === 'FAIL').length
const skipped = results.filter((r) => r.status === 'SKIP').length
console.log(
  `\n${results.length - failed - skipped} passed, ${skipped} skipped, ${failed} failed` +
    (skipped ? '  (a skipped check reached no source; it is not a pass)' : ''),
)
process.exit(failed ? 1 : 0)
