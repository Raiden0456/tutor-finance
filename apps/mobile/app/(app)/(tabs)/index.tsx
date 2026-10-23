import * as React from 'react';
import { View } from 'react-native';
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  isToday,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns';
import { displayStatus, findLessonConflicts } from '@tutor-finance/shared';
import { DigestCard } from '~/components/assistant/digest-card';
import { Screen } from '~/components/common/screen';
import { ErrorState } from '~/components/common/error-state';
import { MonthSummary } from '~/components/dashboard/month-summary';
import { NeedsAttention } from '~/components/dashboard/needs-attention';
import { TodaySection } from '~/components/dashboard/today-section';
import { api } from '~/lib/api';
import { useDataVersion } from '~/lib/data-version';
import { useApiQuery } from '~/lib/use-query';
import { useSettings } from '~/lib/settings';
import { useI18n } from '~/lib/i18n';
import type { Lesson, Student, Summary } from '~/lib/types';

const DEBT_LOOKBACK_DAYS = 120;
const CONFLICT_LOOKAHEAD_DAYS = 7;

export default function DashboardScreen() {
  const { t } = useI18n();
  const { primaryCurrency, weekStartsOn } = useSettings();
  const version = useDataVersion();

  const summary = useApiQuery(() => {
    const now = new Date();
    return api.get<Summary>('dashboard/summary', {
      query: {
        from: startOfMonth(now).toISOString(),
        to: endOfMonth(now).toISOString(),
        target: primaryCurrency,
      },
    });
  }, [primaryCurrency, version]);
  const students = useApiQuery(
    () => api.get<Student[]>('students', { query: { includeArchived: true } }),
    [version],
  );
  const lessons = useApiQuery(() => {
    const now = new Date();
    return api.get<Lesson[]>('lessons', {
      query: {
        from: startOfDay(subDays(now, DEBT_LOOKBACK_DAYS)).toISOString(),
        to: endOfDay(addDays(now, CONFLICT_LOOKAHEAD_DAYS)).toISOString(),
        orderDir: 'asc',
        limit: 1000,
      },
    });
  }, [version]);

  const loading = summary.loading || students.loading || lessons.loading;
  const failed = [summary, students, lessons].find((q) => q.error && !q.data);
  const nameOf = React.useCallback(
    (id: string) => students.data?.find((s) => s.id === id)?.name ?? t('Student'),
    [students.data, t],
  );

  const derived = React.useMemo(() => {
    const all = lessons.data ?? [];
    const now = new Date();
    const nowMs = now.getTime();
    const weekEndMs = endOfWeek(now, { weekStartsOn }).getTime();
    const todayStartMs = startOfDay(now).getTime();
    const lookaheadMs = endOfDay(addDays(now, CONFLICT_LOOKAHEAD_DAYS)).getTime();
    const startOf = (l: Lesson) => new Date(l.startsAt).getTime();

    return {
      todayLessons: all.filter((l) => isToday(new Date(l.startsAt))),
      nextLesson:
        all.find(
          (l) => l.status === 'scheduled' && startOf(l) >= nowMs && startOf(l) <= weekEndMs,
        ) ?? null,
      awaiting: all
        .filter((l) => displayStatus(l) === 'awaiting_payment' && startOf(l) <= nowMs)
        .reverse(),
      conflicts: findLessonConflicts(
        all.filter((l) => startOf(l) >= todayStartMs && startOf(l) <= lookaheadMs),
      ),
    };
  }, [lessons.data, weekStartsOn]);

  const refresh = () => {
    void summary.refetch();
    void students.refetch();
    void lessons.refetch();
  };
  const refreshLessons = () => {
    void lessons.refetch();
    void summary.refetch();
  };

  return (
    <Screen title={t('Dashboard')} refreshing={loading} onRefresh={refresh}>
      <View className="gap-6">
        <DigestCard />
        <TodaySection
          loading={lessons.loading}
          nextLesson={derived.nextLesson}
          todayLessons={derived.todayLessons}
          nameOf={nameOf}
          onChanged={refreshLessons}
        />
        <NeedsAttention
          awaiting={derived.awaiting}
          conflicts={derived.conflicts}
          nameOf={nameOf}
          onChanged={refreshLessons}
        />
        <MonthSummary summary={summary.data} currency={primaryCurrency} />
        {failed ? <ErrorState message={failed.error} onRetry={refresh} retrying={loading} /> : null}
      </View>
    </Screen>
  );
}
