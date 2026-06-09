import * as React from 'react';
import { Pressable, View } from 'react-native';
import { type LessonFrequency } from '@tutor-finance/shared';
import { FormSheet } from '~/components/common/form-sheet';
import { Field } from '~/components/common/field';
import { SelectField } from '~/components/common/select-field';
import { Segmented } from '~/components/common/segmented';
import { DateTimeField } from '~/components/common/date-time-field';
import { Notice } from '~/components/common/notice';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { useI18n } from '~/lib/i18n';
import type { RecurringLesson, Student } from '~/lib/types';
import { cn } from '~/lib/utils';

// Server day indices: 0 = Sunday … 6 = Saturday. Display Mon-first.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function RecurringLessonForm({
  open,
  onOpenChange,
  schedule,
  students,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: RecurringLesson | null;
  students: Student[];
  onSaved: () => void;
}) {
  const { t } = useI18n();

  const [studentId, setStudentId] = React.useState<string | null>(null);
  const [days, setDays] = React.useState<number[]>([]);
  const [time, setTime] = React.useState(new Date());
  const [duration, setDuration] = React.useState('60');
  const [frequency, setFrequency] = React.useState<LessonFrequency>('weekly');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setStudentId(schedule?.studentId ?? students[0]?.id ?? null);
    setDays(schedule?.daysOfWeek ?? []);
    if (schedule?.startTime) {
      const [h, m] = schedule.startTime.split(':').map(Number);
      const d = new Date();
      d.setHours(h ?? 9, m ?? 0, 0, 0);
      setTime(d);
    } else {
      const d = new Date();
      d.setHours(9, 0, 0, 0);
      setTime(d);
    }
    setDuration(schedule ? String(schedule.durationMin) : '60');
    setFrequency(schedule?.frequency ?? 'weekly');
  }, [open, schedule, students]);

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const submit = async () => {
    setError(null);
    if (!studentId) return setError(t('Select student'));
    if (days.length === 0) return setError(t('Days of week'));
    setSaving(true);
    try {
      const payload = {
        studentId,
        daysOfWeek: [...days].sort((a, b) => a - b),
        startTime: `${pad(time.getHours())}:${pad(time.getMinutes())}`,
        durationMin: Number(duration) || 60,
        frequency,
      };
      if (schedule) await api.patch(`recurring-lessons/${schedule.id}`, payload);
      else await api.post('recurring-lessons', payload);
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
      title={schedule ? t('Edit schedule') : t('New schedule')}
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

        <Field label={t('Days of week')}>
          <View className="flex-row flex-wrap gap-2">
            {DAY_ORDER.map((d) => {
              const active = days.includes(d);
              return (
                <Pressable
                  key={d}
                  onPress={() => toggleDay(d)}
                  className={cn(
                    'h-10 w-11 items-center justify-center rounded-lg border',
                    active ? 'border-primary bg-primary' : 'border-border bg-background',
                  )}
                >
                  <Text className={cn('text-xs font-medium', active ? 'text-primary-foreground' : 'text-foreground')}>
                    {t(DAY_NAMES[d]!).slice(0, 2)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label={t('Start time')}>
              <DateTimeField mode="time" value={time} onChange={setTime} />
            </Field>
          </View>
          <View className="flex-1">
            <Field label={t('Duration (min)')}>
              <Input value={duration} onChangeText={setDuration} keyboardType="number-pad" />
            </Field>
          </View>
        </View>

        <Field label={t('Frequency')}>
          <Segmented<LessonFrequency>
            value={frequency}
            onChange={setFrequency}
            options={[
              { value: 'weekly', label: t('Weekly') },
              { value: 'biweekly', label: t('Biweekly') },
            ]}
          />
        </Field>
      </View>
    </FormSheet>
  );
}
