CREATE TABLE "recurring_lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"student_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"duration_min" integer NOT NULL,
	"frequency" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"next_scheduled_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"price_override_amount" integer,
	"price_override_currency" text,
	"meeting_link" text,
	"notes" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_lessons_dow_chk" CHECK ("recurring_lessons"."day_of_week" between 0 and 6),
	CONSTRAINT "recurring_lessons_duration_chk" CHECK ("recurring_lessons"."duration_min" > 0),
	CONSTRAINT "recurring_lessons_frequency_chk" CHECK ("recurring_lessons"."frequency" in ('weekly','biweekly')),
	CONSTRAINT "recurring_lessons_price_chk" CHECK ("recurring_lessons"."price_override_amount" is null or "recurring_lessons"."price_override_amount" >= 0),
	CONSTRAINT "recurring_lessons_currency_chk" CHECK ("recurring_lessons"."price_override_currency" is null or "recurring_lessons"."price_override_currency" in ('USD','EUR','RUB','GBP','UAH','KZT','TRY','PLN','USDT','USDC'))
);
--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "recurring_lesson_id" uuid;--> statement-breakpoint
ALTER TABLE "recurring_lessons" ADD CONSTRAINT "recurring_lessons_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_lessons" ADD CONSTRAINT "recurring_lessons_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_lessons_user_id_idx" ON "recurring_lessons" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recurring_lessons_next_idx" ON "recurring_lessons" USING btree ("next_scheduled_at","is_active");--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_recurring_lesson_id_recurring_lessons_id_fk" FOREIGN KEY ("recurring_lesson_id") REFERENCES "public"."recurring_lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lessons_recurring_occurrence_uq" ON "lessons" USING btree ("recurring_lesson_id","starts_at");