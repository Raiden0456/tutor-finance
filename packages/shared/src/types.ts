import type { z } from 'zod';
import type { Currency } from './currency.js';
import {
  LessonStatusEnum,
  TransactionTypeEnum,
  ThemeEnum,
  LocaleEnum,
  FrequencyEnum,
  WeekStartsOnEnum,
  StudentInputSchema,
  LessonInputSchema,
  TransactionInputSchema,
  UserSettingsInputSchema,
  MoneyInputSchema,
} from './schemas.js';

export type LessonStatus = z.infer<typeof LessonStatusEnum>;
export type TransactionType = z.infer<typeof TransactionTypeEnum>;
export type Theme = z.infer<typeof ThemeEnum>;
export type Locale = z.infer<typeof LocaleEnum>;
export type Frequency = z.infer<typeof FrequencyEnum>;
export type WeekStartsOn = z.infer<typeof WeekStartsOnEnum>;

export type StudentInput = z.infer<typeof StudentInputSchema>;
export type LessonInput = z.infer<typeof LessonInputSchema>;
export type TransactionInput = z.infer<typeof TransactionInputSchema>;
export type UserSettingsInput = z.infer<typeof UserSettingsInputSchema>;
export type MoneyInput = z.infer<typeof MoneyInputSchema>;

export interface CurrencyTotal {
  currency: Currency;
  amount: number;
  count: number;
}
