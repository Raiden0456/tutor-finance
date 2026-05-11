CREATE TABLE "recurring_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"frequency" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"next_due_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "recurring_expense_id" uuid;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_user_id_idx" ON "recurring_expenses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recurring_next_due_idx" ON "recurring_expenses" USING btree ("next_due_at","is_active");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurring_expense_id_recurring_expenses_id_fk" FOREIGN KEY ("recurring_expense_id") REFERENCES "public"."recurring_expenses"("id") ON DELETE set null ON UPDATE no action;