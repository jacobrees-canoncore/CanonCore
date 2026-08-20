-- The grant migration 0001 makes for `story`, for the three tables migration 0010 creates. A policy
-- narrows what a role may read and grants nothing at all, so without this the application role is
-- refused all three outright.
--
-- SELECT only on `version` and `part_of`, for 0001's reason: nothing in this release writes either,
-- and a privilege that exists is one a policy has to be written for.
GRANT SELECT ON TABLE "version" TO "canoncore_app";--> statement-breakpoint
GRANT SELECT ON TABLE "part_of" TO "canoncore_app";--> statement-breakpoint

-- **`anchor` is the exception, and this is the first write privilege `canoncore_app` has ever
-- held.** An Anchor is a shared identity carrying no metadata at all
-- (docs/adr/0003-no-shared-catalogue.md), and CAN-25 The catalogue: Version, part of, Anchor,
-- canonical version states its access model in three clauses: readable by anyone, insertable by any
-- signed-in user, never updatable. Migration 0010's INSERT policy is what makes the second clause
-- mean *signed-in*; this grant is what makes it possible at all, because a policy narrows a
-- privilege and never confers one.
--
-- **`SELECT` alone would have made that policy dead text**, which is the reason it is granted with
-- its policy rather than deferred to the first thing that mints one: a `WITH CHECK` nothing can
-- reach is a rule nobody has ever run, and this schema's whole practice is that a control is
-- asserted rather than asserted-about. `src/db/rls.test.ts` exercises both of its branches.
--
-- **No UPDATE and no DELETE.** *Never updatable* is enforced by there being no privilege, not by a
-- restrictive policy: an absent grant is `permission denied for table "anchor"`, where a policy
-- matching nothing gives back the silent empty result ADR-0005 rule 2 exists to keep out of this
-- schema.
--
-- What it costs is one blanket invariant becoming one with a named exception, in all four places
-- that carry it: the check in scripts/apply-migrations-ahead-of-merge.sh, whose own label this
-- change rewrites, the matrix in docs/infrastructure.md -> Roles, the
-- privilege test in src/db/rls.test.ts, and the gate's own statement of it in
-- docs/agents/workflow.md. Every one of them names `anchor` and nothing else, which is the shape
-- `source` already has in the check next door.
GRANT SELECT, INSERT ON TABLE "anchor" TO "canoncore_app";
