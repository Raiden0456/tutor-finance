import * as React from 'react';
import { View } from 'react-native';
import { NextLessonHero } from '~/components/dashboard/next-lesson-hero';
import { LessonCard } from '~/components/lessons/lesson-card';
import { StaggerItem } from '~/components/common/stagger';
import { Skeleton } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { intlLocale } from '~/lib/format';
import { capitalizeFirst, useI18n } from '~/lib/i18n';
import type { Lesson } from '~/lib/types';

export function TodaySection({
  loading,
  nextLesson,
  todayLessons,
  nameOf,
  onChanged,
}: {
  loading: boolean;
  nextLesson: Lesson | null;
  todayLessons: Lesson[];
  nameOf: (studentId: string) => string;
  onChanged: () => void;
}) {
  const { t, locale } = useI18n();
  const todayLabel = React.useMemo(
    () =>
      capitalizeFirst(
        new Intl.DateTimeFormat(intlLocale(locale), {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        }).format(new Date()),
      ),
    [locale],
  );

  return (
    <View className="gap-3">
      <View>
        <Text className="text-xl font-bold">{t('Today')}</Text>
        <Text className="mt-0.5 text-sm text-muted-foreground">{todayLabel}</Text>
      </View>

      {loading && !nextLesson && todayLessons.length === 0 ? (
        <Skeleton className="h-36 w-full rounded-3xl" />
      ) : (
        <NextLessonHero
          lesson={nextLesson}
          studentName={nextLesson ? nameOf(nextLesson.studentId) : ''}
        />
      )}

      {todayLessons.length > 0 ? (
        <View className="gap-2">
          {todayLessons.map((l, i) => (
            <StaggerItem key={l.id} index={i}>
              <LessonCard lesson={l} studentName={nameOf(l.studentId)} onChanged={onChanged} />
            </StaggerItem>
          ))}
        </View>
      ) : !loading ? (
        <View className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-6">
          <Text className="text-center text-sm text-muted-foreground">
            {t('No lessons today. Enjoy your day off!')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
