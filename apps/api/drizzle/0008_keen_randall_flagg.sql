ALTER TABLE "lessons" ADD CONSTRAINT "lessons_duration_positive_chk" CHECK ("lessons"."duration_min" > 0);--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_status_chk" CHECK ("lessons"."status" in ('scheduled','completed','cancelled','no_show','due','paid','partially_paid'));--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_price_override_amount_nonnegative_chk" CHECK ("lessons"."price_override_amount" is null or "lessons"."price_override_amount" >= 0);--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_paid_amount_nonnegative_chk" CHECK ("lessons"."paid_amount" is null or "lessons"."paid_amount" >= 0);--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_price_override_currency_chk" CHECK ("lessons"."price_override_currency" is null or "lessons"."price_override_currency" in ('USD','EUR','RUB','GBP','UAH','KZT','TRY','PLN','USDT','USDC'));--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_amount_positive_chk" CHECK ("recurring_expenses"."amount" > 0);--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_currency_chk" CHECK ("recurring_expenses"."currency" in ('USD','EUR','RUB','GBP','UAH','KZT','TRY','PLN','USDT','USDC'));--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_frequency_chk" CHECK ("recurring_expenses"."frequency" in ('daily','weekly','monthly','yearly'));--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_hourly_rate_amount_nonnegative_chk" CHECK ("students"."hourly_rate_amount" >= 0);--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_hourly_rate_currency_chk" CHECK ("students"."hourly_rate_currency" in ('USD','EUR','RUB','GBP','UAH','KZT','TRY','PLN','USDT','USDC'));--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_default_currency_chk" CHECK ("students"."default_currency" in ('USD','EUR','RUB','GBP','UAH','KZT','TRY','PLN','USDT','USDC'));--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_type_chk" CHECK ("transactions"."type" in ('income','expense'));--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_amount_positive_chk" CHECK ("transactions"."amount" > 0);--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_currency_chk" CHECK ("transactions"."currency" in ('USD','EUR','RUB','GBP','UAH','KZT','TRY','PLN','USDT','USDC'));--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_primary_currency_chk" CHECK ("user_settings"."primary_currency" in ('USD','EUR','RUB','GBP','UAH','KZT','TRY','PLN','USDT','USDC'));--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_theme_chk" CHECK ("user_settings"."theme" in ('light','dark','system'));--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_locale_chk" CHECK ("user_settings"."locale" in ('en','ru'));--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_week_starts_on_chk" CHECK ("user_settings"."week_starts_on" between 0 and 6);