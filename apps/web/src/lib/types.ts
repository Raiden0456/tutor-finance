import type { Lesson, TransactionType } from '@tutor-finance/shared';

// Re-export shared input + view types so existing `@/lib/types` imports keep working.
export type {
  CurrencyTotal,
  Frequency,
  LessonFrequency,
  PackagePaymentStatus,
  PricingMode,
  RecurringLesson,
  StudentLessonPackage,
  Lesson,
  Summary,
  DailyFinanceStats,
  StudentRef,
  Student,
  AccountSecurity,
  AccountProfile,
  Settings,
  Tx,
  Recurring,
} from '@tutor-finance/shared';

// ── Web-only view types ──────────────────────────────────────────────────────

export type RecentLesson = Omit<Lesson, 'notes'>;

export interface DailyTx {
  occurredAt: string;
  type: TransactionType;
  convertedAmount: number | null;
}

export interface IncomeTx {
  studentId: string | null;
  type: TransactionType;
  convertedAmount: number | null;
}
