-- The privileges migration 0008's five tables need, hand-written for 0007's reason: a policy
-- narrows what a role may read and grants nothing, so without this each of them is refused
-- outright.
--
-- **Two roles, two very different lists, and the difference is the whole design.**
-- `src/auth/auth.ts` holds the argument for why a third role exists at all; what belongs here is
-- what each role ends up holding.

-- **better-auth's role, on the five tables it owns the behaviour of and no others.** Four
-- privileges because it does all four: it inserts a user and a session, updates a session's
-- `expires_at` and a rate-limit counter, and deletes a session on sign-out and every session of a
-- user on erasure.
--
-- One statement per table rather than `ON ALL TABLES IN SCHEMA public`, which is the same shape
-- migration 0001 established and for a sharper reason here: the blanket form would hand this role
-- `story`, `source`, `snapshot` and `tombstone` as well, and those four are exactly what it must
-- never reach. It has no policy on any of them, so a read would return nothing — but a *write*
-- would succeed, because there is no `FOR INSERT` policy to refuse it and no policy at all is not
-- the same as a restrictive one.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "user" TO "canoncore_auth";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "session" TO "canoncore_auth";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "account" TO "canoncore_auth";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "verification" TO "canoncore_auth";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "rate_limit" TO "canoncore_auth";--> statement-breakpoint

-- **The application role, on two of the five and read-only**, which keeps migration 0005's rule
-- intact: `canoncore_app` holds `SELECT` and nothing else, on every table it holds anything on.
--
-- These two are the cross-tenant read tests ADR-0005 rule 2 requires of better-auth's user-scoped
-- tables, and the policies in 0008 are what make them return one row rather than all of them. A
-- reader sees their own `user` row and their own sessions; an unset session user sees neither,
-- because `current_setting('canoncore.user_id', true)` is NULL and `= NULL` is NULL.
GRANT SELECT ON TABLE "user" TO "canoncore_app";--> statement-breakpoint
GRANT SELECT ON TABLE "session" TO "canoncore_app";

-- **`account`, `verification` and `rate_limit` are deliberately absent from the list above, and the
-- absence is the control.** `account` holds a scrypt password hash, `verification` holds one-time
-- tokens, and `rate_limit` holds no person's data at all — none of the three has an application
-- reader now or in prospect, so the answer is no privilege rather than a policy that happens to
-- return nothing. A refused table is a loud error; an empty result is the silence ADR-0005 rule 2
-- is entirely about. `src/db/rls.test.ts` asserts all three refusals, in both directions, so a
-- grant added later fails a test rather than passing unnoticed.
