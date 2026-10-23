import { Banknote, CheckCircle2 } from 'lucide-react';
import type { LessonPrimaryAction } from '@tutor-finance/shared';
import { FadeSwap } from '@/components/ui/collapse';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { LessonActions } from '@/hooks/use-lesson-actions';

export function LessonPrimaryButton({
  action,
  actions,
  className,
}: {
  action: LessonPrimaryAction;
  actions: LessonActions;
  className?: string;
}) {
  const { t } = useI18n();
  const Icon = action === 'complete' ? CheckCircle2 : Banknote;

  return (
    <button
      type="button"
      disabled={actions.pending}
      onClick={() => (action === 'complete' ? actions.complete() : actions.markPaid())}
      className={cn(
        'flex h-10 w-full items-center justify-center rounded-full bg-tf-jade px-4 text-sm font-semibold text-white transition-all duration-150 hover:bg-tf-jade/90 active:scale-[0.97] disabled:opacity-70',
        className,
      )}
    >
      <FadeSwap motionKey={action} className="flex items-center gap-2">
        {actions.pending ? <Spinner /> : <Icon className="h-4 w-4" />}
        {action === 'complete' ? t('Mark as Completed') : t('Mark as Paid')}
      </FadeSwap>
    </button>
  );
}
