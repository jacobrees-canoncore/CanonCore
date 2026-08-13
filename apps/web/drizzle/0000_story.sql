CREATE TYPE "public"."visibility" AS ENUM('private', 'public');--> statement-breakpoint
CREATE TABLE "story" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"owner_id" text NOT NULL,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	CONSTRAINT "story_owner_id_not_blank" CHECK (length("story"."owner_id") > 0)
);
--> statement-breakpoint
ALTER TABLE "story" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "story_readable_by_owner_or_when_public" ON "story" AS PERMISSIVE FOR SELECT TO "canoncore_app" USING ("story"."visibility" = 'public' or "story"."owner_id" = current_setting('canoncore.user_id', true));