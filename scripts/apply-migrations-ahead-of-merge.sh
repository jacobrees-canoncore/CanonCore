#!/usr/bin/env bash
#
# Apply this branch's Drizzle migrations to Neon's shared `preview` branch, ahead of the merge, and
# read production's invariants back without writing to it.
#
# **Why this exists at all, and why it is not a step in CI.** Every preview deployment reads the
# shared, schema-only `preview` branch — one branch, no production rows, addressed by a Preview-scoped
# `NEON_PGHOST` (ADR-0023, and `docs/infrastructure.md` -> How a preview reaches its own database).
# That branch is never re-copied from anything, so a migration reaches it only because somebody
# applies it; and it has to be applied *before* the code that reads it deploys, or the preview 500s,
# the required `Vercel` check goes red, and the pull request cannot merge.
#
# **`main` is read here, never written**, which is a narrowing CAN-79 Previews clone production rows,
# and the integration has no switch to stop it made when previews stopped being cloned from it. The
# release in `.github/workflows/ci.yml` is the only thing that migrates production. The argument is
# docs/adr/0023-one-shared-schema-only-preview-branch.md -> Consequences; do not restate it here.
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
# Safe to re-run for one branch: everything it carries is at or below the newest timestamp already
# applied, so a second run applies nothing. That is a consequence of drizzle comparing timestamps
# rather than of it recognising what it has already recorded, and the difference matters as soon as
# two branches share a database — *What drizzle decides on*, beside the migration step below.

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

head1 "Apply this branch's migrations to Neon's \`preview\` branch, ahead of the merge"

# Read from the journal rather than named here, so this stays true as migrations are added.
EXPECTED_MIGRATIONS=$(node -e '
  const j = require("./apps/web/drizzle/meta/_journal.json");
  console.log(j.entries.length);
')
say "This branch carries ${EXPECTED_MIGRATIONS} migrations in apps/web/drizzle/meta/_journal.json."
note "Whichever of them the \`preview\` branch has not yet seen will be applied, in order."
note "Production is read back afterwards and never written — the release migrates it at merge."
printf '\n'
git --no-pager log --oneline "$(git merge-base HEAD main)..HEAD" -- apps/web/drizzle \
  | sed 's/^/  /' || true
printf '\n'
warn "Any database role a migration references must already exist on the project."
note "Roles are not created by migrations — docs/infrastructure.md -> Roles says why, and"
note "src/db/roles.sql is the local equivalent for a throwaway PostgreSQL. Neon roles are"
note "project-level, so the three exist on every branch with the same passwords."
printf '\n'

# --- The credential, read with hidden input so it reaches neither the transcript nor the history.
# ---
head1 "canoncore_migrator's connection string"
note "This is the value of the MIGRATION_DATABASE_URL GitHub Actions secret. It addresses"
note "production; the \`preview\` branch's string is composed from it below, because a Neon role"
note "is project-level and carries the same password on every branch."
note "Input is hidden. It is not written to disk, exported beyond this process, or echoed."
printf '  %sPaste it, then press Enter:%s ' "$BOLD" "$RESET"
read -rs MAIN_URL || true
printf '\n'

if [[ -z "${MAIN_URL:-}" ]]; then
  bad "Nothing was pasted. Stopping without changing anything."
  exit 1
fi

# Two properties worth refusing on rather than discovering afterwards. Neither is a guess about the
# password: both are readable from the string's own shape.
if [[ "$MAIN_URL" != *"canoncore_migrator"* ]]; then
  bad "That string does not name canoncore_migrator."
  note "Every table must be owned by that role — docs/infrastructure.md -> Roles, and check 2 below."
  exit 1
fi
# `verify-full` rather than `require`: the two mean the same thing under pg 8 and stop meaning it
# under pg 9, which is CAN-84 A preview's composed sslmode=require silently stops verifying
# certificates under pg 9. docs/infrastructure.md -> The SSL mode every connection asks for.
if [[ "$MAIN_URL" != *"sslmode=verify-full"* ]]; then
  warn "That string does not ask for sslmode=verify-full."
  note "docs/infrastructure.md -> The SSL mode every connection asks for says why it must."
  printf '  %s? Continue anyway%s [y/N] ' "$YELLOW" "$RESET"
  read -r reply || true
  [[ "$reply" =~ ^[Yy] ]] || { bad "Stopped. Nothing was changed."; exit 1; }
fi
ok "String names canoncore_migrator"

# --- Which branch to apply to. ---
#
# **The credential is not asked for twice, and the address is**, which is the whole shape of these
# prompts: a Neon role is project-level, so the password that reaches production reaches every
# branch, and the only thing distinguishing one branch from another is where it answers. Asking for
# a second whole connection string would be a second secret to mishandle for two differing fields.
#
# **Both halves of the address are asked for, because a preview is addressed by both.**
# `database-url.ts` composes a preview's connection from `NEON_PGHOST` *and* `NEON_PGDATABASE`, and
# an earlier version of this script took the host alone and inherited the database name from
# production's string. That is correct exactly while the two agree and silently wrong the moment
# they do not: the migration would land on a database no preview reads, and report success.
#
# They are also the two fields that can be *shown*. Both are Non-sensitive Vercel variables
# precisely so they can be read back and caught going stale
# (docs/infrastructure.md -> Environment variables), so this echoes what it is about to use.
head1 "Where the \`preview\` branch answers"
note "The Preview-scoped NEON_PGHOST and NEON_PGDATABASE. Either of:"
note "  vercel env pull --environment=preview --project canoncore <file>"
note "  the Neon console -> Branches -> preview -> Connect"
printf '  %sPaste the host, then press Enter:%s ' "$BOLD" "$RESET"
read -r PREVIEW_HOST || true
printf '\n'

if [[ -z "${PREVIEW_HOST:-}" ]]; then
  bad "Nothing was pasted. Stopping without changing anything."
  note "There is no default worth guessing: the wrong host here is a migration applied to the"
  note "wrong database."
  exit 1
fi

# A whole connection string pasted where a host was asked for would otherwise be used as a
# hostname, and the failure would be a confusing connection error rather than this.
if [[ "$PREVIEW_HOST" == *"://"* || "$PREVIEW_HOST" == *"@"* || "$PREVIEW_HOST" == *"/"* ]]; then
  bad "That looks like a connection string rather than a host."
  note "Paste only the hostname, as NEON_PGHOST holds it: ep-….eu-west-2.aws.neon.tech"
  exit 1
fi

# **The host, the compute it addresses, and the database name, resolved in one place.** The
# pooled-versus-unpooled rule lives in `computeOf` in apps/web/src/db/database-url.ts, for the check
# the running application makes; this is the same rule, and keeping it in one `node` call rather
# than a second bash copy is what stops the script growing a third spelling of it. One compute
# answers to both a pooled and an unpooled name, so comparing whole hostnames would call two names
# for one database different — and the direction that matters is exactly that one: production
# reached by its unpooled name is still production.
read -r MAIN_HOST MAIN_DATABASE SAME_COMPUTE <<<"$(
  MAIN_URL="$MAIN_URL" PREVIEW_HOST="$PREVIEW_HOST" node -e '
    const computeOf = (h) => h.split(".")[0].replace(/-pooler$/, "");
    const u = new URL(process.env.MAIN_URL);
    const same = computeOf(u.hostname) === computeOf(process.env.PREVIEW_HOST);
    process.stdout.write(`${u.hostname} ${u.pathname.slice(1)} ${same}`);
  '
)"

