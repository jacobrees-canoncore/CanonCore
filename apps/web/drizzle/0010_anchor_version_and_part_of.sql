CREATE TYPE "public"."medium" AS ENUM('television', 'prose', 'audio', 'comic', 'webcast', 'game', 'stage');--> statement-breakpoint
CREATE TABLE "anchor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "anchor" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "part_of" (
	"part_id" uuid NOT NULL,
	"whole_id" uuid NOT NULL,
	CONSTRAINT "part_of_part_id_whole_id_pk" PRIMARY KEY("part_id","whole_id"),
	CONSTRAINT "part_of_is_not_its_own_whole" CHECK ("part_of"."part_id" <> "part_of"."whole_id")
);
--> statement-breakpoint
ALTER TABLE "part_of" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"medium" "medium" NOT NULL,
	"runtime" interval,
	CONSTRAINT "version_id_with_its_story" UNIQUE("id","story_id"),
	CONSTRAINT "version_runtime_is_positive" CHECK ("version"."runtime" > interval '0')
);
--> statement-breakpoint
ALTER TABLE "version" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "story" ADD COLUMN "anchor_id" uuid;--> statement-breakpoint
ALTER TABLE "story" ADD COLUMN "canonical_version_id" uuid;--> statement-breakpoint
ALTER TABLE "part_of" ADD CONSTRAINT "part_of_part_id_story_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_of" ADD CONSTRAINT "part_of_whole_id_story_id_fk" FOREIGN KEY ("whole_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "version" ADD CONSTRAINT "version_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "part_of_whole_id_idx" ON "part_of" USING btree ("whole_id");--> statement-breakpoint
CREATE INDEX "version_story_id_idx" ON "version" USING btree ("story_id");--> statement-breakpoint
ALTER TABLE "story" ADD CONSTRAINT "story_anchor_id_anchor_id_fk" FOREIGN KEY ("anchor_id") REFERENCES "public"."anchor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story" ADD CONSTRAINT "story_canonical_version" FOREIGN KEY ("canonical_version_id","id") REFERENCES "public"."version"("id","story_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "anchor_readable_by_anyone" ON "anchor" AS PERMISSIVE FOR SELECT TO "canoncore_app" USING (true);--> statement-breakpoint
CREATE POLICY "anchor_mintable_by_any_signed_in_reader" ON "anchor" AS PERMISSIVE FOR INSERT TO "canoncore_app" WITH CHECK (current_setting('canoncore.user_id', true) <> '');--> statement-breakpoint
CREATE POLICY "part_of_readable_when_both_its_stories_are" ON "part_of" AS PERMISSIVE FOR SELECT TO "canoncore_app" USING (exists (select 1 from "story" where "story"."id" = "part_of"."part_id")
        and exists (select 1 from "story" where "story"."id" = "part_of"."whole_id"));--> statement-breakpoint
CREATE POLICY "version_readable_when_its_story_is" ON "version" AS PERMISSIVE FOR SELECT TO "canoncore_app" USING (exists (select 1 from "story" where "story"."id" = "version"."story_id"));