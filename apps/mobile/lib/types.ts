// Re-export shared input + view types so existing `~/lib/types` imports keep working.
export type {
  Currency,
  LessonStatus,
  LessonFrequency,
  TransactionType,
  Theme,
  Locale,
  Frequency,
  Money,
  CurrencyTotal,
  WeekStartsOn,
  RecurringLesson,
  PackagePaymentStatus,
  PricingMode,
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

// ── Mobile-only: Google Calendar ────────────────────────────────────────────
export interface CalendarConnectionStatus {
  hasGoogleAccount: boolean;
  hasCalendarScope: boolean;
  calendarEnabled: boolean;
  calendarUrl: string | null;
  lastSyncedAt: string | null;
  pendingJobs: number;
}
