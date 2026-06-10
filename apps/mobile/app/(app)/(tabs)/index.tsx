import * as React from 'react';
import { View } from 'react-native';
import { addDays, endOfDay, endOfWeek, isToday, startOfDay, subDays } from 'date-fns';
import { Screen } from '~/components/common/screen';
import { NextLessonHero } from '~/components/dashboard/next-lesson-hero';
import { TodayOverview } from '~/components/dashboard/today-overview';
import { FinanceStat } from '~/components/dashboard/finance-stat';
import { SectionHeader } from '~/components/dashboard/section-header';
import { ProcessedLessonRow } from '~/components/dashboard/processed-lesson-row';
import { LessonCard } from '~/components/lessons/lesson-card';
import { RangeTabs, RANGE_DAYS, type RangeKey } from '~/components/common/range-tabs';
import { SelectField } from '~/components/common/select-field';
import { EmptyState } from '~/components/common/empty-state';
import { StaggerItem } from '~/components/common/stagger';
import { Skeleton } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { useApiQuery } from '~/lib/use-query';
import { useSettings } from '~/lib/settings';
import { currencyOptions } from '~/lib/catalog';
import { capitalizeFirst, useI18n } from '~/lib/i18n';
import { intlLocale, money } from '~/lib/format';
import type { Currency, Lesson, Student, Summary } from '~/lib/types';

