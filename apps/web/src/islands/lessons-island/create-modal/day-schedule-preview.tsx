import { format } from 'date-fns';
import type { Lesson } from '@/lib/types';

export function DaySchedulePreview({
  lessons,
  studentMap,
}: {
  lessons: Lesson[];
  studentMap: Map<string, string>;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
      <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Schedule for this day</p>
      <ul className="divide-y divide-border/40">
        {lessons.map((l) => (
          <li key={l.id} className="flex items-center gap-2 py-1.5 text-xs">
            <span className="w-10 shrink-0 tabular-nums font-medium">
              {format(new Date(l.startsAt), 'HH:mm')}
            </span>
            <span className="flex-1 truncate text-foreground/80">
              {studentMap.get(l.studentId) ?? l.studentId}
            </span>
            <span className="shrink-0 text-muted-foreground">{l.durationMin}m</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
