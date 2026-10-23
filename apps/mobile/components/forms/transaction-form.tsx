import * as React from 'react';
import { View } from 'react-native';
import {
  toMinorUnits,
  fromMinorUnits,
  type Currency,
  type TransactionType,
} from '@tutor-finance/shared';
import { FormSheet } from '~/components/common/form-sheet';
import { Field } from '~/components/common/field';
import { MoreSection } from '~/components/common/more-section';
import { Segmented } from '~/components/common/segmented';
import { SelectField } from '~/components/common/select-field';
import { DateTimeField } from '~/components/common/date-time-field';
import { Notice } from '~/components/common/notice';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { useMutation } from '~/lib/use-mutation';
import {
  currencyOptions,
  categoryOptions,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from '~/lib/catalog';
import { useI18n } from '~/lib/i18n';
import { useSettings } from '~/lib/settings';
import type { Student, Tx } from '~/lib/types';

export function TransactionForm({
  open,
  onOpenChange,
  transaction,
  students,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Tx | null;
  students: Student[];
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { primaryCurrency } = useSettings();

  const [type, setType] = React.useState<TransactionType>('expense');
  const [amount, setAmount] = React.useState('');
  const [currency, setCurrency] = React.useState<Currency>(primaryCurrency);
  const [category, setCategory] = React.useState('other');
  const [occurredAt, setOccurredAt] = React.useState(new Date());
  const [studentId, setStudentId] = React.useState<string | null>(null);
  const [description, setDescription] = React.useState('');
  const [more, setMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setMore(
      !!transaction &&
        (transaction.currency !== primaryCurrency ||
          !!transaction.studentId ||
          !!transaction.description),
    );
    setType(transaction?.type ?? 'expense');
    setAmount(transaction ? String(fromMinorUnits(transaction.amount, transaction.currency)) : '');
    setCurrency(transaction?.currency ?? primaryCurrency);
    setCategory(transaction?.category ?? (transaction?.type === 'income' ? 'lesson' : 'other'));
    setOccurredAt(transaction ? new Date(transaction.occurredAt) : new Date());
    setStudentId(transaction?.studentId ?? null);
    setDescription(transaction?.description ?? '');
  }, [open, transaction, primaryCurrency]);

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const submit = useMutation(
    async () => {
      setError(null);
      const minor = toMinorUnits(Number(amount) || 0, currency);
      if (minor < 1) return setError(t('Amount'));
      const payload = {
        type,
        amount: minor,
        currency,
        occurredAt: occurredAt.toISOString(),
        category,
        studentId: type === 'income' ? (studentId ?? undefined) : undefined,
        description: description.trim() || undefined,
      };
      if (transaction) await api.patch(`transactions/${transaction.id}`, payload);
      else await api.post('transactions', payload);
      onOpenChange(false);
      onSaved();
    },
    { onError: setError },
  );

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={transaction ? t('Edit transaction') : t('New transaction')}
      footer={
        <Button onPress={() => void submit.run()} disabled={submit.pending}>
          {submit.pending ? <Spinner color="#fff" /> : <Text>{t('Save')}</Text>}
        </Button>
      }
    >
      <View className="gap-4">
        <Notice message={error} />
        <Segmented<TransactionType>
          value={type}
          onChange={(v) => {
            setType(v);
            setCategory(v === 'income' ? 'lesson' : 'other');
          }}
          options={[
            { value: 'income', label: t('Income') },
            { value: 'expense', label: t('Expense') },
          ]}
        />
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
            options={categoryOptions(categories, t)}
          />
        </Field>
        <Field label={t('Date')}>
          <DateTimeField mode="date" value={occurredAt} onChange={setOccurredAt} />
        </Field>
        <MoreSection open={more} onOpenChange={setMore}>
          <Field label={t('Currency')}>
            <SelectField
              value={currency}
              onValueChange={(v) => setCurrency(v as Currency)}
              options={currencyOptions()}
            />
          </Field>
          {type === 'income' ? (
            <Field label={t('Student')}>
              <SelectField
                value={studentId}
                onValueChange={setStudentId}
                placeholder={t('Select student')}
                options={students.map((s) => ({ value: s.id, label: s.name }))}
              />
            </Field>
          ) : null}
          <Field label={t('Description')}>
            <Textarea value={description} onChangeText={setDescription} />
          </Field>
        </MoreSection>
      </View>
    </FormSheet>
  );
}
