-- The same grant migration 0001 makes for `story`, for the two tables that arrived with it. A
-- policy narrows what a role may read and grants nothing, so without this the application role is
-- refused both tables outright.
--
-- SELECT only. Nothing in this release writes a Snapshot — CAN-26 Import a series from TMDB, with
-- the overlay behind it is what will — and nothing here ever writes a Source at all, for the
-- reason `schema.ts` gives on that table.
--
-- `source` has no policy over it, so this grant exposes every row of it. That is the intended
-- reading rather than an oversight:
-- docs/adr/0014-shell-providers-and-per-source-retention.md -> Decision 6.
GRANT SELECT ON TABLE "source" TO "canoncore_app";--> statement-breakpoint
GRANT SELECT ON TABLE "snapshot" TO "canoncore_app";
