import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { fromMinorUnits, SUPPORTED_CURRENCIES, type Currency } from '@tutor-finance/shared';
import type { Recurring } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { EXPENSE_CATEGORIES, FREQUENCIES } from '../constants';

export function RecurringFormDialog({
  title,
  primaryCurrency,
  defaults,
  onSubmit,
  onClose: _onClose,
}: {
  title: string;
  primaryCurrency: Currency;
  defaults?: Partial<Recurring>;
  onSubmit: (form: HTMLFormElement) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: { preventDefault: () => void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(e.currentTarget);
    } finally {
      setSubmitting(false);
    }
  }

  const defaultCurrency = defaults?.currency ?? primaryCurrency;
  const defaultAmount =
    defaults?.amount != null
      ? String(fromMinorUnits(defaults.amount, defaults.currency ?? primaryCurrency))
      : '';
  const defaultStart = defaults?.startDate
    ? new Date(defaults.startDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return (
    <ResponsiveModalContent className="max-w-md">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>{title}</ResponsiveModalTitle>
      </ResponsiveModalHeader>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
        <ResponsiveModalBody className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="rec-amount">{t('Amount')}</Label>
              <Input
                id="rec-amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                defaultValue={defaultAmount}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rec-currency">{t('Currency')}</Label>
              <Select name="currency" defaultValue={defaultCurrency}>
                <SelectTrigger id="rec-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rec-category">{t('Category')}</Label>
            <Select name="category" defaultValue={defaults?.category ?? EXPENSE_CATEGORIES[0]}>
              <SelectTrigger id="rec-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {t(`category.${c}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rec-description">{t('Description')}</Label>
            <Input
              id="rec-description"
              name="description"
              defaultValue={defaults?.description ?? ''}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="rec-frequency">{t('Frequency')}</Label>
              <Select name="frequency" defaultValue={defaults?.frequency ?? 'monthly'}>
                <SelectTrigger id="rec-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((frequency) => (
                    <SelectItem key={frequency} value={frequency}>
                      {t(frequency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rec-start">{t('Start date')}</Label>
              <Input
                id="rec-start"
                name="startDate"
                type="date"
                required
                defaultValue={defaultStart}
              />
            </div>
          </div>
        </ResponsiveModalBody>
        <ResponsiveModalFooter>
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {t('Save')}
          </Button>
        </ResponsiveModalFooter>
      </form>
    </ResponsiveModalContent>
  );
}
