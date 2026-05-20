import { z } from 'zod';
import { SUPPORTED_CURRENCIES, type Currency } from './currency.js';

const currencyEnum = z.enum(SUPPORTED_CURRENCIES as unknown as [Currency, ...Currency[]]);

export const MoneyInputSchema = z.object({
  amount: z.number().int().nonnegative(),
  currency: currencyEnum,
});

const id = z.string().uuid();

export const StudentInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
  hourlyRate: MoneyInputSchema,
  defaultCurrency: currencyEnum,
  notes: z.string().optional(),
});

export const LessonStatusEnum = z.enum([
  'scheduled',
  'completed',
  'cancelled',
  'no_show',
  'due',
  'paid',
  'partially_paid',
]);

export const LessonInputSchema = z.object({
  studentId: id,
  startsAt: z.string().datetime(),
  durationMin: z.number().int().positive(),
  status: LessonStatusEnum,
  priceOverride: MoneyInputSchema.optional(),
  notes: z.string().optional(),
});

export const TransactionTypeEnum = z.enum(['income', 'expense']);

export const TransactionInputSchema = z.object({
  type: TransactionTypeEnum,
  amount: z.number().int().positive(),
  currency: currencyEnum,
  occurredAt: z.string().datetime(),
  category: z.string().min(1),
  studentId: id.optional(),
  lessonId: id.optional(),
  description: z.string().optional(),
});

export const ThemeEnum = z.enum(['light', 'dark', 'system']);
export const LocaleEnum = z.enum(['en', 'ru']);
export const FrequencyEnum = z.enum(['daily', 'weekly', 'monthly', 'yearly']);
export const WeekStartsOnEnum = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

export const UserSettingsInputSchema = z.object({
  primaryCurrency: currencyEnum,
  theme: ThemeEnum,
  locale: LocaleEnum,
  weekStartsOn: WeekStartsOnEnum,
});