export default function DashboardScreen() {
  const { t, locale } = useI18n();
  const { primaryCurrency, weekStartsOn } = useSettings();
  const [range, setRange] = React.useState<RangeKey>('30d');
  const [currency, setCurrency] = React.useState<Currency | null>(null);
  const targetCurrency = currency ?? primaryCurrency;

  const now = new Date();
  const from = subDays(startOfDay(now), RANGE_DAYS[range] - 1).toISOString();
  const to = endOfDay(now).toISOString();

  const summary = useApiQuery(
    () => api.get<Summary>('dashboard/summary', { query: { from, to, target: targetCurrency } }),
    [from, to, targetCurrency],
  );
  const students = useApiQuery(
    () => api.get<Student[]>('students', { query: { includeArchived: true } }),
    [],
  );
  const lessons = useApiQuery(
    () =>
      api.get<Lesson[]>('lessons', {
        query: {
          from: startOfDay(now).toISOString(),
          to: addDays(now, 14).toISOString(),
          orderDir: 'asc',
        },
      }),
    [],
  );

  const todayLabel = React.useMemo(
    () =>
      capitalizeFirst(
        new Intl.DateTimeFormat(intlLocale(locale), {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        }).format(new Date()),
      ),
    [locale],
  );

  const loading = summary.loading || students.loading || lessons.loading;
  const nameOf = React.useCallback(
    (id: string) => students.data?.find((s) => s.id === id)?.name ?? t('Student'),
    [students.data, t],
  );

  const all = lessons.data ?? [];
  const todayLessons = all.filter((l) => isToday(new Date(l.startsAt)));
  // Next scheduled lesson within THIS week only (matches web hero).
  const weekEnd = endOfWeek(now, { weekStartsOn });
  const nextLesson =
    all.find(
      (l) =>
        l.status === 'scheduled' &&
        new Date(l.startsAt).getTime() >= now.getTime() &&
        new Date(l.startsAt).getTime() <= weekEnd.getTime(),
    ) ?? null;

  // Same three buckets as the web dashboard.
  const pendingLessons = todayLessons.filter((l) => l.status === 'scheduled');
  const dueLessons = todayLessons.filter(
    (l) => l.status === 'due' || l.status === 'partially_paid' || l.status === 'completed',
  );
  const processedLessons = todayLessons.filter(
    (l) =>
      l.status !== 'scheduled' &&
      l.status !== 'due' &&
      l.status !== 'partially_paid' &&
      l.status !== 'completed',
  );

  const refresh = () => {
    void summary.refetch();
    void students.refetch();
    void lessons.refetch();
  };

  const net = summary.data?.netInTargetCurrency ?? 0;

  return (
    <Screen title={t('Dashboard')} refreshing={loading} onRefresh={refresh}>
      <View className="gap-4">
        <View>
          <Text className="text-3xl font-bold">{t('Today')}</Text>
          <Text className="mt-0.5 text-sm text-muted-foreground">{todayLabel}</Text>
        </View>

        {loading && all.length === 0 ? (
          <Skeleton className="h-36 w-full rounded-3xl" />
        ) : (
          <NextLessonHero
            lesson={nextLesson}
            studentName={nextLesson ? nameOf(nextLesson.studentId) : ''}
          />
        )}

        {/* Today's overview (4 cards) */}
        <TodayOverview lessons={todayLessons} />

        {/* Upcoming */}
        {pendingLessons.length > 0 ? (
          <View className="gap-2.5">
            <SectionHeader dot="bg-tf-indigo" label={t('Upcoming')} count={pendingLessons.length} />
            {pendingLessons.map((l, i) => (
              <StaggerItem key={l.id} index={i}>
                <LessonCard lesson={l} studentName={nameOf(l.studentId)} onChanged={refresh} />
              </StaggerItem>
            ))}
          </View>
        ) : null}

        {/* Due payment */}
        {dueLessons.length > 0 ? (
          <View className="gap-2.5">
            <SectionHeader dot="bg-tf-pollen" label={t('Due Payment')} count={dueLessons.length} />
            {dueLessons.map((l, i) => (
              <StaggerItem key={l.id} index={i}>
                <LessonCard lesson={l} studentName={nameOf(l.studentId)} onChanged={refresh} />
              </StaggerItem>
            ))}
          </View>
        ) : null}

        {/* Processed */}
        {processedLessons.length > 0 ? (
          <View className="gap-2">
            <SectionHeader
              dot="bg-muted-foreground"
              label={t('Processed')}
              count={processedLessons.length}
            />
            {processedLessons.map((l, i) => (
              <StaggerItem key={l.id} index={i}>
                <ProcessedLessonRow lesson={l} studentName={nameOf(l.studentId)} />
              </StaggerItem>
            ))}
          </View>
        ) : null}

        {todayLessons.length === 0 && !nextLesson ? (
          <View className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10">
            <Text className="text-center text-sm text-muted-foreground">
              {t('No lessons today. Enjoy your day off!')}
            </Text>
          </View>
        ) : null}

        {/* Financial summary */}
        <View className="gap-3 border-t border-border pt-5">
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <RangeTabs value={range} onValueChange={setRange} />
            </View>
            <View className="w-28">
              <SelectField
                value={targetCurrency}
                onValueChange={(v) => setCurrency(v as Currency)}
                options={currencyOptions()}
              />
            </View>
          </View>

          <View className="flex-row gap-3">
            <FinanceStat
              label={t('Planned')}
              tone="planned"
              value={
                summary.data
                  ? money(summary.data.plannedIncomeInTargetCurrency, targetCurrency, locale)
                  : '—'
              }
            />
            <FinanceStat
              label={t('Income')}
              tone="income"
              value={
                summary.data
                  ? money(summary.data.incomeInTargetCurrency, targetCurrency, locale)
                  : '—'
              }
            />
          </View>
          <View className="flex-row gap-3">
            <FinanceStat
              label={t('Expenses')}
              tone="expense"
              value={
                summary.data
                  ? money(summary.data.expenseInTargetCurrency, targetCurrency, locale)
                  : '—'
              }
            />
            <FinanceStat
              label={t('Net')}
              tone={net >= 0 ? 'income' : 'expense'}
              value={summary.data ? money(net, targetCurrency, locale) : '—'}
            />
          </View>
        </View>

        {summary.error && !summary.data ? (
          <EmptyState title={t('Error')} description={summary.error} />
        ) : null}
      </View>
    </Screen>
  );
}
