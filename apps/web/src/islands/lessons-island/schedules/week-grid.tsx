import { addDays, differenceInWeeks, format, isToday, startOfWeek } from 'date-fns';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { RecurringLesson } from '@/lib/types';
import type { WeekStartsOn } from '@tutor-finance/shared';
import { capitalizeFirst, getDateFnsLocale, useI18n } from '@/lib/i18n';

const SLOT_PX = 48; // px per 30-min slot
const HOUR_PX = SLOT_PX * 2; // px per hour = 96
const MAX_HEIGHT = 400; // scrollable viewport height
const COL_W = 90; // min px width per day column
const OVERLAP_LANE_W = 104; // readable px width per overlapping lane
const TIME_W = 36; // px width of time axis

const BLOCK_COLORS = [
  'bg-blue-500/20 border-blue-500/40 text-blue-700 dark:text-blue-300',
  'bg-violet-500/20 border-violet-500/40 text-violet-700 dark:text-violet-300',
  'bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
  'bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-300',
  'bg-rose-500/20 border-rose-500/40 text-rose-700 dark:text-rose-300',
  'bg-cyan-500/20 border-cyan-500/40 text-cyan-700 dark:text-cyan-300',
  'bg-orange-500/20 border-orange-500/40 text-orange-700 dark:text-orange-300',
  'bg-pink-500/20 border-pink-500/40 text-pink-700 dark:text-pink-300',
];

function hashColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return BLOCK_COLORS[h % BLOCK_COLORS.length]!;
}

function parseTime(time: string): { h: number; m: number } {
  const [h, m] = time.split(':').map(Number);
  return { h: h!, m: m! };
}

function timeToMinutes(time: string): number {
  const { h, m } = parseTime(time);
  return h * 60 + m;
}

type PositionedSchedule = {
  schedule: RecurringLesson;
  lane: number;
  laneCount: number;
};

