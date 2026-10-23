ALTER TABLE "notification_deliveries" DROP CONSTRAINT "notification_deliveries_type_chk";--> statement-breakpoint
ALTER TABLE "ai_messages" ADD COLUMN "status" text DEFAULT 'done' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD COLUMN "error" jsonb;--> statement-breakpoint
CREATE INDEX "ai_messages_running_idx" ON "ai_messages" USING btree ("thread_id") WHERE "ai_messages"."status" = 'running';--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_status_chk" CHECK ("ai_messages"."status" in ('running','done','error','stopped','interrupted'));--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_type_chk" CHECK ("notification_deliveries"."type" in ('lesson_reminder','daily_due_summary','assistant_reply'));