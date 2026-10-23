import type { LessonStatus } from './types.js';
import type { Lesson } from './views.js';

export type DisplayStatus = 'scheduled' | 'awaiting_payment' | 'paid' | 'cancelled';

export const DISPLAY_STATUS_LABEL: Record<DisplayStatus, string> = {
  scheduled: 'Scheduled',
  awaiting_payment: 'Awaiting payment',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

export function displayStatus(lesson: Pick<Lesson, 'status' | 'isPackageCovered'>): DisplayStatus {
  switch (lesson.status) {
    case 'scheduled':
      return 'scheduled';
    case 'paid':
      return 'paid';
    case 'cancelled':
    case 'no_show':
      return 'cancelled';
    case 'completed':
    case 'due':
      return lesson.isPackageCovered ? 'paid' : 'awaiting_payment';
    case 'partially_paid':
      return 'awaiting_payment';
  }
}

export type LessonPrimaryAction = 'complete' | 'mark_paid';

export function primaryAction(
  lesson: Pick<Lesson, 'status' | 'isPackageCovered'>,
): LessonPrimaryAction | null {
  const display = displayStatus(lesson);
  if (display === 'scheduled') return 'complete';
  if (display === 'awaiting_payment') return 'mark_paid';
  return null;
}

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

type ConflictCandidate = Pick<Lesson, 'id' | 'startsAt' | 'durationMin' | 'status'>;

export function findLessonConflicts<T extends ConflictCandidate>(lessons: T[]): [T, T][] {
  const active = lessons
    .filter((l) => l.status !== 'cancelled' && l.status !== 'no_show')
    .map((l) => {
      const start = new Date(l.startsAt).getTime();
      return { lesson: l, start, end: start + l.durationMin * 60_000 };
    })
    .sort((a, b) => a.start - b.start);

  const conflicts: [T, T][] = [];
  for (let i = 0; i < active.length; i++) {
    const a = active[i]!;
    for (let j = i + 1; j < active.length && active[j]!.start < a.end; j++) {
      conflicts.push([a.lesson, active[j]!.lesson]);
    }
  }
  return conflicts;
}
