import * as React from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { StatusBadge } from '~/components/status-badge';
import { formatDate, money } from '~/lib/format';
import { useI18n } from '~/lib/i18n';
import type { Lesson } from '~/lib/types';

export function LessonCard({
  lesson,
  studentName,
  onPress,
  showDate,
}: {
  lesson: Lesson;
  studentName: string;
  onPress?: () => void;
  showDate?: boolean;
}) {
  const { t, locale } = useI18n();
  const price = lesson.effectivePrice;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 active:opacity-80"
    >
      <View className="w-14 items-center">
        <Text className="text-base font-semibold">{formatDate(lesson.startsAt, 'HH:mm', locale)}</Text>
        <Text className="text-[11px] text-muted-foreground">
          {lesson.durationMin} {t('min')}
        </Text>
      </View>

      <View className="h-10 w-px bg-border" />

      <View className="flex-1 gap-1">
        <Text className="font-medium" numberOfLines={1}>
          {studentName}
        </Text>
        <View className="flex-row items-center gap-2">
          <StatusBadge status={lesson.status} />
          {showDate ? (
            <Text className="text-[11px] text-muted-foreground">
              {formatDate(lesson.startsAt, 'd MMM', locale)}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="items-end gap-0.5">
        {lesson.isPackageCovered ? (
          <Text className="text-[11px] text-muted-foreground">{t('Included in package')}</Text>
        ) : price ? (
          <Text className="font-semibold">{money(price.amount, price.currency, locale)}</Text>
        ) : null}
      </View>
      {onPress ? <Icon as={ChevronRight} size={18} className="text-muted-foreground" /> : null}
    </Pressable>
  );
}
