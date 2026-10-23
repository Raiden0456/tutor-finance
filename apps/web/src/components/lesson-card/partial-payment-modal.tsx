import { useEffect, useState } from 'react';
import { parseMajorToMinor } from '@tutor-finance/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { fmtMajor, fmtMoney } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type { Lesson } from '@/lib/types';
import type { LessonActions } from '@/hooks/use-lesson-actions';

export function PartialPaymentModal({
  open,
  onOpenChange,
  lesson,
  actions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: Lesson;
  actions: LessonActions;
}) {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const price = lesson.effectivePrice;
  const currency = price?.currency ?? 'USD';

  useEffect(() => {
    if (open) {
      setInput(
        lesson.status === 'partially_paid' && lesson.paidAmount
          ? fmtMajor(lesson.paidAmount, currency)
          : '',
      );
    }
  }, [open]);

  async function submit() {
    const amount = parseMajorToMinor(input, currency);
    if (amount <= 0) return;
    if (await actions.partialPay(amount)) onOpenChange(false);
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-sm">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{t('Partial Payment')}</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!actions.pending) void submit();
          }}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <ResponsiveModalBody className="grid gap-4">
            {price && (
              <p className="text-sm text-muted-foreground">
                {t('Full lesson price:')}{' '}
                <span className="font-medium text-foreground">
                  {fmtMoney(price.amount, price.currency)}
                </span>
              </p>
            )}
            <div className="grid gap-2">
              <Label htmlFor={`partial-${lesson.id}`}>
                {t('Amount received ({currency})', { currency })}
              </Label>
              <Input
                id={`partial-${lesson.id}`}
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoFocus
                required
              />
            </div>
          </ResponsiveModalBody>
          <ResponsiveModalFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={!input || actions.pending}>
              {actions.pending && <Spinner />}
              {t('Save')}
            </Button>
          </ResponsiveModalFooter>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
