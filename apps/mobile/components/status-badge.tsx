import { Badge } from '~/components/ui/badge';
import { Text } from '~/components/ui/text';
import { LESSON_STATUS_META } from '~/lib/lesson-status';
import { useI18n } from '~/lib/i18n';
import type { LessonStatus } from '@tutor-finance/shared';
import { cn } from '~/lib/utils';

export function StatusBadge({ status }: { status: LessonStatus }) {
  const { t } = useI18n();
  const meta = LESSON_STATUS_META[status];
  return (
    <Badge className={cn('border-transparent', meta.badgeClassName)}>
      <Text className={cn('text-xs font-medium', meta.textClassName)}>{t(meta.key)}</Text>
    </Badge>
  );
}
