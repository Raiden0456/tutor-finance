import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { api } from '@/lib/api';
import { FadeSwap } from '@/components/ui/collapse';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { toMinorUnits, type Currency } from '@tutor-finance/shared';
import type { Recurring } from '@/lib/types';
import { RecurringCard } from './card';
import { useI18n } from '@/lib/i18n';
import { RecurringFormDialog } from './form-dialog';

export function RecurringList({
  items,
  primaryCurrency,
  onChange,
}: {
  items: Recurring[];
  primaryCurrency: Currency;
  onChange: (items: Recurring[]) => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<Recurring | null>(null);

  async function handleToggle(item: Recurring) {
    const updated = await api.patch<Recurring>(`/recurring/${item.id}`, {
      isActive: !item.isActive,
    });
    onChange(items.map((r) => (r.id === item.id ? updated : r)));
  }

  async function handleDelete(id: string) {
    await api.delete(`/recurring/${id}`);
    onChange(items.filter((r) => r.id !== id));
  }

  async function handleEdit(form: HTMLFormElement, id: string) {
    const data = new FormData(form);
    const currency = String(data.get('currency') ?? primaryCurrency) as Currency;
    const amountMajor = Number(data.get('amount') ?? 0);
    const updated = await api.patch<Recurring>(`/recurring/${id}`, {
      amount: toMinorUnits(amountMajor, currency),
      currency,
      category: String(data.get('category') ?? 'misc'),
      description: String(data.get('description') ?? '').trim() || undefined,
      frequency: String(data.get('frequency')),
    });
    onChange(items.map((r) => (r.id === id ? updated : r)));
    setEditing(null);
  }

  return (
    <FadeSwap motionKey={items.length === 0 ? 'empty' : 'list'}>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
          {t('No recurring expenses yet. Add one to automate regular costs.')}
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {items.map((r) => (
                <RecurringCard
                  key={r.id}
                  item={r}
                  onToggle={handleToggle}
                  onEdit={setEditing}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </ul>
          {editing && (
            <ResponsiveModal open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
              <RecurringFormDialog
                title={t('Edit recurring expense')}
                primaryCurrency={primaryCurrency}
                defaults={editing}
                onSubmit={(form) => handleEdit(form, editing.id)}
                onClose={() => setEditing(null)}
              />
            </ResponsiveModal>
          )}
        </>
      )}
    </FadeSwap>
  );
}
