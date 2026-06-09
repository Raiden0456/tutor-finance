import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Lesson } from './types';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// IMPORTANT: these must stay LITERAL class strings — Tailwind only generates
// classes it can see in scanned source, so they can't be assembled at runtime
// or imported from @tutor-finance/shared.
export const statusStyles: Record<Lesson['status'], string> = {
  scheduled: 'bg-tf-indigo/15 text-tf-indigo',
  completed: 'bg-tf-teal/15 text-tf-teal',
  cancelled: 'bg-muted text-muted-foreground',
  no_show: 'bg-destructive/15 text-destructive',
  due: 'bg-tf-pollen/15 text-tf-pollen',
  paid: 'bg-tf-jade/15 text-tf-jade',
  partially_paid: 'bg-tf-coral/15 text-tf-coral',
};

export const statusLabel: Record<Lesson['status'], string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
  due: 'Due',
  paid: 'Paid',
  partially_paid: 'Partial',
};
