import * as React from 'react';
import { View } from 'react-native';
import { toMinorUnits, combineDateTime, type Currency } from '@tutor-finance/shared';
import { FormSheet } from '~/components/common/form-sheet';
import { Field } from '~/components/common/field';
import { MoreSection } from '~/components/common/more-section';
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
import { currencyOptions } from '~/lib/catalog';
import { useI18n } from '~/lib/i18n';
import { useSettings } from '~/lib/settings';
import type { Student } from '~/lib/types';

export function LessonForm({
  open,
  onOpenChange,
  students,
  defaultDate,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  const [overrideAmount, setOverrideAmount] = React.useState('');
  const [overrideCurrency, setOverrideCurrency] = React.useState<Currency>(primaryCurrency);
  const [meetingLink, setMeetingLink] = React.useState('');
  const [homework, setHomework] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [more, setMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selectStudent = React.useCallback(
    (id: string | null) => {
      setStudentId(id);
      const student = students.find((s) => s.id === id);
      if (student) {
        setDuration(String(student.ratePeriodMin));
        setOverrideCurrency(student.defaultCurrency);
      }
    },
    [students],
  );

  React.useEffect(() => {
    if (!open) return;
    const starts = defaultDate ?? new Date();
    setError(null);
    setMore(false);
    setDate(starts);
    setTime(starts);
    setDuration('60');
    setOverrideAmount('');
    setOverrideCurrency(primaryCurrency);
    setMeetingLink('');
    setHomework('');
    setNotes('');
    selectStudent(students.find((s) => !s.archivedAt)?.id ?? null);
  }, [open, defaultDate, students, primaryCurrency, selectStudent]);

  const submit = useMutation(
    async () => {
      setError(null);
      if (!studentId) return setError(t('Select student'));
      const payload: Record<string, unknown> = {
        studentId,
        startsAt: combineDateTime(date, time).toISOString(),
        durationMin: Number(duration) || 60,
        status: 'scheduled',
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
      await api.post('lessons', payload);
      onOpenChange(false);
      onSaved();
    },
    { onError: setError },
  );

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('New lesson')}
      footer={
        <Button onPress={() => void submit.run()} disabled={submit.pending}>
          {submit.pending ? <Spinner color="#fff" /> : <Text>{t('Save')}</Text>}
        </Button>
      }
    >
      <View className="gap-4">
        <Notice message={error} />
        <Field label={t('Student')}>
          <SelectField
            value={studentId}
            onValueChange={selectStudent}
            placeholder={t('Select student')}
            options={students
              .filter((s) => !s.archivedAt)
              .map((s) => ({ value: s.id, label: s.name }))}
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
        <Field label={t('Duration (min)')}>
          <Input value={duration} onChangeText={setDuration} keyboardType="number-pad" />
        </Field>
        <MoreSection open={more} onOpenChange={setMore}>
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
          <Field label={t('Meeting link')}>
            <Input value={meetingLink} onChangeText={setMeetingLink} autoCapitalize="none" />
          </Field>
          <Field label={t('Homework')}>
            <Textarea
              value={homework}
              onChangeText={setHomework}
              placeholder={t('Add homework…')}
            />
          </Field>
          <Field label={t('Notes')}>
            <Textarea value={notes} onChangeText={setNotes} placeholder={t('Add a note…')} />
          </Field>
        </MoreSection>
      </View>
    </FormSheet>
  );
}
