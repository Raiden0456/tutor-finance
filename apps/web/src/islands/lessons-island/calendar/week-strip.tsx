import { useMemo, useRef } from 'react';
import { addDays, format, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { type SelectionMode, dayKey } from '../shared';

export function WeekStrip({
  weekViewStart,
  rangeStart,
  rangeEnd,
  selectionMode,
  daysWithLessons,
  monthExpanded,
  onSelect,
  onToggleMonth,
  onWeekNav,
}: {
  weekViewStart: Date;
  rangeStart: Date;
  rangeEnd: Date | null;
  selectionMode: SelectionMode;
  daysWithLessons: Set<string>;
  monthExpanded: boolean;
  onSelect: (day: Date) => void;
  onToggleMonth: () => void;
  onWeekNav: (dir: 'prev' | 'next') => void;
}) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekViewStart, i)),
    [weekViewStart],
  );

  const effectiveEnd = selectionMode === 'range' && rangeEnd ? rangeEnd : null;
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      className="rounded-2xl border border-border/50 bg-card px-1 py-1.5 shadow-sm"
      onTouchStart={(e) => {
        touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        if (!touchRef.current) return;
        const dx = e.changedTouches[0].clientX - touchRef.current.x;
        const dy = e.changedTouches[0].clientY - touchRef.current.y;
        touchRef.current = null;
        if (Math.abs(dy) > Math.abs(dx)) {
          if (dy > 28 && !monthExpanded) onToggleMonth();
          else if (dy < -28 && monthExpanded) onToggleMonth();
        } else if (Math.abs(dx) > 48) {
          onWeekNav(dx < 0 ? 'next' : 'prev');
        }
      }}
    >
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

          return (
            <div key={key} className="relative flex items-center justify-center py-0.5">
              {/* Range bridge */}
              {showRight && (
                <div className="absolute top-1/2 left-1/2 right-0 h-9 -translate-y-1/2 bg-primary/12 rounded-none" />
              )}
              {showLeft && (
                <div className="absolute top-1/2 left-0 right-1/2 h-9 -translate-y-1/2 bg-primary/12 rounded-none" />
              )}
              {isInRange && (
                <div className="absolute top-1/2 inset-x-0 h-9 -translate-y-1/2 bg-primary/12" />
              )}

              <button
                onClick={() => onSelect(day)}
                className={cn(
                  'relative z-10 flex h-9 w-9 flex-col items-center justify-center gap-px rounded-full transition-all duration-200',
                  isActive && 'bg-primary text-primary-foreground shadow-sm',
                  !isActive && isTodayDay && 'ring-1 ring-primary/50',
                  !isActive && 'hover:bg-accent/60 active:scale-95',
                )}
              >
                <span
                  className={cn(
                    'text-[9px] uppercase leading-none tracking-widest',
                    isActive ? 'opacity-60' : 'text-muted-foreground',
                  )}
                >
                  {format(day, 'EEE').charAt(0)}
                </span>
                <span
                  className={cn(
                    'text-[13px] font-medium leading-none',
                    !isActive && isTodayDay && 'font-bold text-primary',
                  )}
                >
                  {format(day, 'd')}
                </span>
                <div
                  className={cn(
                    'h-[3px] w-[3px] rounded-full transition-opacity duration-200',
                    hasLesson
                      ? isActive
                        ? 'bg-primary-foreground opacity-60'
                        : 'bg-primary opacity-50'
                      : 'opacity-0',
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
