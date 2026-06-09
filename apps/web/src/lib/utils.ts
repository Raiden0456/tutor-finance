import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LESSON_STATUS_COLORS } from '@tutor-finance/shared';
import type { Lesson } from './types';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Status badge classes, derived from the shared color tokens (single source of truth).
export const statusStyles = Object.fromEntries(
  (Object.keys(LESSON_STATUS_COLORS) as Lesson['status'][]).map((s) => [
    s,
    `${LESSON_STATUS_COLORS[s].bg} ${LESSON_STATUS_COLORS[s].text}`,
  ]),
) as Record<Lesson['status'], string>;

export const statusLabel: Record<Lesson['status'], string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
  due: 'Due',
  paid: 'Paid',
  partially_paid: 'Partial',
};
