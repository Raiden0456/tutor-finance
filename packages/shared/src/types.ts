import type { z } from 'zod';
import type { Currency } from './currency.js';
import type { Money } from './money.js';
import {
  LessonStatusEnum,
  LessonFrequencyEnum,
  TransactionTypeEnum,
  ThemeEnum,
  LocaleEnum,
  FrequencyEnum,
  WeekStartsOnEnum,
  PricingModeEnum,
  StudentInputSchema,
  LessonInputSchema,
  TransactionInputSchema,
  UserSettingsInputSchema,
  MoneyInputSchema,
} from './schemas.js';

export type LessonStatus = z.infer<typeof LessonStatusEnum>;
export type LessonFrequency = z.infer<typeof LessonFrequencyEnum>;
export type TransactionType = z.infer<typeof TransactionTypeEnum>;
export type Theme = z.infer<typeof ThemeEnum>;
export type Locale = z.infer<typeof LocaleEnum>;
export type Frequency = z.infer<typeof FrequencyEnum>;
export type WeekStartsOn = z.infer<typeof WeekStartsOnEnum>;
export type PricingMode = z.infer<typeof PricingModeEnum>;

export type StudentInput = z.infer<typeof StudentInputSchema>;
export type LessonInput = z.infer<typeof LessonInputSchema>;
export type TransactionInput = z.infer<typeof TransactionInputSchema>;
export type UserSettingsInput = z.infer<typeof UserSettingsInputSchema>;
export type MoneyInput = z.infer<typeof MoneyInputSchema>;

export type PackagePaymentStatus = 'unpaid' | 'partially_paid' | 'paid';

export interface StudentLessonPackage {
  id: string;
  lessonCount: number;
  price: Money;
  paidAmount: number;
  paymentStatus: PackagePaymentStatus;
  completedLessons: number;
  coveredLessons: number;
  remainingLessons: number;
  overageLessons: number;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringLesson {
  id: string;
  studentId: string;
  daysOfWeek: number[];
  startTime: string;
  durationMin: number;
  frequency: LessonFrequency;
  startDate: string;
  endDate: string | null;
  nextScheduledAt: string;
  isActive: boolean;
  priceOverride: Money | null;
  meetingLink: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CurrencyTotal {
  currency: Currency;
  amount: number;
  count: number;
}
