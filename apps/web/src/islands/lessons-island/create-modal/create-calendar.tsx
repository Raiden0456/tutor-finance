import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  startOfDay,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { capitalizeFirst, getDateFnsLocale, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { WeekStartsOn } from '@tutor-finance/shared';
import { dayKey, monthKey, weekStartOptions } from '../shared';

export function CreateCalendar({
  selectedDate,
  viewMonth,
  daysWithLessons,
  onSelect,
  onMonthChange,
  weekStartsOn,
}: {
  selectedDate: Date;
  viewMonth: Date;
  daysWithLessons: Set<string>;
  onSelect: (d: Date) => void;
  onMonthChange: (d: Date) => void;
  weekStartsOn: WeekStartsOn;
}) {
  const { locale } = useI18n();
  const dateLocale = getDateFnsLocale(locale);
  const weekStart = weekStartOptions(weekStartsOn);
  const gridStart = startOfWeek(viewMonth, weekStart);
  const gridEnd = endOfWeek(endOfMonth(viewMonth), weekStart);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const vmKey = monthKey(viewMonth);

  return (
    <div className="rounded-xl border border-border/60 bg-card p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(subMonths(viewMonth, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:opacity-70"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs font-semibold tracking-wide text-muted-foreground">
          {capitalizeFirst(format(viewMonth, 'LLLL yyyy', { locale: dateLocale }))}
        </span>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(viewMonth, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:opacity-70"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mb-0.5 grid grid-cols-7">
        {days.slice(0, 7).map((d, i) => (
          <div
            key={i}
            className="py-0.5 text-center text-[9px] font-medium uppercase tracking-widest text-muted-foreground/50"
          >
            {format(d, 'EEEEE', { locale: dateLocale })}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = dayKey(day);
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDay = isToday(day);
          const hasLesson = daysWithLessons.has(key);
          const inMonth = monthKey(day) === vmKey;

          return (
            <div
              key={key}
              className={cn('flex items-center justify-center py-[3px]', !inMonth && 'opacity-25')}
            >
              <button
                type="button"
                onClick={() => onSelect(startOfDay(day))}
                className={cn(
                  'flex h-8 w-8 flex-col items-center justify-center gap-px rounded-full text-[13px] transition-all duration-150',
                  isSelected && 'bg-primary text-primary-foreground shadow-sm',
                  !isSelected && isTodayDay && 'font-bold text-primary ring-1 ring-primary/40',
                  !isSelected && 'hover:bg-accent/60 active:scale-95',
                )}
              >
                <span className="leading-none">{format(day, 'd')}</span>
                <div
                  className={cn(
                    'h-[3px] w-2.5 rounded-full',
                    hasLesson
                      ? isSelected
                        ? 'bg-primary-foreground opacity-60'
                        : 'bg-primary opacity-40'
                      : 'invisible',
                  )}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
