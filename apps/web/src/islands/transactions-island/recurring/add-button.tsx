import { useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ResponsiveModal, ResponsiveModalTrigger } from '@/components/ui/responsive-modal';
import { parseMajorToMinor, type Currency } from '@tutor-finance/shared';
import type { Recurring } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { RecurringFormDialog } from './form-dialog';

export function RecurringAddButton({
  primaryCurrency,
  onCreated,
}: {
  primaryCurrency: Currency;
  onCreated: (r: Recurring) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

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
    setOpen(false);
  }

  return (
    <ResponsiveModal open={open} onOpenChange={setOpen}>
      <ResponsiveModalTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> {t('Add')}
        </Button>
      </ResponsiveModalTrigger>
      <RecurringFormDialog
        title={t('New recurring expense')}
        primaryCurrency={primaryCurrency}
        onSubmit={onCreate}
        onClose={() => setOpen(false)}
      />
    </ResponsiveModal>
  );
}
