import { api } from '@/lib/api';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { parseMajorToMinor, type Currency } from '@tutor-finance/shared';
import type { Recurring } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { RecurringFormDialog } from './form-dialog';

export function RecurringCreateDialog({
  open,
  onOpenChange,
  primaryCurrency,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryCurrency: Currency;
  onCreated: (r: Recurring) => void;
}) {
  const { t } = useI18n();

  async function onCreate(form: HTMLFormElement) {
    const data = new FormData(form);
    const currency = String(data.get('currency') ?? primaryCurrency) as Currency;
    const result = await api.post<Recurring>('/recurring', {
      amount: parseMajorToMinor(String(data.get('amount') ?? ''), currency),
      currency,
      category: String(data.get('category') ?? 'misc'),
      description: String(data.get('description') ?? '').trim() || undefined,
      frequency: String(data.get('frequency')),
      startDate: String(data.get('startDate') || new Date().toISOString().slice(0, 10)),
    });
    onCreated(result);
    onOpenChange(false);
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <RecurringFormDialog
        title={t('New recurring expense')}
        primaryCurrency={primaryCurrency}
        onSubmit={onCreate}
        onClose={() => onOpenChange(false)}
      />
    </ResponsiveModal>
  );
}
