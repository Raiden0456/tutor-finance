import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useFont } from '@shopify/react-native-skia';
import { Onest_500Medium } from '@expo-google-fonts/onest';
import { CartesianChart, BarGroup, useChartPressState } from 'victory-native';
import { startOfWeek as dfStartOfWeek, addDays, parseISO } from 'date-fns';
import { fromMinorUnits, type Currency, type WeekStartsOn } from '@tutor-finance/shared';
import { Text } from '~/components/ui/text';
import { Segmented } from '~/components/common/segmented';
import { useColorScheme } from '~/lib/use-color-scheme';
import { useI18n, type Locale } from '~/lib/i18n';
import { formatDate, moneyMajor } from '~/lib/format';
import { cn } from '~/lib/utils';
import type { DailyFinanceStats } from '~/lib/types';

type Metric = 'planned' | 'income' | 'expense' | 'net';
const METRICS: Metric[] = ['planned', 'income', 'expense', 'net'];
type Aggregation = 'day' | 'week' | 'month';

type ChartRow = {
  label: string;
  tooltip: string;
  planned: number;
  income: number;
  expense: number;
  net: number;
};

const TOOLTIP_WIDTH = 168;

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

// Short label for the x-axis (week ranges overlap on a phone), full label for the tooltip.
function axisLabel(key: string, agg: Aggregation, locale: Locale): string {
  if (agg === 'month') return formatDate(key, 'MMM yyyy', locale);
  return formatDate(key, 'MMM d', locale);
}

function tooltipLabel(key: string, agg: Aggregation, locale: Locale): string {
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
  const axisFont = useFont(Onest_500Medium, 10);
  const [agg, setAgg] = React.useState<Aggregation>('day');
  const [visible, setVisible] = React.useState<Record<Metric, boolean>>({
    planned: false,
    income: true,
    expense: true,
    net: false,
  });
  const [chartWidth, setChartWidth] = React.useState(0);

  const { state: press, isActive: pressActive } = useChartPressState({
    x: '',
    y: { planned: 0, income: 0, expense: 0, net: 0 },
  });
  const [tip, setTip] = React.useState<{
    label: string;
    xPos: number;
    values: Record<Metric, number>;
  } | null>(null);

  // Mirror the Skia press state into React state so we can render a regular
  // RN popup with the pressed bucket's numbers (mobile has no hover).
  useAnimatedReaction(
    () => ({
      label: press.x.value.value,
      xPos: press.x.position.value,
      planned: press.y.planned.value.value,
      income: press.y.income.value.value,
      expense: press.y.expense.value.value,
      net: press.y.net.value.value,
    }),
    (v) => {
      scheduleOnRN(setTip, {
        label: v.label,
        xPos: v.xPos,
        values: { planned: v.planned, income: v.income, expense: v.expense, net: v.net },
      });
    },
  );

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
        label: axisLabel(key, agg, locale),
        tooltip: tooltipLabel(key, agg, locale),
        planned: round2(fromMinorUnits(b.planned, currency)),
        income: round2(fromMinorUnits(b.income, currency)),
        expense: round2(fromMinorUnits(b.expense, currency)),
        net: round2(fromMinorUnits(b.income - b.expense, currency)),
      }));
  }, [dailyStats, agg, weekStartsOn, currency, locale]);

  const visibleMetrics = METRICS.filter((m) => visible[m]);
  const tooltipLeft = Math.min(
    Math.max((tip?.xPos ?? 0) - TOOLTIP_WIDTH / 2, 4),
    Math.max(chartWidth - TOOLTIP_WIDTH - 4, 4),
  );
  const tipRow = tip ? data.find((r) => r.label === tip.label) : null;

  // Bars scale with bucket count: few buckets → wide bars; many buckets (day
  // view) → slimmer gaps so the bars themselves stay as thick as possible.
  // victory-native computes groupWidth = (1 - betweenGroupPadding) * chartWidth / n
  // (see getBarGroupDimensionsForAxis) and centers groups on their x position,
  // so the side padding must be at least groupWidth / 2 or edge groups clip.
  const n = data.length;
  const betweenGroupPadding = n >= 20 ? 0.25 : n >= 10 ? 0.3 : 0.4;
  const withinGroupPadding = n >= 20 ? 0.08 : 0.15;
  const width = chartWidth || 360;
  const sidePad = Math.max(16, Math.ceil((0.5 * (1 - betweenGroupPadding) * width) / n) + 2);

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

      <View style={{ height: 224 }} onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
        {data.length > 0 && visibleMetrics.length > 0 ? (
          // Remount + fade on any structural change (aggregation / metric set):
          // a consistent 200ms fade beats the path-morph, which only sometimes
          // animates and otherwise pops.
          <Animated.View
            key={`${agg}|${visibleMetrics.join('.')}`}
            entering={FadeIn.duration(200)}
            style={{ flex: 1 }}
          >
            <CartesianChart
              data={data}
              xKey="label"
              yKeys={METRICS}
              domainPadding={{ left: sidePad, right: sidePad, top: 20 }}
              chartPressState={press}
              // Web parity: x labels under the chart (no axis line) + horizontal
              // grid lines only; y tick labels hidden (numbers live in the tooltip).
              xAxis={{
                font: axisFont,
                labelColor: colors.mutedForeground,
                lineWidth: 0,
                tickCount: Math.min(data.length, 5),
              }}
              yAxis={[
                {
                  font: axisFont,
                  lineColor: colors.border,
                  tickCount: 4,
                  formatYLabel: () => '',
                },
              ]}
              frame={{ lineWidth: 0 }}
            >
              {({ points, chartBounds }) => (
                <BarGroup
                  chartBounds={chartBounds}
                  betweenGroupPadding={betweenGroupPadding}
                  withinGroupPadding={withinGroupPadding}
                  roundedCorners={{ topLeft: 4, topRight: 4 }}
                >
                  {visibleMetrics.map((m) => (
                    <BarGroup.Bar
                      key={m}
                      points={points[m]}
                      color={metricColor[m]}
                      animate={{ type: 'timing', duration: 300 }}
                    />
                  ))}
                </BarGroup>
              )}
            </CartesianChart>

            {/* Press tooltip with the pressed bucket's numbers */}
            {pressActive && tip ? (
              <View
                pointerEvents="none"
                style={{ position: 'absolute', top: 0, left: tooltipLeft, width: TOOLTIP_WIDTH }}
                className="rounded-lg border border-border bg-popover px-3 py-2 shadow-sm shadow-black/10"
              >
                <Text className="text-xs font-semibold">{tipRow?.tooltip ?? tip.label}</Text>
                <View className="mt-1 gap-0.5">
                  {visibleMetrics.map((m) => (
                    <View key={m} className="flex-row items-center gap-1.5">
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 2,
                          backgroundColor: metricColor[m],
                        }}
                      />
                      <Text className="flex-1 text-xs text-muted-foreground">{metricLabel[m]}</Text>
                      <Text className="text-xs font-semibold">
                        {moneyMajor(tip.values[m], currency, locale)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </Animated.View>
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
              <View
                style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: metricColor[m] }}
              />
              <Text
                className={cn(
                  'text-xs font-medium',
                  on ? 'text-secondary-foreground' : 'text-muted-foreground',
                )}
              >
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
