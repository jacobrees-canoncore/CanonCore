# CanonCore

A catalogue for a media collection where one Story legitimately belongs in more than one place at
once.

**Live at [www.canoncore.com](https://www.canoncore.com)** — a holding page with one public Story
under it. See [Status](#status) for what actually exists.

## The problem

Franchise, series, season, episode is a real hierarchy, and it is not sufficient. An episode also
sits in an in-universe chronology that disagrees with the broadcast one, and it has to appear in
both without being duplicated. Every tool that models a collection as a folder tree forces you to
pick one and lie about the other.

CanonCore separates the two things that hierarchy conflates:

- **Story** — the thing that happened, independent of how anyone consumes it. *Blink.* *Series 1.*
  *The Day of the Doctor.* A Story may be part of several other Stories at once.
- **Version** — one specific way that Story can be watched, read or listened to. The broadcast cut
  and the 3D cinema release are two Versions of one Story, and they are not interchangeable.

Containment between Stories carries no order, because imposing an order on a set that has none
would be a lie. Ordering is a separate object, so a broadcast order and a chronological order are
two orderings over the same Stories rather than two copies of them.

The vocabulary is defined in full in [`CONTEXT.md`](CONTEXT.md), including the words this project
deliberately avoids for each concept. The reasoning behind each decision is in
[`docs/adr/`](docs/adr/) — start with [two levels](docs/adr/0001-two-levels-story-and-version.md)
and [orderings](docs/adr/0002-orderings-are-separate-from-containment.md).

## Status

**A walking skeleton, and it now goes all the way through.** One Story is stored in Neon behind
row-level security and rendered on the public URL to an anonymous visitor; CI gates run on every
push and the release migrates the database before it promotes production. The catalogue itself is
not built yet — there is no way to sign in and no way to add a second Story.

What that means concretely: roughly 800 lines of application code against thirteen architecture
decision records and a domain model. The design work ran ahead of the implementation on purpose,
and the ratio will correct itself as vertical slices land, not by adding more planning.

CanonCore holds **no media bytes** and never will — it catalogues what exists and hands playback
off to whatever already holds the file. That is a
[recorded decision](docs/adr/0006-no-playback-hand-off-to-media-servers.md), not an omission.

## Stack

TypeScript, Next.js on the App Router, Postgres with row-level security on every user-scoped
table, Drizzle, better-auth, hosted on Vercel with Neon. One pnpm workspace, no build
orchestrator. The alternatives considered and rejected are in [ADR-0005](docs/adr/0005-stack.md).

```sh
pnpm install
pnpm --filter @canoncore/web dev
```

The gates are `test`, `typecheck`, `lint` and `build`, plus a Playwright suite. They run in GitHub
Actions on every push, and the ruleset on `main` requires them by name, so nothing reaches
production without passing. See [`docs/agents/workflow.md`](docs/agents/workflow.md).

## How this repository is built

**CanonCore is built with an AI coding agent, and most of the code and prose here was written by
one.** That is stated because the repository is legible as agent-built on sight — `CLAUDE.md` sits
at the root and `.claude/skills/` is one click away — so the only question is whether the author
frames it or the reader guesses.

What does not change is accountability. Every commit is authored and owned by a human who can
explain and defend it. The guarantees are structural rather than promises: CI runs on every push,
the ruleset on the default branch requires those checks and admits no bypass, and the review step
is defined against a diff range rather than a vibe. An agent cannot merge here, and neither can a
human who skipped the gates.

The workflow itself is documented and reproducible — the skills in [`.claude/`](.claude/skills/)
and the process in [`docs/agents/workflow.md`](docs/agents/workflow.md). If that apparatus is
interesting to you, [`docs/research/agentic-workflow-setup.md`](docs/research/agentic-workflow-setup.md)
audits it against what Anthropic documents and is honest about where it falls short.

Nothing here is derived from any earlier attempt at this product. It was built from scratch.

## Documentation map

| Where | What |
| --- | --- |
| [`CONTEXT.md`](CONTEXT.md) | The domain vocabulary. Read this first |
| [`docs/adr/`](docs/adr/) | Thirteen decisions, each naming its rejected alternatives and what would reverse it |
| [`docs/research/`](docs/research/) | The evidence under the decisions, cited to the page that owns each claim |
| [`docs/compliance/`](docs/compliance/) | Online Safety Act duties: risk assessments, reporting, review policy |
| [`docs/infrastructure.md`](docs/infrastructure.md) | The register: what is provisioned right now, and what is unverified |
| [`docs/incidents.md`](docs/incidents.md) | Every observation the rules rest on, written once — dates, SHAs, run ids |
| [`docs/agents/`](docs/agents/) | Standing policy for an agent working here: workflow, tracker, labels, tooling |
| [`CODING_STANDARDS.md`](CODING_STANDARDS.md) | What overrides a reviewer's default heuristics |

## Licence

[MIT](LICENSE).
