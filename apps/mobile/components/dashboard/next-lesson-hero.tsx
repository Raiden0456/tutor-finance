import * as React from 'react';
import { Linking, Pressable, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { PartyPopper, Video } from 'lucide-react-native';
import { GradientFill } from '~/components/common/gradient-fill';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { detectMeetingProvider } from '@tutor-finance/shared';
import { useI18n } from '~/lib/i18n';
import { intlLocale } from '~/lib/format';
import type { Lesson } from '~/lib/types';

const JOIN_OPEN_BEFORE_MS = 10 * 60 * 1000;

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function NextLessonHero({ lesson, studentName }: { lesson: Lesson | null; studentName: string }) {
  const { t, locale } = useI18n();
  const tag = intlLocale(locale);

  // Recompute countdown + join-window every 30s.
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(id);
  }, [lesson?.id]);

  const start = lesson ? new Date(lesson.startsAt) : null;
  const canJoin =
    !!lesson?.meetingLink &&
    !!start &&
    nowMs >= start.getTime() - JOIN_OPEN_BEFORE_MS &&
    nowMs <= start.getTime() + lesson.durationMin * 60_000;

  const join = useSharedValue(0);
  React.useEffect(() => {
    join.value = withTiming(canJoin ? 1 : 0, { duration: 400 });
  }, [canJoin, join]);
  const joinStyle = useAnimatedStyle(() => ({
    opacity: join.value,
    transform: [{ scale: 0.9 + 0.1 * join.value }],
  }));

  if (lesson && start) {
    const today = new Date(nowMs);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const label = isSameDay(start, today)
      ? t('Next session today')
      : isSameDay(start, tomorrow)
        ? t('Next session tomorrow')
        : t('Next session · {date}', {
            date: new Intl.DateTimeFormat(tag, { weekday: 'short', month: 'short', day: 'numeric' }).format(start),
          });

    const time = new Intl.DateTimeFormat(tag, { hour: 'numeric', minute: '2-digit' }).format(start);
    const provider = lesson.meetingLink ? detectMeetingProvider(lesson.meetingLink) : null;

    return (
      <View className="overflow-hidden rounded-3xl">
        <GradientFill id="heroNext" from="#3d3a9e" to="#5b6ef5" />
        <Animated.View key={lesson.id} entering={FadeInDown.duration(500)} className="gap-1 p-5">
          <Text className="text-sm font-medium text-white/70">{label}</Text>

          <View className="flex-row items-baseline gap-3">
            <Text className="text-5xl font-bold text-white" style={{ fontVariant: ['tabular-nums'] }}>
              {time}
            </Text>
            <View className="rounded-full bg-white/20 px-3 py-1">
              <Text className="text-sm font-medium text-white">
                {lesson.durationMin} {t('min')}
              </Text>
            </View>
          </View>

          <Text className="mt-2 text-xl font-semibold text-white">{studentName}</Text>

          <View className="mt-1 flex-row items-center justify-between gap-3">
            <Text className="text-sm text-white/60">{formatCountdown(start.getTime() - nowMs, t)}</Text>
            <Animated.View style={joinStyle} pointerEvents={canJoin ? 'auto' : 'none'}>
              <Pressable
                onPress={() => lesson.meetingLink && Linking.openURL(lesson.meetingLink)}
                className="flex-row items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 active:opacity-80"
              >
                <Icon as={Video} size={16} className="text-white" />
                <Text className="text-sm font-semibold text-white">{provider ?? t('Join')}</Text>
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    );
  }

  // Empty (no lesson this week) — green gradient.
  return (
    <View className="overflow-hidden rounded-3xl">
      <GradientFill id="heroEmpty" from="#15803d" to="#22c55e" />
      <Animated.View key="empty" entering={FadeInDown.duration(500)} className="flex-row items-start gap-3 p-5">
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
          <Icon as={PartyPopper} size={20} className="text-white" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-medium text-white/80">{t('All clear')}</Text>
          <Text className="mt-0.5 text-xl font-semibold leading-tight text-white">
            {t('Nothing on schedule this week')}
          </Text>
          <Text className="mt-1 text-sm text-white/70">{t('The week is clear. Enjoy the time off!')}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

function formatCountdown(diffMs: number, t: (k: string, p?: Record<string, string | number>) => string): string {
  if (diffMs <= 0) return t('now');
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return t('in {time}', { time: `${mins}${t('m')}` });
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    const m = mins % 60;
    return t('in {time}', { time: m > 0 ? `${hours}${t('h')} ${m}${t('m')}` : `${hours}${t('h')}` });
  }
  return t('in {time}', { time: `${Math.floor(hours / 24)}${t('d')}` });
}
