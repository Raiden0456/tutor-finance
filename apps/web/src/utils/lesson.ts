import { displayStatus, type Currency, type DisplayStatus } from '@tutor-finance/shared';
import type { Lesson } from '@/lib/types';

// Literal class strings so Tailwind can see them at build time.
export const DISPLAY_STATUS_STYLES: Record<DisplayStatus, string> = {
  scheduled: 'bg-tf-indigo/15 text-tf-indigo',
  awaiting_payment: 'bg-tf-pollen/15 text-tf-pollen',
  paid: 'bg-tf-jade/15 text-tf-jade',
  cancelled: 'bg-muted text-muted-foreground',
};

export function lessonOwed(lesson: Lesson): { amount: number; currency: Currency } | null {
  if (displayStatus(lesson) !== 'awaiting_payment' || !lesson.effectivePrice) return null;
  const paid = lesson.status === 'partially_paid' ? (lesson.paidAmount ?? 0) : 0;
  const amount = lesson.effectivePrice.amount - paid;
  return amount > 0 ? { amount, currency: lesson.effectivePrice.currency } : null;
}

export function lessonMenuActions(lesson: Lesson) {
  const open = ['scheduled', 'due', 'completed'].includes(lesson.status);
  return {
    reschedule: lesson.status === 'scheduled',
    partialPayment: displayStatus(lesson) === 'awaiting_payment',
    noShow: open,
    cancel: open,
  };
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function toLocalDateTimeValue(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
