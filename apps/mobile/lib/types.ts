import type {
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
} from '@tutor-finance/shared';

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
};

export interface Lesson {
  id: string;
  studentId: string;
  recurringLessonId?: string | null;
  startsAt: string;
  durationMin: number;
  status: LessonStatus;
  paidAmount: number | null;
  priceOverride: Money | null;
  effectivePrice: Money | null;
  isPackageCovered?: boolean;
  notes?: string | null;
  homework?: string | null;
  meetingLink?: string | null;
  archivedAt?: string | null;
}

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

export interface DailyFinanceStats {
  date: string;
  income: number;
  expense: number;
  planned: number;
  net: number;
}

export interface StudentRef {
  id: string;
  name: string;
  meetingLink?: string | null;
}

export interface Student {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  hourlyRate: Money;
  ratePeriodMin: number;
  pricingMode: PricingMode;
  activePackage: StudentLessonPackage | null;
  defaultCurrency: Currency;
  meetingLink?: string | null;
  telegramLink?: string | null;
  whatsappLink?: string | null;
  notes?: string | null;
  archivedAt?: string | null;
}

export interface AccountSecurity {
  hasPassword: boolean;
  providers: string[];
}

export interface AccountProfile {
  name: string | null;
  email: string;
}

export interface Settings {
  primaryCurrency: Currency;
  theme: Theme;
  locale: Locale;
  weekStartsOn: WeekStartsOn;
  accountSecurity: AccountSecurity;
  profile: AccountProfile;
}

export interface Tx {
  id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  occurredAt: string;
  category: string;
  studentId?: string | null;
  lessonId?: string | null;
  studentLessonPackageId?: string | null;
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

// ── Google Calendar ────────────────────────────────────────────────────────
export interface CalendarConnectionStatus {
  hasGoogleAccount: boolean;
  hasCalendarScope: boolean;
  calendarEnabled: boolean;
  calendarUrl: string | null;
  lastSyncedAt: string | null;
  pendingJobs: number;
}
