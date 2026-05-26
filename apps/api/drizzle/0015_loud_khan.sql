CREATE TABLE "calendar_sync_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"lesson_id" uuid,
	"google_event_id" text,
	"operation" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_attempt_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_sync_jobs_operation_chk" CHECK ("calendar_sync_jobs"."operation" in ('upsert','delete')),
	CONSTRAINT "calendar_sync_jobs_attempts_chk" CHECK ("calendar_sync_jobs"."attempts" >= 0)
);
--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "google_event_id" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "google_calendar_sync_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "google_calendar_id" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "google_calendar_connected_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "google_calendar_last_synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "calendar_sync_jobs" ADD CONSTRAINT "calendar_sync_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_sync_jobs" ADD CONSTRAINT "calendar_sync_jobs_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_sync_jobs_user_id_idx" ON "calendar_sync_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "calendar_sync_jobs_dispatch_idx" ON "calendar_sync_jobs" USING btree ("next_attempt_at","attempts");--> statement-breakpoint
CREATE INDEX "lessons_user_google_event_idx" ON "lessons" USING btree ("user_id","google_event_id");