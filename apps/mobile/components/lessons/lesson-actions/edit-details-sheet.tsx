import * as React from 'react';
import { View } from 'react-native';
import { toMinorUnits, fromMinorUnits, type Currency } from '@tutor-finance/shared';
import { FormSheet } from '~/components/common/form-sheet';
import { Field } from '~/components/common/field';
import { SelectField } from '~/components/common/select-field';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { currencyOptions } from '~/lib/catalog';
import { useI18n } from '~/lib/i18n';
import type { Lesson } from '~/lib/types';
import type { LessonPatch } from './types';

export function EditDetailsSheet({
  open,
  onOpenChange,
  lesson,
  defaultCurrency,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lesson: Lesson;
  defaultCurrency: Currency;
  onSubmit: LessonPatch;
}) {
  const { t } = useI18n();
  const [notes, setNotes] = React.useState('');
  const [homework, setHomework] = React.useState('');
  const [meetingLink, setMeetingLink] = React.useState('');
  const [priceAmount, setPriceAmount] = React.useState('');
  const [priceCurrency, setPriceCurrency] = React.useState<Currency>(defaultCurrency);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setNotes(lesson.notes ?? '');
    setHomework(lesson.homework ?? '');
    setMeetingLink(lesson.meetingLink ?? '');
    setPriceCurrency(lesson.priceOverride?.currency ?? defaultCurrency);
    setPriceAmount(
      lesson.priceOverride
        ? String(fromMinorUnits(lesson.priceOverride.amount, lesson.priceOverride.currency))
        : '',
    );
  }, [open, lesson, defaultCurrency]);

  const submit = async () => {
    setSaving(true);
    try {
      const ok = await onSubmit({
        notes: notes.trim() || null,
        homework: homework.trim() || null,
        meetingLink: meetingLink.trim() || null,
        priceOverride: priceAmount.trim()
          ? {
              amount: toMinorUnits(Number(priceAmount) || 0, priceCurrency),
              currency: priceCurrency,
            }
          : null,
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
      title={t('Edit Details')}
      footer={
        <Button onPress={submit} disabled={saving}>
          {saving ? <Spinner color="#fff" /> : <Text>{t('Save')}</Text>}
        </Button>
      }
    >
      <View className="gap-4">
        <Field label={t('Price override')} hint={t('Leave blank to use hourly rate')}>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input
                value={priceAmount}
                onChangeText={setPriceAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            </View>
            <View className="w-28">
              <SelectField
                value={priceCurrency}
                onValueChange={(v) => setPriceCurrency(v as Currency)}
                options={currencyOptions()}
              />
            </View>
          </View>
        </Field>
        <Field label={t('Meeting link')}>
          <Input value={meetingLink} onChangeText={setMeetingLink} autoCapitalize="none" />
        </Field>
        <Field label={t('Homework')}>
          <Textarea value={homework} onChangeText={setHomework} placeholder={t('Add homework…')} />
        </Field>
        <Field label={t('Notes')}>
          <Textarea value={notes} onChangeText={setNotes} placeholder={t('Add a note…')} />
        </Field>
      </View>
    </FormSheet>
  );
}
