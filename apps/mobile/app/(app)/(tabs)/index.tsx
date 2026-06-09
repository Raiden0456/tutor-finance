import * as React from 'react';
import { View } from 'react-native';
import { addDays, endOfDay, endOfWeek, isToday, startOfDay, subDays } from 'date-fns';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react-native';
import { Screen } from '~/components/common/screen';
import { NextLessonHero } from '~/components/dashboard/next-lesson-hero';
import { TodayOverview } from '~/components/dashboard/today-overview';
import { FinanceStat } from '~/components/dashboard/finance-stat';
import { LessonCard } from '~/components/lessons/lesson-card';
import { RangeTabs, RANGE_DAYS, type RangeKey } from '~/components/common/range-tabs';
import { EmptyState } from '~/components/common/empty-state';
import { StaggerItem } from '~/components/common/stagger';
import { LanguageToggle } from '~/components/common/language-toggle';
import { ThemeToggle } from '~/components/common/theme-toggle';
import { Card, CardContent } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { useApiQuery } from '~/lib/use-query';
import { useSettings } from '~/lib/settings';
import { capitalizeFirst, useI18n } from '~/lib/i18n';
import { intlLocale, money } from '~/lib/format';
import type { Lesson, Student, Summary } from '~/lib/types';

export default function DashboardScreen() {
  const { t, locale } = useI18n();
  const { primaryCurrency, weekStartsOn } = useSettings();
  const [range, setRange] = React.useState<RangeKey>('30d');

  const now = React.useMemo(() => new Date(), []);
  const from = React.useMemo(
    () => subDays(startOfDay(now), RANGE_DAYS[range] - 1).toISOString(),
    [now, range],
  );
  const to = React.useMemo(() => endOfDay(now).toISOString(), [now]);

  const summary = useApiQuery(
    () => api.get<Summary>('dashboard/summary', { query: { from, to, target: primaryCurrency } }),
    [from, to, primaryCurrency],
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
  const weekEnd = React.useMemo(() => endOfWeek(now, { weekStartsOn }), [now, weekStartsOn]);
  const nextLesson =
    all.find(
      (l) =>
        l.status === 'scheduled' &&
        new Date(l.startsAt).getTime() >= now.getTime() &&
        new Date(l.startsAt).getTime() <= weekEnd.getTime(),
    ) ?? null;
  const outstanding = all.filter((l) => l.status === 'due' || l.status === 'partially_paid');

  const refresh = () => {
    void summary.refetch();
    void students.refetch();
    void lessons.refetch();
  };

  return (
    <Screen
      title={t('Dashboard')}
      right={
        <View className="flex-row items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </View>
      }
      refreshing={loading}
      onRefresh={refresh}
    >
      <View className="gap-4">
        <View>
          <Text className="text-3xl font-bold" style={{ fontFamily: 'Onest_700Bold' }}>
            {t('Today')}
          </Text>
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

        {/* Today's lessons */}
        {todayLessons.length > 0 ? (
          <View className="gap-2">
            <Text className="text-base font-semibold">{t('Today')}</Text>
            <View className="gap-2">
              {todayLessons.map((l, i) => (
                <StaggerItem key={l.id} index={i}>
                  <LessonCard lesson={l} studentName={nameOf(l.studentId)} onChanged={refresh} />
                </StaggerItem>
              ))}
            </View>
          </View>
        ) : (
          <Card>
            <CardContent className="py-5">
              <Text className="text-center text-sm text-muted-foreground">
                {t('No lessons today. Enjoy your day off!')}
              </Text>
            </CardContent>
          </Card>
        )}

        {/* Outstanding */}
        {outstanding.length > 0 ? (
          <View className="gap-2">
            <Text className="text-base font-semibold">{t('Outstanding')}</Text>
            <View className="gap-2">
              {outstanding.map((l, i) => (
                <StaggerItem key={l.id} index={i}>
                  <LessonCard
                    lesson={l}
                    studentName={nameOf(l.studentId)}
                    showDate
                    onChanged={refresh}
                  />
                </StaggerItem>
              ))}
            </View>
          </View>
        ) : null}

        {/* Financial summary */}
        <RangeTabs value={range} onValueChange={setRange} />
        <View className="flex-row gap-3">
          <FinanceStat
            label={t('Income')}
            tone="income"
            icon={TrendingUp}
            value={
              summary.data
                ? money(summary.data.incomeInTargetCurrency, primaryCurrency, locale)
                : '—'
            }
          />
          <FinanceStat
            label={t('Expense')}
            tone="expense"
            icon={TrendingDown}
            value={
              summary.data
                ? money(summary.data.expenseInTargetCurrency, primaryCurrency, locale)
                : '—'
            }
          />
        </View>
        <View className="flex-row gap-3">
          <FinanceStat
            label={t('Net')}
            tone="net"
            icon={Wallet}
            value={
              summary.data ? money(summary.data.netInTargetCurrency, primaryCurrency, locale) : '—'
            }
          />
          <FinanceStat
            label={t('Planned')}
            tone="neutral"
            value={
              summary.data
                ? money(summary.data.plannedIncomeInTargetCurrency, primaryCurrency, locale)
                : '—'
            }
          />
        </View>

        {summary.error && !summary.data ? (
          <EmptyState title={t('Error')} description={summary.error} />
        ) : null}
      </View>
    </Screen>
  );
}
