import * as React from 'react';
import { View } from 'react-native';
import { combineDateTime } from '@tutor-finance/shared';
import { FormSheet } from '~/components/common/form-sheet';
import { Field } from '~/components/common/field';
import { DateTimeField } from '~/components/common/date-time-field';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { useI18n } from '~/lib/i18n';
import type { Lesson } from '~/lib/types';
import type { LessonPatch } from './types';

export function RescheduleSheet({
  open,
  onOpenChange,
  lesson,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lesson: Lesson;
  onSubmit: LessonPatch;
}) {
  const { t } = useI18n();
  const [date, setDate] = React.useState(new Date(lesson.startsAt));
  const [time, setTime] = React.useState(new Date(lesson.startsAt));
  const [duration, setDuration] = React.useState(String(lesson.durationMin));
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setDate(new Date(lesson.startsAt));
    setTime(new Date(lesson.startsAt));
    setDuration(String(lesson.durationMin));
  }, [open, lesson]);

  const submit = async () => {
    setSaving(true);
    try {
      const ok = await onSubmit({
        startsAt: combineDateTime(date, time).toISOString(),
        durationMin: Number(duration) || 60,
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
      title={t('Reschedule lesson')}
      footer={
        <Button onPress={submit} disabled={saving}>
          {saving ? <Spinner color="#fff" /> : <Text>{t('Save')}</Text>}
        </Button>
      }
    >
      <View className="gap-4">
        <Field label={t('New date & time')}>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <DateTimeField mode="date" value={date} onChange={setDate} />
            </View>
            <View className="w-28">
              <DateTimeField mode="time" value={time} onChange={setTime} />
            </View>
          </View>
        </Field>
        <Field label={t('Duration (min)')}>
          <Input value={duration} onChangeText={setDuration} keyboardType="number-pad" />
        </Field>
      </View>
    </FormSheet>
  );
}
