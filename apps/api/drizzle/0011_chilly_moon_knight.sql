ALTER TABLE "recurring_lessons" RENAME COLUMN "day_of_week" TO "days_of_week";--> statement-breakpoint
ALTER TABLE "recurring_lessons" DROP CONSTRAINT "recurring_lessons_dow_chk";--> statement-breakpoint
ALTER TABLE "recurring_lessons" ALTER COLUMN "days_of_week" TYPE integer[] USING ARRAY["days_of_week"];--> statement-breakpoint
ALTER TABLE "recurring_lessons" ADD CONSTRAINT "recurring_lessons_dow_chk" CHECK (array_length("recurring_lessons"."days_of_week", 1) >= 1);