CREATE TYPE "public"."former_type" AS ENUM('story');--> statement-breakpoint
CREATE TABLE "tombstone" (
	"id" uuid PRIMARY KEY NOT NULL,
	"former_type" "former_type" NOT NULL,
	"deleted" timestamp with time zone DEFAULT now() NOT NULL,
	"owner_id" text NOT NULL,
	"visibility" "visibility" NOT NULL,
	CONSTRAINT "tombstone_owner_id_not_blank" CHECK (length("tombstone"."owner_id") > 0)
);
--> statement-breakpoint
ALTER TABLE "tombstone" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tombstone_readable_by_owner_or_when_public" ON "tombstone" AS PERMISSIVE FOR SELECT TO "canoncore_app" USING ("tombstone"."visibility" = 'public' or "tombstone"."owner_id" = current_setting('canoncore.user_id', true));