CREATE TABLE "student_lesson_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"student_id" uuid NOT NULL,
	"lesson_count" integer NOT NULL,
	"price_amount" integer NOT NULL,
	"price_currency" text NOT NULL,
	"closed_at" timestamp,
	"closed_paid_lessons" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_packages_lesson_count_positive_chk" CHECK ("student_lesson_packages"."lesson_count" > 0),
	CONSTRAINT "student_packages_price_amount_positive_chk" CHECK ("student_lesson_packages"."price_amount" > 0),
	CONSTRAINT "student_packages_price_currency_chk" CHECK ("student_lesson_packages"."price_currency" in ('USD','EUR','RUB','GBP','UAH','KZT','TRY','PLN','USDT','USDC')),
	CONSTRAINT "student_packages_closed_paid_lessons_chk" CHECK ("student_lesson_packages"."closed_paid_lessons" is null or "student_lesson_packages"."closed_paid_lessons" >= 0)
);
--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "rate_period_min" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "pricing_mode" text DEFAULT 'hourly' NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "meeting_link" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "telegram_link" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "whatsapp_link" text;--> statement-breakpoint
ALTER TABLE "student_lesson_packages" ADD CONSTRAINT "student_lesson_packages_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_lesson_packages" ADD CONSTRAINT "student_lesson_packages_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "student_packages_user_id_idx" ON "student_lesson_packages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "student_packages_student_id_idx" ON "student_lesson_packages" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "student_packages_active_idx" ON "student_lesson_packages" USING btree ("student_id","closed_at");--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_rate_period_min_positive_chk" CHECK ("students"."rate_period_min" > 0);--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_pricing_mode_chk" CHECK ("students"."pricing_mode" in ('hourly','package'));