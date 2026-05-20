import { format } from 'date-fns';
import type { WeekStartsOn } from '@tutor-finance/shared';
import type { Lesson } from '@/lib/types';

// ─── types ────────────────────────────────────────────────────────────────────

export type SelectionMode = 'single' | 'range';

export interface SlotDraft {
  id: string;
  studentId: string;
  date: Date;
  time: string;
  durationMin: number;
  status: 'scheduled' | 'due' | 'paid';
}

// ─── constants ────────────────────────────────────────────────────────────────

export const CREATE_STATUSES = ['scheduled', 'due', 'paid'] as const;

export function weekStartOptions(weekStartsOn: WeekStartsOn) {
  return { weekStartsOn };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

export function dayKey(d: Date | string): string {
  return format(typeof d === 'string' ? new Date(d) : d, 'yyyy-MM-dd');
}

export function monthKey(d: Date): string {
  return format(d, 'yyyy-MM');
}

export function findOverlaps(lessons: Lesson[]): Set<string> {
  const ids = new Set<string>();
  for (let i = 0; i < lessons.length; i++) {
    const aStart = new Date(lessons[i].startsAt).getTime();
    const aEnd = aStart + lessons[i].durationMin * 60000;
    for (let j = i + 1; j < lessons.length; j++) {
      const bStart = new Date(lessons[j].startsAt).getTime();
      const bEnd = bStart + lessons[j].durationMin * 60000;
      if (aStart < bEnd && bStart < aEnd) {
        ids.add(lessons[i].id);
        ids.add(lessons[j].id);
      }
    }
  }
  return ids;
}
