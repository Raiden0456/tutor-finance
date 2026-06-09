import * as React from 'react';
import { Pressable, View } from 'react-native';
import { CartesianChart, BarGroup } from 'victory-native';
import { startOfWeek as dfStartOfWeek, addDays, parseISO } from 'date-fns';
import { fromMinorUnits, type Currency, type WeekStartsOn } from '@tutor-finance/shared';
import { Text } from '~/components/ui/text';
import { Segmented } from '~/components/common/segmented';
import { useColorScheme } from '~/lib/use-color-scheme';
import { useI18n, type Locale } from '~/lib/i18n';
import { formatDate } from '~/lib/format';
import { cn } from '~/lib/utils';
import type { DailyFinanceStats } from '~/lib/types';

type Metric = 'planned' | 'income' | 'expense' | 'net';
const METRICS: Metric[] = ['planned', 'income', 'expense', 'net'];
type Aggregation = 'day' | 'week' | 'month';

type ChartRow = { label: string; planned: number; income: number; expense: number; net: number };

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function bucketKey(dateStr: string, agg: Aggregation, weekStartsOn: WeekStartsOn): string {
  const d = parseISO(dateStr);
  if (agg === 'day') return dateStr;
  if (agg === 'month') return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
  const ws = dfStartOfWeek(d, { weekStartsOn });
  return `${ws.getFullYear()}-${pad(ws.getMonth() + 1)}-${pad(ws.getDate())}`;
}

function bucketLabel(key: string, agg: Aggregation, locale: Locale): string {
  if (agg === 'day') return formatDate(key, 'MMM d', locale);
  if (agg === 'month') return formatDate(key, 'MMM yyyy', locale);
  const start = parseISO(key);
  const end = addDays(start, 6);
  return `${formatDate(start, 'MMM d', locale)}–${formatDate(end, 'MMM d', locale)}`;
}

export function IncomeExpenseChart({
  dailyStats,
  currency,
  weekStartsOn,
}: {
  dailyStats: DailyFinanceStats[];
  currency: Currency;
  weekStartsOn: WeekStartsOn;
}) {
  const { t, locale } = useI18n();
  const { colors } = useColorScheme();
  const [agg, setAgg] = React.useState<Aggregation>('day');
  const [visible, setVisible] = React.useState<Record<Metric, boolean>>({
    planned: false,
    income: true,
    expense: true,
    net: false,
  });

  const metricColor: Record<Metric, string> = {
    planned: colors.indigo,
    income: colors.jade,
    expense: colors.coral,
    net: colors.teal,
  };
  const metricLabel: Record<Metric, string> = {
    planned: t('Planned'),
    income: t('Income'),
    expense: t('Expenses'),
    net: t('Net'),
  };

  const data = React.useMemo<ChartRow[]>(() => {
    const buckets = new Map<string, { planned: number; income: number; expense: number }>();
    for (const row of dailyStats) {
      const key = bucketKey(row.date, agg, weekStartsOn);
      const b = buckets.get(key) ?? { planned: 0, income: 0, expense: 0 };
      b.planned += row.planned;
      b.income += row.income;
      b.expense += row.expense;
      buckets.set(key, b);
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, b]) => ({
        label: bucketLabel(key, agg, locale),
        planned: round2(fromMinorUnits(b.planned, currency)),
        income: round2(fromMinorUnits(b.income, currency)),
        expense: round2(fromMinorUnits(b.expense, currency)),
        net: round2(fromMinorUnits(b.income - b.expense, currency)),
      }));
  }, [dailyStats, agg, weekStartsOn, currency, locale]);

  const visibleMetrics = METRICS.filter((m) => visible[m]);

  return (
    <View className="gap-3">
      <View>
        <Text className="text-sm font-medium">{t('Income vs Expenses')}</Text>
        <Text className="text-xs text-muted-foreground">
          {t(`${agg} totals`)} ({currency})
        </Text>
      </View>

      <Segmented<Aggregation>
        value={agg}
        onChange={setAgg}
        options={[
          { value: 'day', label: t('day') },
          { value: 'week', label: t('week') },
          { value: 'month', label: t('month') },
        ]}
      />

      <View style={{ height: 220 }}>
        {data.length > 0 && visibleMetrics.length > 0 ? (
          <CartesianChart
            data={data}
            xKey="label"
            yKeys={METRICS}
            domainPadding={{ left: 28, right: 28, top: 16 }}
          >
            {({ points, chartBounds }) => (
              <BarGroup chartBounds={chartBounds} betweenGroupPadding={0.4} withinGroupPadding={0.15} roundedCorners={{ topLeft: 4, topRight: 4 }}>
                {visibleMetrics.map((m) => (
                  <BarGroup.Bar key={m} points={points[m]} color={metricColor[m]} />
                ))}
              </BarGroup>
            )}
          </CartesianChart>
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-xs text-muted-foreground">{t('No data')}</Text>
          </View>
        )}
      </View>

      {/* Metric toggle pills */}
      <View className="flex-row flex-wrap justify-center gap-1.5">
        {METRICS.map((m) => {
          const on = visible[m];
          return (
            <Pressable
              key={m}
              onPress={() => setVisible((prev) => ({ ...prev, [m]: !prev[m] }))}
              className={cn(
                'flex-row items-center gap-1.5 rounded-full border px-2.5 py-1',
                on ? 'border-transparent bg-secondary' : 'border-border bg-transparent',
              )}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: metricColor[m] }} />
              <Text className={cn('text-xs font-medium', on ? 'text-secondary-foreground' : 'text-muted-foreground')}>
                {metricLabel[m]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
