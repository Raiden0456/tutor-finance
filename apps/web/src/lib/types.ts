import type { Currency } from '@tutor-finance/shared';

export interface Lesson {
  id: string;
  studentId: string;
  startsAt: string;
  durationMin: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string | null;
}

export type RecentLesson = Omit<Lesson, 'notes'>;

// ── Dashboard ────────────────────────────────────────────────────────────────

export interface CurrencyTotal {
  currency: Currency;
  amount: number;
  count: number;
}

export interface Summary {
  from: string;
  to: string;
  targetCurrency: Currency;
  incomeInTargetCurrency: number;
  expenseInTargetCurrency: number;
  netInTargetCurrency: number;
  income: CurrencyTotal[];
  expense: CurrencyTotal[];
}

export interface DailyTx {
  occurredAt: string;
  type: 'income' | 'expense';
  convertedAmount: number | null;
}

// ── Students ─────────────────────────────────────────────────────────────────

export interface StudentRef {
  id: string;
  name: string;
}

export interface Student {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  hourlyRate: { amount: number; currency: Currency };
  defaultCurrency: Currency;
  notes?: string | null;
  archivedAt?: string | null;
}

export interface IncomeTx {
  studentId: string | null;
  type: 'income' | 'expense';
  convertedAmount: number | null;
}

// ── Settings ─────────────────────────────────────────────────────────────────

export interface Settings {
  primaryCurrency: Currency;
  theme: 'light' | 'dark' | 'system';
  locale: 'en' | 'ru';
}

// ── Transactions ──────────────────────────────────────────────────────────────

export interface Tx {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  currency: Currency;
  occurredAt: string;
  category: string;
  studentId?: string | null;
  description?: string | null;
  convertedAmount?: number | null;
}

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Recurring {
  id: string;
  amount: number;
  currency: Currency;
  category: string;
  description: string | null;
  frequency: Frequency;
  startDate: string;
  nextDueAt: string;
  isActive: boolean;
}