# **The refusal that makes the rest of this run mean anything.** Paste production's host here — by
# reflex, or by pasting the same clipboard twice — and every migration below lands on production
# from an unmerged branch, which is the single thing this script was rewritten to stop doing. It
# would also report success, because migrating production is a thing that works.
if [[ "$SAME_COMPUTE" == "true" ]]; then
  bad "That host is production's own compute. Stopping without changing anything."
  note "  given:      $PREVIEW_HOST"
  note "  production: $MAIN_HOST"
  note "The two names Neon gives one compute differ only by a -pooler suffix, so this compares"
  note "computes rather than hostnames. Production is migrated by the release and by nothing else"
  note "— docs/adr/0019-ci-owns-the-production-release.md."
  exit 1
fi
ok "Host addresses a compute that is not production's"

printf '  %sPaste the database, or press Enter for %s:%s ' "$BOLD" "$MAIN_DATABASE" "$RESET"
read -r PREVIEW_DATABASE || true
PREVIEW_DATABASE="${PREVIEW_DATABASE:-$MAIN_DATABASE}"
printf '\n'

# Composed with `URL` rather than by string surgery, so a password containing `:`, `@`, `/` or `?`
# survives, and passed through the environment rather than argv, which `ps` can read.
PREVIEW_URL=$(
  MAIN_URL="$MAIN_URL" PREVIEW_HOST="$PREVIEW_HOST" PREVIEW_DATABASE="$PREVIEW_DATABASE" node -e '
    const u = new URL(process.env.MAIN_URL);
    u.hostname = process.env.PREVIEW_HOST;
    u.pathname = `/${process.env.PREVIEW_DATABASE}`;
    process.stdout.write(u.toString());
  '
)

