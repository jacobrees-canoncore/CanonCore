#!/usr/bin/env bash
#
# Apply this branch's Drizzle migrations to Neon's `main`, ahead of the merge.
#
# **Why this exists at all, and why it is not a step in CI.** The release in
# `.github/workflows/ci.yml` runs migrations on merge, and for a *schema* change that is too late: a
# Neon preview branch is a copy of `main` taken when its deployment starts, so `main` must already
# carry the schema before the code that reads it deploys anywhere. Otherwise the preview 500s, the
# required `Vercel` check goes red, and the pull request cannot merge. `docs/infrastructure.md` ->
# Schema records CAN-23 One Story from Neon, behind row-level security establishing that order, and
# `docs/agents/workflow.md` -> What a merge carries treats it as the standing procedure. Drizzle's
# journal makes the release's re-run a no-op.
#
# **Why a human runs it.** It needs `canoncore_migrator`'s connection string, which lives in the
# `MIGRATION_DATABASE_URL` GitHub Actions secret and cannot be read back. An agent cannot work
# around that: Neon grants `neondb_owner` membership in `canoncore_migrator` with `set_option =
# false`, so `SET ROLE canoncore_migrator` is refused — and every table has to be owned by that
# role, because an owner bypasses row security, which is why ownership sits there rather than with
# the application's.
#
# **Not specific to one ticket.** Every claim it checks is read from the repository or the database
# rather than written in here, so it does not go stale as migrations are added. It was written for
# CAN-24 A signed-in and a signed-out path and generalised in the same change, after a review
# pointed out that a one-run script is exactly the permanent carry `CLAUDE.md` -> Engineering
# principles refuses.
#
# Run from the repository root:
#   ./scripts/apply-migrations-ahead-of-merge.sh
#
# Safe to re-run: Drizzle skips any migration its journal already records.

set -euo pipefail

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
  BOLD=$(tput bold); DIM=$(tput dim); RESET=$(tput sgr0)
  BLUE=$(tput setaf 4); GREEN=$(tput setaf 2); YELLOW=$(tput setaf 3); RED=$(tput setaf 1)
else
  BOLD=""; DIM=""; RESET=""; BLUE=""; GREEN=""; YELLOW=""; RED=""
fi

say()  { printf '  %s\n' "$1"; }
note() { printf '  %s%s%s\n' "$DIM" "$1" "$RESET"; }
ok()   { printf '  %s✓%s %s\n' "$GREEN" "$RESET" "$1"; }
bad()  { printf '  %s✗%s %s\n' "$RED" "$RESET" "$1"; }
warn() { printf '  %s⚠ %s%s\n' "$YELLOW" "$1" "$RESET"; }
head1() { printf '\n%s%s▸ %s%s\n' "$BOLD" "$BLUE" "$1" "$RESET"; }

cd "$(dirname "$0")/.."

head1 "Apply this branch's migrations to Neon's \`main\`, ahead of the merge"

