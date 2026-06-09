import type { LessonStatus } from '@tutor-finance/shared';
import { LESSON_STATUS_COLORS, LESSON_STATUS_ORDER } from '@tutor-finance/shared';

// Local adapter over the shared status color tokens: maps each status to the
// NativeWind badge/text classes + the i18n key. Keeps the existing
// LESSON_STATUS_META / LESSON_STATUS_OPTIONS surface so call sites don't change.
export const LESSON_STATUS_META: Record<
  LessonStatus,
  { key: string; badgeClassName: string; textClassName: string }
> = Object.fromEntries(
  (Object.keys(LESSON_STATUS_COLORS) as LessonStatus[]).map((s) => [
    s,
    { key: s, badgeClassName: LESSON_STATUS_COLORS[s].bg, textClassName: LESSON_STATUS_COLORS[s].text },
  ]),
) as Record<LessonStatus, { key: string; badgeClassName: string; textClassName: string }>;

export const LESSON_STATUS_OPTIONS: LessonStatus[] = LESSON_STATUS_ORDER;
