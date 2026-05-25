CREATE TABLE "device_push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"platform" text,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"disabled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "device_push_tokens_platform_chk" CHECK ("device_push_tokens"."platform" is null or "device_push_tokens"."platform" in ('ios','android'))
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"entity_id" text NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_deliveries_type_chk" CHECK ("notification_deliveries"."type" in ('lesson_reminder','daily_due_summary')),
	CONSTRAINT "notification_deliveries_status_chk" CHECK ("notification_deliveries"."status" in ('pending','sent','failed'))
);
--> statement-breakpoint
ALTER TABLE "device_push_tokens" ADD CONSTRAINT "device_push_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "device_push_tokens_user_id_idx" ON "device_push_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "device_push_tokens_token_uq" ON "device_push_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "notification_deliveries_user_id_idx" ON "notification_deliveries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_deliveries_scheduled_for_idx" ON "notification_deliveries" USING btree ("scheduled_for");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_dedupe_uq" ON "notification_deliveries" USING btree ("type","entity_id","scheduled_for");