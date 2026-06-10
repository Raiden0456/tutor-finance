import * as React from 'react';
import { Pressable, View } from 'react-native';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import type { WeekStartsOn } from '@tutor-finance/shared';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { capitalizeFirst, getDateFnsLocale, useI18n, type Locale } from '~/lib/i18n';
import { cn } from '~/lib/utils';

function dayKey(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

/** Custom month grid — mirrors the web lessons calendar (calendar/month-grid.tsx). */
export function MonthGrid({
  selected,
  rangeEnd,
  rangeMode,
  daysWithLessons,
  weekStartsOn,
  onSelect,
  onMonthChange,
}: {
  selected: Date;
  rangeEnd: Date | null;
  rangeMode: boolean;
  daysWithLessons: Set<string>;
  weekStartsOn: WeekStartsOn;
  onSelect: (day: Date) => void;
  onMonthChange?: (month: Date) => void;
}) {
  const { locale } = useI18n();
  const dateLocale = getDateFnsLocale(locale as Locale);
  const [viewMonth, setViewMonth] = React.useState(() => startOfMonth(selected));

  React.useEffect(() => {
    setViewMonth((prev) => (isSameMonth(prev, selected) ? prev : startOfMonth(selected)));
  }, [selected]);

  const changeMonth = (delta: number) => {
    const next = delta > 0 ? addMonths(viewMonth, 1) : subMonths(viewMonth, 1);
    setViewMonth(next);
    onMonthChange?.(next);
  };

  const gridStart = startOfWeek(viewMonth, { weekStartsOn });
  const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const effectiveEnd = rangeMode && rangeEnd ? rangeEnd : null;

  return (
    <View className="rounded-2xl border border-border/50 bg-card p-3">
      {/* Month nav */}
      <View className="mb-2.5 flex-row items-center justify-between">
        <Pressable
          onPress={() => changeMonth(-1)}
          hitSlop={8}
          className="h-7 w-7 items-center justify-center rounded-xl active:bg-accent"
        >
          <Icon as={ChevronLeft} size={16} className="text-muted-foreground" />
        </Pressable>
        <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {capitalizeFirst(format(viewMonth, 'LLLL yyyy', { locale: dateLocale }))}
        </Text>
        <Pressable
          onPress={() => changeMonth(1)}
          hitSlop={8}
          className="h-7 w-7 items-center justify-center rounded-xl active:bg-accent"
        >
          <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
        </Pressable>
      </View>

      {/* Weekday headers */}
      <View className="mb-1 flex-row">
        {days.slice(0, 7).map((d, i) => (
          <Text
            key={i}
            className="flex-1 py-0.5 text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60"
          >
            {format(d, 'EEEEE', { locale: dateLocale })}
          </Text>
        ))}
      </View>

      {/* Day cells */}
      {weeks.map((week, wi) => (
        <View key={wi} className="flex-row">
          {week.map((day) => {
            const key = dayKey(day);
            const isStart = isSameDay(day, selected);
            const isEnd = !!effectiveEnd && isSameDay(day, effectiveEnd);
            const hasRange = !!effectiveEnd && !isSameDay(selected, effectiveEnd);
            const isInRange = hasRange && day > selected && day < effectiveEnd!;
            const showRight = hasRange && (isStart || isInRange) && !isEnd;
            const showLeft = hasRange && (isEnd || isInRange) && !isStart;
            const isActive = isStart || isEnd;
            const isTodayDay = isToday(day);
            const hasLesson = daysWithLessons.has(key);
            const inMonth = isSameMonth(day, viewMonth);

            return (
              <View
                key={key}
                className={cn(
                  'relative flex-1 items-center justify-center py-[3px]',
                  !inMonth && 'opacity-20',
                )}
              >
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
                    'h-8 w-8 items-center justify-center gap-px rounded-full active:opacity-70',
                    isActive && 'bg-primary',
                    !isActive && isTodayDay && 'border border-primary/40',
                  )}
                >
                  <Text
                    className={cn(
                      'text-sm leading-none',
                      isActive
                        ? 'text-primary-foreground'
                        : isTodayDay
                          ? 'font-bold text-primary'
                          : 'text-foreground',
                    )}
                  >
                    {format(day, 'd')}
                  </Text>
                  <View
                    className={cn(
                      'h-[3px] w-3 rounded-full',
                      hasLesson
                        ? isActive
                          ? 'bg-primary-foreground opacity-60'
                          : 'bg-primary opacity-40'
                        : 'opacity-0',
                    )}
                  />
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
