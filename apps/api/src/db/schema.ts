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
const LESSON_FREQUENCY_SQL = sql.raw("'weekly','biweekly'");
const PRICING_MODE_SQL = sql.raw("'hourly','package'");
const THEME_SQL = sql.raw("'light','dark','system'");
const LOCALE_SQL = sql.raw("'en','ru'");
const PUSH_PLATFORM_SQL = sql.raw("'ios','android'");
const NOTIFICATION_TYPE_SQL = sql.raw("'lesson_reminder','daily_due_summary'");
const NOTIFICATION_STATUS_SQL = sql.raw("'pending','sent','failed'");

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
    ratePeriodMin: integer('rate_period_min').notNull().default(60),
    pricingMode: text('pricing_mode').notNull().default('hourly'),
    defaultCurrency: text('default_currency').notNull(),
    meetingLink: text('meeting_link'),
    telegramLink: text('telegram_link'),
    whatsappLink: text('whatsapp_link'),
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
    check('students_rate_period_min_positive_chk', sql`${t.ratePeriodMin} > 0`),
    check('students_pricing_mode_chk', sql`${t.pricingMode} in (${PRICING_MODE_SQL})`),
    check('students_default_currency_chk', sql`${t.defaultCurrency} in (${CURRENCY_SQL})`),
  ],
);

export const studentLessonPackages = pgTable(
  'student_lesson_packages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    lessonCount: integer('lesson_count').notNull(),
    priceAmount: integer('price_amount').notNull(),
    priceCurrency: text('price_currency').notNull(),
    paidAmount: integer('paid_amount').notNull().default(0),
    paidAt: timestamp('paid_at'),
    closedAt: timestamp('closed_at'),
    closedPaidLessons: integer('closed_paid_lessons'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('student_packages_user_id_idx').on(t.userId),
    index('student_packages_student_id_idx').on(t.studentId),
    index('student_packages_active_idx').on(t.studentId, t.closedAt),
    check('student_packages_lesson_count_positive_chk', sql`${t.lessonCount} > 0`),
    check('student_packages_price_amount_positive_chk', sql`${t.priceAmount} > 0`),
    check('student_packages_price_currency_chk', sql`${t.priceCurrency} in (${CURRENCY_SQL})`),
    check(
      'student_packages_paid_amount_chk',
      sql`${t.paidAmount} >= 0 and ${t.paidAmount} <= ${t.priceAmount}`,
    ),
    check(
      'student_packages_closed_paid_lessons_chk',
      sql`${t.closedPaidLessons} is null or ${t.closedPaidLessons} >= 0`,
    ),
  ],
);

export const recurringLessons = pgTable(
  'recurring_lessons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    daysOfWeek: integer('days_of_week').array().notNull(),
    startTime: text('start_time').notNull(),
    durationMin: integer('duration_min').notNull(),
    frequency: text('frequency').notNull(),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date'),
    nextScheduledAt: timestamp('next_scheduled_at').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    priceOverrideAmount: integer('price_override_amount'),
    priceOverrideCurrency: text('price_override_currency'),
    meetingLink: text('meeting_link'),
    notes: text('notes'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('recurring_lessons_user_id_idx').on(t.userId),
    index('recurring_lessons_next_idx').on(t.nextScheduledAt, t.isActive),
    check('recurring_lessons_dow_chk', sql`array_length(${t.daysOfWeek}, 1) >= 1`),
    check('recurring_lessons_duration_chk', sql`${t.durationMin} > 0`),
    check('recurring_lessons_frequency_chk', sql`${t.frequency} in (${LESSON_FREQUENCY_SQL})`),
    check(
      'recurring_lessons_price_chk',
      sql`${t.priceOverrideAmount} is null or ${t.priceOverrideAmount} >= 0`,
    ),
    check(
      'recurring_lessons_currency_chk',
      sql`${t.priceOverrideCurrency} is null or ${t.priceOverrideCurrency} in (${CURRENCY_SQL})`,
    ),
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
    recurringLessonId: uuid('recurring_lesson_id').references(() => recurringLessons.id, {
      onDelete: 'set null',
    }),
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
    uniqueIndex('lessons_recurring_occurrence_uq').on(t.recurringLessonId, t.startsAt),
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
    studentLessonPackageId: uuid('student_lesson_package_id').references(
      () => studentLessonPackages.id,
      { onDelete: 'set null' },
    ),
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
    uniqueIndex('transactions_user_package_uq').on(t.userId, t.studentLessonPackageId),
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

export const devicePushTokens = pgTable(
  'device_push_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    platform: text('platform'),
    lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
    disabledAt: timestamp('disabled_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('device_push_tokens_user_id_idx').on(t.userId),
    uniqueIndex('device_push_tokens_token_uq').on(t.token),
    check(
      'device_push_tokens_platform_chk',
      sql`${t.platform} is null or ${t.platform} in (${PUSH_PLATFORM_SQL})`,
    ),
  ],
);

export const notificationDeliveries = pgTable(
  'notification_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    entityId: text('entity_id').notNull(),
    scheduledFor: timestamp('scheduled_for').notNull(),
    status: text('status').notNull().default('pending'),
    sentAt: timestamp('sent_at'),
    error: text('error'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('notification_deliveries_user_id_idx').on(t.userId),
    index('notification_deliveries_scheduled_for_idx').on(t.scheduledFor),
    uniqueIndex('notification_deliveries_dedupe_uq').on(t.type, t.entityId, t.scheduledFor),
    check('notification_deliveries_type_chk', sql`${t.type} in (${NOTIFICATION_TYPE_SQL})`),
    check('notification_deliveries_status_chk', sql`${t.status} in (${NOTIFICATION_STATUS_SQL})`),
  ],
);

export const schema = {
  ...authSchema,
  students,
  studentLessonPackages,
  recurringLessons,
  lessons,
  recurringExpenses,
  transactions,
  fxRates,
  userSettings,
  devicePushTokens,
  notificationDeliveries,
};
