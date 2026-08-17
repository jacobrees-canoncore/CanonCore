-- The privileges migration 0008's five tables need, hand-written for 0007's reason: a policy
-- narrows what a role may read and grants nothing, so without this each of them is refused
-- outright.
--
-- **One role appears here, and the absence of the other is the point.** `src/auth/auth.ts` holds
-- the argument for why a third role exists at all; what belongs here is what it may reach and what
-- nothing may.

-- **better-auth's role, on the five tables it owns the behaviour of and no others.** Four
-- privileges because it uses all four: it inserts a user and a session, updates a session's
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
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "rate_limit" TO "canoncore_auth";

-- **`canoncore_app` is granted nothing on any of the five, and that is the whole of its reach
-- here.**
--
-- Nothing in the application reads a `user` or a `session` row: pages read Stories, and
-- `src/auth/viewer.ts` resolves the session cookie through the auth role. So there is no privilege
-- to grant and no policy to write, which keeps migration 0005's rule exactly as it was — the
-- application role holds `SELECT` and nothing else, on every table it holds anything on.
--
-- **An earlier draft of this migration granted it `SELECT` on `user` and `session`**, with a policy
-- keyed on the session user. A review found what that was for: the grant existed so a cross-tenant
-- read test had something to exercise, which is a production privilege bought to make a test
-- possible. The refusal is both cheaper and stronger — `permission denied for table "user"` is a
-- loud error, where a policy returning no rows is indistinguishable from an empty table, and that
-- silence is what ADR-0005 rule 2 exists to avoid. `src/db/rls.test.ts` asserts the refusal on all
-- five.
--
-- **The first real reader brings its own grant, policy and cross-tenant test.** That is CAN-57 Make
-- a public Ordering discoverable and shareable, which needs an author attribution. Row-level
-- security is already on for these tables — a policy is what turns it on and 0008 wrote five — so a
-- grant added later without a policy reads zero rows rather than everything.
