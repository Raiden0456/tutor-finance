import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  boolean,
  index,
  uniqueIndex,
  doublePrecision,
  check,
} from 'drizzle-orm/pg-core';

const CURRENCY_SQL = sql.raw("'USD','EUR','RUB','GBP','UAH','KZT','TRY','PLN','USDT','USDC'");
const LESSON_STATUS_SQL = sql.raw(
  "'scheduled','completed','cancelled','no_show','due','paid','partially_paid'",
);
const TRANSACTION_TYPE_SQL = sql.raw("'income','expense'");
const FREQUENCY_SQL = sql.raw("'daily','weekly','monthly','yearly'");
const THEME_SQL = sql.raw("'light','dark','system'");
const LOCALE_SQL = sql.raw("'en','ru'");

// --- Better Auth tables ---------------------------------------------------
// Matches the standard Better Auth Drizzle/pg layout. Regenerate with:
//   pnpm db:auth:generate

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const authSchema = { user, session, account, verification };

// --- Domain tables --------------------------------------------------------

export const students = pgTable(
  'students',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    hourlyRateAmount: integer('hourly_rate_amount').notNull(),
    hourlyRateCurrency: text('hourly_rate_currency').notNull(),
    defaultCurrency: text('default_currency').notNull(),
    notes: text('notes'),
    archivedAt: timestamp('archived_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('students_user_id_idx').on(t.userId),
    index('students_user_name_idx').on(t.userId, t.name),
    check('students_hourly_rate_amount_nonnegative_chk', sql`${t.hourlyRateAmount} >= 0`),
    check('students_hourly_rate_currency_chk', sql`${t.hourlyRateCurrency} in (${CURRENCY_SQL})`),
    check('students_default_currency_chk', sql`${t.defaultCurrency} in (${CURRENCY_SQL})`),
  ],
);

export const lessons = pgTable(
  'lessons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    startsAt: timestamp('starts_at').notNull(),
    durationMin: integer('duration_min').notNull(),
    status: text('status').notNull(),
    priceOverrideAmount: integer('price_override_amount'),
    priceOverrideCurrency: text('price_override_currency'),
    paidAmount: integer('paid_amount'),
    notes: text('notes'),
    homework: text('homework'),
    meetingLink: text('meeting_link'),
    archivedAt: timestamp('archived_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('lessons_user_id_idx').on(t.userId),
    index('lessons_student_id_idx').on(t.studentId),
    index('lessons_user_starts_idx').on(t.userId, t.startsAt),
    check('lessons_duration_positive_chk', sql`${t.durationMin} > 0`),
    check('lessons_status_chk', sql`${t.status} in (${LESSON_STATUS_SQL})`),
    check(
      'lessons_price_override_amount_nonnegative_chk',
      sql`${t.priceOverrideAmount} is null or ${t.priceOverrideAmount} >= 0`,
    ),
    check(
      'lessons_paid_amount_nonnegative_chk',
      sql`${t.paidAmount} is null or ${t.paidAmount} >= 0`,
    ),
    check(
      'lessons_price_override_currency_chk',
      sql`${t.priceOverrideCurrency} is null or ${t.priceOverrideCurrency} in (${CURRENCY_SQL})`,
    ),
  ],
);

export const recurringExpenses = pgTable(
  'recurring_expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull(),
    category: text('category').notNull(),
    description: text('description'),
    frequency: text('frequency').notNull(), // 'daily' | 'weekly' | 'monthly' | 'yearly'
    startDate: timestamp('start_date').notNull(),
    nextDueAt: timestamp('next_due_at').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('recurring_user_id_idx').on(t.userId),
    index('recurring_next_due_idx').on(t.nextDueAt, t.isActive),
    check('recurring_amount_positive_chk', sql`${t.amount} > 0`),
    check('recurring_currency_chk', sql`${t.currency} in (${CURRENCY_SQL})`),
    check('recurring_frequency_chk', sql`${t.frequency} in (${FREQUENCY_SQL})`),
  ],
);

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull(),
    occurredAt: timestamp('occurred_at').notNull(),
    category: text('category').notNull(),
    studentId: uuid('student_id').references(() => students.id, { onDelete: 'set null' }),
    lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
    recurringExpenseId: uuid('recurring_expense_id').references(() => recurringExpenses.id, {
      onDelete: 'set null',
    }),
    description: text('description'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('transactions_user_id_idx').on(t.userId),
    index('transactions_user_occurred_idx').on(t.userId, t.occurredAt),
    uniqueIndex('transactions_user_lesson_uq').on(t.userId, t.lessonId),
    uniqueIndex('transactions_recurring_occurrence_uq').on(t.recurringExpenseId, t.occurredAt),
    check('transactions_type_chk', sql`${t.type} in (${TRANSACTION_TYPE_SQL})`),
    check('transactions_amount_positive_chk', sql`${t.amount} > 0`),
    check('transactions_currency_chk', sql`${t.currency} in (${CURRENCY_SQL})`),
  ],
);

export const fxRates = pgTable(
  'fx_rates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    base: text('base').notNull(),
    quote: text('quote').notNull(),
    rate: doublePrecision('rate').notNull(),
    fetchedAt: timestamp('fetched_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('fx_rates_base_quote_uq').on(t.base, t.quote)],
);

export const userSettings = pgTable(
  'user_settings',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    primaryCurrency: text('primary_currency').notNull().default('USD'),
    theme: text('theme').notNull().default('system'),
    locale: text('locale').notNull().default('en'),
    weekStartsOn: integer('week_starts_on').notNull().default(1),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check('user_settings_primary_currency_chk', sql`${t.primaryCurrency} in (${CURRENCY_SQL})`),
    check('user_settings_theme_chk', sql`${t.theme} in (${THEME_SQL})`),
    check('user_settings_locale_chk', sql`${t.locale} in (${LOCALE_SQL})`),
    check('user_settings_week_starts_on_chk', sql`${t.weekStartsOn} between 0 and 6`),
  ],
);

export const schema = {
  ...authSchema,
  students,
  lessons,
  recurringExpenses,
  transactions,
  fxRates,
  userSettings,
};
