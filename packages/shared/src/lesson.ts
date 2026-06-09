import type { LessonStatus } from './types.js';

/** Statuses that have an outstanding (or settle-able) payment. */
export function needsPayment(status: LessonStatus): boolean {
  return status === 'due' || status === 'partially_paid' || status === 'completed';
}

/** Returns true if the lesson is today or in the future (not a past calendar day). */
export function isNotPastDay(startsAt: string): boolean {
  const d = new Date(startsAt);
  const today = new Date();
  if (d.getFullYear() !== today.getFullYear()) return d.getFullYear() > today.getFullYear();
  if (d.getMonth() !== today.getMonth()) return d.getMonth() > today.getMonth();
  return d.getDate() >= today.getDate();
}

/** Combine a date-only and a time-only Date into one local Date. */
export function combineDateTime(date: Date, time: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    time.getHours(),
    time.getMinutes(),
    0,
    0,
  );
}

/** Display order for lesson statuses (e.g. status pickers). */
export const LESSON_STATUS_ORDER: LessonStatus[] = [
  'scheduled',
  'completed',
  'paid',
  'partially_paid',
  'due',
  'cancelled',
  'no_show',
];

/**
 * Tailwind/NativeWind token names for each status. The class strings are
 * identical across web and mobile; each client maps them to its own shape
 * (web: a combined string; mobile: { badgeClassName, textClassName }).
 */
export const LESSON_STATUS_COLORS: Record<LessonStatus, { bg: string; text: string }> = {
  scheduled: { bg: 'bg-tf-indigo/15', text: 'text-tf-indigo' },
  completed: { bg: 'bg-tf-teal/15', text: 'text-tf-teal' },
  paid: { bg: 'bg-tf-jade/15', text: 'text-tf-jade' },
  partially_paid: { bg: 'bg-tf-coral/15', text: 'text-tf-coral' },
  due: { bg: 'bg-tf-pollen/15', text: 'text-tf-pollen' },
  cancelled: { bg: 'bg-muted', text: 'text-muted-foreground' },
  no_show: { bg: 'bg-destructive/15', text: 'text-destructive' },
};
