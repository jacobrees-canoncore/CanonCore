CREATE TABLE "snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	CONSTRAINT "snapshot_one_row_per_story_and_source" UNIQUE("story_id","source_id")
);
--> statement-breakpoint
ALTER TABLE "snapshot" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"retention" interval NOT NULL,
	CONSTRAINT "source_retention_is_positive" CHECK ("source"."retention" > interval '0')
);
--> statement-breakpoint
ALTER TABLE "snapshot" ADD CONSTRAINT "snapshot_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshot" ADD CONSTRAINT "snapshot_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "snapshot_readable_when_its_story_is" ON "snapshot" AS PERMISSIVE FOR SELECT TO "canoncore_app" USING (exists (select 1 from "story" where "story"."id" = "snapshot"."story_id"));