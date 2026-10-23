import * as React from 'react';
import { Linking, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { isNotPastDay } from '@tutor-finance/shared';
import { BookOpen, Clock, MoreHorizontal, RefreshCw, Video } from 'lucide-react-native';
import { StatusBadge } from '~/components/lessons/status-badge';
import { LessonStatusNote } from '~/components/lessons/lesson-status-note';
import { PrimaryActionButton, useLessonActions } from '~/components/lessons/lesson-actions';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { formatDate } from '~/lib/format';
import { useI18n } from '~/lib/i18n';
import type { Lesson } from '~/lib/types';

export function LessonCard({
  lesson: lessonProp,
  studentName,
  showDate,
  onChanged,
}: {
  lesson: Lesson;
  studentName: string;
  showDate?: boolean;
  onChanged?: () => void;
}) {
  const { t, locale } = useI18n();
  const [lesson, setLesson] = React.useState(lessonProp);
  React.useEffect(() => setLesson(lessonProp), [lessonProp]);

  const actions = useLessonActions({
    lesson,
    title: studentName,
    onChanged: (updated) => {
      if (updated) setLesson(updated);
      onChanged?.();
    },
  });

  const canJoin =
    actions.primary === 'complete' && !!lesson.meetingLink && isNotPastDay(lesson.startsAt);

  return (
    <Animated.View
      layout={LinearTransition.duration(200)}
      className="rounded-2xl border border-border bg-card p-4"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-medium" numberOfLines={1}>
            {studentName}
          </Text>
          <View className="mt-1 flex-row items-center gap-2">
            <Icon as={Clock} size={14} className="text-muted-foreground" />
            <Text className="text-xs text-muted-foreground">
              {formatDate(lesson.startsAt, 'HH:mm', locale)} · {lesson.durationMin} {t('min')}
              {showDate ? ` · ${formatDate(lesson.startsAt, 'd MMM', locale)}` : ''}
            </Text>
            {lesson.recurringLessonId ? (
              <Icon as={RefreshCw} size={12} className="text-primary/60" />
            ) : null}
          </View>
          <LessonStatusNote lesson={lesson} className="mt-1" />
          {lesson.homework ? (
            <View className="mt-1.5 flex-row items-start gap-1.5">
              <Icon as={BookOpen} size={12} className="mt-0.5 text-muted-foreground" />
              <Text className="flex-1 text-xs text-muted-foreground" numberOfLines={1}>
                {lesson.homework}
              </Text>
            </View>
          ) : null}
          {lesson.notes ? (
            <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={1}>
              {lesson.notes}
            </Text>
          ) : null}
        </View>

        <View className="shrink-0 flex-row items-start gap-1.5">
          <StatusBadge lesson={lesson} />
          <Pressable
            hitSlop={8}
            onPress={actions.openMenu}
            className="h-6 w-6 items-center justify-center rounded-full active:bg-accent"
          >
            <Icon as={MoreHorizontal} size={16} className="text-muted-foreground" />
          </Pressable>
        </View>
      </View>

      {actions.primary ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          className="mt-3 flex-row items-center gap-2 border-t border-border pt-3"
        >
          <PrimaryActionButton
            lesson={lesson}
            action={actions.primary}
            busy={actions.busy}
            onPress={actions.runPrimary}
            className="flex-1"
          />
          {canJoin ? (
            <Pressable
              onPress={() => void Linking.openURL(lesson.meetingLink!)}
              className="h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-primary/10 active:bg-primary/20"
            >
              <Icon as={Video} size={16} className="text-primary" />
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}

      {actions.elements}
    </Animated.View>
  );
}
