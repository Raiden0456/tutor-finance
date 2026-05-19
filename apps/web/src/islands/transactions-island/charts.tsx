import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { fromMinorUnits, type Currency } from '@tutor-finance/shared';

const ieBarConfig = {
  planned: { label: 'Planned', color: 'var(--tf-indigo)' },
  income: { label: 'Income', color: 'var(--tf-jade)' },
  expense: { label: 'Expenses', color: 'var(--tf-coral)' },
  net: { label: 'Net', color: 'var(--tf-teal)' },
} satisfies ChartConfig;

type BarMetric = keyof typeof ieBarConfig;

type IncomeExpenseRow = {
  date: string;
  planned: number;
  income: number;
  expense: number;
  net: number;
};

type Aggregation = 'day' | 'week' | 'month';

type ChartRow = IncomeExpenseRow & {
  label: string;
};

const barMetrics: BarMetric[] = ['planned', 'income', 'expense', 'net'];

const aggregations: { key: Aggregation; label: string; description: string }[] = [
  { key: 'day', label: 'Day', description: 'Daily totals' },
  { key: 'week', label: 'Week', description: 'Weekly totals' },
  { key: 'month', label: 'Month', description: 'Monthly totals' },
];

const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' });

const parseDateOnly = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
};

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

const startOfWeek = (date: Date) => {
  const start = new Date(date);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);
  return start;
};

const aggregationKey = (date: Date, aggregation: Aggregation) => {
  if (aggregation === 'day') return dateKey(date);
  if (aggregation === 'week') return dateKey(startOfWeek(date));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
};

const aggregationLabel = (key: string, aggregation: Aggregation) => {
  const start = parseDateOnly(key);
  if (aggregation === 'day') return dateFmt.format(start);
  if (aggregation === 'month') return monthFmt.format(start);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${dateFmt.format(start)}–${dateFmt.format(end)}`;
};

const toChartAmount = (amount: number, currency: Currency) =>
  Math.round(fromMinorUnits(amount, currency) * 100) / 100;

const pieCfg: ChartConfig = {
  amount: { label: 'Expenses' },
};

export function IncomeExpenseBarChart({
  data,
  currency,
}: {
  data: IncomeExpenseRow[];
  currency: Currency;
}) {
  const [visible, setVisible] = useState<Record<BarMetric, boolean>>({
    planned: false,
    income: true,
    expense: true,
    net: false,
  });
  const [aggregation, setAggregation] = useState<Aggregation>('day');

  const visibleMetrics = barMetrics.filter((metric) => visible[metric]);
  const activeAggregation =
    aggregations.find((item) => item.key === aggregation) ?? aggregations[0]!;
  const chartData = useMemo(() => {
    const grouped = new Map<string, IncomeExpenseRow>();

    for (const row of data) {
      const key = aggregationKey(parseDateOnly(row.date), aggregation);
      const current = grouped.get(key) ?? { date: key, planned: 0, income: 0, expense: 0, net: 0 };
      current.planned += row.planned;
      current.income += row.income;
      current.expense += row.expense;
      grouped.set(key, current);
    }

    return Array.from(grouped.values())
      .map<ChartRow>((row) => ({
        date: row.date,
        label: aggregationLabel(row.date, aggregation),
        planned: toChartAmount(row.planned, currency),
        income: toChartAmount(row.income, currency),
        expense: toChartAmount(row.expense, currency),
        net: toChartAmount(row.income - row.expense, currency),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [aggregation, currency, data]);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div>
          <CardTitle className="text-sm font-medium">Income vs Expenses</CardTitle>
          <CardDescription className="text-xs">
            {activeAggregation.description} ({currency})
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {aggregations.map((item) => (
            <Button
              key={item.key}
              type="button"
              size="xs"
              variant={aggregation === item.key ? 'secondary' : 'ghost'}
              className="transition-all duration-200 ease-in-out"
              onClick={() => setAggregation(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={ieBarConfig} className="aspect-auto h-56 w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            {visibleMetrics.map((metric) => (
              <Bar
                key={metric}
                dataKey={metric}
                fill={`var(--color-${metric})`}
                radius={4}
                isAnimationActive
              />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex justify-center pt-0">
        <div className="flex flex-wrap justify-center gap-1.5">
          {barMetrics.map((metric) => (
            <Button
              key={metric}
              type="button"
              size="xs"
              variant={visible[metric] ? 'default' : 'outline'}
              className="transition-all duration-200 ease-in-out"
              onClick={() => setVisible((prev) => ({ ...prev, [metric]: !prev[metric] }))}
            >
              <span
                className="h-2 w-2 rounded-full transition-transform duration-200"
                style={{ background: ieBarConfig[metric].color }}
              />
              {ieBarConfig[metric].label}
            </Button>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}

export function CategoryPieChart({
  data,
  currency,
}: {
  data: { name: string; amount: number; fill: string }[];
  currency: Currency;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-sm font-medium">Expenses by category</CardTitle>
        <CardDescription className="text-xs">
          Top {data.length} categories ({currency})
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={pieCfg}
          className="mx-auto aspect-square max-h-[220px] [&_.recharts-pie-label-text]:fill-foreground"
        >
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  nameKey="name"
                  hideLabel
                  formatter={(v) => Number(v).toFixed(2)}
                />
              }
            />
            <Pie
              data={data}
              dataKey="amount"
              nameKey="name"
              label={({ percent }) =>
                (percent ?? 0) > 0.05 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ''
              }
              labelLine={false}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardContent className="pt-0 pb-4">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5 text-xs">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: item.fill }}
              />
              <span className="capitalize text-muted-foreground">{item.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
