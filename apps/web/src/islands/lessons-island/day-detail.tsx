import { useMemo } from 'react';
import { format, isSameDay, isToday } from 'date-fns';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FadeSwap } from '@/components/ui/collapse';
import { LessonCard } from '@/components/lesson-card';
import type { Lesson } from '@/lib/types';
import { type SelectionMode, findOverlaps, dayKey } from './shared';

export function DayDetail({
  rangeStart,
  rangeEnd,
  selectionMode,
  lessons,
  studentMap,
  loading,
  onLessonChanged,
  onLog,
  hasStudents,
}: {
  rangeStart: Date;
  rangeEnd: Date | null;
  selectionMode: SelectionMode;
  lessons: Lesson[];
  studentMap: Map<string, string>;
  loading: boolean;
  onLessonChanged: () => Promise<void>;
  onLog: () => void;
  hasStudents: boolean;
}) {
  const effectiveEnd = selectionMode === 'range' && rangeEnd ? rangeEnd : rangeStart;
  const isRange = !isSameDay(rangeStart, effectiveEnd);
  const overlappingIds = useMemo(() => findOverlaps(lessons), [lessons]);

  const label = isRange
    ? `${format(rangeStart, 'd MMM')} – ${format(effectiveEnd, 'd MMM')}`
    : isToday(rangeStart)
      ? 'Today'
      : format(rangeStart, 'EEEE, d MMMM');

  const rangeKey = `${dayKey(rangeStart)}_${dayKey(effectiveEnd)}`;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 px-0.5">
        <span className="text-sm font-semibold">{label}</span>
        {lessons.length > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {lessons.length}
          </span>
        )}
        {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>

      <FadeSwap motionKey={rangeKey}>
        {lessons.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
            {!hasStudents ? (
              <span>Add a student first to log lessons.</span>
            ) : loading ? (
              <span>Loading…</span>
            ) : (
              <>
                <span>{isRange ? 'No lessons in this range.' : 'No lessons on this day.'}</span>
                <Button size="sm" variant="outline" onClick={onLog}>
                  <Plus className="h-4 w-4" />
                  Add lesson
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {lessons.map((l) => (
              <LessonCard
                key={l.id}
                lesson={l}
                studentName={studentMap.get(l.studentId) ?? l.studentId}
                overlapping={overlappingIds.has(l.id)}
                onChanged={onLessonChanged}
                onArchived={onLessonChanged}
                onDeleted={onLessonChanged}
              />
            ))}
          </div>
        )}
      </FadeSwap>
    </div>
  );
}
