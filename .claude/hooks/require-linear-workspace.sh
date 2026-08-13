#!/bin/bash
# Block an `orca linear` call that pins no workspace. CLAUDE.md states the rule
# and names the failure it prevents; this file is the enforcement, so it repeats
# neither.
set -uo pipefail

payload=$(cat)

# Cheap pre-filter, so the interpreter starts only for calls that could match.
# Matching the raw payload is safe: the other fields that carry "orca" — `cwd`,
# transcript paths — carry it as a path segment, never followed by whitespace
# and "linear".
grep -qE 'orca[[:space:]]+linear' <<<"$payload" || exit 0

if ! cmd=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input", {}).get("command", ""))' <<<"$payload"); then
  echo "Blocked: the hook that checks 'orca linear' calls could not parse its payload, so it cannot tell whether a workspace was pinned. Failing closed — see .claude/hooks/require-linear-workspace.sh." >&2
  exit 2
fi

if [[ ! "$cmd" =~ orca[[:space:]]+linear([[:space:]]|$) ]]; then
  exit 0
fi

# A value is required, not just the flag: `--workspace` with nothing after it
# pins nothing. The value itself is not validated — `all` is legitimate, and a
# wrong ID typed deliberately is a different mistake from the silent one here.
if [[ "$cmd" =~ --workspace[[:space:]=]+[^[:space:]]+ ]] || [[ "$cmd" =~ (^|[[:space:]])--current([[:space:]]|$) ]]; then
  exit 0
fi

echo "Blocked: 'orca linear' must pin a workspace — --workspace ad2669ec-93a5-4ce1-97fa-c7d9247a1452 for this project, --workspace all to search across them, or --current for the issue linked to this worktree. Orca is connected to three workspaces and picks the wrong one silently." >&2
exit 2
