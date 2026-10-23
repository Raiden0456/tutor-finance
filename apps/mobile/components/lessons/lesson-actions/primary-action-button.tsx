import type { LessonPrimaryAction } from '@tutor-finance/shared';
import { Banknote, CheckCircle2 } from 'lucide-react-native';
import { Button } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { useI18n } from '~/lib/i18n';
import type { Lesson } from '~/lib/types';
import { cn } from '~/lib/utils';

export const PRIMARY_ACTION_PATCH: Record<LessonPrimaryAction, { status: 'completed' | 'paid' }> = {
  complete: { status: 'completed' },
  mark_paid: { status: 'paid' },
};

export function PrimaryActionButton({
  lesson,
  action,
  busy,
  onPress,
  size = 'default',
  className,
}: {
  lesson: Pick<Lesson, 'status'>;
  action: LessonPrimaryAction;
  busy?: boolean;
  onPress: () => void;
  size?: 'default' | 'sm';
  className?: string;
}) {
  const { t } = useI18n();
  const label =
    action === 'complete'
      ? t('Mark as Completed')
      : lesson.status === 'partially_paid'
        ? t('Pay Remaining')
        : t('Mark as Paid');

  return (
    <Button
      size={size}
      className={cn('bg-tf-jade active:bg-tf-jade/90', className)}
      onPress={onPress}
      disabled={busy}
    >
      {busy ? (
        <Spinner color="#fff" />
      ) : (
        <>
          <Icon
            as={action === 'complete' ? CheckCircle2 : Banknote}
            size={16}
            className="text-white"
          />
          <Text className="font-semibold text-white">{label}</Text>
        </>
      )}
    </Button>
  );
}
