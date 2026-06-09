import * as React from 'react';
import { Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import { addDays, endOfDay, isToday, startOfDay, subDays } from 'date-fns';
import { TrendingUp, TrendingDown, Wallet, CalendarClock, Video } from 'lucide-react-native';
import { Screen } from '~/components/screen';
import { FinanceStat } from '~/components/finance-stat';
import { LessonCard } from '~/components/lesson-card';
import { RangeTabs, RANGE_DAYS, type RangeKey } from '~/components/range-tabs';
import { EmptyState } from '~/components/empty-state';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Icon } from '~/components/ui/icon';
import { Skeleton } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { useApiQuery } from '~/lib/use-query';
import { useSettings } from '~/lib/settings';
import { useI18n } from '~/lib/i18n';
import { formatDate, money } from '~/lib/format';
import type { Lesson, Student, Summary } from '~/lib/types';

export default function DashboardScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { primaryCurrency } = useSettings();
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
  const students = useApiQuery(() => api.get<Student[]>('students', { query: { includeArchived: true } }), []);
  const lessons = useApiQuery(
    () =>
      api.get<Lesson[]>('lessons', {
        query: { from: startOfDay(now).toISOString(), to: addDays(now, 14).toISOString(), orderDir: 'asc' },
      }),
    [],
  );

  const loading = summary.loading || students.loading || lessons.loading;
  const nameOf = React.useCallback(
    (id: string) => students.data?.find((s) => s.id === id)?.name ?? t('Student'),
    [students.data, t],
  );

  const todayLessons = (lessons.data ?? []).filter((l) => isToday(new Date(l.startsAt)));
  const nextLesson = (lessons.data ?? []).find(
    (l) => new Date(l.startsAt).getTime() >= now.getTime() && l.status === 'scheduled',
  );
  const outstanding = (lessons.data ?? []).filter(
    (l) => l.status === 'due' || l.status === 'partially_paid',
  );
  const totalTodayMin = todayLessons.reduce((acc, l) => acc + l.durationMin, 0);

  const refresh = () => {
    void summary.refetch();
    void students.refetch();
    void lessons.refetch();
  };

  return (
    <Screen title={t('Dashboard')} refreshing={loading} onRefresh={refresh}>
      <View className="gap-4">
        {/* Next lesson hero */}
        {loading && !nextLesson ? (
          <Skeleton className="h-28 w-full" />
        ) : nextLesson ? (
          <Card className="bg-primary py-5">
            <CardContent className="gap-3">
              <View className="flex-row items-center gap-2">
                <Icon as={CalendarClock} size={16} className="text-primary-foreground/80" />
                <Text className="text-xs text-primary-foreground/80">{t('Upcoming lesson')}</Text>
              </View>
              <Text className="text-xl font-bold text-primary-foreground">{nameOf(nextLesson.studentId)}</Text>
              <Text className="text-sm text-primary-foreground/90">
                {isToday(new Date(nextLesson.startsAt))
                  ? `${t('Today')} · ${formatDate(nextLesson.startsAt, 'HH:mm', locale)}`
                  : formatDate(nextLesson.startsAt, 'EEE d MMM · HH:mm', locale)}
              </Text>
              <View className="flex-row gap-2 pt-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => router.push(`/(app)/lessons/${nextLesson.id}`)}
                >
                  <Text>{t('View details')}</Text>
                </Button>
                {nextLesson.meetingLink ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => Linking.openURL(nextLesson.meetingLink!)}
                  >
                    <Icon as={Video} size={15} />
                    <Text>{t('Join')}</Text>
                  </Button>
                ) : null}
              </View>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-5">
              <Text className="text-center text-sm text-muted-foreground">
                {t('No upcoming lessons')}
              </Text>
            </CardContent>
          </Card>
        )}

        {/* Range + finance stats */}
        <RangeTabs value={range} onValueChange={setRange} />
        <View className="flex-row gap-3">
          <FinanceStat
            label={t('Income')}
            tone="income"
            icon={TrendingUp}
            value={summary.data ? money(summary.data.incomeInTargetCurrency, primaryCurrency, locale) : '—'}
          />
          <FinanceStat
            label={t('Expense')}
            tone="expense"
            icon={TrendingDown}
            value={summary.data ? money(summary.data.expenseInTargetCurrency, primaryCurrency, locale) : '—'}
          />
        </View>
        <View className="flex-row gap-3">
          <FinanceStat
            label={t('Net')}
            tone="net"
            icon={Wallet}
            value={summary.data ? money(summary.data.netInTargetCurrency, primaryCurrency, locale) : '—'}
          />
          <FinanceStat
            label={t('Planned')}
            tone="neutral"
            value={summary.data ? money(summary.data.plannedIncomeInTargetCurrency, primaryCurrency, locale) : '—'}
          />
        </View>

        {/* Today's overview */}
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold">{t("Today's overview")}</Text>
            <Text className="text-xs text-muted-foreground">
              {todayLessons.length} {t('lessons')} · {totalTodayMin} {t('min')}
            </Text>
          </View>
          {todayLessons.length === 0 ? (
            <Card>
              <CardContent className="py-5">
                <Text className="text-center text-sm text-muted-foreground">
                  {t('No lessons today. Enjoy your day off!')}
                </Text>
              </CardContent>
            </Card>
          ) : (
            <View className="gap-2">
              {todayLessons.map((l) => (
                <LessonCard
                  key={l.id}
                  lesson={l}
                  studentName={nameOf(l.studentId)}
                  onPress={() => router.push(`/(app)/lessons/${l.id}`)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Outstanding */}
        {outstanding.length > 0 ? (
          <View className="gap-2">
            <Text className="text-base font-semibold">{t('Outstanding')}</Text>
            <View className="gap-2">
              {outstanding.map((l) => (
                <LessonCard
                  key={l.id}
                  lesson={l}
                  studentName={nameOf(l.studentId)}
                  showDate
                  onPress={() => router.push(`/(app)/lessons/${l.id}`)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {summary.error && !summary.data ? (
          <EmptyState title={t('Error')} description={summary.error} />
        ) : null}
      </View>
    </Screen>
  );
}
