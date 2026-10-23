import { DISPLAY_STATUS_LABEL, displayStatus } from '@tutor-finance/shared';
import { cn } from '@/lib/utils';
import { fmtMoney } from '@/lib/format';
import { useI18n, type TFunction } from '@/lib/i18n';
import type { Lesson } from '@/lib/types';
import { DISPLAY_STATUS_STYLES } from '@/utils/lesson';

export function LessonStatusBadge({ lesson, className }: { lesson: Lesson; className?: string }) {
  const { t } = useI18n();
  const status = displayStatus(lesson);
  return (
    <span
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors duration-200',
        DISPLAY_STATUS_STYLES[status],
        className,
      )}
    >
      {t(DISPLAY_STATUS_LABEL[status])}
    </span>
  );
}

export function lessonNote(lesson: Lesson, t: TFunction): { text: string; accent: boolean } | null {
  if (lesson.status === 'no_show') return { text: t('No-show'), accent: true };
  if (lesson.status === 'cancelled') return null;
  if (lesson.isPackageCovered) return { text: t('Covered by package'), accent: false };
  const price = lesson.effectivePrice;
  if (!price) return null;
  if (lesson.status === 'partially_paid' && lesson.paidAmount !== null) {
    return {
      text: t('Paid {paid} of {total}', {
        paid: fmtMoney(lesson.paidAmount, price.currency),
        total: fmtMoney(price.amount, price.currency),
      }),
      accent: true,
    };
  }
  return { text: fmtMoney(price.amount, price.currency), accent: false };
}
