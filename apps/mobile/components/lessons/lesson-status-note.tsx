import { displayStatus } from '@tutor-finance/shared';
import { Text } from '~/components/ui/text';
import { money } from '~/lib/format';
import { useI18n } from '~/lib/i18n';
import type { Lesson } from '~/lib/types';
import { cn } from '~/lib/utils';

export function LessonStatusNote({ lesson, className }: { lesson: Lesson; className?: string }) {
  const { t, locale } = useI18n();
  const price = lesson.effectivePrice;

  if (lesson.status === 'no_show') {
    return <Text className={cn('text-xs text-destructive', className)}>{t('No-show')}</Text>;
  }
  if (lesson.isPackageCovered && displayStatus(lesson) === 'paid') {
    return (
      <Text className={cn('text-xs text-muted-foreground', className)}>
        {t('Covered by package')}
      </Text>
    );
  }
  if (lesson.status === 'partially_paid' && lesson.paidAmount != null && price) {
    return (
      <Text className={cn('text-xs text-tf-coral', className)}>
        {t('Paid {paid} of {total}', {
          paid: money(lesson.paidAmount, price.currency, locale),
          total: money(price.amount, price.currency, locale),
        })}
      </Text>
    );
  }
  if (price && !lesson.isPackageCovered) {
    return (
      <Text className={cn('text-xs text-muted-foreground', className)}>
        {money(price.amount, price.currency, locale)}
      </Text>
    );
  }
  return null;
}
