import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { addDays, format, isSameDay } from 'date-fns';
import { Text } from '~/components/ui/text';
import { getDateFnsLocale, useI18n } from '~/lib/i18n';
import { cn } from '~/lib/utils';

/** Week day selector — mirrors the web lessons calendar (calendar/week-strip.tsx). */
export function WeekStrip({
  weekStart,
  selected,
  rangeEnd,
  daysWithLessons,
  monthExpanded,
  onSelect,
  onSwipe,
  onToggleMonth,
}: {
  weekStart: Date;
  selected: Date;
  rangeEnd: Date | null;
  daysWithLessons: Set<string>;
  monthExpanded?: boolean;
  onSelect: (day: Date) => void;
  onSwipe: (dir: 'prev' | 'next') => void;
  onToggleMonth?: () => void;
}) {
  const { locale } = useI18n();
  const dfLocale = getDateFnsLocale(locale);
  const today = new Date();

  const swipe = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .activeOffsetY([-20, 20])
    .onEnd((e) => {
      // Vertical swipe expands/collapses the month grid (like the web strip);
      // horizontal swipe navigates weeks.
      if (Math.abs(e.translationY) > Math.abs(e.translationX)) {
        if (!onToggleMonth) return;
        if (e.translationY > 28 && !monthExpanded) scheduleOnRN(onToggleMonth);
        else if (e.translationY < -28 && monthExpanded) scheduleOnRN(onToggleMonth);
      } else if (e.translationX < -48) {
        scheduleOnRN(onSwipe, 'next');
      } else if (e.translationX > 48) {
        scheduleOnRN(onSwipe, 'prev');
      }
    });

  const effectiveEnd = rangeEnd;

  return (
    <GestureDetector gesture={swipe}>
      <View className="rounded-2xl border border-border/50 bg-card px-1 py-1.5">
        <View className="flex-row">
          {Array.from({ length: 7 }).map((_, i) => {
            const day = addDays(weekStart, i);
            const key = format(day, 'yyyy-MM-dd');
            const isStart = isSameDay(day, selected);
            const isEnd = !!effectiveEnd && isSameDay(day, effectiveEnd);
            const hasRange = !!effectiveEnd && !isSameDay(selected, effectiveEnd);
            const isInRange = hasRange && day > selected && day < effectiveEnd!;
            const showRight = hasRange && (isStart || isInRange) && !isEnd;
            const showLeft = hasRange && (isEnd || isInRange) && !isStart;
            const isActive = isStart || isEnd;
            const isTodayCell = isSameDay(day, today);
            const hasLesson = daysWithLessons.has(key);

            return (
              <View key={key} className="relative flex-1 items-center justify-center py-0.5">
                {/* Range bridges */}
                {showRight ? (
                  <View className="absolute bottom-1 left-1/2 right-0 top-1 bg-primary/10" />
                ) : null}
                {showLeft ? (
                  <View className="absolute bottom-1 left-0 right-1/2 top-1 bg-primary/10" />
                ) : null}
                {isInRange ? (
                  <View className="absolute inset-x-0 bottom-1 top-1 bg-primary/10" />
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
                          : 'bg-primary opacity-50'
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