function layoutOverlappingSchedules(schedules: RecurringLesson[]): PositionedSchedule[] {
  const intervals = schedules
    .map((schedule) => {
      const start = timeToMinutes(schedule.startTime);
      return { schedule, start, end: start + schedule.durationMin };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const positioned: PositionedSchedule[] = [];
  let group: typeof intervals = [];
  let groupEnd = -1;

  function flushGroup() {
    if (group.length === 0) return;

    const laneEnds: number[] = [];
    const groupPositioned = group.map((item) => {
      let lane = laneEnds.findIndex((end) => end <= item.start);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = item.end;
      return { schedule: item.schedule, lane, laneCount: 1 };
    });

    const laneCount = Math.max(1, laneEnds.length);
    positioned.push(...groupPositioned.map((item) => ({ ...item, laneCount })));
    group = [];
    groupEnd = -1;
  }

  for (const item of intervals) {
    if (group.length > 0 && item.start >= groupEnd) flushGroup();
    group.push(item);
    groupEnd = Math.max(groupEnd, item.end);
  }
  flushGroup();

  return positioned;
}

function computeRange(schedules: RecurringLesson[]): { startHour: number; endHour: number } {
  if (schedules.length === 0) return { startHour: 9, endHour: 19 };
  let minMin = 23 * 60;
  let maxMin = 0;
  for (const s of schedules) {
    const { h, m } = parseTime(s.startTime);
    const start = h * 60 + m;
    const end = start + s.durationMin;
    if (start < minMin) minMin = start;
    if (end > maxMin) maxMin = end;
  }
  return {
    startHour: Math.max(0, Math.floor(minMin / 60) - 1),
    endHour: Math.min(23, Math.ceil(maxMin / 60) + 1),
  };
}

function occursInWeek(s: RecurringLesson, weekStart: Date, weekStartsOn: WeekStartsOn): boolean {
  const schedStart = new Date(s.startDate);
  const weekEnd = addDays(weekStart, 6);
  if (weekEnd < schedStart) return false;
  if (s.endDate && weekStart > new Date(s.endDate)) return false;
  if (s.frequency === 'weekly') return true;
  const schedStartWeek = startOfWeek(schedStart, { weekStartsOn });
  const diff = differenceInWeeks(weekStart, schedStartWeek);
  return diff >= 0 && diff % 2 === 0;
}

export function WeekGrid({
  schedules,
  studentMap,
  weekStartsOn,
  weekStart,
  onWeekNav,
  onEdit,
}: {
  schedules: RecurringLesson[];
  studentMap: Map<string, string>;
  weekStartsOn: WeekStartsOn;
  weekStart: Date;
  onWeekNav: (dir: 'prev' | 'next') => void;
  onEdit: (s: RecurringLesson) => void;
}) {
  const { locale } = useI18n();
  const dateLocale = getDateFnsLocale(locale);
  const orderedDays = Array.from({ length: 7 }, (_, i) => (i + weekStartsOn) % 7);
  // Map each DOW to its actual date this week
  const dowToDate = Object.fromEntries(orderedDays.map((dow, i) => [dow, addDays(weekStart, i)]));

  const { startHour, endHour } = computeRange(schedules);
  const totalHours = endHour - startHour;
  const gridHeight = totalHours * HOUR_PX;
  const hours = Array.from({ length: totalHours + 1 }, (_, i) => startHour + i);
  const weekEnd = addDays(weekStart, 6);

  function timeToTopPx(time: string): number {
    const { h, m } = parseTime(time);
    return (((h - startHour) * 60 + m) / 30) * SLOT_PX;
  }

  function durationToHeightPx(durationMin: number): number {
    return Math.max((durationMin / 30) * SLOT_PX, SLOT_PX / 2);
  }

  const dayLayouts = orderedDays.map((dow) => {
    const schedulesForDay = schedules.filter(
      (s) => s.daysOfWeek.includes(dow) && occursInWeek(s, weekStart, weekStartsOn),
    );
    const positioned = layoutOverlappingSchedules(schedulesForDay);
    const maxLaneCount = Math.max(1, ...positioned.map((item) => item.laneCount));
    return {
      dow,
      positioned,
      width: Math.max(COL_W, maxLaneCount * OVERLAP_LANE_W),
    };
  });

  const innerWidth = TIME_W + dayLayouts.reduce((sum, day) => sum + day.width, 0);

  return (
    <div className="rounded-2xl border border-border bg-card">
      {/* Week navigation — outside the scroll so it's always visible */}
      <div className="flex items-center justify-between border-b border-border px-2 py-1.5">
        <button
          type="button"
          onClick={() => onWeekNav('prev')}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground active:scale-90"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-medium text-muted-foreground">
          {format(weekStart, 'd', { locale: dateLocale })}
          {' – '}
          {format(weekEnd, 'd MMM yyyy', { locale: dateLocale })}
        </span>
        <button
          type="button"
          onClick={() => onWeekNav('next')}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground active:scale-90"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: innerWidth }}>
          {/* Day headers with actual dates */}
          <div className="sticky top-0 z-10 flex border-b border-border bg-card">
            <div className="flex-none" style={{ width: TIME_W }} />
            {dayLayouts.map(({ dow, width }) => {
              const date = dowToDate[dow]!;
              const todayCol = isToday(date);
              return (
                <div
                  key={dow}
                  className="flex-none border-l border-border/50 py-1.5 text-center transition-[width] duration-200 ease-in-out"
                  style={{ width }}
                >
                  <div
                    className={
                      'text-[10px] font-medium leading-tight ' +
                      (todayCol ? 'text-primary' : 'text-muted-foreground')
                    }
                  >
                    {capitalizeFirst(format(date, 'EEE', { locale: dateLocale }))}
                  </div>
                  <div
                    className={
                      'text-[11px] font-semibold leading-tight ' +
                      (todayCol ? 'text-primary' : 'text-muted-foreground/70')
                    }
                  >
                    {format(date, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto" style={{ maxHeight: MAX_HEIGHT }}>
            <div className="relative flex" style={{ height: gridHeight }}>
              {/* Time axis */}
              <div
                className="relative flex-none border-r border-border/30"
                style={{ width: TIME_W }}
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute right-1 text-[9px] leading-none text-muted-foreground/60"
                    style={{ top: (h - startHour) * HOUR_PX - 4 }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {dayLayouts.map(({ dow, positioned: positionedSchedules, width }) => {
                const todayCol = isToday(dowToDate[dow]!);
                return (
                  <div
                    key={dow}
                    className={
                      'relative flex-none border-l border-border/50 transition-[width] duration-200 ease-in-out' +
                      (todayCol ? ' bg-primary/[0.03]' : '')
                    }
                    style={{ width, height: '100%' }}
                  >
                    {/* Gridlines every 30 min */}
                    {Array.from({ length: totalHours * 2 + 1 }).map((_, i) => (
                      <div
                        key={i}
                        className={
                          'pointer-events-none absolute inset-x-0 border-t ' +
                          (i % 2 === 0 ? 'border-border/40' : 'border-border/15')
                        }
                        style={{ top: i * SLOT_PX }}
                      />
                    ))}

                    {/* Schedule blocks */}
                    {positionedSchedules.map(({ schedule: s, lane, laneCount }) => {
                      const topPx = timeToTopPx(s.startTime);
                      const heightPx = durationToHeightPx(s.durationMin);
                      const clamped = Math.min(heightPx, gridHeight - topPx);
                      if (topPx < 0 || topPx >= gridHeight) return null;

                      const widthPct = 100 / laneCount;
                      const leftPct = lane * widthPct;
                      const isOverlapping = laneCount > 1;

                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => onEdit(s)}
                          className={
                            'absolute overflow-hidden rounded-md border px-1 py-0.5 text-left transition-all duration-150 hover:opacity-75 ' +
                            (isOverlapping ? 'ring-1 ring-amber-500/60 ' : '') +
                            hashColor(s.studentId)
                          }
                          style={{
                            top: topPx,
                            height: clamped,
                            left: `calc(${leftPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                          }}
                        >
                          <div className="flex min-w-0 items-center gap-0.5 text-[10px] font-semibold leading-tight">
                            {isOverlapping && <AlertTriangle className="h-2.5 w-2.5 shrink-0" />}
                            <span className="truncate">{studentMap.get(s.studentId) ?? '—'}</span>
                          </div>
                          {clamped >= SLOT_PX && (
                            <div className="truncate text-[9px] leading-tight opacity-80">
                              {s.startTime}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
