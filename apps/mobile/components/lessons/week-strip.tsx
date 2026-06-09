import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { addDays, format, isSameDay } from 'date-fns';
import { Text } from '~/components/ui/text';
import { getDateFnsLocale, useI18n } from '~/lib/i18n';
import { cn } from '~/lib/utils';

export function WeekStrip({
  weekStart,
  selected,
  rangeEnd,
  daysWithLessons,
  onSelect,
  onSwipe,
}: {
  weekStart: Date;
  selected: Date;
  rangeEnd: Date | null;
  daysWithLessons: Set<string>;
  onSelect: (day: Date) => void;
  onSwipe: (dir: 'prev' | 'next') => void;
}) {
  const { locale } = useI18n();
  const dfLocale = getDateFnsLocale(locale);
  const today = new Date();

  const swipe = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((e) => {
      if (e.translationX < -48) runOnJS(onSwipe)('next');
      else if (e.translationX > 48) runOnJS(onSwipe)('prev');
    });

  const end = rangeEnd ?? selected;

  return (
    <GestureDetector gesture={swipe}>
      <View className="rounded-2xl border border-border/50 bg-card px-1 py-1.5">
        <View className="flex-row">
          {Array.from({ length: 7 }).map((_, i) => {
            const day = addDays(weekStart, i);
            const key = format(day, 'yyyy-MM-dd');
            const isStart = isSameDay(day, selected);
            const isEnd = rangeEnd ? isSameDay(day, rangeEnd) : false;
            const isActive = isStart || isEnd;
            const inRange =
              rangeEnd && day.getTime() > selected.getTime() && day.getTime() < end.getTime();
            const isTodayCell = isSameDay(day, today);
            const hasLesson = daysWithLessons.has(key);

            return (
              <View key={key} className="flex-1 items-center py-0.5">
                {inRange ? (
                  <View className="absolute inset-x-0 top-1 bottom-1 bg-primary/10" />
                ) : null}
                <Pressable
                  onPress={() => onSelect(day)}
                  className={cn(
                    'h-9 w-9 items-center justify-center gap-px rounded-full active:opacity-80',
                    isActive && 'bg-primary',
                    !isActive && isTodayCell && 'border border-primary/50',
                  )}
                >
                  <Text
                    className={cn(
                      'text-[9px] uppercase leading-none',
                      isActive ? 'text-primary-foreground/70' : 'text-muted-foreground',
                    )}
                  >
                    {format(day, 'EEEEE', { locale: dfLocale })}
                  </Text>
                  <Text
                    className={cn(
                      'text-[13px] font-medium leading-none',
                      isActive
                        ? 'text-primary-foreground'
                        : isTodayCell
                          ? 'font-bold text-primary'
                          : 'text-foreground',
                    )}
                  >
                    {format(day, 'd')}
                  </Text>
                  <View
                    className={cn(
                      'h-[3px] w-[3px] rounded-full',
                      hasLesson
                        ? isActive
                          ? 'bg-primary-foreground opacity-60'
                          : 'bg-primary opacity-60'
                        : 'opacity-0',
                    )}
                  />
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
    </GestureDetector>
  );
}
