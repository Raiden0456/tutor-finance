import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { errorMessage } from '@/hooks/use-mutation';
import { I18nProvider, useI18n, type Locale } from '@/lib/i18n';
import { LessonCard } from '@/components/lesson-card';
import { FadeSwap } from '@/components/ui/collapse';
import { isSameLocalDay } from '@/utils/lesson';
import { DigestCard, useDataChanged } from '@/features/assistant';
import { fetchDashboardData, type DashboardData } from './data';
import { NextLessonHero } from './next-lesson-hero';
import { AttentionSection } from './attention-section';
import { MonthSummary } from './month-summary';
import { AnimatedStack, DashboardSection } from './section';

interface Props {
  initial: DashboardData;
  studentNames: Record<string, string>;
  locale?: Locale;
}

export function DashboardIsland({ locale = 'en', ...props }: Props) {
  return (
    <I18nProvider locale={locale}>
      <DashboardContent {...props} />
    </I18nProvider>
  );
}

function DashboardContent({ initial, studentNames }: Omit<Props, 'locale'>) {
  const { locale, t } = useI18n();
  const [data, setData] = useState(initial);

  const refresh = useCallback(async () => {
    try {
      setData(await fetchDashboardData(api.get));
    } catch (error) {
      toast.error(errorMessage(error, t));
    }
  }, [t]);

  useDataChanged(refresh);

  const { todayLessons, nextLesson } = useMemo(() => {
    const now = new Date();
    return {
      todayLessons: data.upcoming.filter((l) => isSameLocalDay(new Date(l.startsAt), now)),
      nextLesson:
        data.upcoming.find(
          (l) =>
            l.status === 'scheduled' &&
            new Date(l.startsAt).getTime() + l.durationMin * 60_000 > now.getTime(),
        ) ?? null,
    };
  }, [data.upcoming]);

  const fullDate = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <div className="page-enter space-y-8">
      <header>
        <h1 className="hidden text-xl font-semibold tracking-tight md:block">{t('Dashboard')}</h1>
        <p className="text-sm text-muted-foreground">{fullDate}</p>
      </header>

      <DigestCard />

      <DashboardSection title={t('Today')} count={todayLessons.length}>
        <NextLessonHero lesson={nextLesson} studentNames={studentNames} />
        <FadeSwap motionKey={todayLessons.length === 0 ? 'empty' : 'list'}>
          {todayLessons.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-6 text-center text-sm text-muted-foreground">
              {t('No lessons today. Enjoy your day off!')}
            </div>
          ) : (
            <AnimatedStack
              items={todayLessons}
              render={(lesson) => (
                <LessonCard
                  lesson={lesson}
                  studentName={studentNames[lesson.studentId] ?? lesson.studentId}
                  compact
                  onChanged={refresh}
                  onArchived={refresh}
                  onDeleted={refresh}
                />
              )}
            />
          )}
        </FadeSwap>
      </DashboardSection>

      <AttentionSection
        awaitingPayment={data.awaitingPayment}
        upcoming={data.upcoming}
        studentNames={studentNames}
        onChanged={refresh}
      />

      <MonthSummary summary={data.monthSummary} />
    </div>
  );
}
