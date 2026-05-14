import { cn } from '@/lib/utils';
import { PartyPopper } from 'lucide-react';
import type { RecentLesson } from '@/lib/types';

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

function formatCountdown(startsAt: Date): string {
  const diffMs = startsAt.getTime() - Date.now();
  if (diffMs <= 0) return 'now';
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `in ${diffMins}m`;
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  if (h < 24) return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
  return `in ${Math.floor(h / 24)}d`;
}

function formatNextLessonLabel(startsAt: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const ld = new Date(startsAt.getFullYear(), startsAt.getMonth(), startsAt.getDate());
  if (ld.getTime() === today.getTime()) return 'Next session today';
  if (ld.getTime() === tomorrow.getTime()) return 'Next session tomorrow';
  return `Next session · ${dateFmt.format(startsAt)}`;
}

export function NextLessonHero({
  lesson,
  studentNames,
}: {
  lesson: RecentLesson | null;
  studentNames: Record<string, string>;
}) {
  const hasLesson = !!lesson;
  const startsAt = lesson ? new Date(lesson.startsAt) : null;

  return (
    <div className="relative isolate overflow-hidden rounded-3xl text-white">
      {/* Background layers — crossfade between states */}
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 transition-opacity duration-700 ease-in-out',
          hasLesson ? 'opacity-100' : 'opacity-0',
        )}
        style={{ background: 'linear-gradient(135deg, #3d3a9e 0%, #5b6ef5 100%)' }}
      />
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 transition-opacity duration-700 ease-in-out',
          hasLesson ? 'opacity-0' : 'opacity-100',
        )}
        style={{ background: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)' }}
      />

      {/* Content — keyed so it fades+slides in on state swap */}
      <div
        key={hasLesson ? `lesson-${lesson!.id}` : 'empty'}
        className="animate-in fade-in slide-in-from-bottom-2 relative p-5 duration-500"
      >
        {hasLesson && startsAt ? (
          <>
            <p className="text-sm font-medium text-white/70">{formatNextLessonLabel(startsAt)}</p>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-5xl font-bold tabular-nums leading-none">
                {timeFmt.format(startsAt)}
              </span>
              <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium">
                {lesson!.durationMin} min
              </span>
            </div>
            <p className="mt-3 text-xl font-semibold">
              {studentNames[lesson!.studentId] ?? lesson!.studentId}
            </p>
            <p className="mt-0.5 text-sm text-white/60">{formatCountdown(startsAt)}</p>
          </>
        ) : (
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <PartyPopper className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/80">All clear</p>
              <p className="mt-0.5 text-xl font-semibold leading-tight">
                Nothing on schedule this week
              </p>
              <p className="mt-1 text-sm text-white/70">The week is clear. Enjoy the time off!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
