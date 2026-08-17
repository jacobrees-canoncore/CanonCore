-- The three database roles, for a PostgreSQL that has no Neon behind it.
--
-- **This file provisions nothing real.** Production's roles are Neon's, recorded in
-- `docs/infrastructure.md` → *Roles*, and neither this file nor any migration creates them
-- there. It exists so that a throwaway PostgreSQL — the service container in CI, or a scratch
-- cluster on a laptop — carries the same three roles with the same privileges, because the
-- row-level security tests are meaningless connected as anything else.
--
-- The passwords are the role names. They are worth nothing: the only databases this file is ever
-- run against are created empty and deleted afterwards.
--
-- Run it as a superuser, against the database the tests will use:
--   psql "$SUPERUSER_URL" -f src/db/roles.sql

-- `NOBYPASSRLS` is the default, and is stated anyway. It is ADR-0005 rule 1, and a role that
-- silently acquired it would make every assertion in `rls.test.ts` pass while proving nothing.
--
-- `canoncore_auth` is better-auth's, added by CAN-24 A signed-in and a signed-out path. It exists
-- because the thing that authenticates cannot be constrained by the identity it is establishing —
-- `src/auth/auth.ts` has the argument and the three designs it rules out. **`NOBYPASSRLS` matters
-- for it as much as for the other two**: what bounds this role is a policy naming it on five tables
-- and no privilege on the other four, and `BYPASSRLS` would erase both halves at once.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'canoncore_migrator') THEN
    CREATE ROLE canoncore_migrator LOGIN NOBYPASSRLS PASSWORD 'canoncore_migrator';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'canoncore_app') THEN
    CREATE ROLE canoncore_app LOGIN NOBYPASSRLS PASSWORD 'canoncore_app';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'canoncore_auth') THEN
    CREATE ROLE canoncore_auth LOGIN NOBYPASSRLS PASSWORD 'canoncore_auth';
  END IF;
END $$;

-- Read back from Neon on 14 August 2026, and reproduced rather than invented: `public` there is
-- owned by `pg_database_owner` and its ACL grants `canoncore_migrator` USAGE and CREATE and
-- `canoncore_app` USAGE alone. The application role creating a table is a table without a
-- policy, so the missing CREATE is a guard rather than an omission.
GRANT USAGE, CREATE ON SCHEMA public TO canoncore_migrator;
GRANT USAGE ON SCHEMA public TO canoncore_app;
-- `USAGE` and not `CREATE`, exactly as for `canoncore_app`: a table created by better-auth's role
-- would be a table with no policy over it, and this role is the one whose policies say `true`.
GRANT USAGE ON SCHEMA public TO canoncore_auth;

-- CREATE on the *database*, which is the privilege to create a schema rather than a table, and
-- which the migration role needs for one reason: Drizzle's migrator issues an unconditional
-- `CREATE SCHEMA IF NOT EXISTS drizzle` before it reads its own journal, and PostgreSQL checks
-- the privilege before the `IF NOT EXISTS`. It widens the role that already owns every table,
-- and leaves `canoncore_app` — the role ADR-0005 rule 1 is about — untouched.
DO $$ BEGIN
  EXECUTE format('GRANT CREATE ON DATABASE %I TO canoncore_migrator', current_database());
END $$;

-- **No default privileges, deliberately, and this file is not where they could be undone.**
--
-- Until 16 August 2026 production carried two `ALTER DEFAULT PRIVILEGES` grants that this file
-- had no counterpart for, which is why a laptop and CI could not have caught them. What they were
-- and what they did: docs/infrastructure.md -> Roles. Migration 0005 removed them, and
-- `rls.test.ts` asserts their absence so it stays a decision rather than a state.
--
-- **Nor is one added for `canoncore_auth`**, though it is the one role with writes: a default
-- privilege would arm every future table for it, and its whole bound is that it reaches five named
-- tables. Migration 0009 grants those five one statement at a time.
--
-- **Do not add the revoke here.** `ALTER DEFAULT PRIVILEGES` without `FOR ROLE` alters the
-- *current* role's defaults (https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html),
-- and this file runs as a superuser — checked on 16 August 2026 against PostgreSQL 17.11, where
-- the grant was recorded against the superuser rather than `canoncore_migrator`. Since
-- `canoncore_migrator` owns every table, a default privilege belonging to anyone else applies to
-- nothing, so the statement would report success and change nothing.
--
-- The seam that follows: **this file carries what exists before any migration runs** — the three
-- roles, and the schema and database privileges a migration needs in order to run at all.
-- **Every privilege on a table is a migration's**, because a migration is the only thing that
-- runs as the role that owns the tables, and the only thing that runs against production as well
-- as here.
