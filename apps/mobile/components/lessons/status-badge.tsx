import { DISPLAY_STATUS_LABEL, displayStatus } from '@tutor-finance/shared';
import { Badge } from '~/components/ui/badge';
import { Text } from '~/components/ui/text';
import { DISPLAY_STATUS_META } from '~/lib/lesson-status';
import { useI18n } from '~/lib/i18n';
import type { Lesson } from '~/lib/types';
import { cn } from '~/lib/utils';

export function StatusBadge({ lesson }: { lesson: Pick<Lesson, 'status' | 'isPackageCovered'> }) {
  const { t } = useI18n();
  const status = displayStatus(lesson);
  const meta = DISPLAY_STATUS_META[status];
  return (
    <Badge className={cn('border-transparent', meta.badgeClassName)}>
      <Text className={cn('text-xs font-medium', meta.textClassName)}>
        {t(DISPLAY_STATUS_LABEL[status])}
      </Text>
    </Badge>
  );
}
