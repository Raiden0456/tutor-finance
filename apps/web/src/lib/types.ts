import type { Lesson, Student, StudentRef, TransactionType } from '@tutor-finance/shared';

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

export type RecentLesson = Omit<Lesson, 'notes'>;

export type LessonStudent = StudentRef & Pick<Student, 'ratePeriodMin' | 'defaultCurrency'>;

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