# Read from the journal rather than named here, so this stays true as migrations are added.
EXPECTED_MIGRATIONS=$(node -e '
  const j = require("./apps/web/drizzle/meta/_journal.json");
  console.log(j.entries.length);
')
say "This branch carries ${EXPECTED_MIGRATIONS} migrations in apps/web/drizzle/meta/_journal.json."
note "Whichever of them Neon's \`main\` has not yet seen will be applied, in order."
printf '\n'
git --no-pager log --oneline "$(git merge-base HEAD main)..HEAD" -- apps/web/drizzle \
  | sed 's/^/  /' || true
printf '\n'
warn "Any database role a migration references must already exist on the project."
note "Roles are not created by migrations — docs/infrastructure.md -> Roles says why, and"
note "src/db/roles.sql is the local equivalent for a throwaway PostgreSQL."
printf '\n'

# --- The credential, read with hidden input so it reaches neither the transcript nor the history.
# ---
head1 "canoncore_migrator's connection string"
note "This is the value of the MIGRATION_DATABASE_URL GitHub Actions secret."
note "Input is hidden. It is not written to disk, exported beyond this process, or echoed."
printf '  %sPaste it, then press Enter:%s ' "$BOLD" "$RESET"
read -rs MIGRATION_DATABASE_URL || true
printf '\n'

if [[ -z "${MIGRATION_DATABASE_URL:-}" ]]; then
  bad "Nothing was pasted. Stopping without changing anything."
  exit 1
fi
export MIGRATION_DATABASE_URL

# Two properties worth refusing on rather than discovering afterwards. Neither is a guess about the
# password: both are readable from the string's own shape.
if [[ "$MIGRATION_DATABASE_URL" != *"canoncore_migrator"* ]]; then
  bad "That string does not name canoncore_migrator."
  note "Every table must be owned by that role — docs/infrastructure.md -> Roles, and check 2 below."
  exit 1
fi
# `verify-full` rather than `require`: the two mean the same thing under pg 8 and stop meaning it
# under pg 9, which is CAN-84 A preview's composed sslmode=require silently stops verifying
# certificates under pg 9. docs/infrastructure.md -> The SSL mode every connection asks for.
if [[ "$MIGRATION_DATABASE_URL" != *"sslmode=verify-full"* ]]; then
  warn "That string does not ask for sslmode=verify-full."
  note "docs/infrastructure.md -> The SSL mode every connection asks for says why it must."
  printf '  %s? Continue anyway%s [y/N] ' "$YELLOW" "$RESET"
  read -r reply || true
  [[ "$reply" =~ ^[Yy] ]] || { bad "Stopped. Nothing was changed."; exit 1; }
fi
ok "String names canoncore_migrator"

# --- Apply. ---
head1 "Applying"
note "drizzle-kit skips any migration its journal already records, so this is re-runnable."
if ! pnpm --filter @canoncore/web db:migrate; then
  bad "The migration failed. Nothing below ran."
  note "Read the error above before re-running: a partly-applied migration is not a state"
  note "this script can reason about, and drizzle applies each file in one transaction."
  exit 1
fi
ok "drizzle-kit reported success"

# --- Verify, rather than trust the exit code. ---
#
# **Every expectation below is read from the repository or from the database**, never written in
# here. An earlier version hard-coded the table list, both privilege matrices and the migration
# count, which made the script wrong the moment a migration was added. What is checked instead are
# the invariants that hold whatever the schema grows into.
head1 "Verifying what is actually there"

if ! command -v psql >/dev/null 2>&1; then
  warn "psql is not installed, so the checks below are skipped."
  note "The migration itself succeeded. To verify by hand, read docs/infrastructure.md -> Roles"
  note "and compare the privilege matrix there against the database."
  exit 0
fi

FAILED=0
psql_q() { psql "$MIGRATION_DATABASE_URL" -tAX -c "$1" | tr -d ' \n'; }

verify() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    ok "$label"
  else
    bad "$label"
    note "expected: $expected"
    note "actual:   $actual"
    FAILED=1
  fi
}

# 1. The journal agrees with the repository. This is the check that makes the release's re-run a
#    no-op: a row short and the release re-applies a migration whose tables already exist.
verify "the journal records every migration this branch carries" \
  "$EXPECTED_MIGRATIONS" \
  "$(psql_q "select count(*) from drizzle.__drizzle_migrations")"

# 2. Ownership, which is the whole reason a human runs this rather than an agent. Asked as "how many
#    are owned by anybody else", so it needs no list of table names.
verify "no table in public is owned by anything but canoncore_migrator" \
  "0" \
  "$(psql_q "select count(*) from pg_class
              where relnamespace = 'public'::regnamespace and relkind in ('r','p','f','m')
                and pg_get_userbyid(relowner) <> 'canoncore_migrator'")"

# 3. ADR-0005 rule 1, asked of every role the application or better-auth connects as.
verify "neither application role can bypass row-level security" \
  "0" \
  "$(psql_q "select count(*) from pg_roles
              where rolname in ('canoncore_app', 'canoncore_auth') and rolbypassrls")"

