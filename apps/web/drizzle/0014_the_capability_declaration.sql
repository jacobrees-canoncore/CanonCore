-- What one Provider declares about one Source, which is everything the application honours about
-- it: the retention, the licence and the attribution owed, what the terms restrict, and the three
-- blocks whose *absence* is a refusal — classification, Orderings and liveness.
-- CAN-104 Read a Provider's capability declaration, and refuse what it does not serve.
--
-- **This is a narrowing, in four shapes, and every one of them is stated because a reviewer's eye
-- slides over three of them.** Seventeen columns are added across the two tables; **twelve of them
-- arrive `NOT NULL` with no default** — eleven on `source` and `snapshot.source_declared_at` — while
-- `read_at` is `NOT NULL DEFAULT now()` and four are nullable. Beside them, and narrowing just as
-- much while reading as tidying up: one `UNIQUE`, on `(provider_base_url, declared_id)`, and three
-- `CHECK`s, on the trailing slash, the empty vocabulary and the orphaned liveness evidence.
--
-- The rule all four could break is that every migration must leave the schema able to serve the
-- previous release's code, writes included
-- (docs/adr/0027-migrations-are-forward-only-and-a-rollback-moves-code-alone.md).
--
-- **All four are safe here for one reason: both tables are empty and nothing writes to either.**
-- `source` is written by no code and seeded by no migration — `schema.ts` says why, and it is
-- decision 1 of ADR-0014 rather than an accident — and nothing has ever written a Snapshot. So there
-- is no existing row for a constraint to reject and no write of the previous release's for one to
-- refuse. The previous release reads both tables and deletes from both, and neither is affected by a
-- column or a constraint it does not name.
--
-- **If a row did exist, this would fail loudly rather than corrupt anything**: PostgreSQL refuses
-- `ADD COLUMN ... NOT NULL` with no default on a populated table, and validates a new `UNIQUE` or
-- `CHECK` against every row already there. A red migration step is a blocked release, which is the
-- failure to have.
--
-- No grant accompanies it. Migration 0004 grants `SELECT` on the whole table, and a table-level
-- privilege covers columns added afterwards.
ALTER TABLE "snapshot" ADD COLUMN "source_declared_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "provider_base_url" text NOT NULL;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "declared_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "url" text NOT NULL;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "declared_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "read_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "licence_spdx" text NOT NULL;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "licence_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "licence_url" text NOT NULL;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "licence_share_alike" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "attribution" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "restrictions" text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "classification" jsonb;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "orderings_canonical" boolean;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "liveness_confirms_deletion" boolean;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "liveness_evidence" text;--> statement-breakpoint
ALTER TABLE "source" ADD CONSTRAINT "source_one_row_per_provider_and_declared_id" UNIQUE("provider_base_url","declared_id");--> statement-breakpoint
ALTER TABLE "source" ADD CONSTRAINT "source_provider_base_url_has_no_trailing_slash" CHECK ("source"."provider_base_url" not like '%/');--> statement-breakpoint
ALTER TABLE "source" ADD CONSTRAINT "source_classification_vocabulary_is_not_empty" CHECK ("source"."classification" is null or jsonb_array_length("source"."classification") > 0);--> statement-breakpoint
ALTER TABLE "source" ADD CONSTRAINT "source_liveness_evidence_belongs_to_a_liveness_declaration" CHECK ("source"."liveness_evidence" is null or "source"."liveness_confirms_deletion" is not null);