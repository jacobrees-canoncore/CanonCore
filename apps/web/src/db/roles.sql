-- The two database roles, for a PostgreSQL that has no Neon behind it.
--
-- **This file provisions nothing real.** Production's roles are Neon's, recorded in
-- `docs/infrastructure.md` → *Roles*, and neither this file nor any migration creates them
-- there. It exists so that a throwaway PostgreSQL — the service container in CI, or a scratch
-- cluster on a laptop — carries the same two roles with the same privileges, because the
-- row-level security tests are meaningless connected as anything else.
--
-- The passwords are the role names. They are worth nothing: the only databases this file is ever
-- run against are created empty and deleted afterwards.
--
-- Run it as a superuser, against the database the tests will use:
--   psql "$SUPERUSER_URL" -f src/db/roles.sql

-- `NOBYPASSRLS` is the default, and is stated anyway. It is ADR-0005 rule 1, and a role that
-- silently acquired it would make every assertion in `rls.test.ts` pass while proving nothing.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'canoncore_migrator') THEN
    CREATE ROLE canoncore_migrator LOGIN NOBYPASSRLS PASSWORD 'canoncore_migrator';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'canoncore_app') THEN
    CREATE ROLE canoncore_app LOGIN NOBYPASSRLS PASSWORD 'canoncore_app';
  END IF;
END $$;

-- Read back from Neon on 14 August 2026, and reproduced rather than invented: `public` there is
-- owned by `pg_database_owner` and its ACL grants `canoncore_migrator` USAGE and CREATE and
-- `canoncore_app` USAGE alone. The application role creating a table is a table without a
-- policy, so the missing CREATE is a guard rather than an omission.
GRANT USAGE, CREATE ON SCHEMA public TO canoncore_migrator;
GRANT USAGE ON SCHEMA public TO canoncore_app;

-- CREATE on the *database*, which is the privilege to create a schema rather than a table, and
-- which the migration role needs for one reason: Drizzle's migrator issues an unconditional
-- `CREATE SCHEMA IF NOT EXISTS drizzle` before it reads its own journal, and PostgreSQL checks
-- the privilege before the `IF NOT EXISTS`. It widens the role that already owns every table,
-- and leaves `canoncore_app` — the role ADR-0005 rule 1 is about — untouched.
DO $$ BEGIN
  EXECUTE format('GRANT CREATE ON DATABASE %I TO canoncore_migrator', current_database());
END $$;
