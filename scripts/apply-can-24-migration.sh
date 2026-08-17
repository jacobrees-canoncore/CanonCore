#!/usr/bin/env bash
#
# Apply CAN-24 A signed-in and a signed-out path's two migrations to Neon's `main`, ahead of the merge.
#
# **Why this is a script and not a step in CI.** The release in `.github/workflows/ci.yml` runs these
# same migrations on merge, and by then it is too late: a Neon preview branch is a copy of `main` taken
# when its deployment starts, so `main` must already carry the schema before the code that reads it
# deploys anywhere. `docs/infrastructure.md` -> Schema records CAN-23 One Story from Neon, behind
# row-level security doing exactly this, for exactly this reason. Drizzle's journal makes the release's
# re-run a no-op.
#
# **Why a human runs it.** It needs `canoncore_migrator`'s connection string, which lives in the
# `MIGRATION_DATABASE_URL` GitHub Actions secret and cannot be read back. The agent that wrote this
# could not run it: Neon grants `neondb_owner` membership in `canoncore_migrator` with
# `set_option = false`, so `SET ROLE canoncore_migrator` is refused, and the five tables have to be
# owned by that role — an owner bypasses row security, which is why ownership sits there rather than
# with the application's role.
#
# Run from the repository root:
#   ./scripts/apply-can-24-migration.sh
#
# It is safe to re-run: Drizzle skips a migration its journal already records.

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

head1 "CAN-24 A signed-in and a signed-out path — apply migrations 0008 and 0009"
say "Two migrations reach Neon's \`main\`:"
note "0008  the five tables better-auth needs, each with a policy naming canoncore_auth"
note "0009  the grants: four privileges for canoncore_auth on those five, SELECT for"
note "      canoncore_app on user and session, and nothing at all on the other three"
printf '\n'
say "The role \`canoncore_auth\` already exists on this project, with NOBYPASSRLS and"
say "USAGE on \`public\`. This script only creates tables and grants."
printf '\n'

# --- The credential, read with hidden input so it reaches neither the transcript nor the history. ---
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
  note "The five tables must be owned by that role — docs/infrastructure.md -> Roles."
  exit 1
fi
# `verify-full` rather than `require`: the two mean the same thing under pg 8 and stop meaning it under
# pg 9, which is CAN-84 A preview's composed sslmode=require silently stops verifying certificates
# under pg 9. docs/infrastructure.md -> The SSL mode every connection asks for.
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
# Every claim below is one a document in this repository makes, and a migration that reported success
# while leaving one of them false is exactly the silence ADR-0005 rule 2 is about.
head1 "Verifying what is actually there"

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

FAILED=0
psql_q() { psql "$MIGRATION_DATABASE_URL" -tAX -c "$1" | tr -d ' \n'; }

if ! command -v psql >/dev/null 2>&1; then
  warn "psql is not installed, so the checks below are skipped."
  note "The migration itself succeeded. To verify by hand, read docs/infrastructure.md -> Roles"
  note "and compare the privilege matrix there against the database."
  exit 0
fi

# Nine tables, and the five new ones all with row-level security on.
verify "nine tables in public, and every new one has row-level security on" \
  "account:on,rate_limit:on,session:on,snapshot:on,source:off,story:on,tombstone:on,user:on,verification:on" \
  "$(psql_q "select string_agg(relname || ':' || case when relrowsecurity then 'on' else 'off' end, ',' order by relname)
               from pg_class
              where relnamespace = 'public'::regnamespace and relkind in ('r','p','f','m')")"

# Ownership is the whole reason a human runs this rather than the agent.
verify "every table is owned by canoncore_migrator" \
  "9" \
  "$(psql_q "select count(*) from pg_class
              where relnamespace = 'public'::regnamespace and relkind in ('r','p','f','m')
                and pg_get_userbyid(relowner) = 'canoncore_migrator'")"

# The application role: SELECT and nothing else, and refused three tables outright.
verify "canoncore_app may read six tables and write none" \
  "account:----,rate_limit:----,session:r---,snapshot:r---,source:r---,story:r---,tombstone:r---,user:r---,verification:----" \
  "$(psql_q "select string_agg(
                 c.relname || ':' ||
                 case when has_table_privilege('canoncore_app', c.oid, 'SELECT') then 'r' else '-' end ||
                 case when has_table_privilege('canoncore_app', c.oid, 'INSERT') then 'w' else '-' end ||
                 case when has_table_privilege('canoncore_app', c.oid, 'UPDATE') then 'u' else '-' end ||
                 case when has_table_privilege('canoncore_app', c.oid, 'DELETE') then 'd' else '-' end,
                 ',' order by c.relname)
               from pg_class c
              where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p','f','m')")"

# The auth role: all four on its own five, and nothing on the four product tables. The blanks are the
# control — it has no policy on those four, so a read returns nothing but a write would succeed.
verify "canoncore_auth may write its own five and reach no other" \
  "account:rwud,rate_limit:rwud,session:rwud,snapshot:----,source:----,story:----,tombstone:----,user:rwud,verification:rwud" \
  "$(psql_q "select string_agg(
                 c.relname || ':' ||
                 case when has_table_privilege('canoncore_auth', c.oid, 'SELECT') then 'r' else '-' end ||
                 case when has_table_privilege('canoncore_auth', c.oid, 'INSERT') then 'w' else '-' end ||
                 case when has_table_privilege('canoncore_auth', c.oid, 'UPDATE') then 'u' else '-' end ||
                 case when has_table_privilege('canoncore_auth', c.oid, 'DELETE') then 'd' else '-' end,
                 ',' order by c.relname)
               from pg_class c
              where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p','f','m')")"

# What made the matrix above false in production once already: a default privilege arms every table the
# migration role creates, and it exists in no file. docs/infrastructure.md -> Roles.
verify "no default privilege reaches either application role" \
  "0" \
  "$(psql_q "select count(*) from pg_default_acl d, aclexplode(d.defaclacl) a
              where a.grantee in ('canoncore_app'::regrole, 'canoncore_auth'::regrole)")"

verify "the journal records ten migrations" \
  "10" \
  "$(psql_q "select count(*) from drizzle.__drizzle_migrations")"

printf '\n'
if (( FAILED )); then
  printf '%s%s  ✗ Applied, but the database does not match what the documents claim%s\n' "$BOLD" "$RED" "$RESET"
  note "Do not merge. docs/infrastructure.md -> Roles holds the privilege matrix that should hold."
  exit 1
fi

printf '%s%s  ✓ Migrations applied and verified%s\n' "$BOLD" "$GREEN" "$RESET"
note "Neon's \`main\` now carries the five better-auth tables, their policies and their grants."
note "The release re-runs both migrations at merge, where the journal makes them a no-op."
printf '\n'