# 4. Migration 0005's rule, as an invariant rather than a matrix: the application role reads, and
#    never writes. Any table it can write is a finding whatever the table is.
verify "canoncore_app can write no table at all" \
  "0" \
  "$(psql_q "select count(*) from pg_class c
              where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p','f','m')
                and (has_table_privilege('canoncore_app', c.oid, 'INSERT')
                  or has_table_privilege('canoncore_app', c.oid, 'UPDATE')
                  or has_table_privilege('canoncore_app', c.oid, 'DELETE'))")"

# 5. **Every table either has a policy or is granted to nobody.** This is the general form of the
# two tripwires in src/db/rls.test.ts: a table reachable by a role with no policy over it is
# readable in full, which is the failure docs/infrastructure.md -> Roles records against `source`.
# `source` itself is the one deliberate exception, and it is named because ADR-0014 decision 6 names
# it.
verify "every table with no policy is reachable by nobody, apart from source" \
  "" \
  "$(psql_q "select string_agg(c.relname, ',' order by c.relname)
               from pg_class c
              where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p','f','m')
                and not c.relrowsecurity
                and c.relname <> 'source'
                and (has_table_privilege('canoncore_app', c.oid, 'SELECT')
                  or has_table_privilege('canoncore_auth', c.oid, 'SELECT'))")"

# 6. What made check 4 false in production once already: a default privilege arms every table the
#    migration role creates, and it exists in no file. docs/infrastructure.md -> Roles.
verify "no default privilege reaches either application role" \
  "0" \
  "$(psql_q "select count(*) from pg_default_acl d, aclexplode(d.defaclacl) a
              where a.grantee in ('canoncore_app'::regrole, 'canoncore_auth'::regrole)")"

# The matrix itself is printed rather than asserted: which role may do what to which table is a
# decision recorded in docs/infrastructure.md -> Roles and asserted exactly by src/db/rls.test.ts
# against a container. Printing it here is what lets a human compare production to that record,
# which is the one comparison no test can make.
head1 "The privilege matrix on production, to compare against docs/infrastructure.md -> Roles"
psql "$MIGRATION_DATABASE_URL" -X -c "
  select c.relname as table,
         case when c.relrowsecurity then 'yes' else 'NO' end as rls,
         case when has_table_privilege('canoncore_app', c.oid, 'SELECT') then 'r' else '-' end ||
         case when has_table_privilege('canoncore_app', c.oid, 'INSERT') then 'w' else '-' end ||
         case when has_table_privilege('canoncore_app', c.oid, 'UPDATE') then 'u' else '-' end ||
         case when has_table_privilege('canoncore_app', c.oid, 'DELETE') then 'd' else '-' end
           as canoncore_app,
         case when has_table_privilege('canoncore_auth', c.oid, 'SELECT') then 'r' else '-' end ||
         case when has_table_privilege('canoncore_auth', c.oid, 'INSERT') then 'w' else '-' end ||
         case when has_table_privilege('canoncore_auth', c.oid, 'UPDATE') then 'u' else '-' end ||
         case when has_table_privilege('canoncore_auth', c.oid, 'DELETE') then 'd' else '-' end
           as canoncore_auth
    from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p','f','m')
   order by c.relname" || true

printf '\n'
if (( FAILED )); then
  printf '%s%s  ✗ Applied, but the database does not match what the documents claim%s\n' "$BOLD" "$RED" "$RESET"
  note "Do not merge. docs/infrastructure.md -> Roles holds the invariants that should hold."
  exit 1
fi

printf '%s%s  ✓ Migrations applied and verified%s\n' "$BOLD" "$GREEN" "$RESET"
note "Neon's \`main\` now carries this branch's schema, so a preview branched from it will too."
note "The release re-runs the same migrations at merge, where the journal makes them a no-op."
printf '\n'
