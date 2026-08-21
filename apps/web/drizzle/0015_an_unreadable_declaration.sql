-- What is left when a Provider answers with something that is not a capability declaration: the
-- moment it started, and what was wrong with it. CAN-104 Read a Provider's capability declaration,
-- and refuse what it does not serve.
--
-- **Both columns are nullable and the `CHECK` only relates them**, so this narrows nothing a write
-- could hit: a row with neither set satisfies it, which is every row that exists. Contrast 0014
-- beside it, which is a narrowing and says why it is safe.
--
-- Why the pair exists at all, and why an outage is deliberately not one of the things that sets it:
-- `unreadableSince` in `../src/db/schema.ts`.
ALTER TABLE "source" ADD COLUMN "unreadable_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "unreadable_because" text;--> statement-breakpoint
ALTER TABLE "source" ADD CONSTRAINT "source_unreadable_is_a_moment_and_a_reason" CHECK (("source"."unreadable_since" is null) = ("source"."unreadable_because" is null));