# Printed rather than assumed, because everything above is one paste away from addressing the wrong
# database and nothing below would say so.
ok "Target: $PREVIEW_HOST/$PREVIEW_DATABASE"

# --- Apply, to the preview branch and to nothing else. ---
#
# **What drizzle decides on, because the obvious description of it is wrong and the error is not
# harmless.** It does not skip migrations the journal already records. `PgDialect.migrate`, in
# `drizzle-orm@0.45.2`'s **ESM** build `pg-core/dialect.js`, reads the newest `created_at` **once,
# before the loop**, and inside it applies every migration whose `folderMillis` exceeds that one
# value. `hash` is selected by the same query and never compared.
#
# The ESM build is named deliberately: `drizzle-kit` reaches the migrator through
# `await import("drizzle-orm/node-postgres/migrator")`, which resolves the package's `import`
# condition to `.js`, so the `.cjs` of the same name carries identical code and never loads. Quoted
# rather than cited by line, because a line number in a vendored dependency goes stale at the next
# upgrade and this text does not:
#
#   select id, hash, created_at from drizzle.__drizzle_migrations order by created_at desc limit 1
#   if (!lastDbMigration || Number(lastDbMigration.created_at) < migration.folderMillis) { … }
#
# So it is a high-water mark on a timestamp, not a set-membership test — and the two readings differ
# only when a database has seen a migration this branch does not carry.
#
# **Against one database and one branch they agree**, which is why the wrong description survived:
# every migration this branch carries is at or below the newest already applied, so a second run
# applies nothing. Re-running remains safe, for that reason rather than the one previously given.
#
# **Against a database two branches share they part company, and one direction is silent.** A
# migration whose timestamp is *earlier* than the newest already applied is skipped, no row is
# inserted for it, and it can therefore never apply to that database — while drizzle reports
# success. The check below headed "the journal records every migration this branch carries" cannot
# see it: it compares the *number* of migrations, and both branches
# carry the same number. The count catches only the opposite ordering, where somebody else's
# migration is present and the total runs high.
#
# Every preview reads one shared branch today, so this is reachable now. **One branch at a time may
# apply a migration here** until CAN-138 Give every Orca worktree its own preview database, so
# parallel schema work stops colliding gives each worktree a database of its own.
# docs/research/per-worktree-preview-databases.md quotes the source and holds the orderings.
head1 "Applying to \`preview\`"
note "Re-running this branch's own migrations applies nothing, so this is safe to repeat."
warn "One branch at a time may apply a migration to \`preview\`, ever — not merely one at a time"
note "today. Every branch shares this database, so a migration older than the newest already"
note "applied to it is skipped permanently and still reports success, however many days apart the"
note "two runs are. If another branch has migrated \`preview\` since this one was cut, stop and read"
note "the comment above this line."
if ! MIGRATION_DATABASE_URL="$PREVIEW_URL" pnpm --filter @canoncore/web db:migrate; then
  bad "The migration failed. Nothing below ran."
  note "Read the error above before re-running: a partly-applied migration is not a state"
  note "this script can reason about, and drizzle applies each file in one transaction."
  note "A first-run failure of \`relation already exists\` means the branch's Drizzle journal is"
  note "empty while its schema is not — docs/infrastructure.md -> The shared preview branch."
  exit 1
fi
ok "drizzle-kit reported success"

# --- Verify, rather than trust the exit code. ---
#
# **Every expectation below is read from the repository or from the database**, never written in
# here. An earlier version hard-coded the table list, both privilege matrices and the migration
# count, which made the script wrong the moment a migration was added. What is checked instead are
# the invariants that hold whatever the schema grows into.
#
# **Both branches are put through the same checks**, and that is the point rather than thoroughness:
# the `preview` branch is only worth anything as a rehearsal if it is the same shape as production,
# and two matrices printed side by side is the only way a person sees that it is.

head1 "Verifying what is actually there"

if ! command -v psql >/dev/null 2>&1; then
  warn "psql is not installed, so every check below is skipped."
  note "The migration itself succeeded. To verify by hand, read docs/infrastructure.md -> Roles"
  note "and compare the privilege matrix there against the database."
  exit 0
fi

FAILED=0

# **`psql` and `pg` disagree about `verify-full`, and the disagreement is not cosmetic.** drizzle uses
# `pg`, which verifies against Node's bundled roots and needs nothing else; `psql` wants a
# `root.crt` on disk and refuses without one — `sslrootcert=system` is libpq's own way of saying "use
# the trust store", and it keeps `verify-full` rather than weakening it. Observed on 17 August 2026:
# the migration applied and every check below then failed to connect.
#
# Appended only when absent, so a string that already carries it is left alone.
psql_url_for() {
  local url="$1"
  if [[ "$url" == *"sslmode=verify-full"* && "$url" != *"sslrootcert="* ]]; then
    printf '%s' "${url}&sslrootcert=system"
  else
    printf '%s' "$url"
  fi
}

