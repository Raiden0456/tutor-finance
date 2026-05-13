import type {
  Currency,
  LessonStatus,
  TransactionType,
  Theme,
  Locale,
  Frequency,
  Money,
  CurrencyTotal,
} from '@tutor-finance/shared';

export type { CurrencyTotal, Frequency };

export interface Lesson {
  id: string;
  studentId: string;
  startsAt: string;
  durationMin: number;
  status: LessonStatus;
  paidAmount: number | null;
  effectivePrice: Money | null;
  notes?: string | null;
}

export type RecentLesson = Omit<Lesson, 'notes'>;

// ── Dashboard ────────────────────────────────────────────────────────────────

export interface Summary {
  from: string;
  to: string;
  targetCurrency: Currency;
  incomeInTargetCurrency: number;
  expenseInTargetCurrency: number;
  netInTargetCurrency: number;
  plannedIncomeInTargetCurrency: number;
  income: CurrencyTotal[];
  expense: CurrencyTotal[];
}

export interface DailyTx {
  occurredAt: string;
  type: TransactionType;
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
  hourlyRate: Money;
  defaultCurrency: Currency;
  notes?: string | null;
  archivedAt?: string | null;
}

export interface IncomeTx {
  studentId: string | null;
  type: TransactionType;
  convertedAmount: number | null;
}

// ── Settings ─────────────────────────────────────────────────────────────────

export interface Settings {
  primaryCurrency: Currency;
  theme: Theme;
  locale: Locale;
}

// ── Transactions ──────────────────────────────────────────────────────────────

export interface Tx {
  id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  occurredAt: string;
  category: string;
  studentId?: string | null;
  description?: string | null;
  convertedAmount?: number | null;
}

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
