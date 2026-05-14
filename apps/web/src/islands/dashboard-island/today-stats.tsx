import React from 'react';
import type { RecentLesson } from '@/lib/types';
import { statusLabel, statusStyles } from '@/lib/utils';

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

export function MiniStat({
  value,
  label,
  color,
  bg,
  icon: Icon,
}: {
  value: string;
  label: string;
  color: string;
  bg: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className={'mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl ' + bg}>
        <Icon className={'h-4 w-4 ' + color} />
      </div>
      <div className={'text-2xl font-bold tabular-nums ' + color}>{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export function SectionHeader({ dot, label, count }: { dot: string; label: string; count: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={'h-2 w-2 rounded-full ' + dot} />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground">
        {count} {count === 1 ? 'item' : 'items'}
      </span>
    </div>
  );
}

export function ProcessedLessonRow({
  lesson,
  studentName,
}: {
  lesson: RecentLesson;
  studentName: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{studentName}</div>
        <div className="text-xs text-muted-foreground">
          {timeFmt.format(new Date(lesson.startsAt))} · {lesson.durationMin} min
        </div>
      </div>
      <span
        className={
          'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ' +
          (statusStyles[lesson.status] ?? 'bg-muted text-muted-foreground')
        }
      >
        {statusLabel[lesson.status]}
      </span>
    </div>
  );
}
