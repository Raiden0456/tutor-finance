import * as React from 'react';
import { View } from 'react-native';
import { toMinorUnits, type Currency } from '@tutor-finance/shared';
import { FormSheet } from '~/components/common/form-sheet';
import { Field } from '~/components/common/field';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { money } from '~/lib/format';
import { useI18n } from '~/lib/i18n';
import type { LessonPatch } from './types';

export function PartialPaymentSheet({
  open,
  onOpenChange,
  currency,
  fullPrice,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currency: Currency;
  fullPrice: number | null;
  onSubmit: LessonPatch;
}) {
  const { t, locale } = useI18n();
  const [amount, setAmount] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setAmount('');
  }, [open]);

  const submit = async () => {
    setSaving(true);
    try {
      const ok = await onSubmit({
        status: 'partially_paid',
        paidAmount: toMinorUnits(Number(amount) || 0, currency),
      });
      if (ok) onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('Partial Payment')}
      footer={
        <Button onPress={submit} disabled={saving || !amount}>
          {saving ? <Spinner color="#fff" /> : <Text>{t('Save')}</Text>}
        </Button>
      }
    >
      <View className="gap-3">
        {fullPrice != null ? (
          <Text className="text-sm text-muted-foreground">
            {t('Full lesson price:')} {money(fullPrice, currency, locale)}
          </Text>
        ) : null}
        <Field label={t('Amount received ({currency})', { currency })}>
          <Input
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
        </Field>
      </View>
    </FormSheet>
  );
}
