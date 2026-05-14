import { useEffect, useState } from 'react';
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
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type SelectionMode, dayKey, monthKey, WEEK_START } from '../shared';

export function MonthGrid({
  rangeStart,
  rangeEnd,
  selectionMode,
  daysWithLessons,
  onSelect,
  onMonthChange,
}: {
  rangeStart: Date;
  rangeEnd: Date | null;
  selectionMode: SelectionMode;
  daysWithLessons: Set<string>;
  onSelect: (day: Date) => void;
  onMonthChange: (date: Date) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(rangeStart));
  const selMonthKey = monthKey(rangeStart);

  useEffect(() => {
    if (!isSameMonth(viewMonth, rangeStart)) setViewMonth(startOfMonth(rangeStart));
  }, [selMonthKey]);

  function changeMonth(delta: number) {
    const next = delta > 0 ? addMonths(viewMonth, 1) : subMonths(viewMonth, 1);
    setViewMonth(next);
    onMonthChange(next);
  }

  const gridStart = startOfWeek(viewMonth, WEEK_START);
  const gridEnd = endOfWeek(endOfMonth(viewMonth), WEEK_START);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const vmKey = monthKey(viewMonth);
  const effectiveEnd = selectionMode === 'range' && rangeEnd ? rangeEnd : null;

  return (
    <div className="mt-1.5 rounded-2xl border border-border/50 bg-card p-3 shadow-sm">
      {/* Month nav */}
      <div className="mb-2.5 flex items-center justify-between">
        <button
          onClick={() => changeMonth(-1)}
          className="flex h-7 w-7 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:opacity-70"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => changeMonth(1)}
          className="flex h-7 w-7 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:opacity-70"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div
            key={i}
            className="py-0.5 text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = dayKey(day);
          const isStart = isSameDay(day, rangeStart);
          const isEnd = !!effectiveEnd && isSameDay(day, effectiveEnd);
          const hasRange = !!effectiveEnd && !isSameDay(rangeStart, effectiveEnd);
          const isInRange = hasRange && day > rangeStart && day < effectiveEnd!;
          const showRight = hasRange && (isStart || isInRange) && !isEnd;
          const showLeft = hasRange && (isEnd || isInRange) && !isStart;
          const isActive = isStart || isEnd;
          const isTodayDay = isToday(day);
          const hasLesson = daysWithLessons.has(key);
          const inMonth = monthKey(day) === vmKey;

          return (
            <div
              key={key}
              className={cn(
                'relative flex items-center justify-center py-[3px]',
                !inMonth && 'opacity-20',
              )}
            >
              {showRight && (
                <div className="absolute top-1/2 left-1/2 right-0 h-8 -translate-y-1/2 bg-primary/12" />
              )}
              {showLeft && (
                <div className="absolute top-1/2 left-0 right-1/2 h-8 -translate-y-1/2 bg-primary/12" />
              )}
              {isInRange && (
                <div className="absolute top-1/2 inset-x-0 h-8 -translate-y-1/2 bg-primary/12" />
              )}

              <button
                onClick={() => onSelect(day)}
                className={cn(
                  'relative z-10 flex h-8 w-8 flex-col items-center justify-center gap-px rounded-full text-sm transition-all duration-150',
                  isActive && 'bg-primary text-primary-foreground shadow-sm',
                  !isActive && isTodayDay && 'font-bold text-primary ring-1 ring-primary/40',
                  !isActive && !isInRange && 'hover:bg-accent/60 active:scale-95',
                )}
              >
                <span className="leading-none">{format(day, 'd')}</span>
                <div
                  className={cn(
                    'h-[3px] w-3 rounded-full',
                    hasLesson
                      ? isActive
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