MAIN_PSQL=$(psql_url_for "$MAIN_URL")
PREVIEW_PSQL=$(psql_url_for "$PREVIEW_URL")

# **A query that fails must never look like an answer.** The first version of this returned whatever
# `psql` printed, which is the empty string when the connection is refused — and one check below
# *expects* the empty string, so it reported a tick while nothing had been read. That is the
# silence-instead-of-an-error this repository is built around, reproduced inside the tool meant to
# catch it. Now a failed query aborts the run: there is no value it can return that any expectation
# could accidentally match.
# Diagnostics go to **stderr**, and that is load-bearing rather than tidy: every caller below is a
# command substitution, so anything this writes to stdout is captured as the query's result and
# discarded. The first version printed the explanation there and the run aborted with nothing on
# screen — a loud failure made silent by the shell.
psql_q() {
  local url="$1" sql="$2" out
  if ! out=$(psql "$url" -tAX -c "$sql" 2>&1); then
    {
      bad "Could not read the database, so nothing below was verified."
      note "$out"
      note "The migration itself may already have succeeded — re-run to verify once the connection"
      note "works. docs/infrastructure.md -> The SSL mode every connection asks for."
    } >&2
    exit 1
  fi
  printf '%s' "$out" | tr -d ' \n'
}

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

# The five invariants that hold on any branch carrying this schema, whatever its migration state.
# Checked on both, because an invariant true of production and false of the rehearsal makes the
# rehearsal worthless, and one true of the rehearsal and false of production is a production finding.
verify_invariants() {
  local url="$1"

  # Ownership, which is the whole reason a human runs this rather than an agent. Asked as "how many
  # are owned by anybody else", so it needs no list of table names.
  verify "no table in public is owned by anything but canoncore_migrator" \
    "0" \
    "$(psql_q "$url" "select count(*) from pg_class
                where relnamespace = 'public'::regnamespace and relkind in ('r','p','f','m')
                  and pg_get_userbyid(relowner) <> 'canoncore_migrator'")"

  # ADR-0005 rule 1, asked of every role the application or better-auth connects as.
  verify "neither application role can bypass row-level security" \
    "0" \
    "$(psql_q "$url" "select count(*) from pg_roles
                where rolname in ('canoncore_app', 'canoncore_auth') and rolbypassrls")"

  # Migration 0005's rule, as an invariant rather than a matrix: the application role reads, and
  # never writes. Any table it can write is a finding whatever the table is.
  verify "canoncore_app can write no table at all" \
    "0" \
    "$(psql_q "$url" "select count(*) from pg_class c
                where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p','f','m')
                  and (has_table_privilege('canoncore_app', c.oid, 'INSERT')
                    or has_table_privilege('canoncore_app', c.oid, 'UPDATE')
                    or has_table_privilege('canoncore_app', c.oid, 'DELETE'))")"

  # **Every table either has a policy or is granted to nobody.** This is the general form of the
  # two tripwires in src/db/rls.test.ts: a table reachable by a role with no policy over it is
  # readable in full, which is the failure docs/infrastructure.md -> Roles records against `source`.
  # `source` itself is the one deliberate exception, and it is named because ADR-0014 decision 6
  # names it.
  verify "every table with no policy is reachable by nobody, apart from source" \
    "" \
    "$(psql_q "$url" "select string_agg(c.relname, ',' order by c.relname)
                 from pg_class c
                where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p','f','m')
                  and not c.relrowsecurity
                  and c.relname <> 'source'
                  and (has_table_privilege('canoncore_app', c.oid, 'SELECT')
                    or has_table_privilege('canoncore_auth', c.oid, 'SELECT'))")"

  # What made the write check false in production once already: a default privilege arms every table
  # the migration role creates, and it exists in no file. docs/infrastructure.md -> Roles.
  verify "no default privilege reaches either application role" \
    "0" \
    "$(psql_q "$url" "select count(*) from pg_default_acl d, aclexplode(d.defaclacl) a
                where a.grantee in ('canoncore_app'::regrole, 'canoncore_auth'::regrole)")"
}

# The matrix itself is printed rather than asserted: which role may do what to which table is a
# decision recorded in docs/infrastructure.md -> Roles and asserted exactly by src/db/rls.test.ts
# against a container. Printing it here is what lets a human compare a live database to that record,
# which is the one comparison no test can make.
print_matrix() {
  psql "$1" -X -c "
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
}

