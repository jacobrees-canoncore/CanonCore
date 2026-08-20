-- Two jobs, and they are one change: every Story that already existed gains the Anchor the column
-- above it will require, and the founding Story gains the rest of the catalogue shape so that a
-- public Story page has something to render.
--
-- **The order matters and is the whole reason this file exists.** `story.anchor_id` arrives
-- nullable in migration 0010 and is made `NOT NULL` in 0013; a column added `NOT NULL` to a table
-- with a row in it is refused outright, so the backfill has to sit between the two. That is three
-- migrations for one column, which is what a `NOT NULL` column on a populated table costs.

-- 1. An Anchor apiece for the Stories that predate the column. In production that is migration
-- 0002's founding Story and nothing else; written as a set rather than as that one id because a
-- laptop or a preview may carry rows this repository has never heard of, and a backfill that missed
-- one would surface as 0013 failing rather than as anything anybody could read.
--
-- `AS MATERIALIZED` is load-bearing. `minted` is read twice and calls `gen_random_uuid()`, and the
-- keyword is what guarantees one evaluation of it rather than two: without it the ids inserted into
-- `anchor` and the ids written onto `story` could be different values, and every one of the second
-- set would be a foreign key pointing at nothing. PostgreSQL's default would materialize this one
-- anyway, on both counts -- referenced more than once, and volatile
-- (https://www.postgresql.org/docs/17/queries-with.html) -- so the keyword changes no behaviour and
-- states what the correctness rests on.
WITH minted AS MATERIALIZED (
  SELECT "id" AS story_id, gen_random_uuid() AS anchor_id
    FROM "story"
   WHERE "anchor_id" IS NULL
), inserted AS (
  INSERT INTO "anchor" ("id") SELECT anchor_id FROM minted
)
UPDATE "story"
   SET "anchor_id" = minted.anchor_id
  FROM minted
 WHERE "story"."id" = minted.story_id;--> statement-breakpoint

-- 2. The Story the founding one is part of, and it arrives with its Anchor rather than being
-- backfilled one, which is how every Story lands from here on.
--
-- Fixed ids for migration 0002's two reasons: re-running this against a database that already has
-- these rows is a no-op, and a test can name the row it expects. The last block says which table an
-- id belongs to -- `a1` an Anchor, `b1` a Version -- because three tables' fixtures otherwise read
-- as the same handful of zeroes.
--
-- `owner_id` is migration 0002's placeholder operator and the Visibility is public, for that file's
-- reasons: nobody has an account these rows could belong to, and a public Story page needs a public
-- Story to be a page about.
--
-- **Every statement below is conditional on migration 0002's Story actually being there, and that
-- is not defensive habit.** The shared `preview` Neon branch holds no `story` row at all: it is
-- schema-only, so it copied the schema and none of production's rows, and its journal was brought
-- up to date without 0002's insert ever taking effect there. Read on 21 August 2026 --
-- `preview` zero rows, production one. An unconditional `INSERT` of a Version *of* Rose therefore
-- fails its foreign key on that branch and takes the whole migration with it, which would have been
-- a red preview and a blocked merge. A seed that cannot find the thing it is seeding does nothing
-- instead, and `docs/infrastructure.md` -> The shared preview branch is what that branch is for.
INSERT INTO "anchor" ("id")
SELECT '00000000-0000-4000-8000-0000000000a1'
 WHERE EXISTS (SELECT 1 FROM "story" WHERE "id" = '00000000-0000-4000-8000-000000000001')
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

INSERT INTO "story" ("id", "title", "owner_id", "visibility", "anchor_id")
SELECT
  '00000000-0000-4000-8000-000000000002',
  'Series 1',
  'founding-operator',
  'public',
  '00000000-0000-4000-8000-0000000000a1'
 WHERE EXISTS (SELECT 1 FROM "story" WHERE "id" = '00000000-0000-4000-8000-000000000001')
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

-- Rose is part of Series 1, which is ADR-0002's own example of containment. The edge carries no
-- position: which episode of the series this is belongs to an Ordering, and there is no column here
-- for it to be written in.
--
-- Selected *from* the founding Story rather than named twice, so the row count is decided by whether
-- that Story is there: one row where it is, none where it is not.
INSERT INTO "part_of" ("part_id", "whole_id")
SELECT "id", '00000000-0000-4000-8000-000000000002'
  FROM "story"
 WHERE "id" = '00000000-0000-4000-8000-000000000001'
ON CONFLICT ("part_id", "whole_id") DO NOTHING;--> statement-breakpoint

-- One Version of the founding Story: the television broadcast, forty-five minutes long. The runtime
-- is on this row and not on the Story, which is ADR-0001's whole point -- a second Version of the
-- same Story would state its own, and neither would be the Story's.
INSERT INTO "version" ("id", "story_id", "medium", "runtime")
SELECT '00000000-0000-4000-8000-0000000000b1', "id", 'television', interval '45 minutes'
  FROM "story"
 WHERE "id" = '00000000-0000-4000-8000-000000000001'
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

-- And the Story names it as the one whose details represent it, which is what lets the page state a
-- runtime without adjudicating anything: there is one Version today, and the pointer is what will
-- still be true when there are fifteen.
UPDATE "story"
   SET "canonical_version_id" = '00000000-0000-4000-8000-0000000000b1'
 WHERE "id" = '00000000-0000-4000-8000-000000000001';
