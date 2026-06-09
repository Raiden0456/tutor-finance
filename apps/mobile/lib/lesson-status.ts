import type { LessonStatus } from '@tutor-finance/shared';

// Maps a lesson status to badge styling (NativeWind classes) + the i18n key.
// Mirrors the colour intent of the web app's lesson card.
export const LESSON_STATUS_META: Record<
  LessonStatus,
  { key: string; badgeClassName: string; textClassName: string }
> = {
  scheduled: { key: 'scheduled', badgeClassName: 'bg-tf-indigo/15', textClassName: 'text-tf-indigo' },
  completed: { key: 'completed', badgeClassName: 'bg-net/15', textClassName: 'text-net' },
  paid: { key: 'paid', badgeClassName: 'bg-income/15', textClassName: 'text-income' },
  due: { key: 'due', badgeClassName: 'bg-tf-pollen/25', textClassName: 'text-foreground' },
  partially_paid: { key: 'partially_paid', badgeClassName: 'bg-tf-pollen/25', textClassName: 'text-foreground' },
  cancelled: { key: 'cancelled', badgeClassName: 'bg-muted', textClassName: 'text-muted-foreground' },
  no_show: { key: 'no_show', badgeClassName: 'bg-expense/15', textClassName: 'text-expense' },
};

export const LESSON_STATUS_OPTIONS: LessonStatus[] = [
  'scheduled',
  'completed',
  'paid',
  'partially_paid',
  'due',
  'cancelled',
  'no_show',
];
