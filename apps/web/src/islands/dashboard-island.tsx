import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { FinanceStat } from '@/components/finance-stat';
import { RangeTabs, resolveRange, inferRange, type RangeState } from '@/components/range-tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { fmtMoney } from '@/lib/format';
import { SUPPORTED_CURRENCIES, type Currency } from '@tutor-finance/shared';
import { statusLabel, statusStyles, cn } from '@/lib/utils';
import {
  Banknote,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  PartyPopper,
  Timer,
} from 'lucide-react';
import type { RecentLesson, Summary } from '@/lib/types';
import { LessonCard } from '@/components/lesson-card';

interface Props {
  summary: Summary;
  nextLesson: RecentLesson | null;
  todayLessons: RecentLesson[];
  studentNames: Record<string, string>;
}

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
const fullDateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
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

function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const EASE = [0.22, 1, 0.36, 1] as const;
const SECTION_DURATION = 0.55;
const SECTION_GAP = 0.1;

/**
 * Sequential section animation: when one section exits, the next waits for it
 * to finish before entering. AnimatePresence `initial={false}` skips the delay
 * on the very first paint.
 */
const sectionVariants: Variants = {
  initial: { opacity: 0, height: 0 },
  enter: {
    opacity: 1,
    height: 'auto',
    transition: {
      duration: SECTION_DURATION,
      delay: SECTION_DURATION + SECTION_GAP,
      ease: EASE,
      opacity: {
        duration: SECTION_DURATION,
        delay: SECTION_DURATION + SECTION_GAP,
      },
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: {
      duration: SECTION_DURATION,
      ease: EASE,
      opacity: { duration: SECTION_DURATION * 0.6 },
    },
  },
};

export function DashboardIsland({
  summary: initialSummary,
  nextLesson: initialNextLesson,
  todayLessons: initialTodayLessons,
  studentNames,
}: Props) {
  const [range, setRange] = useState<RangeState>(() =>
    inferRange(initialSummary.from, initialSummary.to),
  );
  const [currency, setCurrency] = useState<Currency>(initialSummary.targetCurrency);
  const [summary, setSummary] = useState(initialSummary);
  const [nextLesson, setNextLesson] = useState<RecentLesson | null>(initialNextLesson);
  const [todayLessons, setTodayLessons] = useState<RecentLesson[]>(initialTodayLessons);
  const [loading, setLoading] = useState(false);
  const isFirst = useRef(true);

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayEnd = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    let cancelled = false;
    const { from, to } = resolveRange(range);
    setLoading(true);
    api
      .get<Summary>('/dashboard/summary', {
        query: { from: from.toISOString(), to: to.toISOString(), target: currency },
      })
      .then((s) => {
        if (!cancelled) setSummary(s);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, currency]);

  const refreshToday = useCallback(async () => {
    const now = new Date();
    const [nextL, todayL] = await Promise.all([
      api.get<RecentLesson[]>('/lessons', {
        query: { status: 'scheduled', from: now.toISOString(), orderDir: 'asc', limit: 1 },
      }),
      api.get<RecentLesson[]>('/lessons', {
        query: {
          from: todayStart.toISOString(),
          to: todayEnd.toISOString(),
          orderDir: 'asc',
          limit: 20,
        },
      }),
    ]);
    setNextLesson(nextL[0] ?? null);
    setTodayLessons(todayL);
  }, [todayStart, todayEnd]);

  const pendingLessons = todayLessons.filter((l) => l.status === 'scheduled');
  const dueLessons = todayLessons.filter(
    (l) => l.status === 'due' || l.status === 'partially_paid' || l.status === 'completed', // treat old completed as payment pending
  );
  const processedLessons = todayLessons.filter(
    (l) =>
      l.status !== 'scheduled' &&
      l.status !== 'due' &&
      l.status !== 'partially_paid' &&
      l.status !== 'completed',
  );

  const totalTodayMin = todayLessons.reduce((sum, l) => sum + l.durationMin, 0);

  return (
    <div className="page-enter space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Today</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{fullDateFmt.format(new Date())}</p>
      </div>

      {/* Next lesson hero */}
      <NextLessonHero lesson={nextLesson} studentNames={studentNames} />

      {/* Today overview */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          Today's overview
        </p>
        <div className="grid grid-cols-2 gap-2">
          <MiniStat
            value={String(pendingLessons.length)}
            label="Upcoming"
            color="text-tf-indigo"
            bg="bg-tf-indigo/10"
            icon={CalendarDays}
          />
          <MiniStat
            value={String(dueLessons.length)}
            label="Due Payment"
            color="text-tf-pollen"
            bg="bg-tf-pollen/10"
            icon={Banknote}
          />
          <MiniStat
            value={String(processedLessons.length)}
            label="Done"
            color="text-income"
            bg="bg-income/10"
            icon={CheckCircle2}
          />
          <MiniStat
            value={totalTodayMin > 0 ? fmtDuration(totalTodayMin) : '—'}
            label="Total time"
            color="text-net"
            bg="bg-net/10"
            icon={Timer}
          />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {pendingLessons.length > 0 && (
          <motion.div
            key="pending"
            layout
            variants={sectionVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            className="space-y-3 overflow-hidden"
          >
            <SectionHeader dot="bg-tf-indigo" label="Upcoming" count={pendingLessons.length} />
            {pendingLessons.map((l) => (
              <LessonCard
                key={l.id}
                lesson={l}
                studentName={studentNames[l.studentId] ?? l.studentId}
                onChanged={refreshToday}
              />
            ))}
          </motion.div>
        )}

        {dueLessons.length > 0 && (
          <motion.div
            key="due"
            layout
            variants={sectionVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            className="space-y-3 overflow-hidden"
          >
            <SectionHeader dot="bg-tf-pollen" label="Due Payment" count={dueLessons.length} />
            {dueLessons.map((l) => (
              <LessonCard
                key={l.id}
                lesson={l}
                studentName={studentNames[l.studentId] ?? l.studentId}
                onChanged={refreshToday}
              />
            ))}
          </motion.div>
        )}

        {processedLessons.length > 0 && (
          <motion.div
            key="processed"
            layout
            variants={sectionVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            className="space-y-2 overflow-hidden"
          >
            <SectionHeader
              dot="bg-muted-foreground"
              label="Processed"
              count={processedLessons.length}
            />
            {processedLessons.map((l) => (
              <ProcessedLessonRow
                key={l.id}
                lesson={l}
                studentName={studentNames[l.studentId] ?? l.studentId}
              />
            ))}
          </motion.div>
        )}

        {todayLessons.length === 0 && !nextLesson && (
          <motion.div
            key="empty"
            layout
            variants={sectionVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
              No lessons today. Enjoy your day off!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Financial summary */}
      <div className="space-y-3 border-t border-border pt-5">
        <div className="flex flex-col-reverse items-start gap-2 md:flex-row">
          <RangeTabs value={range} onChange={setRange} />
          <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
            <SelectTrigger className="h-9 w-[88px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div
          className={
            'grid grid-cols-2 gap-3 transition-opacity duration-150 sm:grid-cols-4 ' +
            (loading ? 'opacity-60' : 'opacity-100')
          }
        >
          <FinanceStat
            label="Planned"
            value={fmtMoney(summary.plannedIncomeInTargetCurrency, summary.targetCurrency)}
            tone="planned"
          />
          <FinanceStat
            label="Income"
            value={fmtMoney(summary.incomeInTargetCurrency, summary.targetCurrency)}
            tone="income"
          />
          <FinanceStat
            label="Expenses"
            value={fmtMoney(summary.expenseInTargetCurrency, summary.targetCurrency)}
            tone="expense"
          />
          <FinanceStat
            label="Net"
            value={fmtMoney(summary.netInTargetCurrency, summary.targetCurrency)}
            tone={summary.netInTargetCurrency >= 0 ? 'income' : 'expense'}
          />
        </div>
      </div>
    </div>
  );
}

function NextLessonHero({
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
              <p className="mt-0.5 text-xl font-semibold leading-tight">No upcoming sessions</p>
              <p className="mt-1 text-sm text-white/70">
                Nothing on the schedule. Take a breather.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({
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

function SectionHeader({ dot, label, count }: { dot: string; label: string; count: number }) {
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

function ProcessedLessonRow({
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