head1 "Verifying \`preview\`, which is what this run changed"

# The journal has to match the repository exactly here, and this is the check that catches the one
# failure a schema-only branch arrives with: schema-only copies every table but no *row*, so the
# `drizzle.__drizzle_migrations` table lands present and empty. A branch in that state has the whole
# schema and a journal claiming none of it, and the next migration run tries to create tables that
# are already there. docs/infrastructure.md -> The shared preview branch holds what provisioning it.
verify "the journal records every migration this branch carries" \
  "$EXPECTED_MIGRATIONS" \
  "$(psql_q "$PREVIEW_PSQL" "select count(*) from drizzle.__drizzle_migrations")"
verify_invariants "$PREVIEW_PSQL"

# **A preview must hold no production row, and that is asserted rather than inferred from
# `init_source`.** A settings field says how the branch was made; the rows say what is in it, and
# only the rows would notice a branch replaced by a copy-on-write clone, or a `main` dump restored
# into it by hand. That is the whole of what CAN-79 Previews clone production rows, and the
# integration has no switch to stop it bought.
#
# **It asks whether production's *own* rows are there, not whether the table is empty**, and the
# difference is the difference between a check that lasts and one that fails the first time anybody
# uses a preview. A preview is a real environment: somebody signs in, somebody creates a Story, and
# the table stops being empty for reasons that are entirely correct. Comparing counts would call
# that a leak. Comparing identities cannot: production's ids can only appear here by having been
# copied from production.
#
# Capped at 200 because this is a tripwire rather than an audit — a clone brings every row, so it
# trips on the first one, and a query naming every id in a grown catalogue would be its own problem.
MAIN_STORY_IDS=$(psql_q "$MAIN_PSQL" \
  "select string_agg(quote_literal(id::text), ',') from (select id from public.story order by id limit 200) s")
if [[ -z "$MAIN_STORY_IDS" ]]; then
  warn "production's story table is empty, so this check has nothing to look for today"
  note "It is the one check here that needs production to hold rows to be worth making, and it"
  note "says so rather than reporting a tick it did not earn."
else
  verify "\`preview\` holds none of production's story rows, by id" \
    "0" \
    "$(psql_q "$PREVIEW_PSQL" "select count(*) from public.story where id::text in ($MAIN_STORY_IDS)")"
fi

head1 "Verifying production, which this run did not touch"

# Relaxed on purpose, and only in one direction. `main` legitimately lags the repository between this
# run and the release that migrates it, so "fewer than the journal" is the normal state and says
# nothing. **Ahead** is the finding: a migration on production that this repository does not carry is
# either a hand-applied change or a branch that released and was reverted, and neither is a thing to
# discover later.
MAIN_JOURNAL=$(psql_q "$MAIN_PSQL" "select count(*) from drizzle.__drizzle_migrations")
if (( MAIN_JOURNAL > EXPECTED_MIGRATIONS )); then
  bad "production carries ${MAIN_JOURNAL} migrations and this branch knows of ${EXPECTED_MIGRATIONS}"
  note "Production is ahead of the repository. Do not merge until that is explained: a migration"
  note "nothing here carries was applied by hand, or a released commit was reverted without one."
  FAILED=1
elif (( MAIN_JOURNAL < EXPECTED_MIGRATIONS )); then
  ok "production carries ${MAIN_JOURNAL} of ${EXPECTED_MIGRATIONS} migrations, and the release applies the rest"
else
  ok "production already carries all ${EXPECTED_MIGRATIONS} migrations"
fi
verify_invariants "$MAIN_PSQL"

head1 "\`preview\`, to compare against docs/infrastructure.md -> Roles"
print_matrix "$PREVIEW_PSQL"

head1 "production, to compare against the same table and against the matrix above"
print_matrix "$MAIN_PSQL"

printf '\n'
if (( FAILED )); then
  printf '%s%s  ✗ The databases do not match what the documents claim%s\n' "$BOLD" "$RED" "$RESET"
  note "Do not merge. docs/infrastructure.md -> Roles holds the invariants that should hold."
  note "Read which branch each failure above was against: one against \`preview\` is this run's"
  note "own work, one against production is a finding that predates it."
  exit 1
fi

printf '%s%s  ✓ Applied to \`preview\` and verified, and production reads clean%s\n' "$BOLD" "$GREEN" "$RESET"
note "Every preview deployment now finds this branch's schema, and none of production's rows."
note "The release migrates production at merge — docs/adr/0019-ci-owns-the-production-release.md."
printf '\n'
