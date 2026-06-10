import * as React from 'react';
import { View } from 'react-native';
import {
  toMinorUnits,
  fromMinorUnits,
  combineDateTime,
  type Currency,
  type LessonStatus,
} from '@tutor-finance/shared';
import { FormSheet } from '~/components/common/form-sheet';
import { Field } from '~/components/common/field';
import { SelectField } from '~/components/common/select-field';
import { DateTimeField } from '~/components/common/date-time-field';
import { Notice } from '~/components/common/notice';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { currencyOptions } from '~/lib/catalog';
import { LESSON_STATUS_OPTIONS } from '~/lib/lesson-status';
import { useI18n } from '~/lib/i18n';
import { useSettings } from '~/lib/settings';
import type { Lesson, Student } from '~/lib/types';

export function LessonForm({
  open,
  onOpenChange,
  lesson,
  students,
  defaultDate,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson?: Lesson | null;
  students: Student[];
  defaultDate?: Date;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { primaryCurrency } = useSettings();

  const [studentId, setStudentId] = React.useState<string | null>(null);
  const [date, setDate] = React.useState(new Date());
  const [time, setTime] = React.useState(new Date());
  const [duration, setDuration] = React.useState('60');
  const [status, setStatus] = React.useState<LessonStatus>('scheduled');
  const [overrideAmount, setOverrideAmount] = React.useState('');
  const [overrideCurrency, setOverrideCurrency] = React.useState<Currency>(primaryCurrency);
  const [paidAmount, setPaidAmount] = React.useState('');
  const [meetingLink, setMeetingLink] = React.useState('');
  const [homework, setHomework] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    const starts = lesson ? new Date(lesson.startsAt) : (defaultDate ?? new Date());
    setStudentId(lesson?.studentId ?? students[0]?.id ?? null);
    setDate(starts);
    setTime(starts);
    setDuration(lesson ? String(lesson.durationMin) : '60');
    setStatus(lesson?.status ?? 'scheduled');
    setOverrideCurrency(lesson?.priceOverride?.currency ?? primaryCurrency);
    setOverrideAmount(
      lesson?.priceOverride
        ? String(fromMinorUnits(lesson.priceOverride.amount, lesson.priceOverride.currency))
        : '',
    );
    setPaidAmount(
      lesson?.paidAmount != null && lesson.effectivePrice
        ? String(fromMinorUnits(lesson.paidAmount, lesson.effectivePrice.currency))
        : '',
    );
    setMeetingLink(lesson?.meetingLink ?? '');
    setHomework(lesson?.homework ?? '');
    setNotes(lesson?.notes ?? '');
  }, [open, lesson, defaultDate, students, primaryCurrency]);

  const showPaid = status === 'paid' || status === 'partially_paid';

  const paidCurrency: Currency = overrideAmount.trim()
    ? overrideCurrency
    : (lesson?.effectivePrice?.currency ??
      students.find((s) => s.id === studentId)?.hourlyRate.currency ??
      overrideCurrency);

  const submit = async () => {
    setError(null);
    if (!studentId) return setError(t('Select student'));
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        studentId,
        startsAt: combineDateTime(date, time).toISOString(),
        durationMin: Number(duration) || 60,
        status,
        notes: notes.trim() || undefined,
        homework: homework.trim() || undefined,
        meetingLink: meetingLink.trim() || undefined,
      };
      if (overrideAmount.trim()) {
        payload.priceOverride = {
          amount: toMinorUnits(Number(overrideAmount) || 0, overrideCurrency),
          currency: overrideCurrency,
        };
      }
      if (showPaid && paidAmount.trim()) {
        payload.paidAmount = toMinorUnits(Number(paidAmount) || 0, paidCurrency);
      }
      if (lesson) await api.patch(`lessons/${lesson.id}`, payload);
      else await api.post('lessons', payload);
      onOpenChange(false);
      onSaved();
    } catch {
      setError(t('Error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={lesson ? t('Edit lesson') : t('New lesson')}
      footer={
        <Button onPress={submit} disabled={saving}>
          {saving ? <Spinner color="#fff" /> : <Text>{t('Save')}</Text>}
        </Button>
      }
    >
      <View className="gap-4">
        <Notice message={error} />
        <Field label={t('Student')}>
          <SelectField
            value={studentId}
            onValueChange={setStudentId}
            placeholder={t('Select student')}
            options={students.map((s) => ({ value: s.id, label: s.name }))}
          />
        </Field>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label={t('Date')}>
              <DateTimeField mode="date" value={date} onChange={setDate} />
            </Field>
          </View>
          <View className="w-28">
            <Field label={t('Time')}>
              <DateTimeField mode="time" value={time} onChange={setTime} />
            </Field>
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label={t('Duration (min)')}>
              <Input value={duration} onChangeText={setDuration} keyboardType="number-pad" />
            </Field>
          </View>
          <View className="flex-1">
            <Field label={t('Status')}>
              <SelectField
                value={status}
                onValueChange={(v) => setStatus(v as LessonStatus)}
                options={LESSON_STATUS_OPTIONS.map((s) => ({ value: s, label: t(s) }))}
              />
            </Field>
          </View>
        </View>
        <Field label={t('Price override')} hint={t('Leave blank to use hourly rate')}>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input
                value={overrideAmount}
                onChangeText={setOverrideAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            </View>
            <View className="w-28">
              <SelectField
                value={overrideCurrency}
                onValueChange={(v) => setOverrideCurrency(v as Currency)}
                options={currencyOptions()}
              />
            </View>
          </View>
        </Field>
        {showPaid ? (
          <Field label={t('Amount received ({currency})', { currency: paidCurrency })}>
            <Input
              value={paidAmount}
              onChangeText={setPaidAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </Field>
        ) : null}
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
