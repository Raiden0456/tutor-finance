ALTER TABLE "student_lesson_packages" ADD COLUMN "paid_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "student_lesson_packages" ADD COLUMN "paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "student_lesson_package_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_student_lesson_package_id_student_lesson_packages_id_fk" FOREIGN KEY ("student_lesson_package_id") REFERENCES "public"."student_lesson_packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_user_package_uq" ON "transactions" USING btree ("user_id","student_lesson_package_id");--> statement-breakpoint
ALTER TABLE "student_lesson_packages" ADD CONSTRAINT "student_packages_paid_amount_chk" CHECK ("student_lesson_packages"."paid_amount" >= 0 and "student_lesson_packages"."paid_amount" <= "student_lesson_packages"."price_amount");