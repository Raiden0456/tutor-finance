import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, PartyPopper } from 'lucide-react';
import { findLessonConflicts, type Currency } from '@tutor-finance/shared';
import { LessonCard } from '@/components/lesson-card';
import { Collapse, FadeSwap } from '@/components/ui/collapse';
import { fmtMoney } from '@/lib/format';
import { localizePath, useI18n } from '@/lib/i18n';
import type { Lesson } from '@/lib/types';
import { lessonOwed } from '@/utils/lesson';
import { AnimatedStack, DashboardSection } from './section';

const AWAITING_PREVIEW = 3;

interface StudentDebt {
  id: string;
  name: string;
  count: number;
  totals: { currency: Currency; amount: number }[];
}

function groupDebts(lessons: Lesson[], studentNames: Record<string, string>): StudentDebt[] {
  const byStudent = new Map<string, { count: number; totals: Map<Currency, number> }>();
  for (const lesson of lessons) {
    const owed = lessonOwed(lesson);
    if (!owed) continue;
    const entry = byStudent.get(lesson.studentId) ?? { count: 0, totals: new Map() };
    entry.count += 1;
    entry.totals.set(owed.currency, (entry.totals.get(owed.currency) ?? 0) + owed.amount);
    byStudent.set(lesson.studentId, entry);
  }
  return [...byStudent.entries()]
    .map(([id, { count, totals }]) => ({
      id,
      name: studentNames[id] ?? id,
      count,
      totals: [...totals.entries()].map(([currency, amount]) => ({ currency, amount })),
    }))
    .sort((a, b) => b.count - a.count);
}

export function AttentionSection({
  awaitingPayment,
  upcoming,
  studentNames,
  onChanged,
}: {
  awaitingPayment: Lesson[];
  upcoming: Lesson[];
  studentNames: Record<string, string>;
  onChanged: () => Promise<void>;
}) {
  const { locale, t } = useI18n();
  const [showAll, setShowAll] = useState(false);
  const debts = useMemo(
    () => groupDebts(awaitingPayment, studentNames),
    [awaitingPayment, studentNames],
  );
  const conflicts = useMemo(() => {
    const now = Date.now();
    const future = upcoming.filter(
      (l) => new Date(l.startsAt).getTime() + l.durationMin * 60_000 > now,
    );
    return findLessonConflicts(future).map(([a, b]) => ({ id: `${a.id}:${b.id}`, a, b }));
  }, [upcoming]);

  const dateFmt = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const preview = awaitingPayment.slice(0, AWAITING_PREVIEW);
  const rest = awaitingPayment.slice(AWAITING_PREVIEW);
  const total = awaitingPayment.length + conflicts.length;
  const lessonCard = (lesson: Lesson) => (
    <LessonCard
      lesson={lesson}
      studentName={studentNames[lesson.studentId] ?? lesson.studentId}
      compact
      onChanged={onChanged}
      onArchived={onChanged}
      onDeleted={onChanged}
    />
  );

  return (
    <DashboardSection title={t('Needs attention')} count={total}>
      <FadeSwap motionKey={total === 0 ? 'empty' : 'items'}>
        {total === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 p-4 text-sm text-muted-foreground">
            <PartyPopper className="h-5 w-5 shrink-0 text-tf-jade" />
            {t('All caught up')}
          </div>
        ) : (
          <div className="space-y-5">
            <Collapse open={awaitingPayment.length > 0}>
              <div className="space-y-2">
                <p className="px-0.5 text-sm font-medium">{t('Awaiting payment')}</p>
                <AnimatedStack items={preview} render={lessonCard} />
                <Collapse open={showAll}>
                  <div className="pt-2">
                    <AnimatedStack items={rest} render={lessonCard} />
                  </div>
                </Collapse>
                {rest.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    className="px-0.5 text-xs font-medium text-primary transition-opacity hover:opacity-70"
                  >
                    {showAll
                      ? t('Show less')
                      : t('Show all ({count})', { count: awaitingPayment.length })}
                  </button>
                )}
              </div>
            </Collapse>

            <Collapse open={debts.length > 0}>
              <div className="space-y-2">
                <p className="px-0.5 text-sm font-medium">{t('Debts by student')}</p>
                <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  {debts.map((debt) => (
                    <a
                      key={debt.id}
                      href={localizePath(`/students/${debt.id}`, locale)}
                      className="flex items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-accent/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{debt.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {t('{count} unpaid', { count: debt.count })}
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-sm font-semibold tabular-nums text-tf-pollen">
                        {debt.totals.map((d) => (
                          <div key={d.currency}>{fmtMoney(d.amount, d.currency)}</div>
                        ))}
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </div>
            </Collapse>

            <Collapse open={conflicts.length > 0}>
              <div className="space-y-2">
                <p className="px-0.5 text-sm font-medium">{t('Schedule conflicts')}</p>
                <AnimatedStack
                  items={conflicts}
                  render={({ a, b }) => (
                    <a
                      href={localizePath(`/lessons/${b.id}`, locale)}
                      className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/[0.04] px-4 py-3 transition-colors duration-200 hover:bg-amber-500/10"
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {studentNames[a.studentId] ?? a.studentId} ·{' '}
                          {studentNames[b.studentId] ?? b.studentId}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {dateFmt.format(new Date(b.startsAt))}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </a>
                  )}
                />
              </div>
            </Collapse>
          </div>
        )}
      </FadeSwap>
    </DashboardSection>
  );
}
