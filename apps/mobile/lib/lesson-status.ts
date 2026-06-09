import type { LessonStatus } from '@tutor-finance/shared';
import { LESSON_STATUS_ORDER } from '@tutor-finance/shared';

// Maps a lesson status to badge styling (NativeWind classes) + the i18n key.
// Mirrors the colour intent of the web app's lesson card.
// IMPORTANT: the class strings must be LITERALS in this file — Tailwind only
// generates classes it can see in scanned source, so they can't be assembled
// at runtime or imported from @tutor-finance/shared.
export const LESSON_STATUS_META: Record<
  LessonStatus,
  { key: string; badgeClassName: string; textClassName: string }
> = {
  scheduled: { key: 'scheduled', badgeClassName: 'bg-tf-indigo/15', textClassName: 'text-tf-indigo' },
  completed: { key: 'completed', badgeClassName: 'bg-tf-teal/15', textClassName: 'text-tf-teal' },
  paid: { key: 'paid', badgeClassName: 'bg-tf-jade/15', textClassName: 'text-tf-jade' },
  due: { key: 'due', badgeClassName: 'bg-tf-pollen/15', textClassName: 'text-tf-pollen' },
  partially_paid: { key: 'partially_paid', badgeClassName: 'bg-tf-coral/15', textClassName: 'text-tf-coral' },
  cancelled: { key: 'cancelled', badgeClassName: 'bg-muted', textClassName: 'text-muted-foreground' },
  no_show: { key: 'no_show', badgeClassName: 'bg-destructive/15', textClassName: 'text-destructive' },
};

export const LESSON_STATUS_OPTIONS: LessonStatus[] = LESSON_STATUS_ORDER;
