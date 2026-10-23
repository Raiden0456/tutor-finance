import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { endOfDay, startOfDay, subDays } from 'date-fns';
import { fromMinorUnits } from '@tutor-finance/shared';
import { RangeTabs, RANGE_DAYS, type RangeKey } from '~/components/common/range-tabs';
import { SelectField } from '~/components/common/select-field';
import { EmptyState } from '~/components/common/empty-state';
import { ErrorState } from '~/components/common/error-state';
import { StaggerItem } from '~/components/common/stagger';
import { FinanceStat } from '~/components/dashboard/finance-stat';
import { IncomeExpenseChart } from '~/components/charts/income-expense-chart';
import { CategoryPieChart, type PieDatum } from '~/components/charts/category-pie-chart';
import { ComparisonCard } from '~/components/finance/comparison-card';
import { TransactionRow } from '~/components/finance/transaction-row';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { Switch } from '~/components/ui/switch';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { categoryLabel, currencyOptions } from '~/lib/catalog';
import { money, moneyMajor } from '~/lib/format';
import { useI18n } from '~/lib/i18n';
import { useSettings } from '~/lib/settings';
import { useApiQuery } from '~/lib/use-query';
import { useColorScheme } from '~/lib/use-color-scheme';
import type { Currency, DailyFinanceStats, Student, Summary, Tx } from '~/lib/types';

export function TransactionsOverview({
  students,
  version,
  onEdit,
}: {
  students: Student[];
  version: number;
  onEdit: (tx: Tx) => void;
}) {
  const { t, locale } = useI18n();
  const { primaryCurrency, weekStartsOn } = useSettings();
  const { colors } = useColorScheme();
  const [range, setRange] = React.useState<RangeKey>('30d');
  const [currency, setCurrency] = React.useState<Currency | null>(null);
  const [compare, setCompare] = React.useState(false);
  const targetCurrency = currency ?? primaryCurrency;

  const now = new Date();
  const from = subDays(startOfDay(now), RANGE_DAYS[range] - 1).toISOString();
  const to = endOfDay(now).toISOString();

  const summary = useApiQuery(
    () => api.get<Summary>('dashboard/summary', { query: { from, to, target: targetCurrency } }),
    [from, to, targetCurrency, version],
  );
  const daily = useApiQuery(
    () =>
      api.get<DailyFinanceStats[]>('dashboard/daily-stats', {
        query: { from, to, target: targetCurrency },
      }),
    [from, to, targetCurrency, version],
  );
  const txs = useApiQuery(
    () =>
      api.get<Tx[]>('transactions', { query: { from, to, target: targetCurrency, limit: 200 } }),
    [from, to, targetCurrency, version],
  );

  const nameOf = (id?: string | null) =>
    id ? (students.find((s) => s.id === id)?.name ?? '') : '';

  const incomeT = summary.data?.incomeInTargetCurrency ?? 0;
  const expenseT = summary.data?.expenseInTargetCurrency ?? 0;
  const netT = incomeT - expenseT;

  const pieData = React.useMemo<PieDatum[]>(() => {
    const palette = [
      colors.indigo,
      colors.teal,
      colors.coral,
      colors.pollen,
      colors.jade,
      colors.mutedForeground,
    ];
    const byCat = new Map<string, number>();
    for (const tx of txs.data ?? []) {
      if (tx.type !== 'expense') continue;
      byCat.set(tx.category, (byCat.get(tx.category) ?? 0) + (tx.convertedAmount ?? 0));
    }
    return [...byCat.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([cat, value], i) => ({
        label: categoryLabel(cat, t),
        value: fromMinorUnits(value, targetCurrency),
        color: palette[i % palette.length]!,
      }));
  }, [txs.data, colors, t, targetCurrency]);

  const loading = summary.loading || daily.loading || txs.loading;
  const failed = [summary, daily, txs].find((q) => q.error && !q.data);
  const retryAll = () => {
    void summary.refetch();
    void daily.refetch();
    void txs.refetch();
  };

  return (
    <View className="gap-4">
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
          value={summary.data ? money(incomeT, targetCurrency, locale) : '—'}
        />
      </View>
      <View className="flex-row gap-3">
        <FinanceStat
          label={t('Expenses')}
          tone="expense"
          value={summary.data ? money(expenseT, targetCurrency, locale) : '—'}
        />
        <FinanceStat
          label={t('Net')}
          tone={netT >= 0 ? 'income' : 'expense'}
          value={summary.data ? money(netT, targetCurrency, locale) : '—'}
        />
      </View>

      <View className="flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
        <Text className="flex-1 text-sm font-medium">{t('Compare with previous period')}</Text>
        <Switch checked={compare} onCheckedChange={setCompare} />
      </View>
      {compare ? (
        <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(150)}>
          <ComparisonCard
            range={range}
            currency={targetCurrency}
            current={summary.data}
            version={version}
          />
        </Animated.View>
      ) : null}

      {(daily.data ?? []).length > 0 ? (
        <Card>
          <CardContent className="pt-4">
            <IncomeExpenseChart
              dailyStats={daily.data ?? []}
              currency={targetCurrency}
              weekStartsOn={weekStartsOn}
            />
          </CardContent>
        </Card>
      ) : null}

      {pieData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('Expenses by category')}</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart
              data={pieData}
              formatValue={(n) => moneyMajor(n, targetCurrency, locale)}
            />
          </CardContent>
        </Card>
      ) : null}

      <View className="gap-2">
        {failed ? (
          <ErrorState message={failed.error} onRetry={retryAll} retrying={loading} />
        ) : loading && (txs.data ?? []).length === 0 ? (
          <Skeleton className="h-40 w-full" />
        ) : (txs.data ?? []).length === 0 ? (
          <EmptyState title={t('No transactions in this period.')} />
        ) : (
          (txs.data ?? []).map((tx, i) => (
            <StaggerItem key={tx.id} index={i}>
              <TransactionRow
                tx={tx}
                studentName={nameOf(tx.studentId)}
                onPress={() => onEdit(tx)}
              />
            </StaggerItem>
          ))
        )}
      </View>
    </View>
  );
}
