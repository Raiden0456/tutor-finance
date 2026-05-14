import { useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalTrigger,
} from '@/components/ui/responsive-modal';
import { toMinorUnits, type Currency } from '@tutor-finance/shared';
import type { Recurring } from '@/lib/types';
import { RecurringFormDialog } from './form-dialog';

export function RecurringAddButton({
  primaryCurrency,
  onCreated,
}: {
  primaryCurrency: Currency;
  onCreated: (r: Recurring) => void;
}) {
  const [open, setOpen] = useState(false);

  async function onCreate(form: HTMLFormElement) {
    const data = new FormData(form);
    const currency = String(data.get('currency') ?? primaryCurrency) as Currency;
    const amountMajor = Number(data.get('amount') ?? 0);
    const result = await api.post<Recurring>('/recurring', {
      amount: toMinorUnits(amountMajor, currency),
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
          <Plus className="h-4 w-4" /> Add
        </Button>
      </ResponsiveModalTrigger>
      <RecurringFormDialog
        title="New recurring expense"
        primaryCurrency={primaryCurrency}
        onSubmit={onCreate}
        onClose={() => setOpen(false)}
      />
    </ResponsiveModal>
  );
}
