CREATE TABLE IF NOT EXISTS "PromptUsage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"prompt_count" integer DEFAULT 0 NOT NULL,
	"limit_exhausted_at" timestamp,
	"daily_quota" integer NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "PromptUsage" ADD CONSTRAINT "PromptUsage_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
