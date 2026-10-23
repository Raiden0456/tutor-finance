import { useState } from 'react';
import type { AiPendingAction } from '@tutor-finance/shared';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Collapse, FadeSwap } from '@/components/ui/collapse';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<AiPendingAction['status'], string> = {
  pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  confirmed: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  rejected: 'bg-muted text-muted-foreground',
  failed: 'bg-destructive/15 text-destructive',
};

const STATUS_LABELS: Record<AiPendingAction['status'], string> = {
  pending: 'Needs your confirmation',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  failed: 'Could not apply the change',
};

export function ActionCard({
  action,
  onDecide,
}: {
  action: AiPendingAction;
  onDecide: (action: AiPendingAction, confirm: boolean) => Promise<AiPendingAction | null>;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<'confirm' | 'reject' | null>(null);

  async function decide(confirm: boolean) {
    setBusy(confirm ? 'confirm' : 'reject');
    const updated = await onDecide(action, confirm);
    setBusy(null);
    if (updated?.status === 'confirmed') toast.success(t('Change applied'));
    else if (updated?.status === 'failed') toast.error(t('Could not apply the change'));
  }

  return (
    <div className="space-y-2.5 rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{action.summary}</p>
        <FadeSwap motionKey={action.status} className="shrink-0">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-medium',
              STATUS_STYLES[action.status],
            )}
          >
            {t(STATUS_LABELS[action.status])}
          </span>
        </FadeSwap>
      </div>
      <Collapse open={action.status === 'pending'}>
        <div className="flex gap-2 pt-0.5">
          <Button size="sm" className="flex-1" disabled={!!busy} onClick={() => void decide(true)}>
            {busy === 'confirm' ? <Spinner /> : <Check className="h-4 w-4" />}
            {t('Confirm')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            disabled={!!busy}
            onClick={() => void decide(false)}
          >
            {busy === 'reject' ? <Spinner /> : <X className="h-4 w-4" />}
            {t('Reject')}
          </Button>
        </div>
      </Collapse>
    </div>
  );
}
