import { format } from 'date-fns';
import { findLessonConflicts, type WeekStartsOn } from '@tutor-finance/shared';
import type { Lesson } from '@/lib/types';

export type SelectionMode = 'single' | 'range';

export interface SlotDraft {
  id: string;
  studentId: string;
  date: Date;
  time: string;
  durationMin: number;
}

export function weekStartOptions(weekStartsOn: WeekStartsOn) {
  return { weekStartsOn };
}

export function dayKey(d: Date | string): string {
  return format(typeof d === 'string' ? new Date(d) : d, 'yyyy-MM-dd');
}

export function monthKey(d: Date): string {
  return format(d, 'yyyy-MM');
}

export function findOverlaps(lessons: Lesson[]): Set<string> {
  return new Set(findLessonConflicts(lessons).flatMap(([a, b]) => [a.id, b.id]));
}
