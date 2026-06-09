import { View } from 'react-native';
import { StatusBadge } from '~/components/lessons/status-badge';
import { Text } from '~/components/ui/text';
import { formatDate } from '~/lib/format';
import { useI18n } from '~/lib/i18n';
import type { Lesson } from '~/lib/types';

/** Compact row for already-processed lessons (paid / cancelled / no-show) — mirrors the web dashboard. */
export function ProcessedLessonRow({ lesson, studentName }: { lesson: Lesson; studentName: string }) {
  const { t, locale } = useI18n();
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-medium" numberOfLines={1}>
          {studentName}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {formatDate(lesson.startsAt, 'HH:mm', locale)} · {lesson.durationMin} {t('min')}
        </Text>
      </View>
      <StatusBadge status={lesson.status} />
    </View>
  );
}
