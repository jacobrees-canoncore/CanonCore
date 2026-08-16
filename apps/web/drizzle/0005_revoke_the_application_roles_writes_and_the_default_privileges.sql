-- What migrations 0001 and 0004 said they granted, made true.
--
-- `canoncore_app` held INSERT, SELECT, UPDATE and DELETE on every table while both of those
-- migrations said SELECT only, because two default-privilege grants existed in production and in
-- no file. **The full account, the values read back, and what this still leaves unguarded:
-- docs/infrastructure.md -> Roles.** What belongs here is why the migration is shaped as it is.
--
-- Two kinds of statement, because a default privilege and a grant are different things and
-- neither reaches the other's case. The two `ALTER DEFAULT PRIVILEGES` below stop future tables
-- arriving armed; the three `REVOKE`s after them disarm the tables that already did.

-- Removed rather than narrowed to `SELECT`. A narrowed default would still hand a new table to
-- the application role before anyone had written a policy for it — and row-level security is off
-- until a policy turns it on, so that table would be readable in full. What replaces the
-- convenience is migration 0001's own rule: a privilege that exists is one a policy has to be
-- written for, so each migration grants what it means and a table nobody granted is unreachable.
--
-- `IN SCHEMA "public"` is the scope because that is the scope production has: both rows were read
-- with `defaclnamespace = 2200` on 16 August 2026, which is `public` rather than a role-wide
-- default. The two cases need different statements, and a revoke aimed at the wrong one removes
-- nothing while reporting success.
--
-- This runs as `canoncore_migrator`, the grantor of both rows, and can only run as it: `ALTER
-- DEFAULT PRIVILEGES` without `FOR ROLE` alters the *current* role's defaults
-- (https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html). `src/db/roles.sql` says
-- why that keeps these two statements out of it.
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON TABLES FROM "canoncore_app";--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "canoncore_app";--> statement-breakpoint

-- The three tables that already exist. A default privilege is read when a table is created and
-- never again, so revoking it above leaves these untouched.
--
-- `SELECT` is deliberately not revoked and re-granted: 0001 and 0004 hold that grant, and this
-- migration is about the three privileges nothing ever asked for.
REVOKE INSERT, UPDATE, DELETE ON TABLE "story" FROM "canoncore_app";--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON TABLE "source" FROM "canoncore_app";--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON TABLE "snapshot" FROM "canoncore_app";
