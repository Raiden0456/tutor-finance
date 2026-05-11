import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Lesson } from './types';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const statusStyles: Record<Lesson['status'], string> = {
  scheduled: 'bg-rp-iris/15 text-rp-iris',
  completed: 'bg-rp-foam/15 text-rp-foam',
  cancelled: 'bg-muted text-muted-foreground',
  no_show: 'bg-destructive/15 text-destructive',
};

export const statusLabel: Record<Lesson['status'], string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};
