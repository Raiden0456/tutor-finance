import * as React from 'react';
import { View } from 'react-native';
import { toMinorUnits, fromMinorUnits, type Currency, type Frequency } from '@tutor-finance/shared';
import { FormSheet } from '~/components/common/form-sheet';
import { Field } from '~/components/common/field';
import { MoreSection } from '~/components/common/more-section';
import { SelectField } from '~/components/common/select-field';
import { Notice } from '~/components/common/notice';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { useMutation } from '~/lib/use-mutation';
import { currencyOptions, categoryOptions, EXPENSE_CATEGORIES } from '~/lib/catalog';
import { useI18n } from '~/lib/i18n';
import { useSettings } from '~/lib/settings';
import type { Recurring } from '~/lib/types';

export function RecurringForm({
  open,
  onOpenChange,
  recurring,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurring?: Recurring | null;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { primaryCurrency } = useSettings();

  const [amount, setAmount] = React.useState('');
  const [currency, setCurrency] = React.useState<Currency>(primaryCurrency);
  const [category, setCategory] = React.useState('rent');
  const [description, setDescription] = React.useState('');
  const [frequency, setFrequency] = React.useState<Frequency>('monthly');
  const [more, setMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setMore(!!recurring && (recurring.currency !== primaryCurrency || !!recurring.description));
    setAmount(recurring ? String(fromMinorUnits(recurring.amount, recurring.currency)) : '');
    setCurrency(recurring?.currency ?? primaryCurrency);
    setCategory(recurring?.category ?? 'rent');
    setDescription(recurring?.description ?? '');
    setFrequency(recurring?.frequency ?? 'monthly');
  }, [open, recurring, primaryCurrency]);

  const freqOptions: { value: Frequency; label: string }[] = [
    { value: 'daily', label: t('daily') },
    { value: 'weekly', label: t('Weekly') },
    { value: 'monthly', label: t('Monthly') },
    { value: 'yearly', label: t('Yearly') },
  ];

  const submit = useMutation(
    async () => {
      setError(null);
      const minor = toMinorUnits(Number(amount) || 0, currency);
      if (minor < 1) return setError(t('Amount'));
      const payload = {
        amount: minor,
        currency,
        category,
        description: description.trim() || undefined,
        frequency,
      };
      if (recurring) await api.patch(`recurring/${recurring.id}`, payload);
      else await api.post('recurring', payload);
      onOpenChange(false);
      onSaved();
    },
    { onError: setError },
  );

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={recurring ? t('Edit recurring expense') : t('New recurring expense')}
      footer={
        <Button onPress={() => void submit.run()} disabled={submit.pending}>
          {submit.pending ? <Spinner color="#fff" /> : <Text>{t('Save')}</Text>}
        </Button>
      }
    >
      <View className="gap-4">
        <Notice message={error} />
        <Field label={`${t('Amount')} (${currency})`}>
          <Input
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
        </Field>
        <Field label={t('Category')}>
          <SelectField
            value={category}
            onValueChange={setCategory}
            options={categoryOptions(EXPENSE_CATEGORIES, t)}
          />
        </Field>
        <Field label={t('Frequency')}>
          <SelectField
            value={frequency}
            onValueChange={(v) => setFrequency(v as Frequency)}
            options={freqOptions}
          />
        </Field>
        <MoreSection open={more} onOpenChange={setMore}>
          <Field label={t('Currency')}>
            <SelectField
              value={currency}
              onValueChange={(v) => setCurrency(v as Currency)}
              options={currencyOptions()}
            />
          </Field>
          <Field label={t('Description')}>
            <Input value={description} onChangeText={setDescription} />
          </Field>
        </MoreSection>
      </View>
    </FormSheet>
  );
}
